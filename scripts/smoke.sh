#!/usr/bin/env bash
# SynqForge smoke tests for Project → Epic → Story journey
# Requires: curl; optionally jq (pretty output)

set -u
PASS=0
FAIL=0

# ---------- Config via env ----------
BASE_URL="${BASE_URL:-http://localhost:3000}"       # no trailing slash
STORY_ID="${STORY_ID:-}"                            # existing story (member-owned)
PROJECT_ID="${PROJECT_ID:-}"                        # project that owns STORY_ID
MEMBER_COOKIE="${MEMBER_COOKIE:-}"                  # cookie string for an org member
NONMEMBER_COOKIE="${NONMEMBER_COOKIE:-}"            # cookie string for a non-member
SKIP_AI="${SKIP_AI:-0}"                             # set to 1 to skip AI endpoints

# ---------- Helpers ----------
say()  { printf "%b\n" "$*"; }
ok()   { say "✅  $*"; PASS=$((PASS+1)); }
bad()  { say "❌  $*"; FAIL=$((FAIL+1)); }

require_env() {
  local name="$1" val="${!1:-}"
  if [ -z "$val" ]; then
    bad "Missing env: $name"
    MISSING=1
  fi
}

req() {
  # usage: req METHOD URL COOKIE DATA(optional)
  local METHOD="$1" URL="$2" COOKIE="$3" DATA="${4:-}"
  local TMP_BODY; TMP_BODY="$(mktemp)"
  if [ -n "$DATA" ]; then
    CODE=$(curl -sS -o "$TMP_BODY" -w "%{http_code}" -X "$METHOD" \
      -H "content-type: application/json" -H "cookie: $COOKIE" \
      --data "$DATA" "$URL")
  else
    CODE=$(curl -sS -o "$TMP_BODY" -w "%{http_code}" -X "$METHOD" \
      -H "cookie: $COOKIE" "$URL")
  fi
  BODY="$(cat "$TMP_BODY")"
  rm -f "$TMP_BODY"
  echo "$CODE"
  echo "$BODY"
}

expect_code_in() {
  # usage: expect_code_in NAME CODE EXPECTED_LIST
  local NAME="$1" CODE="$2"; shift 2
  for e in "$@"; do
    [ "$CODE" = "$e" ] && { ok "$NAME → $CODE"; return; }
  done
  bad "$NAME → $CODE (expected one of: $*)"
}

# ---------- Validate config ----------
MISSING=0
require_env BASE_URL
require_env STORY_ID
require_env PROJECT_ID
require_env MEMBER_COOKIE
require_env NONMEMBER_COOKIE
if [ "$MISSING" = "1" ]; then
  say "Set required env vars and re-run."
  exit 2
fi

say "🔎 Base: $BASE_URL"
say "🔎 Story: $STORY_ID | Project: $PROJECT_ID"
say "🔎 AI tests: $([ "$SKIP_AI" = "1" ] && echo skipped || echo enabled)"

# ---------- 1) Authorised story API read ----------
read -r CODE BODY < <(req GET "$BASE_URL/api/stories/$STORY_ID" "$MEMBER_COOKIE")
expect_code_in "GET /api/stories/:id (member)" "$CODE" 200

# ---------- 2) Unauthorised story API read ----------
read -r CODE BODY < <(req GET "$BASE_URL/api/stories/$STORY_ID" "$NONMEMBER_COOKIE")
expect_code_in "GET /api/stories/:id (non-member)" "$CODE" 404 403

# ---------- 3) Canonical page resolves (200 or 308 redirect) ----------
read -r CODE BODY < <(req GET "$BASE_URL/stories/$STORY_ID" "$MEMBER_COOKIE")
expect_code_in "GET /stories/:id page" "$CODE" 200 308

# ---------- 4) AI: validate story (with storyId) ----------
if [ "$SKIP_AI" != "1" ]; then
  read -r CODE BODY < <(req POST "$BASE_URL/api/ai/validate-story" "$MEMBER_COOKIE" \
    "$(cat <<JSON
{
  "storyId": "$STORY_ID",
  "title": "Allow users to reset passwords",
  "description": "Given a registered user, when they request a reset then they receive an email.",
  "acceptanceCriteria": ["- Token expires in 30 minutes"]
}
JSON
)")
  expect_code_in "POST /api/ai/validate-story" "$CODE" 200
fi

# ---------- 5) AI: generate single story ----------
if [ "$SKIP_AI" != "1" ]; then
  read -r CODE BODY < <(req POST "$BASE_URL/api/ai/generate-single-story" "$MEMBER_COOKIE" \
    "$(cat <<JSON
{
  "projectId": "$PROJECT_ID",
  "requirement": "As a user I want to export my sprint board so that I can share progress with leadership.",
  "projectContext": "SynqForge; Next.js App Router; org RBAC enforced"
}
JSON
)")
  expect_code_in "POST /api/ai/generate-single-story" "$CODE" 200 201
fi

# ---------- 6) Comments → notification fan-out ----------
read -r CODE BODY < <(req POST "$BASE_URL/api/comments" "$MEMBER_COOKIE" \
  "$(cat <<JSON
{
  "storyId": "$STORY_ID",
  "content": "@alex Looks good — ready to merge?"
}
JSON
)")
expect_code_in "POST /api/comments" "$CODE" 200 201

# ---------- Summary ----------
say ""
say "—— Summary ——"
say "Pass: $PASS"
say "Fail: $FAIL"

if [ "$FAIL" -eq 0 ]; then
  exit 0
else
  exit 1
fi
