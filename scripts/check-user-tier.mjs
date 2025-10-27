import pkg from 'pg';
const { Client } = pkg;

const client = new Client({
  connectionString: process.env.POSTGRES_URL,
});

await client.connect();

// Get the user's email from command line
const email = process.argv[2];
if (!email) {
  console.error('Usage: node check-user-tier.mjs <email>');
  process.exit(1);
}

try {
  // Get user and organization info
  const userQuery = await client.query(
    'SELECT id, email, organization_id, role FROM users WHERE email = $1',
    [email]
  );
  
  if (userQuery.rows.length === 0) {
    console.log('User not found');
    process.exit(1);
  }
  
  const user = userQuery.rows[0];
  console.log('\n📧 User:', user.email);
  console.log('👤 User ID:', user.id);
  console.log('🏢 Org ID:', user.organization_id);
  console.log('🎭 Role:', user.role);
  
  // Get organization and subscription info
  const orgQuery = await client.query(
    'SELECT id, name, tier FROM organizations WHERE id = $1',
    [user.organization_id]
  );
  
  if (orgQuery.rows.length > 0) {
    const org = orgQuery.rows[0];
    console.log('\n🏢 Organization:', org.name);
    console.log('🎯 Tier:', org.tier);
  }
  
  // Get subscription info
  const subQuery = await client.query(
    'SELECT * FROM subscriptions WHERE organization_id = $1 ORDER BY created_at DESC LIMIT 1',
    [user.organization_id]
  );
  
  if (subQuery.rows.length > 0) {
    const sub = subQuery.rows[0];
    console.log('\n💳 Subscription:');
    console.log('  Status:', sub.status);
    console.log('  Stripe ID:', sub.stripe_subscription_id);
    console.log('  Stripe Customer:', sub.stripe_customer_id);
    console.log('  Current Period:', sub.current_period_start, 'to', sub.current_period_end);
    console.log('  Cancel At:', sub.cancel_at);
  } else {
    console.log('\n💳 No subscription found');
  }
  
  // Count projects
  const projectsQuery = await client.query(
    'SELECT COUNT(*) as count FROM projects WHERE organization_id = $1',
    [user.organization_id]
  );
  
  console.log('\n📁 Projects:', projectsQuery.rows[0].count);
  
} catch (error) {
  console.error('Error:', error);
} finally {
  await client.end();
}
