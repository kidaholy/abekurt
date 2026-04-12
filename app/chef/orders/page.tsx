"use client"

import { useEffect, useState } from "react"
import { ProtectedRoute } from "@/components/protected-route"
import { SidebarNav } from "@/components/sidebar-nav"
import { AuthHeader } from "@/components/auth-header"
import { useAuth } from "@/context/auth-context"

interface Order {
  _id: string
  orderNumber: string
  status: string
  totalAmount: number
  createdAt: string
  items: any[]
  batchNumber?: string
  tableNumber?: string
  distributions?: string[]
  distribution?: string
}

export default function ChefOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState("all")
  const { token } = useAuth()

  useEffect(() => {
    fetchOrders()
    // Add automatic refresh every 1 second
    const interval = setInterval(fetchOrders, 1000)
    return () => clearInterval(interval)
  }, [token])

  // Add visibility change listener for immediate refresh when tab becomes active
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchOrders()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  // Add focus listener for immediate refresh when window gets focus
  useEffect(() => {
    const handleFocus = () => {
      fetchOrders()
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [])

  // Add localStorage listener for cross-page updates
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'orderUpdated' || e.key === 'newOrderCreated') {
        fetchOrders()
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  const fetchOrders = async () => {
    try {
      const response = await fetch("/api/orders", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        const data = await response.json()
        setOrders(data)
      }
    } catch (err) {
      console.error("Failed to load orders")
    } finally {
      setLoading(false)
    }
  }

  const statuses = ["all", "pending", "cooking", "served", "completed"]
  const filteredOrders = filterStatus === "all" ? orders : orders.filter((o) => o.status === filterStatus)

  return (
    <ProtectedRoute requiredRoles={["chef"]}>
      <div className="min-h-screen bg-background">
        <SidebarNav />
        <main className="md:ml-64">
          <AuthHeader title="Order History" description="View all orders" />

          <div className="p-2.5 sm:p-4 lg:p-6">
            {/* Filters - Mobile Optimized */}
            <div className="grid grid-cols-3 sm:flex gap-2 mb-4">
              {statuses.map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-2 sm:px-4 py-2 rounded-lg transition-colors capitalize text-xs sm:text-sm font-medium ${filterStatus === status
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border border-border hover:border-primary"
                    }`}
                >
                  {status}
                </button>
              ))}
            </div>

            {/* Orders List - Mobile Optimized */}
            {loading ? (
              <div className="flex items-center justify-center py-8 sm:py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-accent mx-auto mb-3"></div>
                  <p className="text-sm sm:text-base text-muted-foreground">Loading orders...</p>
                </div>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="card-base text-center py-8 sm:py-12">
                <div className="text-4xl sm:text-6xl mb-3">📋</div>
                <h3 className="text-base sm:text-lg font-bold text-foreground mb-2">No Orders Found</h3>
                <p className="text-sm sm:text-base text-muted-foreground">
                  {filterStatus === "all" ? "No orders have been placed yet" : `No ${filterStatus} orders found`}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredOrders.map((order) => (
                  <div key={order._id} className="card-base hover-lift p-3">
                    {/* Mobile-Optimized Order Card */}
                    <div className="flex flex-col gap-3">
                      {/* Header Row */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-mono text-sm sm:text-base font-bold text-foreground">
                            #{order.orderNumber}
                          </h3>
                          {order.batchNumber && (
                            <span className="text-[10px] sm:text-xs font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                              Batch #{order.batchNumber}
                            </span>
                          )}
                          {order.tableNumber && (
                            <span className="text-[10px] sm:text-xs font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                              {order.tableNumber}
                            </span>
                          )}
                          {((order.distributions && order.distributions.length > 0) || order.distribution) && (
                            <div className="flex flex-wrap gap-1">
                              {order.distributions && order.distributions.length > 0 ? (
                                order.distributions.map((d, i) => (
                                  <span key={i} className="text-[9px] sm:text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full uppercase tracking-tighter">
                                    🏷️ {d}
                                  </span>
                                ))
                              ) : (
                                <span className="text-[9px] sm:text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full uppercase tracking-tighter">
                                  🏷️ {order.distribution}
                                </span>
                              )}
                            </div>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold capitalize ${order.status === "ready"
                            ? "bg-success/20 text-success"
                            : order.status === "served"
                              ? "bg-primary/20 text-primary"
                              : order.status === "preparing"
                                ? "bg-info/20 text-info"
                                : order.status === "pending"
                                  ? "bg-warning/20 text-warning"
                                  : order.status === "completed"
                                    ? "bg-muted text-muted-foreground"
                                    : "bg-danger/20 text-danger"
                            }`}
                        >
                          {order.status}
                        </span>
                      </div>

                      {/* Details Row */}
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-4">
                          <span className="font-semibold text-accent">
                            ${order.totalAmount.toFixed(2)}
                          </span>
                          <span className="text-muted-foreground">
                            {new Date(order.createdAt).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>

                      {/* Items Preview (Optional - can be expanded) */}
                      {order.items && order.items.length > 0 && (
                        <div className="border-t pt-2">
                          <div className="flex flex-wrap gap-1">
                            {order.items.slice(0, 3).map((item, idx) => (
                              <span key={idx} className="text-xs bg-muted px-2 py-1 rounded">
                                {item.quantity}x {item.name}
                              </span>
                            ))}
                            {order.items.length > 3 && (
                              <span className="text-xs text-muted-foreground px-2 py-1">
                                +{order.items.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}
