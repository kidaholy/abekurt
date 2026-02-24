'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useRealtimeMetrics, MetricsUtils } from '@/hooks/use-business-metrics'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  AlertTriangle,
  Package,
  RefreshCw,
  Minus
} from 'lucide-react'

interface MetricsWidgetProps {
  type: 'revenue' | 'orders' | 'inventory' | 'alerts' | 'summary'
  className?: string
  showTrend?: boolean
}

export function MetricsWidget({ 
  type, 
  className = '', 
  showTrend = true 
}: MetricsWidgetProps) {
  const { realTimeMetrics, loading, error } = useRealtimeMetrics()

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !realTimeMetrics) {
    return (
      <Card className={`border-red-200 ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2 text-red-600">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm">Error loading data</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  const renderTrendIcon = (growth: number) => {
    if (growth > 0) return <TrendingUp className="h-4 w-4 text-green-600" />
    if (growth < 0) return <TrendingDown className="h-4 w-4 text-red-600" />
    return <Minus className="h-4 w-4 text-gray-400" />
  }

  switch (type) {
    case 'revenue':
      return (
        <Card className={className}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Today's Revenue</p>
                <p className="text-2xl font-bold text-[#8B4513]">
                  {MetricsUtils.formatCurrency(realTimeMetrics.todayRevenue)}
                </p>
                {showTrend && (
                  <div className="flex items-center space-x-1 mt-1">
                    {renderTrendIcon(5)} {/* This would come from growth data */}
                    <span className="text-xs text-gray-500">vs yesterday</span>
                  </div>
                )}
              </div>
              <DollarSign className="h-8 w-8 text-[#8B4513] opacity-60" />
            </div>
          </CardContent>
        </Card>
      )

    case 'orders':
      return (
        <Card className={className}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Orders Today</p>
                <p className="text-2xl font-bold text-[#D2691E]">
                  {realTimeMetrics.todayOrders}
                </p>
                <div className="flex items-center space-x-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {realTimeMetrics.activeOrders} active
                  </Badge>
                  <span className="text-xs text-gray-500">
                    {realTimeMetrics.completionRate}% completed
                  </span>
                </div>
              </div>
              <ShoppingCart className="h-8 w-8 text-[#D2691E] opacity-60" />
            </div>
          </CardContent>
        </Card>
      )

    case 'summary':
      return (
        <Card className={className}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Quick Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Revenue</span>
              <span className="font-semibold text-[#8B4513]">
                {MetricsUtils.formatCurrency(realTimeMetrics.todayRevenue)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Orders</span>
              <span className="font-semibold">{realTimeMetrics.todayOrders}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Active</span>
              <Badge variant="outline">{realTimeMetrics.activeOrders}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Avg Order</span>
              <span className="font-semibold">
                {MetricsUtils.formatCurrency(realTimeMetrics.averageOrderValue)}
              </span>
            </div>
          </CardContent>
        </Card>
      )

    default:
      return (
        <Card className={className}>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Metrics widget</p>
          </CardContent>
        </Card>
      )
  }
}

// Specialized widgets for different use cases
export function RevenueWidget({ className }: { className?: string }) {
  return <MetricsWidget type="revenue" className={className} />
}

export function OrdersWidget({ className }: { className?: string }) {
  return <MetricsWidget type="orders" className={className} />
}

export function SummaryWidget({ className }: { className?: string }) {
  return <MetricsWidget type="summary" className={className} />
}