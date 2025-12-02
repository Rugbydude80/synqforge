'use client'

import * as React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts'
import { TrendingDown, AlertCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface BurndownDataPoint {
  day: string
  remaining: number
  ideal: number
}

interface SprintBurndownProps {
  sprintName: string
  data: BurndownDataPoint[]
  totalPoints: number
  daysRemaining: number
}

export function SprintBurndown({ sprintName, data, totalPoints, daysRemaining }: SprintBurndownProps) {
  // Calculate if sprint is on track
  const lastDataPoint = data[data.length - 1]
  const isOnTrack = lastDataPoint && lastDataPoint.remaining <= lastDataPoint.ideal * 1.1

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5" />
              Sprint Burndown
            </CardTitle>
            <CardDescription>{sprintName}</CardDescription>
          </div>
          <Badge 
            variant={isOnTrack ? 'default' : 'destructive'}
            className="gap-1"
          >
            {isOnTrack ? '✓ On Track' : '⚠ Behind'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="day" 
              className="text-xs" 
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis 
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              label={{ value: 'Story Points', angle: -90, position: 'insideLeft' }}
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
            <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
            <Line 
              type="monotone" 
              dataKey="ideal" 
              stroke="#6366f1" 
              name="Ideal Burndown"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
            />
            <Line 
              type="monotone" 
              dataKey="remaining" 
              stroke="#8b5cf6" 
              name="Actual Remaining"
              strokeWidth={3}
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>

        {/* Sprint Stats */}
        <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t">
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-400">{totalPoints}</p>
            <p className="text-xs text-muted-foreground">Total Points</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-400">
              {lastDataPoint ? lastDataPoint.remaining : totalPoints}
            </p>
            <p className="text-xs text-muted-foreground">Remaining</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-400">{daysRemaining}</p>
            <p className="text-xs text-muted-foreground">Days Left</p>
          </div>
        </div>

        {!isOnTrack && daysRemaining > 0 && (
          <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-yellow-500">Sprint Behind Schedule</p>
              <p className="text-muted-foreground text-xs mt-1">
                Consider moving lower-priority stories to backlog or requesting help from team members.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

