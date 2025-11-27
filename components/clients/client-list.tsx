'use client'

import * as React from 'react'
import { Building2, Mail, DollarSign, Calendar } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface Client {
  id: string
  name: string
  logoUrl?: string
  primaryContactEmail?: string
  status: 'active' | 'archived'
  defaultBillingRate?: string
  currency: string
  contractEndDate?: string
  createdAt: string
}

interface ClientListProps {
  clients: Client[]
  onClientClick: (clientId: string) => void
}

export function ClientList({ clients, onClientClick }: ClientListProps) {
  const formatCurrency = (amount: string | undefined, currency: string) => {
    if (!amount) return 'Not set'
    const num = parseFloat(amount)
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(num)
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return null
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {clients.map((client) => (
        <Card
          key={client.id}
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => onClientClick(client.id)}
        >
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={client.logoUrl} alt={client.name} />
                  <AvatarFallback>
                    <Building2 className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-lg">{client.name}</CardTitle>
                  {client.primaryContactEmail && (
                    <CardDescription className="flex items-center gap-1 mt-1">
                      <Mail className="h-3 w-3" />
                      {client.primaryContactEmail}
                    </CardDescription>
                  )}
                </div>
              </div>
              <Badge variant={client.status === 'active' ? 'default' : 'secondary'}>
                {client.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {client.defaultBillingRate && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                  <span>
                    Rate: {formatCurrency(client.defaultBillingRate, client.currency)}/hr
                  </span>
                </div>
              )}
              {client.contractEndDate && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Contract ends: {formatDate(client.contractEndDate)}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

