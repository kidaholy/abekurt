import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/auth-context'

export interface BusinessMetrics {
  realTimeMetrics: {
    todayRevenue: number
    todayOrders: number
    activeOrders: number
    completionRate: number
    averageOrderValue: number
    hourlyRevenue: Array<{ hour: string; revenue: number; orders: number }>
  }
  salesAnalytics: {
    topSellingItems: Array<{ name: string; quantity: number; revenue: number; category: string }>
    categoryPerformance: Array<{ category: string; revenue: number; orders: number; percentage: number }>
    paymentMethodBreakdown: Record<string, { amount: number; count: number; percentage: number }>
    revenueGrowth: {
      daily: number
      weekly: number
      monthly: number
    }
  }
  inventoryInsights: {
    lowStockAlerts: Array<{ name: string; current: number; minimum: number; unit: string; urgency: 'critical' | 'warning' }>
    stockConsumption: Array<{ name: string; consumed: number; unit: string; cost: number }>
    inventoryValue: number
    stockTurnover: Array<{ name: string; turnoverRate: number; daysToRestock: number }>
  }
  operationalMetrics: {
    orderStatusDistribution: Record<string, number>
    averagePreparationTime: number
    peakHours: Array<{ hour: string; orderCount: number }>
    customerSatisfaction: {
      completedOrders: number
      cancelledOrders: number
      successRate: number
    }
  }
  financialOverview: {
    grossRevenue: number
    totalExpenses: number
    netProfit: number
    profitMargin: number
    costBreakdown: {
      otherExpenses: number
      stockCosts: number
    }
  }
  trends: {
    last7Days: Array<{ date: string; revenue: number; orders: number; profit: number }>
    monthlyComparison: Array<{ month: string; revenue: number; growth: number }>
  }
}

interface UseBusinessMetricsOptions {
  period?: 'today' | 'week' | 'month' | 'year'
  includeHistorical?: boolean
  autoRefresh?: boolean
  refreshInterval?: number
}

interface UseBusinessMetricsReturn {
  metrics: BusinessMetrics | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  lastUpdated: Date | null
}

export function useBusinessMetrics(options: UseBusinessMetricsOptions = {}): UseBusinessMetricsReturn {
  const {
    period = 'today',
    includeHistorical = false,
    autoRefresh = false,
    refreshInterval = 30000 // 30 seconds
  } = options

  const { token } = useAuth()
  const [metrics, setMetrics] = useState<BusinessMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchMetrics = useCallback(async () => {
    if (!token) {
      setError('Authentication required')
      setLoading(false)
      return
    }

    try {
      setError(null)

      const params = new URLSearchParams({
        period,
        historical: includeHistorical.toString()
      })

      const response = await fetch(`/api/business-metrics?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to fetch business metrics')
      }

      const data = await response.json()
      setMetrics(data)
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Business metrics fetch error:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics')
    } finally {
      setLoading(false)
    }
  }, [token, period, includeHistorical])

  // Initial fetch
  useEffect(() => {
    fetchMetrics()
  }, [fetchMetrics])

  // Auto-refresh setup
  useEffect(() => {
    if (!autoRefresh || !token) return

    const interval = setInterval(() => {
      fetchMetrics()
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, fetchMetrics, token])

  return {
    metrics,
    loading,
    error,
    refresh: fetchMetrics,
    lastUpdated
  }
}

// Utility hooks for specific metric sections
export function useRealtimeMetrics(options?: UseBusinessMetricsOptions) {
  const { metrics, loading, error, refresh, lastUpdated } = useBusinessMetrics({
    ...options,
    autoRefresh: true,
    refreshInterval: 10000 // 10 seconds for real-time data
  })

  return {
    realTimeMetrics: metrics?.realTimeMetrics || null,
    loading,
    error,
    refresh,
    lastUpdated
  }
}

export function useSalesAnalytics(options?: UseBusinessMetricsOptions) {
  const { metrics, loading, error, refresh, lastUpdated } = useBusinessMetrics(options)

  return {
    salesAnalytics: metrics?.salesAnalytics || null,
    loading,
    error,
    refresh,
    lastUpdated
  }
}

export function useInventoryInsights(options?: UseBusinessMetricsOptions) {
  const { metrics, loading, error, refresh, lastUpdated } = useBusinessMetrics(options)

  return {
    inventoryInsights: metrics?.inventoryInsights || null,
    loading,
    error,
    refresh,
    lastUpdated
  }
}

export function useFinancialOverview(options?: UseBusinessMetricsOptions) {
  const { metrics, loading, error, refresh, lastUpdated } = useBusinessMetrics(options)

  return {
    financialOverview: metrics?.financialOverview || null,
    loading,
    error,
    refresh,
    lastUpdated
  }
}

// Helper functions for metric calculations
export const MetricsUtils = {
  formatCurrency: (amount: number): string => {
    return `${amount.toLocaleString()} Br`
  },

  formatPercentage: (value: number): string => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`
  },

  getGrowthColor: (growth: number): string => {
    if (growth > 0) return 'text-green-600'
    if (growth < 0) return 'text-red-600'
    return 'text-gray-600'
  },

  getUrgencyColor: (urgency: 'critical' | 'warning'): string => {
    return urgency === 'critical' ? 'text-red-600' : 'text-yellow-600'
  },

  calculateTrend: (data: Array<{ value: number }>): 'up' | 'down' | 'stable' => {
    if (data.length < 2) return 'stable'
    const recent = data.slice(-3).reduce((sum, item) => sum + item.value, 0) / 3
    const previous = data.slice(-6, -3).reduce((sum, item) => sum + item.value, 0) / 3

    if (recent > previous * 1.05) return 'up'
    if (recent < previous * 0.95) return 'down'
    return 'stable'
  }
}