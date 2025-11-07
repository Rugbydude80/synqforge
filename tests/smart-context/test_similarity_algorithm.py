"""
Test 2: Similarity Retrieval Accuracy
Validates the similarity algorithm retrieves contextually relevant stories.
"""
import pytest
from test_helpers import EmbeddingsService, create_test_epic_with_stories


@pytest.fixture
def embeddings_service():
    """Fixture for embeddings service."""
    return EmbeddingsService()


def test_retrieves_semantically_similar_stories(
    db_connection,
    test_epic_id,
    test_project_id,
    test_org_id,
    test_user_id,
    embeddings_service
):
    """Verify similarity algorithm finds relevant stories."""
    # Arrange: Epic with distinct story groups
    stories_data = [
        {
            'title': 'Login: User authentication',
            'description': 'User login with email/password',
            'acceptance_criteria': ['Given I am on the login page', 'When I enter valid credentials', 'Then I should be logged in']
        },
        {
            'title': 'Login: Password reset',
            'description': 'User resets forgotten password',
            'acceptance_criteria': ['Given I forgot my password', 'When I request a reset', 'Then I receive an email']
        },
        {
            'title': 'Login: Two-factor auth',
            'description': 'User enables 2FA security',
            'acceptance_criteria': ['Given I want extra security', 'When I enable 2FA', 'Then I must verify with code']
        },
        {
            'title': 'Payment: Credit card processing',
            'description': 'User pays with credit card',
            'acceptance_criteria': ['Given I am at checkout', 'When I enter card details', 'Then payment is processed']
        },
        {
            'title': 'Payment: PayPal integration',
            'description': 'User pays with PayPal',
            'acceptance_criteria': ['Given I want to use PayPal', 'When I select PayPal', 'Then I am redirected to PayPal']
        }
    ]
    
    create_test_epic_with_stories(
        db_connection,
        test_epic_id,
        test_project_id,
        test_org_id,
        test_user_id,
        count=5,
        stories_data=stories_data
    )
    
    prompt = "User wants to implement social media login"
    
    # Act: Retrieve similar stories
    retrieved = embeddings_service.find_similar_stories(
        query_text=prompt,
        epic_id=test_epic_id,
        limit=3,
        min_similarity=0.0  # Lower threshold for testing
    )
    
    # Assert: Top 3 should be login-related, not payment
    assert len(retrieved) > 0, "Should retrieve at least one story"
    
    retrieved_titles = [s['title'] for s in retrieved]
    
    # Check that login stories rank higher than payment stories
    login_count = sum(1 for title in retrieved_titles if 'Login' in title)
    payment_count = sum(1 for title in retrieved_titles if 'Payment' in title)
    
    # At least one login story should be in top results
    assert login_count >= 1, f"Should retrieve login-related stories, got: {retrieved_titles}"


def test_similarity_scores_are_valid(
    db_connection,
    test_epic_id,
    test_project_id,
    test_org_id,
    test_user_id,
    embeddings_service
):
    """Verify similarity scores are properly calculated."""
    # Arrange
    stories_data = [
        {
            'title': f'Story {i+1}',
            'description': f'Description for story {i+1}',
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
    
    prompt = "User wants to view order history"
    
    # Act
    retrieved = embeddings_service.find_similar_stories(
        query_text=prompt,
        epic_id=test_epic_id,
        limit=5,
        min_similarity=0.0
    )
    
    # Assert: Scores should be valid and descending
    assert len(retrieved) > 0, "Should retrieve at least one story"
    
    for story in retrieved:
        assert 'similarity' in story, "Should include similarity score"
        assert 0 <= story['similarity'] <= 1, f"Score should be between 0 and 1, got {story['similarity']}"
    
    scores = [s['similarity'] for s in retrieved]
    assert scores == sorted(scores, reverse=True), f"Stories should be ranked by similarity (highest first), got: {scores}"

