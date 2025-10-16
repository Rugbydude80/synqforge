'use client'

import { useState, useEffect } from 'react'
import { Save, RotateCcw, Plus, Trash2, Loader2, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface ValidationRule {
  id?: string
  name: string
  description: string
  severity: 'error' | 'warning' | 'info'
  enabled: boolean
  customPrompt?: string
}

interface ValidationRulesManagerProps {
  className?: string
}

export function ValidationRulesManager({ className }: ValidationRulesManagerProps) {
  const [rules, setRules] = useState<ValidationRule[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [expandedRule, setExpandedRule] = useState<number | null>(null)

  useEffect(() => {
    fetchRules()
  }, [])

  const fetchRules = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/ai/ac-validator/rules', {
        credentials: 'include',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch rules')
      }

      setRules(data.rules || [])
    } catch (error: any) {
      console.error('Error fetching rules:', error)
      toast.error(error.message || 'Failed to fetch validation rules')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)

      const response = await fetch('/api/ai/ac-validator/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ rules }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save rules')
      }

      toast.success('Validation rules saved successfully')
    } catch (error: any) {
      console.error('Error saving rules:', error)
      toast.error(error.message || 'Failed to save validation rules')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    if (!confirm('Are you sure you want to reset to default rules? This cannot be undone.')) {
      return
    }

    try {
      setResetting(true)

      const response = await fetch('/api/ai/ac-validator/rules', {
        method: 'DELETE',
        credentials: 'include',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset rules')
      }

      toast.success('Validation rules reset to defaults')
      fetchRules()
    } catch (error: any) {
      console.error('Error resetting rules:', error)
      toast.error(error.message || 'Failed to reset validation rules')
    } finally {
      setResetting(false)
    }
  }

  const toggleRule = (index: number) => {
    const newRules = [...rules]
    newRules[index].enabled = !newRules[index].enabled
    setRules(newRules)
  }

  const updateRule = (index: number, updates: Partial<ValidationRule>) => {
    const newRules = [...rules]
    newRules[index] = { ...newRules[index], ...updates }
    setRules(newRules)
  }

  const addRule = () => {
    setRules([
      ...rules,
      {
        name: 'New Rule',
        description: 'Describe the rule here',
        severity: 'warning',
        enabled: true,
      },
    ])
  }

  const removeRule = (index: number) => {
    setRules(rules.filter((_, i) => i !== index))
  }

  const getSeverityColor = (severity: 'error' | 'warning' | 'info') => {
    switch (severity) {
      case 'error':
        return 'text-destructive'
      case 'warning':
        return 'text-orange-500'
      case 'info':
        return 'text-blue-500'
    }
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
              <Settings className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle>Validation Rules</CardTitle>
              <CardDescription>
                Configure quality standards for acceptance criteria
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              disabled={resetting || saving}
            >
              <RotateCcw className={cn('h-4 w-4 mr-2', resetting && 'animate-spin')} />
              Reset to Defaults
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving || resetting}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Rules List */}
        <div className="space-y-3">
          {rules.map((rule, index) => (
            <div
              key={index}
              className={cn(
                'border rounded-lg p-4 transition-colors',
                rule.enabled ? 'bg-background' : 'bg-muted/30'
              )}
            >
              <div className="flex items-start gap-3">
                {/* Enable/Disable Toggle */}
                <input
                  type="checkbox"
                  checked={rule.enabled}
                  onChange={() => toggleRule(index)}
                  className="mt-1 rounded border-border"
                />

                {/* Rule Content */}
                <div className="flex-1 space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={rule.name}
                        onChange={(e) => updateRule(index, { name: e.target.value })}
                        className="font-medium w-full bg-transparent border-none p-0 focus:outline-none focus:ring-0"
                        placeholder="Rule name"
                      />
                      <textarea
                        value={rule.description}
                        onChange={(e) => updateRule(index, { description: e.target.value })}
                        className="text-sm text-muted-foreground w-full bg-transparent border-none p-0 mt-1 focus:outline-none focus:ring-0 resize-none"
                        placeholder="Rule description"
                        rows={2}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={rule.severity}
                        onChange={(e) =>
                          updateRule(index, {
                            severity: e.target.value as 'error' | 'warning' | 'info',
                          })
                        }
                        className={cn(
                          'text-sm border rounded px-2 py-1',
                          getSeverityColor(rule.severity)
                        )}
                      >
                        <option value="error">Error</option>
                        <option value="warning">Warning</option>
                        <option value="info">Info</option>
                      </select>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeRule(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  {/* Custom Prompt (Optional) */}
                  <div>
                    <button
                      type="button"
                      onClick={() => setExpandedRule(expandedRule === index ? null : index)}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {expandedRule === index ? '− Hide' : '+ Add'} custom prompt
                    </button>
                    {expandedRule === index && (
                      <textarea
                        value={rule.customPrompt || ''}
                        onChange={(e) =>
                          updateRule(index, { customPrompt: e.target.value })
                        }
                        className="w-full mt-2 text-sm border rounded p-2 focus:outline-none focus:ring-2 focus:ring-brand-purple-500"
                        placeholder="Optional: Add specific instructions for this rule"
                        rows={3}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add Rule Button */}
        <Button variant="outline" onClick={addRule} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Add Custom Rule
        </Button>

        {/* Info */}
        <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-2">
          <p className="font-medium">Rule Severity Levels:</p>
          <ul className="space-y-1 text-muted-foreground">
            <li>
              <Badge variant="destructive" className="mr-2">Error</Badge>
              Critical issues that must be fixed (validation fails)
            </li>
            <li>
              <Badge variant="outline" className="mr-2 text-orange-500">Warning</Badge>
              Important issues that should be addressed
            </li>
            <li>
              <Badge variant="secondary" className="mr-2">Info</Badge>
              Suggestions for improvement
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
