-- Migration: Add clients, time_entries, and invoices tables
-- Created: 2025-12-05
-- Description: Adds support for client management, time tracking, and invoicing

-- Create clients table
CREATE TABLE IF NOT EXISTS "clients" (
  "id" varchar(36) PRIMARY KEY NOT NULL,
  "organization_id" varchar(36) NOT NULL,
  "name" varchar(255) NOT NULL,
  "logo_url" text,
  "primary_contact_name" text,
  "primary_contact_email" text,
  "contract_start_date" date,
  "contract_end_date" date,
  "default_billing_rate" decimal(10, 2),
  "currency" varchar(3) NOT NULL DEFAULT 'USD',
  "status" text NOT NULL DEFAULT 'active',
  "settings" json DEFAULT '{}',
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- Create time_entries table
CREATE TABLE IF NOT EXISTS "time_entries" (
  "id" varchar(36) PRIMARY KEY NOT NULL,
  "organization_id" varchar(36) NOT NULL,
  "user_id" varchar(36) NOT NULL,
  "project_id" varchar(36),
  "client_id" varchar(36),
  "description" text,
  "duration_minutes" integer NOT NULL,
  "billable" boolean DEFAULT true NOT NULL,
  "billing_rate" decimal(10, 2),
  "entry_date" date NOT NULL,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- Create invoices table  
CREATE TABLE IF NOT EXISTS "invoices" (
  "id" varchar(36) PRIMARY KEY NOT NULL,
  "organization_id" varchar(36) NOT NULL,
  "client_id" varchar(36) NOT NULL,
  "invoice_number" varchar(50) NOT NULL,
  "status" varchar(20) NOT NULL DEFAULT 'draft',
  "issue_date" date NOT NULL,
  "due_date" date,
  "subtotal" decimal(10, 2) NOT NULL DEFAULT 0,
  "tax_amount" decimal(10, 2) DEFAULT 0,
  "total_amount" decimal(10, 2) NOT NULL DEFAULT 0,
  "currency" varchar(3) NOT NULL DEFAULT 'USD',
  "notes" text,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- Add foreign key constraints for clients
DO $$ BEGIN
 ALTER TABLE "clients" ADD CONSTRAINT "fk_clients_organization" 
   FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") 
   ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Add foreign key constraints for time_entries
DO $$ BEGIN
 ALTER TABLE "time_entries" ADD CONSTRAINT "fk_time_entries_organization" 
   FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") 
   ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "time_entries" ADD CONSTRAINT "fk_time_entries_user" 
   FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") 
   ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "time_entries" ADD CONSTRAINT "fk_time_entries_project" 
   FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") 
   ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "time_entries" ADD CONSTRAINT "fk_time_entries_client" 
   FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") 
   ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Add foreign key constraints for invoices
DO $$ BEGIN
 ALTER TABLE "invoices" ADD CONSTRAINT "fk_invoices_organization" 
   FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") 
   ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "invoices" ADD CONSTRAINT "fk_invoices_client" 
   FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") 
   ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Create indexes for clients
CREATE INDEX IF NOT EXISTS "idx_clients_org" ON "clients"("organization_id");
CREATE INDEX IF NOT EXISTS "idx_clients_status" ON "clients"("status");
CREATE INDEX IF NOT EXISTS "idx_clients_contact" ON "clients"("primary_contact_email");
CREATE UNIQUE INDEX IF NOT EXISTS "unique_client_per_org" ON "clients"("organization_id", "name");

-- Create indexes for time_entries
CREATE INDEX IF NOT EXISTS "idx_time_entries_org" ON "time_entries"("organization_id");
CREATE INDEX IF NOT EXISTS "idx_time_entries_user" ON "time_entries"("user_id");
CREATE INDEX IF NOT EXISTS "idx_time_entries_project" ON "time_entries"("project_id");
CREATE INDEX IF NOT EXISTS "idx_time_entries_client" ON "time_entries"("client_id");
CREATE INDEX IF NOT EXISTS "idx_time_entries_date" ON "time_entries"("entry_date");

-- Create indexes for invoices
CREATE INDEX IF NOT EXISTS "idx_invoices_org" ON "invoices"("organization_id");
CREATE INDEX IF NOT EXISTS "idx_invoices_client" ON "invoices"("client_id");
CREATE INDEX IF NOT EXISTS "idx_invoices_status" ON "invoices"("status");
CREATE INDEX IF NOT EXISTS "idx_invoices_number" ON "invoices"("invoice_number");
CREATE UNIQUE INDEX IF NOT EXISTS "unique_invoice_number_per_org" ON "invoices"("organization_id", "invoice_number");

-- Add CHECK constraints
ALTER TABLE "clients" ADD CONSTRAINT "check_clients_status" 
  CHECK (status IN ('active', 'archived'));

ALTER TABLE "invoices" ADD CONSTRAINT "check_invoices_status" 
  CHECK (status IN ('draft', 'sent', 'paid', 'cancelled', 'overdue'));
