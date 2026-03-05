"use client"

import { useEffect, useState } from "react"
import { ProtectedRoute } from "@/components/protected-route"
import { BentoNavbar } from "@/components/bento-navbar"
import { useAuth } from "@/context/auth-context"
import { useLanguage } from "@/context/language-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ShoppingBag, Clock, DollarSign, CheckCircle, XCircle, RefreshCw, TrendingUp } from 'lucide-react'

interface OrderItem {
  menuItemId: string
  name: string
  quantity: number
  price: number
}

interface Order {
  _id: string
  orderNumber: string
  items: OrderItem[]
  totalAmount: number
  paymentMethod: string
  status: "preparing" | "ready" | "completed" | "cancelled"
  tableNumber: string
  batchNumber?: string
  createdAt: string
  updatedAt: string
  isDeleted?: boolean
}

export default function CashierOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<"all" | "preparing" | "completed">("all")
  const { token, user } = useAuth()
  const { t } = useLanguage()

  useEffect(() => {
    fetchOrders()
    const interval = setInterval(fetchOrders, 5000)
    const handleRefresh = () => fetchOrders()
    window.addEventListener('focus', handleRefresh)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'orderUpdated' || e.key === 'newOrderCreated') handleRefresh()
    }
    window.addEventListener('storage', handleStorage)
    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', handleRefresh)
      window.removeEventListener('storage', handleStorage)
    }
  }, [token])

  const fetchOrders = async () => {
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const response = await fetch(`/api/orders?startDate=${today.toISOString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) setOrders(await response.json())
    } catch (err) {
      console.error("Failed to load orders")
    } finally {
      setLoading(false)
    }
  }

  const isDeletedOrder = (o: Order) => !!o.isDeleted || o.status === "cancelled"

  const filteredOrders = filterStatus === "all"
    ? orders.filter(o => !isDeletedOrder(o))
    : orders.filter((o) => o.status === filterStatus && !isDeletedOrder(o))

  const stats = {
    total: orders.filter(o => !isDeletedOrder(o)).length,
    preparing: orders.filter((o) => !isDeletedOrder(o) && ((o.status as string) === "preparing" || (o.status as string) === "pending")).length,
    completed: orders.filter((o) => !isDeletedOrder(o) && o.status === "completed").length,
    // Today's revenue includes all non-cancelled orders
    revenue: orders.filter((o) => !isDeletedOrder(o)).reduce((sum, o) => sum + o.totalAmount, 0),
    // Completed revenue for reference
    completedRevenue: orders.filter((o) => !isDeletedOrder(o) && o.status === "completed").reduce((sum, o) => sum + o.totalAmount, 0),
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-50 text-green-700 border-green-200'
      case 'preparing': return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'ready': return 'bg-teal-50 text-teal-700 border-teal-200'
      case 'cancelled': return 'bg-red-50 text-red-700 border-red-200'
      default: return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  return (
    <ProtectedRoute requiredRoles={["cashier"]}>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <BentoNavbar />

          {/* Header */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <ShoppingBag className="h-8 w-8 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Recent Orders</h1>
                  <p className="text-sm text-gray-600 mt-1">
                    Today's sales history
                    {user?.batchNumber && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-600">
                        Batch #{user.batchNumber}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {/* Today's Revenue Card */}
                <div className="bg-gradient-to-br from-emerald-50 to-green-100 rounded-xl p-4 border border-emerald-200 shadow-sm min-w-[180px]">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                    <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Today's Revenue</span>
                  </div>
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin text-emerald-600" />
                      <span className="text-lg font-bold text-emerald-800">Loading...</span>
                    </div>
                  ) : (
                    <>
                      <div className="text-2xl font-bold text-emerald-800">
                        {stats.revenue.toLocaleString()} Br
                      </div>
                      <div className="text-xs text-emerald-600 mt-1">
                        {stats.total} order{stats.total !== 1 ? 's' : ''} today
                      </div>
                    </>
                  )}
                </div>
                <button
                  onClick={fetchOrders}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <RefreshCw className="h-5 w-5 text-gray-600" />
                </button>
              </div>
            </div>
          </div>


          {/* Orders List */}
          <Card className="border border-gray-200">
            <CardHeader>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <CardTitle className="text-xl font-bold text-gray-900">Sales History</CardTitle>
                <div className="flex gap-2">
                  {["all", "preparing", "completed"].map((s) => (
                    <button
                      key={s}
                      onClick={() => setFilterStatus(s as any)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filterStatus === s
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                    >
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <RefreshCw className="h-12 w-12 animate-spin text-gray-400 mb-4" />
                  <p className="text-gray-600">Loading orders...</p>
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="text-center py-20">
                  <ShoppingBag className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">No orders found</p>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-6 md:mx-0">
                  <table className="w-full min-w-[600px] md:min-w-0">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50/50">
                        <th className="text-left py-4 px-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Order</th>
                        <th className="text-left py-4 px-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Context</th>
                        <th className="text-left py-4 px-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Items</th>
                        <th className="text-right py-4 px-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Amount</th>
                        <th className="text-center py-4 px-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.map((order) => (
                        <tr key={order._id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="py-4 px-6">
                            <div className="flex flex-col">
                              <span className="text-sm font-black text-gray-900">#{order.orderNumber}</span>
                              <span className="text-[10px] text-gray-400 font-bold">
                                {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex flex-col gap-1">
                              <span className="inline-flex items-center px-2 py-0.5 rounded bg-purple-50 text-purple-700 text-[10px] font-black border border-purple-100 w-fit">
                                {order.batchNumber ? `Batch #${order.batchNumber}` : 'Global'}
                              </span>
                              <span className="inline-flex items-center px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-black border border-blue-100 w-fit">
                                Table {order.tableNumber}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="text-xs text-gray-600">
                              {order.items.slice(0, 2).map((item, idx) => (
                                <div key={idx} className="truncate max-w-[120px]">
                                  {item.name} <span className="text-gray-400 font-bold">×{item.quantity}</span>
                                </div>
                              ))}
                              {order.items.length > 2 && (
                                <div className="text-[10px] text-gray-400 font-black uppercase mt-1">+{order.items.length - 2} more items</div>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <span className="text-sm font-black text-[#2d5a41]">{order.totalAmount.toFixed(0)} ETB</span>
                          </td>
                          <td className="py-4 px-6 text-center">
                            <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase ${getStatusColor(order.status)}`}>
                              {order.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  )
}
