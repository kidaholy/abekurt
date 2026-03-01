"use client"

import { useState, useEffect, useRef } from "react"
import { ProtectedRoute } from "@/components/protected-route"
import { BentoNavbar } from "@/components/bento-navbar"
import { useAuth } from "@/context/auth-context"
import { useLanguage } from "@/context/language-context"
import { ConfirmationCard, NotificationCard } from "@/components/confirmation-card"
import { useConfirmation } from "@/hooks/use-confirmation"
import { Clock, Trash2 } from "lucide-react"

interface Order {
  _id: string
  orderNumber: string
  items: Array<{ name: string; quantity: number; price: number; menuId?: string; preparationTime?: number }>
  totalAmount: number
  status: "pending" | "preparing" | "ready" | "served" | "completed" | "cancelled"
  createdAt: string
  customerName?: string
  tableNumber: string
  batchNumber?: string
  delayMinutes?: number
  thresholdMinutes?: number
  totalPreparationTime?: number
  isDeleted?: boolean
  servedAt?: string
  readyAt?: string
  updatedAt?: string
  kitchenAcceptedAt?: string
}

export default function AdminOrdersPage() {
  const { token } = useAuth()
  const { t } = useLanguage()
  const { confirmationState, confirm, closeConfirmation, notificationState, notify, closeNotification } = useConfirmation()
  const [orders, setOrders] = useState<Order[]>([])
  const [filter, setFilter] = useState<string>("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [deleting, setDeleting] = useState<string | null>(null)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const notifiedOrderIds = useRef<Set<string>>(new Set())

  useEffect(() => {
    fetchOrders()
    const interval = setInterval(fetchOrders, 3000)
    return () => clearInterval(interval)
  }, [token]) // Re-fetch if token changes

  // Auto-notification for DELAYS
  useEffect(() => {
    if (orders.length === 0) return

    orders.forEach(order => {
      // We only notify for active orders (preparing/ready) that just became delayed
      if (order.isDeleted || order.status === 'cancelled' || order.status === 'served' || order.status === 'completed') return

      const metrics = getOrderMetrics(order)
      if (metrics.delay > 0 && !notifiedOrderIds.current.has(order._id)) {
        // Trigger notification
        notify({
          title: "Preparation Delay!",
          message: `Order #${order.orderNumber} (Table ${order.tableNumber}) has exceeded its target time by ${metrics.delay}m.`,
          type: "warning"
        })
        // Mark as notified
        notifiedOrderIds.current.add(order._id)
      }
    })
  }, [orders])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) fetchOrders()
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  const fetchOrders = async () => {
    try {
      // Fetch recent orders (limit 100 to prevent large payloads during polling)
      const res = await fetch("/api/orders?limit=100&includeDeleted=true", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setOrders(data)
      }
    } catch (error) {
      console.error("Failed to fetch orders:", error)
    }
  }

  // handleDeleteOrder now performs soft delete
  const handleDeleteOrder = async (orderId: string, orderNumber: string) => {
    const confirmed = await confirm({
      title: "Delete Order",
      message: `Are you sure you want to move Order #${orderNumber} to deleted history?\n\nStock will be restored for active orders.`,
      type: "danger",
      confirmText: "Move to History",
      cancelText: "Cancel"
    })

    if (!confirmed) return

    setDeleting(orderId)
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        // Update local state to show order as deleted
        setOrders(prevOrders => prevOrders.map(order =>
          order._id === orderId ? { ...order, isDeleted: true, status: "cancelled" } : order
        ))
        notify({
          title: "Moved to History",
          message: `Order #${orderNumber} has been moved to deleted history.`,
          type: "success"
        })
      } else {
        const error = await response.json()
        notify({
          title: "Failed",
          message: error.message || "Failed to delete order",
          type: "error"
        })
      }
    } catch (error) {
      console.error("Failed to delete order:", error)
      notify({
        title: "Error",
        message: "Failed to delete order. Please try again.",
        type: "error"
      })
    } finally {
      setDeleting(null)
    }
  }

  const handleBulkDeleteOrders = async () => {
    const confirmed = await confirm({
      title: "Delete All Orders",
      message: `Are you sure you want to delete ALL ${orders.length} orders?\n\nThis action cannot be undone and will clear your entire order history.`,
      type: "danger",
      confirmText: "Delete All Orders",
      cancelText: "Cancel"
    })

    if (!confirmed) return

    const finalConfirmed = await confirm({
      title: "Final Warning",
      message: "This is your final warning!\n\nAll order data will be permanently lost.\nAre you absolutely sure?",
      type: "danger",
      confirmText: "Yes, Delete Everything",
      cancelText: "Cancel"
    })

    if (!finalConfirmed) return

    setBulkDeleting(true)
    try {
      const response = await fetch("/api/orders/bulk-delete", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const result = await response.json()
        setOrders([])
        notify({
          title: "All Orders Deleted",
          message: `Successfully deleted ${result.deletedCount} orders.`,
          type: "success"
        })
      } else {
        const error = await response.json()
        notify({
          title: "Bulk Delete Failed",
          message: error.message || "Failed to delete orders",
          type: "error"
        })
      }
    } catch (error) {
      console.error("Failed to bulk delete orders:", error)
      notify({
        title: "Error",
        message: "Failed to delete orders. Please try again.",
        type: "error"
      })
    } finally {
      setBulkDeleting(false)
    }
  }

  const filteredOrders = orders.filter((order) => {
    const isActuallyDeleted = !!order.isDeleted || order.status === "cancelled"
    const matchesFilter = filter === "all" ? !isActuallyDeleted :
      filter === "deleted" ? isActuallyDeleted :
        filter === "served" ? (!isActuallyDeleted && (order.status === "served" || order.status === "completed")) :
          (!isActuallyDeleted && order.status === filter)
    const matchesSearch =
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.tableNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerName?.toLowerCase().includes(searchTerm.toLowerCase())

    return matchesFilter && matchesSearch
  })

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "preparing":
      case "pending": // legacy DB records
        return { color: "bg-[#93c5fd]/20 text-blue-700", label: t("adminOrders.cooking"), icon: "🍳" }
      case "ready":
        return { color: "bg-[#2d5a41]/20 text-[#2d5a41]", label: t("adminOrders.ready"), icon: "✅" }
      case "served":
        return { color: "bg-purple-100 text-purple-700", label: "Served", icon: "🍽️" }
      case "completed":
        return { color: "bg-gray-100 text-gray-500", label: t("adminOrders.served"), icon: "💰" }
      case "cancelled":
        return { color: "bg-red-50 text-red-500", label: t("adminOrders.cancelled"), icon: "✕" }
      default:
        return { color: "bg-gray-100 text-gray-500", label: status, icon: "•" }
    }
  }

  // Unified Performance Metric Helper
  const getOrderMetrics = (o: Order) => {
    const isCompleted = o.status === 'served' || o.status === 'completed'
    const isReady = o.status === 'ready'
    const threshold = o.thresholdMinutes || 20
    const start = new Date(o.createdAt).getTime()

    // For completed orders, prioritize stored snapshots to "stop the count" accurately
    if (isCompleted) {
      if (o.totalPreparationTime !== undefined) {
        const totalTaken = o.totalPreparationTime
        const delay = Math.max(0, totalTaken - threshold)
        return { totalTaken, delay, threshold, isCompleted, isReady }
      }
      if (o.delayMinutes !== undefined) {
        const delay = o.delayMinutes
        const totalTaken = threshold + delay
        return { totalTaken, delay, threshold, isCompleted, isReady }
      }
    }

    // Determine end time for calculation
    // IMPORTANT: For completed orders, we NEVER fallback to Date.now() 
    // to prevent the timer from ticking after service.
    // If specific timestamps are missing, 'updatedAt' provides the exact moment of service.
    const end = isCompleted
      ? new Date(o.servedAt || o.readyAt || o.updatedAt || o.createdAt).getTime()
      : isReady
        ? new Date(o.readyAt || o.updatedAt || o.createdAt).getTime()
        : Date.now()

    const totalTaken = Math.floor((end - start) / 60000)
    const delay = Math.max(0, totalTaken - threshold)
    return { totalTaken, delay, threshold, isCompleted, isReady }
  }

  const preparingOrders = orders.filter(o => !o.isDeleted && o.status !== 'cancelled' && ((o.status as string) === 'preparing' || (o.status as string) === 'pending'))
  const readyOrders = orders.filter(o => !o.isDeleted && o.status !== 'cancelled' && o.status === 'ready')
  const servedOrders = orders.filter(o => !o.isDeleted && o.status !== 'cancelled' && (o.status === 'served' || o.status === 'completed'))
  const deletedHistory = orders.filter(o => !!o.isDeleted || o.status === 'cancelled')

  const stats = {
    all: {
      count: orders.length,
      time: orders.length > 0 ? Math.floor(orders.reduce((acc, o) => acc + getOrderMetrics(o).totalTaken, 0) / orders.length) : 0,
      delay: orders.length > 0 ? Math.floor(orders.reduce((acc, o) => acc + getOrderMetrics(o).delay, 0) / orders.length) : 0
    },
    preparing: {
      count: preparingOrders.length,
      time: preparingOrders.length > 0
        ? Math.floor(preparingOrders.reduce((acc, o) => acc + getOrderMetrics(o).totalTaken, 0) / preparingOrders.length)
        : 0,
      delay: preparingOrders.length > 0
        ? Math.floor(preparingOrders.reduce((acc, o) => acc + getOrderMetrics(o).delay, 0) / preparingOrders.length)
        : 0
    },
    ready: {
      count: readyOrders.length,
      time: readyOrders.length > 0
        ? Math.floor(readyOrders.reduce((acc, o) => acc + getOrderMetrics(o).totalTaken, 0) / readyOrders.length)
        : 0,
      delay: readyOrders.length > 0
        ? Math.floor(readyOrders.reduce((acc, o) => acc + getOrderMetrics(o).delay, 0) / readyOrders.length)
        : 0
    },
    served: {
      count: servedOrders.length,
      time: servedOrders.length > 0
        ? Math.floor(servedOrders.reduce((acc, o) => acc + getOrderMetrics(o).totalTaken, 0) / servedOrders.length)
        : 0,
      delay: servedOrders.length > 0
        ? Math.floor(servedOrders.reduce((acc, o) => acc + getOrderMetrics(o).delay, 0) / servedOrders.length)
        : 0
    },
    deleted: {
      count: deletedHistory.length,
      time: 0,
      delay: 0
    }
  }

  return (
    <ProtectedRoute requiredRoles={["admin"]}>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <BentoNavbar />

          {/* Active Delay Alerts */}
          {orders.filter(o => {
            if (o.isDeleted || o.status === 'cancelled' || o.status === 'served' || o.status === 'completed') return false
            return getOrderMetrics(o).delay > 0
          }).length > 0 && (
              <div className="bg-red-50 border-2 border-red-200 rounded-[30px] p-6 shadow-lg">
                <div className="flex items-center gap-4 mb-4">
                  <div className="bg-red-500 text-white p-3 rounded-2xl shadow-md">
                    <Clock className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-red-700 uppercase tracking-tight">🚨 Action Required: Preparation Delays</h3>
                    <p className="text-sm font-bold text-red-600/80 italic">The following orders have exceeded their preparation threshold!</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  {orders.filter(o => {
                    if (o.isDeleted || o.status === 'cancelled' || o.status === 'served' || o.status === 'completed') return false
                    return getOrderMetrics(o).delay > 0
                  }).map(o => {
                    const { delay, threshold, isCompleted } = getOrderMetrics(o)

                    return (
                      <div key={o._id} className="bg-white border-2 border-red-100 px-5 py-3 rounded-2xl flex items-center gap-3 shadow-sm relative overflow-hidden group">
                        {isCompleted && <div className="absolute top-0 right-0 bg-green-500 text-white text-[8px] font-black px-2 py-0.5 rounded-bl-lg uppercase tracking-widest">Served</div>}
                        <span className="font-black text-red-600 text-lg">#{o.orderNumber}</span>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black bg-red-50 text-red-700 px-2.5 py-1 rounded-full border border-red-100 uppercase tracking-tighter">
                            ⏱️ {delay}m delay
                          </span>
                          <span className="text-[9px] font-bold text-gray-400 mt-0.5 ml-1 italic lowercase">{isCompleted ? `finished in ${threshold + delay}m` : `exceeded ${threshold}m target`}</span>
                        </div>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest border-l-2 border-gray-100 pl-3 ml-1">{o.tableNumber}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Sidebar - Filters & Stats */}
            <div className="lg:col-span-3 flex flex-col gap-4 lg:sticky lg:top-4">
              <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-gray-200 overflow-hidden">
                <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4">{t("adminOrders.title")}</h2>
                <div className="flex lg:flex-col overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0 gap-3 scrollbar-hide">
                  {[
                    { id: "all", label: t("adminOrders.allOrders"), count: stats.all.count - stats.deleted.count, time: stats.all.time, delay: stats.all.delay, emoji: "📋" },
                    { id: "preparing", label: t("adminOrders.preparing"), count: stats.preparing.count, time: stats.preparing.time, delay: stats.preparing.delay, emoji: "🔥" },
                    { id: "ready", label: t("adminOrders.ready"), count: stats.ready.count, time: stats.ready.time, delay: stats.ready.delay, emoji: "✅" },
                    { id: "served", label: "Served", count: stats.served.count, time: stats.served.time, delay: stats.served.delay, emoji: "🍽️" },
                    { id: "deleted", label: "Deleted History", count: stats.deleted.count, time: null, delay: null, emoji: "🗑️" }
                  ].map(item => (
                    <button
                      key={item.id}
                      onClick={() => setFilter(item.id)}
                      className={`flex-shrink-0 lg:w-full flex items-center justify-between p-3 rounded-lg font-medium transition-all ${filter === item.id
                        ? "bg-[#8B4513] text-white shadow-sm"
                        : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                        }`}
                    >
                      <div className="flex flex-col items-start gap-0.5">
                        <span className="flex items-center gap-2 md:gap-3">
                          <span className="text-lg md:text-xl">{item.emoji}</span>
                          <span className="whitespace-nowrap">{item.label}</span>
                        </span>
                        <div className="flex items-center gap-2 ml-7 md:ml-8">
                          {item.time !== null && (
                            <span className={`text-[9px] font-black uppercase tracking-tighter ${filter === item.id ? 'text-white/60' : 'text-orange-500'}`}>
                              {item.time}m avg
                            </span>
                          )}
                          {item.delay !== null && item.delay > 0 && (
                            <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${filter === item.id ? 'bg-white/10 text-white' : 'bg-red-50 text-red-500'}`}>
                              +{item.delay}m
                            </span>
                          )}
                        </div>
                      </div>
                      <span className={`ml-3 px-2 py-0.5 rounded-full text-[10px] md:text-xs font-black ${filter === item.id ? "bg-white/20 text-white" : "bg-gray-200 text-gray-500"}`}>
                        {item.count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="hidden lg:block bg-[#D2691E] rounded-xl p-6 shadow-sm overflow-hidden relative">
                <div className="relative z-10">
                  <h3 className="text-xl font-bold text-[#1a1a1a] mb-2">{t("adminOrders.needInsights")}</h3>
                  <p className="text-sm font-medium text-[#1a1a1a]/70">{t("adminOrders.checkDailyReports")}</p>
                </div>
                <div className="absolute -bottom-6 -right-6 text-8xl opacity-20 transform group-hover:rotate-12 transition-transform duration-500">📊</div>
              </div>
            </div>

            {/* Main Content - Order List */}
            <div className="lg:col-span-9">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 min-h-[600px]">
                {/* Header with Bulk Delete Button */}
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-8">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{t("adminOrders.orderManagement")}</h2>
                    <p className="text-gray-500 text-sm mt-1">
                      {filteredOrders.length} {filter !== 'all' ? t(`adminOrders.${filter}`) : ''} {t("adminOrders.ordersCount")}
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                    <div className="relative w-full sm:w-64">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                      <input
                        type="text"
                        placeholder="Search batch, table, order..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl text-sm font-bold focus:border-[#2d5a41] focus:ring-0 transition-all outline-none"
                      />
                    </div>
                    {orders.length > 0 && (
                      <button
                        onClick={handleBulkDeleteOrders}
                        disabled={bulkDeleting}
                        className="bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none flex items-center justify-center gap-2 whitespace-nowrap"
                      >
                        {bulkDeleting ? (
                          <>
                            <span className="animate-spin">⏳</span>
                            <span className="text-xs">{t("adminOrders.deleting")}</span>
                          </>
                        ) : (
                          <>
                            <span>🗑️</span>
                            <span className="text-xs sm:text-sm">{t("adminOrders.deleteAllOrders")}</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
                {filteredOrders.length === 0 ? (
                  <div className="text-center py-32">
                    <div className="text-8xl mb-6 opacity-20">🍃</div>
                    <h3 className="text-2xl font-bold text-gray-400">{t("adminOrders.quietForNow")}</h3>
                    <p className="text-gray-400">{t("adminOrders.noOrdersFound")}</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {filteredOrders.map((order) => {
                      const status = getStatusConfig(order.status)
                      return (
                        <div key={order._id} className="bg-gray-50 rounded-2xl p-4 md:p-5 border border-gray-200 hover:border-[#8B4513]/30 hover:shadow-md transition-all flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-8">

                          {/* Left: Order Identifier & Status */}
                          <div className="flex-shrink-0 lg:w-48">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-xl font-black text-gray-800">#{order.orderNumber}</h3>
                              {order.batchNumber && (
                                <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-[10px] font-black tracking-widest uppercase">B#{order.batchNumber}</span>
                              )}
                              <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded text-[10px] font-black tracking-widest uppercase">{order.tableNumber}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                              <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase ${status.color}`}>
                                <span>{status.icon}</span>
                                {status.label}
                              </span>
                            </div>
                          </div>

                          {/* Middle: Items Summary - Compact Flex Wrap */}
                          <div className="flex-1 min-w-0 bg-white/40 rounded-xl p-3 border border-gray-100/50">
                            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                              {order.items.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-1.5 text-xs">
                                  <span className="text-[#8B4513] font-black">{item.quantity}×</span>
                                  <span className="text-gray-700 font-bold truncate max-w-[140px]">{item.name}</span>
                                  {item.preparationTime && <span className="text-gray-400 text-[9px] italic">({item.preparationTime}m)</span>}
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Right: Timing, Pricing & Actions */}
                          <div className="flex flex-col sm:flex-row lg:flex-row items-start sm:items-center gap-4 lg:gap-6 lg:w-fit">

                            {/* Performance & Timing Badge */}
                            <div className="flex items-center gap-2">
                              {(() => {
                                const { totalTaken, delay, threshold, isCompleted, isReady } = getOrderMetrics(order)

                                // Color Scheme Logic
                                let colorClass = "emerald"
                                let icon = "✨"
                                let label = isCompleted ? "On Time" : (isReady ? "READY" : "COOKING")

                                if (delay > 0) {
                                  colorClass = delay <= 10 ? "amber" : "rose"
                                  icon = delay <= 10 ? "⚠️" : "🚨"
                                  label = `${delay}m delay`
                                }

                                const colorStyles = {
                                  emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
                                  amber: "bg-amber-50 text-amber-600 border-amber-100",
                                  rose: "bg-rose-50 text-rose-600 border-rose-100"
                                }

                                return (
                                  <div className={`group flex items-center gap-3 p-1.5 pr-4 rounded-2xl border transition-all duration-300 hover:shadow-sm ${colorStyles[colorClass as keyof typeof colorStyles]}`}>
                                    {/* Status Pill */}
                                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-wider shadow-sm bg-white/80 backdrop-blur-sm border-inherit`}>
                                      <span className="scale-110">{isCompleted ? icon : <Clock className="h-3 w-3 animate-pulse" />}</span>
                                      <span>{label}</span>
                                    </div>

                                    {/* Metrics */}
                                    <div className="flex flex-col">
                                      <div className="flex items-baseline gap-1">
                                        <span className="text-xs font-black tracking-tight leading-none">
                                          {isCompleted ? `${totalTaken}m` : (totalTaken < threshold ? `${threshold - totalTaken}m left` : `${totalTaken - threshold}m delay`)}
                                        </span>
                                        {!isCompleted && totalTaken >= threshold && <span className="text-[8px] font-bold opacity-60 uppercase">late</span>}
                                      </div>
                                      <span className="text-[9px] font-bold opacity-50 leading-tight mt-0.5 whitespace-nowrap lowercase">
                                        vs {threshold}m target
                                      </span>
                                    </div>
                                  </div>
                                )
                              })()}
                            </div>

                            {/* Total Amount & Primary Action */}
                            <div className="flex items-center gap-4 ml-auto">
                              <div className="text-2xl font-black text-[#8B4513] whitespace-nowrap">{order.totalAmount.toFixed(0)} <span className="text-xs font-bold text-gray-400">{t("common.currencyBr")}</span></div>
                              <div className="flex gap-2">
                                {!order.isDeleted && (
                                  <button
                                    onClick={() => handleDeleteOrder(order._id, order.orderNumber)}
                                    disabled={deleting === order._id}
                                    className="bg-red-50 hover:bg-red-100 text-red-500 p-2.5 rounded-xl transition-all border border-red-100 shadow-sm hover:shadow active:scale-95 disabled:opacity-50"
                                    title="Move to History"
                                  >
                                    {deleting === order._id ? (
                                      <span className="animate-spin text-xs">⏳</span>
                                    ) : (
                                      <Trash2 className="h-5 w-5" />
                                    )}
                                  </button>
                                )}
                                {order.isDeleted && (
                                  <span className="text-xs font-bold text-red-400 uppercase tracking-widest bg-red-50 px-3 py-1 rounded-full border border-red-100">
                                    Deleted
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

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
      </div>
    </ProtectedRoute >
  )
}
