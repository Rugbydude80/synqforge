"""
Test 1: Feature Integration Validation
Validates that Smart Context properly integrates with the existing story generation pipeline.
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


def test_smart_context_enabled_uses_retrieved_stories(
    db_connection,
    test_epic_id,
    test_project_id,
    test_org_id,
    test_user_id,
    embeddings_service,
    story_generator
):
    """Verify Smart Context actually passes retrieved stories to generation."""
    # Arrange: Epic with 10 diverse stories
    stories_data = [
        {
            'title': 'Login: User authentication',
            'description': 'User login with email/password',
            'acceptance_criteria': [
                'Given I am on the login page',
                'When I enter valid credentials',
                'Then I should be logged in'
            ]
        },
        {
            'title': 'Login: Password reset',
            'description': 'User resets forgotten password',
            'acceptance_criteria': [
                'Given I forgot my password',
                'When I request a reset',
                'Then I receive an email with reset link'
            ]
        },
        {
            'title': 'Checkout: Apply discount code',
            'description': 'User applies discount code during checkout',
            'acceptance_criteria': [
                'Given I have items in my cart',
                'When I enter a valid discount code',
                'Then the discount is applied to my total'
            ]
        },
        {
            'title': 'Checkout: Payment processing',
            'description': 'User completes payment',
            'acceptance_criteria': [
                'Given I am on the checkout page',
                'When I enter payment details',
                'Then payment is processed successfully'
            ]
        },
        {
            'title': 'Cart: Add item',
            'description': 'User adds item to shopping cart',
            'acceptance_criteria': [
                'Given I am viewing a product',
                'When I click add to cart',
                'Then the item is added to my cart'
            ]
        },
        {
            'title': 'Cart: Remove item',
            'description': 'User removes item from cart',
            'acceptance_criteria': [
                'Given I have items in my cart',
                'When I click remove',
                'Then the item is removed'
            ]
        },
        {
            'title': 'Product: View details',
            'description': 'User views product details',
            'acceptance_criteria': [
                'Given I am browsing products',
                'When I click on a product',
                'Then I see detailed product information'
            ]
        },
        {
            'title': 'Product: Search',
            'description': 'User searches for products',
            'acceptance_criteria': [
                'Given I am on the product page',
                'When I enter a search term',
                'Then I see matching products'
            ]
        },
        {
            'title': 'Order: View history',
            'description': 'User views order history',
            'acceptance_criteria': [
                'Given I am logged in',
                'When I navigate to orders',
                'Then I see my order history'
            ]
        },
        {
            'title': 'Order: Track shipment',
            'description': 'User tracks order shipment',
            'acceptance_criteria': [
                'Given I have placed an order',
                'When I view order details',
                'Then I see shipment tracking information'
            ]
        }
    ]
    
    story_ids = create_test_epic_with_stories(
        db_connection,
        test_epic_id,
        test_project_id,
        test_org_id,
        test_user_id,
        count=10,
        stories_data=stories_data
    )
    
    prompt = "User wants to apply discount code during checkout"
    
    # Act: Enable Smart Context and generate story
    retrieved_stories = embeddings_service.find_similar_stories(
        query_text=prompt,
        epic_id=test_epic_id,
        limit=5,
        min_similarity=0.0  # Lower threshold for testing
    )
    
    generated_story = story_generator.generate_story(
        prompt=prompt,
        context_stories=retrieved_stories,
        smart_context_enabled=True
    )
    
    # Assert: Verify feature executed correctly
    assert len(retrieved_stories) <= 5, "Should retrieve at most 5 stories"
    assert retrieved_stories is not None, "Context stories should not be None"
    assert generated_story is not None, "Story generation should succeed"
    assert generated_story['metadata']['smart_context_used'] == True, "Metadata should confirm Smart Context was used"
    assert len(generated_story['metadata']['context_story_ids']) == len(retrieved_stories), "Should track which stories were used as context"
    assert 'story' in generated_story, "Generated story should have story data"
    assert 'title' in generated_story['story'], "Generated story should have a title"


def test_smart_context_disabled_generates_without_context(
    story_generator
):
    """Verify generation works without Smart Context when disabled."""
    # Arrange: Same epic and prompt
    prompt = "User wants to apply discount code during checkout"
    
    # Act: Disable Smart Context and generate story
    generated_story = story_generator.generate_story(
        prompt=prompt,
        context_stories=None,
        smart_context_enabled=False
    )
    
    # Assert: Verify no context was used
    assert generated_story is not None, "Story generation should succeed"
    assert generated_story['metadata'].get('smart_context_used', False) == False, "Should not use Smart Context"
    assert generated_story['metadata'].get('context_stories_count', 0) == 0, "Should not have context stories"
    assert 'story' in generated_story, "Generated story should have story data"

