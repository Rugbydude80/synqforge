'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'

interface Comment {
  id: string
  storyId: string
  userId: string
  content: string
  parentCommentId: string | null
  mentions: string[]
  createdAt: string
  updatedAt: string
  author: {
    id: string
    name: string
    email: string
    avatar: string | null
  }
  reactionCount: number
}

interface CommentThreadProps {
  storyId: string
  currentUserId: string
}

export function CommentThread({ storyId, currentUserId }: CommentThreadProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const loadComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/comments?storyId=${storyId}`)
      if (!res.ok) throw new Error('Failed to load comments')
      const data = await res.json()
      setComments(data)
    } catch {
      toast.error('Failed to load comments')
    }
  }, [storyId])

  useEffect(() => {
    loadComments()
  }, [loadComments])

  const handleSubmit = async (parentId: string | null = null) => {
    if (!newComment.trim()) return

    setLoading(true)
    try {
      // Extract mentions from content (@username)
      const mentionRegex = /@(\w+)/g
      const mentions = [...newComment.matchAll(mentionRegex)].map((m) => m[1])

      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyId,
          content: newComment,
          parentCommentId: parentId,
          mentions,
        }),
      })

      if (!res.ok) throw new Error('Failed to post comment')

      setNewComment('')
      setReplyingTo(null)
      await loadComments()
      toast.success('Comment posted')
    } catch {
      toast.error('Failed to post comment')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (commentId: string) => {
    if (!confirm('Delete this comment?')) return

    try {
      const res = await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE',
      })

      if (!res.ok) throw new Error('Failed to delete comment')

      await loadComments()
      toast.success('Comment deleted')
    } catch {
      toast.error('Failed to delete comment')
    }
  }

  const handleReaction = async (commentId: string, emoji: string) => {
    try {
      const res = await fetch(`/api/comments/${commentId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji }),
      })

      if (!res.ok) throw new Error('Failed to add reaction')

      await loadComments()
    } catch {
      toast.error('Failed to add reaction')
    }
  }

  // Group comments by thread
  const topLevelComments = comments.filter((c) => !c.parentCommentId)
  const getReplies = (parentId: string) =>
    comments.filter((c) => c.parentCommentId === parentId)

  const CommentItem = ({ comment, isReply = false }: { comment: Comment; isReply?: boolean }) => {
    const [copied, setCopied] = useState(false)

    const copyPermalink = () => {
      const url = `${window.location.origin}${window.location.pathname}#comment-${comment.id}`
      navigator.clipboard.writeText(url)
      setCopied(true)
      toast.success('Comment link copied')
      setTimeout(() => setCopied(false), 2000)
    }

    return (
      <Card
        key={comment.id}
        id={`comment-${comment.id}`}
        className={`p-4 ${isReply ? 'ml-8 mt-2' : 'mb-4'} scroll-mt-20`}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-sm font-semibold">
              {comment.author.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div>
              <div className="font-semibold text-sm">{comment.author.name}</div>
              <div className="text-xs text-gray-500">
                {formatDistanceToNow(new Date(comment.createdAt), {
                  addSuffix: true,
                })}
              </div>
            </div>
          </div>

          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={copyPermalink}
              className="text-muted-foreground hover:text-foreground"
              title="Copy link to comment"
            >
              {copied ? '✓' : '🔗'}
            </Button>
            {comment.userId === currentUserId && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(comment.id)}
                className="text-red-500 hover:text-red-700"
              >
                Delete
              </Button>
            )}
          </div>
        </div>

        <div className="text-sm mb-3 whitespace-pre-wrap">{comment.content}</div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleReaction(comment.id, '👍')}
          >
            👍 {comment.reactionCount > 0 && comment.reactionCount}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleReaction(comment.id, '❤️')}
          >
            ❤️
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setReplyingTo(comment.id)}
          >
            Reply
          </Button>
        </div>

        {replyingTo === comment.id && (
          <div className="mt-3">
            <Textarea
              placeholder="Write a reply..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="mb-2"
            />
            <div className="flex gap-2">
              <Button onClick={() => handleSubmit(comment.id)} disabled={loading}>
                {loading ? 'Posting...' : 'Reply'}
              </Button>
              <Button variant="ghost" onClick={() => setReplyingTo(null)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Render replies */}
        {getReplies(comment.id).map((reply) => <CommentItem key={reply.id} comment={reply} isReply={true} />)}
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">
        Comments ({comments.length})
      </h3>

      {/* New comment form */}
      <Card className="p-4">
        <Textarea
          placeholder="Add a comment... Use @username to mention"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          className="mb-2"
          rows={3}
        />
        <div className="flex justify-between items-center">
          <div className="text-xs text-gray-500">
            Tip: Use @username to mention someone
          </div>
          <Button onClick={() => handleSubmit()} disabled={loading}>
            {loading ? 'Posting...' : 'Comment'}
          </Button>
        </div>
      </Card>

      {/* Comment list */}
      <div>{topLevelComments.map((comment) => <CommentItem key={comment.id} comment={comment} />)}</div>

      {comments.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No comments yet. Be the first to comment!
        </div>
      )}
    </div>
  )
}
