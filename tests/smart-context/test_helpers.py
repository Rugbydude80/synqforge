"""
Helper functions for Smart Context validation tests.
"""
import os
import json
from typing import List, Dict, Optional
from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import RealDictCursor
import uuid
import openai

load_dotenv()


class EmbeddingsService:
    """Python wrapper for embeddings service to test similarity retrieval."""
    
    def __init__(self):
        self.database_url = os.getenv('DATABASE_URL')
        if not self.database_url:
            raise ValueError("DATABASE_URL not set")
        
        self.api_key = os.getenv('OPENROUTER_API_KEY')
        if not self.api_key:
            raise ValueError("OPENROUTER_API_KEY not set")
        
        self.embedding_model = os.getenv('OPENROUTER_EMBEDDING_MODEL', 'openai/text-embedding-3-small')
        self.client = openai.OpenAI(
            api_key=self.api_key,
            base_url="https://openrouter.ai/api/v1"
        )
    
    def generate_embedding(self, text: str) -> List[float]:
        """Generate embedding for text."""
        if len(text) < 10:
            raise ValueError("Text must be at least 10 characters")
        
        max_length = 8000
        truncated_text = text[:max_length] + '...' if len(text) > max_length else text
        
        response = self.client.embeddings.create(
            model=self.embedding_model,
            input=truncated_text
        )
        
        return response.data[0].embedding
    
    def find_similar_stories(
        self,
        query_text: str,
        epic_id: str,
        limit: int = 5,
        min_similarity: float = 0.7
    ) -> List[Dict]:
        """Find similar stories using vector search."""
        conn = psycopg2.connect(self.database_url)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        try:
            # Generate query embedding
            query_embedding = self.generate_embedding(query_text)
            
            # Execute vector similarity search
            cursor.execute("""
                SELECT 
                    id,
                    title,
                    description,
                    acceptance_criteria,
                    priority,
                    status,
                    1 - (embedding <=> %s::vector) AS similarity
                FROM stories
                WHERE embedding IS NOT NULL
                  AND epic_id = %s
                ORDER BY embedding <=> %s::vector
                LIMIT %s
            """, (json.dumps(query_embedding), epic_id, json.dumps(query_embedding), limit))
            
            results = cursor.fetchall()
            
            # Filter by minimum similarity
            filtered = [
                dict(row) for row in results
                if row['similarity'] >= min_similarity
            ]
            
            return filtered
        finally:
            cursor.close()
            conn.close()
    
    def embed_story(self, story_id: str, story: Dict):
        """Generate and store embedding for a story."""
        conn = psycopg2.connect(self.database_url)
        cursor = conn.cursor()
        
        try:
            # Prepare text for embedding
            text_parts = []
            if story.get('title'):
                text_parts.append(story['title'])
            if story.get('description'):
                text_parts.append(story['description'])
            if story.get('acceptance_criteria'):
                ac = story['acceptance_criteria']
                if isinstance(ac, list):
                    text_parts.append(' '.join(ac[:5]))
                elif isinstance(ac, str):
                    text_parts.append(ac)
            
            text = '\n'.join(text_parts).strip()
            
            if len(text) < 10:
                return
            
            # Generate embedding
            embedding = self.generate_embedding(text)
            
            # Store in database
            cursor.execute("""
                UPDATE stories
                SET embedding = %s::vector,
                    updated_at = NOW()
                WHERE id = %s
            """, (json.dumps(embedding), story_id))
            
            conn.commit()
        finally:
            cursor.close()
            conn.close()


class StoryGenerator:
    """Story generator for testing."""
    
    def __init__(self):
        api_key = os.getenv('OPENROUTER_API_KEY')
        if not api_key:
            raise ValueError("OPENROUTER_API_KEY not set")
        
        self.client = openai.OpenAI(
            api_key=api_key,
            base_url="https://openrouter.ai/api/v1",
            default_headers={
                "HTTP-Referer": os.getenv('HTTP_REFERER', 'https://synqforge.com'),
                "X-Title": "SynqForge Smart Context Test"
            }
        )
        self.model = os.getenv('OPENROUTER_MODEL', 'qwen/qwen3-max')
    
    def generate_story(
        self,
        prompt: str,
        context_stories: Optional[List[Dict]] = None,
        smart_context_enabled: bool = False
    ) -> Dict:
        """Generate a story with optional context."""
        # Build prompt
        base_prompt = f"""Generate a complete user story based on the following requirement:

{prompt}

Provide a user story with:
1. Title (clear and concise)
2. Description (As a [role], I want [goal] so that [value])
3. Acceptance Criteria (detailed, testable criteria)
4. Priority (high/medium/low)
5. Story Points estimate (1-13)

"""
        
        if context_stories and smart_context_enabled:
            base_prompt += "\n# CONTEXTUAL REFERENCE STORIES (Top 5 Similar Stories in Epic)\n"
            base_prompt += "Use these stories as reference for format, terminology, and structure:\n\n"
            
            for idx, story in enumerate(context_stories[:5], 1):
                similarity = story.get('similarity', 0) * 100
                base_prompt += f"\n## Reference Story {idx} (Similarity: {similarity:.1f}%)\n"
                base_prompt += f"**Title:** {story.get('title', 'N/A')}\n"
                base_prompt += f"**Description:** {story.get('description', 'N/A')}\n"
                
                ac = story.get('acceptance_criteria', [])
                if isinstance(ac, list):
                    base_prompt += "**Acceptance Criteria:**\n"
                    for criterion in ac:
                        base_prompt += f"  - {criterion}\n"
                elif isinstance(ac, str):
                    base_prompt += f"**Acceptance Criteria:** {ac}\n"
        
        base_prompt += "\n\nFormat your response as JSON with the following structure:\n"
        base_prompt += """{
  "title": "Story title",
  "description": "As a...",
  "acceptanceCriteria": ["criterion 1", "criterion 2", ...],
  "priority": "high|medium|low",
  "storyPoints": 3
}"""
        
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are an expert Agile product manager who writes clear, testable user stories."},
                    {"role": "user", "content": base_prompt}
                ],
                temperature=0.7,
                max_tokens=2000
            )
            
            content = response.choices[0].message.content
            
            # Parse JSON
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
                    'smart_context_used': smart_context_enabled and context_stories is not None and len(context_stories) > 0,
                    'context_story_ids': [s.get('id') for s in (context_stories or [])] if context_stories else [],
                    'context_stories_count': len(context_stories) if context_stories else 0,
                    'usage': {
                        'inputTokens': response.usage.prompt_tokens,
                        'outputTokens': response.usage.completion_tokens,
                        'totalTokens': response.usage.total_tokens
                    }
                }
            }
        except Exception as e:
            return {
                'story': {
                    'title': prompt,
                    'description': f'Error: {str(e)}',
                    'acceptanceCriteria': [],
                    'priority': 'medium',
                    'storyPoints': 3
                },
                'metadata': {
                    'smart_context_used': smart_context_enabled,
                    'error': str(e)
                }
            }


def detect_acceptance_criteria_format(story: Dict) -> str:
    """Detect the format of acceptance criteria."""
    ac = story.get('acceptanceCriteria', [])
    if not ac:
        return 'none'
    
    ac_text = ' '.join(ac).lower()
    
    if 'given' in ac_text and 'when' in ac_text and 'then' in ac_text:
        return 'given_when_then'
    elif any(char in ac_text for char in ['-', '•', '*']):
        return 'checklist'
    else:
        return 'narrative'


def create_test_story_helper(
    db_connection,
    epic_id: str,
    project_id: str,
    org_id: str,
    user_id: str,
    title: str,
    description: str = None,
    acceptance_criteria: List[str] = None,
    priority: str = "medium",
    embedding: List[float] = None
) -> str:
    """Helper function to create a test story."""
    cursor = db_connection.cursor()
    story_id = f"test-story-{uuid.uuid4().hex[:8]}"
    
    try:
        # Handle embedding vector format
        embedding_sql = None
        if embedding:
            embedding_sql = json.dumps(embedding)
        
        cursor.execute("""
            INSERT INTO stories (
                id, epic_id, project_id, organization_id, title, description,
                acceptance_criteria, priority, status, created_by, embedding, created_at, updated_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s::vector, NOW(), NOW())
        """, (
            story_id, epic_id, project_id, org_id, title, description,
            acceptance_criteria or [], priority, "backlog", user_id, embedding_sql
        ))
        db_connection.commit()
        return story_id
    finally:
        cursor.close()


def create_test_epic_with_stories(
    db_connection,
    epic_id: str,
    project_id: str,
    org_id: str,
    user_id: str,
    count: int = 10,
    stories_data: Optional[List[Dict]] = None
) -> List[str]:
    """Create test epic with stories and generate embeddings."""
    embeddings_service = EmbeddingsService()
    story_ids = []
    
    # Default stories if none provided
    if not stories_data:
        stories_data = [
            {
                'title': f'Story {i+1}',
                'description': f'Description for story {i+1}',
                'acceptance_criteria': [f'Criterion {i+1}.1', f'Criterion {i+1}.2']
            }
            for i in range(count)
        ]
    
    for story_data in stories_data[:count]:
        story_id = create_test_story_helper(
            db_connection,
            epic_id,
            project_id,
            org_id,
            user_id,
            title=story_data['title'],
            description=story_data.get('description'),
            acceptance_criteria=story_data.get('acceptance_criteria', [])
        )
        story_ids.append(story_id)
        
        # Generate and store embedding
        try:
            embeddings_service.embed_story(story_id, story_data)
        except Exception as e:
            print(f"Warning: Could not embed story {story_id}: {e}")
    
    return story_ids

