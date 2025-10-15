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

async function createLiveProducts() {
  try {
    console.log('🔧 Creating Stripe Products and Prices in LIVE MODE...')
    console.log('Using key:', process.env.STRIPE_SECRET_KEY.substring(0, 15) + '...')
    console.log('')

    // Create Pro Product
    console.log('Creating SynqForge Pro product...')
    const proProduct = await stripe.products.create({
      name: 'SynqForge Pro',
      description: 'Professional plan with unlimited projects and stories',
      metadata: {
        tier: 'pro'
      }
    })
    console.log('✅ Pro Product created:', proProduct.id)

    // Create Pro Price
    console.log('Creating Pro price ($29/month)...')
    const proPrice = await stripe.prices.create({
      product: proProduct.id,
      currency: 'usd',
      unit_amount: 2900,
      recurring: {
        interval: 'month'
      },
      metadata: {
        tier: 'pro'
      }
    })
    console.log('✅ Pro Price created:', proPrice.id)
    console.log('')

    // Create Enterprise Product
    console.log('Creating SynqForge Enterprise product...')
    const enterpriseProduct = await stripe.products.create({
      name: 'SynqForge Enterprise',
      description: 'Enterprise plan with dedicated support and SSO',
      metadata: {
        tier: 'enterprise'
      }
    })
    console.log('✅ Enterprise Product created:', enterpriseProduct.id)

    // Create Enterprise Price
    console.log('Creating Enterprise price ($99/month)...')
    const enterprisePrice = await stripe.prices.create({
      product: enterpriseProduct.id,
      currency: 'usd',
      unit_amount: 9900,
      recurring: {
        interval: 'month'
      },
      metadata: {
        tier: 'enterprise'
      }
    })
    console.log('✅ Enterprise Price created:', enterprisePrice.id)
    console.log('')

    console.log('========================================')
    console.log('✅ ALL PRODUCTS AND PRICES CREATED!')
    console.log('========================================')
    console.log('')
    console.log('Add these to your Vercel environment variables:')
    console.log('')
    console.log('STRIPE_PRO_PRICE_ID=' + proPrice.id)
    console.log('STRIPE_ENTERPRISE_PRICE_ID=' + enterprisePrice.id)
    console.log('')
    console.log('Products:')
    console.log('  Pro:', proProduct.id, '- $29/month -', proPrice.id)
    console.log('  Enterprise:', enterpriseProduct.id, '- $99/month -', enterprisePrice.id)

  } catch (error) {
    console.error('❌ Error creating products:')
    console.error('Message:', error.message)
    console.error('Type:', error.type)
    console.error('Code:', error.code)
    if (error.statusCode) {
      console.error('Status:', error.statusCode)
    }
    process.exit(1)
  }
}

createLiveProducts()
