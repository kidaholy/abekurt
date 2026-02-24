"use client"

import { useEffect, useState } from "react"
import { ProtectedRoute } from "@/components/protected-route"
import { BentoNavbar } from "@/components/bento-navbar"
import { useAuth } from "@/context/auth-context"
import { useLanguage } from "@/context/language-context"
import { useBusinessMetrics, MetricsUtils } from "@/hooks/use-business-metrics"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import {
  DollarSign,
  ShoppingCart,
  Package,
  AlertTriangle,
  RefreshCw,
  BarChart3,
  TrendingUp,
  Clock
} from 'lucide-react'

export default function AdminDashboardPage() {
  const { token } = useAuth()
  const { t } = useLanguage()

  const { metrics, loading, error, refresh, lastUpdated } = useBusinessMetrics({
    period: 'today',
    autoRefresh: true,
    refreshInterval: 60000
  })

  if (loading && !metrics) {
    return (
      <ProtectedRoute requiredRoles={["admin"]}>
        <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
          <div className="flex items-center space-x-3">
            <RefreshCw className="h-8 w-8 animate-spin text-[#8B4513]" />
            <div className="text-xl font-medium text-gray-700">Loading...</div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  if (error) {
    return (
      <ProtectedRoute requiredRoles={["admin"]}>
        <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
          <Card className="border-red-200 max-w-md">
            <CardContent className="p-6 text-center">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-red-600 mb-2">Error Loading Data</h2>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button onClick={refresh} className="bg-[#8B4513] hover:bg-[#D2691E]">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requiredRoles={["admin"]}>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <BentoNavbar />

          {/* Simple Header */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">Dashboard</h1>
                <p className="text-sm md:text-base text-gray-600">Welcome back! Here's your business overview for today.</p>
                {lastUpdated && (
                  <p className="text-sm text-gray-500 mt-2 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Last updated: {lastUpdated.toLocaleTimeString()}
                  </p>
                )}
              </div>
              <Button
                onClick={refresh}
                variant="outline"
                size="sm"
                className="border-gray-300"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>

          {/* Key Metrics - Large and Clear */}
          {metrics && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <MetricCard
                icon={<DollarSign className="h-6 w-6" />}
                label="Today's Revenue"
                value={MetricsUtils.formatCurrency(metrics.realTimeMetrics.todayRevenue)}
                color="green"
              />
              <MetricCard
                icon={<ShoppingCart className="h-6 w-6" />}
                label="Total Orders"
                value={metrics.realTimeMetrics.todayOrders.toString()}
                subtext={`${metrics.operationalMetrics.customerSatisfaction.completedOrders} completed`}
                color="blue"
              />
              <MetricCard
                icon={<TrendingUp className="h-6 w-6" />}
                label="Average Order"
                value={MetricsUtils.formatCurrency(metrics.realTimeMetrics.averageOrderValue)}
                color="purple"
              />
              <MetricCard
                icon={<Package className="h-6 w-6" />}
                label="Stock Alerts"
                value={metrics.inventoryInsights.lowStockAlerts.length.toString()}
                color={metrics.inventoryInsights.lowStockAlerts.length > 0 ? "red" : "gray"}
                isAlert={metrics.inventoryInsights.lowStockAlerts.length > 0}
              />
            </div>
          )}

          {/* Quick Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <Link href="/admin/reports">
              <Card className="hover:shadow-md transition-shadow cursor-pointer border-gray-200">
                <CardContent className="p-6 text-center">
                  <BarChart3 className="h-10 w-10 text-[#8B4513] mx-auto mb-3" />
                  <h3 className="font-semibold text-lg text-gray-900 mb-1">View Reports</h3>
                  <p className="text-sm text-gray-600">Sales and analytics</p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/admin/stock">
              <Card className="hover:shadow-md transition-shadow cursor-pointer border-gray-200">
                <CardContent className="p-6 text-center">
                  <Package className="h-10 w-10 text-[#8B4513] mx-auto mb-3" />
                  <h3 className="font-semibold text-lg text-gray-900 mb-1">Manage Stock</h3>
                  <p className="text-sm text-gray-600">Update inventory</p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/admin/menu">
              <Card className="hover:shadow-md transition-shadow cursor-pointer border-gray-200">
                <CardContent className="p-6 text-center">
                  <ShoppingCart className="h-10 w-10 text-[#8B4513] mx-auto mb-3" />
                  <h3 className="font-semibold text-lg text-gray-900 mb-1">Update Menu</h3>
                  <p className="text-sm text-gray-600">Add or modify items</p>
                </CardContent>
              </Card>
            </Link>
          </div>

          {/* Stock Alerts */}
          {metrics && metrics.inventoryInsights.lowStockAlerts.length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-800 text-lg">
                  <AlertTriangle className="h-5 w-5" />
                  <span>Stock Alerts ({metrics.inventoryInsights.lowStockAlerts.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {metrics.inventoryInsights.lowStockAlerts.slice(0, 5).map((alert, index) => (
                    <div key={index} className="flex justify-between items-center p-4 bg-white rounded-lg border border-red-200">
                      <div>
                        <p className="font-medium text-gray-900">{alert.name}</p>
                        <p className="text-sm text-gray-600">{alert.current} {alert.unit} remaining</p>
                      </div>
                      <span className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded-full font-medium">
                        {alert.urgency}
                      </span>
                    </div>
                  ))}
                  {metrics.inventoryInsights.lowStockAlerts.length > 5 && (
                    <Link href="/admin/stock" className="block text-center p-2 text-red-600 hover:underline text-sm">
                      View all {metrics.inventoryInsights.lowStockAlerts.length} alerts
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}

function MetricCard({
  icon,
  label,
  value,
  subtext,
  color = "gray",
  isAlert = false
}: {
  icon: React.ReactNode
  label: string
  value: string
  subtext?: string
  color?: "green" | "blue" | "purple" | "red" | "gray"
  isAlert?: boolean
}) {
  const colorClasses = {
    green: "bg-green-50 text-green-600 border-green-200",
    blue: "bg-blue-50 text-blue-600 border-blue-200",
    purple: "bg-purple-50 text-purple-600 border-purple-200",
    red: "bg-red-50 text-red-600 border-red-200",
    gray: "bg-gray-50 text-gray-600 border-gray-200"
  }

  return (
    <Card className={`border ${isAlert ? colorClasses.red : 'border-gray-200'}`}>
      <CardContent className="p-6">
        <div className={`inline-flex p-3 rounded-lg ${colorClasses[color]} mb-4`}>
          {icon}
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-600">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subtext && <p className="text-xs text-gray-500">{subtext}</p>}
        </div>
      </CardContent>
    </Card>
  )
}
