# Migration Checklist: Claude 4.5 Haiku → Qwen 3 Max (OpenRouter)

## Code Changes

1. **Search & Replace Model IDs**
   - Find all references to `claude-4.5-haiku`, `claude-3-5-haiku-20241022`, or similar
   - Replace with `qwen/qwen3-max`
   - Check files in:
     - `app/api/ai/**/*.ts`
     - `lib/ai/**/*.ts`
     - `lib/services/**/*.ts`

2. **Replace Anthropic SDK Calls**
   - Find imports: `import Anthropic from '@anthropic-ai/sdk'`
   - Replace with: `import { openai } from '@/lib/ai/client'`
   - Update API call patterns from Anthropic format to OpenAI format

3. **Update Client Initialization**
   - Remove Anthropic client instances
   - Use shared `openai` client from `lib/ai/client.ts`

## Environment Variables

1. **Local Development**
   ```bash
   # Add to .env
   OPENROUTER_API_KEY=sk-or-v1-...
   
   # Optional: Keep old key for rollback
   # ANTHROPIC_API_KEY=sk-ant-...
   ```

2. **Vercel Production**
   - Go to Project Settings → Environment Variables
   - Add `OPENROUTER_API_KEY` (Production, Preview, Development)
   - Optionally remove `ANTHROPIC_API_KEY` after successful deployment

## Dependencies

1. **Install OpenAI SDK**
   ```bash
   npm install openai
   ```

2. **Install Commander (for CLI)**
   ```bash
   npm install commander
   ```

3. **Optional: Remove Anthropic SDK**
   ```bash
   npm uninstall @anthropic-ai/sdk
   ```
   Update `package.json` and commit changes.

## Smoke Tests

1. **Test API Endpoint**
   ```bash
   curl -X POST http://localhost:3000/api/story \
     -H "Content-Type: application/json" \
     -d '{
       "feature": "User authentication",
       "role": "registered user",
       "goal": "log in securely",
       "value": "I can access my account safely"
     }'
   ```

2. **Test CLI**
   ```bash
   npx tsx scripts/qwen3max.ts \
     --feature "Dashboard analytics" \
     --role "product manager" \
     --goal "view team velocity trends" \
     --value "I can make data-driven decisions"
   ```

3. **Integration Test**
   - Generate a story via UI (if applicable)
   - Verify output format matches Gherkin structure
   - Check token usage is logged correctly

## Rollback Plan

If issues arise:

1. Revert `lib/ai/client.ts` and `lib/ai/story.ts`
2. Restore Anthropic imports in affected files
3. Switch `OPENROUTER_API_KEY` back to `ANTHROPIC_API_KEY` in env vars
4. Redeploy

## Notes

- Qwen 3 Max typically has faster response times than Claude
- Token costs differ; monitor usage via OpenRouter dashboard
- UK English spelling is enforced in system prompt
- Max tokens set to 900 to keep responses concise

