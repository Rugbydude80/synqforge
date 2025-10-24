'use client'

import { Select } from '@/components/ui/select'
import { Globe } from 'lucide-react'

export type Currency = 'gbp' | 'eur' | 'usd'

interface CurrencySelectorProps {
  value: Currency
  onChange: (currency: Currency) => void
}

const currencies = [
  { value: 'gbp' as Currency, label: '🇬🇧 GBP (£)' },
  { value: 'eur' as Currency, label: '🇪🇺 EUR (€)' },
  { value: 'usd' as Currency, label: '🇺🇸 USD ($)' },
]

export function CurrencySelector({ value, onChange }: CurrencySelectorProps) {
  return (
    <div className="flex items-center gap-3">
      <Globe className="h-4 w-4 text-muted-foreground" />
      <Select
        value={value}
        onChange={(e) => onChange(e.target.value as Currency)}
        className="w-[180px]"
        data-testid="currency-selector"
      >
        {currencies.map((currency) => (
          <option key={currency.value} value={currency.value}>
            {currency.label}
          </option>
        ))}
      </Select>
    </div>
  )
}

export function formatPrice(amount: number, currency: Currency): string {
  if (amount === 0) return 'Free'

  const symbols: Record<Currency, string> = {
    gbp: '£',
    eur: '€',
    usd: '$',
  }

  return `${symbols[currency]}${(amount / 100).toFixed(2)}`
}

export function getCurrencyMultiplier(currency: Currency): number {
  // Base is GBP
  const multipliers: Record<Currency, number> = {
    gbp: 1,
    eur: 1.2,
    usd: 1.3,
  }

  return multipliers[currency]
}
