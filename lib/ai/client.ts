// lib/ai/client.ts
import OpenAI from "openai";

let openaiInstance: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiInstance) {
    if (!process.env.OPENROUTER_API_KEY) {
      throw new Error("OPENROUTER_API_KEY environment variable is required");
    }
    openaiInstance = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: process.env.OPENROUTER_API_KEY,
      defaultHeaders: {
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "https://synqforge.com",
        "X-Title": "SynqForge",
      },
    });
  }
  return openaiInstance;
}

// Export a proxy that lazily initializes the OpenAI client
export const openai = new Proxy({} as OpenAI, {
  get(_target, prop) {
    const client = getOpenAI();
    const value = client[prop as keyof OpenAI];
    return typeof value === 'function' ? value.bind(client) : value;
  }
}) as OpenAI;

export const MODEL = "qwen/qwen3-max";
export const DEFAULT_TEMPERATURE = 0.2;
export const DEFAULT_MAX_TOKENS = 900;

