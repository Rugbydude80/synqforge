'use client'

import * as React from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface ClientFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  clientId?: string
}

export function ClientFormModal({
  open,
  onOpenChange,
  onSuccess,
  clientId,
}: ClientFormModalProps) {
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const [formData, setFormData] = React.useState({
    name: '',
    logoUrl: '',
    primaryContactName: '',
    primaryContactEmail: '',
    contractStartDate: '',
    contractEndDate: '',
    defaultBillingRate: '',
    currency: 'USD',
  })

  // Load client data if editing
  React.useEffect(() => {
    if (clientId && open) {
      fetch(`/api/clients/${clientId}`, { credentials: 'include' })
        .then((res) => res.json())
        .then((data) => {
          if (data.data) {
            const client = data.data
            setFormData({
              name: client.name || '',
              logoUrl: client.logoUrl || '',
              primaryContactName: client.primaryContactName || '',
              primaryContactEmail: client.primaryContactEmail || '',
              contractStartDate: client.contractStartDate
                ? new Date(client.contractStartDate).toISOString().split('T')[0]
                : '',
              contractEndDate: client.contractEndDate
                ? new Date(client.contractEndDate).toISOString().split('T')[0]
                : '',
              defaultBillingRate: client.defaultBillingRate || '',
              currency: client.currency || 'USD',
            })
          }
        })
        .catch((err) => {
          console.error('Error loading client:', err)
        })
    } else if (!clientId && open) {
      // Reset form for new client
      setFormData({
        name: '',
        logoUrl: '',
        primaryContactName: '',
        primaryContactEmail: '',
        contractStartDate: '',
        contractEndDate: '',
        defaultBillingRate: '',
        currency: 'USD',
      })
    }
  }, [clientId, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!formData.name.trim()) {
      setError('Client name is required')
      return
    }

    setIsLoading(true)

    try {
      const payload: any = {
        name: formData.name.trim(),
        currency: formData.currency,
      }

      if (formData.logoUrl) payload.logoUrl = formData.logoUrl.trim()
      if (formData.primaryContactName) payload.primaryContactName = formData.primaryContactName.trim()
      if (formData.primaryContactEmail) payload.primaryContactEmail = formData.primaryContactEmail.trim()
      if (formData.contractStartDate) {
        payload.contractStartDate = new Date(formData.contractStartDate).toISOString()
      }
      if (formData.contractEndDate) {
        payload.contractEndDate = new Date(formData.contractEndDate).toISOString()
      }
      if (formData.defaultBillingRate) {
        payload.defaultBillingRate = parseFloat(formData.defaultBillingRate)
      }

      const url = clientId ? `/api/clients/${clientId}` : '/api/clients'
      const method = clientId ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save client')
      }

      toast.success(clientId ? 'Client updated successfully' : 'Client created successfully')
      onSuccess?.()
      onOpenChange(false)
    } catch (err: any) {
      setError(err.message || 'Failed to save client')
      console.error('Error saving client:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{clientId ? 'Edit Client' : 'Create New Client'}</DialogTitle>
          <DialogDescription>
            {clientId
              ? 'Update client information and settings'
              : 'Add a new client to manage projects and track time'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Client Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Acme Corporation"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <select
                id="currency"
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              >
                <option value="USD">USD</option>
                <option value="GBP">GBP</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="logoUrl">Logo URL</Label>
            <Input
              id="logoUrl"
              type="url"
              value={formData.logoUrl}
              onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
              placeholder="https://example.com/logo.png"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="primaryContactName">Primary Contact Name</Label>
              <Input
                id="primaryContactName"
                value={formData.primaryContactName}
                onChange={(e) => setFormData({ ...formData, primaryContactName: e.target.value })}
                placeholder="John Doe"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="primaryContactEmail">Primary Contact Email</Label>
              <Input
                id="primaryContactEmail"
                type="email"
                value={formData.primaryContactEmail}
                onChange={(e) => setFormData({ ...formData, primaryContactEmail: e.target.value })}
                placeholder="john@acme.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contractStartDate">Contract Start Date</Label>
              <Input
                id="contractStartDate"
                type="date"
                value={formData.contractStartDate}
                onChange={(e) => setFormData({ ...formData, contractStartDate: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contractEndDate">Contract End Date</Label>
              <Input
                id="contractEndDate"
                type="date"
                value={formData.contractEndDate}
                onChange={(e) => setFormData({ ...formData, contractEndDate: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="defaultBillingRate">Default Billing Rate (per hour)</Label>
            <Input
              id="defaultBillingRate"
              type="number"
              step="0.01"
              min="0"
              value={formData.defaultBillingRate}
              onChange={(e) => setFormData({ ...formData, defaultBillingRate: e.target.value })}
              placeholder="150.00"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : clientId ? 'Update Client' : 'Create Client'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

