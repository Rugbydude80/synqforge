'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { MessageSquare, Send, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

type FeedbackType = 'bug' | 'feature' | 'general' | 'other'

export function FeedbackForm() {
  const { data: session } = useSession()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    type: 'general' as FeedbackType,
    subject: '',
    message: '',
    email: session?.user?.email || '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: formData.type,
          subject: formData.subject,
          message: formData.message,
          email: formData.email || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit feedback')
      }

      toast.success(data.message || 'Thank you for your feedback!')
      
      // Reset form
      setFormData({
        type: 'general',
        subject: '',
        message: '',
        email: session?.user?.email || '',
      })
    } catch (error) {
      console.error('Error submitting feedback:', error)
      toast.error(
        error instanceof Error 
          ? error.message 
          : 'Failed to submit feedback. Please try again.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const typeOptions = [
    { value: 'bug', label: 'Bug Report' },
    { value: 'feature', label: 'Feature Request' },
    { value: 'general', label: 'General Feedback' },
    { value: 'other', label: 'Other' },
  ]

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-gradient-primary flex items-center justify-center">
            <MessageSquare className="h-5 w-5 text-white" />
          </div>
          <div>
            <CardTitle>Send Feedback</CardTitle>
            <CardDescription>
              We'd love to hear from you! Share your thoughts, report issues, or suggest improvements.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="type">Feedback Type</Label>
            <Select
              id="type"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as FeedbackType })}
              required
            >
              {typeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              type="text"
              placeholder="Brief summary of your feedback"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              required
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground">
              {formData.subject.length}/200 characters
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              placeholder="Tell us more about your feedback, issue, or feature request..."
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              required
              rows={6}
              maxLength={5000}
            />
            <p className="text-xs text-muted-foreground">
              {formData.message.length}/5000 characters (minimum 10)
            </p>
          </div>

          {!session?.user?.email && (
            <div className="space-y-2">
              <Label htmlFor="email">Your Email (optional)</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                We'll use this to follow up if needed. Your email will not be shared publicly.
              </p>
            </div>
          )}

          {session?.user?.email && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Note:</strong> Your feedback will be sent from{' '}
                <span className="font-medium">{session.user.email}</span>. 
                We'll use this email to follow up if needed.
              </p>
            </div>
          )}

          <Button 
            type="submit" 
            disabled={isSubmitting || formData.message.length < 10}
            className="w-full"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send Feedback
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            All feedback is reviewed by our team. We typically respond within 1-2 business days.
          </p>
        </form>
      </CardContent>
    </Card>
  )
}








