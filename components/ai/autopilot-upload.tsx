'use client'

import { useState, useCallback } from 'react'
import { Upload, FileText, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface AutopilotUploadProps {
  projectId: string
  onJobCreated?: (jobId: string) => void
  className?: string
}

export function AutopilotUpload({ projectId, onJobCreated, className }: AutopilotUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [jobId, setJobId] = useState<string | null>(null)
  const [requireReview, setRequireReview] = useState(true)

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    // Validate file size (2MB max)
    if (selectedFile.size > 2 * 1024 * 1024) {
      toast.error('File size must be less than 2MB')
      return
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/markdown',
      'text/plain',
    ]

    if (!allowedTypes.includes(selectedFile.type) && !selectedFile.name.endsWith('.md')) {
      toast.error('Please upload a PDF, DOCX, Markdown, or text file')
      return
    }

    setFile(selectedFile)
  }, [])

  const handleUpload = useCallback(async () => {
    if (!file) return

    try {
      setUploading(true)
      setProgress(10)

      // Read file content
      const content = await readFileContent(file)
      setProgress(30)

      // Create autopilot job
      const response = await fetch('/api/ai/autopilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          projectId,
          documentContent: content,
          documentName: file.name,
          mimeType: file.type,
          requireReview,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create autopilot job')
      }

      setProgress(100)
      setJobId(data.jobId)

      toast.success('Autopilot job created successfully!', {
        description: requireReview
          ? 'Results will be available for review once processing is complete.'
          : 'Stories will be created automatically once processing is complete.',
      })

      onJobCreated?.(data.jobId)
    } catch (error: any) {
      console.error('Error uploading document:', error)
      toast.error(error.message || 'Failed to upload document')
      setProgress(0)
    } finally {
      setUploading(false)
    }
  }, [file, projectId, requireReview, onJobCreated])

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = (e) => {
        const content = e.target?.result as string
        resolve(content)
      }

      reader.onerror = () => {
        reject(new Error('Failed to read file'))
      }

      reader.readAsText(file)
    })
  }

  const reset = () => {
    setFile(null)
    setProgress(0)
    setJobId(null)
    setUploading(false)
  }

  return (
    <Card className={cn('', className)}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-gradient-primary">
            <Upload className="h-5 w-5 text-white" />
          </div>
          <div>
            <CardTitle>Backlog Autopilot</CardTitle>
            <CardDescription>
              Upload a PRD or brief to automatically generate Epics, Stories, and Tasks
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!jobId ? (
          <>
            {/* File Upload */}
            <div
              className={cn(
                'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
                file
                  ? 'border-brand-purple-500 bg-brand-purple-500/5'
                  : 'border-border hover:border-brand-purple-500/50'
              )}
            >
              <input
                type="file"
                id="autopilot-upload"
                className="hidden"
                accept=".pdf,.docx,.md,.txt,text/plain,text/markdown,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleFileSelect}
                disabled={uploading}
              />

              {file ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-center gap-2">
                    <FileText className="h-8 w-8 text-brand-purple-500" />
                  </div>
                  <div>
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFile(null)}
                    disabled={uploading}
                  >
                    Change file
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-center">
                    <Upload className="h-12 w-12 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">Upload your PRD or brief</p>
                    <p className="text-sm text-muted-foreground">
                      PDF, DOCX, Markdown, or Text (max 2MB)
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => document.getElementById('autopilot-upload')?.click()}
                  >
                    Select File
                  </Button>
                </div>
              )}
            </div>

            {/* Options */}
            {file && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="require-review"
                    checked={requireReview}
                    onChange={(e) => setRequireReview(e.target.checked)}
                    className="rounded border-border"
                  />
                  <label htmlFor="require-review" className="text-sm cursor-pointer">
                    Require review before publishing (recommended)
                  </label>
                </div>

                {/* Progress */}
                {uploading && (
                  <div className="space-y-2">
                    <Progress value={progress} className="h-2" />
                    <p className="text-sm text-muted-foreground text-center">
                      Processing document... {progress}%
                    </p>
                  </div>
                )}

                {/* Action Button */}
                <Button
                  className="w-full"
                  onClick={handleUpload}
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Generate Backlog
                    </>
                  )}
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center space-y-4 py-4">
            <div className="flex items-center justify-center">
              <CheckCircle2 className="h-16 w-16 text-brand-emerald-500" />
            </div>
            <div>
              <p className="font-medium text-lg">Job Created Successfully!</p>
              <p className="text-sm text-muted-foreground mt-1">
                Your document is being processed. You can view the status in the Autopilot Jobs section.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Badge variant="outline">Job ID: {jobId}</Badge>
            </div>
            <Button variant="outline" onClick={reset}>
              Upload Another Document
            </Button>
          </div>
        )}

        {/* Info */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="font-medium">What happens next?</p>
              <ul className="text-muted-foreground space-y-1 list-disc list-inside">
                <li>AI analyses your document and generates structured backlog items</li>
                <li>Duplicate stories are detected and flagged for review</li>
                <li>Cross-story dependencies are automatically mapped</li>
                <li>Each story includes INVEST-compliant acceptance criteria</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
