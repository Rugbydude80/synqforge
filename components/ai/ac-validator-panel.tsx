'use client'

import { useState } from 'react'
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  Loader2,
  Sparkles,
  Wand2,
  History,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface ValidationIssue {
  ruleId: string
  ruleName: string
  severity: 'error' | 'warning' | 'info'
  message: string
  acceptanceCriterionIndex: number
  originalText: string
  suggestedFix?: string
  autoFixable: boolean
}

interface ValidationResult {
  validationId: string
  storyId: string
  storyTitle: string
  overallStatus: 'pass' | 'fail' | 'warning'
  totalIssues: number
  errors: number
  warnings: number
  infos: number
  issues: ValidationIssue[]
  tokensUsed: number
  validatedAt: Date
}

interface ACValidatorPanelProps {
  storyId: string
  acceptanceCriteria: string[]
  onValidationComplete?: (result: ValidationResult) => void
  onAutoFixApplied?: () => void
  className?: string
}

export function ACValidatorPanel({
  storyId,
  acceptanceCriteria,
  onValidationComplete,
  onAutoFixApplied,
  className,
}: ACValidatorPanelProps) {
  const [validating, setValidating] = useState(false)
  const [result, setResult] = useState<ValidationResult | null>(null)
  const [showHistory, setShowHistory] = useState(false)

  const handleValidate = async (autoFix: boolean = false) => {
    try {
      setValidating(true)

      const response = await fetch('/api/ai/ac-validator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          storyId,
          autoFix,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to validate acceptance criteria')
      }

      setResult(data)
      onValidationComplete?.(data)

      if (autoFix && data.issues.some((i: ValidationIssue) => i.autoFixable)) {
        toast.success('Auto-fix applied successfully!', {
          description: `Fixed ${data.issues.filter((i: ValidationIssue) => i.autoFixable).length} issues`,
        })
        onAutoFixApplied?.()
      } else if (data.overallStatus === 'pass') {
        toast.success('Validation passed!', {
          description: 'All acceptance criteria meet quality standards',
        })
      } else {
        toast.info('Validation complete', {
          description: `Found ${data.totalIssues} issue${data.totalIssues !== 1 ? 's' : ''}`,
        })
      }
    } catch (error: any) {
      console.error('Error validating AC:', error)
      toast.error(error.message || 'Failed to validate acceptance criteria')
    } finally {
      setValidating(false)
    }
  }

  const getSeverityIcon = (severity: 'error' | 'warning' | 'info') => {
    switch (severity) {
      case 'error':
        return <XCircle className="h-4 w-4 text-destructive" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />
    }
  }

  const getSeverityBadge = (severity: 'error' | 'warning' | 'info') => {
    const variants = {
      error: 'destructive',
      warning: 'outline',
      info: 'secondary',
    } as const

    return (
      <Badge variant={variants[severity]} className="capitalize">
        {severity}
      </Badge>
    )
  }

  const getStatusIcon = (status: 'pass' | 'fail' | 'warning') => {
    switch (status) {
      case 'pass':
        return <CheckCircle2 className="h-6 w-6 text-brand-emerald-500" />
      case 'fail':
        return <XCircle className="h-6 w-6 text-destructive" />
      case 'warning':
        return <AlertTriangle className="h-6 w-6 text-orange-500" />
    }
  }

  if (acceptanceCriteria.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="text-center py-8">
          <AlertTriangle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
          <p className="text-muted-foreground">
            No acceptance criteria to validate
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Add acceptance criteria to your story first
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
              <CardTitle>AC Validator</CardTitle>
              <CardDescription>
                Check acceptance criteria against quality standards
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
            >
              <History className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => handleValidate(false)}
            disabled={validating}
            className="flex-1"
          >
            {validating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Validating...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Validate
              </>
            )}
          </Button>
          <Button
            onClick={() => handleValidate(true)}
            disabled={validating}
            className="flex-1"
          >
            {validating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Wand2 className="h-4 w-4 mr-2" />
                Validate & Auto-Fix
              </>
            )}
          </Button>
        </div>

        {/* Validation Result */}
        {result && (
          <div className="space-y-4 pt-4 border-t">
            {/* Status Summary */}
            <div
              className={cn(
                'rounded-lg p-4',
                result.overallStatus === 'pass' && 'bg-brand-emerald-500/10 border border-brand-emerald-500/20',
                result.overallStatus === 'fail' && 'bg-destructive/10 border border-destructive/20',
                result.overallStatus === 'warning' && 'bg-orange-500/10 border border-orange-500/20'
              )}
            >
              <div className="flex items-center gap-3">
                {getStatusIcon(result.overallStatus)}
                <div className="flex-1">
                  <p className="font-medium">
                    {result.overallStatus === 'pass' && 'Validation Passed'}
                    {result.overallStatus === 'fail' && 'Validation Failed'}
                    {result.overallStatus === 'warning' && 'Validation Warnings'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {result.totalIssues === 0
                      ? 'All acceptance criteria meet quality standards'
                      : `Found ${result.totalIssues} issue${result.totalIssues !== 1 ? 's' : ''}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {result.errors > 0 && (
                    <Badge variant="destructive">{result.errors} Errors</Badge>
                  )}
                  {result.warnings > 0 && (
                    <Badge variant="outline" className="text-orange-500">
                      {result.warnings} Warnings
                    </Badge>
                  )}
                  {result.infos > 0 && (
                    <Badge variant="secondary">{result.infos} Info</Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Issues List */}
            {result.issues.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium">Issues Found:</p>
                {result.issues.map((issue, index) => (
                  <div
                    key={index}
                    className="border rounded-lg p-3 space-y-2"
                  >
                    {/* Issue Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2">
                        {getSeverityIcon(issue.severity)}
                        <div>
                          <p className="font-medium text-sm">{issue.ruleName}</p>
                          {getSeverityBadge(issue.severity)}
                        </div>
                      </div>
                      {issue.autoFixable && (
                        <Badge variant="outline" className="text-brand-purple-500">
                          Auto-fixable
                        </Badge>
                      )}
                    </div>

                    {/* Issue Description */}
                    <p className="text-sm text-muted-foreground">{issue.message}</p>

                    {/* Original Text */}
                    {issue.originalText && (
                      <div className="bg-muted/50 rounded p-2">
                        <p className="text-xs text-muted-foreground mb-1">
                          Original AC #{issue.acceptanceCriterionIndex}:
                        </p>
                        <p className="text-sm">{issue.originalText}</p>
                      </div>
                    )}

                    {/* Suggested Fix */}
                    {issue.suggestedFix && (
                      <div className="bg-brand-emerald-500/10 border border-brand-emerald-500/20 rounded p-2">
                        <p className="text-xs text-muted-foreground mb-1">
                          Suggested fix:
                        </p>
                        <p className="text-sm">{issue.suggestedFix}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Metadata */}
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
              <span>Validated {new Date(result.validatedAt).toLocaleString()}</span>
              <span>{result.tokensUsed.toLocaleString()} tokens used</span>
            </div>
          </div>
        )}

        {/* Info Box */}
        {!result && (
          <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
            <p className="font-medium">Quality Checks Include:</p>
            <ul className="text-muted-foreground space-y-1 list-disc list-inside">
              <li>Given-When-Then format compliance</li>
              <li>Testability and clear pass/fail criteria</li>
              <li>Independence from external state</li>
              <li>Specificity and clarity</li>
              <li>Completeness (happy path, edge cases, errors)</li>
              <li>No implementation details</li>
              <li>User-centric language</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
