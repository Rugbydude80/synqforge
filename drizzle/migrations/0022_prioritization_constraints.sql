-- Add foreign keys and indexes for prioritization tables
ALTER TABLE "story_prioritization_scores"
  ADD CONSTRAINT fk_story_prioritization_scores_story
    FOREIGN KEY ("story_id") REFERENCES "stories"("id") ON DELETE CASCADE,
  ADD CONSTRAINT fk_story_prioritization_scores_project
    FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE,
  ADD CONSTRAINT fk_story_prioritization_scores_user
    FOREIGN KEY ("calculated_by") REFERENCES "users"("id");

ALTER TABLE "backlog_analysis_reports"
  ADD CONSTRAINT fk_backlog_analysis_reports_project
    FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE,
  ADD CONSTRAINT fk_backlog_analysis_reports_user
    FOREIGN KEY ("generated_by") REFERENCES "users"("id");

ALTER TABLE "strategic_goals"
  ADD CONSTRAINT fk_strategic_goals_project
    FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS "idx_reports_project_framework_generated"
  ON "backlog_analysis_reports" ("project_id", "framework_used", "generated_at");
