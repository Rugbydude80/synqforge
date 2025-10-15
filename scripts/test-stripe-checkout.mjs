import Stripe from 'stripe'
import { readFileSync } from 'fs'

// Load .env.local manually
try {
  const envFile = readFileSync('.env.local', 'utf8')
  envFile.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=')
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '')
    }
  })
} catch (err) {
  console.log('No .env.local file found, using environment variables')
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

async function testCheckoutSession() {
  try {
    console.log('Testing Stripe Checkout Session Creation...')
    console.log('Environment:')
    console.log('  STRIPE_SECRET_KEY:', process.env.STRIPE_SECRET_KEY ? `Set (${process.env.STRIPE_SECRET_KEY.substring(0, 10)}...)` : 'Not set')
    console.log('  STRIPE_PRO_PRICE_ID:', process.env.STRIPE_PRO_PRICE_ID || 'Not set')
    console.log('  STRIPE_ENTERPRISE_PRICE_ID:', process.env.STRIPE_ENTERPRISE_PRICE_ID || 'Not set')
    console.log('  NEXT_PUBLIC_APP_URL:', process.env.NEXT_PUBLIC_APP_URL || 'Not set')
    console.log('')

    if (!process.env.STRIPE_PRO_PRICE_ID) {
      console.error('❌ STRIPE_PRO_PRICE_ID is not set!')
      process.exit(1)
    }

    console.log('Creating checkout session with Pro price...')
    const session = await stripe.checkout.sessions.create({
      customer_email: 'test@example.com',
      client_reference_id: 'test-org-id',
      line_items: [
        {
          price: process.env.STRIPE_PRO_PRICE_ID,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/auth/signin?error=Payment cancelled`,
      metadata: {
        organizationId: 'test-org-id',
        userId: 'test-user-id',
        plan: 'pro',
      },
    })

    console.log('✅ Checkout session created successfully!')
    console.log('Session ID:', session.id)
    console.log('Checkout URL:', session.url)

  } catch (error) {
    console.error('❌ Error creating checkout session:')
    console.error('Error message:', error.message)
    console.error('Error type:', error.type)
    console.error('Error code:', error.code)
    console.error('Full error:', error)
    process.exit(1)
  }
}

testCheckoutSession()
