"""
Context-Aware Story Generation
Generates user stories with and without contextual input from similar stories.
Uses OpenRouter as the AI gateway (matching SynqForge's production setup).
"""

import os
import json
from typing import List, Dict, Optional
from dotenv import load_dotenv
import openai

# Load environment variables
load_dotenv()


class StoryGenerator:
    """Generates user stories using LLM via OpenRouter with optional contextual stories."""
    
    def __init__(self):
        """Initialize the story generator with OpenRouter configuration."""
        # Use OpenRouter (matching SynqForge's production setup)
        api_key = os.getenv('OPENROUTER_API_KEY')
        if not api_key:
            raise ValueError("OPENROUTER_API_KEY not found in environment variables")
        
        # Default model (can be overridden via env var)
        # Using qwen/qwen3-max which is SynqForge's default for story generation
        self.model = os.getenv('OPENROUTER_MODEL', 'qwen/qwen3-max')
        
        # Initialize OpenAI client pointing to OpenRouter
        # This matches the pattern used in lib/ai/client.ts
        self.client = openai.OpenAI(
            api_key=api_key,
            base_url="https://openrouter.ai/api/v1",
            default_headers={
                "HTTP-Referer": os.getenv('HTTP_REFERER', 'https://synqforge.com'),
                "X-Title": "SynqForge Smart Context Test"
            }
        )
    
    def _get_openrouter_model(self, model: str) -> str:
        """
        Convert model name to OpenRouter format if needed.
        Matches the pattern from lib/ai/story-generation.service.ts
        """
        # If already in OpenRouter format (contains /), return as-is
        if '/' in model:
            return model
        
        # Convert common model names to OpenRouter format
        model_mapping = {
            'gpt-4': 'openai/gpt-4',
            'gpt-4-turbo': 'openai/gpt-4-turbo',
            'gpt-4-turbo-preview': 'openai/gpt-4-turbo-preview',
            'gpt-3.5-turbo': 'openai/gpt-3.5-turbo',
            'claude-3-5-sonnet': 'anthropic/claude-3.5-sonnet',
            'claude-3-opus': 'anthropic/claude-3-opus',
            'qwen3-max': 'qwen/qwen3-max',
        }
        
        return model_mapping.get(model.lower(), model)
    
    def _format_contextual_stories(self, contextual_stories: List[Dict]) -> str:
        """
        Format contextual stories for inclusion in the prompt.
        
        Args:
            contextual_stories: List of story dictionaries with similarity scores
            
        Returns:
            Formatted string for prompt
        """
        if not contextual_stories:
            return ""
        
        context_lines = [
            "\n# CONTEXTUAL REFERENCE STORIES (Top 5 Similar Stories in Epic)\n",
            "Use these stories as reference for format, terminology, and structure:\n"
        ]
        
        for idx, (story, scores) in enumerate(contextual_stories, 1):
            similarity_pct = scores['combined_score'] * 100
            context_lines.append(f"\n## Reference Story {idx} (Similarity: {similarity_pct:.1f}%)")
            context_lines.append(f"**Title:** {story.get('title', 'N/A')}")
            context_lines.append(f"**Description:** {story.get('description', 'N/A')}")
            
            ac = story.get('acceptanceCriteria', [])
            if isinstance(ac, list):
                context_lines.append("**Acceptance Criteria:**")
                for criterion in ac:
                    context_lines.append(f"  - {criterion}")
            elif isinstance(ac, str):
                context_lines.append(f"**Acceptance Criteria:** {ac}")
            
            if story.get('priority'):
                context_lines.append(f"**Priority:** {story['priority']}")
        
        context_lines.append("\n## Instructions for Consistency")
        context_lines.append("- Match the acceptance criteria format (Given/When/Then, checklist, or narrative)")
        context_lines.append("- Use consistent terminology and entity names from the reference stories")
        context_lines.append("- Maintain similar structure and level of detail")
        context_lines.append("- Follow the same style and tone")
        
        return "\n".join(context_lines)
    
    def _build_prompt(
        self, 
        prompt: str, 
        contextual_stories: Optional[List[Dict]] = None
    ) -> str:
        """
        Build the generation prompt with optional context.
        
        Args:
            prompt: User's story prompt/brief
            contextual_stories: Optional list of similar stories for context
            
        Returns:
            Complete prompt string
        """
        base_prompt = f"""Generate a complete user story based on the following requirement:

{prompt}

Provide a user story with:
1. Title (clear and concise)
2. Description (As a [role], I want [goal] so that [value])
3. Acceptance Criteria (detailed, testable criteria)
4. Priority (high/medium/low)
5. Story Points estimate (1-13)

"""
        
        if contextual_stories:
            context_section = self._format_contextual_stories(contextual_stories)
            base_prompt += context_section
        
        base_prompt += "\n\nFormat your response as JSON with the following structure:\n"
        base_prompt += """{
  "title": "Story title",
  "description": "As a...",
  "acceptanceCriteria": ["criterion 1", "criterion 2", ...],
  "priority": "high|medium|low",
  "storyPoints": 3
}"""
        
        return base_prompt
    
    def generate_story_with_context(
        self,
        prompt: str,
        contextual_stories: Optional[List[Dict]] = None
    ) -> Dict:
        """
        Generate a user story with optional contextual stories.
        
        Args:
            prompt: User's story prompt/brief
            contextual_stories: Optional list of similar stories for context
            
        Returns:
            Dictionary with generated story and metadata
        """
        full_prompt = self._build_prompt(prompt, contextual_stories)
        
        try:
            # Use OpenRouter format for model name
            openrouter_model = self._get_openrouter_model(self.model)
            
            # Call OpenRouter API (OpenAI-compatible format)
            response = self.client.chat.completions.create(
                model=openrouter_model,
                messages=[
                    {"role": "system", "content": "You are an expert Agile product manager who writes clear, testable user stories."},
                    {"role": "user", "content": full_prompt}
                ],
                temperature=0.7,
                max_tokens=2000
            )
            
            content = response.choices[0].message.content
            usage = {
                'inputTokens': response.usage.prompt_tokens,
                'outputTokens': response.usage.completion_tokens,
                'totalTokens': response.usage.total_tokens
            }
            
            # Parse JSON from response
            # Try to extract JSON if wrapped in markdown code blocks
            if '```json' in content:
                json_start = content.find('```json') + 7
                json_end = content.find('```', json_start)
                content = content[json_start:json_end].strip()
            elif '```' in content:
                json_start = content.find('```') + 3
                json_end = content.find('```', json_start)
                content = content[json_start:json_end].strip()
            
            story_data = json.loads(content)
            
            return {
                'story': story_data,
                'metadata': {
                    'contextUsed': contextual_stories is not None and len(contextual_stories) > 0,
                    'contextStoryCount': len(contextual_stories) if contextual_stories else 0,
                    'usage': usage,
                    'model': openrouter_model,
                    'provider': 'openrouter'
                }
            }
        
        except json.JSONDecodeError as e:
            print(f"⚠️  Failed to parse JSON from response: {e}")
            print(f"Response content: {content[:500]}")
            # Return a fallback structure
            return {
                'story': {
                    'title': prompt,
                    'description': 'Failed to parse AI response',
                    'acceptanceCriteria': [],
                    'priority': 'medium',
                    'storyPoints': 3
                },
                'metadata': {
                    'contextUsed': contextual_stories is not None and len(contextual_stories) > 0,
                    'contextStoryCount': len(contextual_stories) if contextual_stories else 0,
                    'error': str(e),
                    'rawResponse': content[:500] if 'content' in locals() else 'No response received'
                }
            }
        except Exception as e:
            print(f"❌ Error generating story: {e}")
            raise
    
    def generate_story_without_context(self, prompt: str) -> Dict:
        """
        Generate a user story without contextual stories (control group).
        
        Args:
            prompt: User's story prompt/brief
            
        Returns:
            Dictionary with generated story and metadata
        """
        return self.generate_story_with_context(prompt, contextual_stories=None)

