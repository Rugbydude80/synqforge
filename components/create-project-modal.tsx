'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
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
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { api } from '@/lib/api-client'

interface CreateProjectModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function CreateProjectModal({ open, onOpenChange, onSuccess }: CreateProjectModalProps) {
  const router = useRouter()
  const { data: session } = useSession()
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const [formData, setFormData] = React.useState({
    name: '',
    key: '',
    description: '',
    clientId: '',
  })
  const [clients, setClients] = React.useState<any[]>([])

  // Load clients
  React.useEffect(() => {
    if (open) {
      fetch('/api/clients?status=active', { credentials: 'include' })
        .then((res) => res.json())
        .then((data) => {
          setClients(data.data || [])
        })
        .catch((err) => {
          console.error('Error loading clients:', err)
        })
    }
  }, [open])

  // Auto-generate project key from name
  React.useEffect(() => {
    if (formData.name && !formData.key) {
      const generatedKey = formData.name
        .split(' ')
        .map(word => word.charAt(0).toUpperCase())
        .join('')
        .slice(0, 10)
      setFormData(prev => ({ ...prev, key: generatedKey }))
    }
  }, [formData.name, formData.key])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!session?.user?.id) {
      setError('You must be logged in to create a project')
      return
    }

    if (!formData.name.trim()) {
      setError('Project name is required')
      return
    }

    if (!formData.key.trim()) {
      setError('Project key is required')
      return
    }

    // Validate key format (2-10 uppercase letters)
    const keyRegex = /^[A-Z0-9]{2,10}$/
    if (!keyRegex.test(formData.key)) {
      setError('Project key must be 2-10 uppercase letters or numbers')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const project = await api.projects.create({
        name: formData.name.trim(),
        key: formData.key.trim().toUpperCase(),
        slug: formData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        description: formData.description.trim() || undefined,
        ownerId: session.user.id,
        clientId: formData.clientId || undefined,
      })

      // Reset form
      setFormData({ name: '', key: '', description: '', clientId: '' })

      // Show success toast
      toast.success('Project created successfully!')

      // Call success callback
      onSuccess?.()

      // Close modal
      onOpenChange(false)

      // Navigate to project detail page
      router.push(`/projects/${project.id}`)
    } catch (err: any) {
      setError(err.message || 'Failed to create project')
      toast.error(err.message || 'Failed to create project')
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!isLoading) {
      onOpenChange(newOpen)
      if (!newOpen) {
        // Reset form when closing
        setFormData({ name: '', key: '', description: '', clientId: '' })
        setError(null)
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Create a new project to organize your user stories and epics.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Project Name *</Label>
              <Input
                id="name"
                placeholder="My Awesome Project"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value, key: '' }))}
                maxLength={100}
                disabled={isLoading}
                autoFocus
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="key">Project Key *</Label>
              <Input
                id="key"
                placeholder="MAP"
                value={formData.key}
                onChange={(e) => setFormData(prev => ({ ...prev, key: e.target.value.toUpperCase() }))}
                maxLength={10}
                disabled={isLoading}
                className="uppercase"
              />
              <p className="text-xs text-gray-400">
                2-10 uppercase letters/numbers (e.g., PROJ, APP, WEB)
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of your project..."
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                maxLength={500}
                disabled={isLoading}
                rows={3}
              />
            </div>

            {clients.length > 0 && (
              <div className="grid gap-2">
                <Label htmlFor="clientId">Client (Optional)</Label>
                <select
                  id="clientId"
                  value={formData.clientId}
                  onChange={(e) => setFormData(prev => ({ ...prev, clientId: e.target.value }))}
                  disabled={isLoading}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                >
                  <option value="">No Client</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {error && (
              <div className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                {error}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" loading={isLoading}>
              Create Project
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
