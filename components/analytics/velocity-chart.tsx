'use client'

import { useEffect, useState } from 'react'
import {
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Line,
  ComposedChart,
} from 'recharts'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

interface VelocityData {
  sprintId: string
  sprintName: string
  plannedPoints: number
  completedPoints: number
  velocity: number
  completionPercentage: number
  startDate: string
  endDate: string
}

interface VelocityChartProps {
  projectId: string
}

export function VelocityChart({ projectId }: VelocityChartProps) {
  const [velocityTrend, setVelocityTrend] = useState<VelocityData[]>([])
  const [averageVelocity, setAverageVelocity] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadVelocityData()
  }, [projectId])

  const loadVelocityData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/analytics/velocity?projectId=${projectId}&limit=6`)
      if (!res.ok) throw new Error('Failed to load velocity data')
      const data = await res.json()
      setVelocityTrend(data.velocityTrend)
      setAverageVelocity(data.averageVelocity)
    } catch (_error) {
      toast.error('Failed to load velocity data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </Card>
    )
  }

  const chartData = velocityTrend.map((sprint) => ({
    name: sprint.sprintName,
    planned: sprint.plannedPoints,
    completed: sprint.completedPoints,
    average: averageVelocity,
  }))

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Velocity Trend</h3>
        <Badge variant="secondary" className="text-sm">
          Avg: {averageVelocity} pts
        </Badge>
      </div>

      {velocityTrend.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          No velocity data yet. Complete a sprint to see velocity trends.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis label={{ value: 'Story Points', angle: -90, position: 'insideLeft' }} />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-white p-3 border rounded shadow-lg">
                      <p className="font-semibold mb-1">{payload[0].payload.name}</p>
                      <p className="text-sm text-gray-600">
                        Planned: {payload[0].payload.planned} points
                      </p>
                      <p className="text-sm text-green-600">
                        Completed: {payload[0].payload.completed} points
                      </p>
                      <p className="text-sm text-blue-600">
                        Average: {payload[0].payload.average} points
                      </p>
                    </div>
                  )
                }
                return null
              }}
            />
            <Legend />
            <Bar dataKey="planned" fill="#9ca3af" name="Planned" />
            <Bar dataKey="completed" fill="#10b981" name="Completed" />
            <Line
              type="monotone"
              dataKey="average"
              stroke="#3b82f6"
              strokeWidth={2}
              strokeDasharray="5 5"
              name="Average"
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}

      {/* Stats */}
      {velocityTrend.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t">
          <div>
            <div className="text-xs text-gray-500 mb-1">Total Sprints</div>
            <div className="text-2xl font-bold">{velocityTrend.length}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">Avg Velocity</div>
            <div className="text-2xl font-bold text-blue-600">
              {averageVelocity} pts
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">Last Sprint</div>
            <div className="text-2xl font-bold text-green-600">
              {velocityTrend[velocityTrend.length - 1]?.completedPoints || 0} pts
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}
