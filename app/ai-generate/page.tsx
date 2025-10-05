'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
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
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface GeneratedStory {
  id: string
  title: string
  description: string
  acceptanceCriteria: string[]
  priority: 'low' | 'medium' | 'high' | 'urgent'
  storyPoints: number
}

export default function AIGeneratePage() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [processing, setProcessing] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [generatedStories, setGeneratedStories] = useState<GeneratedStory[]>([])
  const [analysisResult, setAnalysisResult] = useState<any>(null)

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

  const handleAnalyze = async () => {
    if (!uploadedFile) return

    setAnalyzing(true)
    // Simulate AI analysis
    setTimeout(() => {
      setAnalysisResult({
        summary: 'This document outlines requirements for a comprehensive user management system with authentication, role-based access control, and team organization features.',
        keyPoints: [
          'User authentication with email and OAuth',
          'Role-based access control (Admin, Member, Viewer)',
          'Team organization and management',
          'Activity tracking and audit logs',
          'User search and filtering',
        ],
        suggestedEpics: 3,
        estimatedStories: 12,
      })
      setAnalyzing(false)
    }, 2000)
  }

  const handleGenerate = async () => {
    if (!uploadedFile) return

    setProcessing(true)
    // Simulate story generation
    setTimeout(() => {
      const mockStories: GeneratedStory[] = [
        {
          id: '1',
          title: 'User Email and Password Authentication',
          description: 'As a user, I want to log in with my email and password so that I can securely access my account',
          acceptanceCriteria: [
            'User can enter email and password',
            'System validates credentials',
            'Invalid credentials show error',
            'Successful login redirects to dashboard',
          ],
          priority: 'high',
          storyPoints: 5,
        },
        {
          id: '2',
          title: 'Google OAuth Integration',
          description: 'As a user, I want to sign in with Google so that I can quickly access without creating a new password',
          acceptanceCriteria: [
            'Google sign-in button is visible',
            'OAuth flow opens in popup',
            'Account is created/linked automatically',
            'User is redirected after auth',
          ],
          priority: 'high',
          storyPoints: 8,
        },
        {
          id: '3',
          title: 'Role-Based Access Control',
          description: 'As an admin, I want to assign roles to users so that I can control their permissions',
          acceptanceCriteria: [
            'Admin can view all users',
            'Admin can assign roles (Admin/Member/Viewer)',
            'Permissions are enforced on all endpoints',
            'Role changes take effect immediately',
          ],
          priority: 'high',
          storyPoints: 13,
        },
        {
          id: '4',
          title: 'Team Organization Management',
          description: 'As an admin, I want to organize users into teams so that I can manage permissions at team level',
          acceptanceCriteria: [
            'Admin can create teams',
            'Users can be added to multiple teams',
            'Team permissions override individual permissions',
            'Team list is searchable',
          ],
          priority: 'medium',
          storyPoints: 8,
        },
        {
          id: '5',
          title: 'User Activity Audit Log',
          description: 'As an admin, I want to see user activity logs so that I can track actions for compliance',
          acceptanceCriteria: [
            'All user actions are logged',
            'Logs include timestamp and user',
            'Logs are searchable and filterable',
            'Logs can be exported as CSV',
          ],
          priority: 'medium',
          storyPoints: 5,
        },
      ]
      setGeneratedStories(mockStories)
      setProcessing(false)
    }, 3000)
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow-purple">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold gradient-text">AI Story Generation</h1>
          <p className="text-muted-foreground text-lg">
            Upload your requirements document and let AI generate user stories instantly
          </p>
        </div>

        {/* Upload Area */}
        <Card className="border-2 border-dashed border-border hover:border-primary transition-colors">
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
                    ? 'bg-gradient-primary scale-110 shadow-glow-purple'
                    : 'bg-accent'
                )}
              >
                <Upload
                  className={cn(
                    'h-12 w-12 transition-colors',
                    isDragActive ? 'text-white' : 'text-muted-foreground'
                  )}
                />
              </div>
              <div className="text-center">
                <p className="text-lg font-medium mb-1">
                  {isDragActive ? 'Drop your file here' : 'Drag & drop your requirements document'}
                </p>
                <p className="text-sm text-muted-foreground">
                  Supports PDF, DOCX, TXT, and MD files
                </p>
              </div>
              <Button variant="outline">Browse Files</Button>
            </div>

            {/* Uploaded File */}
            {uploadedFile && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 p-4 rounded-lg bg-accent border border-border"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-brand-purple-500/10 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-brand-purple-400" />
                    </div>
                    <div>
                      <p className="font-medium">{uploadedFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(uploadedFile.size / 1024).toFixed(0)} KB
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setUploadedFile(null)}
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        {uploadedFile && !generatedStories.length && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-4 justify-center"
          >
            <Button
              size="lg"
              onClick={handleAnalyze}
              disabled={analyzing}
              variant="outline"
            >
              {analyzing ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 mr-2" />
                  Analyze Document
                </>
              )}
            </Button>
            <Button
              size="lg"
              onClick={handleGenerate}
              disabled={processing}
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
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="gradient-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-brand-purple-400" />
                  AI Analysis Complete
                </CardTitle>
                <CardDescription>{analysisResult.summary}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Key Points Identified:</h4>
                  <ul className="space-y-1">
                    {analysisResult.keyPoints.map((point: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-brand-emerald-400 mt-0.5 shrink-0" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex gap-4 pt-2">
                  <Badge variant="purple">
                    {analysisResult.suggestedEpics} Epics Suggested
                  </Badge>
                  <Badge variant="emerald">
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
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Generated Stories</h2>
                  <p className="text-muted-foreground">
                    {generatedStories.length} user stories created by AI
                  </p>
                </div>
                <Button size="lg">
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                  Create All Stories
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
                    <Card className="hover:shadow-2xl transition-all group">
                      <CardHeader>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <CardTitle className="group-hover:text-brand-purple-400 transition-colors">
                              {story.title}
                            </CardTitle>
                            <CardDescription className="mt-2">
                              {story.description}
                            </CardDescription>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <Badge variant="outline" className={
                              story.priority === 'high' ? 'border-orange-500/50 text-orange-400' :
                              story.priority === 'medium' ? 'border-yellow-500/50 text-yellow-400' :
                              'border-blue-500/50 text-blue-400'
                            }>
                              {story.priority}
                            </Badge>
                            <Badge variant="outline">
                              {story.storyPoints} pts
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div>
                          <h4 className="font-medium text-sm mb-2">Acceptance Criteria:</h4>
                          <ul className="space-y-1">
                            {story.acceptanceCriteria.map((criteria, j) => (
                              <li key={j} className="flex items-start gap-2 text-sm text-muted-foreground">
                                <CheckCircle2 className="h-4 w-4 text-brand-emerald-400 mt-0.5 shrink-0" />
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
  )
}
