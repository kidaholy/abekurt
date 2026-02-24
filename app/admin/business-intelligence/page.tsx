"use client"

import { useEffect, useState } from "react"
import { ProtectedRoute } from "@/components/protected-route"
import { BentoNavbar } from "@/components/bento-navbar"
import { useAuth } from "@/context/auth-context"
import { useLanguage } from "@/context/language-context"
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, ScatterChart, Scatter
} from 'recharts'

interface BusinessMetrics {
  revenue: {
    total: number
    daily: Array<{ date: string; amount: number; orders: number }>
    weekly: Array<{ week: string; amount: number; orders: number }>
    monthly: Array<{ month: string; amount: number; orders: number }>
  }
  expenses: {
    total: number
    daily: Array<{ date: string; amount: number; breakdown: any }>
    categories: Array<{ category: string; amount: number; percentage: number }>
  }
  profitability: {
    grossProfit: number
    netProfit: number
    profitMargin: number
    daily: Array<{ date: string; revenue: number; expenses: number; profit: number }>
  }
  inventory: {
    totalValue: number
    lowStockItems: Array<{ name: string; quantity: number; unit: string; status: string }>
    stockTurnover: Array<{ item: string; consumed: number; remaining: number; turnoverRate: number }>
  }
  orderAnalytics: {
    totalOrders: number
    averageOrderValue: number
    topSellingItems: Array<{ name: string; quantity: number; revenue: number }>
    ordersByStatus: Array<{ status: string; count: number; percentage: number }>
    peakHours: Array<{ hour: number; orders: number }>
  }
  trends: {
    revenueGrowth: number
    orderGrowth: number
    expenseGrowth: number
    profitGrowth: number
  }
}

interface InventoryInsights {
  stockMovement: Array<{
    item: string
    consumed: number
    purchased: number
    netChange: number
    currentStock: number
    daysUntilEmpty: number
  }>
  reorderRecommendations: Array<{
    item: string
    currentStock: number
    recommendedOrder: number
    urgency: 'low' | 'medium' | 'high' | 'critical'
    estimatedCost: number
  }>
  profitabilityByItem: Array<{
    menuItem: string
    stockCost: number
    sellingPrice: number
    profitMargin: number
    quantitySold: number
    totalProfit: number
  }>
}

interface SalesForecasting {
  dailyForecast: Array<{
    date: string
    predictedRevenue: number
    predictedOrders: number
    confidence: number
  }>
  itemDemandForecast: Array<{
    item: string
    predictedDemand: number
    trend: 'increasing' | 'decreasing' | 'stable'
    seasonality: number
  }>
  patterns: {
    bestDays: Array<{ day: string; averageRevenue: number }>
    bestHours: Array<{ hour: number; averageOrders: number }>
  }
}

export default function BusinessIntelligencePage() {
  const [businessMetrics, setBusinessMetrics] = useState<BusinessMetrics | null>(null)
  const [inventoryInsights, setInventoryInsights] = useState<InventoryInsights | null>(null)
  const [salesForecasting, setSalesForecasting] = useState<SalesForecasting | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'inventory' | 'forecasting'>('overview')
  const [period, setPeriod] = useState('30')
  const { token } = useAuth()
  const { t } = useLanguage()

  useEffect(() => {
    fetchAllData()
  }, [token, period])

  const fetchAllData = async () => {
    setLoading(true)
    try {
      const [businessRes, inventoryRes, forecastRes] = await Promise.all([
        fetch(`/api/analytics/business-intelligence?period=${period}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`/api/analytics/inventory-insights?days=${period}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`/api/analytics/sales-forecasting?days=30&historical=${period}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ])

      if (businessRes.ok) {
        const businessData = await businessRes.json()
        setBusinessMetrics(businessData)
      }

      if (inventoryRes.ok) {
        const inventoryData = await inventoryRes.json()
        setInventoryInsights(inventoryData)
      }

      if (forecastRes.ok) {
        const forecastData = await forecastRes.json()
        setSalesForecasting(forecastData)
      }
    } catch (error) {
      console.error("Failed to fetch business intelligence data:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <ProtectedRoute requiredRoles={["admin"]}>
        <div className="min-h-screen bg-white p-4 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl animate-bounce mb-4">🧠</div>
            <p className="text-xl font-bold text-[#8B4513]">Loading Business Intelligence...</p>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requiredRoles={["admin"]}>
      <div className="min-h-screen bg-white p-4 font-sans text-slate-800">
        <div className="max-w-7xl mx-auto">
          <BentoNavbar />

          {/* Header */}
          <div className="bg-gradient-to-r from-[#8B4513] to-[#D2691E] rounded-[40px] p-8 mb-6 text-white">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h1 className="text-4xl font-bold mb-2">🧠 Business Intelligence</h1>
                <p className="opacity-90">Advanced analytics and insights for data-driven decisions</p>
              </div>
              <div className="flex gap-2">
                <select 
                  value={period} 
                  onChange={(e) => setPeriod(e.target.value)}
                  className="px-4 py-2 rounded-2xl bg-white/20 text-white border border-white/30 backdrop-blur-sm"
                >
                  <option value="7">Last 7 days</option>
                  <option value="30">Last 30 days</option>
                  <option value="90">Last 90 days</option>
                </select>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2 mb-6 bg-gray-100 p-2 rounded-3xl">
            {[
              { key: 'overview', label: '📊 Overview', icon: '📊' },
              { key: 'inventory', label: '📦 Inventory', icon: '📦' },
              { key: 'forecasting', label: '🔮 Forecasting', icon: '🔮' }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex-1 py-3 px-6 rounded-2xl font-bold transition-all ${
                  activeTab === tab.key
                    ? 'bg-[#8B4513] text-white shadow-lg'
                    : 'text-gray-600 hover:bg-white hover:shadow-md'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && businessMetrics && (
            <div className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard
                  title="Total Revenue"
                  value={`${businessMetrics.revenue.total.toFixed(0)} Br`}
                  trend={businessMetrics.trends.revenueGrowth}
                  icon="💰"
                  color="green"
                />
                <MetricCard
                  title="Gross Profit"
                  value={`${businessMetrics.profitability.grossProfit.toFixed(0)} Br`}
                  trend={businessMetrics.trends.profitGrowth}
                  icon="📈"
                  color="blue"
                />
                <MetricCard
                  title="Total Orders"
                  value={businessMetrics.orderAnalytics.totalOrders.toString()}
                  trend={businessMetrics.trends.orderGrowth}
                  icon="📋"
                  color="purple"
                />
                <MetricCard
                  title="Profit Margin"
                  value={`${businessMetrics.profitability.profitMargin.toFixed(1)}%`}
                  trend={0}
                  icon="💎"
                  color="orange"
                />
              </div>

              {/* Charts Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue vs Expenses */}
                <ChartCard title="📊 Revenue vs Expenses" subtitle="Daily comparison">
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={businessMetrics.profitability.daily}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" stroke="#8B4513" fontSize={12} />
                      <YAxis stroke="#8B4513" fontSize={12} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#8B4513', 
                          border: 'none', 
                          borderRadius: '12px',
                          color: 'white'
                        }} 
                      />
                      <Area type="monotone" dataKey="revenue" stackId="1" stroke="#8B4513" fill="#8B4513" fillOpacity={0.6} />
                      <Area type="monotone" dataKey="expenses" stackId="2" stroke="#D2691E" fill="#D2691E" fillOpacity={0.6} />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartCard>

                {/* Top Selling Items */}
                <ChartCard title="🏆 Top Selling Items" subtitle="By revenue">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={businessMetrics.orderAnalytics.topSellingItems.slice(0, 8)} layout="horizontal">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis type="number" stroke="#8B4513" fontSize={12} />
                      <YAxis dataKey="name" type="category" stroke="#8B4513" fontSize={10} width={80} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#D2691E', 
                          border: 'none', 
                          borderRadius: '12px',
                          color: 'white'
                        }} 
                      />
                      <Bar dataKey="revenue" fill="#D2691E" radius={[0, 8, 8, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>

                {/* Peak Hours */}
                <ChartCard title="⏰ Peak Hours Analysis" subtitle="Orders by hour">
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={businessMetrics.orderAnalytics.peakHours}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="hour" stroke="#8B4513" fontSize={12} />
                      <YAxis stroke="#8B4513" fontSize={12} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#CD853F', 
                          border: 'none', 
                          borderRadius: '12px',
                          color: 'white'
                        }} 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="orders" 
                        stroke="#CD853F" 
                        strokeWidth={3}
                        dot={{ fill: '#8B4513', strokeWidth: 2, r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartCard>

                {/* Expense Categories */}
                <ChartCard title="💸 Expense Breakdown" subtitle="By category">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={businessMetrics.expenses.categories.slice(0, 6)}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={120}
                        paddingAngle={5}
                        dataKey="amount"
                      >
                        {businessMetrics.expenses.categories.slice(0, 6).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={['#8B4513', '#D2691E', '#CD853F', '#DEB887', '#F4A460', '#D2B48C'][index]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#8B4513', 
                          border: 'none', 
                          borderRadius: '12px',
                          color: 'white'
                        }} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartCard>
              </div>

              {/* Low Stock Alert */}
              {businessMetrics.inventory.lowStockItems.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-3xl p-6">
                  <h3 className="text-lg font-bold text-red-800 mb-4 flex items-center gap-2">
                    ⚠️ Low Stock Alert
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {businessMetrics.inventory.lowStockItems.map((item, index) => (
                      <div key={index} className="bg-white p-4 rounded-2xl border border-red-200">
                        <p className="font-bold text-red-800">{item.name}</p>
                        <p className="text-sm text-red-600">{item.quantity} {item.unit} remaining</p>
                        <p className="text-xs text-red-500 capitalize">Status: {item.status}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Inventory Tab */}
          {activeTab === 'inventory' && inventoryInsights && (
            <div className="space-y-6">
              {/* Reorder Recommendations */}
              <div className="bg-white rounded-3xl p-6 shadow-lg">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  🚨 Reorder Recommendations
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {inventoryInsights.reorderRecommendations.map((item, index) => (
                    <div 
                      key={index} 
                      className={`p-4 rounded-2xl border-2 ${
                        item.urgency === 'critical' ? 'border-red-500 bg-red-50' :
                        item.urgency === 'high' ? 'border-orange-500 bg-orange-50' :
                        item.urgency === 'medium' ? 'border-yellow-500 bg-yellow-50' :
                        'border-green-500 bg-green-50'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold">{item.item}</h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                          item.urgency === 'critical' ? 'bg-red-500 text-white' :
                          item.urgency === 'high' ? 'bg-orange-500 text-white' :
                          item.urgency === 'medium' ? 'bg-yellow-500 text-white' :
                          'bg-green-500 text-white'
                        }`}>
                          {item.urgency.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">Current: {item.currentStock}</p>
                      <p className="text-sm text-gray-600">Recommended: {item.recommendedOrder}</p>
                      <p className="text-sm font-bold text-[#8B4513]">Cost: {item.estimatedCost.toFixed(0)} Br</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stock Movement */}
              <ChartCard title="📦 Stock Movement Analysis" subtitle="Consumption vs Purchases">
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={inventoryInsights.stockMovement.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="item" stroke="#8B4513" fontSize={12} angle={-45} textAnchor="end" height={80} />
                    <YAxis stroke="#8B4513" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#8B4513', 
                        border: 'none', 
                        borderRadius: '12px',
                        color: 'white'
                      }} 
                    />
                    <Bar dataKey="consumed" fill="#D2691E" name="Consumed" />
                    <Bar dataKey="purchased" fill="#8B4513" name="Purchased" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* Profitability by Item */}
              <ChartCard title="💰 Profitability by Menu Item" subtitle="Profit margin analysis">
                <ResponsiveContainer width="100%" height={400}>
                  <ScatterChart data={inventoryInsights.profitabilityByItem.slice(0, 15)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="quantitySold" stroke="#8B4513" fontSize={12} name="Quantity Sold" />
                    <YAxis dataKey="profitMargin" stroke="#8B4513" fontSize={12} name="Profit Margin %" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#CD853F', 
                        border: 'none', 
                        borderRadius: '12px',
                        color: 'white'
                      }}
                      formatter={(value, name) => [
                        name === 'profitMargin' ? `${value}%` : value,
                        name === 'profitMargin' ? 'Profit Margin' : 'Quantity Sold'
                      ]}
                    />
                    <Scatter dataKey="profitMargin" fill="#CD853F" />
                  </ScatterChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
          )}

          {/* Forecasting Tab */}
          {activeTab === 'forecasting' && salesForecasting && (
            <div className="space-y-6">
              {/* Revenue Forecast */}
              <ChartCard title="🔮 Revenue Forecast" subtitle="Next 30 days prediction">
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={salesForecasting.dailyForecast}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" stroke="#8B4513" fontSize={12} />
                    <YAxis stroke="#8B4513" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#8B4513', 
                        border: 'none', 
                        borderRadius: '12px',
                        color: 'white'
                      }} 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="predictedRevenue" 
                      stroke="#8B4513" 
                      strokeWidth={3}
                      strokeDasharray="5 5"
                      dot={{ fill: '#D2691E', strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* Demand Forecast */}
              <ChartCard title="📈 Item Demand Forecast" subtitle="Predicted demand trends">
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={salesForecasting.itemDemandForecast.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="item" stroke="#8B4513" fontSize={12} angle={-45} textAnchor="end" height={80} />
                    <YAxis stroke="#8B4513" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#D2691E', 
                        border: 'none', 
                        borderRadius: '12px',
                        color: 'white'
                      }} 
                    />
                    <Bar 
                      dataKey="predictedDemand" 
                      fill="#8B4513"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* Best Performance Patterns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-3xl p-6 shadow-lg">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    📅 Best Days
                  </h3>
                  <div className="space-y-3">
                    {salesForecasting.patterns.bestDays.slice(0, 5).map((day, index) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-2xl">
                        <span className="font-medium">{day.day}</span>
                        <span className="font-bold text-[#8B4513]">{day.averageRevenue} Br</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-3xl p-6 shadow-lg">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    ⏰ Peak Hours
                  </h3>
                  <div className="space-y-3">
                    {salesForecasting.patterns.bestHours.slice(0, 5).map((hour, index) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-2xl">
                        <span className="font-medium">{hour.hour}:00</span>
                        <span className="font-bold text-[#8B4513]">{hour.averageOrders} orders</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}

function MetricCard({ title, value, trend, icon, color }: {
  title: string
  value: string
  trend: number
  icon: string
  color: 'green' | 'blue' | 'purple' | 'orange'
}) {
  const colors = {
    green: 'bg-green-50 border-green-200 text-green-800',
    blue: 'bg-blue-50 border-blue-200 text-blue-800',
    purple: 'bg-purple-50 border-purple-200 text-purple-800',
    orange: 'bg-orange-50 border-orange-200 text-orange-800'
  }

  return (
    <div className={`p-6 rounded-3xl border-2 ${colors[color]}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{icon}</span>
        {trend !== 0 && (
          <span className={`text-xs font-bold px-2 py-1 rounded-full ${
            trend > 0 ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
          }`}>
            {trend > 0 ? '+' : ''}{trend.toFixed(1)}%
          </span>
        )}
      </div>
      <div className="text-2xl font-bold mb-1">{value}</div>
      <div className="text-sm opacity-70">{title}</div>
    </div>
  )
}

function ChartCard({ title, subtitle, children }: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-3xl p-6 shadow-lg">
      <div className="mb-4">
        <h3 className="text-lg font-bold">{title}</h3>
        {subtitle && <p className="text-sm text-gray-600">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}