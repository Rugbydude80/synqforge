import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, ArrowLeft, Home } from 'lucide-react'

export default function StoryNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2 text-yellow-500">
            <AlertCircle className="h-6 w-6" />
            <CardTitle>Story Not Found</CardTitle>
          </div>
          <CardDescription>
            The story you're looking for doesn't exist or you don't have access to it.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This could happen if:
          </p>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            <li>The story was deleted</li>
            <li>You don't have permission to view this story</li>
            <li>The story link is incorrect or expired</li>
            <li>The story belongs to a different organization</li>
          </ul>
          <div className="flex flex-col sm:flex-row gap-2 pt-4">
            <Button asChild variant="outline" className="flex-1">
              <Link href="/dashboard">
                <Home className="mr-2 h-4 w-4" />
                Go to Dashboard
              </Link>
            </Button>
            <Button asChild className="flex-1">
              <Link href="/stories">
                <ArrowLeft className="mr-2 h-4 w-4" />
                All Stories
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
