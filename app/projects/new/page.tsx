'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function NewProjectPage() {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    slug: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))

    if (name === 'name' && !formData.slug) {
      // Auto-generate slug from name
      const slug = value
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim()
      setFormData(prev => ({ ...prev, slug }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    if (!formData.name.trim()) {
      setError('Project name is required')
      setIsLoading(false)
      return
    }

    if (!formData.slug.trim()) {
      setError('Project slug is required')
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        const project = await response.json()
        router.push(`/projects/${project.id}`)
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to create project')
      }
    } catch (_error) {
      setError('An error occurred while creating the project')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/80 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-8 py-6">
          <div className="flex items-center gap-4">
            <Link href="/projects">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">Create New Project</h1>
              <p className="text-muted-foreground">Set up a new project to start organizing your work</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-8 py-8">
        <Card className="glass">
          <CardHeader>
            <CardTitle>Project Details</CardTitle>
            <CardDescription>
              Enter the basic information for your new project
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium">
                  Project Name *
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="e.g., E-commerce Platform"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-primary"
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="slug" className="text-sm font-medium">
                  Project Slug *
                </label>
                <input
                  id="slug"
                  name="slug"
                  type="text"
                  placeholder="e.g., e-commerce-platform"
                  value={formData.slug}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-primary"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Used in URLs and as a unique identifier
                </p>
              </div>

              <div className="space-y-2">
                <label htmlFor="description" className="text-sm font-medium">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  placeholder="Brief description of your project..."
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-primary resize-none"
                />
              </div>

              {error && (
                <div className="text-sm text-destructive text-center bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                  {error}
                </div>
              )}

              <div className="flex gap-4 pt-4">
                <Button type="submit" disabled={isLoading} className="flex-1">
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating Project...
                    </>
                  ) : (
                    'Create Project'
                  )}
                </Button>
                <Link href="/projects">
                  <Button variant="outline" className="flex-1">
                    Cancel
                  </Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


