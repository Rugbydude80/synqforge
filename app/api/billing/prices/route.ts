import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

export const dynamic = 'force-dynamic';

interface PriceData {
  tier: string;
  currency: string;
  monthly: {
    priceId: string;
    amount: number;
  } | null;
  annual: {
    priceId: string;
    amount: number;
  } | null;
}

/**
 * GET /api/billing/prices
 *
 * Fetches all active Stripe prices for SynqForge products
 * Organized by tier and currency
 */
export async function GET() {
  try {
    // Fetch all products with their active prices
    const products = await stripe.products.list({
      active: true,
      expand: ['data.default_price'],
      limit: 100,
    });

    // Fetch all active prices
    const prices = await stripe.prices.list({
      active: true,
      expand: ['data.product'],
      limit: 100,
    });

    // Organize prices by tier and currency
    const pricesByTier: Record<string, Record<string, PriceData>> = {};

    // Define tier slugs we're looking for
    const tiers = ['synqforge_free', 'synqforge_pro', 'synqforge_team'];

    for (const product of products.data) {
      const productId = product.id;
      const metadata = product.metadata || {};
      const tier = metadata.tier || metadata.slug || '';

      // Skip if not a recognized tier
      if (!tiers.includes(tier) && !tier.includes('synqforge')) {
        continue;
      }

      // Initialize tier object
      if (!pricesByTier[tier]) {
        pricesByTier[tier] = {};
      }

      // Find all prices for this product
      const productPrices = prices.data.filter(
        (price) =>
          typeof price.product === 'string'
            ? price.product === productId
            : price.product?.id === productId
      );

      // Group by currency
      for (const price of productPrices) {
        if (!price.currency || price.type !== 'recurring') continue;

        const currency = price.currency.toUpperCase();
        const interval = price.recurring?.interval || 'month';
        const amount = price.unit_amount || 0;

        if (!pricesByTier[tier][currency]) {
          pricesByTier[tier][currency] = {
            tier,
            currency,
            monthly: null,
            annual: null,
          };
        }

        if (interval === 'month') {
          pricesByTier[tier][currency].monthly = {
            priceId: price.id,
            amount: amount / 100, // Convert cents to dollars
          };
        } else if (interval === 'year') {
          pricesByTier[tier][currency].annual = {
            priceId: price.id,
            amount: amount / 100, // Convert cents to dollars
          };
        }
      }
    }

    // Format response
    const response = {
      tiers: Object.keys(pricesByTier).map((tierKey) => {
        const currencies = pricesByTier[tierKey];

        return {
          id: tierKey,
          name: getTierName(tierKey),
          currencies: Object.keys(currencies).map((curr) => ({
            currency: curr,
            monthly: currencies[curr].monthly,
            annual: currencies[curr].annual,
          })),
        };
      }),
      lastUpdated: new Date().toISOString(),
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('Error fetching Stripe prices:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch prices',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Helper to get human-readable tier name
 */
function getTierName(tierSlug: string): string {
  const names: Record<string, string> = {
    synqforge_free: 'Free',
    synqforge_pro: 'Pro',
    synqforge_team: 'Team',
    starter: 'Starter',
    pro_solo: 'Pro Solo',
    pro_collaborative: 'Pro Collaborative',
    team: 'Team',
    enterprise: 'Enterprise',
  };

  return names[tierSlug] || tierSlug;
}
