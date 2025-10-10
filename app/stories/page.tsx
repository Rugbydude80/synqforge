'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api-client'
import {
  FileText,
  Filter,
  Search,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AppSidebar } from '@/components/app-sidebar'
import { cn } from '@/lib/utils'

interface Story {
  id: string
  title: string
  description: string
  status: string
  priority: string
  storyPoints?: number
  projectId: string
  projectName?: string
  assigneeId?: string
  createdAt: string
}

export default function StoriesPage() {
  const { status } = useSession()
  const router = useRouter()
  const [stories, setStories] = useState<Story[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<'all' | 'backlog' | 'in_progress' | 'done'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }

    if (status === 'authenticated') {
      fetchStories()
    }
  }, [status, router])

  const fetchStories = async () => {
    try {
      setLoading(true)
      // For now, we'll show a message that stories need to be viewed within projects
      // since there's no global stories list API endpoint
      setStories([])
      setError('')
    } catch (error: any) {
      console.error('Failed to fetch stories:', error)
      setError(error.message || 'Failed to load stories')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done':
        return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
      case 'in_progress':
        return 'bg-purple-500/10 text-purple-500 border-purple-500/20'
      case 'review':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20'
      default:
        return 'bg-slate-500/10 text-slate-500 border-slate-500/20'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
      case 'high':
        return 'text-red-500'
      case 'medium':
        return 'text-amber-500'
      default:
        return 'text-slate-500'
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="flex min-h-screen bg-background">
        <AppSidebar />
        <main className="flex-1 ml-64">
          <div className="flex items-center justify-center h-screen">
            <div className="text-muted-foreground">Loading stories...</div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <main className="flex-1 ml-64">
        {/* Header */}
        <div className="border-b border-border bg-card/80 backdrop-blur-xl sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow-purple">
                  <FileText className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold">Stories</h1>
                  <p className="text-muted-foreground">View and manage all your user stories</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-8 py-8">
          {/* Search and Filters */}
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search stories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
            <div className="flex gap-2">
              {(['all', 'backlog', 'in_progress', 'done'] as const).map((f) => (
                <Button
                  key={f}
                  variant={filter === f ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter(f)}
                >
                  {f === 'all' ? 'All' : f.replace('_', ' ')}
                </Button>
              ))}
            </div>
          </div>

          {/* Empty State */}
          {stories.length === 0 && !loading && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="h-16 w-16 rounded-full bg-gradient-primary/10 flex items-center justify-center mb-4">
                  <FileText className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">View Stories by Project</h3>
                <p className="text-muted-foreground text-center max-w-md mb-6">
                  Stories are organized within projects. Navigate to a specific project to view and manage its stories.
                </p>
                <Button onClick={() => router.push('/projects')}>
                  Go to Projects
                </Button>
              </CardContent>
            </Card>
          )}

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
