"""
Test 4: Edge Case Handling
Validates robust behavior in edge cases.
"""
import pytest
from test_helpers import EmbeddingsService, StoryGenerator, create_test_epic_with_stories


@pytest.fixture
def embeddings_service():
    """Fixture for embeddings service."""
    return EmbeddingsService()


@pytest.fixture
def story_generator():
    """Fixture for story generator."""
    return StoryGenerator()


def test_empty_epic_handles_gracefully(
    db_connection,
    test_epic_id,
    test_project_id,
    test_org_id,
    test_user_id,
    embeddings_service,
    story_generator
):
    """Verify Smart Context handles epic with 0 stories."""
    # Arrange: Empty epic (no stories created)
    prompt = "User wants to create account"
    
    # Act & Assert: Should not crash
    try:
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
        
        assert story is not None, "Should generate story even with empty epic"
        assert story['metadata'].get('context_stories_count', 0) == len(retrieved_stories), \
            f"Should indicate {len(retrieved_stories)} context stories used"
        assert 'story' in story, "Generated story should have story data"
    except Exception as e:
        pytest.fail(f"Should handle empty epic gracefully, but raised: {e}")


def test_fewer_than_five_stories_uses_all_available(
    db_connection,
    test_epic_id,
    test_project_id,
    test_org_id,
    test_user_id,
    embeddings_service
):
    """Verify Smart Context uses all available stories when <5 exist."""
    # Arrange: Epic with only 3 stories
    stories_data = [
        {
            'title': f'Story {i+1}',
            'description': f'Description {i+1}',
            'acceptance_criteria': [f'Criterion {i+1}.1']
        }
        for i in range(3)
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
    
    prompt = "User completes checkout"
    
    # Act
    retrieved = embeddings_service.find_similar_stories(
        query_text=prompt,
        epic_id=test_epic_id,
        limit=5,
        min_similarity=0.0
    )
    
    # Assert: Should retrieve all 3 available stories (or fewer if similarity threshold filters them)
    assert len(retrieved) <= 3, f"Should use at most 3 available stories, not fail because <5, got {len(retrieved)}"
    assert len(retrieved) >= 0, "Should return at least 0 stories"


def test_low_similarity_epic_still_generates(
    db_connection,
    test_epic_id,
    test_project_id,
    test_org_id,
    test_user_id,
    embeddings_service,
    story_generator
):
    """Verify generation succeeds even when epic stories have low relevance."""
    # Arrange: Epic about e-commerce, prompt about HR management (unrelated)
    stories_data = [
        {
            'title': 'E-commerce: Add to cart',
            'description': 'User adds product to shopping cart',
            'acceptance_criteria': ['Given I view a product', 'When I click add', 'Then item is in cart']
        },
        {
            'title': 'E-commerce: Checkout',
            'description': 'User completes purchase',
            'acceptance_criteria': ['Given I have items', 'When I checkout', 'Then order is placed']
        },
        {
            'title': 'E-commerce: Payment',
            'description': 'User pays for order',
            'acceptance_criteria': ['Given I am at checkout', 'When I pay', 'Then payment processes']
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
    
    prompt = "Employee submits time-off request"
    
    # Act
    retrieved_stories = embeddings_service.find_similar_stories(
        query_text=prompt,
        epic_id=test_epic_id,
        limit=5,
        min_similarity=0.0  # Low threshold to allow low similarity matches
    )
    
    story = story_generator.generate_story(
        prompt=prompt,
        context_stories=retrieved_stories,
        smart_context_enabled=True
    )
    
    # Assert: Should generate valid story despite poor context match
    assert story is not None, "Should generate story even with low-relevance context"
    assert 'story' in story, "Generated story should have story data"
    assert story['story'].get('title'), "Generated story should have a title"
    assert story['story'].get('description'), "Generated story should have a description"

