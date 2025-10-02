'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MoreVertical,
  Plus,
  User,
  Calendar,
  MessageSquare,
  Paperclip,
  Sparkles,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn, getInitials, getPriorityColor } from '@/lib/utils'

interface Story {
  id: string
  title: string
  description: string
  status: 'todo' | 'in-progress' | 'review' | 'done'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  assignee?: { name: string; avatar?: string }
  storyPoints?: number
  comments: number
  attachments: number
  aiGenerated?: boolean
  dueDate?: Date
}

const columns = [
  { id: 'todo', title: 'To Do', color: 'from-slate-500 to-slate-600' },
  { id: 'in-progress', title: 'In Progress', color: 'from-brand-purple-500 to-brand-purple-600' },
  { id: 'review', title: 'Review', color: 'from-amber-500 to-amber-600' },
  { id: 'done', title: 'Done', color: 'from-brand-emerald-500 to-brand-emerald-600' },
]

export default function KanbanBoard() {
  const [stories] = useState<Story[]>([
    {
      id: '1',
      title: 'User Authentication - OAuth Integration',
      description: 'Implement Google and GitHub OAuth for user sign-in',
      status: 'in-progress',
      priority: 'high',
      assignee: { name: 'Sarah Chen' },
      storyPoints: 8,
      comments: 3,
      attachments: 2,
      aiGenerated: true,
      dueDate: new Date(Date.now() + 86400000 * 2),
    },
    {
      id: '2',
      title: 'Dashboard UI Components',
      description: 'Build reusable card, button, and badge components',
      status: 'done',
      priority: 'high',
      assignee: { name: 'John Doe' },
      storyPoints: 5,
      comments: 7,
      attachments: 1,
      aiGenerated: false,
    },
    {
      id: '3',
      title: 'File Upload with Drag & Drop',
      description: 'Implement file upload interface with progress indicators',
      status: 'review',
      priority: 'medium',
      assignee: { name: 'Mike Ross' },
      storyPoints: 5,
      comments: 2,
      attachments: 3,
      aiGenerated: true,
    },
    {
      id: '4',
      title: 'AI Story Generation Endpoint',
      description: 'Create API endpoint for generating stories from requirements',
      status: 'todo',
      priority: 'urgent',
      storyPoints: 13,
      comments: 1,
      attachments: 0,
      aiGenerated: false,
    },
    {
      id: '5',
      title: 'Real-time Collaboration Features',
      description: 'Add live cursors and presence tracking',
      status: 'todo',
      priority: 'low',
      storyPoints: 8,
      comments: 0,
      attachments: 1,
      aiGenerated: true,
    },
    {
      id: '6',
      title: 'Sprint Velocity Analytics',
      description: 'Build charts and metrics for sprint performance',
      status: 'in-progress',
      priority: 'medium',
      assignee: { name: 'Emma Wilson' },
      storyPoints: 8,
      comments: 4,
      attachments: 2,
      aiGenerated: false,
      dueDate: new Date(Date.now() + 86400000 * 5),
    },
  ])

  const getStoriesByColumn = (columnId: string) =>
    stories.filter((story) => story.status === columnId)

  return (
    <div className="h-full overflow-x-auto">
      <div className="flex gap-6 p-6 min-w-max">
        {columns.map((column) => {
          const columnStories = getStoriesByColumn(column.id)
          return (
            <div key={column.id} className="w-80 shrink-0">
              {/* Column Header */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        'h-2 w-2 rounded-full bg-gradient-to-r',
                        column.color
                      )}
                    />
                    <h3 className="font-semibold">{column.title}</h3>
                    <Badge variant="outline" className="ml-auto">
                      {columnStories.length}
                    </Badge>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div
                  className={cn(
                    'h-1 rounded-full bg-gradient-to-r',
                    column.color
                  )}
                />
              </div>

              {/* Stories */}
              <div className="space-y-3">
                <AnimatePresence>
                  {columnStories.map((story, index) => (
                    <motion.div
                      key={story.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card className="p-4 cursor-pointer group hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
                        {/* AI Badge */}
                        {story.aiGenerated && (
                          <div className="absolute top-2 right-2">
                            <Sparkles className="h-4 w-4 text-brand-purple-400" />
                          </div>
                        )}

                        {/* Priority Indicator */}
                        <div
                          className={cn(
                            'absolute left-0 top-0 bottom-0 w-1',
                            story.priority === 'urgent' && 'bg-red-500',
                            story.priority === 'high' && 'bg-orange-500',
                            story.priority === 'medium' && 'bg-yellow-500',
                            story.priority === 'low' && 'bg-blue-500'
                          )}
                        />

                        <div className="ml-2">
                          {/* Title */}
                          <h4 className="font-medium mb-2 group-hover:text-brand-purple-400 transition-colors">
                            {story.title}
                          </h4>

                          {/* Description */}
                          <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                            {story.description}
                          </p>

                          {/* Badges */}
                          <div className="flex flex-wrap gap-2 mb-3">
                            <Badge
                              variant="outline"
                              className={getPriorityColor(story.priority)}
                            >
                              {story.priority}
                            </Badge>
                            {story.storyPoints && (
                              <Badge variant="outline">
                                {story.storyPoints} pts
                              </Badge>
                            )}
                          </div>

                          {/* Footer */}
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <div className="flex items-center gap-3">
                              {story.comments > 0 && (
                                <div className="flex items-center gap-1">
                                  <MessageSquare className="h-3 w-3" />
                                  {story.comments}
                                </div>
                              )}
                              {story.attachments > 0 && (
                                <div className="flex items-center gap-1">
                                  <Paperclip className="h-3 w-3" />
                                  {story.attachments}
                                </div>
                              )}
                              {story.dueDate && (
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {story.dueDate.toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                  })}
                                </div>
                              )}
                            </div>

                            {/* Assignee */}
                            {story.assignee && (
                              <div className="flex items-center gap-1">
                                <div className="h-6 w-6 rounded-full bg-gradient-primary flex items-center justify-center text-[10px] font-medium text-white">
                                  {getInitials(story.assignee.name)}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* Add Story Button */}
                <Button
                  variant="ghost"
                  className="w-full justify-start text-muted-foreground hover:text-foreground border-2 border-dashed"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Story
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
