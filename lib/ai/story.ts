// lib/ai/story.ts
import { openai, MODEL, DEFAULT_TEMPERATURE, DEFAULT_MAX_TOKENS } from "./client";

const SYSTEM_PROMPT = `You are an expert Agile Business Analyst. Write concise, testable user stories and Gherkin-style acceptance criteria in UK English. Use plain language. Do not add commentary or markdown beyond the required structure. Keep total output under 900 tokens.`;

interface GenerateUserStoryInput {
  feature: string;
  role: string;
  goal: string;
  value: string;
  context?: string;
}

interface GenerateUserStoryOutput {
  story: string;
  usage?: {
    prompt: number;
    completion: number;
    total: number;
  };
}

export async function generateUserStory(
  input: GenerateUserStoryInput
): Promise<GenerateUserStoryOutput> {
  const { feature, role, goal, value, context = "" } = input;

  const userPrompt = `Generate a complete user story using the inputs below, then produce 8 atomic Acceptance Criteria that are measurable and implementation-ready.

Inputs

* Feature / Epic: ${feature}
* User role: ${role}
* Goal: ${goal}
* Value: ${value}
* Context: ${context} (include domain scale, key constraints)

Output exactly this structure:

---

User Story
As a ${role},
I want to ${goal},
so that ${value}.

Acceptance Criteria (Gherkin format)

1. Given {page/context}
   When {primary action}
   Then {single observable outcome} within {target} (P95)

2. Given {precondition}
   When {action}
   Then {result count or state displayed}

3. Given {validation passes / range set}
   When {numeric or range input}
   Then {filtered result} within {target} (P95)

4. Given {rating/qualifier rule}
   When {threshold chosen}
   Then {only qualifying items shown} within {target} (P95)

5. Given {multiple filters active}
   When {view results}
   Then {AND-logic applies to all active criteria}

6. Given {clear action}
   When {Clear all filters}
   Then {defaults restored and full listing shown} within {target} (P95)

7. Given {no matches for criteria/search}
   When {results load}
   Then {clear "No results" message shown with option to reset}

8. Given {device or session context}
   When {open filters / refresh / return}
   Then {mobile pattern = slide-out panel, WCAG 2.1 AA controls, 44px targets, labelled inputs; filters persist within session and across pagination}

Additional Notes

* Dataset size: {max_items} (e.g., 20,000).
* Performance baseline: targets apply on standard broadband or 4G; server P95 ≤ 500 ms.
* Pagination/infinite scroll: filters persist across pages.
* Accessibility: WCAG 2.1 AA for controls, focus management, aria-labels.
* Indexing/constraints: relevant fields indexed; input validation defined (min/max, types).

---`;

  const response = await openai.chat.completions.create({
    model: MODEL,
    temperature: DEFAULT_TEMPERATURE,
    max_tokens: DEFAULT_MAX_TOKENS,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
  });

  const story = response.choices[0]?.message?.content?.trim() || "";

  const usage = response.usage
    ? {
        prompt: response.usage.prompt_tokens,
        completion: response.usage.completion_tokens,
        total: response.usage.total_tokens,
      }
    : undefined;

  return { story, usage };
}

