'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Building2, Plus, Search, Archive, Clock, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AppSidebar } from '@/components/app-sidebar'
import { ClientFormModal } from '@/components/clients/client-form-modal'
import { ClientList } from '@/components/clients/client-list'
import { toast } from 'sonner'

interface Client {
  id: string
  name: string
  logoUrl?: string
  primaryContactEmail?: string
  status: 'active' | 'archived'
  defaultBillingRate?: string
  currency: string
  createdAt: string
}

export default function ClientsPage() {
  const router = useRouter()
  const [clients, setClients] = React.useState<Client[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<'active' | 'archived' | 'all'>('active')
  const [isCreateOpen, setIsCreateOpen] = React.useState(false)

  const fetchClients = React.useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const statusParam = statusFilter === 'all' ? '' : `?status=${statusFilter}`
      const response = await fetch(`/api/clients${statusParam}`, {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to fetch clients')
      }

      const data = await response.json()
      setClients(data.data || [])
    } catch (err: any) {
      setError(err.message || 'Failed to load clients')
      console.error('Error fetching clients:', err)
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter])

  React.useEffect(() => {
    fetchClients()
  }, [fetchClients])

  const filteredClients = React.useMemo(() => {
    if (!searchQuery.trim()) return clients

    const query = searchQuery.toLowerCase()
    return clients.filter(
      (client) =>
        client.name.toLowerCase().includes(query) ||
        client.primaryContactEmail?.toLowerCase().includes(query)
    )
  }, [clients, searchQuery])

  const handleClientClick = (clientId: string) => {
    router.push(`/clients/${clientId}`)
  }

  const handleCreateSuccess = () => {
    fetchClients()
    toast.success('Client created successfully')
  }

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />
      <div className="flex-1 overflow-auto">
        <div className="container mx-auto p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
              <p className="text-muted-foreground mt-1">
                Manage your client relationships and projects
              </p>
            </div>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Client
            </Button>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search clients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={statusFilter === 'active' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('active')}
              >
                Active
              </Button>
              <Button
                variant={statusFilter === 'archived' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('archived')}
              >
                <Archive className="mr-2 h-4 w-4" />
                Archived
              </Button>
              <Button
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('all')}
              >
                All
              </Button>
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

          {/* Loading State */}
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-4 w-32 bg-muted rounded" />
                    <div className="h-3 w-48 bg-muted rounded mt-2" />
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : filteredClients.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <Building2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No clients found</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery
                      ? 'Try adjusting your search query'
                      : statusFilter === 'archived'
                      ? 'No archived clients'
                      : 'Get started by creating your first client'}
                  </p>
                  {!searchQuery && statusFilter !== 'archived' && (
                    <Button onClick={() => setIsCreateOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Client
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <ClientList clients={filteredClients} onClientClick={handleClientClick} />
          )}

          {/* Create Client Modal */}
          <ClientFormModal
            open={isCreateOpen}
            onOpenChange={setIsCreateOpen}
            onSuccess={handleCreateSuccess}
          />
        </div>
      </div>
    </div>
  )
}

