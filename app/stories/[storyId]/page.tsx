import { notFound, redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { AppSidebar } from '@/components/app-sidebar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft, Calendar, User, Layers, Tag, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import { projectStoryUrl, projectUrl } from '@/lib/urls'
import { storiesRepository } from '@/lib/repositories/stories.repository'
import { assertStoryAccessible } from '@/lib/permissions/story-access'

type Story = {
  id: string
  epicId?: string
  projectId: string
  title: string
  description?: string
  acceptanceCriteria?: string[]
  storyPoints?: number
  priority: 'low' | 'medium' | 'high' | 'critical'
  status: 'backlog' | 'ready' | 'in_progress' | 'review' | 'done' | 'blocked'
  storyType: 'feature' | 'bug' | 'task' | 'spike'
  assignedTo?: string
  tags?: string[]
  aiGenerated: boolean
  createdBy: string
  createdAt: string
  updatedAt: string
  assignee?: {
    id: string
    name: string
    email: string
  }
  project?: {
    id: string
    name: string
  }
}

async function getStory(storyId: string, organizationId: string): Promise<Story | null> {
  try {
    // Check if story exists and user has access to it
    await assertStoryAccessible(storyId, organizationId)
    
    // Get story directly from repository (no HTTP overhead)
    const story = await storiesRepository.getById(storyId)
    
    return story as any
  } catch (error) {
    // Log the actual error for debugging
    console.error(`Error fetching story ${storyId}:`, error)
    
    // Return null to trigger notFound() page
    // This handles both "story doesn't exist" and "access denied" cases
    return null
  }
}

const priorityColors = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
}

const statusColors = {
  backlog: 'bg-gray-100 text-gray-800',
  ready: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  review: 'bg-purple-100 text-purple-800',
  done: 'bg-green-100 text-green-800',
  blocked: 'bg-red-100 text-red-800',
}

const storyTypeColors = {
  feature: 'bg-blue-100 text-blue-800',
  bug: 'bg-red-100 text-red-800',
  task: 'bg-green-100 text-green-800',
  spike: 'bg-purple-100 text-purple-800',
}

export default async function StoryPage({
  params,
}: {
  params: Promise<{ storyId: string }>
}) {
  const session = await auth()

  if (!session?.user) {
    redirect('/auth/signin')
  }

  // Ensure user has organizationId
  if (!session.user.organizationId) {
    console.error('User session missing organizationId')
    notFound()
  }

  const { storyId } = await params
  const story = await getStory(storyId, session.user.organizationId)

  if (!story) {
    notFound()
  }

  if (process.env.NEXT_PUBLIC_STORY_REDIRECT_TO_PROJECT === '1' && story.projectId) {
    redirect(projectStoryUrl(story.projectId, story.id))
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <main className="flex-1 ml-64">
        {/* Header */}
        <div className="border-b border-border bg-card/80 backdrop-blur-xl sticky top-0 z-10">
          <div className="max-w-5xl mx-auto px-8 py-6">
            <div className="flex items-center gap-4 mb-4">
              {story.projectId && (
                <Link href={projectUrl(story.projectId)}>
                  <Button variant="ghost" size="sm">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Project
                  </Button>
                </Link>
              )}
            </div>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h1 className="text-3xl font-bold mb-2">{story.title}</h1>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={statusColors[story.status]}>
                    {story.status.replace('_', ' ')}
                  </Badge>
                  <Badge className={priorityColors[story.priority]}>
                    {story.priority}
                  </Badge>
                  <Badge className={storyTypeColors[story.storyType]}>
                    {story.storyType}
                  </Badge>
                  {story.storyPoints && (
                    <Badge variant="outline">{story.storyPoints} points</Badge>
                  )}
                  {story.aiGenerated && (
                    <Badge variant="secondary">AI Generated</Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-5xl mx-auto px-8 py-8 space-y-6">
          {/* Description */}
          {story.description && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {story.description}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Acceptance Criteria */}
          {story.acceptanceCriteria && story.acceptanceCriteria.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Acceptance Criteria</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {story.acceptanceCriteria.map((criteria, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 mt-1 text-primary flex-shrink-0" />
                      <span className="text-muted-foreground">{criteria}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Meta Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {story.project && (
                  <div className="flex items-center gap-3">
                    <Layers className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Project</p>
                      <Link
                        href={projectUrl(story.projectId)}
                        className="text-sm font-medium hover:underline text-blue-600"
                      >
                        {story.project.name}
                      </Link>
                    </div>
                  </div>
                )}

                {story.assignee && (
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Assigned To</p>
                      <p className="text-sm font-medium">{story.assignee.name}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Created</p>
                    <p className="text-sm font-medium">
                      {format(new Date(story.createdAt), 'PPP')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Updated</p>
                    <p className="text-sm font-medium">
                      {format(new Date(story.updatedAt), 'PPP')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tags */}
            {story.tags && story.tags.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Tags</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {story.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary">
                        <Tag className="h-3 w-3 mr-1" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Actions */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-4">
                {story.projectId && (
                  <Button asChild>
                    <Link href={projectUrl(story.projectId)}>
                      View in Project Context
                    </Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
