import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/stripe-client';

export const dynamic = 'force-dynamic';

/**
 * GET /api/billing/prices
 *
 * Fetches all active Stripe prices organized by product and currency
 */
export async function GET() {
  try {
    // Fetch all active prices with product details
    const prices = await stripe.prices.list({
      active: true,
      expand: ['data.product'],
      limit: 100,
    });

    // Organize prices by product name, then currency, then interval
    const priceMap: Record<string, Record<string, Record<string, any>>> = {};

    for (const price of prices.data) {
      if (price.type !== 'recurring' || !price.recurring) continue;

      const product = price.product as Stripe.Product;
      const productName = product.name;
      const currency = price.currency.toUpperCase();
      const interval = price.recurring.interval; // 'month' or 'year'

      // Initialize nested structure
      if (!priceMap[productName]) {
        priceMap[productName] = {};
      }
      if (!priceMap[productName][currency]) {
        priceMap[productName][currency] = {};
      }

      // Store the price
      priceMap[productName][currency][interval] = {
        priceId: price.id,
        amount: price.unit_amount ? price.unit_amount / 100 : 0,
        amountCents: price.unit_amount || 0,
      };
    }

    // Format response
    const response = {
      prices: priceMap,
      currencies: ['GBP', 'USD', 'EUR'], // Supported currencies
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
