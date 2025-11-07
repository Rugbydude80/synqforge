-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================
-- This migration adds comprehensive RLS policies to all tables
-- to ensure multi-tenant data isolation at the database level

-- Enable RLS on all tables
ALTER TABLE "organizations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "password_reset_tokens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "team_invitations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "projects" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "epics" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "stories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sprints" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sprint_stories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ai_generations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "project_documents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "documents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "activities" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "credit_transactions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "token_balances" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "story_comments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "comment_reactions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notification_preferences" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sprint_analytics" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sprint_metrics" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "story_templates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "template_stories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "stripe_subscriptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "organization_seats" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ai_usage_metering" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ai_usage_alerts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "autopilot_jobs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ac_validation_rules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ac_validation_results" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "test_artefacts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sprint_forecasts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "effort_scores" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "impact_scores" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "knowledge_embeddings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "knowledge_searches" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "inbox_parsing" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "git_integrations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pr_summaries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "workflow_agents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "agent_actions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pii_detections" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ai_model_policies" ENABLE ROW LEVEL SECURITY;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Create app schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS app;

-- Function to get current user's organization ID
CREATE OR REPLACE FUNCTION app.current_user_organization_id() RETURNS VARCHAR(36) AS $$
  SELECT NULLIF(current_setting('app.current_user_organization_id', true), '')::VARCHAR(36);
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Function to get current user ID
CREATE OR REPLACE FUNCTION app.current_user_id() RETURNS VARCHAR(36) AS $$
  SELECT NULLIF(current_setting('app.current_user_id', true), '')::VARCHAR(36);
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Function to check if user is admin or owner
CREATE OR REPLACE FUNCTION app.is_admin_or_owner() RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    current_setting('app.current_user_role', true) IN ('admin', 'owner'),
    false
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- ============================================
-- ORGANIZATIONS
-- ============================================

-- Users can only see their own organization
CREATE POLICY "organizations_select_policy" ON "organizations"
  FOR SELECT
  USING (id = app.current_user_organization_id());

-- Only owners can update organization
CREATE POLICY "organizations_update_policy" ON "organizations"
  FOR UPDATE
  USING (id = app.current_user_organization_id() AND app.is_admin_or_owner());

-- No direct insert/delete (handled by signup API)
CREATE POLICY "organizations_insert_policy" ON "organizations"
  FOR INSERT
  WITH CHECK (false);

CREATE POLICY "organizations_delete_policy" ON "organizations"
  FOR DELETE
  USING (false);

-- ============================================
-- USERS
-- ============================================

-- Users can see other users in their organization
CREATE POLICY "users_select_policy" ON "users"
  FOR SELECT
  USING (organization_id = app.current_user_organization_id());

-- Users can update their own profile
CREATE POLICY "users_update_own_policy" ON "users"
  FOR UPDATE
  USING (id = app.current_user_id());

-- Admins can update users in their organization
CREATE POLICY "users_update_admin_policy" ON "users"
  FOR UPDATE
  USING (organization_id = app.current_user_organization_id() AND app.is_admin_or_owner());

-- No direct user creation (handled by signup/invite API)
CREATE POLICY "users_insert_policy" ON "users"
  FOR INSERT
  WITH CHECK (false);

CREATE POLICY "users_delete_policy" ON "users"
  FOR DELETE
  USING (false);

-- ============================================
-- PASSWORD RESET TOKENS
-- ============================================

-- Users can only see their own tokens
CREATE POLICY "password_reset_tokens_select_policy" ON "password_reset_tokens"
  FOR SELECT
  USING (user_id = app.current_user_id());

-- No manual insert/update/delete (handled by API)
CREATE POLICY "password_reset_tokens_insert_policy" ON "password_reset_tokens"
  FOR INSERT
  WITH CHECK (false);

CREATE POLICY "password_reset_tokens_update_policy" ON "password_reset_tokens"
  FOR UPDATE
  USING (false);

CREATE POLICY "password_reset_tokens_delete_policy" ON "password_reset_tokens"
  FOR DELETE
  USING (false);

-- ============================================
-- TEAM INVITATIONS
-- ============================================

-- View invitations in organization
CREATE POLICY "team_invitations_select_policy" ON "team_invitations"
  FOR SELECT
  USING (organization_id = app.current_user_organization_id());

-- Admins can create invitations
CREATE POLICY "team_invitations_insert_policy" ON "team_invitations"
  FOR INSERT
  WITH CHECK (organization_id = app.current_user_organization_id() AND app.is_admin_or_owner());

-- Admins can update invitations
CREATE POLICY "team_invitations_update_policy" ON "team_invitations"
  FOR UPDATE
  USING (organization_id = app.current_user_organization_id() AND app.is_admin_or_owner());

-- Admins can delete invitations
CREATE POLICY "team_invitations_delete_policy" ON "team_invitations"
  FOR DELETE
  USING (organization_id = app.current_user_organization_id() AND app.is_admin_or_owner());

-- ============================================
-- PROJECTS
-- ============================================

-- View projects in organization
CREATE POLICY "projects_select_policy" ON "projects"
  FOR SELECT
  USING (organization_id = app.current_user_organization_id());

-- Members can create projects
CREATE POLICY "projects_insert_policy" ON "projects"
  FOR INSERT
  WITH CHECK (organization_id = app.current_user_organization_id());

-- Members can update projects in their organization
CREATE POLICY "projects_update_policy" ON "projects"
  FOR UPDATE
  USING (organization_id = app.current_user_organization_id());

-- Admins can delete projects
CREATE POLICY "projects_delete_policy" ON "projects"
  FOR DELETE
  USING (organization_id = app.current_user_organization_id() AND app.is_admin_or_owner());

-- ============================================
-- EPICS
-- ============================================

-- View epics in organization
CREATE POLICY "epics_select_policy" ON "epics"
  FOR SELECT
  USING (organization_id = app.current_user_organization_id());

-- Members can create epics
CREATE POLICY "epics_insert_policy" ON "epics"
  FOR INSERT
  WITH CHECK (organization_id = app.current_user_organization_id());

-- Members can update epics
CREATE POLICY "epics_update_policy" ON "epics"
  FOR UPDATE
  USING (organization_id = app.current_user_organization_id());

-- Members can delete epics
CREATE POLICY "epics_delete_policy" ON "epics"
  FOR DELETE
  USING (organization_id = app.current_user_organization_id());

-- ============================================
-- STORIES
-- ============================================

-- View stories in organization
CREATE POLICY "stories_select_policy" ON "stories"
  FOR SELECT
  USING (organization_id = app.current_user_organization_id());

-- Members can create stories
CREATE POLICY "stories_insert_policy" ON "stories"
  FOR INSERT
  WITH CHECK (organization_id = app.current_user_organization_id());

-- Members can update stories
CREATE POLICY "stories_update_policy" ON "stories"
  FOR UPDATE
  USING (organization_id = app.current_user_organization_id());

-- Members can delete stories
CREATE POLICY "stories_delete_policy" ON "stories"
  FOR DELETE
  USING (organization_id = app.current_user_organization_id());

-- ============================================
-- SPRINTS
-- ============================================

-- View sprints in organization through project
CREATE POLICY "sprints_select_policy" ON "sprints"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = sprints.project_id
      AND p.organization_id = app.current_user_organization_id()
    )
  );

-- Members can create sprints
CREATE POLICY "sprints_insert_policy" ON "sprints"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = sprints.project_id
      AND p.organization_id = app.current_user_organization_id()
    )
  );

-- Members can update sprints
CREATE POLICY "sprints_update_policy" ON "sprints"
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = sprints.project_id
      AND p.organization_id = app.current_user_organization_id()
    )
  );

-- Members can delete sprints
CREATE POLICY "sprints_delete_policy" ON "sprints"
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = sprints.project_id
      AND p.organization_id = app.current_user_organization_id()
    )
  );

-- ============================================
-- SPRINT STORIES (Junction Table)
-- ============================================

-- View sprint stories through story access
CREATE POLICY "sprint_stories_select_policy" ON "sprint_stories"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM stories s
      WHERE s.id = sprint_stories.story_id
      AND s.organization_id = app.current_user_organization_id()
    )
  );

-- Members can add stories to sprints
CREATE POLICY "sprint_stories_insert_policy" ON "sprint_stories"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM stories s
      WHERE s.id = sprint_stories.story_id
      AND s.organization_id = app.current_user_organization_id()
    )
  );

-- Members can remove stories from sprints
CREATE POLICY "sprint_stories_delete_policy" ON "sprint_stories"
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM stories s
      WHERE s.id = sprint_stories.story_id
      AND s.organization_id = app.current_user_organization_id()
    )
  );

-- ============================================
-- AI GENERATIONS
-- ============================================

-- View AI generations in organization
CREATE POLICY "ai_generations_select_policy" ON "ai_generations"
  FOR SELECT
  USING (organization_id = app.current_user_organization_id());

-- System creates AI generations (no direct user insert)
CREATE POLICY "ai_generations_insert_policy" ON "ai_generations"
  FOR INSERT
  WITH CHECK (organization_id = app.current_user_organization_id());

-- No updates or deletes
CREATE POLICY "ai_generations_update_policy" ON "ai_generations"
  FOR UPDATE
  USING (false);

CREATE POLICY "ai_generations_delete_policy" ON "ai_generations"
  FOR DELETE
  USING (false);

-- ============================================
-- PROJECT DOCUMENTS
-- ============================================

-- View documents through project access
CREATE POLICY "project_documents_select_policy" ON "project_documents"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_documents.project_id
      AND p.organization_id = app.current_user_organization_id()
    )
  );

-- Members can upload documents
CREATE POLICY "project_documents_insert_policy" ON "project_documents"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_documents.project_id
      AND p.organization_id = app.current_user_organization_id()
    )
  );

-- No updates (documents are immutable)
CREATE POLICY "project_documents_update_policy" ON "project_documents"
  FOR UPDATE
  USING (false);

-- Members can delete documents
CREATE POLICY "project_documents_delete_policy" ON "project_documents"
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_documents.project_id
      AND p.organization_id = app.current_user_organization_id()
    )
  );

-- ============================================
-- DOCUMENTS (Deprecated - backward compatibility)
-- ============================================

CREATE POLICY "documents_select_policy" ON "documents"
  FOR SELECT
  USING (organization_id = app.current_user_organization_id());

CREATE POLICY "documents_insert_policy" ON "documents"
  FOR INSERT
  WITH CHECK (organization_id = app.current_user_organization_id());

CREATE POLICY "documents_update_policy" ON "documents"
  FOR UPDATE
  USING (organization_id = app.current_user_organization_id());

CREATE POLICY "documents_delete_policy" ON "documents"
  FOR DELETE
  USING (organization_id = app.current_user_organization_id());

-- ============================================
-- ACTIVITIES (Audit Log)
-- ============================================

-- View activities in organization
CREATE POLICY "activities_select_policy" ON "activities"
  FOR SELECT
  USING (organization_id = app.current_user_organization_id());

-- System creates activities
CREATE POLICY "activities_insert_policy" ON "activities"
  FOR INSERT
  WITH CHECK (organization_id = app.current_user_organization_id());

-- No updates or deletes (audit log is immutable)
CREATE POLICY "activities_update_policy" ON "activities"
  FOR UPDATE
  USING (false);

CREATE POLICY "activities_delete_policy" ON "activities"
  FOR DELETE
  USING (false);

-- ============================================
-- USER SESSIONS
-- ============================================

-- Users can only see their own sessions
CREATE POLICY "user_sessions_select_policy" ON "user_sessions"
  FOR SELECT
  USING (user_id = app.current_user_id());

-- System manages sessions
CREATE POLICY "user_sessions_insert_policy" ON "user_sessions"
  FOR INSERT
  WITH CHECK (user_id = app.current_user_id());

CREATE POLICY "user_sessions_update_policy" ON "user_sessions"
  FOR UPDATE
  USING (user_id = app.current_user_id());

CREATE POLICY "user_sessions_delete_policy" ON "user_sessions"
  FOR DELETE
  USING (user_id = app.current_user_id());

-- ============================================
-- CREDIT TRANSACTIONS & TOKEN BALANCES
-- ============================================

-- View transactions in organization
CREATE POLICY "credit_transactions_select_policy" ON "credit_transactions"
  FOR SELECT
  USING (organization_id = app.current_user_organization_id());

-- System creates transactions
CREATE POLICY "credit_transactions_insert_policy" ON "credit_transactions"
  FOR INSERT
  WITH CHECK (organization_id = app.current_user_organization_id());

-- No updates or deletes (financial records are immutable)
CREATE POLICY "credit_transactions_update_policy" ON "credit_transactions"
  FOR UPDATE
  USING (false);

CREATE POLICY "credit_transactions_delete_policy" ON "credit_transactions"
  FOR DELETE
  USING (false);

-- Token Balances
CREATE POLICY "token_balances_select_policy" ON "token_balances"
  FOR SELECT
  USING (organization_id = app.current_user_organization_id());

CREATE POLICY "token_balances_insert_policy" ON "token_balances"
  FOR INSERT
  WITH CHECK (organization_id = app.current_user_organization_id());

CREATE POLICY "token_balances_update_policy" ON "token_balances"
  FOR UPDATE
  USING (organization_id = app.current_user_organization_id());

CREATE POLICY "token_balances_delete_policy" ON "token_balances"
  FOR DELETE
  USING (false);

-- ============================================
-- COMMENTS & REACTIONS
-- ============================================

-- View comments through story access
CREATE POLICY "story_comments_select_policy" ON "story_comments"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM stories s
      WHERE s.id = story_comments.story_id
      AND s.organization_id = app.current_user_organization_id()
    )
  );

-- Members can create comments
CREATE POLICY "story_comments_insert_policy" ON "story_comments"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM stories s
      WHERE s.id = story_comments.story_id
      AND s.organization_id = app.current_user_organization_id()
    )
  );

-- Users can update their own comments
CREATE POLICY "story_comments_update_policy" ON "story_comments"
  FOR UPDATE
  USING (user_id = app.current_user_id());

-- Users can delete their own comments
CREATE POLICY "story_comments_delete_policy" ON "story_comments"
  FOR DELETE
  USING (user_id = app.current_user_id());

-- Comment Reactions
CREATE POLICY "comment_reactions_select_policy" ON "comment_reactions"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM story_comments sc
      JOIN stories s ON s.id = sc.story_id
      WHERE sc.id = comment_reactions.comment_id
      AND s.organization_id = app.current_user_organization_id()
    )
  );

CREATE POLICY "comment_reactions_insert_policy" ON "comment_reactions"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM story_comments sc
      JOIN stories s ON s.id = sc.story_id
      WHERE sc.id = comment_reactions.comment_id
      AND s.organization_id = app.current_user_organization_id()
    )
  );

CREATE POLICY "comment_reactions_delete_policy" ON "comment_reactions"
  FOR DELETE
  USING (user_id = app.current_user_id());

-- ============================================
-- NOTIFICATIONS
-- ============================================

-- Users can only see their own notifications
CREATE POLICY "notifications_select_policy" ON "notifications"
  FOR SELECT
  USING (user_id = app.current_user_id());

-- System creates notifications
CREATE POLICY "notifications_insert_policy" ON "notifications"
  FOR INSERT
  WITH CHECK (user_id = app.current_user_id());

-- Users can update their notifications (mark as read)
CREATE POLICY "notifications_update_policy" ON "notifications"
  FOR UPDATE
  USING (user_id = app.current_user_id());

-- Users can delete their notifications
CREATE POLICY "notifications_delete_policy" ON "notifications"
  FOR DELETE
  USING (user_id = app.current_user_id());

-- Notification Preferences
CREATE POLICY "notification_preferences_select_policy" ON "notification_preferences"
  FOR SELECT
  USING (user_id = app.current_user_id());

CREATE POLICY "notification_preferences_insert_policy" ON "notification_preferences"
  FOR INSERT
  WITH CHECK (user_id = app.current_user_id());

CREATE POLICY "notification_preferences_update_policy" ON "notification_preferences"
  FOR UPDATE
  USING (user_id = app.current_user_id());

CREATE POLICY "notification_preferences_delete_policy" ON "notification_preferences"
  FOR DELETE
  USING (user_id = app.current_user_id());

-- ============================================
-- ANALYTICS
-- ============================================

-- Sprint Analytics
CREATE POLICY "sprint_analytics_select_policy" ON "sprint_analytics"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sprints sp
      JOIN projects p ON p.id = sp.project_id
      WHERE sp.id = sprint_analytics.sprint_id
      AND p.organization_id = app.current_user_organization_id()
    )
  );

CREATE POLICY "sprint_analytics_insert_policy" ON "sprint_analytics"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sprints sp
      JOIN projects p ON p.id = sp.project_id
      WHERE sp.id = sprint_analytics.sprint_id
      AND p.organization_id = app.current_user_organization_id()
    )
  );

-- Sprint Metrics (deprecated)
CREATE POLICY "sprint_metrics_select_policy" ON "sprint_metrics"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sprints sp
      JOIN projects p ON p.id = sp.project_id
      WHERE sp.id = sprint_metrics.sprint_id
      AND p.organization_id = app.current_user_organization_id()
    )
  );

-- ============================================
-- TEMPLATES
-- ============================================

-- View templates in organization or public templates
CREATE POLICY "story_templates_select_policy" ON "story_templates"
  FOR SELECT
  USING (organization_id = app.current_user_organization_id() OR is_public = true);

-- Members can create templates
CREATE POLICY "story_templates_insert_policy" ON "story_templates"
  FOR INSERT
  WITH CHECK (organization_id = app.current_user_organization_id());

-- Users can update their own templates
CREATE POLICY "story_templates_update_policy" ON "story_templates"
  FOR UPDATE
  USING (organization_id = app.current_user_organization_id());

-- Users can delete their own templates
CREATE POLICY "story_templates_delete_policy" ON "story_templates"
  FOR DELETE
  USING (organization_id = app.current_user_organization_id());

-- Template Stories
CREATE POLICY "template_stories_select_policy" ON "template_stories"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM story_templates st
      WHERE st.id = template_stories.template_id
      AND (st.organization_id = app.current_user_organization_id() OR st.is_public = true)
    )
  );

CREATE POLICY "template_stories_insert_policy" ON "template_stories"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM story_templates st
      WHERE st.id = template_stories.template_id
      AND st.organization_id = app.current_user_organization_id()
    )
  );

CREATE POLICY "template_stories_update_policy" ON "template_stories"
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM story_templates st
      WHERE st.id = template_stories.template_id
      AND st.organization_id = app.current_user_organization_id()
    )
  );

CREATE POLICY "template_stories_delete_policy" ON "template_stories"
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM story_templates st
      WHERE st.id = template_stories.template_id
      AND st.organization_id = app.current_user_organization_id()
    )
  );

-- ============================================
-- STRIPE & BILLING
-- ============================================

-- View subscriptions in organization
CREATE POLICY "stripe_subscriptions_select_policy" ON "stripe_subscriptions"
  FOR SELECT
  USING (organization_id = app.current_user_organization_id());

-- System manages subscriptions (Stripe webhooks)
CREATE POLICY "stripe_subscriptions_insert_policy" ON "stripe_subscriptions"
  FOR INSERT
  WITH CHECK (organization_id = app.current_user_organization_id());

CREATE POLICY "stripe_subscriptions_update_policy" ON "stripe_subscriptions"
  FOR UPDATE
  USING (organization_id = app.current_user_organization_id());

CREATE POLICY "stripe_subscriptions_delete_policy" ON "stripe_subscriptions"
  FOR DELETE
  USING (false);

-- Organization Seats
CREATE POLICY "organization_seats_select_policy" ON "organization_seats"
  FOR SELECT
  USING (organization_id = app.current_user_organization_id());

CREATE POLICY "organization_seats_insert_policy" ON "organization_seats"
  FOR INSERT
  WITH CHECK (organization_id = app.current_user_organization_id());

CREATE POLICY "organization_seats_update_policy" ON "organization_seats"
  FOR UPDATE
  USING (organization_id = app.current_user_organization_id());

CREATE POLICY "organization_seats_delete_policy" ON "organization_seats"
  FOR DELETE
  USING (false);

-- ============================================
-- AI USAGE & METERING
-- ============================================

-- AI Usage Metering
CREATE POLICY "ai_usage_metering_select_policy" ON "ai_usage_metering"
  FOR SELECT
  USING (organization_id = app.current_user_organization_id());

CREATE POLICY "ai_usage_metering_insert_policy" ON "ai_usage_metering"
  FOR INSERT
  WITH CHECK (organization_id = app.current_user_organization_id());

CREATE POLICY "ai_usage_metering_update_policy" ON "ai_usage_metering"
  FOR UPDATE
  USING (organization_id = app.current_user_organization_id());

CREATE POLICY "ai_usage_metering_delete_policy" ON "ai_usage_metering"
  FOR DELETE
  USING (false);

-- AI Usage Alerts
CREATE POLICY "ai_usage_alerts_select_policy" ON "ai_usage_alerts"
  FOR SELECT
  USING (organization_id = app.current_user_organization_id());

CREATE POLICY "ai_usage_alerts_insert_policy" ON "ai_usage_alerts"
  FOR INSERT
  WITH CHECK (organization_id = app.current_user_organization_id());

CREATE POLICY "ai_usage_alerts_update_policy" ON "ai_usage_alerts"
  FOR UPDATE
  USING (organization_id = app.current_user_organization_id());

CREATE POLICY "ai_usage_alerts_delete_policy" ON "ai_usage_alerts"
  FOR DELETE
  USING (false);

-- ============================================
-- ADVANCED AI FEATURES
-- ============================================

-- Autopilot Jobs
CREATE POLICY "autopilot_jobs_select_policy" ON "autopilot_jobs"
  FOR SELECT
  USING (organization_id = app.current_user_organization_id());

CREATE POLICY "autopilot_jobs_insert_policy" ON "autopilot_jobs"
  FOR INSERT
  WITH CHECK (organization_id = app.current_user_organization_id());

CREATE POLICY "autopilot_jobs_update_policy" ON "autopilot_jobs"
  FOR UPDATE
  USING (organization_id = app.current_user_organization_id());

CREATE POLICY "autopilot_jobs_delete_policy" ON "autopilot_jobs"
  FOR DELETE
  USING (organization_id = app.current_user_organization_id());

-- AC Validation Rules
CREATE POLICY "ac_validation_rules_select_policy" ON "ac_validation_rules"
  FOR SELECT
  USING (organization_id = app.current_user_organization_id());

CREATE POLICY "ac_validation_rules_insert_policy" ON "ac_validation_rules"
  FOR INSERT
  WITH CHECK (organization_id = app.current_user_organization_id());

CREATE POLICY "ac_validation_rules_update_policy" ON "ac_validation_rules"
  FOR UPDATE
  USING (organization_id = app.current_user_organization_id());

CREATE POLICY "ac_validation_rules_delete_policy" ON "ac_validation_rules"
  FOR DELETE
  USING (organization_id = app.current_user_organization_id());

-- AC Validation Results
CREATE POLICY "ac_validation_results_select_policy" ON "ac_validation_results"
  FOR SELECT
  USING (organization_id = app.current_user_organization_id());

CREATE POLICY "ac_validation_results_insert_policy" ON "ac_validation_results"
  FOR INSERT
  WITH CHECK (organization_id = app.current_user_organization_id());

CREATE POLICY "ac_validation_results_update_policy" ON "ac_validation_results"
  FOR UPDATE
  USING (organization_id = app.current_user_organization_id());

CREATE POLICY "ac_validation_results_delete_policy" ON "ac_validation_results"
  FOR DELETE
  USING (organization_id = app.current_user_organization_id());

-- Test Artefacts
CREATE POLICY "test_artefacts_select_policy" ON "test_artefacts"
  FOR SELECT
  USING (organization_id = app.current_user_organization_id());

CREATE POLICY "test_artefacts_insert_policy" ON "test_artefacts"
  FOR INSERT
  WITH CHECK (organization_id = app.current_user_organization_id());

CREATE POLICY "test_artefacts_update_policy" ON "test_artefacts"
  FOR UPDATE
  USING (organization_id = app.current_user_organization_id());

CREATE POLICY "test_artefacts_delete_policy" ON "test_artefacts"
  FOR DELETE
  USING (organization_id = app.current_user_organization_id());

-- Sprint Forecasts
CREATE POLICY "sprint_forecasts_select_policy" ON "sprint_forecasts"
  FOR SELECT
  USING (organization_id = app.current_user_organization_id());

CREATE POLICY "sprint_forecasts_insert_policy" ON "sprint_forecasts"
  FOR INSERT
  WITH CHECK (organization_id = app.current_user_organization_id());

CREATE POLICY "sprint_forecasts_update_policy" ON "sprint_forecasts"
  FOR UPDATE
  USING (organization_id = app.current_user_organization_id());

CREATE POLICY "sprint_forecasts_delete_policy" ON "sprint_forecasts"
  FOR DELETE
  USING (organization_id = app.current_user_organization_id());

-- Effort Scores
CREATE POLICY "effort_scores_select_policy" ON "effort_scores"
  FOR SELECT
  USING (organization_id = app.current_user_organization_id());

CREATE POLICY "effort_scores_insert_policy" ON "effort_scores"
  FOR INSERT
  WITH CHECK (organization_id = app.current_user_organization_id());

CREATE POLICY "effort_scores_update_policy" ON "effort_scores"
  FOR UPDATE
  USING (organization_id = app.current_user_organization_id());

CREATE POLICY "effort_scores_delete_policy" ON "effort_scores"
  FOR DELETE
  USING (organization_id = app.current_user_organization_id());

-- Impact Scores
CREATE POLICY "impact_scores_select_policy" ON "impact_scores"
  FOR SELECT
  USING (organization_id = app.current_user_organization_id());

CREATE POLICY "impact_scores_insert_policy" ON "impact_scores"
  FOR INSERT
  WITH CHECK (organization_id = app.current_user_organization_id());

CREATE POLICY "impact_scores_update_policy" ON "impact_scores"
  FOR UPDATE
  USING (organization_id = app.current_user_organization_id());

CREATE POLICY "impact_scores_delete_policy" ON "impact_scores"
  FOR DELETE
  USING (organization_id = app.current_user_organization_id());

-- Knowledge Embeddings
CREATE POLICY "knowledge_embeddings_select_policy" ON "knowledge_embeddings"
  FOR SELECT
  USING (organization_id = app.current_user_organization_id());

CREATE POLICY "knowledge_embeddings_insert_policy" ON "knowledge_embeddings"
  FOR INSERT
  WITH CHECK (organization_id = app.current_user_organization_id());

CREATE POLICY "knowledge_embeddings_update_policy" ON "knowledge_embeddings"
  FOR UPDATE
  USING (organization_id = app.current_user_organization_id());

CREATE POLICY "knowledge_embeddings_delete_policy" ON "knowledge_embeddings"
  FOR DELETE
  USING (organization_id = app.current_user_organization_id());

-- Knowledge Searches
CREATE POLICY "knowledge_searches_select_policy" ON "knowledge_searches"
  FOR SELECT
  USING (organization_id = app.current_user_organization_id());

CREATE POLICY "knowledge_searches_insert_policy" ON "knowledge_searches"
  FOR INSERT
  WITH CHECK (organization_id = app.current_user_organization_id());

-- Inbox Parsing
CREATE POLICY "inbox_parsing_select_policy" ON "inbox_parsing"
  FOR SELECT
  USING (organization_id = app.current_user_organization_id());

CREATE POLICY "inbox_parsing_insert_policy" ON "inbox_parsing"
  FOR INSERT
  WITH CHECK (organization_id = app.current_user_organization_id());

CREATE POLICY "inbox_parsing_update_policy" ON "inbox_parsing"
  FOR UPDATE
  USING (organization_id = app.current_user_organization_id());

CREATE POLICY "inbox_parsing_delete_policy" ON "inbox_parsing"
  FOR DELETE
  USING (organization_id = app.current_user_organization_id());

-- Git Integrations
CREATE POLICY "git_integrations_select_policy" ON "git_integrations"
  FOR SELECT
  USING (organization_id = app.current_user_organization_id());

CREATE POLICY "git_integrations_insert_policy" ON "git_integrations"
  FOR INSERT
  WITH CHECK (organization_id = app.current_user_organization_id());

CREATE POLICY "git_integrations_update_policy" ON "git_integrations"
  FOR UPDATE
  USING (organization_id = app.current_user_organization_id());

CREATE POLICY "git_integrations_delete_policy" ON "git_integrations"
  FOR DELETE
  USING (organization_id = app.current_user_organization_id());

-- PR Summaries
CREATE POLICY "pr_summaries_select_policy" ON "pr_summaries"
  FOR SELECT
  USING (organization_id = app.current_user_organization_id());

CREATE POLICY "pr_summaries_insert_policy" ON "pr_summaries"
  FOR INSERT
  WITH CHECK (organization_id = app.current_user_organization_id());

CREATE POLICY "pr_summaries_update_policy" ON "pr_summaries"
  FOR UPDATE
  USING (organization_id = app.current_user_organization_id());

CREATE POLICY "pr_summaries_delete_policy" ON "pr_summaries"
  FOR DELETE
  USING (organization_id = app.current_user_organization_id());

-- Workflow Agents
CREATE POLICY "workflow_agents_select_policy" ON "workflow_agents"
  FOR SELECT
  USING (organization_id = app.current_user_organization_id());

CREATE POLICY "workflow_agents_insert_policy" ON "workflow_agents"
  FOR INSERT
  WITH CHECK (organization_id = app.current_user_organization_id());

CREATE POLICY "workflow_agents_update_policy" ON "workflow_agents"
  FOR UPDATE
  USING (organization_id = app.current_user_organization_id());

CREATE POLICY "workflow_agents_delete_policy" ON "workflow_agents"
  FOR DELETE
  USING (organization_id = app.current_user_organization_id());

-- Agent Actions
CREATE POLICY "agent_actions_select_policy" ON "agent_actions"
  FOR SELECT
  USING (organization_id = app.current_user_organization_id());

CREATE POLICY "agent_actions_insert_policy" ON "agent_actions"
  FOR INSERT
  WITH CHECK (organization_id = app.current_user_organization_id());

CREATE POLICY "agent_actions_update_policy" ON "agent_actions"
  FOR UPDATE
  USING (organization_id = app.current_user_organization_id());

CREATE POLICY "agent_actions_delete_policy" ON "agent_actions"
  FOR DELETE
  USING (organization_id = app.current_user_organization_id());

-- PII Detections
CREATE POLICY "pii_detections_select_policy" ON "pii_detections"
  FOR SELECT
  USING (organization_id = app.current_user_organization_id());

CREATE POLICY "pii_detections_insert_policy" ON "pii_detections"
  FOR INSERT
  WITH CHECK (organization_id = app.current_user_organization_id());

CREATE POLICY "pii_detections_update_policy" ON "pii_detections"
  FOR UPDATE
  USING (organization_id = app.current_user_organization_id());

CREATE POLICY "pii_detections_delete_policy" ON "pii_detections"
  FOR DELETE
  USING (organization_id = app.current_user_organization_id());

-- Audit Logs
CREATE POLICY "audit_logs_select_policy" ON "audit_logs"
  FOR SELECT
  USING (organization_id = app.current_user_organization_id());

CREATE POLICY "audit_logs_insert_policy" ON "audit_logs"
  FOR INSERT
  WITH CHECK (organization_id = app.current_user_organization_id());

-- Audit logs are immutable
CREATE POLICY "audit_logs_update_policy" ON "audit_logs"
  FOR UPDATE
  USING (false);

CREATE POLICY "audit_logs_delete_policy" ON "audit_logs"
  FOR DELETE
  USING (false);

-- AI Model Policies
CREATE POLICY "ai_model_policies_select_policy" ON "ai_model_policies"
  FOR SELECT
  USING (organization_id = app.current_user_organization_id());

CREATE POLICY "ai_model_policies_insert_policy" ON "ai_model_policies"
  FOR INSERT
  WITH CHECK (organization_id = app.current_user_organization_id());

CREATE POLICY "ai_model_policies_update_policy" ON "ai_model_policies"
  FOR UPDATE
  USING (organization_id = app.current_user_organization_id());

CREATE POLICY "ai_model_policies_delete_policy" ON "ai_model_policies"
  FOR DELETE
  USING (organization_id = app.current_user_organization_id());

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

-- Grant usage on app schema functions to all users
GRANT USAGE ON SCHEMA app TO PUBLIC;
GRANT EXECUTE ON FUNCTION app.current_user_organization_id() TO PUBLIC;
GRANT EXECUTE ON FUNCTION app.current_user_id() TO PUBLIC;
GRANT EXECUTE ON FUNCTION app.is_admin_or_owner() TO PUBLIC;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON FUNCTION app.current_user_organization_id IS 'Get current user organization ID from session settings';
COMMENT ON FUNCTION app.current_user_id IS 'Get current user ID from session settings';
COMMENT ON FUNCTION app.is_admin_or_owner IS 'Check if current user is admin or owner';
