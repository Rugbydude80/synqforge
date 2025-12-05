-- Migration: Add missing refinement fields to story_refinements table
-- Created: 2025-12-05
-- Description: Adds refinement_instructions, original_content, refined_content, 
--              changes_summary, processing_time_ms, and error_message fields

-- Add new required fields for story refinements
ALTER TABLE "story_refinements" 
  ADD COLUMN IF NOT EXISTS "refinement_instructions" text,
  ADD COLUMN IF NOT EXISTS "original_content" text,
  ADD COLUMN IF NOT EXISTS "refined_content" text,
  ADD COLUMN IF NOT EXISTS "changes_summary" jsonb,
  ADD COLUMN IF NOT EXISTS "processing_time_ms" integer,
  ADD COLUMN IF NOT EXISTS "error_message" text;

-- Update status column length to match schema (was 50, now 20)
-- This is safe because existing values are shorter than 20 chars
ALTER TABLE "story_refinements" 
  ALTER COLUMN "status" TYPE varchar(20);

-- Add comment for documentation
COMMENT ON COLUMN "story_refinements"."refinement_instructions" IS 'User instructions for refinement (10-500 chars)';
COMMENT ON COLUMN "story_refinements"."original_content" IS 'Original story content before refinement';
COMMENT ON COLUMN "story_refinements"."refined_content" IS 'AI-refined content';
COMMENT ON COLUMN "story_refinements"."changes_summary" IS 'JSON summary of changes made';
COMMENT ON COLUMN "story_refinements"."processing_time_ms" IS 'Time taken to process refinement in milliseconds';
COMMENT ON COLUMN "story_refinements"."error_message" IS 'Error message if refinement failed';
