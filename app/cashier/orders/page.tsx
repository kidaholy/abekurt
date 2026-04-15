"use client"

import { useEffect, useState, useMemo } from "react"
import { ProtectedRoute } from "@/components/protected-route"
import { BentoNavbar } from "@/components/bento-navbar"
import { useAuth } from "@/context/auth-context"
import { useLanguage } from "@/context/language-context"
import { useSettings } from "@/context/settings-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ShoppingBag, RefreshCw, MapPin } from 'lucide-react'
import { OrderDetailsModal } from "@/components/order-details-modal"

interface OrderItem {
  menuItemId: string
  name: string
  quantity: number
  price: number
  mainCategory?: string
  category?: string
}

interface Order {
  _id: string
  orderNumber: string
  items: OrderItem[]
  totalAmount: number
  paymentMethod: string
  status: "preparing" | "ready" | "served" | "completed" | "cancelled"
  tableNumber: string
  batchNumber?: string
  createdAt: string
  updatedAt: string
  isDeleted?: boolean
  distributions?: string[]
  distribution?: string
}

export default function CashierOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<"all" | "preparing" | "completed">("all")
  const [mainCategoryFilter, setMainCategoryFilter] = useState<"all" | "Food" | "Drinks">("all")
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const { token, user } = useAuth()
  const { t } = useLanguage()
  const { settings } = useSettings()

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

  const todayRevenue = useMemo(() => {
    let totalFood = 0
    let totalDrinks = 0

    orders.forEach((order) => {
      if (isDeletedOrder(order)) return

      order.items?.forEach((item: any) => {
        const itemRevenue = (item.price || 0) * (item.quantity || 0)
        if (item.mainCategory?.toLowerCase() === "drinks" || (item.category && item.category.toLowerCase().includes("drink"))) {
          totalDrinks += itemRevenue
        } else {
          totalFood += itemRevenue
        }
      })
    })

    return {
      food: totalFood,
      drinks: totalDrinks,
      total: totalFood + totalDrinks
    }
  }, [orders])

  const filteredOrders = orders.filter(o => {
    if (isDeletedOrder(o)) return false
    const matchesStatus = filterStatus === "all" || o.status === filterStatus
    const matchesCategory = mainCategoryFilter === "all" || o.items.some(item => (item as any).mainCategory === mainCategoryFilter)
    return matchesStatus && matchesCategory
  })



  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-50 text-green-700 border-green-200'
      case 'served': return 'bg-emerald-50 text-emerald-700 border-emerald-200'
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
              <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
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

                {settings.show_cashier_revenue === "true" && (
                  <div className="flex flex-wrap gap-4">
                    <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 px-4 py-2 rounded-2xl border border-emerald-100">
                      <p className="text-[10px] font-black text-emerald-800 uppercase tracking-widest mb-0.5">Total Revenue</p>
                      <p className="text-xl font-black text-emerald-900">{todayRevenue.total.toLocaleString()} <span className="text-[10px] opacity-70">ETB</span></p>
                    </div>
                    <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 px-4 py-2 rounded-2xl border border-orange-100">
                      <p className="text-[10px] font-black text-orange-800 uppercase tracking-widest mb-0.5">Food</p>
                      <p className="text-xl font-black text-orange-900">{todayRevenue.food.toLocaleString()} <span className="text-[10px] opacity-70">ETB</span></p>
                    </div>
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 px-4 py-2 rounded-2xl border border-blue-100">
                      <p className="text-[10px] font-black text-blue-800 uppercase tracking-widest mb-0.5">Drinks</p>
                      <p className="text-xl font-black text-blue-900">{todayRevenue.drinks.toLocaleString()} <span className="text-[10px] opacity-70">ETB</span></p>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-4">

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
                <div className="flex flex-wrap gap-2">
                  <div className="flex bg-gray-100 p-1 rounded-xl mr-4">
                    {["all", "Food", "Drinks"].map((c) => (
                      <button
                        key={c}
                        onClick={() => setMainCategoryFilter(c as any)}
                        className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase transition-all ${mainCategoryFilter === c
                          ? "bg-[#2d5a41] text-white shadow-sm"
                          : "text-gray-500 hover:text-gray-900"
                          }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                  <div className="flex bg-gray-100 p-1 rounded-xl">
                    {["all", "preparing", "completed"].map((s) => (
                      <button
                        key={s}
                        onClick={() => setFilterStatus(s as any)}
                        className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase transition-all ${filterStatus === s
                          ? "bg-blue-600 text-white shadow-sm"
                          : "text-gray-500 hover:text-gray-900"
                          }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
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
                              {((order.distributions && order.distributions.length > 0) || order.distribution) && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {order.distributions && order.distributions.length > 0 ? (
                                    order.distributions.map((d, i) => (
                                      <span key={i} className="text-[9px] font-black text-[#2d5a41] bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 uppercase tracking-tighter">
                                        {d}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-[9px] font-black text-[#2d5a41] bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 uppercase tracking-tighter">
                                      {order.distribution}
                                    </span>
                                  )}
                                </div>
                              )}
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

      <OrderDetailsModal 
        order={selectedOrder} 
        isOpen={!!selectedOrder} 
        onClose={() => setSelectedOrder(null)} 
      />
    </ProtectedRoute>
  )
}
