"use client"

import { useEffect, useState } from "react"
import { ProtectedRoute } from "@/components/protected-route"
import { useAuth } from "@/context/auth-context"
import { useLanguage } from "@/context/language-context"
import { useSettings } from "@/context/settings-context"
import { RefreshCw, Monitor, Clock, ChefHat, CheckCircle } from 'lucide-react'

interface Order {
    _id: string
    orderNumber: string
    status: "pending" | "preparing" | "ready" | "completed" | "cancelled"
    batchNumber?: string
    tableNumber?: string
    createdAt: string
}

export default function OrderDisplayPage() {
    const [orders, setOrders] = useState<Order[]>([])
    const [loading, setLoading] = useState(true)
    const { token, user } = useAuth()
    const { language, setLanguage, t } = useLanguage()
    const { settings } = useSettings()

    useEffect(() => {
        fetchOrders()
        const interval = setInterval(fetchOrders, 3000) // Fast refresh for display
        return () => clearInterval(interval)
    }, [token])

    const fetchOrders = async () => {
        try {
            const response = await fetch("/api/orders", {
                headers: { Authorization: `Bearer ${token}` },
            })
            if (response.ok) {
                const data = await response.json()
                // Show pending, preparing and ready orders
                const activeOrders = data.filter((order: Order) =>
                    ["pending", "preparing", "ready"].includes(order.status)
                )
                setOrders(activeOrders)
            }
        } catch (err) {
            console.error("Failed to load orders")
        } finally {
            setLoading(false)
        }
    }

    const pendingOrders = orders.filter((o) => o.status === "pending")
    const preparingOrders = orders.filter((o) => o.status === "preparing")
    const readyOrders = orders.filter((o) => o.status === "ready")

    return (
        <ProtectedRoute requiredRoles={["display", "admin"]}>
            <div className="min-h-screen bg-gray-50 text-gray-900 overflow-hidden p-6 flex flex-col font-sans">
                {/* Header */}
                <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-6">
                        <div className="p-4 bg-primary/10 rounded-2xl">
                            <Monitor className="h-10 w-10 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-black tracking-tight text-gray-900">
                                {settings.app_name || t("display.title")}
                            </h1>
                            <div className="flex items-center gap-3 text-gray-500 text-lg mt-1 font-bold uppercase tracking-widest">
                                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                                <span>{user?.batchNumber ? `Batch #${user.batchNumber}` : (user?.batchId ? t("display.status") : t("display.status"))}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-8">
                        <div className="flex bg-gray-100 p-1 rounded-xl">
                            <button
                                onClick={() => setLanguage("en")}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${language === "en" ? "bg-white text-primary shadow-sm" : "text-gray-400 hover:text-gray-600"}`}
                            >
                                EN
                            </button>
                            <button
                                onClick={() => setLanguage("am")}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${language === "am" ? "bg-white text-primary shadow-sm" : "text-gray-400 hover:text-gray-600"}`}
                            >
                                አማ
                            </button>
                        </div>
                        <div className="text-right">
                            <div className="text-5xl font-black font-mono tracking-tighter text-gray-900">
                                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            <p className="text-gray-400 font-bold uppercase tracking-widest text-sm mt-1">
                                {settings.app_tagline || t("display.liveUpdates")}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Content Overlay/Warning for Display Users without Floor */}
                {user?.role === 'display' && !user?.batchId && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-gray-50/90 backdrop-blur-sm">
                        <div className="bg-white rounded-[3rem] p-12 shadow-2xl border border-red-100 max-w-2xl text-center transform scale-110">
                            <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-8">
                                <Monitor className="w-12 h-12 text-red-500" />
                            </div>
                            <h2 className="text-4xl font-black text-gray-900 mb-4">{t("display.assignmentRequired")}</h2>
                            <p className="text-xl text-gray-500 font-medium">
                                {t("display.assignmentDesc")}
                            </p>
                            <div className="mt-10 flex flex-col gap-4">
                                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest leading-relaxed">
                                        {t("display.currentRole")}: <span className="text-red-600">{t("display.monitor")}</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Display Content - 3 Column Grid */}
                <div className={`flex-1 grid grid-cols-3 gap-8 ${user?.role === 'display' && !user?.batchId ? 'blur-md pointer-events-none' : ''}`}>

                    {/* Pending Column */}
                    <div className="flex flex-col h-full">
                        <div className="flex items-center justify-between mb-6 px-2">
                            <h2 className="text-3xl font-black uppercase tracking-tight text-gray-400 flex items-center gap-3">
                                <Clock className="w-8 h-8" />
                                {t("display.pending")}
                            </h2>
                            <span className="bg-gray-200 px-4 py-1 rounded-xl text-xl font-bold text-gray-600">
                                {pendingOrders.length}
                            </span>
                        </div>
                        <div className="flex-1 bg-white rounded-[2.5rem] p-6 border border-gray-100 shadow-sm overflow-y-auto scrollbar-hide">
                            <div className="grid grid-cols-1 gap-4">
                                {pendingOrders.map(order => (
                                    <div key={order._id} className="bg-gray-50 p-6 rounded-2xl border border-gray-100 flex items-center justify-between">
                                        <div>
                                            <span className="text-4xl font-black font-mono tracking-tighter text-gray-700">
                                                #{order.orderNumber}
                                            </span>
                                            <div className="flex items-center gap-2 mt-1">
                                                {order.batchNumber && (
                                                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                                                        Batch #{order.batchNumber}
                                                    </span>
                                                )}
                                                {order.tableNumber && (
                                                    <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                                        {order.tableNumber}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                                            {t("display.inQueue")}
                                        </span>
                                    </div>
                                ))}
                                {pendingOrders.length === 0 && (
                                    <div className="h-64 flex flex-col items-center justify-center opacity-20 text-gray-400">
                                        <Clock className="w-16 h-16 mb-2" />
                                        <span className="font-bold">{t("display.noPending")}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Preparing Column */}
                    <div className="flex flex-col h-full">
                        <div className="flex items-center justify-between mb-6 px-2">
                            <h2 className="text-3xl font-black uppercase tracking-tight text-yellow-600/80 flex items-center gap-3">
                                <ChefHat className="w-8 h-8" />
                                {t("display.preparing")}
                            </h2>
                            <span className="bg-yellow-100 px-4 py-1 rounded-xl text-xl font-bold text-yellow-700">
                                {preparingOrders.length}
                            </span>
                        </div>
                        <div className="flex-1 bg-yellow-50/50 rounded-[2.5rem] p-6 border border-yellow-100 overflow-y-auto scrollbar-hide">
                            <div className="grid grid-cols-1 gap-4">
                                {preparingOrders.map(order => (
                                    <div key={order._id} className="bg-white p-8 rounded-[2rem] border border-yellow-100 shadow-md flex flex-col items-center justify-center animate-pulse">
                                        <span className="text-6xl font-black font-mono tracking-tighter text-yellow-600">
                                            #{order.orderNumber}
                                        </span>
                                        <div className="flex items-center gap-2 mt-2">
                                            {order.batchNumber && (
                                                <span className="text-[10px] font-bold text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-full">
                                                    Batch #{order.batchNumber}
                                                </span>
                                            )}
                                            {order.tableNumber && (
                                                <span className="text-[10px] font-bold text-yellow-600/70 bg-yellow-50 px-2 py-0.5 rounded-full">
                                                    {order.tableNumber}
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-xs font-bold text-yellow-600/60 uppercase tracking-widest mt-1">
                                            {t("display.cooking")}
                                        </span>
                                    </div>
                                ))}
                                {preparingOrders.length === 0 && (
                                    <div className="h-64 flex flex-col items-center justify-center opacity-20 text-yellow-600">
                                        <ChefHat className="w-16 h-16 mb-2" />
                                        <span className="font-bold">{t("display.kitchenClear")}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Ready Column */}
                    <div className="flex flex-col h-full">
                        <div className="flex items-center justify-between mb-6 px-2">
                            <h2 className="text-3xl font-black uppercase tracking-tight text-green-600 flex items-center gap-3">
                                <CheckCircle className="w-8 h-8" />
                                {t("display.ready")}
                            </h2>
                            <span className="bg-green-100 px-4 py-1 rounded-xl text-xl font-bold text-green-700">
                                {readyOrders.length}
                            </span>
                        </div>
                        <div className="flex-1 bg-green-50/50 rounded-[2.5rem] p-6 border border-green-100 overflow-y-auto scrollbar-hide">
                            <div className="grid grid-cols-1 gap-4">
                                {readyOrders.map(order => (
                                    <div key={order._id} className="bg-white p-8 rounded-[2rem] border-2 border-green-500 shadow-xl flex flex-col items-center justify-center scale-[1.02] transform transition-all">
                                        <span className="text-7xl font-black font-mono tracking-tighter text-green-600">
                                            #{order.orderNumber}
                                        </span>
                                        <div className="flex items-center gap-2 mt-2">
                                            {order.batchNumber && (
                                                <span className="text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                                                    Batch #{order.batchNumber}
                                                </span>
                                            )}
                                            {order.tableNumber && (
                                                <span className="text-[10px] font-bold text-green-600/70 bg-green-50 px-2 py-0.5 rounded-full">
                                                    {order.tableNumber}
                                                </span>
                                            )}
                                        </div>
                                        <span className="bg-green-100 text-green-700 px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest mt-2">
                                            {t("display.serveNow")}
                                        </span>
                                    </div>
                                ))}
                                {readyOrders.length === 0 && (
                                    <div className="h-64 flex flex-col items-center justify-center opacity-20 text-green-600">
                                        <CheckCircle className="w-16 h-16 mb-2" />
                                        <span className="font-bold">{t("display.noReady")}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div className="mt-8 flex justify-between items-center text-gray-400 font-bold uppercase tracking-[0.2em] text-xs">
                    <div className="flex gap-8">
                        <span>{t("display.view")} • {t("display.id")}: {user?.id}</span>
                        <span>{t("display.refresh")}: 3{t("display.seconds")}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <RefreshCw className="h-3 w-3 animate-spin text-gray-300" />
                        <span>{t("display.connected")}</span>
                    </div>
                </div>
            </div>

            <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
        </ProtectedRoute>
    )
}
