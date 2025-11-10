'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api-client'
import type { Story, Epic } from '@/lib/api-client'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Sparkles, X, AlertCircle } from 'lucide-react'
import { ContextSelector } from '@/components/story-generation/ContextSelector'
import { ContextLevel, UserTier } from '@/lib/types/context.types'
import { PromptTemplateSelector } from '@/components/ai/prompt-template-selector'
import { emitProjectMetricsChanged } from '@/lib/events/project-events'

interface StoryFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  story?: Story
  onSuccess?: () => void
}

export function StoryFormModal({
  open,
  onOpenChange,
  projectId,
  story,
  onSuccess,
}: StoryFormModalProps) {
  const [isLoading, setIsLoading] = React.useState(false)
  const [isGenerating, setIsGenerating] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [epics, setEpics] = React.useState<Epic[]>([])
  const [showAIInput, setShowAIInput] = React.useState(false)
  const [aiRequirement, setAiRequirement] = React.useState('')
  const [showEpicPrompt, setShowEpicPrompt] = React.useState(false)
  const [promptTemplate, setPromptTemplate] = React.useState<string>('standard')
  
  const [formData, setFormData] = React.useState({
    title: '',
    description: '',
    priority: 'medium' as Story['priority'],
    storyPoints: 0,
    epicId: '',
    acceptanceCriteria: [''],
  })
  
  const [selectedContextLevel, setSelectedContextLevel] = React.useState<ContextLevel>(ContextLevel.STANDARD)
  const [userContextData, setUserContextData] = React.useState<{
    userTier: UserTier;
    actionsUsed: number;
    monthlyLimit: number;
  } | null>(null)
  const [loadingContextData, setLoadingContextData] = React.useState(true)

  // Fetch user's context level data
  React.useEffect(() => {
    async function fetchContextData() {
      try {
        const response = await fetch('/api/ai/context-level/user-data')
        if (response.ok) {
          const data = await response.json()
          setUserContextData({
            userTier: data.data.userTier,
            actionsUsed: data.data.actionsUsed,
            monthlyLimit: data.data.monthlyLimit,
          })
        }
      } catch (error) {
        console.error('Failed to fetch context data:', error)
        // Fallback to default values
        setUserContextData({
          userTier: UserTier.PRO,
          actionsUsed: 0,
          monthlyLimit: 800,
        })
      } finally {
        setLoadingContextData(false)
      }
    }
    
    if (open && !story) {
      fetchContextData()
    }
  }, [open, story])

  const fetchEpics = React.useCallback(async () => {
    try {
      // Only fetch published epics (draft epics shouldn't be available for story assignment)
      const response = await api.epics.list({ projectId, status: 'published' })
      setEpics(response.data || [])
    } catch (err) {
      console.error('Failed to load epics:', err)
    }
  }, [projectId])

  // Load epics for dropdown
  React.useEffect(() => {
    if (open && projectId) {
      fetchEpics()
    }
  }, [open, projectId, fetchEpics])

  // Populate form if editing
  React.useEffect(() => {
    if (story) {
      setFormData({
        title: story.title,
        description: story.description || '',
        priority: story.priority,
        storyPoints: story.storyPoints || 0,
        epicId: story.epicId || '',
        acceptanceCriteria: story.acceptanceCriteria || [''],
      })
    }
  }, [story])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title.trim()) {
      setError('Title is required')
      return
    }

    // Check if epic is not selected and we have epics available
    if (!formData.epicId && epics.length > 0 && !showEpicPrompt) {
      setShowEpicPrompt(true)
      return
    }

    await saveStory()
  }

  const saveStory = async () => {
    setIsLoading(true)
    setError(null)

    try {
      if (story) {
        // For updates, don't send projectId and handle epicId properly
        const updateData: any = {
          title: formData.title.trim(),
          description: formData.description.trim() || undefined,
          priority: formData.priority,
          storyPoints: formData.storyPoints || undefined,
          acceptanceCriteria: formData.acceptanceCriteria.filter(ac => ac.trim()),
        }

        // Only include epicId if it's actually set (not empty string)
        if (formData.epicId && formData.epicId.trim()) {
          updateData.epicId = formData.epicId
        } else if (formData.epicId === '') {
          // If explicitly cleared, set to null
          updateData.epicId = null
        }

        await api.stories.update(story.id, updateData)
        toast.success('Story updated successfully!')
      } else {
        // For creates, include projectId
        const createData = {
          projectId,
          title: formData.title.trim(),
          description: formData.description.trim() || undefined,
          priority: formData.priority,
          storyPoints: formData.storyPoints || undefined,
          epicId: formData.epicId && formData.epicId.trim() ? formData.epicId : undefined,
          acceptanceCriteria: formData.acceptanceCriteria.filter(ac => ac.trim()),
        }

        await api.stories.create(createData)
        toast.success('Story created successfully!')
      }

      // Reset form
      setFormData({
        title: '',
        description: '',
        priority: 'medium',
        storyPoints: 0,
        epicId: '',
        acceptanceCriteria: [''],
      })
      setShowEpicPrompt(false)

      emitProjectMetricsChanged(story?.projectId ?? projectId)
      onSuccess?.()
      onOpenChange(false)
    } catch (err: any) {
      setError(err.message || 'Failed to save story')
      toast.error(err.message || 'Failed to save story')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddCriteria = () => {
    setFormData(prev => ({
      ...prev,
      acceptanceCriteria: [...prev.acceptanceCriteria, ''],
    }))
  }

  const handleRemoveCriteria = (index: number) => {
    setFormData(prev => ({
      ...prev,
      acceptanceCriteria: prev.acceptanceCriteria.filter((_, i) => i !== index),
    }))
  }

  const handleCriteriaChange = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      acceptanceCriteria: prev.acceptanceCriteria.map((ac, i) => i === index ? value : ac),
    }))
  }

  const handleGenerateWithAI = async () => {
    if (!aiRequirement.trim()) {
      setError('Please enter a requirement to generate a story')
      return
    }

    if (aiRequirement.trim().length < 10) {
      setError('Requirement must be at least 10 characters')
      return
    }

    setIsGenerating(true)
    setError(null)

    try {
      const response = await fetch('/api/ai/generate-single-story', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requirement: aiRequirement.trim(),
          projectId,
          epicId: formData.epicId || undefined,
          contextLevel: selectedContextLevel,
          promptTemplate: promptTemplate, // Include selected template
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate story')
      }

      const data = await response.json()
      const generatedStory = data.story

      // Populate form with AI-generated data
      setFormData({
        title: generatedStory.title || '',
        description: generatedStory.description || '',
        priority: generatedStory.priority || 'medium',
        storyPoints: generatedStory.storyPoints || 0,
        epicId: formData.epicId, // Keep existing epic selection
        acceptanceCriteria: generatedStory.acceptanceCriteria?.length > 0
          ? generatedStory.acceptanceCriteria
          : [''],
      })

      setShowAIInput(false)
      setAiRequirement('')
      toast.success('Story generated successfully! Review and adjust as needed.')
    } catch (err: any) {
      setError(err.message || 'Failed to generate story')
      toast.error(err.message || 'Failed to generate story')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{story ? 'Edit Story' : 'Create New Story'}</DialogTitle>
            <DialogDescription>
              {story ? 'Update story details' : 'Add a new story to your project'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* AI Generation Section */}
            {!story && !showAIInput && (
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAIInput(true)}
                  disabled={isLoading}
                  className="gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  Generate with AI
                </Button>
              </div>
            )}

            {!story && showAIInput && (
              <div className="grid gap-3 p-4 border border-purple-500/30 bg-purple-500/5 rounded-lg">
                <div className="flex items-center justify-between">
                  <Label className="text-purple-400 flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    AI Story Generation
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowAIInput(false)
                      setAiRequirement('')
                      setError(null)
                    }}
                    disabled={isGenerating}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Template Selector */}
                <PromptTemplateSelector
                  value={promptTemplate}
                  onChange={setPromptTemplate}
                  disabled={isGenerating}
                />
                
                <Textarea
                  placeholder="Describe what you want this story to accomplish... (e.g., 'Allow users to reset their password via email')"
                  value={aiRequirement}
                  onChange={(e) => setAiRequirement(e.target.value)}
                  disabled={isGenerating}
                  rows={3}
                  maxLength={500}
                />
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">
                    {aiRequirement.length}/500 characters
                  </span>
                  <Button
                    type="button"
                    onClick={handleGenerateWithAI}
                    disabled={isGenerating || aiRequirement.trim().length < 10}
                    size="sm"
                    className="gap-2"
                  >
                    {isGenerating ? (
                      <>Generating...</>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Generate Story
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="As a user, I want to..."
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                maxLength={255}
                disabled={isLoading}
                autoFocus
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe the story in detail..."
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                maxLength={2000}
                disabled={isLoading}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  id="priority"
                  value={formData.priority}
                  onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as Story['priority'] }))}
                  disabled={isLoading}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="storyPoints">Story Points</Label>
                <Input
                  id="storyPoints"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.storyPoints}
                  onChange={(e) => setFormData(prev => ({ ...prev, storyPoints: parseInt(e.target.value) || 0 }))}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="epic">Epic (optional)</Label>
              <select
                id="epic"
                value={formData.epicId}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, epicId: e.target.value }))
                  setShowEpicPrompt(false) // Hide prompt if epic is selected
                }}
                disabled={isLoading || epics.length === 0}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">No Epic</option>
                {epics.map((epic) => (
                  <option key={epic.id} value={epic.id}>
                    {epic.title}
                  </option>
                ))}
              </select>
              
              {epics.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No epics available. Create an epic first to organize your stories.
                </p>
              )}

              {/* Epic prompt when user hasn't selected an epic */}
              {showEpicPrompt && epics.length > 0 && (
                <Alert className="border-amber-500/50 bg-amber-500/10 mt-2">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  <AlertDescription className="text-sm">
                    <p className="font-medium mb-2">This story is not associated with an epic.</p>
                    <p className="text-muted-foreground mb-3">
                      Associating stories with epics helps organize and track progress. Do you want to select an epic?
                    </p>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setShowEpicPrompt(false)
                          // Focus the epic dropdown
                          document.getElementById('epic')?.focus()
                        }}
                      >
                        Select Epic
                      </Button>
                      <Button
                        type="button"
                        variant="default"
                        size="sm"
                        onClick={() => {
                          setShowEpicPrompt(false)
                          saveStory()
                        }}
                      >
                        Continue Without Epic
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Context Level Selector - Only show when using AI generation */}
            {!story && showAIInput && (
              <div className="grid gap-2">
                <Label>AI Context Level</Label>
                {loadingContextData ? (
                  <div className="text-sm text-gray-500">Loading context data...</div>
                ) : userContextData ? (
                  <ContextSelector
                    selectedLevel={selectedContextLevel}
                    onLevelChange={setSelectedContextLevel}
                    userTier={userContextData.userTier}
                    actionsUsed={userContextData.actionsUsed}
                    monthlyLimit={userContextData.monthlyLimit}
                    projectId={projectId}
                    epicId={formData.epicId || undefined}
                  />
                ) : (
                  <div className="text-sm text-red-500">Failed to load context data</div>
                )}
              </div>
            )}

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label>Acceptance Criteria</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddCriteria}
                  disabled={isLoading}
                >
                  Add Criteria
                </Button>
              </div>
              <div className="space-y-2">
                {formData.acceptanceCriteria.map((criteria, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      placeholder={`Criteria ${index + 1}`}
                      value={criteria}
                      onChange={(e) => handleCriteriaChange(index, e.target.value)}
                      disabled={isLoading}
                    />
                    {formData.acceptanceCriteria.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveCriteria(index)}
                        disabled={isLoading}
                      >
                        ×
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <div className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                {error}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" loading={isLoading}>
              {story ? 'Update Story' : 'Create Story'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
