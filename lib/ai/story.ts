// lib/ai/story.ts
import { openai, MODEL, DEFAULT_TEMPERATURE, DEFAULT_MAX_TOKENS } from "./client";

const SYSTEM_PROMPT = `You are an expert Agile Business Analyst. You write concise, clear user stories and Gherkin-style acceptance criteria for digital product teams. Use UK English spelling. Keep outputs realistic and enterprise-grade. Do not include explanations, commentary, or markdown formatting—only the story content. Keep total output under 900 tokens.`;

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

  const userPrompt = `Feature / Epic: ${feature}
User role: ${role}
Goal: ${goal}
Reason / value: ${value}
Context or notes: ${context}

Output structure EXACTLY:

---
User Story
As a ${role},
I want to ${goal},
so that ${value}.

Acceptance Criteria (Gherkin format)
1. Given [precondition]
   When [action]
   Then [expected outcome]

2. Given ...
   When ...
   Then ...

(Include 6–8 acceptance criteria, each clear and atomic. Use consistent tense and business-focused phrasing.)

Additional Notes
- Include assumptions, dependencies, or constraints if relevant.
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

