import { test } from '@playwright/test'

test.describe('Project → Epic → Story journey', () => {
  test.skip('creates a story, comments, and honours notification redirects', async ({ page }) => {
    // This test is marked as skipped by default because it requires a seeded
    // environment, real authentication, and live AI credentials. Enable it
    // locally once those prerequisites are available.

    // 1. Sign in
    await page.goto('/auth/signin')
    // 2. Create project, epic, and story via UI helpers
    // 3. Navigate to `/stories/:id` and verify details render
    // 4. Post a comment, ensure notification badge increments
    // 5. Open notification bell, follow link, confirm redirect and badge decrement
    // 6. Toggle NEXT_PUBLIC_STORY_REDIRECT_TO_PROJECT and ensure redirect honours project context
  })
})

