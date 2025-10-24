import { useState, useEffect } from 'react';

export interface StripePrice {
  priceId: string;
  amount: number;
}

export interface TierPrices {
  id: string;
  name: string;
  currencies: {
    currency: string;
    monthly: StripePrice | null;
    annual: StripePrice | null;
  }[];
}

export interface StripePricesResponse {
  tiers: TierPrices[];
  lastUpdated: string;
}

export function useStripePrices() {
  const [prices, setPrices] = useState<StripePricesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPrices() {
      try {
        setLoading(true);
        const response = await fetch('/api/billing/prices');

        if (!response.ok) {
          throw new Error('Failed to fetch prices');
        }

        const data = await response.json();
        setPrices(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching Stripe prices:', err);
        setError(err instanceof Error ? err.message : 'Failed to load pricing');
      } finally {
        setLoading(false);
      }
    }

    fetchPrices();
  }, []);

  return { prices, loading, error };
}

/**
 * Helper to get price for specific tier, currency, and interval
 */
export function getPriceForTier(
  prices: StripePricesResponse | null,
  tierId: string,
  currency: string,
  interval: 'monthly' | 'annual'
): StripePrice | null {
  if (!prices) return null;

  const tier = prices.tiers.find((t) => t.id === tierId);
  if (!tier) return null;

  const currencyData = tier.currencies.find(
    (c) => c.currency === currency.toUpperCase()
  );
  if (!currencyData) return null;

  return interval === 'monthly' ? currencyData.monthly : currencyData.annual;
}
