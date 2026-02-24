'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  useBusinessMetrics, 
  useRealtimeMetrics, 
  MetricsUtils 
} from '@/hooks/use-business-metrics'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Clock,
  AlertTriangle,
  Package,
  Users,
  RefreshCw,
  Calendar,
  BarChart3,
  PieChart as PieChartIcon
} from 'lucide-react'

interface BusinessMetricsDashboardProps {
  variant?: 'full' | 'compact' | 'realtime'
  className?: string
}

const COLORS = ['#8B4513', '#D2691E', '#CD853F', '#DEB887', '#F4A460', '#BC8F8F']

export function BusinessMetricsDashboard({ 
  variant = 'full', 
  className = '' 
}: BusinessMetricsDashboardProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('today')
  const { metrics, loading, error, refresh, lastUpdated } = useBusinessMetrics({
    period: selectedPeriod,
    autoRefresh: variant === 'realtime',
    refreshInterval: variant === 'realtime' ? 10000 : 30000
  })

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Loading business metrics...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardContent className="p-6">
          <div className="flex items-center space-x-2 text-red-600">
            <AlertTriangle className="h-4 w-4" />
            <span>Error loading metrics: {error}</span>
          </div>
          <Button onClick={refresh} variant="outline" size="sm" className="mt-2">
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!metrics) return null

  const renderRealtimeMetrics = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card className="bg-gradient-to-r from-[#8B4513] to-[#D2691E] text-white">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Today's Revenue</p>
              <p className="text-2xl font-bold">
                {MetricsUtils.formatCurrency(metrics.realTimeMetrics.todayRevenue)}
              </p>
              <p className="text-xs opacity-75">
                {MetricsUtils.formatPercentage(metrics.salesAnalytics.revenueGrowth.daily)} vs yesterday
              </p>
            </div>
            <DollarSign className="h-8 w-8 opacity-80" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-r from-[#D2691E] to-[#CD853F] text-white">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Orders Today</p>
              <p className="text-2xl font-bold">{metrics.realTimeMetrics.todayOrders}</p>
              <p className="text-xs opacity-75">
                {metrics.realTimeMetrics.activeOrders} active orders
              </p>
            </div>
            <ShoppingCart className="h-8 w-8 opacity-80" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-r from-[#CD853F] to-[#DEB887] text-white">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Completion Rate</p>
              <p className="text-2xl font-bold">{metrics.realTimeMetrics.completionRate}%</p>
              <p className="text-xs opacity-75">
                Avg Order: {MetricsUtils.formatCurrency(metrics.realTimeMetrics.averageOrderValue)}
              </p>
            </div>
            <Clock className="h-8 w-8 opacity-80" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-r from-[#DEB887] to-[#F4A460] text-white">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Net Profit</p>
              <p className="text-2xl font-bold">
                {MetricsUtils.formatCurrency(metrics.financialOverview.netProfit)}
              </p>
              <p className="text-xs opacity-75">
                {metrics.financialOverview.profitMargin.toFixed(1)}% margin
              </p>
            </div>
            <TrendingUp className="h-8 w-8 opacity-80" />
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderSalesAnalytics = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>Top Selling Items</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {metrics.salesAnalytics.topSellingItems.slice(0, 5).map((item, index) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Badge variant="outline" className="w-6 h-6 p-0 flex items-center justify-center">
                    {index + 1}
                  </Badge>
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-gray-500">{item.category}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">{MetricsUtils.formatCurrency(item.revenue)}</p>
                  <p className="text-sm text-gray-500">{item.quantity} sold</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <PieChartIcon className="h-5 w-5" />
            <span>Category Performance</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={metrics.salesAnalytics.categoryPerformance}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="revenue"
              >
                {metrics.salesAnalytics.categoryPerformance.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => MetricsUtils.formatCurrency(value as number)} />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )

  const renderInventoryInsights = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5" />
            <span>Stock Alerts</span>
            {metrics.inventoryInsights.lowStockAlerts.length > 0 && (
              <Badge variant="destructive">
                {metrics.inventoryInsights.lowStockAlerts.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {metrics.inventoryInsights.lowStockAlerts.length === 0 ? (
            <p className="text-gray-500 text-center py-4">All stock levels are healthy</p>
          ) : (
            <div className="space-y-3">
              {metrics.inventoryInsights.lowStockAlerts.map((alert, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div>
                    <p className="font-medium">{alert.name}</p>
                    <p className="text-sm text-gray-600">
                      Current: {alert.current} {alert.unit} | Min: {alert.minimum} {alert.unit}
                    </p>
                  </div>
                  <Badge 
                    variant={alert.urgency === 'critical' ? 'destructive' : 'secondary'}
                  >
                    {alert.urgency}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Package className="h-5 w-5" />
            <span>Stock Consumption</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {metrics.inventoryInsights.stockConsumption.slice(0, 5).map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-gray-500">
                    {item.consumed} {item.unit} consumed
                  </p>
                </div>
                <p className="font-medium text-[#8B4513]">
                  {MetricsUtils.formatCurrency(item.cost)}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t">
            <div className="flex justify-between items-center">
              <span className="font-medium">Total Inventory Value:</span>
              <span className="text-lg font-bold text-[#8B4513]">
                {MetricsUtils.formatCurrency(metrics.inventoryInsights.inventoryValue)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderTrends = () => (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <TrendingUp className="h-5 w-5" />
          <span>7-Day Revenue Trend</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={metrics.trends.last7Days}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip 
              formatter={(value, name) => [
                name === 'revenue' || name === 'profit' 
                  ? MetricsUtils.formatCurrency(value as number)
                  : value,
                name
              ]}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="revenue" 
              stroke="#8B4513" 
              strokeWidth={2}
              name="Revenue"
            />
            <Line 
              type="monotone" 
              dataKey="orders" 
              stroke="#D2691E" 
              strokeWidth={2}
              name="Orders"
            />
            <Line 
              type="monotone" 
              dataKey="profit" 
              stroke="#CD853F" 
              strokeWidth={2}
              name="Profit"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )

  if (variant === 'compact') {
    return (
      <div className={className}>
        {renderRealtimeMetrics()}
      </div>
    )
  }

  if (variant === 'realtime') {
    return (
      <div className={className}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Real-time Metrics</h2>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <RefreshCw className="h-4 w-4" />
            <span>Auto-refreshing every 10s</span>
            {lastUpdated && (
              <span>• Last updated: {lastUpdated.toLocaleTimeString()}</span>
            )}
          </div>
        </div>
        {renderRealtimeMetrics()}
      </div>
    )
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold">Business Metrics Dashboard</h2>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4" />
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value as any)}
              className="border rounded px-3 py-1"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>
          <Button onClick={refresh} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {renderRealtimeMetrics()}

      <Tabs defaultValue="sales" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="sales">Sales Analytics</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="operations">Operations</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="mt-6">
          {renderSalesAnalytics()}
        </TabsContent>

        <TabsContent value="inventory" className="mt-6">
          {renderInventoryInsights()}
        </TabsContent>

        <TabsContent value="operations" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Order Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(metrics.operationalMetrics.orderStatusDistribution).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between">
                      <span className="capitalize">{status}</span>
                      <Badge variant="outline">{count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Peak Hours</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {metrics.operationalMetrics.peakHours.map((hour, index) => (
                    <div key={hour.hour} className="flex items-center justify-between">
                      <span>{hour.hour}</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-[#8B4513] h-2 rounded-full" 
                            style={{ 
                              width: `${(hour.orderCount / metrics.operationalMetrics.peakHours[0].orderCount) * 100}%` 
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium">{hour.orderCount}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="mt-6">
          {renderTrends()}
        </TabsContent>
      </Tabs>

      {lastUpdated && (
        <div className="text-center text-sm text-gray-500 mt-6">
          Last updated: {lastUpdated.toLocaleString()}
        </div>
      )}
    </div>
  )
}