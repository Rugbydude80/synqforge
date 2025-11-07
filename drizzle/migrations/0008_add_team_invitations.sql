-- Add invitation_status enum
DO $$ BEGIN
  CREATE TYPE "public"."invitation_status" AS ENUM('pending', 'accepted', 'rejected', 'expired');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create team_invitations table
CREATE TABLE IF NOT EXISTS "team_invitations" (
  "id" varchar(36) PRIMARY KEY NOT NULL,
  "organization_id" varchar(36) NOT NULL,
  "email" varchar(255) NOT NULL,
  "role" "role" DEFAULT 'member',
  "invited_by" varchar(36) NOT NULL,
  "status" "invitation_status" DEFAULT 'pending',
  "token" varchar(255) NOT NULL,
  "expires_at" timestamp NOT NULL,
  "accepted_at" timestamp,
  "rejected_at" timestamp,
  "created_at" timestamp DEFAULT now()
);

-- Create indexes for team_invitations
CREATE INDEX IF NOT EXISTS "idx_invitations_org" ON "team_invitations" ("organization_id");
CREATE INDEX IF NOT EXISTS "idx_invitations_email" ON "team_invitations" ("email");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_invitations_token" ON "team_invitations" ("token");
CREATE INDEX IF NOT EXISTS "idx_invitations_status" ON "team_invitations" ("status");
CREATE INDEX IF NOT EXISTS "idx_invitations_expires" ON "team_invitations" ("expires_at");
