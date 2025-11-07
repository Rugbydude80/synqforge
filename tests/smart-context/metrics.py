"""
Consistency Metrics Calculator
Measures structural consistency, terminology overlap, and edit distance
between generated stories and existing epic stories.
"""

import re
from typing import List, Dict, Set
from collections import Counter
import difflib


class ConsistencyMetrics:
    """Calculates consistency metrics for generated stories."""
    
    @staticmethod
    def _extract_format_type(acceptance_criteria: List[str]) -> str:
        """
        Detect the format type of acceptance criteria.
        
        Returns: 'given_when_then', 'checklist', or 'narrative'
        """
        if not acceptance_criteria:
            return 'unknown'
        
        # Check for Given/When/Then format
        first_words = [ac.split()[0].lower() if ac else '' for ac in acceptance_criteria[:3]]
        if any(word in ['given', 'when', 'then'] for word in first_words):
            return 'given_when_then'
        
        # Check for checklist format (starts with -, *, or numbers)
        if all(re.match(r'^[-*•]\s', ac.strip()) or re.match(r'^\d+\.', ac.strip()) 
               for ac in acceptance_criteria[:3] if ac):
            return 'checklist'
        
        # Default to narrative
        return 'narrative'
    
    @staticmethod
    def _extract_terminology(text: str) -> Set[str]:
        """
        Extract domain-specific terminology from text.
        
        Args:
            text: Text to extract terms from
            
        Returns:
            Set of significant terms (nouns, domain-specific words)
        """
        # Simple extraction: words that are capitalized or appear multiple times
        words = re.findall(r'\b[A-Z][a-z]+\b|\b[a-z]{4,}\b', text.lower())
        
        # Filter common words
        stop_words = {
            'that', 'this', 'with', 'from', 'have', 'will', 'should', 'would',
            'could', 'when', 'then', 'given', 'user', 'customer', 'system'
        }
        
        # Count word frequencies
        word_counts = Counter(words)
        
        # Return terms that appear at least twice or are capitalized
        significant_terms = {
            word for word, count in word_counts.items() 
            if count >= 2 and word not in stop_words
        }
        
        return significant_terms
    
    def calculate_format_consistency(
        self, 
        generated_story: Dict, 
        epic_stories: List[Dict]
    ) -> float:
        """
        Calculate how well the generated story matches the format of epic stories.
        
        Args:
            generated_story: The generated story
            epic_stories: List of stories in the epic
            
        Returns:
            Format consistency score (0-1)
        """
        gen_ac = generated_story.get('acceptanceCriteria', [])
        if not gen_ac or not isinstance(gen_ac, list):
            return 0.0
        
        gen_format = self._extract_format_type(gen_ac)
        
        # Count format types in epic stories
        epic_formats = []
        for story in epic_stories:
            ac = story.get('acceptanceCriteria', [])
            if isinstance(ac, list) and ac:
                epic_formats.append(self._extract_format_type(ac))
        
        if not epic_formats:
            return 0.5  # Neutral score if no epic formats to compare
        
        # Calculate match rate
        matches = sum(1 for fmt in epic_formats if fmt == gen_format)
        match_rate = matches / len(epic_formats)
        
        return match_rate
    
    def calculate_terminology_overlap(
        self,
        generated_story: Dict,
        epic_stories: List[Dict]
    ) -> float:
        """
        Calculate terminology overlap percentage.
        
        Args:
            generated_story: The generated story
            epic_stories: List of stories in the epic
            
        Returns:
            Terminology overlap percentage (0-1)
        """
        # Extract terminology from generated story
        gen_text = ' '.join([
            generated_story.get('title', ''),
            generated_story.get('description', ''),
            ' '.join(generated_story.get('acceptanceCriteria', []))
        ])
        gen_terms = self._extract_terminology(gen_text)
        
        if not gen_terms:
            return 0.0
        
        # Extract terminology from all epic stories
        epic_terms = set()
        for story in epic_stories:
            story_text = ' '.join([
                story.get('title', ''),
                story.get('description', ''),
                ' '.join(story.get('acceptanceCriteria', []) if isinstance(story.get('acceptanceCriteria'), list) else [])
            ])
            epic_terms.update(self._extract_terminology(story_text))
        
        if not epic_terms:
            return 0.0
        
        # Calculate overlap percentage
        overlap = len(gen_terms & epic_terms)
        total_unique = len(gen_terms | epic_terms)
        
        overlap_pct = overlap / total_unique if total_unique > 0 else 0.0
        
        return overlap_pct
    
    def calculate_edit_distance_similarity(
        self,
        generated_story: Dict,
        epic_stories: List[Dict]
    ) -> float:
        """
        Calculate average character-level similarity to epic stories.
        
        Args:
            generated_story: The generated story
            epic_stories: List of stories in the epic
            
        Returns:
            Average similarity score (0-1)
        """
        gen_text = ' '.join([
            generated_story.get('title', ''),
            generated_story.get('description', ''),
            ' '.join(generated_story.get('acceptanceCriteria', []))
        ]).lower()
        
        if not gen_text:
            return 0.0
        
        similarities = []
        for story in epic_stories:
            story_text = ' '.join([
                story.get('title', ''),
                story.get('description', ''),
                ' '.join(story.get('acceptanceCriteria', []) if isinstance(story.get('acceptanceCriteria'), list) else [])
            ]).lower()
            
            if story_text:
                similarity = difflib.SequenceMatcher(None, gen_text, story_text).ratio()
                similarities.append(similarity)
        
        if not similarities:
            return 0.0
        
        return sum(similarities) / len(similarities)
    
    def calculate_all_metrics(
        self,
        generated_story: Dict,
        epic_stories: List[Dict]
    ) -> Dict[str, float]:
        """
        Calculate all consistency metrics for a generated story.
        
        Args:
            generated_story: The generated story
            epic_stories: List of stories in the epic
            
        Returns:
            Dictionary with all metric scores
        """
        return {
            'format_consistency': self.calculate_format_consistency(generated_story, epic_stories),
            'terminology_overlap': self.calculate_terminology_overlap(generated_story, epic_stories),
            'edit_distance_similarity': self.calculate_edit_distance_similarity(generated_story, epic_stories)
        }

