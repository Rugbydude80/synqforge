'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Globe } from 'lucide-react'

export type Currency = 'gbp' | 'eur' | 'usd'

interface CurrencySelectorProps {
  value: Currency
  onChange: (currency: Currency) => void
}

const currencies = [
  { value: 'gbp' as Currency, label: 'GBP (£)', flag: '🇬🇧' },
  { value: 'eur' as Currency, label: 'EUR (€)', flag: '🇪🇺' },
  { value: 'usd' as Currency, label: 'USD ($)', flag: '🇺🇸' },
]

export function CurrencySelector({ value, onChange }: CurrencySelectorProps) {
  return (
    <div className="flex items-center gap-3">
      <Globe className="h-4 w-4 text-muted-foreground" />
      <Select value={value} onValueChange={(v) => onChange(v as Currency)}>
        <SelectTrigger className="w-[180px]">
          <SelectValue>
            {currencies.find(c => c.value === value)?.flag} {currencies.find(c => c.value === value)?.label}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {currencies.map(currency => (
            <SelectItem key={currency.value} value={currency.value}>
              <span className="flex items-center gap-2">
                <span>{currency.flag}</span>
                <span>{currency.label}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
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
    eur: 1.1,
    usd: 1.1,
  }
  
  return multipliers[currency]
}

