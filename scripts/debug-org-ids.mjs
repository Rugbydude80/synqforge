import postgres from 'postgres'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  console.error('DATABASE_URL not found in environment')
  process.exit(1)
}

const client = postgres(connectionString)

async function debugOrganizationIds() {
  console.log('🔍 Checking organization IDs...\n')

  try {
    // Check projects
    console.log('📁 Projects:')
    const projects = await client`
      SELECT p.id, p.name, p.organization_id as project_org, p.owner_id,
             u.organization_id as owner_org, u.email as owner_email
      FROM projects p
      LEFT JOIN users u ON p.owner_id = u.id
      LIMIT 10
    `
    console.table(projects)

    // Check stories
    console.log('\n📝 Stories:')
    const stories = await client`
      SELECT s.id, s.title, s.organization_id as story_org, s.project_id,
             p.organization_id as project_org
      FROM stories s
      LEFT JOIN projects p ON s.project_id = p.id
      LIMIT 10
    `
    console.table(stories)

    // Check users
    console.log('\n👤 Users:')
    const users = await client`
      SELECT id, email, organization_id, role
      FROM users
      LIMIT 10
    `
    console.table(users)

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await client.end()
    process.exit(0)
  }
}

debugOrganizationIds()
