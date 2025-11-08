'use client'

import { useState, useEffect, useCallback } from 'react'
import { Upload, FileText, Loader2, Trash2, Download, CheckCircle2, XCircle, AlertCircle, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface CustomTemplate {
  id: string
  templateName: string
  description?: string
  fileName: string
  fileType: string
  fileSize: number
  usageCount: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface CustomTemplateSelectorProps {
  value?: string
  onChange: (value: string | undefined) => void
  disabled?: boolean
  className?: string
}

/**
 * Component for selecting custom document templates
 */
export function CustomTemplateSelector({
  value,
  onChange,
  disabled = false,
  className = '',
}: CustomTemplateSelectorProps) {
  const [templates, setTemplates] = useState<CustomTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/custom-templates')
      
      if (!response.ok) {
        if (response.status === 403) {
          const data = await response.json()
          setError(data.error || 'Custom templates require Pro, Team, or Enterprise plan')
          return
        }
        throw new Error('Failed to fetch templates')
      }

      const data = await response.json()
      setTemplates(data.templates || [])
      
      // Set default value if not provided and templates exist
      if (!value && data.templates.length > 0) {
        onChange(data.templates[0].id)
      }
    } catch (err) {
      console.error('Error fetching custom templates:', err)
      setError('Failed to load custom templates')
    } finally {
      setLoading(false)
    }
  }, [value, onChange])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  if (error) {
    return (
      <div className={cn('text-sm text-destructive', className)}>
        {error}
      </div>
    )
  }

  if (loading) {
    return (
      <div className={cn('space-y-2', className)}>
        <Label>Custom Document Template (Optional)</Label>
        <div className="h-10 bg-muted animate-pulse rounded-md" />
      </div>
    )
  }

  if (templates.length === 0) {
    return (
      <div className={cn('space-y-2', className)}>
        <Label>Custom Document Template (Optional)</Label>
        <div className="text-sm text-muted-foreground">
          No custom templates available. Upload a template document to get started.
        </div>
      </div>
    )
  }

  return (
    <div className={cn('space-y-2', className)}>
      <Label>Custom Document Template (Optional)</Label>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value || undefined)}
        disabled={disabled}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <option value="">None (use default format)</option>
        {templates.map((template) => (
          <option key={template.id} value={template.id}>
            {template.templateName} ({template.fileName})
          </option>
        ))}
      </select>
      {value && (
        <div className="text-xs text-muted-foreground">
          Selected template will override default story format
        </div>
      )}
    </div>
  )
}

interface CustomTemplateManagerProps {
  onTemplateUploaded?: () => void
}

/**
 * Component for managing custom document templates
 */
export function CustomTemplateManager({ onTemplateUploaded }: CustomTemplateManagerProps) {
  const [templates, setTemplates] = useState<CustomTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [validationWarnings, setValidationWarnings] = useState<string[]>([])
  const [isValidating, setIsValidating] = useState(false)
  const [previewData, setPreviewData] = useState<{
    sections: string[]
    format: any
    content: string
  } | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/custom-templates')
      
      if (!response.ok) {
        if (response.status === 403) {
          toast.error('Custom templates require Pro, Team, or Enterprise plan')
          return
        }
        throw new Error('Failed to fetch templates')
      }

      const data = await response.json()
      setTemplates(data.templates || [])
    } catch (err) {
      console.error('Error fetching templates:', err)
      toast.error('Failed to load templates')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Reset validation state and preview
    setValidationErrors([])
    setValidationWarnings([])
    setIsValidating(true)
    setPreviewData(null)
    setShowPreview(false)

    const errors: string[] = []
    const warnings: string[] = []

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      errors.push('File size exceeds 10MB limit')
    } else if (file.size > 5 * 1024 * 1024) {
      warnings.push('Large file size may take longer to process')
    }

    // Validate file type by extension
    const allowedExtensions = ['.pdf', '.docx', '.txt', '.md']
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!allowedExtensions.includes(fileExtension)) {
      errors.push('Invalid file type. Allowed: PDF, DOCX, TXT, MD')
    }

    // Validate file type by MIME type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/markdown',
      'text/plain',
    ]

    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(pdf|docx|txt|md)$/i)) {
      errors.push('File type mismatch. Please ensure file extension matches content type')
    }

    // Validate file name
    if (file.name.length > 255) {
      errors.push('File name too long (max 255 characters)')
    }

    // Check for suspicious file names
    if (file.name.match(/[<>:"|?*\x00-\x1f]/)) {
      errors.push('File name contains invalid characters')
    }

    setValidationErrors(errors)
    setValidationWarnings(warnings)
    setIsValidating(false)

    if (errors.length > 0) {
      toast.error(`Validation failed: ${errors[0]}`)
      return
    }

    setSelectedFile(file)
    
    // Auto-fill template name from filename if not set
    if (!templateName) {
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '')
      setTemplateName(nameWithoutExt)
    }

    if (warnings.length > 0) {
      toast.warning(warnings[0])
    }
  }

  const handlePreview = async () => {
    if (!selectedFile) {
      toast.error('Please select a file first')
      return
    }

    if (validationErrors.length > 0) {
      toast.error('Please fix validation errors before previewing')
      return
    }

    try {
      setPreviewLoading(true)
      setShowPreview(true)

      // Create FormData for preview
      const formData = new FormData()
      formData.append('file', selectedFile)

      const response = await fetch('/api/custom-templates/preview', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to preview template')
      }

      setPreviewData(data)
    } catch (error: any) {
      console.error('Error previewing template:', error)
      toast.error(error.message || 'Failed to preview template')
      setShowPreview(false)
    } finally {
      setPreviewLoading(false)
    }
  }

  const handleDownloadStarter = async () => {
    try {
      const response = await fetch('/api/custom-templates/download-starter')
      if (!response.ok) {
        throw new Error('Failed to download starter template')
      }
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'synqforge-starter-template.docx'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success('Starter template downloaded successfully!')
    } catch (error: any) {
      console.error('Error downloading starter template:', error)
      toast.error(error.message || 'Failed to download starter template')
    }
  }

  const handleUpload = async () => {
    if (!selectedFile || !templateName.trim()) {
      toast.error('Please provide a template name and select a file')
      return
    }

    if (validationErrors.length > 0) {
      toast.error('Please fix validation errors before uploading')
      return
    }

    try {
      setUploading(true)
      setUploadProgress(0)

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return prev
          }
          return prev + 10
        })
      }, 200)

      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('templateName', templateName.trim())
      if (description.trim()) {
        formData.append('description', description.trim())
      }

      const response = await fetch('/api/custom-templates', {
        method: 'POST',
        body: formData,
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      const data = await response.json()

      if (!response.ok) {
        // Enhanced error handling
        if (data.details) {
          setValidationErrors(Array.isArray(data.details) ? data.details : [data.details])
        }
        throw new Error(data.error || 'Failed to upload template')
      }

      toast.success('Template uploaded successfully!')
      setShowUploadDialog(false)
      setTemplateName('')
      setDescription('')
      setSelectedFile(null)
      setValidationErrors([])
      setValidationWarnings([])
      setUploadProgress(0)
      setPreviewData(null)
      setShowPreview(false)
      fetchTemplates()
      onTemplateUploaded?.()
    } catch (error: any) {
      console.error('Error uploading template:', error)
      toast.error(error.message || 'Failed to upload template')
      setUploadProgress(0)
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) {
      return
    }

    try {
      const response = await fetch(`/api/custom-templates/${templateId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete template')
      }

      toast.success('Template deleted successfully')
      fetchTemplates()
    } catch (error: any) {
      console.error('Error deleting template:', error)
      toast.error(error.message || 'Failed to delete template')
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Custom Document Templates</CardTitle>
          <CardDescription>Upload templates to define custom story formats</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-32 bg-muted animate-pulse rounded-md" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Custom Document Templates</CardTitle>
            <CardDescription>
              Upload document templates to define custom story formats for AI generation.
              When a template is selected, all generated stories will follow its structure.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleDownloadStarter}
              className="border-purple-200 text-purple-700 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-300 dark:hover:bg-purple-900/20"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Starter Template
            </Button>
            <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Template
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Upload Custom Template</DialogTitle>
                <DialogDescription>
                  Upload a document (PDF, DOCX, TXT, MD) that defines your story format.
                  <a 
                    href="https://github.com/Rugbydude80/synqforge/blob/main/docs/CUSTOM_TEMPLATE_UPLOAD_GUIDE.md" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="ml-2 text-primary hover:underline font-medium"
                  >
                    View upload guide →
                  </a>
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="template-name">Template Name *</Label>
                  <Input
                    id="template-name"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="e.g., Enterprise Story Format"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of this template..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="file">Template Document *</Label>
                  <Input
                    id="file"
                    type="file"
                    accept=".pdf,.docx,.txt,.md"
                    onChange={handleFileSelect}
                  />
                  {selectedFile && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <FileText className="h-4 w-4" />
                        {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                      </div>
                      {isValidating && (
                        <div className="flex items-center gap-2 text-sm text-blue-600">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Validating file...
                        </div>
                      )}
                      {validationErrors.length > 0 && (
                        <div className="space-y-1">
                          {validationErrors.map((error, idx) => (
                            <div key={idx} className="flex items-start gap-2 text-sm text-destructive">
                              <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                              <span>{error}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {validationWarnings.length > 0 && (
                        <div className="space-y-1">
                          {validationWarnings.map((warning, idx) => (
                            <div key={idx} className="flex items-start gap-2 text-sm text-yellow-600 dark:text-yellow-400">
                              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                              <span>{warning}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {!isValidating && validationErrors.length === 0 && selectedFile && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                            <CheckCircle2 className="h-4 w-4" />
                            File validation passed
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handlePreview}
                            disabled={previewLoading}
                            className="w-full"
                          >
                            {previewLoading ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Generating preview...
                              </>
                            ) : (
                              <>
                                <Eye className="h-4 w-4 mr-2" />
                                Preview Template Structure
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                  {showPreview && previewData && (
                    <div className="mt-4 p-4 border rounded-lg bg-muted/50 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-sm">Template Preview</h4>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowPreview(false)}
                          className="h-6 px-2"
                        >
                          ×
                        </Button>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="font-medium text-muted-foreground">Detected Sections:</span>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {previewData.sections && previewData.sections.length > 0 ? (
                              previewData.sections.map((section, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {section}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-muted-foreground text-xs">No sections detected</span>
                            )}
                          </div>
                        </div>
                        {previewData.format && (
                          <>
                            {previewData.format.titleFormat && (
                              <div>
                                <span className="font-medium text-muted-foreground">Title Format:</span>
                                <p className="text-xs mt-1 font-mono bg-background p-2 rounded border">
                                  {previewData.format.titleFormat}
                                </p>
                              </div>
                            )}
                            {previewData.format.acceptanceCriteriaFormat && (
                              <div>
                                <span className="font-medium text-muted-foreground">Acceptance Criteria Format:</span>
                                <p className="text-xs mt-1 font-mono bg-background p-2 rounded border">
                                  {previewData.format.acceptanceCriteriaFormat}
                                </p>
                              </div>
                            )}
                            {previewData.format.priorityFormat && previewData.format.priorityFormat.length > 0 && (
                              <div>
                                <span className="font-medium text-muted-foreground">Priority Options:</span>
                                <div className="flex flex-wrap gap-2 mt-1">
                                  {previewData.format.priorityFormat.map((priority: string, idx: number) => (
                                    <Badge key={idx} variant="outline" className="text-xs">
                                      {priority}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            {previewData.format.style && (
                              <div>
                                <span className="font-medium text-muted-foreground">Style:</span>
                                <div className="flex gap-4 mt-1 text-xs">
                                  {previewData.format.style.language && (
                                    <span>Language: {previewData.format.style.language}</span>
                                  )}
                                  {previewData.format.style.tone && (
                                    <span>Tone: {previewData.format.style.tone}</span>
                                  )}
                                </div>
                              </div>
                            )}
                          </>
                        )}
                        {previewData.content && (
                          <div>
                            <span className="font-medium text-muted-foreground">Content Preview:</span>
                            <div className="mt-1 max-h-32 overflow-y-auto text-xs bg-background p-2 rounded border font-mono whitespace-pre-wrap">
                              {previewData.content.substring(0, 500)}
                              {previewData.content.length > 500 && '...'}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {uploadProgress > 0 && uploadProgress < 100 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Uploading...</span>
                        <span className="text-muted-foreground">{uploadProgress}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>📋 <strong>Required sections:</strong> Title, Description, or Acceptance Criteria</p>
                    <p>✅ <strong>Best practices:</strong> Use clear section headers, include examples, specify format (Given/When/Then)</p>
                    <p>⚠️ <strong>Constraints:</strong> Max 10MB, professional content only, clear structure required</p>
                    <p>💡 <strong>Tip:</strong> Download the starter template to see the expected format</p>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowUploadDialog(false)}
                    disabled={uploading}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleUpload} 
                    disabled={uploading || !selectedFile || !templateName.trim() || validationErrors.length > 0 || isValidating}
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {templates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No custom templates uploaded yet</p>
            <p className="text-sm">Upload a document template to get started</p>
          </div>
        ) : (
          <div className="space-y-4">
            {templates.map((template) => (
              <div
                key={template.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{template.templateName}</h3>
                    {!template.isActive && (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </div>
                  {template.description && (
                    <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span>{template.fileName}</span>
                    <span>{(template.fileSize / 1024).toFixed(1)} KB</span>
                    <span>Used {template.usageCount} times</span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(template.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

