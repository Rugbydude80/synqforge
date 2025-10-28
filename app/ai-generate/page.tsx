'use client'
export const dynamic = 'force-dynamic'

import { useState, useCallback, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload,
  FileText,
  Sparkles,
  Loader2,
  CheckCircle2,
  XCircle,
  Zap,
  AlertCircle,
  MessageSquare,
  FolderKanban,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { AppSidebar } from '@/components/app-sidebar'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api-client'
import { toast } from 'sonner'
import { PromptTemplateSelector } from '@/components/ai/prompt-template-selector'

interface GeneratedStory {
  id: string
  title: string
  description: string
  acceptanceCriteria: string[]
  priority: 'low' | 'medium' | 'high' | 'urgent'
  storyPoints: number
}

type InputMode = 'document' | 'description'

const EXAMPLE_PROMPTS = [
  'Create a user authentication system with email/password login, OAuth (Google/GitHub), password reset, and 2FA support.',
  'Build an e-commerce checkout flow with cart management, payment integration (Stripe), order confirmation, and email receipts.',
  'Design a real-time chat feature with direct messages, group channels, file sharing, and read receipts.',
]

export default function AIGeneratePage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialProjectId = searchParams.get('projectId')

  const [projectId, setProjectId] = useState<string>(initialProjectId || '')
  const [projects, setProjects] = useState<any[]>([])
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [inputMode, setInputMode] = useState<InputMode>('description')
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [description, setDescription] = useState('')
  const [processing, setProcessing] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [creating, setCreating] = useState(false)
  const [generatedStories, setGeneratedStories] = useState<GeneratedStory[]>([])
  const [analysisResult, setAnalysisResult] = useState<any>(null)
  const [promptTemplate, setPromptTemplate] = useState<string>('standard')

  // Fetch projects on mount
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const { data } = await api.projects.list()
        setProjects(data)
        // If no project selected and projects exist, select the first one
        if (!projectId && data.length > 0) {
          setProjectId(data[0].id)
        }
      } catch (error) {
        console.error('Failed to fetch projects:', error)
        toast.error('Failed to load projects')
      } finally {
        setLoadingProjects(false)
      }
    }
    fetchProjects()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setUploadedFile(acceptedFiles[0])
      setGeneratedStories([])
      setAnalysisResult(null)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
    },
    maxFiles: 1,
  })

  const handleModeSwitch = (newMode: InputMode) => {
    if ((uploadedFile || description) && newMode !== inputMode) {
      if (!confirm('Switching modes will clear your current input. Continue?')) {
        return
      }
    }
    setInputMode(newMode)
    setUploadedFile(null)
    setDescription('')
    setGeneratedStories([])
    setAnalysisResult(null)
  }

  const handleAnalyze = async () => {
    const hasInput = inputMode === 'document' ? uploadedFile : description.trim().length >= 20

    if (!hasInput) {
      toast.error('Please provide requirements')
      return
    }

    if (!projectId) {
      toast.error('Please select a project first')
      return
    }

    setAnalyzing(true)

    try {
      if (inputMode === 'document' && uploadedFile) {
        // Analyze document
        const formData = new FormData()
        formData.append('file', uploadedFile)

        const response = await api.ai.analyzeDocument(formData)
        setAnalysisResult({
          summary: response.analysis.summary || 'Document analyzed successfully',
          keyPoints: response.analysis.requirements || [],
          suggestedEpics: response.analysis.suggestedEpics?.length || 0,
          estimatedStories: response.analysis.suggestedStories?.length || 0,
        })
        toast.success('Document analyzed successfully!')
      } else {
        // For text description, show a simpler analysis
        setAnalysisResult({
          summary: `Requirements description ready for AI processing (${description.length} characters)`,
          keyPoints: ['Requirements will be processed by AI', 'User stories will be generated', 'Acceptance criteria included'],
          suggestedEpics: 1,
          estimatedStories: Math.ceil(description.length / 50),
        })
        toast.success('Requirements analyzed!')
      }
    } catch (err: any) {
      console.error('Analysis error:', err)
      toast.error(err.message || 'Failed to analyze requirements')
    } finally {
      setAnalyzing(false)
    }
  }

  const handleGenerate = async () => {
    const hasInput = inputMode === 'document' ? uploadedFile : description.trim().length >= 20

    if (!hasInput) {
      toast.error('Please provide requirements')
      return
    }

    if (!projectId) {
      toast.error('Please select a project first')
      return
    }

    setProcessing(true)

    try {
      // Get requirements text
      let requirements = description
      if (inputMode === 'document' && uploadedFile) {
        // For documents, we assume it was already analyzed
        requirements = analysisResult?.summary || 'Document requirements'
      }

      // Generate stories using AI with selected template
      const response = await api.ai.generateStories({
        projectId,
        requirements,
        projectContext: `Project ID: ${projectId}`,
        promptTemplate: promptTemplate,
      })

      // Map AI response to our story format
      const stories: GeneratedStory[] = response.stories.map((story: any, index: number) => ({
        id: story.id || `gen-${index}`,
        title: story.title,
        description: story.description,
        acceptanceCriteria: story.acceptanceCriteria || [],
        priority: story.priority || 'medium',
        storyPoints: story.storyPoints || 3,
      }))

      setGeneratedStories(stories)
      toast.success(`Generated ${stories.length} user stories!`)
    } catch (err: any) {
      console.error('Generation error:', err)
      toast.error(err.message || 'Failed to generate stories')
    } finally {
      setProcessing(false)
    }
  }

  const handleCreateStories = async () => {
    if (!projectId) {
      toast.error('Project ID is required')
      return
    }

    if (generatedStories.length === 0) {
      toast.error('No stories to create')
      return
    }

    setCreating(true)

    try {
      const response = await api.ai.batchCreateStories({
        projectId,
        stories: generatedStories.map(story => ({
          title: story.title,
          description: story.description,
          acceptanceCriteria: story.acceptanceCriteria,
          priority: story.priority as 'low' | 'medium' | 'high' | 'critical',
          storyPoints: story.storyPoints,
        })),
      })

      if (response.errors && response.errors.length > 0) {
        toast.warning(`Created ${response.created.length} stories with ${response.errors.length} errors`)
      } else {
        toast.success(`Successfully created ${response.created.length} stories!`)
      }

      // Navigate to project after a short delay
      setTimeout(() => {
        router.push(`/projects/${projectId}`)
      }, 1500)
    } catch (err: any) {
      console.error('Create stories error:', err)
      toast.error(err.message || 'Failed to create stories')
    } finally {
      setCreating(false)
    }
  }

  const canAnalyze = inputMode === 'document' ? !!uploadedFile : description.trim().length >= 20

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <main className="flex-1 md:ml-64">
        <div className="bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 p-3 sm:p-4 md:p-6 lg:p-8">
          <div className="max-w-6xl mx-auto space-y-6 md:space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/50">
              <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            AI Story Generation
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-gray-400">
            Upload a document or describe your requirements to generate user stories
          </p>
        </div>

        {/* Project Selector */}
        <Card className="border-gray-700 bg-gray-800/50">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <FolderKanban className="h-5 w-5" />
              Select Project
            </CardTitle>
            <CardDescription className="text-gray-400">
              Choose which project you want to generate stories for
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingProjects ? (
              <div className="flex items-center gap-2 text-gray-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading projects...
              </div>
            ) : projects.length === 0 ? (
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <p className="text-yellow-400 text-sm">
                  ⚠️ No projects found. Please create a project first.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => router.push('/projects')}
                >
                  Go to Projects
                </Button>
              </div>
            ) : (
              <Select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="max-w-md"
              >
                <option value="">Select a project...</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </Select>
            )}
          </CardContent>
        </Card>

        {/* Mode Toggle */}
        <div className="flex justify-center">
          <div className="inline-flex rounded-lg bg-gray-800/50 p-1 border border-gray-700">
            <button
              onClick={() => handleModeSwitch('description')}
              className={cn(
                'px-6 py-2.5 rounded-md transition-all flex items-center gap-2',
                inputMode === 'description'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                  : 'text-gray-400 hover:text-gray-300'
              )}
            >
              <MessageSquare className="h-4 w-4" />
              Describe Requirements
            </button>
            <button
              onClick={() => handleModeSwitch('document')}
              className={cn(
                'px-6 py-2.5 rounded-md transition-all flex items-center gap-2',
                inputMode === 'document'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                  : 'text-gray-400 hover:text-gray-300'
              )}
            >
              <Upload className="h-4 w-4" />
              Upload Document
            </button>
          </div>
        </div>

        {/* Input Area */}
        {inputMode === 'description' ? (
          <Card className="border-gray-700 bg-gray-800/50">
            <CardHeader>
              <CardTitle className="text-white">Describe Your Requirements</CardTitle>
              <CardDescription className="text-gray-400">
                Provide a detailed description of the features you want to build (minimum 20 characters)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <PromptTemplateSelector
                value={promptTemplate}
                onChange={setPromptTemplate}
                disabled={processing || analyzing}
              />
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Example: Create a user authentication system with email/password login, OAuth (Google/GitHub), password reset, and 2FA support..."
                className="min-h-[200px] bg-gray-900/50 border-gray-700 text-white placeholder:text-gray-500 resize-none"
              />
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">{description.length} characters</span>
                {description.length > 0 && description.length < 20 && (
                  <span className="text-yellow-500">Need at least 20 characters</span>
                )}
              </div>

              {/* Example Prompts */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-400">Example prompts:</p>
                <div className="grid gap-2">
                  {EXAMPLE_PROMPTS.map((prompt, i) => (
                    <button
                      key={i}
                      onClick={() => setDescription(prompt)}
                      className="text-left p-3 rounded-lg bg-gray-900/50 border border-gray-700 hover:border-purple-500/50 transition-colors text-sm text-gray-400 hover:text-gray-300"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-2 border-dashed border-gray-700 hover:border-purple-500/50 transition-colors bg-gray-800/30">
            <CardContent className="p-12">
              <div
                {...getRootProps()}
                className={cn(
                  'flex flex-col items-center justify-center gap-4 cursor-pointer transition-all',
                  isDragActive && 'scale-105'
                )}
              >
                <input {...getInputProps()} />
                <div
                  className={cn(
                    'h-24 w-24 rounded-2xl flex items-center justify-center transition-all',
                    isDragActive
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 scale-110 shadow-lg shadow-purple-500/50'
                      : 'bg-gray-700/50'
                  )}
                >
                  <Upload
                    className={cn('h-12 w-12 transition-colors', isDragActive ? 'text-white' : 'text-gray-400')}
                  />
                </div>
                <div className="text-center">
                  <p className="text-lg font-medium text-white mb-1">
                    {isDragActive ? 'Drop your file here' : 'Drag & drop your requirements document'}
                  </p>
                  <p className="text-sm text-gray-400">Supports PDF, DOCX, TXT, and MD files</p>
                </div>
                <Button variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-700">
                  Browse Files
                </Button>
              </div>

              {/* Uploaded File */}
              {uploadedFile && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 p-4 rounded-lg bg-gray-900/50 border border-gray-700"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-purple-400" />
                      </div>
                      <div>
                        <p className="font-medium text-white">{uploadedFile.name}</p>
                        <p className="text-xs text-gray-400">{(uploadedFile.size / 1024).toFixed(0)} KB</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation()
                        setUploadedFile(null)
                      }}
                      className="text-gray-400 hover:text-white"
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        {!generatedStories.length && canAnalyze && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-4 justify-center">
            <Button size="lg" onClick={handleAnalyze} disabled={analyzing} variant="outline" className="border-gray-600">
              {analyzing ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 mr-2" />
                  Analyze Requirements
                </>
              )}
            </Button>
            <Button
              size="lg"
              onClick={handleGenerate}
              disabled={processing}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              {processing ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Generating Stories...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5 mr-2" />
                  Generate Stories
                </>
              )}
            </Button>
          </motion.div>
        )}

        {/* Analysis Result */}
        {analysisResult && !generatedStories.length && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-pink-500/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Zap className="h-5 w-5 text-purple-400" />
                  AI Analysis Complete
                </CardTitle>
                <CardDescription className="text-gray-300">{analysisResult.summary}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2 text-white">Key Points Identified:</h4>
                  <ul className="space-y-1">
                    {analysisResult.keyPoints.map((point: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex gap-4 pt-2">
                  <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                    {analysisResult.suggestedEpics} Epics Suggested
                  </Badge>
                  <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                    ~{analysisResult.estimatedStories} Stories Expected
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Generated Stories */}
        <AnimatePresence>
          {generatedStories.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">Generated Stories</h2>
                  <p className="text-gray-400">{generatedStories.length} user stories created by AI</p>
                </div>
                <Button
                  size="lg"
                  onClick={handleCreateStories}
                  disabled={creating || !projectId}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                >
                  {creating ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Creating Stories...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-5 w-5 mr-2" />
                      Create All Stories
                    </>
                  )}
                </Button>
              </div>

              <div className="grid gap-4">
                {generatedStories.map((story, i) => (
                  <motion.div
                    key={story.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <Card className="hover:shadow-2xl hover:shadow-purple-500/10 transition-all group border-gray-700 bg-gray-800/50">
                      <CardHeader>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <CardTitle className="group-hover:text-purple-400 transition-colors text-white">
                              {story.title}
                            </CardTitle>
                            <CardDescription className="mt-2 text-gray-300">{story.description}</CardDescription>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <Badge
                              variant="outline"
                              className={cn(
                                story.priority === 'high' || story.priority === 'urgent'
                                  ? 'border-orange-500/50 text-orange-400'
                                  : story.priority === 'medium'
                                  ? 'border-yellow-500/50 text-yellow-400'
                                  : 'border-blue-500/50 text-blue-400'
                              )}
                            >
                              {story.priority}
                            </Badge>
                            <Badge variant="outline" className="border-gray-600 text-gray-300">
                              {story.storyPoints} pts
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div>
                          <h4 className="font-medium text-sm mb-2 text-white">Acceptance Criteria:</h4>
                          <ul className="space-y-1">
                            {story.acceptanceCriteria.map((criteria, j) => (
                              <li key={j} className="flex items-start gap-2 text-sm text-gray-400">
                                <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                                <span>{criteria}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  )
}
