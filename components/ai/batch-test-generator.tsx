'use client'

import { useState } from 'react'
import { FileCode, Loader2, CheckCircle2, Download, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'

type ArtefactType = 'gherkin' | 'postman' | 'playwright' | 'cypress'

interface Story {
  id: string
  title: string
  acceptanceCriteria: string[]
}

interface BatchTestGeneratorProps {
  story: Story
  className?: string
}

export function BatchTestGenerator({ story, className }: BatchTestGeneratorProps) {
  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<any[]>([])
  const [selectedTypes, setSelectedTypes] = useState<Set<ArtefactType>>(
    new Set(['gherkin', 'postman', 'playwright', 'cypress'])
  )

  const types: { type: ArtefactType; label: string; description: string }[] = [
    {
      type: 'gherkin',
      label: 'Gherkin',
      description: 'BDD feature files',
    },
    {
      type: 'postman',
      label: 'Postman',
      description: 'API test collections',
    },
    {
      type: 'playwright',
      label: 'Playwright',
      description: 'E2E test skeletons',
    },
    {
      type: 'cypress',
      label: 'Cypress',
      description: 'E2E test skeletons',
    },
  ]

  const toggleType = (type: ArtefactType) => {
    setSelectedTypes((prev) => {
      const next = new Set(prev)
      if (next.has(type)) {
        next.delete(type)
      } else {
        next.add(type)
      }
      return next
    })
  }

  const handleGenerateAll = async () => {
    if (selectedTypes.size === 0) {
      toast.error('Please select at least one artefact type')
      return
    }

    try {
      setGenerating(true)
      setProgress(0)
      setResults([])

      const response = await fetch('/api/ai/test-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          storyId: story.id,
          artefactTypes: Array.from(selectedTypes),
          options: {
            includeEdgeCases: true,
            includeErrorScenarios: true,
            baseUrl: 'http://localhost:3000',
            authentication: 'bearer',
            language: 'typescript',
          },
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate test artefacts')
      }

      setResults(data.results || [])
      setProgress(100)

      toast.success('All test artefacts generated!', {
        description: `Generated ${data.results.length} artefacts`,
      })
    } catch (error: any) {
      console.error('Error generating artefacts:', error)
      toast.error(error.message || 'Failed to generate test artefacts')
    } finally {
      setGenerating(false)
    }
  }

  const handleDownloadAll = () => {
    if (results.length === 0) return

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

    // Download each file with proper MIME type
    results.forEach((result) => {
      const mimeType = getMimeType(result.artefactType as ArtefactType)
      const blob = new Blob([result.content], { type: mimeType })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = result.fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    })

    toast.success('Download started', {
      description: `${results.length} files`,
    })
  }

  if (!story.acceptanceCriteria || story.acceptanceCriteria.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="text-center py-8">
          <FileCode className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            Story must have acceptance criteria to generate test artefacts
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-gradient-primary">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <CardTitle>Batch Test Generation</CardTitle>
            <CardDescription>
              Generate all test artefacts at once for this story
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Type Selection */}
        <div>
          <p className="text-sm font-medium mb-2">Select artefact types to generate:</p>
          <div className="grid grid-cols-2 gap-2">
            {types.map(({ type, label, description }) => {
              const isSelected = selectedTypes.has(type)
              return (
                <div
                  key={type}
                  onClick={() => toggleType(type)}
                  className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                    isSelected
                      ? 'border-brand-purple-500 bg-brand-purple-500/5'
                      : 'border-border hover:border-brand-purple-500/50'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="mt-0.5 rounded border-border"
                    />
                    <div>
                      <p className="font-medium text-sm">{label}</p>
                      <p className="text-xs text-muted-foreground">{description}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Generate Button */}
        <Button
          className="w-full"
          onClick={handleGenerateAll}
          disabled={generating || selectedTypes.size === 0}
        >
          {generating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating {selectedTypes.size} artefacts...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate {selectedTypes.size} Artefacts
            </>
          )}
        </Button>

        {/* Progress */}
        {generating && (
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-sm text-muted-foreground text-center">
              Generating test artefacts... This may take a moment.
            </p>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && !generating && (
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Generated Artefacts:</p>
              <Button variant="outline" size="sm" onClick={handleDownloadAll}>
                <Download className="h-4 w-4 mr-2" />
                Download All
              </Button>
            </div>

            <div className="space-y-2">
              {results.map((result, index) => (
                <div key={index} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-brand-emerald-500" />
                      <div>
                        <p className="font-medium text-sm">{result.fileName}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="outline" className="capitalize">
                            {result.artefactType}
                          </Badge>
                          <span>•</span>
                          <span>v{result.version}</span>
                          <span>•</span>
                          <span>{result.tokensUsed.toLocaleString()} tokens</span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        // Get proper MIME type based on artefact type
                        const getMimeType = (type: string): string => {
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

                        const mimeType = getMimeType(result.artefactType)
                        const blob = new Blob([result.content], { type: mimeType })
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.href = url
                        a.download = result.fileName
                        document.body.appendChild(a)
                        a.click()
                        document.body.removeChild(a)
                        URL.revokeObjectURL(url)
                      }}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Total Tokens */}
            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total tokens used:</span>
                <span className="font-medium">
                  {results.reduce((sum, r) => sum + r.tokensUsed, 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Info */}
        <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-2">
          <p className="font-medium">About Batch Generation:</p>
          <ul className="text-muted-foreground space-y-1 list-disc list-inside">
            <li>Generates all selected artefact types in parallel</li>
            <li>Uses the same acceptance criteria for all artefacts</li>
            <li>Includes edge cases and error scenarios by default</li>
            <li>Each artefact is versioned independently</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
