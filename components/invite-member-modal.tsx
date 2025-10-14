'use client'

import { useState, useEffect } from 'react'
import { X, Mail, UserPlus, AlertCircle, Crown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface InviteMemberModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface TeamLimits {
  currentCount: number
  maxUsers: number
  remainingSlots: number | typeof Infinity
  canAddMore: boolean
  subscriptionTier: string
  upgradeRequired: boolean
}

export function InviteMemberModal({ isOpen, onClose, onSuccess }: InviteMemberModalProps) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'admin' | 'member' | 'viewer'>('member')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [limits, setLimits] = useState<TeamLimits | null>(null)
  const [loadingLimits, setLoadingLimits] = useState(true)

  useEffect(() => {
    if (isOpen) {
      fetchLimits()
    }
  }, [isOpen])

  const fetchLimits = async () => {
    try {
      setLoadingLimits(true)
      const response = await fetch('/api/team/limits')
      if (response.ok) {
        const data = await response.json()
        setLimits(data)
      }
    } catch (error) {
      console.error('Error fetching limits:', error)
    } finally {
      setLoadingLimits(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (!email) {
      setError('Please enter an email address')
      return
    }

    // Check if we can add more users
    if (limits && !limits.canAddMore) {
      setError(`You've reached your user limit (${limits.maxUsers} users). Please upgrade your plan to add more team members.`)
      return
    }

    try {
      setLoading(true)
      const response = await fetch('/api/team/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, role }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 403 && data.upgradeUrl) {
          // Subscription limit reached
          setError(data.message || data.error)
        } else {
          setError(data.error || 'Failed to send invitation')
        }
        return
      }

      setSuccess(true)
      setInviteLink(data.invitation?.inviteLink)
      setEmail('')

      // Refresh limits
      await fetchLimits()

      // Call onSuccess after a short delay
      setTimeout(() => {
        onSuccess()
        handleClose()
      }, 2000)
    } catch (error: any) {
      setError('Failed to send invitation. Please try again.')
      console.error('Error sending invitation:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setEmail('')
    setRole('member')
    setError(null)
    setSuccess(false)
    setInviteLink(null)
    onClose()
  }

  const copyInviteLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-primary flex items-center justify-center">
              <UserPlus className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Invite Team Member</h2>
              <p className="text-sm text-muted-foreground">
                Send an invitation to join your organization
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Team Limits Info */}
          {loadingLimits ? (
            <div className="mb-4 p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Loading team limits...</p>
            </div>
          ) : limits && (
            <div className="mb-4 p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Team Members</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {limits.currentCount} of {limits.maxUsers === Infinity ? '∞' : limits.maxUsers} used
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{limits.subscriptionTier}</p>
                  {!limits.canAddMore && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-1 text-xs"
                      onClick={() => window.location.href = '/pricing'}
                    >
                      <Crown className="h-3 w-3 mr-1" />
                      Upgrade
                    </Button>
                  )}
                </div>
              </div>
              {limits.canAddMore && limits.remainingSlots !== Infinity && (
                <div className="mt-2 w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-primary h-full transition-all duration-300"
                    style={{ width: `${(limits.currentCount / limits.maxUsers) * 100}%` }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Upgrade Required Alert */}
          {limits && !limits.canAddMore && (
            <Alert className="mb-4 border-amber-500/50 bg-amber-500/10">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              <AlertDescription className="text-sm">
                You've reached your team member limit. Upgrade to add more users.
              </AlertDescription>
            </Alert>
          )}

          {/* Success Message */}
          {success && (
            <Alert className="mb-4 border-emerald-500/50 bg-emerald-500/10">
              <AlertCircle className="h-4 w-4 text-emerald-500" />
              <AlertDescription className="text-sm text-emerald-700 dark:text-emerald-300">
                Invitation sent successfully!
              </AlertDescription>
            </Alert>
          )}

          {/* Error Message */}
          {error && (
            <Alert className="mb-4 border-red-500/50 bg-red-500/10">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <AlertDescription className="text-sm text-red-700 dark:text-red-300">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="colleague@example.com"
                  disabled={loading || (limits && !limits.canAddMore)}
                  className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  required
                />
              </div>
            </div>

            {/* Role Select */}
            <div>
              <label htmlFor="role" className="block text-sm font-medium mb-2">
                Role
              </label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value as 'admin' | 'member' | 'viewer')}
                disabled={loading || (limits && !limits.canAddMore)}
                className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="member">Member - Can create and edit content</option>
                <option value="viewer">Viewer - Read-only access</option>
                <option value="admin">Admin - Full access and management</option>
              </select>
            </div>

            {/* Invite Link (if available) */}
            {inviteLink && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  Invite Link (Optional)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inviteLink}
                    readOnly
                    className="flex-1 px-4 py-2 border border-border rounded-lg bg-muted text-sm"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={copyInviteLink}
                  >
                    Copy
                  </Button>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || (limits && !limits.canAddMore)}
                className="flex-1"
              >
                {loading ? 'Sending...' : 'Send Invitation'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
