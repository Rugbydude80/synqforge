'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  FileCode,
  FileJson,
  FileText,
  Download,
  Trash2,
  Loader2,
  Settings,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type ArtefactType = 'gherkin' | 'postman' | 'playwright' | 'cypress'

interface GeneratedArtefact {
  id: string
  storyId: string
  artefactType: ArtefactType
  content: string
  fileName: string
  tokensUsed: number
  generatedAt: Date
  version: number
}

interface TestGeneratorPanelProps {
  storyId: string
  storyTitle: string
  hasAcceptanceCriteria: boolean
  onGenerate?: (artefact: GeneratedArtefact) => void
  className?: string
}

export function TestGeneratorPanel({
  storyId,
  storyTitle: _storyTitle,
  hasAcceptanceCriteria,
  onGenerate,
  className,
}: TestGeneratorPanelProps) {
  const [generating, setGenerating] = useState(false)
  const [artefacts, setArtefacts] = useState<GeneratedArtefact[]>([])
  const [loadingArtefacts, setLoadingArtefacts] = useState(true)
  const [selectedType, setSelectedType] = useState<ArtefactType>('gherkin')
  const [showOptions, setShowOptions] = useState(false)
  const [options, setOptions] = useState({
    includeEdgeCases: false,
    includeErrorScenarios: false,
    baseUrl: 'http://localhost:3000',
    authentication: 'bearer' as 'none' | 'bearer' | 'apikey' | 'oauth',
    language: 'typescript' as 'typescript' | 'javascript',
  })

  const fetchArtefacts = useCallback(async () => {
    try {
      setLoadingArtefacts(true)
      const response = await fetch(`/api/ai/test-generator?storyId=${storyId}`, {
        credentials: 'include',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch artefacts')
      }

      setArtefacts(data.artefacts || [])
    } catch (error: any) {
      console.error('Error fetching artefacts:', error)
    } finally {
      setLoadingArtefacts(false)
    }
  }, [storyId])

  useEffect(() => {
    if (hasAcceptanceCriteria) {
      fetchArtefacts()
    }
  }, [hasAcceptanceCriteria, fetchArtefacts])

  const handleGenerate = async (type: ArtefactType) => {
    try {
      setGenerating(true)
      setSelectedType(type)

      const response = await fetch('/api/ai/test-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          storyId,
          artefactType: type,
          options,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate test artefact')
      }

      toast.success(`${getTypeLabel(type)} generated successfully!`, {
        description: `${data.fileName} (v${data.version})`,
      })

      onGenerate?.(data)
      fetchArtefacts()
    } catch (error: any) {
      console.error('Error generating artefact:', error)
      toast.error(error.message || 'Failed to generate test artefact')
    } finally {
      setGenerating(false)
    }
  }

  const handleDelete = async (artefactId: string) => {
    if (!confirm('Are you sure you want to delete this artefact?')) {
      return
    }

    try {
      const response = await fetch(`/api/ai/test-generator/${artefactId}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete artefact')
      }

      toast.success('Artefact deleted')
      fetchArtefacts()
    } catch (error: any) {
      console.error('Error deleting artefact:', error)
      toast.error(error.message || 'Failed to delete artefact')
    }
  }

  const handleDownload = (artefact: GeneratedArtefact) => {
    // Get proper MIME type based on artefact type
    const getMimeType = (type: ArtefactType): string => {
      switch (type) {
        case 'gherkin':
          return 'text/plain;charset=utf-8'
        case 'postman':
          return 'application/json;charset=utf-8'
        case 'playwright':
        case 'cypress':
          return 'text/plain;charset=utf-8'
        default:
          return 'text/plain;charset=utf-8'
      }
    }

    const mimeType = getMimeType(artefact.artefactType)
    const blob = new Blob([artefact.content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = artefact.fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast.success('Download started', {
      description: artefact.fileName,
    })
  }

  const getTypeIcon = (type: ArtefactType) => {
    switch (type) {
      case 'gherkin':
        return <FileText className="h-4 w-4" />
      case 'postman':
        return <FileJson className="h-4 w-4" />
      case 'playwright':
      case 'cypress':
        return <FileCode className="h-4 w-4" />
    }
  }

  const getTypeLabel = (type: ArtefactType) => {
    switch (type) {
      case 'gherkin':
        return 'Gherkin Feature'
      case 'postman':
        return 'Postman Collection'
      case 'playwright':
        return 'Playwright Test'
      case 'cypress':
        return 'Cypress Test'
    }
  }

  const getTypeColor = (type: ArtefactType) => {
    switch (type) {
      case 'gherkin':
        return 'text-green-500'
      case 'postman':
        return 'text-orange-500'
      case 'playwright':
        return 'text-red-500'
      case 'cypress':
        return 'text-teal-500'
    }
  }

  if (!hasAcceptanceCriteria) {
    return (
      <Card className={className}>
        <CardContent className="text-center py-8">
          <FileCode className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            Add acceptance criteria to generate test artefacts
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-primary">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle>Test Generator</CardTitle>
              <CardDescription>
                Generate test artefacts from acceptance criteria
              </CardDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowOptions(!showOptions)}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Options Panel */}
        {showOptions && (
          <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
            <p className="text-sm font-medium">Generation Options</p>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={options.includeEdgeCases}
                  onChange={(e) =>
                    setOptions({ ...options, includeEdgeCases: e.target.checked })
                  }
                  className="rounded border-border"
                />
                Include edge case scenarios
              </label>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={options.includeErrorScenarios}
                  onChange={(e) =>
                    setOptions({ ...options, includeErrorScenarios: e.target.checked })
                  }
                  className="rounded border-border"
                />
                Include error scenarios
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Base URL</label>
                <input
                  type="text"
                  value={options.baseUrl}
                  onChange={(e) => setOptions({ ...options, baseUrl: e.target.value })}
                  className="w-full mt-1 text-sm border rounded px-2 py-1"
                  placeholder="http://localhost:3000"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Authentication</label>
                <select
                  value={options.authentication}
                  onChange={(e) =>
                    setOptions({
                      ...options,
                      authentication: e.target.value as any,
                    })
                  }
                  className="w-full mt-1 text-sm border rounded px-2 py-1"
                >
                  <option value="none">None</option>
                  <option value="bearer">Bearer Token</option>
                  <option value="apikey">API Key</option>
                  <option value="oauth">OAuth 2.0</option>
                </select>
              </div>

              <div className="col-span-2">
                <label className="text-xs text-muted-foreground">Language</label>
                <select
                  value={options.language}
                  onChange={(e) =>
                    setOptions({
                      ...options,
                      language: e.target.value as 'typescript' | 'javascript',
                    })
                  }
                  className="w-full mt-1 text-sm border rounded px-2 py-1"
                >
                  <option value="typescript">TypeScript</option>
                  <option value="javascript">JavaScript</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Generate Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            onClick={() => handleGenerate('gherkin')}
            disabled={generating}
            className="justify-start"
          >
            {generating && selectedType === 'gherkin' ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FileText className="h-4 w-4 mr-2 text-green-500" />
            )}
            Gherkin
          </Button>

          <Button
            variant="outline"
            onClick={() => handleGenerate('postman')}
            disabled={generating}
            className="justify-start"
          >
            {generating && selectedType === 'postman' ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FileJson className="h-4 w-4 mr-2 text-orange-500" />
            )}
            Postman
          </Button>

          <Button
            variant="outline"
            onClick={() => handleGenerate('playwright')}
            disabled={generating}
            className="justify-start"
          >
            {generating && selectedType === 'playwright' ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FileCode className="h-4 w-4 mr-2 text-red-500" />
            )}
            Playwright
          </Button>

          <Button
            variant="outline"
            onClick={() => handleGenerate('cypress')}
            disabled={generating}
            className="justify-start"
          >
            {generating && selectedType === 'cypress' ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FileCode className="h-4 w-4 mr-2 text-teal-500" />
            )}
            Cypress
          </Button>
        </div>

        {/* Generated Artefacts */}
        {loadingArtefacts ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : artefacts.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">Generated Artefacts:</p>
            {artefacts.map((artefact) => (
              <div
                key={artefact.id}
                className="border rounded-lg p-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={cn('shrink-0', getTypeColor(artefact.artefactType))}>
                    {getTypeIcon(artefact.artefactType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {artefact.fileName}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>v{artefact.version}</span>
                      <span>•</span>
                      <span>{new Date(artefact.generatedAt).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>{artefact.tokensUsed.toLocaleString()} tokens</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDownload(artefact)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(artefact.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <FileCode className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">
              No test artefacts generated yet
            </p>
          </div>
        )}

        {/* Info */}
        <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-2">
          <p className="font-medium">What gets generated:</p>
          <ul className="text-muted-foreground space-y-1 list-disc list-inside">
            <li><strong>Gherkin:</strong> BDD feature files with Given-When-Then scenarios</li>
            <li><strong>Postman:</strong> API test collections with requests and assertions</li>
            <li><strong>Playwright:</strong> E2E test skeletons with modern best practices</li>
            <li><strong>Cypress:</strong> E2E test skeletons with Cypress commands</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
