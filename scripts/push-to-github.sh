#!/bin/bash
set -e

echo "=== Git Status ==="
git status

echo ""
echo "=== Staging all changes ==="
git add -A

echo ""
echo "=== Changes to be committed ==="
git status --short

echo ""
echo "=== Committing changes ==="
git commit -m "feat: Add REST API v1 and webhooks system

- Add API key authentication and management
- Implement REST API v1 endpoints (stories, projects, epics, sprints, webhooks)
- Add webhook system with delivery and retry logic
- Add rate limiting by API key with tier-based limits
- Add security hardening (input sanitization, CORS, request size limits)
- Add API key management UI at /settings/api-keys
- Update database schema with api_keys, webhooks, webhook_deliveries tables
- Add deployment scripts and GitHub Actions workflow
- Add comprehensive documentation"

echo ""
echo "=== Pushing to GitHub ==="
BRANCH=$(git branch --show-current)
echo "Current branch: $BRANCH"
git push origin "$BRANCH"

echo ""
echo "=== Push complete! ==="









