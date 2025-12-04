'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AppSidebar } from '@/components/app-sidebar'
import { Select } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'

interface Client {
  id: string
  name: string
  currency: string
  defaultBillingRate?: string
}

interface TimeEntry {
  id: string
  description: string
  durationMinutes: number
  billingRate: string
  storyId?: string
  story?: {
    title: string
  }
}

interface LineItem {
  description: string
  hours: number
  rate: number
  amount: number
  storyId?: string
  epicId?: string
}

interface InvoicePreview {
  entries: TimeEntry[]
  groupedItems: LineItem[]
  totalHours: number
  totalAmount: number
}

export default function NewInvoicePage() {
  const router = useRouter()
  const [clients, setClients] = React.useState<Client[]>([])
  const [selectedClientId, setSelectedClientId] = React.useState<string>('')
  const [preview, setPreview] = React.useState<InvoicePreview | null>(null)
  const [selectedTimeEntries, setSelectedTimeEntries] = React.useState<Set<string>>(new Set())
  const [issueDate, setIssueDate] = React.useState<string>(
    new Date().toISOString().split('T')[0]
  )
  const [dueDate, setDueDate] = React.useState<string>(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  )
  const [notes, setNotes] = React.useState<string>('')
  const [isLoadingClients, setIsLoadingClients] = React.useState(true)
  const [isLoadingPreview, setIsLoadingPreview] = React.useState(false)
  const [isCreating, setIsCreating] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Fetch clients
  React.useEffect(() => {
    const fetchClients = async () => {
      try {
        setIsLoadingClients(true)
        const response = await fetch('/api/clients?status=active', {
          credentials: 'include',
        })

        if (!response.ok) {
          throw new Error('Failed to fetch clients')
        }

        const data = await response.json()
        setClients(data.data || [])
      } catch (err: any) {
        setError(err.message || 'Failed to load clients')
        toast.error('Failed to load clients')
      } finally {
        setIsLoadingClients(false)
      }
    }

    fetchClients()
  }, [])

  // Fetch preview when client is selected
  React.useEffect(() => {
    const fetchPreview = async () => {
      if (!selectedClientId) {
        setPreview(null)
        return
      }

      try {
        setIsLoadingPreview(true)
        setError(null)

        const response = await fetch(
          `/api/time-entries/unbilled?clientId=${selectedClientId}`,
          {
            credentials: 'include',
          }
        )

        if (!response.ok) {
          throw new Error('Failed to load time entries')
        }

        const data = await response.json()
        setPreview(data.data)
        
        // Auto-select all time entries
        const allEntryIds = new Set<string>(data.data.entries.map((e: TimeEntry) => e.id))
        setSelectedTimeEntries(allEntryIds)
      } catch (err: any) {
        setError(err.message || 'Failed to load preview')
        toast.error('Failed to load time entries')
      } finally {
        setIsLoadingPreview(false)
      }
    }

    fetchPreview()
  }, [selectedClientId])

  const toggleTimeEntry = (entryId: string) => {
    setSelectedTimeEntries((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(entryId)) {
        newSet.delete(entryId)
      } else {
        newSet.add(entryId)
      }
      return newSet
    })
  }

  const toggleAll = () => {
    if (!preview) return

    if (selectedTimeEntries.size === preview.entries.length) {
      setSelectedTimeEntries(new Set())
    } else {
      setSelectedTimeEntries(new Set(preview.entries.map((e) => e.id)))
    }
  }

  const calculateSelectedTotals = () => {
    if (!preview) return { hours: 0, amount: 0 }

    const selectedEntries = preview.entries.filter((e) =>
      selectedTimeEntries.has(e.id)
    )

    const totalMinutes = selectedEntries.reduce(
      (sum, e) => sum + e.durationMinutes,
      0
    )
    const totalAmount = selectedEntries.reduce(
      (sum, e) => sum + (e.durationMinutes / 60) * parseFloat(e.billingRate || '0'),
      0
    )

    return {
      hours: Math.round((totalMinutes / 60) * 100) / 100,
      amount: Math.round(totalAmount * 100) / 100,
    }
  }

  const handleCreate = async () => {
    if (!selectedClientId) {
      toast.error('Please select a client')
      return
    }

    if (selectedTimeEntries.size === 0) {
      toast.error('Please select at least one time entry')
      return
    }

    if (!issueDate || !dueDate) {
      toast.error('Please set issue and due dates')
      return
    }

    try {
      setIsCreating(true)
      setError(null)

      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          clientId: selectedClientId,
          timeEntryIds: Array.from(selectedTimeEntries),
          issueDate: new Date(issueDate).toISOString(),
          dueDate: new Date(dueDate).toISOString(),
          notes: notes || undefined,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create invoice')
      }

      const data = await response.json()
      toast.success('Invoice created successfully')
      router.push(`/invoices/${data.data.id}`)
    } catch (err: any) {
      setError(err.message || 'Failed to create invoice')
      toast.error(err.message || 'Failed to create invoice')
    } finally {
      setIsCreating(false)
    }
  }

  const selectedTotals = calculateSelectedTotals()
  const selectedClient = clients.find((c) => c.id === selectedClientId)

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount)
  }

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />
      <div className="flex-1 overflow-auto">
        <div className="container mx-auto p-6 space-y-6 max-w-5xl">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/invoices')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Create Invoice
              </h1>
              <p className="text-muted-foreground mt-1">
                Generate an invoice from time entries
              </p>
            </div>
          </div>

          {/* Error State */}
          {error && (
            <Card className="border-destructive">
              <CardContent className="pt-6">
                <p className="text-destructive">{error}</p>
              </CardContent>
            </Card>
          )}

          {/* Client Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select Client</CardTitle>
              <CardDescription>
                Choose the client to generate an invoice for
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="client">Client</Label>
                  {isLoadingClients ? (
                    <div className="flex items-center gap-2 text-muted-foreground mt-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading clients...
                    </div>
                  ) : (
                    <Select
                      id="client"
                      value={selectedClientId}
                      onChange={(e) => setSelectedClientId(e.target.value)}
                      className="mt-2"
                    >
                      <option value="">Select a client</option>
                      {clients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.name}
                        </option>
                      ))}
                    </Select>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Time Entries */}
          {selectedClientId && (
            <>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Unbilled Time Entries</CardTitle>
                      <CardDescription>
                        Select the time entries to include in this invoice
                      </CardDescription>
                    </div>
                    {preview && preview.entries.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={toggleAll}
                      >
                        {selectedTimeEntries.size === preview.entries.length
                          ? 'Deselect All'
                          : 'Select All'}
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoadingPreview ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : !preview || preview.entries.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-muted-foreground">
                        No unbilled time entries found for this client
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {preview.entries.map((entry) => (
                        <div
                          key={entry.id}
                          className="flex items-center gap-4 p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                        >
                          <Checkbox
                            checked={selectedTimeEntries.has(entry.id)}
                            onCheckedChange={() => toggleTimeEntry(entry.id)}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">
                              {entry.story?.title || entry.description}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {(entry.durationMinutes / 60).toFixed(2)} hours @{' '}
                              {formatCurrency(
                                parseFloat(entry.billingRate || '0'),
                                selectedClient?.currency
                              )}
                              /hr
                            </p>
                          </div>
                          <div className="text-right font-semibold">
                            {formatCurrency(
                              (entry.durationMinutes / 60) *
                                parseFloat(entry.billingRate || '0'),
                              selectedClient?.currency
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {preview && preview.entries.length > 0 && (
                <>
                  {/* Invoice Details */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Invoice Details</CardTitle>
                      <CardDescription>
                        Set the invoice dates and add notes
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="issueDate">Issue Date</Label>
                          <Input
                            id="issueDate"
                            type="date"
                            value={issueDate}
                            onChange={(e) => setIssueDate(e.target.value)}
                            className="mt-2"
                          />
                        </div>
                        <div>
                          <Label htmlFor="dueDate">Due Date</Label>
                          <Input
                            id="dueDate"
                            type="date"
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                            className="mt-2"
                          />
                        </div>
                        <div className="col-span-2">
                          <Label htmlFor="notes">Notes (Optional)</Label>
                          <Textarea
                            id="notes"
                            placeholder="Add any additional notes or payment terms..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="mt-2"
                            rows={4}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Summary */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Invoice Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            Total Hours
                          </span>
                          <span className="font-medium">
                            {selectedTotals.hours.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            Time Entries
                          </span>
                          <span className="font-medium">
                            {selectedTimeEntries.size}
                          </span>
                        </div>
                        <div className="border-t pt-2 mt-2">
                          <div className="flex justify-between">
                            <span className="text-lg font-semibold">Total</span>
                            <span className="text-2xl font-bold">
                              {formatCurrency(
                                selectedTotals.amount,
                                selectedClient?.currency
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Actions */}
                  <div className="flex justify-end gap-4">
                    <Button
                      variant="outline"
                      onClick={() => router.push('/invoices')}
                      disabled={isCreating}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreate}
                      disabled={
                        isCreating ||
                        selectedTimeEntries.size === 0 ||
                        !selectedClientId
                      }
                    >
                      {isCreating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Plus className="mr-2 h-4 w-4" />
                          Create Invoice
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

