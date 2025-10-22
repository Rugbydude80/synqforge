// lib/ai/story.ts
import { openai, MODEL, DEFAULT_TEMPERATURE, DEFAULT_MAX_TOKENS } from "./client";

const SYSTEM_PROMPT = `You are an expert Agile Business Analyst. Write concise, testable user stories and Gherkin acceptance criteria in UK English. No commentary or markdown beyond the required structure. Keep total output under 900 tokens.`;

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

  const userPrompt = `Generate a complete user story using the inputs, then produce exactly 8 atomic Acceptance Criteria that are measurable and implementation-ready.
If any detail is missing, make a reasonable assumption and state it under Additional Notes.
Before you answer, quietly check that every required scenario below is included; do not print your checklist.

Inputs

Feature / Epic: ${feature}

User role: ${role}

Goal: ${goal}

Value: ${value}

Context: ${context} (include dataset size, devices, constraints)

Output exactly this structure:

User Story
As a ${role},
I want to ${goal},
so that ${value}.

Acceptance Criteria (Gherkin format)
1. Given I am on the {listing page}
   When I select a category filter
   Then only products in that category are displayed within 2 seconds (P95)

2. Given a filter is applied
   When results are shown
   Then the total number of matching products is displayed

3. Given min and max values are valid
   When I set a price range
   Then only products within that range are displayed within 2 seconds (P95)

4. Given products have 1–5 star ratings
   When I choose a minimum rating (e.g., ≥4)
   Then only products meeting or exceeding that rating are shown within 2 seconds (P95)

5. Given multiple filters are active
   When I view the results
   Then AND-logic applies and only products meeting all active criteria are shown

6. Given multiple filters are active
   When I select Clear all filters
   Then defaults are restored and the full catalogue is shown within 2 seconds (P95)

7. Given no products match the current filters or search
   When results load
   Then a clear message "No products match your filters" is shown with an option to reset

8. Given I am on a mobile device (viewport <768 px) or I return/refresh within the same session
   When I open filters or revisit the listing
   Then filters open in a slide-out panel meeting WCAG 2.1 AA (focus trap, labelled controls, 44 px targets), and my selected filters persist across pagination and on refresh

Additional Notes
- Dataset size: {max_items} (e.g., 20,000). Relevant fields are indexed.
- Performance baseline: targets apply on standard broadband or 4G; server P95 ≤ 500 ms.`;

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

