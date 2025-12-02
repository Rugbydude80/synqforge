'use client'

import * as React from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Building2,
  ArrowLeft,
  Edit,
  Archive,
  Mail,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AppSidebar } from '@/components/app-sidebar'
import { ClientFormModal } from '@/components/clients/client-form-modal'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { toast } from 'sonner'

interface Client {
  id: string
  name: string
  logoUrl?: string
  primaryContactName?: string
  primaryContactEmail?: string
  contractStartDate?: string
  contractEndDate?: string
  defaultBillingRate?: string
  currency: string
  status: 'active' | 'archived'
  createdAt: string
}

interface ClientStats {
  projectCount: number
  timeEntryCount: number
  totalHours: number
  invoiceCount: number
  totalPaid: number
}

export default function ClientDetailPage() {
  const params = useParams()
  const router = useRouter()
  const clientId = params.clientId as string

  const [client, setClient] = React.useState<Client | null>(null)
  const [stats, setStats] = React.useState<ClientStats | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [isEditOpen, setIsEditOpen] = React.useState(false)
  const [projects, setProjects] = React.useState<any[]>([])
  const [timeEntries, setTimeEntries] = React.useState<any[]>([])
  const [invoices, setInvoices] = React.useState<any[]>([])
  const [loadingProjects, setLoadingProjects] = React.useState(false)
  const [loadingTime, setLoadingTime] = React.useState(false)
  const [loadingInvoices, setLoadingInvoices] = React.useState(false)

  const fetchClient = React.useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const [clientRes, statsRes] = await Promise.all([
        fetch(`/api/clients/${clientId}`, { credentials: 'include' }),
        fetch(`/api/clients/${clientId}/stats`, { credentials: 'include' }).catch(() => null),
      ])

      if (!clientRes.ok) {
        throw new Error('Failed to fetch client')
      }

      const clientData = await clientRes.json()
      setClient(clientData.data)

      if (statsRes?.ok) {
        const statsData = await statsRes.json()
        setStats(statsData.data)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load client')
      console.error('Error fetching client:', err)
    } finally {
      setIsLoading(false)
    }
  }, [clientId])

  React.useEffect(() => {
    if (clientId) {
      fetchClient()
    }
  }, [clientId, fetchClient])

  const handleArchive = async () => {
    if (!confirm('Are you sure you want to archive this client?')) return

    try {
      const response = await fetch(`/api/clients/${clientId}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to archive client')
      }

      toast.success('Client archived')
      router.push('/clients')
    } catch (err: any) {
      toast.error(err.message || 'Failed to archive client')
    }
  }

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amount)
  }

  const fetchProjects = React.useCallback(async () => {
    if (!clientId) return
    setLoadingProjects(true)
    try {
      const response = await fetch(`/api/projects?clientId=${clientId}`, { credentials: 'include' })
      if (response.ok) {
        const data = await response.json()
        setProjects(data.data || [])
      }
    } catch (err) {
      console.error('Error fetching projects:', err)
    } finally {
      setLoadingProjects(false)
    }
  }, [clientId])

  const fetchTimeEntries = React.useCallback(async () => {
    if (!clientId) return
    setLoadingTime(true)
    try {
      const response = await fetch(`/api/time-entries?clientId=${clientId}&limit=50`, { credentials: 'include' })
      if (response.ok) {
        const data = await response.json()
        setTimeEntries(data.data || [])
      }
    } catch (err) {
      console.error('Error fetching time entries:', err)
    } finally {
      setLoadingTime(false)
    }
  }, [clientId])

  const fetchInvoices = React.useCallback(async () => {
    if (!clientId) return
    setLoadingInvoices(true)
    try {
      const response = await fetch(`/api/invoices?clientId=${clientId}`, { credentials: 'include' })
      if (response.ok) {
        const data = await response.json()
        setInvoices(data.data || [])
      }
    } catch (err) {
      console.error('Error fetching invoices:', err)
    } finally {
      setLoadingInvoices(false)
    }
  }, [clientId])

  if (isLoading) {
    return (
      <div className="flex h-screen bg-background">
        <AppSidebar />
        <div className="flex-1 overflow-auto">
          <div className="container mx-auto p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-8 w-64 bg-muted rounded" />
              <div className="h-32 bg-muted rounded" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !client) {
    return (
      <div className="flex h-screen bg-background">
        <AppSidebar />
        <div className="flex-1 overflow-auto">
          <div className="container mx-auto p-6">
            <Card className="border-destructive">
              <CardContent className="pt-6">
                <p className="text-destructive">{error || 'Client not found'}</p>
                <Button onClick={() => router.push('/clients')} className="mt-4">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Clients
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
        <div className="container mx-auto p-6 space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => router.push('/clients')}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Avatar className="h-12 w-12">
                <AvatarImage src={client.logoUrl} alt={client.name} />
                <AvatarFallback>
                  <Building2 className="h-6 w-6" />
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">{client.name}</h1>
                <div className="flex items-center gap-4 mt-2">
                  <Badge variant={client.status === 'active' ? 'default' : 'secondary'}>
                    {client.status}
                  </Badge>
                  {client.primaryContactEmail && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      {client.primaryContactEmail}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsEditOpen(true)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
              {client.status === 'active' && (
                <Button variant="outline" onClick={handleArchive}>
                  <Archive className="mr-2 h-4 w-4" />
                  Archive
                </Button>
              )}
            </div>
          </div>

          {/* Stats Cards */}
          {stats && (
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Projects</CardDescription>
                  <CardTitle className="text-2xl">{stats.projectCount}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total Hours</CardDescription>
                  <CardTitle className="text-2xl">{stats.totalHours.toFixed(1)}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Invoices</CardDescription>
                  <CardTitle className="text-2xl">{stats.invoiceCount}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total Paid</CardDescription>
                  <CardTitle className="text-2xl">
                    {formatCurrency(stats.totalPaid, client.currency)}
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>
          )}

          {/* Tabs */}
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="projects">Projects</TabsTrigger>
              <TabsTrigger value="time">Time Tracking</TabsTrigger>
              <TabsTrigger value="invoices">Invoices</TabsTrigger>
              <TabsTrigger value="billing">Billing</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Client Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {client.primaryContactName && (
                      <div>
                        <p className="text-sm text-muted-foreground">Contact Name</p>
                        <p className="font-medium">{client.primaryContactName}</p>
                      </div>
                    )}
                    {client.defaultBillingRate && (
                      <div>
                        <p className="text-sm text-muted-foreground">Default Rate</p>
                        <p className="font-medium">
                          {formatCurrency(parseFloat(client.defaultBillingRate), client.currency)}/hr
                        </p>
                      </div>
                    )}
                    {client.contractStartDate && (
                      <div>
                        <p className="text-sm text-muted-foreground">Contract Start</p>
                        <p className="font-medium">
                          {new Date(client.contractStartDate).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                    {client.contractEndDate && (
                      <div>
                        <p className="text-sm text-muted-foreground">Contract End</p>
                        <p className="font-medium">
                          {new Date(client.contractEndDate).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="projects">
              <Card>
                <CardHeader>
                  <CardTitle>Projects</CardTitle>
                  <CardDescription>Projects associated with this client</CardDescription>
                </CardHeader>
                <CardContent>
                  {!projects.length && !loadingProjects ? (
                    <button onClick={fetchProjects} className="text-sm text-purple-500 hover:underline">
                      Load projects
                    </button>
                  ) : loadingProjects ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin h-6 w-6 border-2 border-purple-500 border-t-transparent rounded-full" />
                    </div>
                  ) : projects.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No projects for this client</p>
                  ) : (
                    <div className="space-y-3">
                      {projects.map((project) => (
                        <div
                          key={project.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                          onClick={() => router.push(`/projects/${project.id}`)}
                        >
                          <div>
                            <h4 className="font-medium">{project.name}</h4>
                            <p className="text-sm text-muted-foreground">{project.description || 'No description'}</p>
                          </div>
                          <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>
                            {project.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="time">
              <Card>
                <CardHeader>
                  <CardTitle>Time Entries</CardTitle>
                  <CardDescription>Time tracked for this client</CardDescription>
                </CardHeader>
                <CardContent>
                  {!timeEntries.length && !loadingTime ? (
                    <button onClick={fetchTimeEntries} className="text-sm text-purple-500 hover:underline">
                      Load time entries
                    </button>
                  ) : loadingTime ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin h-6 w-6 border-2 border-purple-500 border-t-transparent rounded-full" />
                    </div>
                  ) : timeEntries.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No time entries for this client</p>
                  ) : (
                    <div className="space-y-2">
                      {timeEntries.map((entry: any) => (
                        <div key={entry.id} className="flex items-center justify-between p-3 border rounded hover:bg-accent/50">
                          <div className="flex-1">
                            <p className="text-sm font-medium">{entry.description || 'Time entry'}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(entry.startedAt).toLocaleString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">
                              {entry.endedAt
                                ? `${((new Date(entry.endedAt).getTime() - new Date(entry.startedAt).getTime()) / 3600000).toFixed(2)}h`
                                : 'In progress'}
                            </p>
                            {entry.billingRate && (
                              <p className="text-xs text-muted-foreground">
                                {formatCurrency(parseFloat(entry.billingRate), client?.currency || 'USD')}/hr
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="invoices">
              <Card>
                <CardHeader>
                  <CardTitle>Invoices</CardTitle>
                  <CardDescription>Invoices generated for this client</CardDescription>
                </CardHeader>
                <CardContent>
                  {!invoices.length && !loadingInvoices ? (
                    <button onClick={fetchInvoices} className="text-sm text-purple-500 hover:underline">
                      Load invoices
                    </button>
                  ) : loadingInvoices ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin h-6 w-6 border-2 border-purple-500 border-t-transparent rounded-full" />
                    </div>
                  ) : invoices.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No invoices for this client</p>
                  ) : (
                    <div className="space-y-3">
                      {invoices.map((invoice: any) => (
                        <div
                          key={invoice.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                          onClick={() => router.push(`/invoices/${invoice.id}`)}
                        >
                          <div>
                            <h4 className="font-medium">{invoice.invoiceNumber}</h4>
                            <p className="text-sm text-muted-foreground">
                              Issue: {new Date(invoice.issueDate).toLocaleDateString()} • Due: {new Date(invoice.dueDate).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-lg">{formatCurrency(parseFloat(invoice.totalAmount), invoice.currency)}</p>
                            <Badge variant={
                              invoice.status === 'paid' ? 'default' :
                              invoice.status === 'sent' ? 'secondary' :
                              invoice.status === 'overdue' ? 'destructive' : 'outline'
                            }>
                              {invoice.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="billing">
              <Card>
                <CardHeader>
                  <CardTitle>Billing Dashboard</CardTitle>
                  <CardDescription>Hours tracked and billable amounts</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Billing dashboard will be implemented here</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Edit Modal */}
          <ClientFormModal
            open={isEditOpen}
            onOpenChange={setIsEditOpen}
            onSuccess={() => {
              fetchClient()
              toast.success('Client updated')
            }}
            clientId={clientId}
          />
        </div>
      </div>
    </div>
  )
}

