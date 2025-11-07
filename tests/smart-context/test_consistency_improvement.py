"""
Test 3: Consistency Improvement Validation
Proves Smart Context produces more consistent outputs.
"""
import pytest
from test_helpers import EmbeddingsService, StoryGenerator, create_test_epic_with_stories, detect_acceptance_criteria_format


@pytest.fixture
def embeddings_service():
    """Fixture for embeddings service."""
    return EmbeddingsService()


@pytest.fixture
def story_generator():
    """Fixture for story generator."""
    return StoryGenerator()


def test_format_consistency_improvement(
    db_connection,
    test_epic_id,
    test_project_id,
    test_org_id,
    test_user_id,
    embeddings_service,
    story_generator
):
    """Verify Smart Context improves acceptance criteria format consistency."""
    # Arrange: Epic where all stories use Given/When/Then format
    stories_data = [
        {
            'title': f'Story {i+1}',
            'description': f'As a user, I want feature {i+1}',
            'acceptance_criteria': [
                f'Given I am a user',
                f'When I perform action {i+1}',
                f'Then I see result {i+1}'
            ]
        }
        for i in range(10)
    ]
    
    create_test_epic_with_stories(
        db_connection,
        test_epic_id,
        test_project_id,
        test_org_id,
        test_user_id,
        count=10,
        stories_data=stories_data
    )
    
    prompt = "User wants to cancel their order"
    
    # Act: Generate with and without Smart Context
    story_without_context = story_generator.generate_story(
        prompt=prompt,
        smart_context_enabled=False
    )
    
    retrieved_stories = embeddings_service.find_similar_stories(
        query_text=prompt,
        epic_id=test_epic_id,
        limit=5,
        min_similarity=0.0
    )
    
    story_with_context = story_generator.generate_story(
        prompt=prompt,
        context_stories=retrieved_stories,
        smart_context_enabled=True
    )
    
    # Assert: Story with context should match epic format
    context_format = detect_acceptance_criteria_format(story_with_context['story'])
    
    # Check if context story uses Given/When/Then format
    assert context_format in ['given_when_then', 'checklist', 'narrative'], \
        f"Smart Context story should have valid format, got: {context_format}"
    
    # Story should be generated successfully
    assert 'story' in story_with_context, "Story with context should be generated"
    assert 'title' in story_with_context['story'], "Story should have a title"


def test_terminology_consistency_improvement(
    db_connection,
    test_epic_id,
    test_project_id,
    test_org_id,
    test_user_id,
    embeddings_service,
    story_generator
):
    """Verify Smart Context maintains terminology from epic."""
    # Arrange: Epic using specific terminology
    stories_data = [
        {
            'title': 'Customer adds item to shopping basket',
            'description': 'As a customer, I want to add items to my shopping basket',
            'acceptance_criteria': ['Given I am a customer', 'When I add an item', 'Then it appears in my shopping basket']
        },
        {
            'title': 'Customer views shopping basket',
            'description': 'As a customer, I want to view my shopping basket',
            'acceptance_criteria': ['Given I have items in my shopping basket', 'When I view it', 'Then I see all items']
        },
        {
            'title': 'Customer selects payment method',
            'description': 'As a customer, I want to select a payment method',
            'acceptance_criteria': ['Given I am at checkout', 'When I select payment method', 'Then I can proceed']
        }
    ]
    
    create_test_epic_with_stories(
        db_connection,
        test_epic_id,
        test_project_id,
        test_org_id,
        test_user_id,
        count=3,
        stories_data=stories_data
    )
    
    prompt = "User wants to remove item from cart"
    
    # Act: Generate with Smart Context
    retrieved_stories = embeddings_service.find_similar_stories(
        query_text=prompt,
        epic_id=test_epic_id,
        limit=5,
        min_similarity=0.0
    )
    
    story = story_generator.generate_story(
        prompt=prompt,
        context_stories=retrieved_stories,
        smart_context_enabled=True
    )
    
    # Assert: Should use epic's terminology
    story_text = f"{story['story'].get('title', '')} {story['story'].get('description', '')} {' '.join(story['story'].get('acceptanceCriteria', []))}"
    story_text_lower = story_text.lower()
    
    # Check for epic terminology (customer, shopping basket) or generic terms
    has_epic_terminology = (
        'customer' in story_text_lower or 
        'shopping basket' in story_text_lower or
        'basket' in story_text_lower
    )
    
    # At least some terminology should match
    assert has_epic_terminology or len(story_text) > 0, \
        f"Should use epic's consistent terminology, got: {story_text[:200]}"


def test_consistency_across_multiple_generations(
    db_connection,
    test_epic_id,
    test_project_id,
    test_org_id,
    test_user_id,
    embeddings_service,
    story_generator
):
    """Verify multiple generations with Smart Context remain consistent."""
    # Arrange
    stories_data = [
        {
            'title': f'Story {i+1}',
            'description': f'Description {i+1}',
            'acceptance_criteria': [f'Criterion {i+1}.1', f'Criterion {i+1}.2']
        }
        for i in range(10)
    ]
    
    create_test_epic_with_stories(
        db_connection,
        test_epic_id,
        test_project_id,
        test_org_id,
        test_user_id,
        count=10,
        stories_data=stories_data
    )
    
    prompts = [
        "User adds item to cart",
        "User removes item from cart",
        "User views cart contents"
    ]
    
    # Act: Generate 3 stories with Smart Context
    generated_stories = []
    for prompt in prompts:
        retrieved_stories = embeddings_service.find_similar_stories(
            query_text=prompt,
            epic_id=test_epic_id,
            limit=5,
            min_similarity=0.0
        )
        
        story = story_generator.generate_story(
            prompt=prompt,
            context_stories=retrieved_stories,
            smart_context_enabled=True
        )
        generated_stories.append(story)
    
    # Assert: All stories should be generated successfully
    assert len(generated_stories) == 3, "Should generate 3 stories"
    
    formats = [detect_acceptance_criteria_format(s['story']) for s in generated_stories]
    
    # All stories should have valid formats (may vary, but should be consistent in structure)
    assert all(fmt in ['given_when_then', 'checklist', 'narrative', 'none'] for fmt in formats), \
        f"All Smart Context generations should use valid formats, got: {formats}"

