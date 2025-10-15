'use client'

import * as React from 'react'
import { api, type Epic } from '@/lib/api-client'
import { Layers, Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { AppSidebar } from '@/components/app-sidebar'
import { EpicFormModal } from '@/components/epic-form-modal'
import { EpicDetailDrawer } from '@/components/epic-detail-drawer'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const statusColors = {
  draft: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  published: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  planned: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  in_progress: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  completed: 'bg-green-500/10 text-green-400 border-green-500/20',
  archived: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
}

const priorityColors = {
  low: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  medium: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  high: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  critical: 'bg-red-500/10 text-red-400 border-red-500/20',
}

export default function EpicsPage() {
  const [epics, setEpics] = React.useState<Epic[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<string>('all')
  const [priorityFilter, setPriorityFilter] = React.useState<string>('all')

  const [showCreateModal, setShowCreateModal] = React.useState(false)
  const [showEditModal, setShowEditModal] = React.useState(false)
  const [selectedEpic, setSelectedEpic] = React.useState<Epic | null>(null)
  const [detailDrawerOpen, setDetailDrawerOpen] = React.useState(false)

  React.useEffect(() => {
    fetchEpics()
  }, [])

  const fetchEpics = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await api.epics.list()
      setEpics(response.data || [])
    } catch (err: any) {
      setError(err.message || 'Failed to load epics')
      setEpics([])
      toast.error('Failed to load epics')
    } finally {
      setLoading(false)
    }
  }

  const filteredEpics = epics.filter((epic) => {
    const matchesSearch = epic.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         epic.description?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || epic.status === statusFilter
    const matchesPriority = priorityFilter === 'all' || epic.priority === priorityFilter
    return matchesSearch && matchesStatus && matchesPriority
  })

  const handleEpicClick = (epic: Epic) => {
    setSelectedEpic(epic)
    setDetailDrawerOpen(true)
  }

  const handleEdit = (epic: Epic) => {
    setSelectedEpic(epic)
    setShowEditModal(true)
    setDetailDrawerOpen(false)
  }

  const handleDelete = (epicId: string) => {
    setEpics(epics.filter((e) => e.id !== epicId))
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />

      <main className="flex-1 ml-64">
        {/* Header */}
        <div className="border-b border-border bg-card/80 backdrop-blur-xl sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-primary">
                  <Layers className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold">Epics</h1>
                  <p className="text-sm text-muted-foreground">
                    Manage your epic-level features and initiatives
                  </p>
                </div>
              </div>
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Epic
              </Button>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4 mt-6">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search epics..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="planned">Planned</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </Select>

              <Select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
              >
                <option value="all">All Priorities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </Select>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-8 py-8">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <Skeleton className="h-6 w-3/4 mb-3" />
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-2/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-400 mb-4">{error}</p>
              <Button onClick={fetchEpics}>Retry</Button>
            </div>
          ) : filteredEpics.length === 0 ? (
            <div className="text-center py-12">
              <Layers className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No epics found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || statusFilter !== 'all' || priorityFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Get started by creating your first epic'}
              </p>
              {!searchQuery && statusFilter === 'all' && priorityFilter === 'all' && (
                <Button onClick={() => setShowCreateModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Epic
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEpics.map((epic) => (
                <Card
                  key={epic.id}
                  className="cursor-pointer hover:shadow-lg hover:shadow-purple-500/10 transition-all"
                  onClick={() => handleEpicClick(epic)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <Badge className={cn('border', statusColors[epic.status])}>
                        {epic.status.replace('_', ' ')}
                      </Badge>
                      <Badge className={cn('border', priorityColors[epic.priority])}>
                        {epic.priority}
                      </Badge>
                    </div>

                    <h3 className="font-semibold text-lg mb-2 line-clamp-2">
                      {epic.title}
                    </h3>

                    {epic.description && (
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {epic.description}
                      </p>
                    )}

                    {(epic.totalStories !== undefined || epic.aiGenerated) && (
                      <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                        {epic.totalStories !== undefined && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {epic.completedStories || 0} / {epic.totalStories} stories
                            </span>
                            {epic.totalStories > 0 && (
                              <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-primary transition-all"
                                  role="progressbar"
                                  aria-label={`Epic progress: ${epic.completedStories || 0} of ${epic.totalStories} stories completed`}
                                  aria-valuenow={Math.round(epic.totalStories > 0 ? ((epic.completedStories || 0) / epic.totalStories) * 100 : 0)}
                                  aria-valuemin={0}
                                  aria-valuemax={100}
                                  style={{
                                    width: `${epic.totalStories > 0 ? ((epic.completedStories || 0) / epic.totalStories) * 100 : 0}%`
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        )}
                        {epic.aiGenerated && (
                          <Badge variant="secondary" className="text-xs ml-auto">
                            AI
                          </Badge>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      <EpicFormModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSuccess={() => {
          setShowCreateModal(false)
          fetchEpics()
        }}
      />

      <EpicFormModal
        epic={selectedEpic || undefined}
        open={showEditModal}
        onOpenChange={setShowEditModal}
        onSuccess={() => {
          setShowEditModal(false)
          fetchEpics()
        }}
      />

      <EpicDetailDrawer
        epic={selectedEpic}
        open={detailDrawerOpen}
        onOpenChange={setDetailDrawerOpen}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </div>
  )
}
