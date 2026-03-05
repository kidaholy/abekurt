"use client"

import { useEffect, useState, useRef } from "react"
import { ProtectedRoute } from "@/components/protected-route"
import { useAuth } from "@/context/auth-context"
import { useSettings } from "@/context/settings-context"
import { ReportExporter } from "@/lib/export-utils"
import { OrderDetailsModal } from "@/components/order-details-modal"
import { ArrowLeft, Download, FileText, Printer, Eye, DollarSign, ShoppingCart, Clock, CheckCircle, ChevronDown } from "lucide-react"
import Link from "next/link"

export default function OrdersReportPage() {
    const [filter, setFilter] = useState("today")
    const [statusFilter, setStatusFilter] = useState("all")
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [selectedOrder, setSelectedOrder] = useState<any>(null)
    const [showOrderDetails, setShowOrderDetails] = useState(false)
    const [showExportDropdown, setShowExportDropdown] = useState(false)
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 })
    const exportButtonRef = useRef<HTMLButtonElement>(null)
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

    const exportCSV = (exportType: 'food' | 'drinks' | 'all' = 'all') => {
        if (!data) return
        console.log("Exporting Orders CSV...", filteredOrders.length, "orders", "Type:", exportType)

        // Helper to check if an item is a drink based on mainCategory or category
        const isDrinkItem = (item: any): boolean => {
            // First check mainCategory (most reliable)
            const mainCat = (item.mainCategory || '').toLowerCase()
            if (mainCat === 'drinks') return true
            if (mainCat === 'food') return false
            
            // If no mainCategory, check category name for drink keywords
            const cat = (item.category || '').toLowerCase()
            const drinkKeywords = ['coffee', 'tea', 'juice', 'drink', 'beverage', 'mojito', 'smoothie', 'soda', 'water', 'latte', 'espresso', 'cappuccino', 'macchiato', 'americano']
            return drinkKeywords.some(keyword => cat.includes(keyword))
        }

        // Separate items into food and drinks
        const foodItems: any[] = []
        const drinksItems: any[] = []

        filteredOrders.forEach((order: any) => {
            const orderDate = new Date(order.createdAt).toLocaleDateString()
            const orderTime = new Date(order.createdAt).toLocaleTimeString()
            
            order.items?.forEach((item: any) => {
                const itemData = {
                    "Order ID": order._id.slice(-8),
                    "Date": orderDate,
                    "Time": orderTime,
                    "Table": order.tableNumber || "N/A",
                    "Item Name": item.name || "Unknown",
                    "Category": item.category || "N/A",
                    "Quantity": item.quantity || 1,
                    "Unit Price": item.price || 0,
                    "Total": (item.price || 0) * (item.quantity || 1),
                    "Status": (order.status || "").toUpperCase()
                }

                if (isDrinkItem(item)) {
                    drinksItems.push(itemData)
                } else {
                    foodItems.push(itemData)
                }
            })
        })

        // Helper function to create CSV data for items
        const createCSVData = (items: any[], type: string) => ({
            title: `${type} Items Report`,
            period: `${filter.toUpperCase()} (${new Date(data.startDate).toLocaleDateString()} - ${new Date(data.endDate).toLocaleDateString()})`,
            headers: ["Order ID", "Date", "Time", "Table", "Item Name", "Category", "Quantity", "Unit Price", "Total", "Status"],
            data: items,
            summary: {
                "Total Items": items.length.toString(),
                "Total Quantity": items.reduce((sum, item) => sum + item.Quantity, 0).toString(),
                "Total Revenue": `${items.reduce((sum, item) => sum + item.Total, 0).toLocaleString()} ብር`,
            }
        })

        // Export based on type
        if (exportType === 'food' || exportType === 'all') {
            if (foodItems.length > 0) {
                ReportExporter.exportToCSV(createCSVData(foodItems, "Food"))
            }
        }

        if (exportType === 'drinks' || exportType === 'all') {
            if (drinksItems.length > 0) {
                // Add delay if exporting both
                const delay = exportType === 'all' ? 500 : 0
                setTimeout(() => {
                    ReportExporter.exportToCSV(createCSVData(drinksItems, "Drinks"))
                }, delay)
            }
        }

        // Show summary
        console.log(`Exported: ${foodItems.length} food items, ${drinksItems.length} drinks items`)
        setShowExportDropdown(false)
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
                                        className={`px-4 py-2 rounded-md text-sm font-bold capitalize transition-all ${filter === f ? "bg-[#8B4513] text-white shadow-md" : "text-gray-500 hover:bg-gray-50"
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
                                {/* CSV Export Dropdown */}
                                <button
                                    ref={exportButtonRef}
                                    onClick={() => {
                                        if (!showExportDropdown && exportButtonRef.current) {
                                            const rect = exportButtonRef.current.getBoundingClientRect()
                                            setDropdownPosition({
                                                top: rect.bottom + 8,
                                                left: Math.max(8, Math.min(rect.left, window.innerWidth - 180))
                                            })
                                        }
                                        setShowExportDropdown(!showExportDropdown)
                                    }}
                                    className="bg-[#D2691E] text-white px-4 py-2 rounded-lg shadow-sm hover:bg-[#B8541A] transition-colors flex items-center gap-2"
                                >
                                    <Download size={16} />
                                    <span className="font-bold">Export CSV</span>
                                    <ChevronDown size={14} />
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

            {/* Export CSV Dropdown - Rendered at root level to avoid clipping */}
            {showExportDropdown && (
                <>
                    <div 
                        className="fixed inset-0 z-[200]"
                        onClick={() => setShowExportDropdown(false)}
                    />
                    <div 
                        className="fixed z-[201] bg-white rounded-2xl shadow-2xl border-2 border-amber-200 py-2 min-w-[180px] overflow-hidden"
                        style={{
                            top: `${dropdownPosition.top}px`,
                            left: `${dropdownPosition.left}px`
                        }}
                    >
                        <button
                            onClick={() => exportCSV('food')}
                            className="w-full px-4 py-3 text-left text-sm hover:bg-gradient-to-r hover:from-amber-50 hover:to-orange-50 flex items-center gap-3 text-gray-700 font-medium transition-all"
                        >
                            <span className="text-lg">🍽️</span>
                            <span>Food Only</span>
                        </button>
                        <button
                            onClick={() => exportCSV('drinks')}
                            className="w-full px-4 py-3 text-left text-sm hover:bg-gradient-to-r hover:from-amber-50 hover:to-orange-50 flex items-center gap-3 text-gray-700 font-medium transition-all"
                        >
                            <span className="text-lg">🥤</span>
                            <span>Drinks Only</span>
                        </button>
                        <div className="my-1 border-t border-gray-100 mx-2" />
                        <button
                            onClick={() => exportCSV('all')}
                            className="w-full px-4 py-3 text-left text-sm hover:bg-gradient-to-r hover:from-amber-50 hover:to-orange-50 flex items-center gap-3 text-gray-700 font-bold transition-all bg-amber-50/50"
                        >
                            <span className="text-lg">📊</span>
                            <span>Both (Separate Files)</span>
                        </button>
                    </div>
                </>
            )}
        </ProtectedRoute>
    )
}