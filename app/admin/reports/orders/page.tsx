"use client"

import { useEffect, useState } from "react"
import { ProtectedRoute } from "@/components/protected-route"
import { useAuth } from "@/context/auth-context"
import { useSettings } from "@/context/settings-context"
import { ReportExporter } from "@/lib/export-utils"
import { OrderDetailsModal } from "@/components/order-details-modal"
import { ArrowLeft, Download, FileText, Printer, Eye, DollarSign, ShoppingCart, Clock, CheckCircle } from "lucide-react"
import Link from "next/link"

export default function OrdersReportPage() {
    const [filter, setFilter] = useState("today")
    const [statusFilter, setStatusFilter] = useState("all")
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [selectedOrder, setSelectedOrder] = useState<any>(null)
    const [showOrderDetails, setShowOrderDetails] = useState(false)
    const { token } = useAuth()
    const { settings } = useSettings()

    useEffect(() => {
        if (token) {
            fetchReport()
        }
    }, [token, filter])

    const fetchReport = async () => {
        setLoading(true)
        setError(null)

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 10000) // 10s timeout

        try {
            const res = await fetch(`/api/reports/sales?period=${filter}`, {
                headers: { Authorization: `Bearer ${token}` },
                signal: controller.signal
            })

            clearTimeout(timeoutId)

            if (res.ok) {
                const report = await res.json()
                setData(report)
            } else {
                const errorData = await res.json().catch(() => ({}))
                setError(errorData.message || `Error: ${res.status} ${res.statusText}`)
            }
        } catch (err: any) {
            clearTimeout(timeoutId)
            if (err.name === 'AbortError') {
                setError("Request timed out. Please try again.")
            } else {
                setError(err.message || "Failed to fetch report")
            }
        } finally {
            setLoading(false)
        }
    }

    const filteredOrders = data?.orders?.filter((order: any) => {
        if (statusFilter === "all") return true
        return order.status === statusFilter
    }) || []

    const exportCSV = () => {
        if (!data) return

        const csvData = {
            title: "Orders Report",
            period: `${filter.toUpperCase()} (${new Date(data.startDate).toLocaleDateString()} - ${new Date(data.endDate).toLocaleDateString()})`,
            headers: ["Order ID", "Date", "Time", "Table", "Waiter", "Items", "Total Amount", "Status"],
            data: filteredOrders.map((order: any) => ({
                "Order ID": order._id.slice(-8),
                "Date": new Date(order.createdAt).toLocaleDateString(),
                "Time": new Date(order.createdAt).toLocaleTimeString(),
                "Table": order.tableNumber || "N/A",
                "Waiter": order.waiterName || "N/A",
                "Items": order.items.length,
                "Total Amount": `${order.totalAmount.toLocaleString()} ብር`,
                "Status": order.status.toUpperCase()
            })),
            summary: {
                "Total Orders": filteredOrders.length.toString(),
                "Total Revenue": `${data.summary.totalRevenue.toLocaleString()} ብር`,
                "Average Order Value": `${data.summary.averageOrderValue.toFixed(2)} ብር`,
                "Completed Orders": data.summary.completedOrders.toString(),
                "Pending Orders": data.summary.pendingOrders.toString()
            }
        }

        ReportExporter.exportToCSV(csvData)
    }

    const exportPDF = () => {
        if (!data) return

        const pdfData = {
            title: "Orders Report",
            period: `${filter.toUpperCase()} (${new Date(data.startDate).toLocaleDateString()} - ${new Date(data.endDate).toLocaleDateString()})`,
            headers: ["Order ID", "Date", "Table", "Waiter", "Items", "Total", "Status"],
            data: filteredOrders.slice(0, 50).map((order: any) => ({
                "Order ID": order._id.slice(-8),
                "Date": new Date(order.createdAt).toLocaleDateString(),
                "Table": order.tableNumber || "N/A",
                "Waiter": order.waiterName || "N/A",
                "Items": order.items.length.toString(),
                "Total": `${order.totalAmount.toLocaleString()} ብር`,
                "Status": order.status.toUpperCase()
            })),
            summary: {
                "Total Orders": filteredOrders.length.toString(),
                "Total Revenue": `${data.summary.totalRevenue.toLocaleString()} ብር`,
                "Average Order Value": `${data.summary.averageOrderValue.toFixed(2)} ብር`,
                "Completed Orders": data.summary.completedOrders.toString(),
                "Pending Orders": data.summary.pendingOrders.toString()
            }
        }

        ReportExporter.exportToPDF(pdfData)
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'bg-green-100 text-green-800'
            case 'preparing': return 'bg-yellow-100 text-yellow-800'
            case 'ready': return 'bg-blue-100 text-blue-800'
            case 'pending': return 'bg-gray-100 text-gray-800'
            default: return 'bg-gray-100 text-gray-800'
        }
    }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed': return <CheckCircle size={16} />
            case 'preparing': return <Clock size={16} />
            case 'ready': return <ShoppingCart size={16} />
            case 'pending': return <Clock size={16} />
            default: return <Clock size={16} />
        }
    }

    if (loading) {
        return (
            <ProtectedRoute requiredRoles={["admin"]}>
                <div className="min-h-screen bg-gray-50 p-8">
                    <div className="max-w-7xl mx-auto">
                        <div className="p-20 text-center">
                            <div className="w-10 h-10 border-4 border-[#8B4513] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                            <p className="font-bold text-gray-400">Loading Orders Report...</p>
                        </div>
                    </div>
                </div>
            </ProtectedRoute>
        )
    }

    if (error) {
        return (
            <ProtectedRoute requiredRoles={["admin"]}>
                <div className="min-h-screen bg-gray-50 p-8">
                    <div className="max-w-7xl mx-auto">
                        <div className="p-20 text-center">
                            <p className="text-red-600 font-bold mb-4">Error: {error}</p>
                            <button
                                onClick={fetchReport}
                                className="bg-[#8B4513] text-white px-4 py-2 rounded-lg hover:bg-[#7A3D0F] transition-colors"
                            >
                                Retry
                            </button>
                        </div>
                    </div>
                </div>
            </ProtectedRoute>
        )
    }

    return (
        <ProtectedRoute requiredRoles={["admin"]}>
            <div className="min-h-screen bg-gray-50 p-8 font-sans print:bg-white print:p-0">
                <div className="max-w-7xl mx-auto space-y-6">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
                        <div>
                            <Link href="/admin/reports" className="flex items-center gap-2 text-gray-400 hover:text-[#8B4513] font-bold mb-2 transition-colors">
                                <ArrowLeft size={16} /> Back to Reports
                            </Link>
                            <h1 className="text-3xl font-black text-slate-900">Orders Report</h1>
                            <p className="text-gray-500 font-medium mt-1">Complete transaction history and order analysis</p>
                        </div>

                        <div className="flex gap-4 items-center">
                            {/* Period Filter */}
                            <div className="flex gap-2 bg-white p-1.5 rounded-lg shadow-sm border">
                                {["today", "week", "month", "year"].map((f) => (
                                    <button
                                        key={f}
                                        onClick={() => setFilter(f)}
                                        className={`px-4 py-2 rounded-md text-sm font-bold capitalize transition-all ${
                                            filter === f ? "bg-[#8B4513] text-white shadow-md" : "text-gray-500 hover:bg-gray-50"
                                        }`}
                                    >
                                        {f}
                                    </button>
                                ))}
                            </div>

                            {/* Status Filter */}
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#8B4513]"
                            >
                                <option value="all">All Status</option>
                                <option value="completed">Completed</option>
                                <option value="preparing">Preparing</option>
                                <option value="ready">Ready</option>
                                <option value="pending">Pending</option>
                            </select>

                            {/* Export Options */}
                            <div className="flex gap-2">
                                <button
                                    onClick={exportCSV}
                                    className="bg-[#D2691E] text-white px-4 py-2 rounded-lg shadow-sm hover:bg-[#B8541A] transition-colors flex items-center gap-2"
                                >
                                    <Download size={16} />
                                    <span className="font-bold">CSV</span>
                                </button>
                                <button
                                    onClick={exportPDF}
                                    className="bg-[#8B4513] text-white px-4 py-2 rounded-lg shadow-sm hover:bg-[#7A3D0F] transition-colors flex items-center gap-2"
                                >
                                    <FileText size={16} />
                                    <span className="font-bold">PDF</span>
                                </button>
                                <button
                                    onClick={() => window.print()}
                                    className="bg-white text-[#8B4513] px-4 py-2 rounded-lg shadow-sm hover:bg-gray-50 transition-colors border border-gray-200"
                                >
                                    <Printer size={16} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Print Header */}
                    <div className="hidden print:block mb-8">
                        <h1 className="text-2xl font-black mb-2">Orders Report</h1>
                        <p className="text-sm">Period: {filter.toUpperCase()} | Status: {statusFilter.toUpperCase()}</p>
                        <p className="text-sm text-gray-500">Generated: {new Date().toLocaleString()}</p>
                    </div>

                    {data && (
                        <>
                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-gray-500">Total Orders</p>
                                            <p className="text-2xl font-bold text-blue-600">{filteredOrders.length}</p>
                                        </div>
                                        <ShoppingCart className="w-8 h-8 text-blue-500" />
                                    </div>
                                </div>

                                <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-gray-500">Total Revenue</p>
                                            <p className="text-2xl font-bold text-green-600">{data.summary.totalRevenue.toLocaleString()} ብር</p>
                                        </div>
                                        <DollarSign className="w-8 h-8 text-green-500" />
                                    </div>
                                </div>

                                <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-gray-500">Average Order Value</p>
                                            <p className="text-2xl font-bold text-purple-600">{data.summary.averageOrderValue.toFixed(0)} ብር</p>
                                        </div>
                                        <DollarSign className="w-8 h-8 text-purple-500" />
                                    </div>
                                </div>

                                <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-gray-500">Completed Orders</p>
                                            <p className="text-2xl font-bold text-green-600">{data.summary.completedOrders}</p>
                                        </div>
                                        <CheckCircle className="w-8 h-8 text-green-500" />
                                    </div>
                                </div>
                            </div>

                            {/* Orders Table */}
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                                <div className="px-6 py-4 border-b border-gray-200">
                                    <h3 className="text-lg font-bold text-gray-900">
                                        Order Details ({filteredOrders.length} orders)
                                    </h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Order ID</th>
                                                <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Date & Time</th>
                                                <th className="text-center py-3 px-4 font-semibold text-sm text-gray-700">Table</th>
                                                <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Waiter</th>
                                                <th className="text-center py-3 px-4 font-semibold text-sm text-gray-700">Items</th>
                                                <th className="text-right py-3 px-4 font-semibold text-sm text-gray-700">Total Amount</th>
                                                <th className="text-center py-3 px-4 font-semibold text-sm text-gray-700">Status</th>
                                                <th className="text-center py-3 px-4 font-semibold text-sm text-gray-700 print:hidden">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {filteredOrders.map((order: any, idx: number) => (
                                                <tr key={idx} className="hover:bg-gray-50">
                                                    <td className="py-3 px-4 font-mono text-sm font-medium text-gray-900">
                                                        #{order._id.slice(-8)}
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <div>
                                                            <p className="font-medium text-sm text-gray-900">
                                                                {new Date(order.createdAt).toLocaleDateString()}
                                                            </p>
                                                            <p className="text-xs text-gray-500">
                                                                {new Date(order.createdAt).toLocaleTimeString()}
                                                            </p>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-4 text-center font-medium">
                                                        {order.tableNumber || "N/A"}
                                                    </td>
                                                    <td className="py-3 px-4 text-sm text-gray-600">
                                                        {order.waiterName || "N/A"}
                                                    </td>
                                                    <td className="py-3 px-4 text-center font-medium">
                                                        {order.items.length}
                                                    </td>
                                                    <td className="py-3 px-4 text-right font-bold text-green-600">
                                                        {order.totalAmount.toLocaleString()} ብር
                                                    </td>
                                                    <td className="py-3 px-4 text-center">
                                                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                                                            {getStatusIcon(order.status)}
                                                            {order.status.toUpperCase()}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-4 text-center print:hidden">
                                                        <button
                                                            onClick={() => {
                                                                setSelectedOrder(order)
                                                                setShowOrderDetails(true)
                                                            }}
                                                            className="text-[#8B4513] hover:text-[#7A3D0F] transition-colors"
                                                        >
                                                            <Eye size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                                            <tr>
                                                <td colSpan={5} className="py-3 px-4 text-right font-bold text-gray-700">
                                                    Total Revenue ({filteredOrders.length} orders):
                                                </td>
                                                <td className="py-3 px-4 text-right font-bold text-lg text-green-600">
                                                    {filteredOrders.reduce((sum: number, order: any) => sum + order.totalAmount, 0).toLocaleString()} ብር
                                                </td>
                                                <td colSpan={2}></td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Order Details Modal */}
            {showOrderDetails && selectedOrder && (
                <OrderDetailsModal
                    isOpen={showOrderDetails}
                    order={selectedOrder}
                    onClose={() => {
                        setShowOrderDetails(false)
                        setSelectedOrder(null)
                    }}
                />
            )}
        </ProtectedRoute>
    )
}