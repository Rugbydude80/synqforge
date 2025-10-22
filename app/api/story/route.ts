// app/api/story/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateUserStory } from "@/lib/ai/story";

export const runtime = "nodejs";

const storyRequestSchema = z.object({
  feature: z.string().min(1, "Feature is required"),
  role: z.string().min(1, "Role is required"),
  goal: z.string().min(1, "Goal is required"),
  value: z.string().min(1, "Value is required"),
  context: z.string().optional().default(""),
});

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const validation = storyRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validation.error.errors.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }

    const { feature, role, goal, value, context } = validation.data;

    const result = await generateUserStory({
      feature,
      role,
      goal,
      value,
      context,
    });

    const elapsedMs = Date.now() - startTime;

    return NextResponse.json({
      story: result.story,
      model: "qwen/qwen3-max",
      usage: result.usage || { prompt: 0, completion: 0, total: 0 },
      elapsedMs,
    });
  } catch (error) {
    const elapsedMs = Date.now() - startTime;

    if (error instanceof Error) {
      return NextResponse.json(
        {
          error: "AI provider error",
          message: error.message,
          elapsedMs,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        error: "Internal server error",
        elapsedMs,
      },
      { status: 500 }
    );
  }
}

