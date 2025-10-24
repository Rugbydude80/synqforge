'use client'

/**
 * AddOnCard Component
 * 
 * Displays available and active add-ons with purchase/cancel CTAs
 */

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Clock, Zap, CheckCircle, XCircle } from 'lucide-react'
import { type AddOnType, ADD_ON_CONFIGS } from '@/lib/config/tiers'
import { toast } from 'sonner'

interface AddOnCardProps {
  type: AddOnType
  isActive?: boolean
  activeAddOn?: {
    id: string
    creditsRemaining: number
    creditsGranted: number
    expiresAt?: Date
    recurring: boolean
  }
  tier: string
  onPurchase?: (type: AddOnType) => void
  onCancel?: (purchaseId: string) => void
  disabled?: boolean
}

export function AddOnCard({
  type,
  isActive = false,
  activeAddOn,
  tier,
  onPurchase,
  onCancel,
  disabled = false,
}: AddOnCardProps) {
  const [loading, setLoading] = useState(false)
  const config = ADD_ON_CONFIGS[type]
  
  // Check if add-on is available for current tier
  const isAvailable = config.constraints.availableFor.includes(tier as any)
  
  const handlePurchase = async () => {
    if (!onPurchase) return
    
    setLoading(true)
    try {
      await onPurchase(type)
      toast.success(`${config.name} purchased successfully!`)
    } catch (error) {
      toast.error(`Failed to purchase ${config.name}`)
    } finally {
      setLoading(false)
    }
  }
  
  const handleCancel = async () => {
    if (!onCancel || !activeAddOn) return
    
    setLoading(true)
    try {
      await onCancel(activeAddOn.id)
      toast.success(`${config.name} cancelled successfully`)
    } catch (error) {
      toast.error(`Failed to cancel ${config.name}`)
    } finally {
      setLoading(false)
    }
  }
  
  const formatExpiry = (date: Date) => {
    const now = new Date()
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) return 'Expired'
    if (diffDays === 0) return 'Expires today'
    if (diffDays === 1) return 'Expires tomorrow'
    return `Expires in ${diffDays} days`
  }
  
  return (
    <Card className={`${isActive ? 'border-primary' : ''} ${!isAvailable ? 'opacity-60' : ''}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {type === 'ai_actions' && <Zap className="h-5 w-5 text-yellow-500" />}
              {type === 'ai_booster' && <Zap className="h-5 w-5 text-blue-500" />}
              {type === 'priority_support' && <CheckCircle className="h-5 w-5 text-green-500" />}
              {config.name}
            </CardTitle>
            <CardDescription>{config.description}</CardDescription>
          </div>
          {isActive && (
            <Badge variant="default">Active</Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {/* Pricing */}
          <div>
            <div className="text-3xl font-bold">
              ${(config.pricing.amount / 100).toFixed(2)}
            </div>
            <div className="text-sm text-muted-foreground">
              {config.pricing.recurring ? `per ${config.pricing.interval}` : 'one-time'}
            </div>
          </div>
          
          {/* Credits/Benefits */}
          <div className="space-y-2">
            {config.grants.credits && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">AI Actions:</span>
                <span className="font-medium">
                  {isActive && activeAddOn
                    ? `${activeAddOn.creditsRemaining} / ${activeAddOn.creditsGranted}`
                    : `${config.grants.credits} credits`}
                </span>
              </div>
            )}
            
            {config.grants.aiActionsBonus && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Monthly Bonus:</span>
                <span className="font-medium">+{config.grants.aiActionsBonus} actions</span>
              </div>
            )}
            
            {config.grants.supportUpgrade && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Support:</span>
                <span className="font-medium">24h Priority</span>
              </div>
            )}
          </div>
          
          {/* Expiry countdown */}
          {isActive && activeAddOn?.expiresAt && !activeAddOn.recurring && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground p-2 bg-muted rounded">
              <Clock className="h-4 w-4" />
              {formatExpiry(activeAddOn.expiresAt)}
            </div>
          )}
          
          {/* Availability notice */}
          {!isAvailable && (
            <div className="flex items-center gap-2 text-sm text-destructive p-2 bg-destructive/10 rounded">
              <XCircle className="h-4 w-4" />
              Available for: {config.constraints.availableFor.join(', ')}
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter>
        {isActive && activeAddOn ? (
          <>
            {activeAddOn.recurring && config.constraints.cancellable ? (
              <Button
                variant="outline"
                className="w-full"
                onClick={handleCancel}
                disabled={loading || disabled}
              >
                {loading ? 'Cancelling...' : 'Cancel Subscription'}
              </Button>
            ) : (
              <Button variant="secondary" className="w-full" disabled>
                Active
              </Button>
            )}
          </>
        ) : (
          <Button
            className="w-full"
            onClick={handlePurchase}
            disabled={loading || disabled || !isAvailable}
          >
            {loading ? 'Processing...' : `Buy ${config.name}`}
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}

export default AddOnCard

