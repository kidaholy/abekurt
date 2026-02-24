"use client"

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ChartDataPoint {
  label: string
  value: number
  color?: string
}

interface SimpleChartProps {
  data: ChartDataPoint[]
  title: string
  type?: 'bar' | 'line' | 'area'
  height?: number
  showValues?: boolean
  color?: string
  className?: string
}

export function SimpleChart({ 
  data, 
  title, 
  type = 'bar', 
  height = 200, 
  showValues = true,
  color = '#8B4513',
  className = ''
}: SimpleChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card className={`border-2 border-[#8B4513] ${className}`}>
        <CardHeader>
          <CardTitle className="text-[#8B4513]">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48 text-gray-500">
            No data available
          </div>
        </CardContent>
      </Card>
    )
  }

  const maxValue = Math.max(...data.map(d => d.value))
  const minValue = Math.min(...data.map(d => d.value))
  const range = maxValue - minValue || 1

  const chartWidth = 400
  const chartHeight = height
  const padding = 40
  const barWidth = (chartWidth - padding * 2) / data.length
  const barSpacing = barWidth * 0.1

  return (
    <Card className={`border-2 border-[#8B4513] ${className}`}>
      <CardHeader>
        <CardTitle className="text-[#8B4513] flex items-center justify-between">
          {title}
          <span className="text-sm font-normal text-gray-600">
            Max: {maxValue.toLocaleString()}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="w-full overflow-x-auto">
          <svg 
            width={chartWidth} 
            height={chartHeight + 60} 
            className="w-full"
            viewBox={`0 0 ${chartWidth} ${chartHeight + 60}`}
          >
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
              const y = chartHeight - (ratio * (chartHeight - padding))
              const value = minValue + (ratio * range)
              return (
                <g key={index}>
                  <line
                    x1={padding}
                    y1={y}
                    x2={chartWidth - padding}
                    y2={y}
                    stroke="#e5e7eb"
                    strokeWidth="1"
                    strokeDasharray={index === 0 ? "none" : "2,2"}
                  />
                  <text
                    x={padding - 5}
                    y={y + 4}
                    textAnchor="end"
                    fontSize="10"
                    fill="#6b7280"
                  >
                    {value.toFixed(0)}
                  </text>
                </g>
              )
            })}

            {/* Chart content */}
            {type === 'bar' && data.map((point, index) => {
              const x = padding + (index * barWidth) + (barSpacing / 2)
              const barHeight = ((point.value - minValue) / range) * (chartHeight - padding)
              const y = chartHeight - barHeight

              return (
                <g key={index}>
                  {/* Bar */}
                  <rect
                    x={x}
                    y={y}
                    width={barWidth - barSpacing}
                    height={barHeight}
                    fill={point.color || color}
                    rx="2"
                    className="hover:opacity-80 transition-opacity cursor-pointer"
                  />
                  
                  {/* Value label */}
                  {showValues && point.value > 0 && (
                    <text
                      x={x + (barWidth - barSpacing) / 2}
                      y={y - 5}
                      textAnchor="middle"
                      fontSize="10"
                      fill="#374151"
                      fontWeight="bold"
                    >
                      {point.value.toLocaleString()}
                    </text>
                  )}

                  {/* X-axis label */}
                  <text
                    x={x + (barWidth - barSpacing) / 2}
                    y={chartHeight + 15}
                    textAnchor="middle"
                    fontSize="10"
                    fill="#6b7280"
                    transform={`rotate(-45, ${x + (barWidth - barSpacing) / 2}, ${chartHeight + 15})`}
                  >
                    {point.label}
                  </text>
                </g>
              )
            })}

            {type === 'line' && (
              <>
                {/* Line path */}
                <path
                  d={data.map((point, index) => {
                    const x = padding + (index * barWidth) + (barWidth / 2)
                    const y = chartHeight - ((point.value - minValue) / range) * (chartHeight - padding)
                    return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
                  }).join(' ')}
                  stroke={color}
                  strokeWidth="3"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Data points */}
                {data.map((point, index) => {
                  const x = padding + (index * barWidth) + (barWidth / 2)
                  const y = chartHeight - ((point.value - minValue) / range) * (chartHeight - padding)

                  return (
                    <g key={index}>
                      <circle
                        cx={x}
                        cy={y}
                        r="4"
                        fill={color}
                        className="hover:r-6 transition-all cursor-pointer"
                      />
                      
                      {/* Value label */}
                      {showValues && point.value > 0 && (
                        <text
                          x={x}
                          y={y - 10}
                          textAnchor="middle"
                          fontSize="10"
                          fill="#374151"
                          fontWeight="bold"
                        >
                          {point.value.toLocaleString()}
                        </text>
                      )}

                      {/* X-axis label */}
                      <text
                        x={x}
                        y={chartHeight + 15}
                        textAnchor="middle"
                        fontSize="10"
                        fill="#6b7280"
                        transform={`rotate(-45, ${x}, ${chartHeight + 15})`}
                      >
                        {point.label}
                      </text>
                    </g>
                  )
                })}
              </>
            )}

            {type === 'area' && (
              <>
                {/* Area fill */}
                <path
                  d={[
                    `M ${padding} ${chartHeight}`,
                    ...data.map((point, index) => {
                      const x = padding + (index * barWidth) + (barWidth / 2)
                      const y = chartHeight - ((point.value - minValue) / range) * (chartHeight - padding)
                      return `L ${x} ${y}`
                    }),
                    `L ${padding + ((data.length - 1) * barWidth) + (barWidth / 2)} ${chartHeight}`,
                    'Z'
                  ].join(' ')}
                  fill={color}
                  fillOpacity="0.3"
                />

                {/* Line */}
                <path
                  d={data.map((point, index) => {
                    const x = padding + (index * barWidth) + (barWidth / 2)
                    const y = chartHeight - ((point.value - minValue) / range) * (chartHeight - padding)
                    return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
                  }).join(' ')}
                  stroke={color}
                  strokeWidth="2"
                  fill="none"
                />

                {/* X-axis labels */}
                {data.map((point, index) => {
                  const x = padding + (index * barWidth) + (barWidth / 2)
                  return (
                    <text
                      key={index}
                      x={x}
                      y={chartHeight + 15}
                      textAnchor="middle"
                      fontSize="10"
                      fill="#6b7280"
                      transform={`rotate(-45, ${x}, ${chartHeight + 15})`}
                    >
                      {point.label}
                    </text>
                  )
                })}
              </>
            )}
          </svg>
        </div>

        {/* Summary stats */}
        <div className="mt-4 flex justify-between text-sm text-gray-600">
          <span>Total: {data.reduce((sum, d) => sum + d.value, 0).toLocaleString()}</span>
          <span>Average: {(data.reduce((sum, d) => sum + d.value, 0) / data.length).toFixed(1)}</span>
          <span>Data points: {data.length}</span>
        </div>
      </CardContent>
    </Card>
  )
}

// Specialized chart components
export function RevenueChart({ hourlyData, className = '' }: { 
  hourlyData: Array<{ hour: string; revenue: number; orders: number }>, 
  className?: string 
}) {
  const chartData = hourlyData
    .filter(d => d.revenue > 0) // Only show hours with revenue
    .map(d => ({
      label: d.hour,
      value: d.revenue,
      color: d.orders > 5 ? '#8B4513' : '#D2691E' // Darker brown for busy hours
    }))

  return (
    <SimpleChart
      data={chartData}
      title="Today's Hourly Revenue"
      type="bar"
      height={180}
      showValues={true}
      className={className}
    />
  )
}

export function OrdersChart({ hourlyData, className = '' }: { 
  hourlyData: Array<{ hour: string; revenue: number; orders: number }>, 
  className?: string 
}) {
  const chartData = hourlyData
    .filter(d => d.orders > 0) // Only show hours with orders
    .map(d => ({
      label: d.hour,
      value: d.orders,
      color: '#8B4513'
    }))

  return (
    <SimpleChart
      data={chartData}
      title="Today's Hourly Orders"
      type="line"
      height={180}
      showValues={true}
      color="#D2691E"
      className={className}
    />
  )
}

export function CategoryChart({ categoryData, className = '' }: { 
  categoryData: Array<{ category: string; revenue: number; orders: number; percentage: number }>, 
  className?: string 
}) {
  const chartData = categoryData.map((d, index) => ({
    label: d.category,
    value: d.revenue,
    color: ['#8B4513', '#D2691E', '#CD853F', '#DEB887', '#F4A460'][index % 5]
  }))

  return (
    <SimpleChart
      data={chartData}
      title="Revenue by Category"
      type="bar"
      height={180}
      showValues={true}
      className={className}
    />
  )
}

export function TrendsChart({ trendsData, className = '' }: { 
  trendsData: Array<{ date: string; revenue: number; orders: number; profit: number }>, 
  className?: string 
}) {
  const chartData = trendsData.map(d => ({
    label: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    value: d.revenue,
    color: d.profit > 0 ? '#8B4513' : '#DC2626'
  }))

  return (
    <SimpleChart
      data={chartData}
      title="7-Day Revenue Trend"
      type="area"
      height={180}
      showValues={false}
      color="#8B4513"
      className={className}
    />
  )
}