"use client"

import { useEffect, useState } from "react"
import { ProtectedRoute } from "@/components/protected-route"
import { BentoNavbar } from "@/components/bento-navbar"
import { useAuth } from "@/context/auth-context"
import { useLanguage } from "@/context/language-context"
import { useSettings } from "@/context/settings-context"
import { ReportExporter, type ComprehensiveSection } from "@/lib/export-utils"
import { Download, FileText, Printer, CheckCircle, Clock, ShoppingCart, AlertTriangle, Package, ChevronRight } from "lucide-react"

const SLIDES = [
    { id: "financial", label: "Financial Summary", icon: FileText, color: "#8B4513", bg: "bg-[#8B4513]" },
    { id: "orders", label: "Order History", icon: ShoppingCart, color: "#D2691E", bg: "bg-[#D2691E]" },
    { id: "inventory", label: "Inventory Investment", icon: Clock, color: "#7C3AED", bg: "bg-purple-600" },
    { id: "store", label: "Store Investment", icon: Package, color: "#EA580C", bg: "bg-orange-600" },
]

export default function ReportsPage() {
    const [timeRange, setTimeRange] = useState("week")
    const [activeSlide, setActiveSlide] = useState(0)
    const [animating, setAnimating] = useState(false)
    const [direction, setDirection] = useState<"left" | "right">("right")

    // Data State
    const [loading, setLoading] = useState(true)
    const [orders, setOrders] = useState<any[]>([])
    const [stockItems, setStockItems] = useState<any[]>([])
    const [periodData, setPeriodData] = useState<any>(null)
    const [stockUsageData, setStockUsageData] = useState<any>(null)

    // Context
    const { token } = useAuth()
    const { t } = useLanguage()
    const { settings } = useSettings()

    useEffect(() => {
        if (token) fetchAllData()
    }, [token, timeRange])

    const fetchAllData = async () => {
        setLoading(true)
        try {
            const [salesRes, stockRes, usageRes, ordersRes] = await Promise.all([
                fetch(`/api/reports/sales?period=${timeRange}`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`/api/stock`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`/api/reports/stock-usage?period=${timeRange}`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(getOrdersUrl(timeRange), { headers: { Authorization: `Bearer ${token}` } })
            ])
            if (salesRes.ok) setPeriodData(await salesRes.json())
            if (stockRes.ok) setStockItems(await stockRes.json())
            if (usageRes.ok) setStockUsageData(await usageRes.json())
            if (ordersRes.ok) setOrders(await ordersRes.json())
        } catch (error) {
            console.error("Failed to load report data:", error)
        } finally {
            setLoading(false)
        }
    }

    const getOrdersUrl = (range: string) => {
        let url = "/api/orders"
        const now = new Date()
        let startDate: Date | null = null
        if (range === 'today') startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        else if (range === 'week') { startDate = new Date(now); startDate.setDate(now.getDate() - 7); startDate.setHours(0, 0, 0, 0) }
        else if (range === 'month') { startDate = new Date(now); startDate.setDate(now.getDate() - 30); startDate.setHours(0, 0, 0, 0) }
        else if (range === 'year') { startDate = new Date(now); startDate.setDate(now.getDate() - 365); startDate.setHours(0, 0, 0, 0) }
        if (startDate) url += `?startDate=${startDate.toISOString()}`
        return url
    }

    const goToSlide = (idx: number) => {
        if (idx === activeSlide || animating) return
        setDirection(idx > activeSlide ? "right" : "left")
        setAnimating(true)
        setTimeout(() => {
            setActiveSlide(idx)
            setAnimating(false)
        }, 260)
    }

    // Calculations
    const salesSummary = periodData?.summary || {}
    const totalRevenue = salesSummary.totalRevenue || 0
    const totalInvestment = salesSummary.lifetimeTotalInvestment || 0
    const netWorth = salesSummary.lifetimeNetWorth || 0
    const filteredOrders = [...orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    // Export functions
    const exportFinancialReport = () => {
        const data = [
            { Metric: "Total Revenue", Type: "INCOME", Amount: `${totalRevenue.toLocaleString()} ETB`, Description: "Total completed orders value for this period" },
            { Metric: "Total Investment", Type: "EXPENSE", Amount: `${totalInvestment.toLocaleString()} ETB`, Description: "Lifetime cumulative investment" },
            { Metric: "NET WORTH (Profit)", Type: "RESULT", Amount: `${netWorth.toLocaleString()} ETB`, Description: "Global business standing" }
        ]
        ReportExporter.exportToWord({ title: "Financial Summary Report", period: timeRange, headers: ["Metric", "Type", "Amount", "Description"], data, metadata: { companyName: settings.app_name || "Prime Addis" } })
    }

    const exportOrdersReport = () => {
        const data = filteredOrders.map(o => ({
            "Item Names": o.items.map((i: any) => i.name).join(", "),
            "Table": o.tableNumber ? `T-${o.tableNumber}` : "-",
            "Items (Qty)": o.items.reduce((acc: number, i: any) => acc + (i.quantity || 0), 0),
            "Total Payment": `${o.totalAmount.toLocaleString()} ETB`,
            "Status": o.status,
            "Date/Time": new Date(o.createdAt).toLocaleString()
        }))
        ReportExporter.exportToWord({ title: "Order History Report", period: timeRange, headers: ["Item Names", "Table", "Items (Qty)", "Total Payment", "Status", "Date/Time"], data, metadata: { companyName: settings.app_name || "Prime Addis" } })
    }

    const exportInventoryReport = () => {
        const data = (stockUsageData?.stockAnalysis || stockItems || []).map((item: any) => {
            const costPrice = item.weightedAvgCost ?? item.averagePurchasePrice ?? 0
            const sellingPrice = item.currentUnitCost ?? item.unitCost ?? 0
            const closingQuantity = item.closingStock ?? item.quantity ?? 0
            const consumedCount = item.consumed ?? 0
            const totalHandled = item.totalLifetimePurchased ?? (closingQuantity + consumedCount)
            const totalPurchaseValue = item.totalLifetimeInvestment ?? (totalHandled * costPrice)
            const potentialRevenue = closingQuantity * sellingPrice
            const isLow = item.isLowStock || (closingQuantity <= (item.minLimit || 5))
            return {
                "Item Name": item.name,
                "Unit Cost": Math.round(sellingPrice).toLocaleString(),
                "Quantity": `${totalHandled} ${item.unit || "unit"}`,
                "Total Purchase": `${totalPurchaseValue.toLocaleString()} ETB`,
                "Consumed": `${consumedCount} Usage`,
                "Remains": `${closingQuantity} ${item.unit || "unit"}`,
                "Potential Rev.": `${potentialRevenue.toLocaleString()} ETB`,
                "Status": isLow ? "Low Stock" : "OK"
            }
        })
        ReportExporter.exportToWord({ title: "Inventory Investment Report", period: timeRange, headers: ["Item Name", "Unit Cost", "Quantity", "Total Purchase", "Consumed", "Remains", "Potential Rev.", "Status"], data, metadata: { companyName: settings.app_name || "Prime Addis" } })
    }

    const exportFullReport = () => {
        const sections: ComprehensiveSection[] = [
            {
                title: "Financial Summary",
                headers: ["Metric", "Type", "Amount", "Description"],
                data: [
                    { Metric: "Total Revenue", Type: "INCOME", Amount: `${totalRevenue.toLocaleString()} ETB`, Description: "Total completed orders value" },
                    { Metric: "Total Investment", Type: "EXPENSE", Amount: `${totalInvestment.toLocaleString()} ETB`, Description: "Lifetime cumulative investment" },
                    { Metric: "NET WORTH (Profit)", Type: "RESULT", Amount: `${netWorth.toLocaleString()} ETB`, Description: "Lifetime Revenue - Investment" }
                ]
            },
            {
                title: "Order History",
                headers: ["Item Names", "Table", "Items (Qty)", "Total Payment", "Status", "Date/Time"],
                data: filteredOrders.map(o => ({
                    "Item Names": o.items.map((i: any) => i.name).join(", "),
                    "Table": o.tableNumber ? `T-${o.tableNumber}` : "-",
                    "Items (Qty)": o.items.reduce((acc: number, i: any) => acc + (i.quantity || 0), 0),
                    "Total Payment": `${o.totalAmount.toLocaleString()} ETB`,
                    "Status": o.status,
                    "Date/Time": new Date(o.createdAt).toLocaleString()
                }))
            }
        ]
        ReportExporter.exportComprehensiveToWord({ title: "Comprehensive Business BI Report", period: timeRange, sections, metadata: { companyName: settings.app_name || "Prime Addis" } })
    }

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-50">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#8B4513] border-t-transparent"></div>
            </div>
        )
    }

    const slide = SLIDES[activeSlide]
    const SlideIcon = slide.icon

    return (
        <ProtectedRoute requiredRoles={["admin"]}>
            <style>{`
                @keyframes slideInRight { from { opacity: 0; transform: translateX(40px); } to { opacity: 1; transform: translateX(0); } }
                @keyframes slideInLeft  { from { opacity: 0; transform: translateX(-40px); } to { opacity: 1; transform: translateX(0); } }
                .slide-enter-right { animation: slideInRight 0.26s ease forwards; }
                .slide-enter-left  { animation: slideInLeft  0.26s ease forwards; }
            `}</style>

            <div className="min-h-screen bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-4">
                    <BentoNavbar />

                    {/* Top Header */}
                    <div className="bg-white rounded-xl p-4 md:p-5 shadow-sm border border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h1 className="text-2xl font-black text-gray-900">Business Intelligence</h1>
                            <p className="text-gray-500 text-sm mt-0.5">Consolidated reports · {SLIDES[activeSlide].label}</p>
                        </div>
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            {/* Time Range */}
                            <div className="flex bg-gray-100 p-1 rounded-xl overflow-x-auto scrollbar-hide flex-1 sm:flex-none">
                                {["today", "week", "month", "year"].map((r) => (
                                    <button
                                        key={r}
                                        onClick={() => setTimeRange(r)}
                                        className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all whitespace-nowrap ${timeRange === r ? "bg-[#8B4513] text-white shadow-sm" : "text-gray-500 hover:text-gray-900"}`}
                                    >{r}</button>
                                ))}
                            </div>
                            <button onClick={exportFullReport} className="bg-[#8B4513] text-white px-4 py-2 rounded-xl font-black text-xs uppercase shadow-lg hover:bg-[#D2691E] transition-all flex items-center gap-2 whitespace-nowrap">
                                <Download size={13} /> Export All
                            </button>
                            <button onClick={() => window.print()} className="bg-white border border-gray-200 text-gray-500 p-2 rounded-xl hover:bg-gray-50 transition-colors shadow-sm">
                                <Printer size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Main Layout: Side Tabs + Slide Panel */}
                    <div className="flex gap-4 items-stretch">

                        {/* Vertical Side Tab Bar */}
                        <div className="hidden md:flex flex-col gap-2 w-52 shrink-0">
                            {SLIDES.map((s, idx) => {
                                const Icon = s.icon
                                const isActive = idx === activeSlide
                                return (
                                    <button
                                        key={s.id}
                                        onClick={() => goToSlide(idx)}
                                        className={`flex items-center gap-3 px-4 py-4 rounded-2xl font-bold text-sm text-left transition-all duration-200 group ${isActive
                                            ? `${s.bg} text-white shadow-lg scale-[1.02]`
                                            : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200 shadow-sm"
                                            }`}
                                    >
                                        <Icon size={18} className={isActive ? "text-white" : "text-gray-400 group-hover:text-gray-600"} />
                                        <span className="leading-tight text-xs font-black uppercase tracking-wide">{s.label}</span>
                                        {isActive && <ChevronRight size={14} className="ml-auto text-white/70" />}
                                    </button>
                                )
                            })}
                        </div>

                        {/* Mobile Horizontal Tab Bar */}
                        <div className="md:hidden flex gap-2 overflow-x-auto pb-1 w-full">
                            {SLIDES.map((s, idx) => {
                                const Icon = s.icon
                                const isActive = idx === activeSlide
                                return (
                                    <button
                                        key={s.id}
                                        onClick={() => goToSlide(idx)}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-xs uppercase whitespace-nowrap transition-all shrink-0 ${isActive
                                            ? `${s.bg} text-white shadow-md`
                                            : "bg-white text-gray-500 border border-gray-200"
                                            }`}
                                    >
                                        <Icon size={14} />
                                        {s.label}
                                    </button>
                                )
                            })}
                        </div>

                        {/* Slide Panel */}
                        <div className="flex-1 min-w-0 overflow-hidden">
                            <div
                                key={activeSlide}
                                className={`${!animating
                                    ? direction === "right" ? "slide-enter-right" : "slide-enter-left"
                                    : "opacity-0"
                                    }`}
                            >
                                {/* ── FINANCIAL SUMMARY ── */}
                                {activeSlide === 0 && (
                                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 space-y-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 bg-[#8B4513] rounded-full flex items-center justify-center text-white">
                                                    <FileText size={20} />
                                                </div>
                                                <div>
                                                    <h2 className="text-xl font-black text-slate-800">Financial Summary</h2>
                                                    <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">Period · {timeRange}</p>
                                                </div>
                                            </div>
                                            <button onClick={exportFinancialReport} className="flex items-center gap-2 text-[#8B4513] hover:text-[#D2691E] font-bold text-sm transition-colors">
                                                <Download size={16} /> Export
                                            </button>
                                        </div>

                                        {/* Desktop Table */}
                                        <div className="hidden md:block overflow-x-auto border border-gray-100 rounded-2xl">
                                            <table className="w-full text-left">
                                                <thead className="bg-gray-50 text-gray-600 uppercase text-[10px] font-black tracking-widest border-b border-gray-100">
                                                    <tr>
                                                        <th className="p-4">Metric</th>
                                                        <th className="p-4 text-center">Type</th>
                                                        <th className="p-4 text-right">Amount</th>
                                                        <th className="p-4">Description</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50 font-bold">
                                                    <tr className="hover:bg-gray-50/50 transition-colors">
                                                        <td className="p-4 text-lg text-slate-800">Total Revenue</td>
                                                        <td className="p-4 text-center"><span className="bg-emerald-50 text-emerald-600 py-1 px-3 rounded-lg text-[9px] font-black uppercase tracking-widest">INCOME</span></td>
                                                        <td className="p-4 text-right text-lg font-black text-emerald-600">+{totalRevenue.toLocaleString()} ETB</td>
                                                        <td className="p-4 text-gray-400 text-xs font-medium">Total completed orders value</td>
                                                    </tr>
                                                    <tr className="hover:bg-gray-50/50 transition-colors">
                                                        <td className="p-4 text-lg text-slate-800">Total Investment</td>
                                                        <td className="p-4 text-center"><span className="bg-red-50 text-red-600 py-1 px-3 rounded-lg text-[9px] font-black uppercase tracking-widest">EXPENSE</span></td>
                                                        <td className="p-4 text-right text-lg font-black text-red-600">-{totalInvestment.toLocaleString()} ETB</td>
                                                        <td className="p-4 text-gray-400 text-xs font-medium">Lifetime cumulative investment (Purchases + Operational Expenses)</td>
                                                    </tr>
                                                    <tr className="bg-slate-900 text-white">
                                                        <td className="p-6 text-xl font-black">NET WORTH (Profit)</td>
                                                        <td className="p-6 text-center"><span className="bg-white/20 text-white py-1 px-3 rounded-lg text-[9px] font-black uppercase tracking-widest">RESULT</span></td>
                                                        <td className={`p-6 text-right text-3xl font-black ${netWorth >= 0 ? "text-emerald-400" : "text-red-400"}`}>{netWorth.toLocaleString()} <span className="text-sm">ETB</span></td>
                                                        <td className="p-6 text-white/50 text-sm font-medium italic">Lifetime Revenue - Total Investment</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Mobile Cards */}
                                        <div className="md:hidden space-y-4">
                                            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Income</span>
                                                    <span className="text-[10px] font-bold text-emerald-600/60 uppercase">Total Revenue</span>
                                                </div>
                                                <p className="text-2xl font-black text-emerald-700">+{totalRevenue.toLocaleString()} <span className="text-xs">ETB</span></p>
                                            </div>
                                            <div className="p-4 rounded-2xl bg-red-50 border border-red-100">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-[10px] font-black text-red-600 uppercase tracking-widest">Expense</span>
                                                    <span className="text-[10px] font-bold text-red-600/60 uppercase">Total Investment</span>
                                                </div>
                                                <p className="text-2xl font-black text-red-700">-{totalInvestment.toLocaleString()} <span className="text-xs">ETB</span></p>
                                            </div>
                                            <div className="p-6 rounded-2xl bg-slate-900 text-white shadow-xl">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-[10px] font-black text-white/50 uppercase tracking-widest">Current Position</span>
                                                    <span className="bg-white/20 px-2 py-0.5 rounded text-[9px] font-black uppercase">Net Worth</span>
                                                </div>
                                                <p className={`text-4xl font-black ${netWorth >= 0 ? "text-emerald-400" : "text-red-400"}`}>{netWorth.toLocaleString()} <span className="text-lg">ETB</span></p>
                                                <p className="text-white/40 text-[10px] mt-4 font-medium italic">Lifetime revenue minus all physical investment costs.</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* ── ORDER HISTORY ── */}
                                {activeSlide === 1 && (
                                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 space-y-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 bg-[#D2691E] rounded-full flex items-center justify-center text-white">
                                                    <ShoppingCart size={20} />
                                                </div>
                                                <div>
                                                    <h2 className="text-xl font-black text-slate-800">Order History</h2>
                                                    <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">{filteredOrders.length} Orders · {timeRange}</p>
                                                </div>
                                            </div>
                                            <button onClick={exportOrdersReport} className="flex items-center gap-2 text-[#D2691E] hover:text-[#8B4513] font-bold text-sm transition-colors">
                                                <Download size={16} /> Export
                                            </button>
                                        </div>

                                        <div className="hidden lg:block max-h-[560px] overflow-y-auto border border-gray-200 rounded-2xl">
                                            <table className="w-full text-left">
                                                <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] font-black tracking-widest sticky top-0 z-10">
                                                    <tr>
                                                        <th className="p-4">Item Names</th>
                                                        <th className="p-4 text-center">Table</th>
                                                        <th className="p-4 text-center">Qty</th>
                                                        <th className="p-4 text-right">Payment</th>
                                                        <th className="p-4 text-center">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50 font-bold text-sm">
                                                    {filteredOrders.length === 0 ? (
                                                        <tr><td colSpan={5} className="p-8 text-center text-gray-400 italic font-medium">No orders found for this period.</td></tr>
                                                    ) : (
                                                        filteredOrders.map((order) => {
                                                            const itemNames = order.items.map((i: any) => i.name).join(", ")
                                                            const totalQty = order.items.reduce((acc: number, i: any) => acc + (i.quantity || 0), 0)
                                                            return (
                                                                <tr key={order._id} className="hover:bg-gray-50 transition-colors">
                                                                    <td className="p-4 text-slate-800">
                                                                        <div className="line-clamp-1 text-base" title={itemNames}>{itemNames}</div>
                                                                        <div className="text-[10px] text-gray-400 font-mono mt-0.5">#{order._id.slice(-6)} · {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                                                    </td>
                                                                    <td className="p-4 text-center">
                                                                        <div className="flex flex-col items-center gap-1">
                                                                            {order.floorName && <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider">{order.floorName}</span>}
                                                                            {order.tableNumber ? <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-lg text-xs font-black">{order.tableNumber}</span> : <span className="text-gray-300">-</span>}
                                                                        </div>
                                                                    </td>
                                                                    <td className="p-4 text-center text-slate-500">{totalQty}</td>
                                                                    <td className="p-4 text-right font-black text-[#8B4513]">{(order.totalAmount || 0).toLocaleString()} Br</td>
                                                                    <td className="p-4 text-center uppercase tracking-widest text-[9px]">
                                                                        <span className={`px-2 py-1 rounded-lg font-black ${order.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : order.status === 'cancelled' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>{order.status}</span>
                                                                    </td>
                                                                </tr>
                                                            )
                                                        })
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Mobile Order Cards */}
                                        <div className="lg:hidden space-y-3">
                                            {filteredOrders.length === 0 ? (
                                                <div className="p-8 text-center text-gray-400 italic font-medium">No orders found.</div>
                                            ) : (
                                                filteredOrders.slice(0, 50).map((order) => {
                                                    const itemNames = order.items.map((i: any) => i.name).join(", ")
                                                    return (
                                                        <div key={order._id} className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                                                            <div className="flex justify-between items-start mb-2">
                                                                <div className="flex flex-col">
                                                                    <span className="font-black text-slate-800 line-clamp-1">{itemNames}</span>
                                                                    <span className="text-[10px] font-mono text-gray-400">#{order._id.slice(-6)} · {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                                </div>
                                                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${order.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{order.status}</span>
                                                            </div>
                                                            <div className="flex justify-between items-end mt-4">
                                                                <div className="flex items-center gap-2">
                                                                    {order.floorName && <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-[9px] font-black uppercase">{order.floorName}</span>}
                                                                    {order.tableNumber && <span className="bg-white border border-gray-200 px-2 py-1 rounded text-[10px] font-black text-gray-600">{order.tableNumber}</span>}
                                                                    <span className="text-[10px] font-bold text-gray-400">{order.items.reduce((s: any, i: any) => s + (i.quantity || 0), 0)} ITEMS</span>
                                                                </div>
                                                                <span className="text-lg font-black text-[#8B4513]">{(order.totalAmount || 0).toLocaleString()} <span className="text-xs">Br</span></span>
                                                            </div>
                                                        </div>
                                                    )
                                                })
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* ── INVENTORY INVESTMENT ── */}
                                {activeSlide === 2 && (
                                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 space-y-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 bg-purple-600 rounded-full flex items-center justify-center text-white">
                                                    <Clock size={20} />
                                                </div>
                                                <div>
                                                    <h2 className="text-xl font-black text-slate-800">Inventory Investment Details</h2>
                                                    {stockUsageData && (
                                                        <p className="text-xs text-red-500 font-bold flex items-center gap-1">
                                                            <AlertTriangle size={11} /> {stockUsageData.summary.lowStockItemsCount} Low Stock items
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <button onClick={exportInventoryReport} className="flex items-center gap-2 text-purple-600 hover:text-purple-800 font-bold text-sm transition-colors">
                                                <Download size={16} /> Export
                                            </button>
                                        </div>

                                        <div className="hidden lg:block max-h-[560px] overflow-y-auto border border-gray-200 rounded-2xl">
                                            <table className="w-full text-left">
                                                <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] font-black tracking-widest sticky top-0 z-10">
                                                    <tr>
                                                        <th className="p-4">Item Name</th>
                                                        <th className="p-4 text-center text-orange-600">Sell Price</th>
                                                        <th className="p-4 text-center">Remains</th>
                                                        <th className="p-4 text-center text-green-600">Total Inv.</th>
                                                        <th className="p-4 text-center text-red-500">Usage</th>
                                                        <th className="p-4 text-right text-blue-600">Potential</th>
                                                        <th className="p-4 text-center">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50 font-bold text-sm">
                                                    {(stockUsageData?.stockAnalysis || stockItems || [])
                                                        .filter((item: any) => item.openingStock > 0 || item.transferred > 0 || item.closingStock > 0 || item.consumed > 0 || item.quantity > 0)
                                                        .map((item: any, idx: number) => {
                                                            const costPrice = item.weightedAvgCost ?? item.averagePurchasePrice ?? 0
                                                            const sellingPrice = item.currentUnitCost ?? item.unitCost ?? 0
                                                            const closingQuantity = item.closingStock ?? item.quantity ?? 0
                                                            const consumedCount = item.consumed ?? 0
                                                            const totalHandled = item.transferred ?? (closingQuantity + consumedCount)
                                                            const remains = closingQuantity
                                                            const totalPurchaseValue = item.transferredValue ?? (totalHandled * costPrice)
                                                            const potentialRevenue = remains * sellingPrice
                                                            const isLow = item.isLowStock || (remains <= (item.minLimit || 5))
                                                            return (
                                                                <tr key={idx} className={`hover:bg-gray-50 transition-colors ${isLow ? 'bg-red-50/30' : ''}`}>
                                                                    <td className="p-4">
                                                                        <p className="font-black text-slate-800">{item.name}</p>
                                                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-0.5">{item.category}</p>
                                                                    </td>
                                                                    <td className="p-4 text-center text-orange-600">{Math.round(sellingPrice).toLocaleString()} <span className="text-[10px]">Br</span></td>
                                                                    <td className="p-4 text-center"><p className={`text-sm ${isLow ? 'text-red-600' : 'text-slate-800'}`}>{remains} <span className="text-[10px] text-gray-400">{item.unit}</span></p></td>
                                                                    <td className="p-4 text-center text-green-600">
                                                                        {totalPurchaseValue.toLocaleString()} <span className="text-[10px]">Br</span>
                                                                        <div className="text-[9px] text-gray-400 font-medium">@{Math.round(costPrice)} avg</div>
                                                                    </td>
                                                                    <td className="p-4 text-center text-red-400">{consumedCount} <span className="text-[10px] uppercase font-black tracking-tighter">Used</span></td>
                                                                    <td className="p-4 text-right text-blue-600">{potentialRevenue.toLocaleString()} <span className="text-[10px]">Br</span></td>
                                                                    <td className="p-4 text-center"><span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${isLow ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{isLow ? 'LOW' : 'OK'}</span></td>
                                                                </tr>
                                                            )
                                                        })}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Mobile Inventory Cards */}
                                        <div className="lg:hidden space-y-4">
                                            {(stockUsageData?.stockAnalysis || stockItems || [])
                                                .filter((item: any) => item.openingStock > 0 || item.transferred > 0 || item.closingStock > 0 || item.consumed > 0 || item.quantity > 0)
                                                .map((item: any, idx: number) => {
                                                    const closingQuantity = item.closingStock ?? item.quantity ?? 0
                                                    const consumedCount = item.consumed ?? 0
                                                    const remains = closingQuantity
                                                    const isLow = item.isLowStock || (remains <= (item.minLimit || 5))
                                                    return (
                                                        <div key={idx} className={`p-4 rounded-2xl border ${isLow ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}`}>
                                                            <div className="flex justify-between items-start mb-3">
                                                                <div>
                                                                    <p className="font-black text-slate-800 text-lg leading-tight">{item.name}</p>
                                                                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mt-1">{item.category}</p>
                                                                </div>
                                                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${isLow ? 'bg-red-500 text-white shadow-lg shadow-red-200' : 'bg-emerald-500 text-white shadow-lg shadow-emerald-200'}`}>{isLow ? 'Low Stock' : 'Healthy'}</span>
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-4 mt-4">
                                                                <div className="bg-white p-3 rounded-xl border border-gray-100">
                                                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Stock Remains</p>
                                                                    <p className={`text-xl font-black ${isLow ? 'text-red-600' : 'text-slate-800'}`}>{remains} <span className="text-xs text-gray-400 uppercase">{item.unit}</span></p>
                                                                </div>
                                                                <div className="bg-white p-3 rounded-xl border border-gray-100">
                                                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Usage Count</p>
                                                                    <p className="text-xl font-black text-slate-800">{consumedCount} <span className="text-xs text-gray-400 uppercase">Usage</span></p>
                                                                </div>
                                                            </div>
                                                            <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100">
                                                                <div>
                                                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Potential Revenue</p>
                                                                    <p className="text-lg font-black text-blue-600">{(remains * (item.unitCost || 0)).toLocaleString()} Br</p>
                                                                </div>
                                                                <div className="text-right">
                                                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Unit Price</p>
                                                                    <p className="text-lg font-black text-orange-600">{(item.unitCost || 0).toLocaleString()} Br</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                        </div>
                                    </div>
                                )}

                                {/* ── STORE INVESTMENT ── */}
                                {activeSlide === 3 && (
                                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 space-y-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 bg-orange-600 rounded-full flex items-center justify-center text-white">
                                                    <Package size={20} />
                                                </div>
                                                <div>
                                                    <h2 className="text-xl font-black text-slate-800">Store Investment Details</h2>
                                                    <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">Bulk inventory overview</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="hidden lg:block max-h-[560px] overflow-y-auto border border-gray-200 rounded-2xl">
                                            <table className="w-full text-left">
                                                <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] font-black tracking-widest sticky top-0 z-10">
                                                    <tr>
                                                        <th className="p-4">Item Name</th>
                                                        <th className="p-4 text-center text-orange-600">Unit Cost</th>
                                                        <th className="p-4 text-center">In Store</th>
                                                        <th className="p-4 text-center text-green-600">Total Inv.</th>
                                                        <th className="p-4 text-center text-red-500">Transferred</th>
                                                        <th className="p-4 text-center">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50 font-bold text-sm">
                                                    {(stockUsageData?.stockAnalysis || stockItems || [])
                                                        .filter((item: any) => (item.storeQuantity || 0) > 0 || (item.purchased || 0) > 0 || (item.totalPurchased || 0) > 0 || (item.storeOpeningStock || 0) > 0)
                                                        .map((item: any, idx: number) => {
                                                            const costPrice = item.averagePurchasePrice || item.currentUnitCost || item.unitCost || 0
                                                            const remains = item.storeQuantity ?? 0
                                                            const transferredCount = item.transferred ?? 0
                                                            const totalPurchaseValue = item.storeClosingValue ?? (remains * costPrice)
                                                            const isLow = item.isLowStoreStock || (remains <= (item.storeMinLimit || 5)) && remains > 0
                                                            return (
                                                                <tr key={idx} className={`hover:bg-gray-50 transition-colors ${isLow ? 'bg-red-50/30' : ''}`}>
                                                                    <td className="p-4">
                                                                        <p className="font-black text-slate-800">{item.name}</p>
                                                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-0.5">{item.category}</p>
                                                                    </td>
                                                                    <td className="p-4 text-center text-orange-600">{Math.round(costPrice).toLocaleString()} <span className="text-[10px]">Br</span></td>
                                                                    <td className="p-4 text-center"><p className={`text-sm ${isLow ? 'text-red-600' : 'text-slate-800'}`}>{remains} <span className="text-[10px] text-gray-400">{item.unit}</span></p></td>
                                                                    <td className="p-4 text-center text-green-600">{totalPurchaseValue.toLocaleString()} <span className="text-[10px]">Br</span></td>
                                                                    <td className="p-4 text-center text-red-400">{transferredCount} <span className="text-[10px] uppercase font-black tracking-tighter">Moved</span></td>
                                                                    <td className="p-4 text-center"><span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${isLow ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{isLow ? 'LOW' : 'OK'}</span></td>
                                                                </tr>
                                                            )
                                                        })}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Mobile Store Cards */}
                                        <div className="lg:hidden space-y-4">
                                            {(stockUsageData?.stockAnalysis || stockItems || [])
                                                .filter((item: any) => (item.storeQuantity || 0) > 0 || (item.purchased || 0) > 0 || (item.totalPurchased || 0) > 0 || (item.storeOpeningStock || 0) > 0)
                                                .map((item: any, idx: number) => {
                                                    const costPrice = item.averagePurchasePrice || item.currentUnitCost || item.unitCost || 0
                                                    const remains = item.storeQuantity ?? 0
                                                    const transferredCount = item.transferred ?? 0
                                                    const totalPurchaseValue = item.storeClosingValue ?? (remains * costPrice)
                                                    const isLow = item.isLowStoreStock || (remains <= (item.storeMinLimit || 5)) && remains > 0
                                                    return (
                                                        <div key={idx} className={`p-4 rounded-2xl border ${isLow ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}`}>
                                                            <div className="flex justify-between items-start mb-3">
                                                                <div>
                                                                    <p className="font-black text-slate-800 text-lg leading-tight">{item.name}</p>
                                                                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mt-1">{item.category}</p>
                                                                </div>
                                                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${isLow ? 'bg-red-500 text-white shadow-lg shadow-red-200' : 'bg-emerald-500 text-white shadow-lg shadow-emerald-200'}`}>{isLow ? 'Low Stock' : 'Healthy'}</span>
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-4 mt-4">
                                                                <div className="bg-white p-3 rounded-xl border border-gray-100">
                                                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Store Remains</p>
                                                                    <p className={`text-xl font-black ${isLow ? 'text-red-600' : 'text-slate-800'}`}>{remains} <span className="text-xs text-gray-400 uppercase">{item.unit}</span></p>
                                                                </div>
                                                                <div className="bg-white p-3 rounded-xl border border-gray-100">
                                                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Moved to Stock</p>
                                                                    <p className="text-xl font-black text-slate-800">{transferredCount} <span className="text-xs text-gray-400 uppercase">Moved</span></p>
                                                                </div>
                                                            </div>
                                                            <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100">
                                                                <div>
                                                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Total Inv</p>
                                                                    <p className="text-lg font-black text-green-600">{totalPurchaseValue.toLocaleString()} Br</p>
                                                                </div>
                                                                <div className="text-right">
                                                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Unit Cost</p>
                                                                    <p className="text-lg font-black text-orange-600">{Math.round(costPrice).toLocaleString()} Br</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    )
}
