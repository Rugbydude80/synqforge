"""
Comparison Test Suite
Generates stories in control and test groups, measures metrics, and compares results.
"""

import asyncio
import json
from typing import List, Dict
from datetime import datetime
from similarity import StorySimilarityCalculator
from generation import StoryGenerator
from metrics import ConsistencyMetrics
from sample_epic_stories import SAMPLE_EPIC_STORIES, TEST_PROMPTS


class SmartContextTestSuite:
    """Test suite for validating Smart Context feature."""
    
    def __init__(self):
        """Initialize the test suite."""
        self.similarity_calc = StorySimilarityCalculator()
        self.story_generator = StoryGenerator()
        self.metrics_calc = ConsistencyMetrics()
        self.epic_stories = SAMPLE_EPIC_STORIES
    
    def _create_prompt_dict(self, prompt: str) -> Dict:
        """
        Convert a text prompt into a story-like dictionary for similarity calculation.
        
        Args:
            prompt: Text prompt
            
        Returns:
            Dictionary with prompt as description
        """
        return {
            'id': 'prompt_temp',
            'title': prompt,
            'description': prompt,
            'acceptanceCriteria': []
        }
    
    def generate_control_group(self, prompts: List[str]) -> List[Dict]:
        """
        Generate stories without context (control group).
        
        Args:
            prompts: List of story prompts
            
        Returns:
            List of generated stories with metadata
        """
        print("\n" + "="*60)
        print("GENERATING CONTROL GROUP (No Context)")
        print("="*60)
        
        control_stories = []
        for idx, prompt in enumerate(prompts, 1):
            print(f"\n[{idx}/{len(prompts)}] Generating story for: {prompt}")
            try:
                result = self.story_generator.generate_story_without_context(prompt)
                result['prompt'] = prompt
                result['group'] = 'control'
                control_stories.append(result)
                print(f"✅ Generated: {result['story'].get('title', 'N/A')}")
            except Exception as e:
                print(f"❌ Error generating story: {e}")
                control_stories.append({
                    'prompt': prompt,
                    'group': 'control',
                    'story': {'title': prompt, 'error': str(e)},
                    'metadata': {'error': True}
                })
        
        return control_stories
    
    def generate_test_group(self, prompts: List[str]) -> List[Dict]:
        """
        Generate stories with Smart Context (test group).
        
        Args:
            prompts: List of story prompts
            
        Returns:
            List of generated stories with metadata and context info
        """
        print("\n" + "="*60)
        print("GENERATING TEST GROUP (With Smart Context)")
        print("="*60)
        
        test_stories = []
        for idx, prompt in enumerate(prompts, 1):
            print(f"\n[{idx}/{len(prompts)}] Generating story for: {prompt}")
            
            # Create prompt dict for similarity search
            prompt_dict = self._create_prompt_dict(prompt)
            
            # Retrieve top 5 similar stories
            print("  🔍 Finding similar stories...")
            similar_stories = self.similarity_calc.handle_edge_cases(
                prompt_dict,
                self.epic_stories
            )
            
            if similar_stories:
                print(f"  ✅ Found {len(similar_stories)} similar stories:")
                for i, (story, scores) in enumerate(similar_stories[:3], 1):
                    print(f"     {i}. {story['title']} (similarity: {scores['combined_score']:.2f})")
            else:
                print("  ⚠️  No similar stories found")
            
            try:
                result = self.story_generator.generate_story_with_context(
                    prompt,
                    contextual_stories=similar_stories
                )
                result['prompt'] = prompt
                result['group'] = 'test'
                result['context_stories'] = [
                    {
                        'story': story,
                        'similarity_scores': scores
                    }
                    for story, scores in similar_stories
                ]
                test_stories.append(result)
                print(f"  ✅ Generated: {result['story'].get('title', 'N/A')}")
            except Exception as e:
                print(f"  ❌ Error generating story: {e}")
                test_stories.append({
                    'prompt': prompt,
                    'group': 'test',
                    'story': {'title': prompt, 'error': str(e)},
                    'metadata': {'error': True},
                    'context_stories': []
                })
        
        return test_stories
    
    def calculate_group_metrics(self, stories: List[Dict]) -> Dict:
        """
        Calculate average metrics for a group of stories.
        
        Args:
            stories: List of generated stories
            
        Returns:
            Dictionary with average metrics
        """
        metrics_list = []
        for story_data in stories:
            if story_data.get('metadata', {}).get('error'):
                continue
            
            story = story_data.get('story', {})
            if not story:
                continue
            
            metrics = self.metrics_calc.calculate_all_metrics(story, self.epic_stories)
            metrics_list.append(metrics)
        
        if not metrics_list:
            return {
                'format_consistency': 0.0,
                'terminology_overlap': 0.0,
                'edit_distance_similarity': 0.0
            }
        
        # Calculate averages
        return {
            'format_consistency': sum(m['format_consistency'] for m in metrics_list) / len(metrics_list),
            'terminology_overlap': sum(m['terminology_overlap'] for m in metrics_list) / len(metrics_list),
            'edit_distance_similarity': sum(m['edit_distance_similarity'] for m in metrics_list) / len(metrics_list)
        }
    
    def compare_groups(self, control_group: List[Dict], test_group: List[Dict]) -> Dict:
        """
        Compare control and test groups to calculate improvements.
        
        Args:
            control_group: Control group stories
            test_group: Test group stories
            
        Returns:
            Dictionary with comparison metrics
        """
        control_metrics = self.calculate_group_metrics(control_group)
        test_metrics = self.calculate_group_metrics(test_group)
        
        improvements = {}
        for metric in ['format_consistency', 'terminology_overlap', 'edit_distance_similarity']:
            control_val = control_metrics[metric]
            test_val = test_metrics[metric]
            
            if control_val > 0:
                improvement = ((test_val - control_val) / control_val) * 100
            else:
                improvement = (test_val * 100) if test_val > 0 else 0.0
            
            improvements[metric] = {
                'control': control_val,
                'test': test_val,
                'improvement_pct': improvement
            }
        
        return {
            'control_metrics': control_metrics,
            'test_metrics': test_metrics,
            'improvements': improvements
        }
    
    def run_test_suite(self) -> Dict:
        """
        Run the complete test suite.
        
        Returns:
            Complete test results dictionary
        """
        print("\n" + "="*60)
        print("SMART CONTEXT FEATURE TEST SUITE")
        print("="*60)
        print(f"Epic: E-commerce Checkout Flow")
        print(f"Epic Stories: {len(self.epic_stories)}")
        print(f"Test Prompts: {len(TEST_PROMPTS)}")
        print("="*60)
        
        # Split prompts: 5 for control, 5 for test
        control_prompts = TEST_PROMPTS[:5]
        test_prompts = TEST_PROMPTS[:5]  # Use same prompts for fair comparison
        
        # Generate control group
        control_group = self.generate_control_group(control_prompts)
        
        # Generate test group
        test_group = self.generate_test_group(test_prompts)
        
        # Calculate metrics
        print("\n" + "="*60)
        print("CALCULATING METRICS")
        print("="*60)
        
        comparison = self.compare_groups(control_group, test_group)
        
        # Prepare context examples
        context_examples = []
        for story_data in test_group:
            if story_data.get('context_stories'):
                context_examples.append({
                    'prompt': story_data['prompt'],
                    'retrieved_stories': [
                        {
                            'title': ctx['story']['title'],
                            'similarity': ctx['similarity_scores']['combined_score']
                        }
                        for ctx in story_data['context_stories']
                    ]
                })
        
        # Compile results
        results = {
            'test_results': {
                'control_group': control_group,
                'test_group': test_group,
                'metrics': {
                    'format_consistency_improvement': f"{comparison['improvements']['format_consistency']['improvement_pct']:.1f}%",
                    'terminology_overlap_improvement': f"{comparison['improvements']['terminology_overlap']['improvement_pct']:.1f}%",
                    'avg_edit_distance_reduction': f"{comparison['improvements']['edit_distance_similarity']['improvement_pct']:.1f}%"
                },
                'detailed_metrics': comparison
            },
            'context_examples': context_examples,
            'timestamp': datetime.now().isoformat(),
            'epic_info': {
                'story_count': len(self.epic_stories),
                'test_prompt_count': len(TEST_PROMPTS)
            }
        }
        
        return results

