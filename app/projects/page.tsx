'use client'

import { useState } from 'react'
import {
  FolderKanban,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Archive,
  Edit,
  Users,
  TrendingUp,
  Calendar,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn, formatRelativeTime } from '@/lib/utils'

interface Project {
  id: string
  name: string
  description: string
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'archived'
  owner: string
  epicCount: number
  storyCount: number
  activeSprintCount: number
  updatedAt: Date
}

export default function ProjectsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const mockProjects: Project[] = [
    {
      id: '1',
      name: 'SynqForge Backend',
      description: 'Core API and database development for project management platform',
      status: 'active',
      owner: 'John Doe',
      epicCount: 8,
      storyCount: 47,
      activeSprintCount: 2,
      updatedAt: new Date(Date.now() - 1000 * 60 * 30),
    },
    {
      id: '2',
      name: 'Mobile App',
      description: 'React Native mobile application for iOS and Android',
      status: 'active',
      owner: 'Sarah Chen',
      epicCount: 5,
      storyCount: 23,
      activeSprintCount: 1,
      updatedAt: new Date(Date.now() - 1000 * 60 * 120),
    },
    {
      id: '3',
      name: 'Enterprise Platform',
      description: 'Scalable platform for enterprise customers',
      status: 'planning',
      owner: 'Mike Ross',
      epicCount: 12,
      storyCount: 89,
      activeSprintCount: 0,
      updatedAt: new Date(Date.now() - 1000 * 60 * 240),
    },
    {
      id: '4',
      name: 'Legacy System Migration',
      description: 'Migration from legacy system to new architecture',
      status: 'completed',
      owner: 'Emma Wilson',
      epicCount: 6,
      storyCount: 34,
      activeSprintCount: 0,
      updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
    },
  ]

  const filteredProjects = mockProjects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusColor = (status: string) => {
    const colors = {
      planning: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
      active: 'bg-brand-purple-500/10 text-brand-purple-400 border-brand-purple-500/20',
      on_hold: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
      completed: 'bg-brand-emerald-500/10 text-brand-emerald-400 border-brand-emerald-500/20',
      archived: 'bg-muted text-muted-foreground border-border',
    }
    return colors[status as keyof typeof colors] || colors.planning
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Projects</h1>
              <p className="text-muted-foreground">Manage your projects and track progress</p>
            </div>
            <Button size="lg">
              <Plus className="h-5 w-5 mr-2" />
              New Project
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Filters */}
        <div className="flex items-center gap-4 mb-8">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="all">All Status</option>
              <option value="planning">Planning</option>
              <option value="active">Active</option>
              <option value="on_hold">On Hold</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>

        {/* Projects Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => (
            <Card key={project.id} className="group hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg group-hover:text-brand-purple-400 transition-colors">
                      {project.name}
                    </CardTitle>
                    <CardDescription className="mt-1 line-clamp-2">
                      {project.description}
                    </CardDescription>
                  </div>
                  <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Status Badge */}
                <Badge className={getStatusColor(project.status)}>
                  {project.status.replace('_', ' ')}
                </Badge>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-brand-purple-400">{project.epicCount}</div>
                    <div className="text-xs text-muted-foreground">Epics</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-brand-emerald-400">{project.storyCount}</div>
                    <div className="text-xs text-muted-foreground">Stories</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-orange-400">{project.activeSprintCount}</div>
                    <div className="text-xs text-muted-foreground">Active</div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{project.owner}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {formatRelativeTime(project.updatedAt)}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredProjects.length === 0 && (
          <div className="text-center py-16">
            <FolderKanban className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No projects found</h3>
            <p className="text-muted-foreground mb-6">
              {searchTerm || statusFilter !== 'all'
                ? 'Try adjusting your search or filter criteria'
                : 'Get started by creating your first project'
              }
            </p>
            <Button>
              <Plus className="h-5 w-5 mr-2" />
              Create Project
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}


