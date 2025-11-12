const { Client } = require('pg');

const TABLES = {
  story_refinements: {
    create: `
      CREATE TABLE IF NOT EXISTS story_refinements (
        id varchar(36) PRIMARY KEY,
        story_id varchar(36) NOT NULL,
        organization_id varchar(36) NOT NULL,
        user_id varchar(36) NOT NULL,
        refinement_instructions text NOT NULL,
        original_content text NOT NULL,
        refined_content text,
        status varchar(20) DEFAULT 'pending' NOT NULL,
        changes_summary json,
        processing_time_ms integer,
        error_message text,
        ai_model_used varchar(100),
        ai_tokens_used integer,
        prompt_tokens integer,
        completion_tokens integer,
        refinement text,
        user_request text,
        created_at timestamp DEFAULT now() NOT NULL,
        updated_at timestamp DEFAULT now() NOT NULL,
        accepted_at timestamp,
        rejected_at timestamp,
        rejected_reason text
      );
    `,
    columnStatements: [
      'ALTER TABLE story_refinements ADD COLUMN IF NOT EXISTS refinement_instructions text',
      'ALTER TABLE story_refinements ALTER COLUMN refinement_instructions SET NOT NULL',
      'ALTER TABLE story_refinements ADD COLUMN IF NOT EXISTS original_content text',
      'ALTER TABLE story_refinements ALTER COLUMN original_content SET NOT NULL',
      'ALTER TABLE story_refinements ADD COLUMN IF NOT EXISTS refined_content text',
      "ALTER TABLE story_refinements ADD COLUMN IF NOT EXISTS status varchar(20) DEFAULT 'pending'",
      'ALTER TABLE story_refinements ALTER COLUMN status SET NOT NULL',
      'ALTER TABLE story_refinements ADD COLUMN IF NOT EXISTS changes_summary json',
      'ALTER TABLE story_refinements ADD COLUMN IF NOT EXISTS processing_time_ms integer',
      'ALTER TABLE story_refinements ADD COLUMN IF NOT EXISTS error_message text',
      'ALTER TABLE story_refinements ADD COLUMN IF NOT EXISTS ai_model_used varchar(100)',
      'ALTER TABLE story_refinements ADD COLUMN IF NOT EXISTS ai_tokens_used integer',
      'ALTER TABLE story_refinements ADD COLUMN IF NOT EXISTS prompt_tokens integer',
      'ALTER TABLE story_refinements ADD COLUMN IF NOT EXISTS completion_tokens integer',
      'ALTER TABLE story_refinements ADD COLUMN IF NOT EXISTS refinement text',
      'ALTER TABLE story_refinements ADD COLUMN IF NOT EXISTS user_request text',
      'ALTER TABLE story_refinements ADD COLUMN IF NOT EXISTS created_at timestamp DEFAULT now()',
      'ALTER TABLE story_refinements ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT now()',
      'ALTER TABLE story_refinements ADD COLUMN IF NOT EXISTS accepted_at timestamp',
      'ALTER TABLE story_refinements ADD COLUMN IF NOT EXISTS rejected_at timestamp',
      'ALTER TABLE story_refinements ADD COLUMN IF NOT EXISTS rejected_reason text',
    ],
    indexes: [
      'CREATE INDEX IF NOT EXISTS idx_story_refinements_story ON story_refinements (story_id)',
      'CREATE INDEX IF NOT EXISTS idx_story_refinements_org ON story_refinements (organization_id)',
      'CREATE INDEX IF NOT EXISTS idx_story_refinements_user ON story_refinements (user_id)',
      'CREATE INDEX IF NOT EXISTS idx_story_refinements_status ON story_refinements (status)',
      'CREATE INDEX IF NOT EXISTS idx_story_refinements_created ON story_refinements (created_at)',
    ],
  },
  story_revisions: {
    create: `
      CREATE TABLE IF NOT EXISTS story_revisions (
        id varchar(36) PRIMARY KEY,
        story_id varchar(36) NOT NULL,
        organization_id varchar(36) NOT NULL,
        content text NOT NULL,
        revision_type varchar(50) NOT NULL,
        revision_note text,
        created_at timestamp DEFAULT now() NOT NULL,
        created_by varchar(36) NOT NULL
      );
    `,
    columnStatements: [
      'ALTER TABLE story_revisions ADD COLUMN IF NOT EXISTS revision_note text',
      'ALTER TABLE story_revisions ADD COLUMN IF NOT EXISTS created_at timestamp DEFAULT now()',
      'ALTER TABLE story_revisions ALTER COLUMN created_at SET NOT NULL',
    ],
    indexes: [
      'CREATE INDEX IF NOT EXISTS idx_story_revisions_story ON story_revisions (story_id)',
      'CREATE INDEX IF NOT EXISTS idx_story_revisions_org ON story_revisions (organization_id)',
      'CREATE INDEX IF NOT EXISTS idx_story_revisions_created ON story_revisions (created_at)',
      'CREATE INDEX IF NOT EXISTS idx_story_revisions_type ON story_revisions (revision_type)',
    ],
  },
};

async function ensureTable(client, name, config) {
  console.log(`\nEnsuring table ${name} exists...`);
  await client.query(config.create);
  console.log(`✔ Table ${name} exists or was created.`);

  for (const statement of config.columnStatements) {
    try {
      await client.query(statement);
    } catch (error) {
      if (error.code === '42701' || error.code === '23502') {
        continue;
      }
      throw error;
    }
  }

  for (const indexStatement of config.indexes) {
    await client.query(indexStatement);
  }

  console.log(`✔ Columns and indexes confirmed for ${name}.`);
}

async function run() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is not set. Aborting.');
    process.exit(1);
  }

  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('Connected to database. Ensuring refine story tables are in place.');

    await client.query('BEGIN');
    for (const [name, config] of Object.entries(TABLES)) {
      await ensureTable(client, name, config);
    }
    await client.query('COMMIT');
    console.log('\nMigration completed successfully.');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Migration failed. Rolled back changes.');
    console.error(error);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

run();
