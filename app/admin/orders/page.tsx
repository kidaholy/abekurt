"use client"

import { useState, useEffect } from "react"
import { ProtectedRoute } from "@/components/protected-route"
import { BentoNavbar } from "@/components/bento-navbar"
import { useAuth } from "@/context/auth-context"
import { useLanguage } from "@/context/language-context"
import { ConfirmationCard, NotificationCard } from "@/components/confirmation-card"
import { useConfirmation } from "@/hooks/use-confirmation"
import { Clock } from "lucide-react"

interface Order {
  _id: string
  orderNumber: string
  items: Array<{ name: string; quantity: number; price: number; menuId?: string }>
  totalAmount: number
  status: "preparing" | "ready" | "served" | "completed" | "cancelled"
  createdAt: string
  customerName?: string
  tableNumber: string
  batchNumber?: string
  delayMinutes?: number
  thresholdMinutes?: number
  isDeleted?: boolean
  servedAt?: string
  readyAt?: string
  kitchenAcceptedAt?: string
}

export default function AdminOrdersPage() {
  const { token } = useAuth()
  const { t } = useLanguage()
  const { confirmationState, confirm, closeConfirmation, notificationState, notify, closeNotification } = useConfirmation()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [deleting, setDeleting] = useState<string | null>(null)
  const [bulkDeleting, setBulkDeleting] = useState(false)

  useEffect(() => {
    fetchOrders()
    const interval = setInterval(fetchOrders, 3000)
    return () => clearInterval(interval)
  }, [])

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
    } finally {
      setLoading(false)
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

  const preparingOrders = orders.filter(o => !o.isDeleted && o.status !== 'cancelled' && ((o.status as string) === 'preparing' || (o.status as string) === 'pending'))
  const readyOrders = orders.filter(o => !o.isDeleted && o.status !== 'cancelled' && o.status === 'ready')
  const servedOrders = orders.filter(o => !o.isDeleted && o.status !== 'cancelled' && (o.status === 'served' || o.status === 'completed'))
  const deletedHistory = orders.filter(o => !!o.isDeleted || o.status === 'cancelled')

  const stats = {
    all: { count: orders.length, time: 0 },
    preparing: {
      count: preparingOrders.length,
      time: preparingOrders.length > 0
        ? Math.floor(preparingOrders.reduce((acc, o) => {
          const start = o.kitchenAcceptedAt || o.createdAt
          return acc + (Date.now() - new Date(start).getTime())
        }, 0) / preparingOrders.length / 60000)
        : 0
    },
    ready: {
      count: readyOrders.length,
      time: readyOrders.length > 0
        ? Math.floor(readyOrders.reduce((acc, o) => {
          const start = o.readyAt || o.kitchenAcceptedAt || o.createdAt
          return acc + (Date.now() - new Date(start).getTime())
        }, 0) / readyOrders.length / 60000)
        : 0
    },
    served: {
      count: servedOrders.length,
      time: servedOrders.length > 0
        ? Math.floor(servedOrders.reduce((acc, o) => {
          if (o.delayMinutes) return acc + o.delayMinutes
          if (o.servedAt) return acc + (new Date(o.servedAt).getTime() - new Date(o.createdAt).getTime()) / 60000
          return acc
        }, 0) / servedOrders.length)
        : 0
    },
    deleted: {
      count: deletedHistory.length,
      time: 0
    }
  }

  return (
    <ProtectedRoute requiredRoles={["admin"]}>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <BentoNavbar />

          {/* Active Delay Alerts */}
          {orders.filter(o =>
            (o.status === 'preparing' || o.status === 'pending' || o.status === 'ready') &&
            Math.floor((Date.now() - new Date(o.createdAt).getTime()) / 60000) > (o.thresholdMinutes || 20)
          ).length > 0 && (
              <div className="bg-red-50 border-2 border-red-200 rounded-[30px] p-6 shadow-lg animate-pulse">
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
                  {orders.filter(o =>
                    (o.status === 'preparing' || o.status === 'pending' || o.status === 'ready') &&
                    Math.floor((Date.now() - new Date(o.createdAt).getTime()) / 60000) > (o.thresholdMinutes || 20)
                  ).map(o => (
                    <div key={o._id} className="bg-white border-2 border-red-100 px-5 py-3 rounded-2xl flex items-center gap-3 shadow-sm">
                      <span className="font-black text-red-600 text-lg">#{o.orderNumber}</span>
                      <span className="text-sm font-black bg-red-50 text-red-700 px-3 py-1 rounded-full border border-red-100">
                        {Math.floor((Date.now() - new Date(o.createdAt).getTime()) / 60000)}m / {o.thresholdMinutes || 20}m
                      </span>
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{o.tableNumber}</span>
                    </div>
                  ))}
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
                    { id: "all", label: t("adminOrders.allOrders"), count: stats.all.count - stats.deleted.count, time: null, emoji: "📋" },
                    { id: "preparing", label: t("adminOrders.preparing"), count: stats.preparing.count, time: stats.preparing.time, emoji: "🔥" },
                    { id: "ready", label: t("adminOrders.ready"), count: stats.ready.count, time: stats.ready.time, emoji: "✅" },
                    { id: "served", label: "Served", count: stats.served.count, time: stats.served.time, emoji: "🍽️" },
                    { id: "deleted", label: "Deleted History", count: stats.deleted.count, time: null, emoji: "🗑️" }
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
                        {item.time !== null && (
                          <span className={`text-[10px] font-black uppercase tracking-tighter ml-7 md:ml-8 ${filter === item.id ? 'text-white/60' : 'text-orange-500'}`}>
                            {item.time}m avg
                          </span>
                        )}
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
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-32">
                    <div className="text-6xl animate-bounce mb-4">🍩</div>
                    <p className="text-gray-400 font-bold">{t("adminOrders.scanningOrders")}</p>
                  </div>
                ) : filteredOrders.length === 0 ? (
                  <div className="text-center py-32">
                    <div className="text-8xl mb-6 opacity-20">🍃</div>
                    <h3 className="text-2xl font-bold text-gray-400">{t("adminOrders.quietForNow")}</h3>
                    <p className="text-gray-400">{t("adminOrders.noOrdersFound")}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {filteredOrders.map((order) => {
                      const status = getStatusConfig(order.status)
                      return (
                        <div key={order._id} className="bg-gray-50 rounded-xl p-5 border border-gray-200 hover:border-[#8B4513]/30 hover:shadow-md transition-all flex flex-col">
                          <div className="flex justify-between items-start mb-6">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-xl font-bold text-gray-800">#{order.orderNumber}</h3>
                                {order.batchNumber && (
                                  <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase">Batch #{order.batchNumber}</span>
                                )}
                                <span className="bg-gray-100 text-gray-500 px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase">{order.tableNumber}</span>
                              </div>
                              <div className="flex items-center gap-2 mt-1.5">
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                                  {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                                <div className="flex items-center gap-1 text-[10px] font-black text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-100 italic">
                                  <Clock className="h-3 w-3" />
                                  {(order.status === 'served' || order.status === 'completed')
                                    ? `Served in ${order.delayMinutes || Math.floor((new Date(order.servedAt || Date.now()).getTime() - new Date(order.createdAt).getTime()) / 60000)}m`
                                    : order.status === 'ready'
                                      ? `Ready since ${Math.floor((Date.now() - new Date(order.readyAt || order.createdAt).getTime()) / 60000)}m`
                                      : `Cooking: ${Math.floor((Date.now() - new Date(order.kitchenAcceptedAt || order.createdAt).getTime()) / 60000)}m`
                                  }
                                </div>
                              </div>
                            </div>
                            <span className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold ${status.color}`}>
                              <span>{status.icon}</span>
                              {order.delayMinutes !== undefined && (
                                <span className={`flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase ${order.delayMinutes > (order.thresholdMinutes || 20) ? 'bg-red-100 text-red-600 border border-red-200' : 'bg-gray-100 text-gray-500'}`}>
                                  ⏱️ {order.delayMinutes}m delay
                                  {order.thresholdMinutes && (
                                    <span className="ml-1 opacity-50">/ {order.thresholdMinutes}m</span>
                                  )}
                                </span>
                              )}
                              {status.label}
                            </span>
                          </div>

                          <div className="flex-1 space-y-3 mb-6 bg-white/50 rounded-[30px] p-5">
                            {order.items.map((item, idx) => (
                              <div key={idx} className="flex justify-between items-center text-sm">
                                <span className="text-gray-600 font-bold">
                                  <span className="text-[#8B4513]">{item.quantity}×</span> {item.name}
                                  {item.menuId && <span className="text-gray-400 font-mono text-xs ml-1">({item.menuId})</span>}
                                </span>
                                <span className="font-bold text-gray-400">{(item.price * item.quantity).toFixed(0)} {t("common.currencyBr")}</span>
                              </div>
                            ))}
                          </div>

                          <div className="flex justify-between items-center pt-2">
                            <div className="text-sm font-bold text-gray-400">{t("adminOrders.totalAmount")}</div>
                            <div className="flex items-center gap-3">
                              <div className="text-3xl font-black text-[#8B4513]">{order.totalAmount.toFixed(0)} {t("common.currencyBr")}</div>
                              <div className="flex gap-2">
                                {!order.isDeleted && (
                                  <button
                                    onClick={() => handleDeleteOrder(order._id, order.orderNumber)}
                                    disabled={deleting === order._id}
                                    className="bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white p-2 rounded-lg transition-all shadow-md hover:shadow-lg transform hover:scale-105 disabled:transform-none"
                                    title="Move to Deleted History"
                                  >
                                    {deleting === order._id ? (
                                      <span className="animate-spin text-xs">⏳</span>
                                    ) : (
                                      "🗑️"
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
