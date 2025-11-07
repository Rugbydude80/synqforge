'use client'

import { useState, useEffect } from 'react'
import { Upload, FileText, Loader2, Trash2 } from 'lucide-react'
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

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
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
  }

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

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
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
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB')
      return
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/markdown',
      'text/plain',
    ]

    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(pdf|docx|txt|md)$/i)) {
      toast.error('Please upload a PDF, DOCX, TXT, or MD file')
      return
    }

    setSelectedFile(file)
    
    // Auto-fill template name from filename if not set
    if (!templateName) {
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '')
      setTemplateName(nameWithoutExt)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile || !templateName.trim()) {
      toast.error('Please provide a template name and select a file')
      return
    }

    try {
      setUploading(true)

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

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload template')
      }

      toast.success('Template uploaded successfully!')
      setShowUploadDialog(false)
      setTemplateName('')
      setDescription('')
      setSelectedFile(null)
      fetchTemplates()
      onTemplateUploaded?.()
    } catch (error: any) {
      console.error('Error uploading template:', error)
      toast.error(error.message || 'Failed to upload template')
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
              Upload document templates to define custom story formats for AI generation
            </CardDescription>
          </div>
          <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
            <DialogTrigger asChild>
              <Button>
                <Upload className="h-4 w-4 mr-2" />
                Upload Template
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload Custom Template</DialogTitle>
                <DialogDescription>
                  Upload a document (PDF, DOCX, TXT, MD) that defines your story format
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
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowUploadDialog(false)}
                    disabled={uploading}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleUpload} disabled={uploading || !selectedFile || !templateName.trim()}>
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

