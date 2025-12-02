'use client'

import * as React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface VelocityDataPoint {
  period: string // "Week 1", "Sprint 1", etc.
  completed: number
  planned: number
}

interface VelocityChartProps {
  data: VelocityDataPoint[]
  title?: string
  description?: string
}

export function VelocityChart({ 
  data, 
  title = 'Team Velocity',
  description = 'Story points completed vs planned over time'
}: VelocityChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="period" 
              className="text-xs" 
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis 
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
            />
            <Legend />
            <Bar dataKey="completed" fill="#8b5cf6" name="Completed" radius={[8, 8, 0, 0]} />
            <Bar dataKey="planned" fill="#6366f1" name="Planned" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t">
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-400">
              {data.reduce((sum, d) => sum + d.completed, 0)}
            </p>
            <p className="text-xs text-muted-foreground">Total Completed</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-400">
              {Math.round(data.reduce((sum, d) => sum + d.completed, 0) / data.length)}
            </p>
            <p className="text-xs text-muted-foreground">Avg per Period</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-400">
              {Math.round((data.reduce((sum, d) => sum + d.completed, 0) / data.reduce((sum, d) => sum + d.planned, 0)) * 100)}%
            </p>
            <p className="text-xs text-muted-foreground">Accuracy</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
