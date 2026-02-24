"use client"

import { useEffect, useState } from "react"
import { ProtectedRoute } from "@/components/protected-route"
import { BentoNavbar } from "@/components/bento-navbar"
import { useAuth } from "@/context/auth-context"
import { useLanguage } from "@/context/language-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ShoppingBag, Clock, DollarSign, CheckCircle, XCircle, RefreshCw } from 'lucide-react'

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
  status: "pending" | "completed" | "cancelled"
  tableNumber: string
  floorName?: string
  createdAt: string
  updatedAt: string
}

export default function CashierOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "completed" | "cancelled">("all")
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

  const filteredOrders = filterStatus === "all" ? orders : orders.filter((o) => o.status === filterStatus)

  const stats = {
    total: orders.length,
    pending: orders.filter((o) => o.status === "pending").length,
    completed: orders.filter((o) => o.status === "completed").length,
    revenue: orders.filter((o) => o.status === "completed").reduce((sum, o) => sum + o.totalAmount, 0),
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-50 text-green-700 border-green-200'
      case 'pending': return 'bg-orange-50 text-orange-700 border-orange-200'
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
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <ShoppingBag className="h-8 w-8 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Recent Orders</h1>
                  <p className="text-sm text-gray-600 mt-1">
                    Today's sales history
                    {user?.floorName && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-600">
                        {user.floorName}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <button
                onClick={fetchOrders}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <RefreshCw className="h-5 w-5 text-gray-600" />
              </button>
            </div>
          </div>


          {/* Orders List */}
          <Card className="border border-gray-200">
            <CardHeader>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <CardTitle className="text-xl font-bold text-gray-900">Sales History</CardTitle>
                <div className="flex gap-2">
                  {["all", "pending", "completed", "cancelled"].map((s) => (
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
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Order #</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Floor</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Table</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Items</th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Amount</th>
                        <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.map((order) => (
                        <tr key={order._id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="py-4 px-4">
                            <span className="text-sm font-medium text-gray-900">#{order.orderNumber}</span>
                          </td>
                          <td className="py-4 px-4">
                            <span className="text-sm font-medium text-purple-600">{order.floorName || '—'}</span>
                          </td>
                          <td className="py-4 px-4">
                            <span className="text-sm font-medium text-blue-600">{order.tableNumber}</span>
                          </td>
                          <td className="py-4 px-4">
                            <div className="text-sm text-gray-600">
                              {order.items.slice(0, 2).map((item, idx) => (
                                <div key={idx}>
                                  {item.name} x{item.quantity}
                                </div>
                              ))}
                              {order.items.length > 2 && (
                                <div className="text-xs text-gray-400">+{order.items.length - 2} more</div>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <span className="text-sm font-bold text-gray-900">{order.totalAmount.toFixed(0)} ETB</span>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                              {order.status}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <div className="text-sm text-gray-600">
                              {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
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
