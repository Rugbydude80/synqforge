// lib/ai/client.ts
import OpenAI from "openai";

// Lazy initialization - only validate API key when actually used
// This prevents build-time errors when env vars aren't available
let openaiInstance: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiInstance) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    
    if (!apiKey) {
      throw new Error("OPENROUTER_API_KEY environment variable is required");
    }

    openaiInstance = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: apiKey,
      defaultHeaders: {
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "https://synqforge.com",
        "X-Title": "SynqForge",
      },
    });
  }

  return openaiInstance;
}

// Export a getter that initializes on first use
export const openai = new Proxy({} as OpenAI, {
  get(_target, prop) {
    const client = getOpenAIClient();
    const value = (client as any)[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  },
});

export const MODEL = "qwen/qwen3-max";
export const DEFAULT_TEMPERATURE = 0.2;
export const DEFAULT_MAX_TOKENS = 900;

