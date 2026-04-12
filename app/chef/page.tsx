"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ProtectedRoute } from "@/components/protected-route"
import { BentoNavbar } from "@/components/bento-navbar"
import { useAuth } from "@/context/auth-context"
import { useLanguage } from "@/context/language-context"
import { ConfirmationCard, NotificationCard } from "@/components/confirmation-card"
import { useConfirmation } from "@/hooks/use-confirmation"
import { RefreshCw, Clock, ChefHat, MapPin } from 'lucide-react'
import { Card, CardContent } from "@/components/ui/card"

interface OrderItem {
  menuItemId: string
  menuId?: string
  name: string
  quantity: number
  specialInstructions?: string
  status: "pending" | "cooking" | "served" | "cancelled"
  category?: string
}

interface Order {
  _id: string
  orderNumber: string
  items: OrderItem[]
  status: "pending" | "cooking" | "served" | "completed" | "cancelled"
  notes?: string
  batchNumber?: string
  tableNumber?: string
  createdAt: string
  updatedAt: string
  distributions?: string[]
  distribution?: string
}

export default function KitchenDisplayPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [newOrderAlert, setNewOrderAlert] = useState(false)
  const [previousOrderCount, setPreviousOrderCount] = useState(0)
  const [assignedCategories, setAssignedCategories] = useState<string[]>([])
  const { token } = useAuth()
  const { t } = useLanguage()
  const { confirmationState, confirm, closeConfirmation, notificationState, notify, closeNotification } = useConfirmation()

  useEffect(() => {
    router.push("/chef/food")
  }, [])

  const fetchChefCategories = async () => {
    try {
      const response = await fetch("/api/system-check", {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setAssignedCategories(data.user?.assignedCategories || [])
      }
    } catch (err) {
      console.error("Failed to fetch chef categories")
    }
  }

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) fetchOrders()
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  useEffect(() => {
    const handleFocus = () => fetchOrders()
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [])

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'orderUpdated' || e.key === 'newOrderCreated') fetchOrders()
    }
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  const fetchOrders = async () => {
    try {
      // 🚀 HYDRATION CACHE: Load from localStorage on very first load
      if (loading) {
        const cached = localStorage.getItem("chef_orders_cache")
        if (cached) {
          try {
            const parsed = JSON.parse(cached)
            setOrders(parsed)
            setLoading(false)
          } catch (e) {
            console.error("Failed to parse orders cache")
          }
        }
      }

      const response = await fetch("/api/orders", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        const data = await response.json()
        const activeOrders = data.filter((order: Order) =>
          order.status !== "completed" && order.status !== "cancelled"
        )

        // Update Cache
        localStorage.setItem("chef_orders_cache", JSON.stringify(activeOrders))

        if (previousOrderCount > 0 && activeOrders.length > previousOrderCount) {
          setNewOrderAlert(true)
          setTimeout(() => setNewOrderAlert(false), 5000)
        }

        setPreviousOrderCount(activeOrders.length)
        setOrders(activeOrders)
      }
    } catch (err) {
      console.error("Failed to load orders")
    } finally {
      setLoading(false)
    }
  }



  const handleStatusChange = async (orderId: string, newStatus: string) => {
    const preservedOrders = orders;
    try {
      // Robust Optimistic Update
      setOrders(prevOrders => {
        const isComplete = newStatus === 'served' || newStatus === 'completed' || newStatus === 'cancelled';
        if (isComplete) {
          return prevOrders.filter(o => o._id !== orderId);
        }
        return prevOrders.map(order =>
          order._id === orderId ? { ...order, status: newStatus as any } : order
        );
      });

      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        // Option A: Just keep the local state if the server confirmed it
        // Option B: Subtle re-fetch to ensure sync without jarring jumps
        // For responsiveness, we trust the local update and wait for next poll
        localStorage.setItem('orderUpdated', Date.now().toString())
      } else {
        // Rollback
        setOrders(preservedOrders);
      }
    } catch (err) {
      // Rollback
      setOrders(preservedOrders);
    }
  }

  const preparingOrders = orders.filter((o) => o.status === "cooking")
  const readyOrders = orders.filter((o) => o.status === "served")

  return (
    <>
      <ProtectedRoute requiredRoles={["chef"]}>
        <div className="min-h-screen bg-gray-50 p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <BentoNavbar />

            {/* Clean Header */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-orange-50 rounded-lg">
                    <ChefHat className="h-8 w-8 text-orange-600" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Kitchen Display</h1>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <span>Kitchen Management</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>


          </div>

          {/* New Order Alert */}
          {newOrderAlert && (
            <div className="p-4 bg-orange-500 text-white rounded-xl shadow-lg flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🔔</span>
                <div>
                  <p className="font-bold">New Order Incoming!</p>
                  <p className="text-sm opacity-90">Check the preparing queue</p>
                </div>
              </div>
              <button onClick={() => setNewOrderAlert(false)} className="text-xl hover:opacity-75">
                ✕
              </button>
            </div>
          )}

          <div className="hidden" />
        </div>
      </ProtectedRoute>

      <ConfirmationCard
        isOpen={confirmationState.isOpen}
        onClose={closeConfirmation}
        onConfirm={confirmationState.onConfirm}
        title={confirmationState.options.title}
        message={confirmationState.options.message}
        type={confirmationState.options.type}
        confirmText={confirmationState.options.confirmText}
        cancelText={confirmationState.options.cancelText}
        icon={confirmationState.options.icon}
      />

      <NotificationCard
        isOpen={notificationState.isOpen}
        onClose={closeNotification}
        title={notificationState.options.title}
        message={notificationState.options.message}
        type={notificationState.options.type}
        autoClose={notificationState.options.autoClose}
        duration={notificationState.options.duration}
      />
    </>
  )
}

function OrderColumn({
  title,
  color,
  orders,
  onStatusChange,
  nextStatus,
  t
}: {
  title: string
  color: "orange" | "blue" | "green"
  orders: Order[]
  onStatusChange: (orderId: string, newStatus: string) => void
  nextStatus: string
  t: (key: string) => string
}) {
  const colorClasses = {
    orange: "bg-orange-50 border-orange-200",
    blue: "bg-blue-50 border-blue-200",
    green: "bg-green-50 border-green-200"
  }

  return (
    <div className={`rounded-xl p-4 border ${colorClasses[color]} min-h-[500px]`}>
      <h2 className="text-lg font-bold text-gray-900 mb-4">{title}</h2>
      <div className="grid grid-cols-2 gap-3 max-h-[calc(100vh-300px)] overflow-y-auto">
        {orders.length === 0 ? (
          <p className="col-span-2 text-center text-gray-500 py-8">No orders</p>
        ) : (
          orders.map(order => (
            <OrderCard
              key={order._id}
              order={order}
              onStatusChange={onStatusChange}
              nextStatus={nextStatus}
              color={color}
              t={t}
            />
          ))
        )}
      </div>
    </div>
  )
}

function OrderCard({
  order,
  onStatusChange,
  nextStatus,
  color,
  t
}: {
  order: Order
  onStatusChange: (orderId: string, newStatus: string) => void
  nextStatus: string
  color: "orange" | "blue" | "green"
  t: (key: string) => string
}) {
  const createdTime = new Date(order.createdAt)
  const elapsedMinutes = Math.floor((Date.now() - createdTime.getTime()) / 60000)

  const borderColors = {
    orange: "border-l-orange-500",
    blue: "border-l-blue-500",
    green: "border-l-green-500"
  }

  return (
    <Card className={`border-l-4 ${borderColors[color]} hover:shadow-md transition-shadow`}>
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="font-bold text-lg text-gray-900">#{order.orderNumber}</h3>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {order.batchNumber && (
                <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                  Batch #{order.batchNumber}
                </span>
              )}
              {order.tableNumber && (
                <span className="text-[10px] font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                  {order.tableNumber}
                </span>
              )}
              {((order.distributions && order.distributions.length > 0) || order.distribution) && (
                <div className="flex flex-wrap gap-1">
                  {order.distributions && order.distributions.length > 0 ? (
                    order.distributions.map((d, i) => (
                      <span key={i} className="text-[9px] font-black text-emerald-700 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-full uppercase tracking-tighter shadow-sm">
                        🏷️ {d}
                      </span>
                    ))
                  ) : (
                    <span className="text-[9px] font-black text-emerald-700 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-full uppercase tracking-tighter shadow-sm">
                      🏷️ {order.distribution}
                    </span>
                  )}
                </div>
              )}
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {elapsedMinutes > 0 ? `${elapsedMinutes}m ago` : "Just now"}
              </p>
            </div>
          </div>
          {order.notes && (
            <span className="text-lg" title={order.notes}>📝</span>
          )}
        </div>

        <div className="space-y-2 mb-4 p-3 bg-gray-50 rounded-lg">
          {order.items.map((item, idx) => (
            <div key={idx} className="flex justify-between items-center text-sm border-b border-gray-100 last:border-0 py-2">
              <div className="flex-1">
                <span className="font-black text-gray-800 tracking-tight">#{item.menuId || item.menuItemId} {item.name}</span>
                <div className="flex flex-wrap gap-1.5 mt-0.5">
                  <span className="text-[10px] text-orange-600 font-black uppercase tracking-widest bg-orange-50 w-fit px-1.5 py-0.5 rounded shadow-sm border border-orange-100">{item.category}</span>
                  {((order.distributions && order.distributions.length > 0) || order.distribution) && (
                    <span className="text-[10px] text-emerald-600 font-black uppercase tracking-widest bg-emerald-50 w-fit px-1.5 py-0.5 rounded shadow-sm border border-emerald-100 flex items-center gap-0.5">
                      <MapPin className="h-2 w-2" />
                      {order.distributions && order.distributions.length > 0 ? order.distributions.join(", ") : order.distribution}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {item.status && item.status !== 'pending' && (
                  <span className={`text-[10px] px-2.5 py-1 rounded-lg font-black uppercase tracking-tight shadow-sm border ${item.status === 'served' ? 'bg-green-100 text-green-700 border-green-200' :
                    item.status === 'cooking' ? 'bg-orange-600 text-white border-orange-700' :
                      'bg-gray-100 text-gray-600 border-gray-200'
                    }`}>
                    {item.status}
                  </span>
                )}
                <span className="font-bold bg-gray-200 text-gray-700 px-2 py-1 rounded-full text-xs">
                  {item.quantity}
                </span>
              </div>
            </div>
          ))}
        </div>

        <OrderCardActions
          order={order}
          onStatusChange={onStatusChange}
        />
      </CardContent>
    </Card>
  )
}

function OrderCardActions({
  order,
  onStatusChange,
}: {
  order: Order
  onStatusChange: (orderId: string, newStatus: string) => void
}) {
  const [busy, setBusy] = useState(false)

  const handleClick = (newStatus: string) => {
    if (busy) return
    setBusy(true)
    onStatusChange(order._id, newStatus)
    // Reset after 3s as safety fallback (card will unmount on success anyway)
    setTimeout(() => setBusy(false), 3000)
  }

  if (order.status === "cooking" || order.status === "pending") {
    return (
      <div className="flex gap-2">
        <button
          onClick={() => handleClick("served")}
          disabled={busy}
          className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg font-medium text-sm hover:bg-green-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {busy ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Updating...
            </>
          ) : "✅ Ready"}
        </button>
      </div>
    )
  }

  if (order.status === "served") {
    return (
      <button
        onClick={() => handleClick("completed")}
        disabled={busy}
        className="w-full bg-gray-800 text-white py-2 px-4 rounded-lg font-medium text-sm hover:bg-gray-900 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {busy ? (
          <>
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            Completing...
          </>
        ) : "🏁 Complete Order"}
      </button>
    )
  }

  return null
}
