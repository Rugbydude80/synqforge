"""
Test 5: Performance Validation
Ensures Smart Context doesn't introduce unacceptable latency.
"""
import pytest
import time
from test_helpers import EmbeddingsService, StoryGenerator, create_test_epic_with_stories


@pytest.fixture
def embeddings_service():
    """Fixture for embeddings service."""
    return EmbeddingsService()


@pytest.fixture
def story_generator():
    """Fixture for story generator."""
    return StoryGenerator()


def test_retrieval_performance(
    db_connection,
    test_epic_id,
    test_project_id,
    test_org_id,
    test_user_id,
    embeddings_service
):
    """Verify similarity retrieval completes within acceptable time."""
    # Arrange: Larger epic
    stories_data = [
        {
            'title': f'Story {i+1}',
            'description': f'Description for story {i+1}',
            'acceptance_criteria': [f'Criterion {i+1}.1', f'Criterion {i+1}.2']
        }
        for i in range(50)
    ]
    
    create_test_epic_with_stories(
        db_connection,
        test_epic_id,
        test_project_id,
        test_org_id,
        test_user_id,
        count=50,
        stories_data=stories_data
    )
    
    prompt = "User wants to track shipment"
    
    # Act
    start_time = time.time()
    retrieved = embeddings_service.find_similar_stories(
        query_text=prompt,
        epic_id=test_epic_id,
        limit=5,
        min_similarity=0.0
    )
    retrieval_time = time.time() - start_time
    
    # Assert: Should complete within 10 seconds (generous for API calls)
    assert retrieval_time < 10.0, f"Retrieval took {retrieval_time:.2f}s, should be <10s"
    assert len(retrieved) <= 5, "Should still retrieve correct number"


def test_generation_with_context_performance(
    db_connection,
    test_epic_id,
    test_project_id,
    test_org_id,
    test_user_id,
    embeddings_service,
    story_generator
):
    """Verify Smart Context doesn't significantly slow generation."""
    # Arrange
    stories_data = [
        {
            'title': f'Story {i+1}',
            'description': f'Description {i+1}',
            'acceptance_criteria': [f'Criterion {i+1}.1']
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
    
    prompt = "User updates profile information"
    
    # Act: Measure with and without context
    start = time.time()
    story_without = story_generator.generate_story(
        prompt=prompt,
        smart_context_enabled=False
    )
    time_without = time.time() - start
    
    retrieved_stories = embeddings_service.find_similar_stories(
        query_text=prompt,
        epic_id=test_epic_id,
        limit=5,
        min_similarity=0.0
    )
    
    start = time.time()
    story_with = story_generator.generate_story(
        prompt=prompt,
        context_stories=retrieved_stories,
        smart_context_enabled=True
    )
    time_with = time.time() - start
    
    # Assert: Smart Context shouldn't add more than 10 seconds overhead (generous for API calls)
    time_overhead = time_with - time_without
    assert time_overhead < 10.0, f"Smart Context adds {time_overhead:.2f}s overhead, should be <10s"
    assert story_without is not None, "Story without context should be generated"
    assert story_with is not None, "Story with context should be generated"

