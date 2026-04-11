"use client"

import { useEffect, useState } from "react"
import { ProtectedRoute } from "@/components/protected-route"
import { BentoNavbar } from "@/components/bento-navbar"
import { useAuth } from "@/context/auth-context"
import { useLanguage } from "@/context/language-context"
import { ConfirmationCard, NotificationCard } from "@/components/confirmation-card"
import { useConfirmation } from "@/hooks/use-confirmation"
import {
    Plus, Search, Check, X as CloseIcon,
    ArrowRightLeft, Package, Clock,
    CheckCircle2, XCircle, AlertCircle,
    ChevronDown, Filter
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface TransferRequest {
    _id: string
    stockId: {
        _id: string
        name: string
        unit: string
        storeQuantity: number
        quantity: number
    }
    quantity: number
    status: 'pending' | 'approved' | 'denied'
    requestedBy: { name: string }
    handledBy?: { name: string }
    denialReason?: string
    notes?: string
    createdAt: string
    updatedAt: string
}

interface StockItem {
    _id: string
    name: string
    unit: string
    storeQuantity: number
}

export default function TransfersPage() {
    const { token, user } = useAuth()
    const { t } = useLanguage()
    const { confirmation, showConfirmation, hideConfirmation } = useConfirmation()

    const [requests, setRequests] = useState<TransferRequest[]>([])
    const [stockItems, setStockItems] = useState<StockItem[]>([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [saveLoading, setSaveLoading] = useState(false)
    const [searchTerm, setSearchTerm] = useState("")
    const [filterStatus, setFilterStatus] = useState<string>("all")

    const [newRequest, setNewRequest] = useState({
        stockId: "",
        quantity: "",
        notes: ""
    })

    const [denialModal, setDenialModal] = useState<{ isOpen: boolean, requestId: string, reason: string }>({
        isOpen: false,
        requestId: "",
        reason: ""
    })

    useEffect(() => {
        if (token) {
            fetchData()
            fetchStock()
        }
    }, [token, filterStatus])

    const fetchData = async () => {
        setLoading(true)
        try {
            const statusQuery = filterStatus !== "all" ? `?status=${filterStatus}` : ""
            const response = await fetch(`/api/inventory/transfers${statusQuery}`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            if (response.ok) {
                const data = await response.json()
                setRequests(data)
            }
        } catch (err) {
            console.error("Failed to fetch requests", err)
        } finally {
            setLoading(false)
        }
    }

    const fetchStock = async () => {
        try {
            const response = await fetch("/api/stock", {
                headers: { Authorization: `Bearer ${token}` }
            })
            if (response.ok) {
                const data = await response.json()
                setStockItems(data.filter((item: any) => item.trackQuantity))
            }
        } catch (err) {
            console.error("Failed to fetch stock", err)
        }
    }

    const handleCreateRequest = async () => {
        setSaveLoading(true)
        try {
            const response = await fetch("/api/inventory/transfers", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    stockId: newRequest.stockId,
                    quantity: parseFloat(newRequest.quantity),
                    notes: newRequest.notes
                })
            })

            if (response.ok) {
                setShowForm(false)
                setNewRequest({ stockId: "", quantity: "", notes: "" })
                fetchData()
            } else {
                const error = await response.json()
                alert(error.message || "Failed to create request")
            }
        } catch (err) {
            console.error("Error creating request", err)
        } finally {
            setSaveLoading(false)
        }
    }

    const handleAction = async (id: string, action: 'approved' | 'denied', reason?: string) => {
        try {
            const response = await fetch(`/api/admin/inventory/transfers/${id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ action, denialReason: reason })
            })

            if (response.ok) {
                setDenialModal({ isOpen: false, requestId: "", reason: "" })
                fetchData()
            } else {
                const error = await response.json()
                alert(error.message || `Failed to ${action} request`)
            }
        } catch (err) {
            console.error(`Error during ${action}`, err)
        }
    }

    const isAdmin = user?.role === 'admin'

    const filteredRequests = requests.filter(req =>
        req.stockId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.requestedBy?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <ProtectedRoute requiredRoles={["admin", "store_keeper"]}>
            <div className="min-h-screen bg-gray-50 p-6">
                <div className="max-w-7xl mx-auto space-y-6">
                    <BentoNavbar />

                    {/* Header */}
                    <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                            <div>
                                <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                                    <ArrowRightLeft className="text-[#8B4513] h-8 w-8" />
                                    {t("nav.transfers")}
                                </h1>
                                <p className="text-gray-500 font-bold mt-1 uppercase text-xs tracking-widest opacity-60">
                                    Store-to-Stock Internal Movement
                                </p>
                            </div>

                            {!isAdmin && (
                                <button
                                    onClick={() => setShowForm(true)}
                                    className="bg-[#2d5a41] text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#1a3a2a] transition-all shadow-xl shadow-[#2d5a41]/20 flex items-center gap-2 group"
                                >
                                    <Plus className="h-4 w-4 group-hover:rotate-90 transition-transform" />
                                    New Transfer Request
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Stats/Filters */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="md:col-span-3 flex flex-col md:flex-row gap-4">
                            <div className="relative flex-1 group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4 group-focus-within:text-[#8B4513] transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Search by item or staff..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full bg-white border border-gray-100 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-[#8B4513]/10 transition-all shadow-sm"
                                />
                            </div>
                            <div className="relative group">
                                <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4 group-focus-within:text-[#8B4513] transition-colors" />
                                <select
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value)}
                                    className="bg-white border border-gray-100 rounded-2xl pl-12 pr-10 py-4 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-[#8B4513]/10 transition-all shadow-sm appearance-none cursor-pointer"
                                >
                                    <option value="all">All Status</option>
                                    <option value="pending">Pending</option>
                                    <option value="approved">Approved</option>
                                    <option value="denied">Denied</option>
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4 pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    {/* Requests List */}
                    <div className="bg-white rounded-[2.5rem] border border-gray-100 overflow-hidden shadow-sm min-h-[500px]">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20 animate-pulse">
                                <div className="h-10 w-10 bg-gray-100 rounded-full mb-4"></div>
                                <div className="h-4 w-32 bg-gray-100 rounded-full"></div>
                            </div>
                        ) : filteredRequests.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-32 text-center">
                                <Package className="h-16 w-16 text-gray-100 mb-6" />
                                <h3 className="text-xl font-black text-gray-300">No Transfer Requests</h3>
                                <p className="text-gray-400 text-sm font-bold mt-2 uppercase tracking-widest">
                                    Everything is where it belongs
                                </p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-50">
                                {filteredRequests.map(req => (
                                    <motion.div
                                        key={req._id}
                                        layout
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="p-8 hover:bg-gray-50/50 transition-colors flex flex-col md:flex-row justify-between items-start md:items-center gap-6 group"
                                    >
                                        <div className="flex gap-6 items-center">
                                            <div className={`h-16 w-16 rounded-[1.5rem] flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform ${req.status === 'approved' ? 'bg-emerald-50 text-emerald-600 shadow-emerald-100' :
                                                    req.status === 'denied' ? 'bg-red-50 text-red-600 shadow-red-100' :
                                                        'bg-[#8B4513]/5 text-[#8B4513] shadow-[#8B4513]/10'
                                                }`}>
                                                <ArrowRightLeft className="h-7 w-7" />
                                            </div>

                                            <div className="space-y-1">
                                                <div className="flex items-center gap-3">
                                                    <h3 className="text-xl font-black text-gray-900">{req.stockId?.name}</h3>
                                                    <StatusBadge status={req.status} />
                                                </div>
                                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-bold text-gray-400 uppercase tracking-widest">
                                                    <span className="flex items-center gap-1.5"><Package className="h-3 w-3" /> {req.quantity} {req.stockId?.unit}</span>
                                                    <span className="flex items-center gap-1.5"><Clock className="h-3 w-3" /> {new Date(req.createdAt).toLocaleDateString()}</span>
                                                    <span className="text-gray-300">Requested by <span className="text-gray-500">{req.requestedBy?.name}</span></span>
                                                </div>
                                                {req.notes && (
                                                    <p className="text-sm text-gray-500 italic mt-2 bg-white/50 p-3 rounded-xl border border-gray-100">{req.notes}</p>
                                                )}
                                                {req.status === 'denied' && req.denialReason && (
                                                    <p className="text-sm text-red-500 font-bold mt-2 flex items-center gap-2">
                                                        <AlertCircle className="h-4 w-4" />
                                                        Reason: {req.denialReason}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-end gap-3 min-w-[200px]">
                                            {req.status === 'pending' && isAdmin ? (
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleAction(req._id, 'approved')}
                                                        className="bg-emerald-500 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
                                                    >
                                                        <Check className="h-4 w-4" />
                                                        Approve
                                                    </button>
                                                    <button
                                                        onClick={() => setDenialModal({ isOpen: true, requestId: req._id, reason: "" })}
                                                        className="bg-white border-2 border-red-100 text-red-500 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-50 transition-all flex items-center gap-2"
                                                    >
                                                        <CloseIcon className="h-4 w-4" />
                                                        Deny
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="text-right">
                                                    {req.handledBy && (
                                                        <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">
                                                            Handled by {req.handledBy.name}
                                                        </span>
                                                    )}
                                                    <p className="text-[10px] text-gray-400 font-bold">
                                                        {new Date(req.updatedAt).toLocaleTimeString()}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Create Form Modal */}
                <AnimatePresence>
                    {showForm && (
                        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setShowForm(false)}
                                className="absolute inset-0 bg-black/60 backdrop-blur-md"
                            />
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                                className="relative bg-white w-full max-w-xl rounded-[2.5rem] p-10 shadow-huge"
                            >
                                <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-3 mb-8">
                                    <PlusCircle className="text-[#2d5a41] h-8 w-8" />
                                    New Transfer Request
                                </h2>

                                <div className="space-y-6">
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block">
                                            Select Stock Item
                                        </label>
                                        <div className="relative group">
                                            <select
                                                value={newRequest.stockId}
                                                onChange={(e) => setNewRequest({ ...newRequest, stockId: e.target.value })}
                                                className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-[#2d5a41]/5 focus:border-[#2d5a41] transition-all appearance-none cursor-pointer"
                                            >
                                                <option value="">Choose item...</option>
                                                {stockItems.map(item => (
                                                    <option key={item._id} value={item._id}>
                                                        {item.name} (Store: {item.storeQuantity} {item.unit})
                                                    </option>
                                                ))}
                                            </select>
                                            <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5 pointer-events-none group-focus-within:text-[#2d5a41]" />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block">
                                            Quantity to Transfer
                                        </label>
                                        <input
                                            type="number"
                                            placeholder="0.00"
                                            value={newRequest.quantity}
                                            onChange={(e) => setNewRequest({ ...newRequest, quantity: e.target.value })}
                                            className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-[#2d5a41]/5 focus:border-[#2d5a41] transition-all"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block">
                                            Purpose / Notes
                                        </label>
                                        <textarea
                                            placeholder="Why is this transfer needed?"
                                            value={newRequest.notes}
                                            onChange={(e) => setNewRequest({ ...newRequest, notes: e.target.value })}
                                            className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-[#2d5a41]/5 focus:border-[#2d5a41] transition-all h-32 resize-none"
                                        />
                                    </div>

                                    <div className="flex gap-4 pt-4">
                                        <button
                                            onClick={handleCreateRequest}
                                            disabled={saveLoading || !newRequest.stockId || !newRequest.quantity}
                                            className="flex-1 bg-[#2d5a41] text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#1a3a2a] transition-all disabled:opacity-50 shadow-xl shadow-[#2d5a41]/20"
                                        >
                                            {saveLoading ? "Submitting..." : "Submit Request"}
                                        </button>
                                        <button
                                            onClick={() => setShowForm(false)}
                                            className="px-8 border-2 border-gray-100 text-gray-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-50 hover:text-gray-600 transition-all"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* Denial Modal */}
                <AnimatePresence>
                    {denialModal.isOpen && (
                        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setDenialModal({ ...denialModal, isOpen: false })}
                                className="absolute inset-0 bg-black/60 backdrop-blur-md"
                            />
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                className="relative bg-white w-full max-w-md rounded-[2rem] p-10 shadow-huge"
                            >
                                <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-3">
                                    <XCircle className="text-red-500 h-6 w-6" />
                                    Deny Transfer Request
                                </h3>
                                <div className="space-y-4">
                                    <textarea
                                        placeholder="Reason for denial..."
                                        value={denialModal.reason}
                                        onChange={(e) => setDenialModal({ ...denialModal, reason: e.target.value })}
                                        className="w-full bg-gray-50 border-2 border-red-50 rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-red-500/5 focus:border-red-500 transition-all h-32 resize-none"
                                    />
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => handleAction(denialModal.requestId, 'denied', denialModal.reason)}
                                            disabled={!denialModal.reason}
                                            className="flex-1 bg-red-500 text-white py-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-600 disabled:opacity-50 transition-all"
                                        >
                                            Confirm Denial
                                        </button>
                                        <button
                                            onClick={() => setDenialModal({ ...denialModal, isOpen: false })}
                                            className="px-6 border-2 border-gray-50 text-gray-400 rounded-xl font-bold text-xs"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {confirmation && (
                    <ConfirmationCard
                        {...confirmation}
                        onConfirm={() => {
                            confirmation.onConfirm()
                            hideConfirmation()
                        }}
                        onCancel={hideConfirmation}
                    />
                )}
            </div>
        </ProtectedRoute>
    )
}

function StatusBadge({ status }: { status: string }) {
    const configs: any = {
        pending: { bg: 'bg-amber-50', text: 'text-amber-600', icon: <Clock className="h-3 w-3" />, label: 'Pending Approval' },
        approved: { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: <CheckCircle2 className="h-3 w-3" />, label: 'Transfer Approved' },
        denied: { bg: 'bg-red-50', text: 'text-red-700', icon: <XCircle className="h-3 w-3" />, label: 'Request Denied' }
    }
    const config = configs[status]
    return (
        <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tight ${config.bg} ${config.text}`}>
            {config.icon}
            {config.label}
        </span>
    )
}

function PlusCircle({ ...props }) {
    return (
        <svg fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" {...props}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    )
}
