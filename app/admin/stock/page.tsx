"use client"

import { useEffect, useState, useRef } from "react"
import { ProtectedRoute } from "@/components/protected-route"
import { BentoNavbar } from "@/components/bento-navbar"
import { useAuth } from "@/context/auth-context"
import { useLanguage } from "@/context/language-context"
import { ConfirmationCard, NotificationCard } from "@/components/confirmation-card"
import { useConfirmation } from "@/hooks/use-confirmation"
import {
    Plus, Search, Trash2, Edit2, TrendingUp, History,
    Package, BarChart3, AlertCircle, ShoppingCart, Download, ChevronDown
} from "lucide-react"
import { ReportExporter } from "@/lib/export-utils"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"

interface StockItem {
    _id: string
    name: string
    category: string
    quantity?: number // Active Stock
    storeQuantity?: number // Store Bulk
    unit: string
    minLimit?: number
    averagePurchasePrice?: number
    unitCost?: number
    trackQuantity: boolean
    showStatus: boolean
    status: 'active' | 'out_of_stock'
    totalInvestment?: number
    totalLifetimeInvestment?: number
    totalPurchased?: number
    totalLifetimePurchased?: number
    totalConsumed?: number
    sellUnitEquivalent?: number
}

export default function StockInventoryPage() {
    const [stockItems, setStockItems] = useState<StockItem[]>([])
    const [loading, setLoading] = useState(true)
    const [editingStock, setEditingStock] = useState<StockItem | null>(null)
    const [showStockForm, setShowStockForm] = useState(false)
    const [saveLoading, setSaveLoading] = useState(false)
    const [searchTerm, setSearchTerm] = useState("")
    const [showExportDropdown, setShowExportDropdown] = useState(false)
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 })
    const exportButtonRef = useRef<HTMLButtonElement>(null)

    // Dynamic Categories
    const [categories, setCategories] = useState<any[]>([])

    const [stockFormData, setStockFormData] = useState({
        name: "",
        category: "",
        quantity: "",
        unit: "kg",
        minLimit: "",
        totalPurchaseCost: "",
        unitCost: "",
        trackQuantity: true,
        showStatus: true,
        sellUnitEquivalent: "1"
    })

    const { token } = useAuth()
    const { t } = useLanguage()
    const { confirmationState, confirm, closeConfirmation, notificationState, notify, closeNotification } = useConfirmation()

    useEffect(() => {
        if (token) {
            fetchStockItems()
            fetchCategories()
        }

        const timeout = setTimeout(() => {
            if (loading) setLoading(false)
        }, 10000)

        return () => clearTimeout(timeout)
    }, [token])

    const fetchStockItems = async () => {
        try {
            setLoading(true)
            const response = await fetch("/api/stock?availableOnly=true", {
                headers: { Authorization: `Bearer ${token}` },
            })
            if (response.ok) {
                const data = await response.json()
                setStockItems(data)
            }
        } catch (error) {
            console.error("Error fetching stock:", error)
        } finally {
            setLoading(false)
        }
    }

    const fetchCategories = async () => {
        try {
            const response = await fetch("/api/categories?type=stock", {
                headers: { Authorization: `Bearer ${token}` },
            })
            if (response.ok) {
                const data = await response.json()
                setCategories(data)
                if (data.length > 0 && !stockFormData.category) {
                    setStockFormData(prev => ({ ...prev, category: data[0].name }))
                }
            }
        } catch (error) {
            console.error("Error fetching categories:", error)
        }
    }

    const handleSaveStock = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaveLoading(true)
        try {
            const url = editingStock ? `/api/stock/${editingStock._id}` : "/api/stock"
            const method = editingStock ? "PUT" : "POST"

            const response = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    ...stockFormData,
                    quantity: stockFormData.quantity === "" ? undefined : Number(stockFormData.quantity),
                    minLimit: stockFormData.minLimit === "" ? undefined : Number(stockFormData.minLimit),
                    unitCost: stockFormData.unitCost === "" ? undefined : Number(stockFormData.unitCost),
                    sellUnitEquivalent: stockFormData.sellUnitEquivalent === "" || stockFormData.sellUnitEquivalent === undefined ? 1 : Number(stockFormData.sellUnitEquivalent.toString().replace(',', '.')) || 1
                }),
            })

            if (response.ok) {
                fetchStockItems()
                resetStockForm()
                notify({
                    title: "Stock Updated",
                    message: "Stock item details have been saved.",
                    type: "success"
                })
            }
        } catch (error) {
            console.error("Error saving stock:", error)
        } finally {
            setSaveLoading(false)
        }
    }

    const deleteStockItem = async (id: string | undefined) => {
        if (!id) return
        const confirmed = await confirm({
            title: "Delete Stock Item",
            message: "This will remove the item from the POS (Active Stock) list. If the item still has quantity in the Store, the master record will be kept.",
            type: "danger"
        })

        if (!confirmed) return
        try {
            const response = await fetch(`/api/stock/${id}?source=stock`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            })
            if (response.ok) fetchStockItems()
        } catch (error) {
            console.error(error)
        }
    }

    const handleEditStock = (item: StockItem) => {
        setEditingStock(item)
        setStockFormData({
            name: item.name,
            category: item.category,
            quantity: item.quantity?.toString() || "0",
            unit: item.unit,
            minLimit: item.minLimit?.toString() || "",
            totalPurchaseCost: item.totalInvestment?.toString() || "",
            unitCost: item.unitCost?.toString() || "",
            trackQuantity: item.trackQuantity,
            showStatus: item.showStatus,
            sellUnitEquivalent: item.sellUnitEquivalent?.toString() || "1"
        })
        setShowStockForm(true)
    }

    const resetStockForm = () => {
        setStockFormData({
            name: "",
            category: "meat",
            quantity: "0",
            unit: "kg",
            minLimit: "",
            totalPurchaseCost: "",
            unitCost: "",
            trackQuantity: true,
            showStatus: true,
            sellUnitEquivalent: "1"
        })
        setEditingStock(null)
        setShowStockForm(false)
    }

    const filteredStock = stockItems.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const stats = {
        totalValue: stockItems.reduce((sum, item) => sum + ((item.quantity || 0) * (item.unitCost || 0)), 0),
        lowStock: stockItems.filter(item => item.trackQuantity && (item.quantity || 0) <= (item.minLimit || 0)).length,
        totalInStore: stockItems.reduce((sum, item) => sum + (item.storeQuantity || 0), 0),
        totalItems: stockItems.length
    }

    const handleExportDropdownToggle = () => {
        if (!showExportDropdown && exportButtonRef.current) {
            const rect = exportButtonRef.current.getBoundingClientRect()
            setDropdownPosition({
                top: rect.bottom + 8,
                left: Math.max(8, rect.left)
            })
        }
        setShowExportDropdown(!showExportDropdown)
    }

    const exportStockCSV = (exportType: 'all' | 'low' | 'ready' | 'empty' = 'all') => {
        let itemsToExport = [...filteredStock]
        let fileName = 'Stock Inventory Report'

        if (exportType === 'low') {
            itemsToExport = filteredStock.filter(item =>
                item.trackQuantity &&
                (item.quantity || 0) <= (item.minLimit || 0) &&
                (item.quantity || 0) > 0
            )
            fileName = 'Low Stock Report'
        } else if (exportType === 'empty') {
            itemsToExport = filteredStock.filter(item =>
                item.trackQuantity && (item.quantity || 0) <= 0
            )
            fileName = 'Empty Stock Report'
        } else if (exportType === 'ready') {
            itemsToExport = filteredStock.filter(item =>
                !item.trackQuantity || (item.quantity || 0) > (item.minLimit || 0)
            )
            fileName = 'Ready Stock Report'
        }

        if (itemsToExport.length === 0) {
            notify({
                title: "No Items",
                message: "No items to export for this category.",
                type: "info"
            })
            setShowExportDropdown(false)
            return
        }

        const headers = ['Item Name', 'Category', 'Quantity', 'Unit', 'Status', 'Min Limit', 'Unit Cost', 'Total Value']
        const data = itemsToExport.map(item => {
            const isOut = item.trackQuantity && (item.quantity || 0) <= 0
            const isLow = item.trackQuantity && (item.quantity || 0) <= (item.minLimit || 0) && (item.quantity || 0) > 0
            const status = isOut ? 'Empty' : isLow ? 'Low Stock' : 'Ready'
            const totalValue = ((item.quantity || 0) * (item.unitCost || 0)).toFixed(2)

            return {
                'Item Name': item.name,
                'Category': item.category,
                'Quantity': (item.quantity || 0).toLocaleString(),
                'Unit': item.unit,
                'Status': status,
                'Min Limit': item.minLimit || '',
                'Unit Cost': item.unitCost || '',
                'Total Value': `${totalValue} Br`
            }
        })

        ReportExporter.exportToCSV({
            title: fileName,
            period: new Date().toLocaleDateString(),
            headers,
            data
        })

        setShowExportDropdown(false)
        notify({
            title: "Export Complete",
            message: `Exported ${itemsToExport.length} items to CSV.`,
            type: "success"
        })
    }

    return (
        <ProtectedRoute requiredRoles={["admin"]}>
            <div className="min-h-screen bg-gray-50 p-6">
                <div className="max-w-7xl mx-auto space-y-6">
                    <BentoNavbar />

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* Status Sidebar */}
                        <div className="lg:col-span-3 space-y-4">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                                <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-6 flex items-center gap-3">
                                    <BarChart3 className="w-3 h-3" /> Quick Stats
                                </h3>
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-2xl font-black text-slate-800">{stats.totalValue.toLocaleString()} <span className="text-[10px]">Br</span></p>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase">POS Inventory Value</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 pt-4 border-t border-gray-50">
                                        <div className="p-3 bg-blue-50 rounded-xl">
                                            <p className="text-xl font-black text-blue-600">{stats.totalInStore.toLocaleString()}</p>
                                            <p className="text-[8px] font-black text-blue-300 uppercase">In Store</p>
                                        </div>
                                        <div className="p-3 bg-yellow-50 rounded-xl">
                                            <p className="text-xl font-black text-yellow-600">{stats.lowStock}</p>
                                            <p className="text-[8px] font-black text-yellow-300 uppercase">Low</p>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>

                            <Link href="/admin/store" className="block p-6 bg-[#8B4513] rounded-xl text-white hover:bg-[#5D4037] transition-all group shadow-lg shadow-[#8B4513]/10">
                                <div className="flex items-center justify-between mb-4">
                                    <Package className="w-6 h-6 opacity-60" />
                                    <TrendingUp className="w-4 h-4 opacity-40 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                </div>
                                <h3 className="font-bold text-lg leading-tight">Need to Restock?</h3>
                                <p className="text-xs text-white/60 mt-2 font-medium">Go to store to transfer items or record purchases.</p>
                                <div className="mt-4 flex items-center gap-2 font-black text-[10px] uppercase tracking-widest">
                                    Open Store <Plus className="w-3 h-3" />
                                </div>
                            </Link>
                        </div>

                        {/* Main Inventory */}
                        <div className="lg:col-span-9 space-y-4">
                            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                                        <ShoppingCart className="w-6 h-6 text-[#8B4513]" /> Active Stock
                                    </h2>
                                    <p className="text-gray-500 text-sm">Inventory currently available for POS sales.</p>
                                </div>
                                <div className="flex items-center gap-3 w-full md:w-auto">
                                    <div className="relative flex-1 md:w-64">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Search stock..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full pl-10 pr-4 py-3 bg-white rounded-2xl border border-gray-100 outline-none font-bold text-sm shadow-sm"
                                        />
                                    </div>
                                    <button
                                        ref={exportButtonRef}
                                        onClick={handleExportDropdownToggle}
                                        className="bg-[#8B4513] text-white px-4 py-3 rounded-2xl shadow-sm hover:bg-[#5D4037] transition-colors flex items-center gap-2 whitespace-nowrap"
                                    >
                                        <Download size={16} />
                                        <span className="font-bold hidden sm:inline">Export CSV</span>
                                        <ChevronDown size={14} />
                                    </button>
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden min-h-[500px]">
                                {loading ? (
                                    <div className="py-24 flex flex-col items-center opacity-20">
                                        <History className="w-12 h-12 animate-spin-slow mb-4" />
                                        <p className="text-[10px] font-black uppercase tracking-widest">Loading...</p>
                                    </div>
                                ) : filteredStock.length === 0 ? (
                                    <div className="py-24 flex flex-col items-center justify-center text-gray-400">
                                        <Package className="w-12 h-12 mb-4 opacity-20" />
                                        <p className="font-bold text-center">Your active stock is empty.<br />Transfer items from the Store to make them available for POS.</p>
                                        <Link href="/admin/store" className="mt-6 px-6 py-2 bg-[#8B4513] text-white rounded-xl text-sm font-bold shadow-lg shadow-[#8B4513]/10 hover:bg-[#5D4037] transition-all">Go to Store</Link>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="border-b border-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50/50">
                                                    <th className="py-4 pl-6">Item</th>
                                                    <th className="py-4">Category</th>
                                                    <th className="py-4">Active Stock</th>
                                                    <th className="py-4">Status</th>
                                                    <th className="py-4 text-right pr-6">Management</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {filteredStock.map((item) => {
                                                    const isLow = item.trackQuantity && (item.quantity || 0) <= (item.minLimit || 0) && (item.quantity || 0) > 0;
                                                    const isOut = item.trackQuantity && (item.quantity || 0) <= 0;
                                                    return (
                                                        <tr key={item._id} className="group hover:bg-gray-50/50 transition-colors">
                                                            <td className="py-5 pl-6 font-bold text-slate-800">{item.name}</td>
                                                            <td className="py-5 text-xs text-gray-400 font-bold uppercase tracking-widest">{item.category}</td>
                                                            <td className="py-5">
                                                                <div className="flex items-baseline gap-1">
                                                                    <span className={`text-xl font-black ${isOut ? 'text-red-500' : isLow ? 'text-yellow-600' : 'text-emerald-600'}`}>
                                                                        {(item.quantity || 0).toLocaleString()}
                                                                    </span>
                                                                    <span className="text-[10px] font-bold text-gray-400 uppercase">{item.unit}</span>
                                                                </div>
                                                                {item.sellUnitEquivalent && item.sellUnitEquivalent > 0 && item.sellUnitEquivalent !== 1 && (
                                                                    <p className="text-[10px] font-black uppercase text-amber-600 mt-0.5">
                                                                        ≈ {((item.quantity || 0) / item.sellUnitEquivalent).toFixed(1)} Portions
                                                                    </p>
                                                                )}
                                                            </td>
                                                            <td className="py-5">
                                                                {isOut ? (
                                                                    <span className="text-[10px] font-black uppercase text-red-500 bg-red-50 px-2 py-1 rounded-md">Empty</span>
                                                                ) : isLow ? (
                                                                    <span className="text-[10px] font-black uppercase text-yellow-600 bg-yellow-50 px-2 py-1 rounded-md">Low Stock</span>
                                                                ) : (
                                                                    <span className="text-[10px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">Ready</span>
                                                                )}
                                                            </td>
                                                            <td className="py-5 text-right pr-6">
                                                                <div className="flex justify-end gap-2">
                                                                    <button onClick={() => handleEditStock(item)} className="p-2 text-gray-400 hover:text-[#8B4513] hover:bg-[#8B4513]/5 rounded-lg transition-all"><Edit2 size={16} /></button>
                                                                    <button onClick={() => deleteStockItem(item._id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={16} /></button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <AnimatePresence>
                    {showStockForm && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={resetStockForm} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
                            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="relative bg-white rounded-3xl p-8 max-w-md w-full">
                                <h2 className="text-xl font-black mb-6">Edit Active Stock</h2>
                                <form onSubmit={handleSaveStock} className="space-y-4">
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Item Name</label>
                                        <input type="text" value={stockFormData.name} readOnly className="w-full p-4 bg-gray-50 rounded-xl font-bold text-gray-400 outline-none" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Active Qty</label>
                                            <input type="number" value={stockFormData.quantity} onChange={e => setStockFormData({ ...stockFormData, quantity: e.target.value })} className="w-full p-4 bg-gray-50 rounded-xl font-black text-xl text-[#8B4513] outline-none" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Alert Limit</label>
                                            <input type="number" step="any" value={stockFormData.minLimit} onChange={e => setStockFormData({ ...stockFormData, minLimit: e.target.value })} className="w-full p-4 bg-gray-50 rounded-xl font-bold outline-none" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Sell Unit Equivalent ({stockFormData.unit}/portion)</label>
                                        <input type="number" step="any" placeholder="e.g. 0.46" value={stockFormData.sellUnitEquivalent} onChange={e => setStockFormData({ ...stockFormData, sellUnitEquivalent: e.target.value })} className="w-full p-4 bg-gray-50 rounded-xl font-bold outline-none text-[#8B4513]" />
                                    </div>
                                    <div className="flex gap-4 pt-6">
                                        <button type="button" onClick={resetStockForm} className="flex-1 py-4 font-bold text-gray-400">Cancel</button>
                                        <button type="submit" disabled={saveLoading} className="flex-[2] py-4 bg-[#8B4513] text-white rounded-xl font-bold shadow-lg shadow-[#8B4513]/20">
                                            {saveLoading ? "Saving..." : "Update Stock"}
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* Export CSV Dropdown - Rendered at root level to avoid clipping */}
                {showExportDropdown && (
                    <>
                        <div
                            className="fixed inset-0 z-[200]"
                            onClick={() => setShowExportDropdown(false)}
                        />
                        <div
                            className="fixed z-[201] bg-white rounded-2xl shadow-2xl border-2 border-amber-200 py-2 min-w-[170px] overflow-hidden"
                            style={{
                                top: `${dropdownPosition.top}px`,
                                left: `${dropdownPosition.left}px`
                            }}
                        >
                            <button
                                onClick={() => exportStockCSV('all')}
                                className="w-full px-4 py-3 text-left text-sm hover:bg-gradient-to-r hover:from-amber-50 hover:to-orange-50 flex items-center gap-3 text-gray-700 font-bold transition-all bg-amber-50/50"
                            >
                                <span className="text-lg">📦</span>
                                <span>All Stock</span>
                            </button>
                            <div className="my-1 border-t border-gray-100 mx-2" />
                            <button
                                onClick={() => exportStockCSV('ready')}
                                className="w-full px-4 py-3 text-left text-sm hover:bg-gradient-to-r hover:from-amber-50 hover:to-orange-50 flex items-center gap-3 text-gray-700 font-medium transition-all"
                            >
                                <span className="text-lg">✅</span>
                                <span>Ready Stock</span>
                            </button>
                            <button
                                onClick={() => exportStockCSV('low')}
                                className="w-full px-4 py-3 text-left text-sm hover:bg-gradient-to-r hover:from-amber-50 hover:to-orange-50 flex items-center gap-3 text-gray-700 font-medium transition-all"
                            >
                                <span className="text-lg">⚠️</span>
                                <span>Low Stock</span>
                            </button>
                            <button
                                onClick={() => exportStockCSV('empty')}
                                className="w-full px-4 py-3 text-left text-sm hover:bg-gradient-to-r hover:from-amber-50 hover:to-orange-50 flex items-center gap-3 text-gray-700 font-medium transition-all"
                            >
                                <span className="text-lg">❌</span>
                                <span>Empty Stock</span>
                            </button>
                        </div>
                    </>
                )}

                <ConfirmationCard isOpen={confirmationState.isOpen} onClose={closeConfirmation} onConfirm={confirmationState.onConfirm} title={confirmationState.options.title} message={confirmationState.options.message} type={confirmationState.options.type} />
                <NotificationCard isOpen={notificationState.isOpen} onClose={closeNotification} title={notificationState.options.title} message={notificationState.options.message} type={notificationState.options.type} />
            </div>
        </ProtectedRoute>
    )
}
