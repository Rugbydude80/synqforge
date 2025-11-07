"""
Pytest configuration and fixtures for Smart Context validation tests.
"""
import os
import pytest
from typing import Generator, Dict, List
from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import RealDictCursor
import uuid
from datetime import datetime

# Load environment variables
load_dotenv()


@pytest.fixture(scope="session")
def db_connection():
    """Create a database connection for tests."""
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        pytest.skip("DATABASE_URL not set - skipping database tests")
    
    try:
        conn = psycopg2.connect(database_url)
        yield conn
        conn.close()
    except Exception as e:
        pytest.skip(f"Could not connect to database: {e}")


@pytest.fixture(scope="function")
def test_org_id(db_connection):
    """Create a test organization ID."""
    return f"test-org-{uuid.uuid4().hex[:8]}"


@pytest.fixture(scope="function")
def test_project_id(db_connection, test_org_id):
    """Create a test project."""
    cursor = db_connection.cursor()
    project_id = f"test-proj-{uuid.uuid4().hex[:8]}"
    
    try:
        cursor.execute("""
            INSERT INTO projects (id, organization_id, name, slug, status, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, NOW(), NOW())
            ON CONFLICT (id) DO NOTHING
        """, (project_id, test_org_id, "Test Project", f"test-{project_id}", "active"))
        db_connection.commit()
        yield project_id
    finally:
        cursor.execute("DELETE FROM projects WHERE id = %s", (project_id,))
        db_connection.commit()
        cursor.close()


@pytest.fixture(scope="function")
def test_epic_id(db_connection, test_project_id, test_org_id):
    """Create a test epic."""
    cursor = db_connection.cursor()
    epic_id = f"test-epic-{uuid.uuid4().hex[:8]}"
    
    try:
        cursor.execute("""
            INSERT INTO epics (id, project_id, organization_id, title, description, status, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, NOW(), NOW())
        """, (epic_id, test_project_id, test_org_id, "Test Epic", "Test epic description", "draft"))
        db_connection.commit()
        yield epic_id
    finally:
        # Clean up stories first
        cursor.execute("DELETE FROM stories WHERE epic_id = %s", (epic_id,))
        db_connection.commit()
        # Then clean up epic
        cursor.execute("DELETE FROM epics WHERE id = %s", (epic_id,))
        db_connection.commit()
        cursor.close()


@pytest.fixture(scope="function")
def test_user_id(db_connection, test_org_id):
    """Create a test user."""
    cursor = db_connection.cursor()
    user_id = f"test-user-{uuid.uuid4().hex[:8]}"
    
    try:
        cursor.execute("""
            INSERT INTO users (id, email, name, organization_id, created_at, updated_at)
            VALUES (%s, %s, %s, %s, NOW(), NOW())
            ON CONFLICT (id) DO NOTHING
        """, (user_id, f"test-{user_id}@example.com", "Test User", test_org_id))
        db_connection.commit()
        yield user_id
    finally:
        cursor.execute("DELETE FROM users WHERE id = %s", (user_id,))
        db_connection.commit()
        cursor.close()


def create_test_story(
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
            import json
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


@pytest.fixture(scope="function")
def cleanup_test_data(db_connection):
    """Cleanup fixture to remove test data after each test."""
    yield
    # Cleanup is handled by individual fixtures, but this ensures cleanup order
    pass

