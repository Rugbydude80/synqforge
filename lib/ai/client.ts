// lib/ai/client.ts
import OpenAI from "openai";

if (!process.env.OPENROUTER_API_KEY) {
  throw new Error("OPENROUTER_API_KEY environment variable is required");
}

export const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "https://synqforge.com",
    "X-Title": "SynqForge",
  },
});

export const MODEL = "qwen/qwen3-max";
export const DEFAULT_TEMPERATURE = 0.2;
export const DEFAULT_MAX_TOKENS = 900;

