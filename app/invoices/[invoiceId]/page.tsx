'use client'

import * as React from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Download, Loader2, Mail, CheckCircle, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AppSidebar } from '@/components/app-sidebar'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface LineItem {
  description: string
  hours: number
  rate: number
  amount: number
  storyId?: string
  epicId?: string
}

interface Invoice {
  id: string
  invoiceNumber: string
  clientId: string
  client?: {
    name: string
    primaryContactEmail?: string
    primaryContactName?: string
  }
  status: 'draft' | 'sent' | 'paid' | 'overdue'
  issueDate: string
  dueDate: string
  paidDate?: string
  totalHours: string
  totalAmount: string
  currency: string
  lineItems: LineItem[]
  notes?: string
  pdfUrl?: string
  createdAt: string
}

export default function InvoiceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const invoiceId = params.invoiceId as string

  const [invoice, setInvoice] = React.useState<Invoice | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [isUpdating, setIsUpdating] = React.useState(false)
  const [showSendDialog, setShowSendDialog] = React.useState(false)
  const [showPaidDialog, setShowPaidDialog] = React.useState(false)

  const fetchInvoice = React.useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/invoices/${invoiceId}`, {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to fetch invoice')
      }

      const data = await response.json()
      setInvoice(data.data)
    } catch (err: any) {
      setError(err.message || 'Failed to load invoice')
      toast.error('Failed to load invoice')
    } finally {
      setIsLoading(false)
    }
  }, [invoiceId])

  React.useEffect(() => {
    fetchInvoice()
  }, [fetchInvoice])

  const handleMarkAsSent = async () => {
    try {
      setIsUpdating(true)

      const response = await fetch(`/api/invoices/${invoiceId}/send`, {
        method: 'POST',
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to mark invoice as sent')
      }

      toast.success('Invoice marked as sent')
      fetchInvoice()
    } catch (err: any) {
      toast.error(err.message || 'Failed to mark invoice as sent')
    } finally {
      setIsUpdating(false)
      setShowSendDialog(false)
    }
  }

  const handleMarkAsPaid = async () => {
    try {
      setIsUpdating(true)

      const response = await fetch(`/api/invoices/${invoiceId}/pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          paidDate: new Date().toISOString(),
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to mark invoice as paid')
      }

      toast.success('Invoice marked as paid')
      fetchInvoice()
    } catch (err: any) {
      toast.error(err.message || 'Failed to mark invoice as paid')
    } finally {
      setIsUpdating(false)
      setShowPaidDialog(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'default'
      case 'sent':
        return 'secondary'
      case 'overdue':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="h-4 w-4 mr-1" />
      case 'sent':
        return <Mail className="h-4 w-4 mr-1" />
      case 'overdue':
        return <Clock className="h-4 w-4 mr-1" />
      default:
        return null
    }
  }

  const formatCurrency = (amount: string | number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(typeof amount === 'string' ? parseFloat(amount) : amount)
  }

  if (isLoading) {
    return (
      <div className="flex h-screen bg-background">
        <AppSidebar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  if (error || !invoice) {
    return (
      <div className="flex h-screen bg-background">
        <AppSidebar />
        <div className="flex-1 overflow-auto">
          <div className="container mx-auto p-6">
            <Card className="border-destructive">
              <CardContent className="pt-6">
                <p className="text-destructive">
                  {error || 'Invoice not found'}
                </p>
                <Button
                  className="mt-4"
                  variant="outline"
                  onClick={() => router.push('/invoices')}
                >
                  Back to Invoices
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />
      <div className="flex-1 overflow-auto">
        <div className="container mx-auto p-6 space-y-6 max-w-5xl">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push('/invoices')}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold tracking-tight">
                    {invoice.invoiceNumber}
                  </h1>
                  <Badge
                    variant={getStatusColor(invoice.status) as any}
                    className="flex items-center"
                  >
                    {getStatusIcon(invoice.status)}
                    {invoice.status}
                  </Badge>
                </div>
                <p className="text-muted-foreground mt-1">
                  {invoice.client?.name || 'Unknown Client'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {invoice.status === 'draft' && (
                <Button
                  variant="outline"
                  onClick={() => setShowSendDialog(true)}
                  disabled={isUpdating}
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Mark as Sent
                </Button>
              )}
              {(invoice.status === 'sent' || invoice.status === 'overdue') && (
                <Button
                  onClick={() => setShowPaidDialog(true)}
                  disabled={isUpdating}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Mark as Paid
                </Button>
              )}
              {invoice.pdfUrl && (
                <Button variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF
                </Button>
              )}
            </div>
          </div>

          {/* Invoice Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Issue Date</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {new Date(invoice.issueDate).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Due Date</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {new Date(invoice.dueDate).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {formatCurrency(invoice.totalAmount, invoice.currency)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Client Info */}
          <Card>
            <CardHeader>
              <CardTitle>Client Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="text-sm text-muted-foreground">Client Name</p>
                <p className="font-medium">{invoice.client?.name}</p>
              </div>
              {invoice.client?.primaryContactName && (
                <div>
                  <p className="text-sm text-muted-foreground">Contact</p>
                  <p className="font-medium">{invoice.client.primaryContactName}</p>
                </div>
              )}
              {invoice.client?.primaryContactEmail && (
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{invoice.client.primaryContactEmail}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card>
            <CardHeader>
              <CardTitle>Line Items</CardTitle>
              <CardDescription>
                Breakdown of hours and charges
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Header */}
                <div className="grid grid-cols-12 gap-4 text-sm font-medium text-muted-foreground pb-2 border-b">
                  <div className="col-span-6">Description</div>
                  <div className="col-span-2 text-right">Hours</div>
                  <div className="col-span-2 text-right">Rate</div>
                  <div className="col-span-2 text-right">Amount</div>
                </div>

                {/* Items */}
                {invoice.lineItems.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-4 text-sm py-2">
                    <div className="col-span-6">
                      <p className="font-medium">{item.description}</p>
                    </div>
                    <div className="col-span-2 text-right">
                      {item.hours.toFixed(2)}
                    </div>
                    <div className="col-span-2 text-right">
                      {formatCurrency(item.rate, invoice.currency)}
                    </div>
                    <div className="col-span-2 text-right font-medium">
                      {formatCurrency(item.amount, invoice.currency)}
                    </div>
                  </div>
                ))}

                <Separator />

                {/* Totals */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Hours</span>
                    <span className="font-medium">
                      {parseFloat(invoice.totalHours).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-lg font-semibold">Total</span>
                    <span className="text-2xl font-bold">
                      {formatCurrency(invoice.totalAmount, invoice.currency)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {invoice.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {invoice.notes}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Additional Info */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Created</span>
                <span>
                  {new Date(invoice.createdAt).toLocaleDateString()} at{' '}
                  {new Date(invoice.createdAt).toLocaleTimeString()}
                </span>
              </div>
              {invoice.paidDate && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Paid Date</span>
                  <span>{new Date(invoice.paidDate).toLocaleDateString()}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Currency</span>
                <span>{invoice.currency}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Send Confirmation Dialog */}
      <AlertDialog open={showSendDialog} onOpenChange={setShowSendDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark Invoice as Sent?</AlertDialogTitle>
            <AlertDialogDescription>
              This will update the invoice status to "sent". You can still mark
              it as paid later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleMarkAsSent}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Mark as Sent'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Paid Confirmation Dialog */}
      <AlertDialog open={showPaidDialog} onOpenChange={setShowPaidDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark Invoice as Paid?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the invoice as paid with today's date. This action
              confirms that payment has been received.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleMarkAsPaid}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Mark as Paid'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

