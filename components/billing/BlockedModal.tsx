'use client'

import { AlertCircle, TrendingUp } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import Link from 'next/link'

interface BlockedModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  error: string
  used?: number
  limit?: number
  percentage?: number
  upgradeUrl?: string
  manageUrl?: string
}

export function BlockedModal({
  open,
  onOpenChange,
  error,
  used = 0,
  limit = 0,
  percentage = 100,
  upgradeUrl = '/settings/billing',
  manageUrl = '/settings/billing',
}: BlockedModalProps) {
  const hasLimitData = limit > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-destructive/10 p-3">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <DialogTitle className="text-left">Usage Limit Reached</DialogTitle>
              <DialogDescription className="text-left mt-1">
                This operation cannot be completed at this time
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg border border-border bg-muted/50 p-4">
            <p className="text-sm text-foreground">{error}</p>
          </div>

          {hasLimitData && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Usage this month</span>
                <span className="font-medium">
                  {used.toLocaleString()} / {limit.toLocaleString()}
                </span>
              </div>
              <Progress value={Math.min(percentage, 100)} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {percentage}% of your monthly allocation used
              </p>
            </div>
          )}

          <div className="rounded-lg border border-border bg-background p-4 space-y-3">
            <div className="flex items-start gap-3">
              <TrendingUp className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-medium mb-1">Options to continue:</h4>
                <ul className="text-sm text-muted-foreground space-y-1.5 ml-1">
                  <li className="flex gap-2">
                    <span>•</span>
                    <span>Upgrade to a higher plan for increased limits</span>
                  </li>
                  <li className="flex gap-2">
                    <span>•</span>
                    <span>Wait until next billing period for reset</span>
                  </li>
                  <li className="flex gap-2">
                    <span>•</span>
                    <span>Manage your subscription settings</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1 sm:flex-1"
          >
            Close
          </Button>
          <Link href={manageUrl} className="flex-1 sm:flex-1">
            <Button variant="secondary" className="w-full">
              Manage Plan
            </Button>
          </Link>
          <Link href={upgradeUrl} className="flex-1 sm:flex-1">
            <Button className="w-full">
              Upgrade Now
            </Button>
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
