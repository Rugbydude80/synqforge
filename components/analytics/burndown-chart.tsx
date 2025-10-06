'use client'

import { useEffect, useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'

interface BurndownData {
  dayNumber: number
  remainingPoints: number
  completedPoints: number
  scopeChanges: number
}

interface BurndownChartProps {
  sprintId: string
  plannedPoints: number
  totalDays: number
}

export function BurndownChart({
  sprintId,
  plannedPoints,
  totalDays,
}: BurndownChartProps) {
  const [data, setData] = useState<BurndownData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadBurndownData()
  }, [sprintId])

  const loadBurndownData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/analytics/burndown?sprintId=${sprintId}`)
      if (!res.ok) throw new Error('Failed to load burndown data')
      const burndownData = await res.json()
      setData(burndownData)
    } catch (error) {
      toast.error('Failed to load burndown data')
    } finally {
      setLoading(false)
    }
  }

  // Calculate ideal burndown line
  const idealBurnRate = plannedPoints / totalDays
  const chartData = []

  for (let day = 0; day <= totalDays; day++) {
    const actualData = data.find((d) => d.dayNumber === day)
    chartData.push({
      day,
      ideal: Math.max(0, plannedPoints - idealBurnRate * day),
      actual: actualData?.remainingPoints ?? null,
      completed: actualData?.completedPoints ?? 0,
    })
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

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Sprint Burndown</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="day"
            label={{ value: 'Day', position: 'insideBottom', offset: -5 }}
          />
          <YAxis label={{ value: 'Story Points', angle: -90, position: 'insideLeft' }} />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-white p-3 border rounded shadow-lg">
                    <p className="font-semibold">Day {payload[0].payload.day}</p>
                    <p className="text-sm text-gray-600">
                      Ideal: {payload[0].payload.ideal.toFixed(1)} points
                    </p>
                    {payload[0].payload.actual !== null && (
                      <>
                        <p className="text-sm text-blue-600">
                          Remaining: {payload[0].payload.actual} points
                        </p>
                        <p className="text-sm text-green-600">
                          Completed: {payload[0].payload.completed} points
                        </p>
                      </>
                    )}
                  </div>
                )
              }
              return null
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="ideal"
            stroke="#9ca3af"
            strokeDasharray="5 5"
            name="Ideal Burndown"
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="actual"
            stroke="#3b82f6"
            strokeWidth={2}
            name="Actual Remaining"
            dot={{ r: 4 }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>

      {data.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No burndown data yet. Daily snapshots will appear here.
        </div>
      )}
    </Card>
  )
}
