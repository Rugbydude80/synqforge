import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Test entitlements parsing
function entitlementsFromPrice(price) {
  const m = (price.metadata || {});

  function toNum(str) {
    const n = parseInt(str, 10);
    return isNaN(n) ? 0 : n;
  }

  function toBool(str) {
    return str === 'true';
  }

  return {
    plan: m.plan || "solo",
    plan_cycle: m.cycle || "monthly",
    seats_included: m.seats_included === "unlimited" ? -1 : toNum(m.seats_included || "1"),
    projects_included: m.projects_included === "unlimited" ? -1 : toNum(m.projects_included || "1"),

    // Fair-usage limits
    ai_tokens_included: ["unlimited", "high"].includes(m.ai_tokens_included) ? -1 : toNum(m.ai_tokens_included || "50000"),
    docs_per_month: m.docs_per_month === "unlimited" ? -1 : toNum(m.docs_per_month || "10"),
    throughput_spm: toNum(m.throughput_spm || "5"),
    bulk_story_limit: m.bulk_story_limit === "unlimited" ? -1 : toNum(m.bulk_story_limit || "20"),
    max_pages_per_upload: m.max_pages_per_upload === "unlimited" ? -1 : toNum(m.max_pages_per_upload || "50"),

    // Feature flags
    advanced_ai: toBool(m.advanced_ai),
    exports: toBool(m.exports),
    templates: toBool(m.templates),
    rbac: m.rbac || 'none',
    audit_logs: m.audit_logs || 'none',
    sso: toBool(m.sso),
    support_tier: m.support_tier || 'community',
    fair_use: toBool(m.fair_use),
  };
}

async function testPrices() {
  console.log('🧪 Testing Stripe Price Metadata Parsing...\n');

  const priceIds = [
    'price_1SIZdYJBjlYCYeTTAnSJ5elk', // Solo Monthly
    'price_1SJDhqJBjlYCYeTTzPWigG0i', // Team Monthly
    'price_1SJDrrJBjlYCYeTTrkDrKyUg', // Pro Monthly
    'price_1SJDruJBjlYCYeTT3Xm3ITnu', // Enterprise Monthly
  ];

  for (const priceId of priceIds) {
    try {
      const price = await stripe.prices.retrieve(priceId);
      const entitlements = entitlementsFromPrice(price);

      console.log(`\n✅ ${price.nickname || priceId}:`);
      console.log(`   Plan: ${entitlements.plan} (${entitlements.plan_cycle})`);
      console.log(`   AI Tokens: ${entitlements.ai_tokens_included === -1 ? 'Unlimited' : entitlements.ai_tokens_included.toLocaleString()}`);
      console.log(`   Docs/Month: ${entitlements.docs_per_month === -1 ? 'Unlimited' : entitlements.docs_per_month}`);
      console.log(`   Throughput: ${entitlements.throughput_spm} stories/min`);
      console.log(`   Bulk Limit: ${entitlements.bulk_story_limit === -1 ? 'Unlimited' : entitlements.bulk_story_limit}`);
      console.log(`   Max Pages: ${entitlements.max_pages_per_upload === -1 ? 'Unlimited' : entitlements.max_pages_per_upload}`);
      console.log(`   Advanced AI: ${entitlements.advanced_ai}`);
      console.log(`   Seats: ${entitlements.seats_included === -1 ? 'Unlimited' : entitlements.seats_included}`);
      console.log(`   Projects: ${entitlements.projects_included === -1 ? 'Unlimited' : entitlements.projects_included}`);
    } catch (error) {
      console.error(`❌ Error fetching ${priceId}:`, error.message);
    }
  }

  console.log('\n✅ All metadata parsing tests complete!\n');
}

testPrices().catch(console.error);
