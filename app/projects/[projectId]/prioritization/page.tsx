'use client'

import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts'

type Framework = 'WSJF' | 'RICE' | 'MoSCoW'

interface RankedStory {
  id: string
  title: string
  wsjfScore?: number
  riceScore?: number
  moscowCategory?: 'Must' | 'Should' | 'Could' | 'Wont'
  rank?: number
  confidence?: number
  jobSize?: number
  storyPoints?: number
}

interface Report {
  id: string
  frameworkUsed: Framework
  rankedStories: RankedStory[]
  strategicAlignment?: any
  priorityConflicts?: any[]
  capacityAnalysis?: { sprintStories?: string[]; quarterStories?: string[]; atRiskStories?: string[]; teamCapacity?: Array<{ team: string; used: number; capacity: number; stories: string[] }> }
  confidenceLevels?: {
    highConfidenceStories?: string[]
    mediumConfidenceStories?: string[]
    lowConfidenceStories?: string[]
    unestimatedStories?: string[]
  }
  executiveSummary?: string
}

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options)
  if (!res.ok) {
    const message = await res.text()
    throw new Error(message || 'Request failed')
  }
  return res.json()
}

function ConfidenceBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-24 text-sm text-muted-foreground">{label}</div>
      <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
        <div className="h-full bg-purple-500" style={{ width: `${value}%` }} />
      </div>
      <span className="text-sm text-muted-foreground">{value}%</span>
    </div>
  )
}

export default function PrioritizationDashboardPage() {
  const params = useParams()
  const projectId = params.projectId as string

  const [framework, setFramework] = useState<Framework>('WSJF')
  const [reports, setReports] = useState<Report[]>([])
  const [activeReport, setActiveReport] = useState<Report | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingReports, setIsLoadingReports] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [jobId, setJobId] = useState<string | null>(null)
  const [jobStatus, setJobStatus] = useState<'pending' | 'processing' | 'completed' | 'failed' | null>(null)
  const [selectedStory, setSelectedStory] = useState<RankedStory | null>(null)

  const featureEnabled = process.env.NEXT_PUBLIC_ENABLE_PRIORITIZATION !== 'false'

  const refreshReports = useCallback(async () => {
    setIsLoadingReports(true)
    try {
      const data = await fetchJSON<{ data: Report[] }>(`/api/v1/prioritization/projects/${projectId}/analysis/reports`)
      setReports(data.data || [])
      if (data.data?.length) {
        const latest = data.data[data.data.length - 1]
        setActiveReport(latest)
        setFramework(latest.frameworkUsed)
      }
    } catch (error: any) {
      console.error(error)
      toast.error('Failed to load reports')
    } finally {
      setIsLoadingReports(false)
    }
  }, [projectId])

  useEffect(() => {
    refreshReports()
  }, [projectId, refreshReports])

  useEffect(() => {
    if (!jobId || !projectId) return
    const interval = setInterval(async () => {
      try {
        const res = await fetchJSON<{ data: any }>(`/api/v1/prioritization/projects/${projectId}/analysis/jobs/${jobId}`)
        const status = res.data?.status
        setJobStatus(status)
        if (status === 'completed' || status === 'failed') {
          clearInterval(interval)
          await refreshReports()
          if (status === 'failed') {
            toast.error('Analysis failed')
          }
        }
      } catch {
        clearInterval(interval)
      }
    }, 2000)
    return () => clearInterval(interval)
  }, [jobId, projectId, refreshReports])

  async function runAnalysis(payload: {
    framework: Framework
    strategicFocus?: string
    marketSegment?: string
    competitivePressure?: string
    budgetPerQuarter?: number
    teamVelocity?: number
  }) {
    setIsLoading(true)
    try {
      const result = await fetchJSON<{ jobId?: string; status?: any; reportId?: string }>(`/api/v1/prioritization/projects/${projectId}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      toast.success('Analysis started')
      setFramework(payload.framework)
      setJobId(result.jobId ?? null)
      setJobStatus(result.status)
      if (result.status === 'completed') {
        await refreshReports()
      }
      return result
    } catch (error: any) {
      toast.error(error?.message || 'Failed to start analysis')
    } finally {
      setIsLoading(false)
      setIsModalOpen(false)
    }
  }

  const confidenceBreakdown = useMemo(() => {
    const levels = activeReport?.confidenceLevels
    if (!levels) return { high: 0, medium: 0, low: 0, none: 0 }
    const total =
      (levels.highConfidenceStories?.length || 0) +
      (levels.mediumConfidenceStories?.length || 0) +
      (levels.lowConfidenceStories?.length || 0) +
      (levels.unestimatedStories?.length || 0)
    const pct = (val: number) => (total === 0 ? 0 : Math.round((val / total) * 100))
    return {
      high: pct(levels.highConfidenceStories?.length || 0),
      medium: pct(levels.mediumConfidenceStories?.length || 0),
      low: pct(levels.lowConfidenceStories?.length || 0),
      none: pct(levels.unestimatedStories?.length || 0),
    }
  }, [activeReport])

  const confidenceChartData = useMemo(
    () => [
      { name: 'High', value: confidenceBreakdown.high },
      { name: 'Medium', value: confidenceBreakdown.medium },
      { name: 'Low', value: confidenceBreakdown.low },
      { name: 'Unestimated', value: confidenceBreakdown.none },
    ],
    [confidenceBreakdown]
  )

  const alignment = activeReport?.strategicAlignment
  const conflicts = activeReport?.priorityConflicts || []

  const handleStoryClick = useCallback(
    (story: RankedStory) => {
      setSelectedStory(story)
    },
    []
  )

  if (!featureEnabled) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Prioritization</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            This feature is disabled. Set NEXT_PUBLIC_ENABLE_PRIORITIZATION=true to enable.
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Backlog Prioritization Advisor</p>
          <h1 className="text-2xl font-semibold">Backlog Priority Analysis</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={refreshReports} disabled={isLoadingReports}>
            {isLoadingReports ? 'Refreshing…' : 'Refresh'}
          </Button>
          {jobStatus && (
            <Badge variant="outline" className="text-xs capitalize">
              Job: {jobStatus}
            </Badge>
          )}
          <select
            className="h-10 rounded-lg border border-gray-700 bg-gray-800/50 px-3 text-sm text-white"
            value={framework}
            onChange={(e) => setFramework(e.target.value as Framework)}
          >
            <option value="WSJF">WSJF</option>
            <option value="RICE">RICE</option>
            <option value="MoSCoW">MoSCoW</option>
          </select>
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button>Run New Analysis</Button>
            </DialogTrigger>
            <RunAnalysisModal
              framework={framework}
              onSubmit={runAnalysis}
              isSubmitting={isLoading}
              onClose={() => setIsModalOpen(false)}
            />
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recommended Priority</CardTitle>
            {activeReport && (
              <p className="text-xs text-muted-foreground">
                Last generated: {new Date((activeReport as any).generatedAt || activeReport.id).toLocaleString()}
              </p>
            )}
          </CardHeader>
          <CardContent>
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-4">Rank</th>
                    <th className="py-2 pr-4">Story</th>
                    <th className="py-2 pr-4">Score</th>
                    <th className="py-2 pr-4">Confidence</th>
                    <th className="py-2 pr-4">Size</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoadingReports && (
                    <tr>
                      <td className="py-3 text-muted-foreground" colSpan={5}>
                        Loading…
                      </td>
                    </tr>
                  )}
                  {!isLoadingReports && (activeReport?.rankedStories || []).length === 0 && (
                    <tr>
                      <td className="py-3 text-muted-foreground" colSpan={5}>
                        No analyses yet. Run a new analysis to get started.
                      </td>
                    </tr>
                  )}
                  {(activeReport?.rankedStories || []).map((story) => (
                    <tr key={story.id} className="border-t border-gray-800 hover:bg-gray-800/40 cursor-pointer" onClick={() => handleStoryClick(story)}>
                      <td className="py-2 pr-4 font-mono">{story.rank}</td>
                      <td className="py-2 pr-4">{story.title}</td>
                      <td className="py-2 pr-4">
                        {framework === 'WSJF' && (story.wsjfScore ?? '–')}
                        {framework === 'RICE' && (story.riceScore ?? '–')}
                        {framework === 'MoSCoW' && (
                          <Badge variant="outline" className="capitalize">
                            {story.moscowCategory || 'N/A'}
                          </Badge>
                        )}
                      </td>
                      <td className="py-2 pr-4">
                        {story.confidence != null ? `${Math.round(story.confidence * 100)}%` : '–'}
                      </td>
                      <td className="py-2 pr-4">{story.jobSize ?? story.storyPoints ?? '–'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Executive Summary</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {activeReport?.executiveSummary || 'Run an analysis to generate a summary.'}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Confidence</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <ConfidenceBar label="High" value={confidenceBreakdown.high} />
              <ConfidenceBar label="Medium" value={confidenceBreakdown.medium} />
              <ConfidenceBar label="Low" value={confidenceBreakdown.low} />
              <ConfidenceBar label="Unestimated" value={confidenceBreakdown.none} />
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={confidenceChartData}>
                    <XAxis dataKey="name" hide />
                    <YAxis hide />
                    <Tooltip />
                    <Bar dataKey="value" fill="#a855f7" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Capacity</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>
                <span className="font-medium text-foreground">Next Sprint:</span>{' '}
                {(activeReport?.capacityAnalysis?.sprintStories || []).length} stories
              </p>
              <p>
                <span className="font-medium text-foreground">Next Quarter:</span>{' '}
                {(activeReport?.capacityAnalysis?.quarterStories || []).length} stories
              </p>
              {activeReport?.capacityAnalysis?.teamCapacity && activeReport.capacityAnalysis.teamCapacity.length > 0 && (
                <div className="space-y-1">
                  {activeReport.capacityAnalysis.teamCapacity.map((team: { team: string; used: number; capacity: number; stories: string[] }) => (
                    <div key={team.team} className="flex justify-between text-xs">
                      <span>{team.team}</span>
                      <span>
                        {team.used}/{team.capacity} pts
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Strategic Alignment</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            {alignment ? (
              <>
                <p><span className="font-medium text-foreground">Goal:</span> {alignment.top3AlignmentGoal}</p>
                <p><span className="font-medium text-foreground">Revenue (next quarter):</span> {alignment.revenueImpactNextQuarter}</p>
                <p><span className="font-medium text-foreground">Risk Reduction:</span> {alignment.riskReduction}</p>
                <p><span className="font-medium text-foreground">Market:</span> {alignment.marketDifferentiation}</p>
              </>
            ) : (
              <p>No alignment data yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Conflicts</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            {conflicts.length === 0 ? (
              <p>No conflicts detected.</p>
            ) : (
              conflicts.map((c, idx) => (
                <div key={idx} className="border border-gray-800 rounded-lg p-2">
                  <p className="font-medium text-foreground">{c.conflict}</p>
                  <p>{c.reason}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Past Analyses</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeReport?.id} onValueChange={(val) => setActiveReport(reports.find((r) => r.id === val) || null)}>
            <TabsList className="flex-wrap">
              {reports.map((r) => (
                <TabsTrigger key={r.id} value={r.id} className="text-xs">
                  {r.frameworkUsed} · {r.id.slice(0, 6)}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={!!selectedStory} onOpenChange={(open) => !open && setSelectedStory(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedStory?.title}</DialogTitle>
          </DialogHeader>
          {selectedStory && (
            <div className="space-y-2 text-sm text-muted-foreground">
              <p><span className="font-medium text-foreground">Rank:</span> {selectedStory.rank ?? '–'}</p>
              <p><span className="font-medium text-foreground">WSJF:</span> {selectedStory.wsjfScore ?? '–'}</p>
              <p><span className="font-medium text-foreground">RICE:</span> {selectedStory.riceScore ?? '–'}</p>
              <p><span className="font-medium text-foreground">Category:</span> {selectedStory.moscowCategory ?? '–'}</p>
              <p><span className="font-medium text-foreground">Confidence:</span> {selectedStory.confidence != null ? `${Math.round(selectedStory.confidence * 100)}%` : '–'}</p>
              <p><span className="font-medium text-foreground">Size:</span> {selectedStory.jobSize ?? selectedStory.storyPoints ?? '–'}</p>
              <p><span className="font-medium text-foreground">Provenance:</span> {(selectedStory as any).provenance || 'auto'}</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedStory(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function RunAnalysisModal({
  framework,
  onSubmit,
  isSubmitting,
  onClose,
}: {
  framework: Framework
  onSubmit: (payload: any) => Promise<any>
  isSubmitting: boolean
  onClose: () => void
}) {
  const [form, setForm] = useState({
    framework,
    strategicFocus: '',
    marketSegment: '',
    competitivePressure: '',
    budgetPerQuarter: '',
    teamVelocity: '',
  })

  useEffect(() => {
    setForm((prev) => ({ ...prev, framework }))
  }, [framework])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit({
      framework: form.framework,
      strategicFocus: form.strategicFocus || undefined,
      marketSegment: form.marketSegment || undefined,
      competitivePressure: form.competitivePressure || undefined,
      budgetPerQuarter: form.budgetPerQuarter ? Number(form.budgetPerQuarter) : undefined,
      teamVelocity: form.teamVelocity ? Number(form.teamVelocity) : undefined,
    })
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Run New Analysis</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label>Framework</Label>
          <select
            className="h-10 rounded-lg border border-gray-700 bg-gray-800/50 px-3 text-sm text-white"
            value={form.framework}
            onChange={(e) => setForm((prev) => ({ ...prev, framework: e.target.value as Framework }))}
          >
            <option value="WSJF">WSJF</option>
            <option value="RICE">RICE</option>
            <option value="MoSCoW">MoSCoW</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label>Strategic Focus</Label>
          <Input
            value={form.strategicFocus}
            onChange={(e) => setForm((prev) => ({ ...prev, strategicFocus: e.target.value }))}
            placeholder="Expand to new markets"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Market Segment</Label>
            <Input
              value={form.marketSegment}
              onChange={(e) => setForm((prev) => ({ ...prev, marketSegment: e.target.value }))}
              placeholder="Enterprise"
            />
          </div>
          <div className="space-y-2">
            <Label>Competitive Pressure</Label>
            <Input
              value={form.competitivePressure}
              onChange={(e) => setForm((prev) => ({ ...prev, competitivePressure: e.target.value }))}
              placeholder="High"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Budget Per Quarter</Label>
            <Input
              type="number"
              value={form.budgetPerQuarter}
              onChange={(e) => setForm((prev) => ({ ...prev, budgetPerQuarter: e.target.value }))}
              placeholder="500000"
            />
          </div>
          <div className="space-y-2">
            <Label>Team Velocity (points)</Label>
            <Input
              type="number"
              value={form.teamVelocity}
              onChange={(e) => setForm((prev) => ({ ...prev, teamVelocity: e.target.value }))}
              placeholder="25"
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Running…' : 'Run Analysis'}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}

