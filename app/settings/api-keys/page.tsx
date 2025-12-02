/**
 * API Keys Management Page
 * Allows users to create, view, and revoke API keys
 */

'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Key, Plus, Trash2, Copy, Calendar, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { AppSidebar } from '@/components/app-sidebar'
import { toast } from 'sonner'

interface ApiKey {
  id: string
  name: string
  description: string | null
  keyPrefix: string
  lastUsedAt: Date | null
  createdAt: Date
  expiresAt: Date | null
  isActive: boolean
  scopes: string[]
}

export default function ApiKeysPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false)
  const [selectedKey, setSelectedKey] = useState<ApiKey | null>(null)
  const [newKey, setNewKey] = useState<string | null>(null)
  const [showNewKey, setShowNewKey] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    scopes: ['read', 'write'] as string[],
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  useEffect(() => {
    if (session?.user) {
      loadApiKeys()
    }
  }, [session])

  const loadApiKeys = async () => {
    try {
      const response = await fetch('/api/integrations/api-keys')
      if (!response.ok) throw new Error('Failed to load API keys')
      const data = await response.json()
      setApiKeys(data.data || [])
    } catch (error) {
      console.error('Error loading API keys:', error)
      toast.error('Failed to load API keys')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    try {
      const response = await fetch('/api/integrations/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to create API key')
      }

      const data = await response.json()
      setNewKey(data.key)
      setShowNewKey(true)
      setFormData({ name: '', description: '', scopes: ['read', 'write'] })
      await loadApiKeys()
      toast.success('API key created successfully')
    } catch (error) {
      console.error('Error creating API key:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create API key')
    }
  }

  const handleRevoke = async () => {
    if (!selectedKey) return

    try {
      const response = await fetch(`/api/integrations/api-keys/${selectedKey.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to revoke API key')

      await loadApiKeys()
      setRevokeDialogOpen(false)
      setSelectedKey(null)
      toast.success('API key revoked successfully')
    } catch (error) {
      console.error('Error revoking API key:', error)
      toast.error('Failed to revoke API key')
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

  const formatDate = (date: Date | null) => {
    if (!date) return 'Never'
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (status === 'loading' || loading) {
    return (
      <div className="flex min-h-screen bg-background">
        <AppSidebar />
        <main className="flex-1 md:ml-64 flex items-center justify-center">
          <div className="text-muted-foreground">Loading...</div>
        </main>
      </div>
    )
  }

  if (!session?.user) {
    return null
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <main className="flex-1 md:ml-64">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold">API Keys</h1>
                <p className="text-muted-foreground mt-2">
                  Manage your API keys for programmatic access to SynqForge
                </p>
              </div>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create API Key
              </Button>
            </div>
          </div>

          {/* New Key Display */}
          {newKey && showNewKey && (
            <Card className="mb-6 border-yellow-500/50 bg-yellow-500/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                  Save Your API Key
                </CardTitle>
                <CardDescription>
                  This is the only time you'll see this key. Copy it now and store it securely.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Input
                    value={newKey}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(newKey)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-4"
                  onClick={() => {
                    setShowNewKey(false)
                    setNewKey(null)
                  }}
                >
                  I've saved it
                </Button>
              </CardContent>
            </Card>
          )}

          {/* API Keys List */}
          <div className="space-y-4">
            {apiKeys.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Key className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No API keys</h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first API key to get started with programmatic access
                  </p>
                  <Button onClick={() => setCreateDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create API Key
                  </Button>
                </CardContent>
              </Card>
            ) : (
              apiKeys.map((key) => (
                <Card key={key.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold">{key.name}</h3>
                          <Badge variant={key.isActive ? 'default' : 'secondary'}>
                            {key.isActive ? 'Active' : 'Revoked'}
                          </Badge>
                          {key.scopes.map((scope) => (
                            <Badge key={scope} variant="outline">
                              {scope}
                            </Badge>
                          ))}
                        </div>
                        {key.description && (
                          <p className="text-sm text-muted-foreground mb-3">{key.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Key className="h-4 w-4" />
                            <code className="text-xs font-mono">sk_{key.keyPrefix}...</code>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            Created {formatDate(key.createdAt)}
                          </div>
                          {key.lastUsedAt && (
                            <div className="flex items-center gap-1">
                              Last used {formatDate(key.lastUsedAt)}
                            </div>
                          )}
                        </div>
                      </div>
                      {key.isActive && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            setSelectedKey(key)
                            setRevokeDialogOpen(true)
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Revoke
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </main>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create API Key</DialogTitle>
            <DialogDescription>
              Create a new API key for programmatic access. You'll be able to copy the key once.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="My API Key"
              />
            </div>
            <div>
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Used for CI/CD pipeline"
                rows={3}
              />
            </div>
            <div>
              <Label>Scopes</Label>
              <div className="space-y-2 mt-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.scopes.includes('read')}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({
                          ...formData,
                          scopes: [...formData.scopes, 'read'],
                        })
                      } else {
                        setFormData({
                          ...formData,
                          scopes: formData.scopes.filter((s) => s !== 'read'),
                        })
                      }
                    }}
                  />
                  <span>Read</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.scopes.includes('write')}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({
                          ...formData,
                          scopes: [...formData.scopes, 'write'],
                        })
                      } else {
                        setFormData({
                          ...formData,
                          scopes: formData.scopes.filter((s) => s !== 'write'),
                        })
                      }
                    }}
                  />
                  <span>Write</span>
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!formData.name || formData.scopes.length === 0}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke Dialog */}
      <AlertDialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke API Key?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revoke "{selectedKey?.name}"? This action cannot be undone
              and any applications using this key will stop working immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevoke} className="bg-red-600 hover:bg-red-700">
              Revoke
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

