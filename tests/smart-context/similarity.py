"""
Story Similarity Algorithm
Combines semantic similarity (sentence embeddings) with lexical overlap
to find the most similar stories within an epic.
"""

import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
from typing import List, Dict, Tuple
import re
from collections import Counter
import difflib


class StorySimilarityCalculator:
    """Calculates similarity between user stories using semantic and lexical methods."""
    
    def __init__(self, model_name: str = 'all-MiniLM-L6-v2'):
        """
        Initialize the similarity calculator with a sentence transformer model.
        
        Args:
            model_name: Name of the SentenceTransformer model to use
        """
        print(f"Loading sentence transformer model: {model_name}")
        self.model = SentenceTransformer(model_name)
        print("Model loaded successfully")
    
    def _extract_text_features(self, story: Dict) -> str:
        """
        Extract all text content from a story for embedding.
        
        Args:
            story: Story dictionary with title, description, acceptanceCriteria
            
        Returns:
            Combined text string
        """
        text_parts = []
        
        if story.get('title'):
            text_parts.append(story['title'])
        
        if story.get('description'):
            text_parts.append(story['description'])
        
        if story.get('acceptanceCriteria'):
            ac = story['acceptanceCriteria']
            if isinstance(ac, list):
                text_parts.extend(ac)
            elif isinstance(ac, str):
                text_parts.append(ac)
        
        return ' '.join(text_parts)
    
    def _calculate_lexical_overlap(self, text1: str, text2: str) -> float:
        """
        Calculate lexical overlap between two texts.
        
        Uses:
        - Common words (normalized, stop words filtered)
        - Action verbs overlap
        - Entity/domain term overlap
        
        Args:
            text1: First text
            text2: Second text
            
        Returns:
            Lexical overlap score (0-1)
        """
        # Simple stop words (can be expanded)
        stop_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 
                     'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were',
                     'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did',
                     'will', 'would', 'should', 'could', 'may', 'might', 'can'}
        
        # Extract words (lowercase, alphanumeric)
        words1 = set(re.findall(r'\b[a-z]+\b', text1.lower()))
        words2 = set(re.findall(r'\b[a-z]+\b', text2.lower()))
        
        # Remove stop words
        words1 = words1 - stop_words
        words2 = words2 - stop_words
        
        if not words1 or not words2:
            return 0.0
        
        # Calculate Jaccard similarity
        intersection = len(words1 & words2)
        union = len(words1 | words2)
        jaccard = intersection / union if union > 0 else 0.0
        
        # Calculate sequence similarity using difflib
        seq_similarity = difflib.SequenceMatcher(None, text1.lower(), text2.lower()).ratio()
        
        # Weighted combination
        lexical_score = (jaccard * 0.6) + (seq_similarity * 0.4)
        
        return lexical_score
    
    def calculate_similarity(self, story1: Dict, story2: Dict) -> Dict[str, float]:
        """
        Calculate comprehensive similarity between two stories.
        
        Args:
            story1: First story dictionary
            story2: Second story dictionary
            
        Returns:
            Dictionary with semantic_score, lexical_score, and combined_score
        """
        # Extract text features
        text1 = self._extract_text_features(story1)
        text2 = self._extract_text_features(story2)
        
        # Semantic similarity using embeddings
        embeddings = self.model.encode([text1, text2])
        semantic_score = float(cosine_similarity([embeddings[0]], [embeddings[1]])[0][0])
        
        # Normalize semantic score to 0-1 range (cosine similarity is already -1 to 1, but typically 0-1)
        semantic_score = max(0.0, semantic_score)
        
        # Lexical overlap
        lexical_score = self._calculate_lexical_overlap(text1, text2)
        
        # Combined score (weighted: 70% semantic, 30% lexical)
        combined_score = (semantic_score * 0.7) + (lexical_score * 0.3)
        
        return {
            'semantic_score': semantic_score,
            'lexical_score': lexical_score,
            'combined_score': combined_score
        }
    
    def retrieve_top_5(
        self, 
        query_story: Dict, 
        epic_stories: List[Dict],
        exclude_story_id: str = None
    ) -> List[Tuple[Dict, Dict[str, float]]]:
        """
        Retrieve top 5 most similar stories from an epic.
        
        Args:
            query_story: The story to find similarities for (or a prompt dict)
            epic_stories: List of all stories in the epic
            exclude_story_id: Optional story ID to exclude from results
            
        Returns:
            List of tuples: (story_dict, similarity_scores_dict)
            Sorted by combined_score descending
        """
        if not epic_stories:
            return []
        
        # Filter out the query story itself if it's in the epic
        candidate_stories = [
            s for s in epic_stories 
            if s.get('id') != exclude_story_id and s.get('id') != query_story.get('id')
        ]
        
        if len(candidate_stories) < 1:
            return []
        
        # Calculate similarities
        similarities = []
        for story in candidate_stories:
            scores = self.calculate_similarity(query_story, story)
            similarities.append((story, scores))
        
        # Sort by combined score descending
        similarities.sort(key=lambda x: x[1]['combined_score'], reverse=True)
        
        # Return top 5 (or fewer if less available)
        return similarities[:5]
    
    def handle_edge_cases(
        self,
        query_story: Dict,
        epic_stories: List[Dict]
    ) -> List[Tuple[Dict, Dict[str, float]]]:
        """
        Handle edge cases: empty epic, <5 stories, low similarity scenarios.
        
        Args:
            query_story: The story to find similarities for
            epic_stories: List of all stories in the epic
            
        Returns:
            List of similar stories (may be empty or <5)
        """
        # Empty epic
        if not epic_stories:
            print("⚠️  Warning: Epic is empty, returning no similar stories")
            return []
        
        # Less than 5 stories
        if len(epic_stories) < 5:
            print(f"ℹ️  Epic has only {len(epic_stories)} stories, returning all available")
        
        # Get top 5 (or fewer)
        top_stories = self.retrieve_top_5(query_story, epic_stories)
        
        # Check for low similarity threshold
        if top_stories and top_stories[0][1]['combined_score'] < 0.3:
            print(f"⚠️  Warning: Highest similarity is {top_stories[0][1]['combined_score']:.2f}, which is quite low")
        
        return top_stories

