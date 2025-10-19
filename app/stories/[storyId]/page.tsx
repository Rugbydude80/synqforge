import { notFound, redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { AppSidebar } from '@/components/app-sidebar'
import { Button } from '@/components/ui/button'
import { StoryDetailClient } from '@/components/story-detail-client'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { projectUrl } from '@/lib/urls'
import { storiesRepository } from '@/lib/repositories/stories.repository'
import { assertStoryAccessible } from '@/lib/permissions/story-access'
import type { Story } from '@/lib/api-client'

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

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <main className="flex-1 md:ml-64">
        {/* Header */}
        <div className="border-b border-border bg-card/80 backdrop-blur-xl sticky top-0 z-10">
          <div className="max-w-5xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 md:py-6">
            <div className="flex items-center gap-4">
              {story.projectId && (
                <Link href={projectUrl(story.projectId)}>
                  <Button variant="ghost" size="sm">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Project
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Content - Client Component */}
        <StoryDetailClient
          story={story}
          currentUserId={session.user.id}
        />
      </main>
    </div>
  )
}
