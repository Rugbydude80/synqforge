#!/usr/bin/env node
// scripts/qwen3max.ts
import { Command } from "commander";
import { generateUserStory } from "../lib/ai/story";

const program = new Command();

program
  .name("qwen3max")
  .description("Generate user stories using Qwen 3 Max")
  .requiredOption("--feature <feature>", "Feature or epic name")
  .requiredOption("--role <role>", "User role")
  .requiredOption("--goal <goal>", "User goal")
  .requiredOption("--value <value>", "Business value")
  .option("--context <context>", "Additional context or notes", "")
  .parse(process.argv);

const options = program.opts();

async function main() {
  if (!process.env.OPENROUTER_API_KEY) {
    console.error("Error: OPENROUTER_API_KEY environment variable is missing");
    process.exit(1);
  }

  try {
    const result = await generateUserStory({
      feature: options.feature,
      role: options.role,
      goal: options.goal,
      value: options.value,
      context: options.context,
    });

    console.log(result.story);

    if (result.usage) {
      console.error(
        `\nToken usage: prompt=${result.usage.prompt}, completion=${result.usage.completion}, total=${result.usage.total}`
      );
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
    } else {
      console.error("Unknown error occurred");
    }
    process.exit(1);
  }
}

main();

