# Projects API - Testing Guide

Quick reference for testing the newly implemented Projects API.

## Prerequisites

1. **Start the server:**
```bash
npm run dev
```

2. **Get authenticated:**
- Visit `http://localhost:3000/api/auth/signin`
- Login with Google or GitHub
- Note your user ID and organization ID from the database

## API Endpoints

### 1. Create a Project

```bash
POST http://localhost:3000/api/organizations/YOUR_ORG_ID/projects
Content-Type: application/json

{
  "name": "E-Commerce Platform",
  "slug": "ecommerce-platform",
  "description": "Building a modern e-commerce solution",
  "ownerId": "YOUR_USER_ID",
  "settings": {
    "sprintLength": 14,
    "estimationMethod": "fibonacci"
  }
}
```

**Expected Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "proj-xxx",
    "name": "E-Commerce Platform",
    "slug": "ecommerce-platform",
    "status": "planning",
    "epicCount": 0,
    "storyCount": 0,
    "activeSprintCount": 0,
    ...
  }
}
```

---

### 2. List All Projects

```bash
GET http://localhost:3000/api/organizations/YOUR_ORG_ID/projects
```

**With filters:**
```bash
GET http://localhost:3000/api/organizations/YOUR_ORG_ID/projects?status=active
```

**Expected Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "proj-xxx",
      "name": "E-Commerce Platform",
      "epicCount": 3,
      "storyCount": 15,
      "activeSprintCount": 1
    }
  ],
  "meta": {
    "total": 1
  }
}
```

---

### 3. Get Project Details

```bash
GET http://localhost:3000/api/projects/PROJECT_ID
```

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "proj-xxx",
    "name": "E-Commerce Platform",
    "description": "Building a modern e-commerce solution",
    "status": "active",
    "ownerName": "John Doe",
    "ownerEmail": "john@example.com",
    "epicCount": 3,
    "storyCount": 15,
    "completedStoryCount": 8,
    "sprintCount": 2
  }
}
```

---

### 4. Update Project

```bash
PUT http://localhost:3000/api/projects/PROJECT_ID
Content-Type: application/json

{
  "name": "E-Commerce Platform v2",
  "status": "active",
  "description": "Updated description"
}
```

**Partial update with PATCH:**
```bash
PATCH http://localhost:3000/api/projects/PROJECT_ID
Content-Type: application/json

{
  "status": "on_hold"
}
```

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "proj-xxx",
    "name": "E-Commerce Platform v2",
    "status": "active",
    ...
  }
}
```

---

### 5. Get Project Statistics

```bash
GET http://localhost:3000/api/projects/PROJECT_ID/stats
```

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "totalEpics": 3,
    "totalStories": 15,
    "completedStories": 8,
    "inProgressStories": 5,
    "totalStoryPoints": 89,
    "completedStoryPoints": 55,
    "totalSprints": 2,
    "activeSprints": 1,
    "completionPercentage": 53,
    "pointsCompletionPercentage": 62,
    "averagePointsPerStory": 5.9
  }
}
```

---

### 6. Archive Project

```bash
POST http://localhost:3000/api/projects/PROJECT_ID/archive
```

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "proj-xxx",
    "status": "archived",
    ...
  }
}
```

---

### 7. Delete Project

⚠️ **Note:** Can only delete empty projects (no epics or stories)

```bash
DELETE http://localhost:3000/api/projects/PROJECT_ID
```

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "success": true
  }
}
```

**Error if project has content (409):**
```json
{
  "success": false,
  "error": {
    "code": "CONFLICT",
    "message": "Cannot delete project with existing epics or stories. Archive it instead."
  }
}
```

---

## Error Responses

### Validation Error (400)
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "details": [
      {
        "path": ["slug"],
        "message": "Invalid slug format"
      }
    ]
  }
}
```

### Unauthorized (401)
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

### Forbidden (403)
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Cannot modify this project"
  }
}
```

### Not Found (404)
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Project not found"
  }
}
```

### Conflict (409)
```json
{
  "success": false,
  "error": {
    "code": "CONFLICT",
    "message": "Project with slug 'my-project' already exists"
  }
}
```

---

## Testing with cURL

### Create Project
```bash
curl -X POST http://localhost:3000/api/organizations/org-123/projects \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "name": "Test Project",
    "slug": "test-project",
    "description": "Testing the API",
    "ownerId": "user-123"
  }'
```

### List Projects
```bash
curl http://localhost:3000/api/organizations/org-123/projects \
  -H "Cookie: your-session-cookie"
```

### Get Project Stats
```bash
curl http://localhost:3000/api/projects/proj-123/stats \
  -H "Cookie: your-session-cookie"
```

### Update Project
```bash
curl -X PUT http://localhost:3000/api/projects/proj-123 \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "status": "active"
  }'
```

### Archive Project
```bash
curl -X POST http://localhost:3000/api/projects/proj-123/archive \
  -H "Cookie: your-session-cookie"
```

### Delete Project
```bash
curl -X DELETE http://localhost:3000/api/projects/proj-123 \
  -H "Cookie: your-session-cookie"
```

---

## Testing with Postman

1. **Import collection:**
   - Create new collection "SynqForge API"
   - Add base URL variable: `http://localhost:3000`

2. **Set up authentication:**
   - Login via browser first
   - Copy session cookie
   - Add to Postman cookies

3. **Test endpoints:**
   - Use the examples above
   - Check response status codes
   - Verify data structure

---

## Complete Workflow Test

Test the full project lifecycle:

```bash
# 1. Create project
POST /api/organizations/{orgId}/projects
{
  "name": "Mobile App",
  "slug": "mobile-app",
  "ownerId": "{userId}"
}
# Note the projectId from response

# 2. Verify it appears in list
GET /api/organizations/{orgId}/projects

# 3. Get detailed info
GET /api/projects/{projectId}

# 4. Check initial stats (should be 0s)
GET /api/projects/{projectId}/stats

# 5. Update project status
PUT /api/projects/{projectId}
{
  "status": "active"
}

# 6. Create some epics and stories (once those APIs exist)
# ... add content ...

# 7. Check updated stats
GET /api/projects/{projectId}/stats

# 8. Archive when done
POST /api/projects/{projectId}/archive

# 9. Verify archived status
GET /api/projects/{projectId}
```

---

## Common Issues

### Issue: "Unauthorized"
**Solution:** Make sure you're authenticated. Login via `/api/auth/signin` first.

### Issue: "Slug already exists"
**Solution:** Use a different slug. Slugs must be unique within an organization.

### Issue: "Cannot delete project"
**Solution:** Projects with epics/stories can't be deleted. Archive them instead using `/archive` endpoint.

### Issue: "User not found"
**Solution:** Verify the `ownerId` exists in your organization.

---

## Next Steps

Once Projects API is working:
1. **Create Epics** - Build the Epics API to add content to projects
2. **Create Stories** - Already built, just need projects to exist first
3. **Build Frontend** - Create UI to interact with these APIs
4. **Add Real-time** - Sync changes across users

---

**Status:** Projects API fully implemented and ready for testing! ✅
