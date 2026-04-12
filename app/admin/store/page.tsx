"use client"

import { useEffect, useState } from "react"
import { ProtectedRoute } from "@/components/protected-route"
import { BentoNavbar } from "@/components/bento-navbar"
import { useAuth } from "@/context/auth-context"
import { useLanguage } from "@/context/language-context"
import { ConfirmationCard, NotificationCard } from "@/components/confirmation-card"
import { useConfirmation } from "@/hooks/use-confirmation"
import {
    Plus, Search, Trash2, Edit2, Calendar,
    DollarSign, TrendingUp, History,
    ChevronRight, Package, PlusCircle,
    Wrench, AlertTriangle, ChevronDown, ChevronUp,
    ArrowRightLeft, Check, X as CloseIcon, Clock,
    CheckCircle2, XCircle, Filter, Download
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { ReportExporter } from "@/lib/export-utils"

interface TransferRequest {
    _id: string
    stockId: { _id: string; name: string; unit: string; storeQuantity: number; quantity: number }
    quantity: number
    status: 'pending' | 'approved' | 'denied'
    requestedBy: { name: string }
    handledBy?: { name: string }
    denialReason?: string
    notes?: string
    createdAt: string
    updatedAt: string
}

interface DailyExpense {
    _id: string
    date: string
    otherExpenses: number
    items: Array<{ name: string; amount: number; quantity: number; unit: string }>
    description?: string
    createdAt: string
    updatedAt: string
}

interface OperationalExpense {
    _id: string
    name?: string
    date: string
    category: string
    amount: number
    description: string
    createdAt: string
    updatedAt: string
}

interface StockItem {
    _id: string
    name: string
    category: string
    quantity?: number // Active Stock
    storeQuantity?: number // Store Bulk
    unit: string
    minLimit?: number
    storeMinLimit?: number
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
    storeValue?: number // Pre-calculated store value

}

interface FixedAsset {
    _id: string
    name: string
    category: string
    quantity: number
    unitPrice: number
    totalValue: number
    totalInvested: number
    purchaseDate: string
    status: 'active' | 'partially_dismissed' | 'fully_dismissed'
    notes?: string
    dismissals: Array<{
        _id?: string
        date: string
        quantity: number
        reason: string
        valueLost: number
    }>
}

export default function StorePage() {
    const { token, user } = useAuth()
    const [activeTab, setActiveTab] = useState<"inventory" | "categories" | "fixed-assets" | "expenses" | "transfers">("inventory")

    useEffect(() => {
        if (user?.role === "store_keeper") {
            setActiveTab("transfers")
        }
    }, [user])
    const [operationalExpenses, setOperationalExpenses] = useState<OperationalExpense[]>([])
    const [stockItems, setStockItems] = useState<StockItem[]>([])
    const [loading, setLoading] = useState(true)
    const [showStockForm, setShowStockForm] = useState(false)
    const [editingOperationalExpense, setEditingOperationalExpense] = useState<OperationalExpense | null>(null)
    const [editingStock, setEditingStock] = useState<StockItem | null>(null)
    const [editingCategory, setEditingCategory] = useState<any | null>(null)
    const [newCategory, setNewCategory] = useState({ name: "" })
    const [saveLoading, setSaveLoading] = useState(false)
    const [searchTerm, setSearchTerm] = useState("")
    const [showOperationalExpenseForm, setShowOperationalExpenseForm] = useState(false)
    const [expenseDateFilter, setExpenseDateFilter] = useState<'today' | 'week' | 'month' | 'all'>('today')

    const [showRestockModal, setShowRestockModal] = useState(false)
    const [restockingItem, setRestockingItem] = useState<StockItem | null>(null)
    const [restockAmount, setRestockAmount] = useState("")
    const [newTotalCost, setNewTotalCost] = useState("")
    const [newUnitCost, setNewUnitCost] = useState("")

    // Dynamic Categories
    const [categories, setCategories] = useState<any[]>([])

    // Transfer from Store to Stock
    const [showTransferModal, setShowTransferModal] = useState(false)
    const [transferringItem, setTransferringItem] = useState<StockItem | null>(null)
    const [transferAmount, setTransferAmount] = useState("")

    // Fixed Assets State
    const [fixedAssets, setFixedAssets] = useState<FixedAsset[]>([])
    const [assetCategories, setAssetCategories] = useState<any[]>([])
    const [expenseCategories, setExpenseCategories] = useState<any[]>([])
    const [showAssetForm, setShowAssetForm] = useState(false)
    const [editingAsset, setEditingAsset] = useState<FixedAsset | null>(null)
    const [categoryType, setCategoryType] = useState<'stock' | 'fixed-asset' | 'expense'>('stock')
    const [showDismissModal, setShowDismissModal] = useState(false)
    const [dismissingAsset, setDismissingAsset] = useState<FixedAsset | null>(null)
    const [dismissReason, setDismissReason] = useState("")
    const [dismissQuantity, setDismissQuantity] = useState("")
    const [dismissValue, setDismissValue] = useState("")
    const [expandedAsset, setExpandedAsset] = useState<string | null>(null)

    // Transfer requests state
    const [transferRequests, setTransferRequests] = useState<TransferRequest[]>([])
    const [transfersLoading, setTransfersLoading] = useState(false)
    const [transferFilterStatus, setTransferFilterStatus] = useState("all")
    const [transferSearch, setTransferSearch] = useState("")
    const [showTransferRequestForm, setShowTransferRequestForm] = useState(false)
    const [transferRequestSaving, setTransferRequestSaving] = useState(false)
    const [newTransferRequest, setNewTransferRequest] = useState({ stockId: "", quantity: "", notes: "" })
    const [denialModal, setDenialModal] = useState<{ isOpen: boolean; requestId: string; reason: string }>({ isOpen: false, requestId: "", reason: "" })
    const [assetFormData, setAssetFormData] = useState({
        name: "",
        category: "Kitchen Equipment",
        quantity: "",
        unitPrice: "",
        purchaseDate: new Date().toISOString().split('T')[0],
        notes: ""
    })


    const [operationalExpenseFormData, setOperationalExpenseFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        name: "",
        category: "",
        amount: "",
        description: ""
    })

    const [stockFormData, setStockFormData] = useState({
        name: "",
        category: "",
        quantity: "",
        unit: "kg",
        minLimit: "",
        storeMinLimit: "",
        totalPurchaseCost: "",
        unitCost: "",
        trackQuantity: true,
        showStatus: true,

    })

    const { t } = useLanguage()
    const { confirmationState, confirm, closeConfirmation, notificationState, notify, closeNotification } = useConfirmation()

    useEffect(() => {
        if (token) {
            fetchStockItems()
            fetchOperationalExpenses()
            fetchCategories()
            fetchAssetCategories()
            fetchExpenseCategories()
            fetchFixedAssets()
            fetchTransferRequests()
        }

        const timeout = setTimeout(() => {
            if (loading) {
                setLoading(false)
            }
        }, 10000)

        return () => clearTimeout(timeout)
    }, [token])

    const fetchStockItems = async () => {
        try {
            setLoading(true)
            const response = await fetch("/api/stock", {
                headers: { Authorization: `Bearer ${token}` },
            })
            if (response.ok) {
                const data = await response.json()
                setStockItems(data)
            }
        } catch (error) {
            console.error("Error fetching stock:", String(error))
        } finally {
            setLoading(false)
        }
    }


    const fetchOperationalExpenses = async () => {
        try {
            const response = await fetch("/api/operational-expenses", {
                headers: { Authorization: `Bearer ${token}` },
            })
            if (response.ok) {
                const data = await response.json()
                setOperationalExpenses(data)
            }
        } catch (error) {
            console.error("Error fetching operational expenses:", String(error))
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
            console.error("Error fetching categories:", String(error))
        }
    }

    const fetchAssetCategories = async () => {
        try {
            const response = await fetch("/api/categories?type=fixed-asset", {
                headers: { Authorization: `Bearer ${token}` },
            })
            if (response.ok) {
                const data = await response.json()
                setAssetCategories(data)
                if (data.length > 0 && !assetFormData.category) {
                    setAssetFormData(prev => ({ ...prev, category: data[0].name }))
                }
            }
        } catch (error) {
            console.error("Error fetching asset categories:", String(error))
        }
    }

    const fetchExpenseCategories = async () => {
        try {
            const response = await fetch("/api/categories?type=expense", {
                headers: { Authorization: `Bearer ${token}` },
            })
            if (response.ok) {
                const data = await response.json()
                setExpenseCategories(data)
                if (data.length > 0 && !operationalExpenseFormData.category) {
                    setOperationalExpenseFormData(prev => ({ ...prev, category: data[0].name }))
                }
            }
        } catch (error) {
            console.error("Error fetching expense categories:", String(error))
        }
    }

    const fetchFixedAssets = async () => {
        try {
            const response = await fetch("/api/fixed-assets", {
                headers: { Authorization: `Bearer ${token}` },
            })
            if (response.ok) {
                const data = await response.json()
                setFixedAssets(data)
            }
        } catch (error) {
            console.error("Error fetching fixed assets:", String(error))
        }
    }

    const handleSaveAsset = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaveLoading(true)
        try {
            const url = editingAsset ? `/api/fixed-assets/${editingAsset._id}` : "/api/fixed-assets"
            const method = editingAsset ? "PUT" : "POST"

            const response = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    name: assetFormData.name,
                    category: assetFormData.category,
                    quantity: Number(assetFormData.quantity),
                    unitPrice: Number(assetFormData.unitPrice),
                    purchaseDate: assetFormData.purchaseDate,
                    notes: assetFormData.notes
                }),
            })

            if (response.ok) {
                fetchFixedAssets()
                fetchAssetCategories()
                resetAssetForm()
                notify({
                    title: editingAsset ? "Asset Updated" : "Asset Added",
                    message: editingAsset ? "Fixed asset has been updated." : "New fixed asset has been added.",
                    type: "success"
                })
            } else {
                const data = await response.json()
                notify({ title: "Save Failed", message: data.message || "Failed to save asset", type: "error" })
            }
        } catch (error) {
            console.error("Error saving asset:", String(error))
        } finally {
            setSaveLoading(false)
        }
    }

    const handleDismissSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!dismissingAsset) return
        setSaveLoading(true)
        try {
            const qty = Number(dismissQuantity)
            const val = dismissValue ? Number(dismissValue) : qty * dismissingAsset.unitPrice

            const response = await fetch(`/api/fixed-assets/${dismissingAsset._id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    action: 'dismiss',
                    quantity: qty,
                    reason: dismissReason,
                    valueLost: val
                }),
            })

            if (response.ok) {
                const data = await response.json()
                fetchFixedAssets()
                setShowDismissModal(false)
                setDismissingAsset(null)
                setDismissReason("")
                setDismissQuantity("")
                setDismissValue("")
                notify({
                    title: "Asset Dismissed",
                    message: data.message || "Asset has been dismissed.",
                    type: "success"
                })
            } else {
                const data = await response.json()
                notify({ title: "Dismiss Failed", message: data.message || "Failed to dismiss asset.", type: "error" })
            }
        } catch (error) {
            console.error("Error dismissing asset:", String(error))
        } finally {
            setSaveLoading(false)
        }
    }

    const deleteFixedAsset = async (id: string) => {
        const confirmed = await confirm({
            title: "Delete Fixed Asset",
            message: "Are you sure you want to permanently delete this asset?\n\nThis action cannot be undone.",
            type: "danger",
            confirmText: "Delete Asset",
            cancelText: "Cancel"
        })
        if (!confirmed) return
        try {
            const response = await fetch(`/api/fixed-assets/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            })
            if (response.ok) {
                fetchFixedAssets()
                notify({ title: "Asset Deleted", message: "Fixed asset has been removed.", type: "success" })
            }
        } catch (error) {
            console.error("Error deleting asset:", String(error))
        }
    }

    const openDismissModal = (asset: FixedAsset) => {
        setDismissingAsset(asset)
        setDismissQuantity("1")
        setDismissValue((asset.unitPrice).toString())
        setDismissReason("")
        setShowDismissModal(true)
    }

    const handleEditAsset = (asset: FixedAsset) => {
        setEditingAsset(asset)
        setAssetFormData({
            name: asset.name,
            category: asset.category,
            quantity: asset.quantity.toString(),
            unitPrice: asset.unitPrice.toString(),
            purchaseDate: new Date(asset.purchaseDate).toISOString().split('T')[0],
            notes: asset.notes || ""
        })
        setShowAssetForm(true)
    }

    const resetAssetForm = () => {
        setAssetFormData({
            name: "",
            category: "Kitchen Equipment",
            quantity: "",
            unitPrice: "",
            purchaseDate: new Date().toISOString().split('T')[0],
            notes: ""
        })
        setEditingAsset(null)
        setShowAssetForm(false)
    }

    const handleSaveCategory = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaveLoading(true)
        try {
            const url = editingCategory ? `/api/categories/${editingCategory._id}` : "/api/categories"
            const method = editingCategory ? "PUT" : "POST"

            const response = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    name: newCategory.name,
                    type: categoryType
                }),
            })

            if (response.ok) {
                if (categoryType === 'stock') {
                    fetchCategories()
                } else {
                    fetchAssetCategories()
                }
                setNewCategory({ name: "" })
                setEditingCategory(null)
                notify({
                    title: editingCategory ? "Category Updated" : "Category Added",
                    message: `${categoryType === 'stock' ? 'Stock' : 'Fixed Asset'} category has been saved successfully.`,
                    type: "success"
                })
            }
        } catch (error) {
            console.error("Error saving category:", String(error))
        } finally {
            setSaveLoading(false)
        }
    }

    const handleDeleteCategory = async (id: string) => {
        const confirmed = await confirm({
            title: "Delete Category",
            message: "Are you sure you want to delete this category?\n\nThis might affect items using this category.",
            type: "danger"
        })

        if (!confirmed) return
        try {
            const response = await fetch(`/api/categories/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            })
            if (response.ok) {
                fetchCategories()
                fetchAssetCategories()
                fetchExpenseCategories()
                notify({
                    title: "Category Deleted",
                    message: "Category has been removed successfully.",
                    type: "success"
                })
            }
        } catch (error) {
            console.error("Error deleting category:", String(error))
        }
    }

    const handleSaveOperationalExpense = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaveLoading(true)
        try {
            const response = await fetch("/api/operational-expenses", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    _id: editingOperationalExpense?._id,
                    ...operationalExpenseFormData,
                    amount: Number(operationalExpenseFormData.amount)
                }),
            })

            if (response.ok) {
                fetchOperationalExpenses()
                resetOperationalExpenseForm()
                notify({
                    title: editingOperationalExpense ? "Expense Updated" : "Expense Saved",
                    message: "Operational expense has been saved successfully.",
                    type: "success"
                })
            } else {
                const data = await response.json()
                notify({ title: "Save Failed", message: data.message || "Failed to save expense", type: "error" })
            }
        } catch (error) {
            console.error("Error saving operational expense:", String(error))
        } finally {
            setSaveLoading(false)
        }
    }

    const deleteOperationalExpense = async (id: string) => {
        const confirmed = await confirm({
            title: "Delete Expense",
            message: "Are you sure you want to delete this expense record?",
            type: "danger"
        })
        if (!confirmed) return
        try {
            const response = await fetch(`/api/operational-expenses?id=${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            })
            if (response.ok) {
                fetchOperationalExpenses()
                notify({ title: "Expense Deleted", message: "Expense record has been removed.", type: "success" })
            }
        } catch (error) {
            console.error("Error deleting operational expense:", String(error))
        }
    }


    const handleSaveStock = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaveLoading(true)
        try {
            const url = editingStock ? `/api/stock/${editingStock._id}` : "/api/stock"
            const method = editingStock ? "PUT" : "POST"

            const { quantity, minLimit, storeMinLimit, unitCost, totalPurchaseCost, ...rest } = stockFormData
            
            const payload = {
                ...rest,
                storeQuantity: quantity === "" ? undefined : Number(quantity),
                minLimit: minLimit === "" ? undefined : Number(minLimit),
                storeMinLimit: storeMinLimit === "" ? undefined : Number(storeMinLimit),
                unitCost: unitCost === "" ? undefined : Number(unitCost),
                totalPurchaseCost: totalPurchaseCost === "" ? undefined : Number(totalPurchaseCost),
            }
            

            
            const response = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            })

            if (response.ok) {
                fetchStockItems()
                resetStockForm()
                notify({
                    title: editingStock ? "Store Item Updated" : "Store Item Added",
                    message: editingStock ? "Item has been updated successfully." : "New item has been added to store.",
                    type: "success"
                })
            } else {
                const data = await response.json()
                notify({
                    title: "Save Failed",
                    message: data.message || "Failed to save item",
                    type: "error"
                })
            }
        } catch (error) {
            console.error("Error saving stock:", String(error))
        } finally {
            setSaveLoading(false)
        }
    }

    const deleteStockItem = async (id: string) => {
        const confirmed = await confirm({
            title: "Delete Store Item",
            message: "Are you sure you want to delete this item from store?\n\nThis will only remove it from Store inventory. Active stock in POS will remain.",
            type: "danger",
            confirmText: "Delete Item",
            cancelText: "Cancel"
        })

        if (!confirmed) return
        try {
            const response = await fetch(`/api/stock/${id}?source=store`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            })
            if (response.ok) {
                const data = await response.json()
                fetchStockItems()
                notify({
                    title: "Store Item Deleted",
                    message: data.message || "Item removed from store successfully.",
                    type: "success"
                })
            }
        } catch (error) {
            console.error("Error deleting stock:", String(error))
        }
    }

    const handleRestockSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!restockingItem) return

        setSaveLoading(true)
        try {
            const addedAmount = Number(restockAmount)
            const unitCost = Number(newUnitCost) || restockingItem.unitCost
            const totalCost = addedAmount * unitCost // Calculate total cost from unit cost and quantity

            const response = await fetch(`/api/stock/${restockingItem._id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    action: 'restock',
                    quantityAdded: addedAmount,
                    totalPurchaseCost: totalCost,
                    newUnitCost: unitCost,
                    notes: `Restocked ${addedAmount} ${restockingItem.unit} at ${unitCost} per unit (total: ${totalCost} Br)`
                }),
            })

            if (response.ok) {
                const data = await response.json()
                fetchStockItems()
                setShowRestockModal(false)
                setRestockingItem(null)
                setRestockAmount("")
                setNewTotalCost("")
                setNewUnitCost("")
                notify({
                    title: "Store Restocked",
                    message: data.message || `Successfully restocked ${addedAmount} ${restockingItem.unit}`,
                    type: "success"
                })
            } else {
                const errorData = await response.json()
                notify({
                    title: "Restock Failed",
                    message: errorData.message || "Failed to restock item.",
                    type: "error"
                })
            }
        } catch (error) {
            console.error(String(error))
            notify({
                title: "Error",
                message: "An error occurred while restocking.",
                type: "error"
            })
        } finally {
            setSaveLoading(false)
        }
    }

    const handleTransferSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!transferringItem) return

        setSaveLoading(true)
        try {
            const amount = Number(transferAmount)
            const isStoreKeeper = user?.role === 'store_keeper'
            const endpoint = isStoreKeeper ? '/api/inventory/transfers' : '/api/store/transfer'

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    stockId: transferringItem._id,
                    quantity: amount,
                    notes: `Transfer of ${amount} ${transferringItem.unit} to stock`
                }),
            })

            if (response.ok) {
                fetchStockItems()
                setShowTransferModal(false)
                setTransferringItem(null)
                setTransferAmount("")
                notify({
                    title: isStoreKeeper ? "Transfer Requested" : "Transfer Successful",
                    message: isStoreKeeper
                        ? `Request for ${amount} ${transferringItem.unit} sent to admin.`
                        : `Moved ${amount} ${transferringItem.unit} to active (POS) stock.`,
                    type: "success"
                })
            } else {
                const errorData = await response.json()
                notify({
                    title: "Transfer Failed",
                    message: errorData.message || "Failed to transfer items.",
                    type: "error"
                })
            }
        } catch (error) {
            console.error(String(error))
            notify({
                title: "Error",
                message: "An error occurred during transfer.",
                type: "error"
            })
        } finally {
            setSaveLoading(false)
        }
    }

    const fetchTransferRequests = async (status?: string) => {
        setTransfersLoading(true)
        try {
            const q = (status || transferFilterStatus) !== "all" ? `?status=${status || transferFilterStatus}` : ""
            const res = await fetch(`/api/inventory/transfers${q}`, { headers: { Authorization: `Bearer ${token}` } })
            if (res.ok) setTransferRequests(await res.json())
        } catch (e) { console.error("Failed to fetch transfers", e) }
        finally { setTransfersLoading(false) }
    }

    const handleCreateTransferRequest = async () => {
        setTransferRequestSaving(true)
        try {
            const res = await fetch("/api/inventory/transfers", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ stockId: newTransferRequest.stockId, quantity: parseFloat(newTransferRequest.quantity), notes: newTransferRequest.notes })
            })
            if (res.ok) {
                setShowTransferRequestForm(false)
                setNewTransferRequest({ stockId: "", quantity: "", notes: "" })
                fetchTransferRequests()
            } else {
                const err = await res.json()
                notify({ title: "Request Failed", message: err.message || "Failed to create request", type: "error" })
            }
        } catch (e) { console.error("Error creating transfer", e) }
        finally { setTransferRequestSaving(false) }
    }

    const handleTransferAction = async (id: string, action: 'approved' | 'denied', reason?: string) => {
        try {
            const res = await fetch(`/api/admin/inventory/transfers/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ action, denialReason: reason })
            })
            if (res.ok) {
                setDenialModal({ isOpen: false, requestId: "", reason: "" })
                fetchTransferRequests()
                notify({ title: action === 'approved' ? "Transfer Approved" : "Request Denied", message: `Transfer request has been ${action}.`, type: action === 'approved' ? "success" : "error" })
            } else {
                const err = await res.json()
                notify({ title: "Action Failed", message: err.message, type: "error" })
            }
        } catch (e) { console.error(`Error during ${action}`, e) }
    }

    const openTransferModal = (item: StockItem) => {
        setTransferringItem(item)
        setTransferAmount("")
        setShowTransferModal(true)
    }

    const openRestockModal = (item: StockItem) => {
        setRestockingItem(item)
        setRestockAmount("")
        setNewTotalCost("")
        setNewUnitCost(item.unitCost?.toString() || "")
        setShowRestockModal(true)
    }


    const handleEditExpense = (expense: DailyExpense) => {
        setEditingExpense(expense)
        setExpenseFormData({
            date: new Date(expense.date).toISOString().split('T')[0],
            items: expense.items || [],
            otherExpenses: expense.otherExpenses.toString(),
            description: expense.description || ""
        })
        setShowForm(true)
    }

    const handleEditStock = (item: StockItem) => {
        setEditingStock(item)
        setStockFormData({
            name: item.name,
            category: item.category,
            quantity: item.storeQuantity?.toString() || "", // Editing store quantity here in store page
            unit: item.unit,
            minLimit: item.minLimit?.toString() || "",
            storeMinLimit: item.storeMinLimit?.toString() || "",
            totalPurchaseCost: item.totalInvestment?.toString() || "",
            unitCost: item.unitCost?.toString() || "",
            trackQuantity: item.trackQuantity,
            showStatus: item.showStatus,
        })
        setShowStockForm(true)
    }


    const resetStockForm = () => {
        setStockFormData({
            name: "",
            category: categories.length > 0 ? categories[0].name : "meat",
            quantity: "",
            unit: "kg",
            minLimit: "",
            storeMinLimit: "",
            totalPurchaseCost: "",
            unitCost: "",
            trackQuantity: true,
            showStatus: true,
            showStatus: true,
        })
        setEditingStock(null)
        setShowStockForm(false)
    }

    const resetOperationalExpenseForm = () => {
        setOperationalExpenseFormData({
            date: new Date().toISOString().split('T')[0],
            name: "",
            category: expenseCategories.length > 0 ? expenseCategories[0].name : "",
            amount: "",
            description: ""
        })
        setEditingOperationalExpense(null)
        setShowOperationalExpenseForm(false)
    }

    const filteredStock = stockItems.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase())
    )


    const filteredOperationalExpenses = operationalExpenses.filter(e =>
        e.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (e.description || "").toLowerCase().includes(searchTerm.toLowerCase())
    )

    const filteredOperationalExpensesByDate = operationalExpenses.filter(e => {
        const expDate = new Date(e.date)
        const now = new Date()
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const weekStart = new Date(now); weekStart.setDate(now.getDate() - 7)
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

        const inSearch = e.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (e.description || "").toLowerCase().includes(searchTerm.toLowerCase())

        if (!inSearch) return false

        if (expenseDateFilter === 'today') return expDate >= todayStart
        if (expenseDateFilter === 'week') return expDate >= weekStart
        if (expenseDateFilter === 'month') return expDate >= monthStart
        return true
    })

    const filteredFixedAssets = fixedAssets.filter(asset =>
        asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.category.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const exportStoreCSV = () => {
        // Export ALL items (no quantity filter) to give complete picture
        const data = filteredStock.map((item: any) => {
            // Use averagePurchasePrice as it stores the true Store Unit Cost in the database.
            // (item.unitCost actually stores the 'Selling Price')
            const costPrice = item.averagePurchasePrice || 0
            const storeQty = item.storeQuantity ?? 0
            const activeQty = item.quantity ?? 0
            const totalStoreValue = storeQty * costPrice
            const isLow = item.isLowStoreStock || ((storeQty <= (item.storeMinLimit || 0)) && storeQty > 0)
            return {
                "Item Name": item.name,
                "Category": item.category,
                "Unit": item.unit,
                "Purchased Unit Price (Br)": costPrice > 0 ? costPrice.toFixed(2) : "—",
                "In Store": storeQty,
                "Active (POS)": activeQty,
                "Store Value (Br)": totalStoreValue > 0 ? Math.round(totalStoreValue) : 0,
                "Min Store Limit": item.storeMinLimit ?? 0,
                "Status": storeQty <= 0 ? "Out of Stock" : isLow ? "Low Stock" : "OK"
            }
        })

        if (data.length === 0) {
            alert("No store inventory data found to export.")
            return
        }

        ReportExporter.exportToCSV({
            title: "Bulk Inventory Report",
            period: searchTerm ? `Search: "${searchTerm}"` : "All Items",
            headers: ["Item Name", "Category", "Unit", "Purchased Unit Price (Br)", "In Store", "Active (POS)", "Store Value (Br)", "Min Store Limit", "Status"],
            data
        })
    }

    const exportOperationalExpensesCSV = () => {
        if (!filteredOperationalExpensesByDate || filteredOperationalExpensesByDate.length === 0) {
            alert("No operational expenses found for this period/filter.")
            return
        }

        const data = filteredOperationalExpensesByDate.map((exp: any) => ({
            "Date": new Date(exp.date).toLocaleDateString(),
            "Category": exp.category || "-",
            "Amount": exp.amount ? `${exp.amount.toLocaleString()} Br` : "0 Br",
            "Description": exp.description || "-",
            "Recorded At": new Date(exp.createdAt).toLocaleString()
        }))

        ReportExporter.exportToCSV({
            title: "Operational Expenses Report",
            period: expenseDateFilter === 'all' ? "All Time" : `Current Filter (${expenseDateFilter})`,
            headers: ["Date", "Category", "Amount", "Description", "Recorded At"],
            data
        })
    }

    const exportFixedAssetsCSV = () => {
        if (!filteredFixedAssets || filteredFixedAssets.length === 0) {
            alert("No fixed assets found to export.")
            return
        }

        const data = filteredFixedAssets.map((asset) => {
            const totalDismissed = asset.dismissals?.reduce((sum, d) => sum + d.valueLost, 0) || 0
            return {
                "Asset Name": asset.name,
                "Category": asset.category,
                "Quantity": asset.quantity,
                "Unit Price": `${asset.unitPrice.toLocaleString()} Br`,
                "Total Value": `${asset.totalValue.toLocaleString()} Br`,
                "Value Lost": totalDismissed > 0 ? `-${totalDismissed.toLocaleString()} Br` : "0 Br",
                "Status": asset.status === 'fully_dismissed' ? 'Dismissed' : asset.status === 'partially_dismissed' ? 'Partial' : 'Active',
                "Purchase Date": new Date(asset.purchaseDate).toLocaleDateString(),
                "Notes": asset.notes || "-"
            }
        })

        ReportExporter.exportToCSV({
            title: "Fixed Assets Report",
            period: "Current Filter",
            headers: ["Asset Name", "Category", "Quantity", "Unit Price", "Total Value", "Value Lost", "Status", "Purchase Date", "Notes"],
            data
        })
    }

    const totalStats = {
        storeValue: stockItems.reduce((sum, item) => sum + (item.storeValue || 0), 0),
        totalItems: stockItems.length,
        fixedAssetValue: fixedAssets.reduce((sum, a) => sum + (a.totalValue || 0), 0),
        fixedAssetCount: fixedAssets.length
    }

    return (
        <ProtectedRoute requiredRoles={["admin", "store_keeper"]}>
            <div className="min-h-screen bg-gray-50 p-6">
                <div className="max-w-7xl mx-auto space-y-6">
                    <BentoNavbar />

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* Sidebar Stats */}
                        <div className="lg:col-span-4 space-y-4">
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="bg-[#5D4037] rounded-xl p-6 text-white shadow-sm overflow-hidden relative"
                            >
                                <div className="absolute -right-10 -bottom-10 opacity-10">
                                    <Package className="w-48 h-48" />
                                </div>
                                <h2 className="text-sm font-black uppercase tracking-widest mb-6 opacity-60">
                                    Store Valuation
                                </h2>
                                <div className="space-y-6 relative z-10">
                                    <div>
                                        <p className="text-4xl font-black">{totalStats.storeValue.toLocaleString()} <span className="text-xs">ETB</span></p>
                                        <p className="text-xs font-bold uppercase tracking-widest opacity-60 mt-1">Value of Bulk Storage</p>
                                    </div>
                                    <div className="pt-6 border-t border-white/10">
                                        <p className="text-xl font-bold">{totalStats.totalItems}</p>
                                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Total SKU Templates</p>
                                    </div>
                                    <div className="pt-4 border-t border-white/10">
                                        <p className="text-xl font-bold">{totalStats.fixedAssetValue.toLocaleString()} <span className="text-xs">ETB</span></p>
                                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Fixed Assets ({totalStats.fixedAssetCount})</p>
                                    </div>
                                    <div className="pt-4 border-t border-white/10">
                                        <p className="text-xl font-bold">{operationalExpenses.reduce((sum, e) => sum + e.amount, 0).toLocaleString()} <span className="text-xs">ETB</span></p>
                                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Operational Expenses (This Month)</p>
                                    </div>
                                </div>
                            </motion.div>

                            {user?.role === "admin" && (
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.1 }}
                                    className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
                                >
                                    <h2 className="text-lg font-bold text-gray-900 mb-2">Bulk Actions</h2>
                                    <p className="text-gray-500 text-sm mb-4">Add new items to the store or manage categories.</p>
                                    <div className="space-y-3">
                                        <button
                                            onClick={() => { resetStockForm(); setShowStockForm(true); }}
                                            className="w-full bg-[#8B4513] text-white py-3 rounded-lg font-medium hover:bg-[#5D4037] transition-all flex items-center justify-center gap-2"
                                        >
                                            <Plus className="w-4 h-4" /> Add New Item
                                        </button>
                                        <button
                                            onClick={() => setActiveTab('categories')}
                                            className="w-full bg-slate-50 text-slate-600 border border-slate-200 py-3 rounded-lg font-medium hover:bg-slate-100 transition-all flex items-center justify-center gap-2"
                                        >
                                            <PlusCircle className="w-4 h-4" /> Manage Categories
                                        </button>
                                        <button
                                            onClick={() => { resetOperationalExpenseForm(); setShowOperationalExpenseForm(true); }}
                                            className="w-full bg-red-50 text-red-600 border border-red-200 py-3 rounded-lg font-medium hover:bg-red-100 transition-all flex items-center justify-center gap-2"
                                        >
                                            <DollarSign className="w-4 h-4" /> Add Op. Expense
                                        </button>
                                        <button
                                            onClick={() => { resetAssetForm(); setShowAssetForm(true); }}
                                            className="w-full bg-amber-600 text-white py-3 rounded-lg font-medium hover:bg-amber-700 transition-all flex items-center justify-center gap-2"
                                        >
                                            <Wrench className="w-4 h-4" /> Add Fixed Asset
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </div>

                        {/* Main Content */}
                        <div className="lg:col-span-8 space-y-4">
                            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900">🏪 Store Management</h2>
                                    <p className="text-gray-600 text-sm">Bulk inventory and expense management.</p>
                                </div>
                                <div className="flex p-1 bg-gray-200/50 rounded-xl">
                                    <button
                                        onClick={() => setActiveTab('inventory')}
                                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'inventory' ? 'bg-white text-[#8B4513] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        Bulk Inventory
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('fixed-assets')}
                                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'fixed-assets' ? 'bg-white text-[#8B4513] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        Fixed Assets
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('categories')}
                                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'categories' ? 'bg-white text-[#8B4513] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        Categories
                                    </button>
                                    <button
                                        onClick={() => { setActiveTab('expenses'); fetchOperationalExpenses(); }}
                                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'expenses' ? 'bg-white text-[#8B4513] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        Operational Expenses
                                    </button>
                                    <button
                                        onClick={() => { setActiveTab('transfers'); fetchTransferRequests(); }}
                                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'transfers' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        <ArrowRightLeft className="h-3.5 w-3.5" />
                                        Transfers
                                    </button>
                                </div>
                            </div>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white rounded-xl shadow-sm border border-gray-200 min-h-[600px] p-6"
                            >
                                <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                                    <div className="relative group w-full md:w-64">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Search store..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-2xl outline-none font-bold text-sm"
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        {activeTab === 'inventory' && (
                                            <button onClick={exportStoreCSV} className="flex items-center gap-2 px-4 py-3 bg-white border border-gray-200 text-gray-700 rounded-2xl hover:bg-gray-50 transition-colors font-bold text-sm shadow-sm transition-all focus:outline-none focus:ring-4 focus:ring-emerald-500/10 active:scale-[0.98]">
                                                <Download size={16} className="text-emerald-600" /> Export CSV
                                            </button>
                                        )}
                                        {activeTab === 'expenses' && (
                                            <button onClick={exportOperationalExpensesCSV} className="flex items-center gap-2 px-4 py-3 bg-white border border-gray-200 text-gray-700 rounded-2xl hover:bg-gray-50 transition-colors font-bold text-sm shadow-sm transition-all focus:outline-none focus:ring-4 focus:ring-emerald-500/10 active:scale-[0.98]">
                                                <Download size={16} className="text-emerald-600" /> Export CSV
                                            </button>
                                        )}
                                        {activeTab === 'fixed-assets' && (
                                            <button onClick={exportFixedAssetsCSV} className="flex items-center gap-2 px-4 py-3 bg-white border border-gray-200 text-gray-700 rounded-2xl hover:bg-gray-50 transition-colors font-bold text-sm shadow-sm transition-all focus:outline-none focus:ring-4 focus:ring-emerald-500/10 active:scale-[0.98]">
                                                <Download size={16} className="text-emerald-600" /> Export CSV
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {activeTab === 'inventory' && (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                    <th className="pb-4 pl-4">Item Details</th>
                                                    <th className="pb-4">Quantity in Store</th>
                                                    <th className="pb-4">Active in Stock</th>
                                                    <th className="pb-4 text-right pr-4">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {filteredStock.map((item) => (
                                                    <tr key={item._id} className="group hover:bg-gray-50/50 transition-colors">
                                                        <td className="py-5 pl-4">
                                                            <p className="font-bold text-slate-800">{item.name}</p>
                                                            <p className="text-[10px] uppercase text-gray-400 font-bold tracking-widest">{item.category} • {item.unit}</p>
                                                        </td>
                                                        <td className="py-5">
                                                            <p className="text-2xl font-black text-[#5D4037]">
                                                                {(item.storeQuantity || 0).toLocaleString()}
                                                                <span className="text-xs font-bold text-gray-400 ml-1 uppercase">{item.unit}</span>
                                                            </p>

                                                        </td>
                                                        <td className="py-5">
                                                            {(item.quantity || 0) > 0 ? (
                                                                <span className="text-[10px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">
                                                                    {(item.quantity || 0).toLocaleString()} {item.unit} Active
                                                                </span>
                                                            ) : (
                                                                <span className="text-[10px] font-black uppercase text-gray-400 bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
                                                                    Inactive in POS
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="py-5 text-right pr-4">
                                                            <div className="flex justify-end gap-2">
                                                                <button
                                                                    onClick={() => openTransferModal(item)}
                                                                    disabled={(item.storeQuantity || 0) <= 0}
                                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-lg transition-all font-black text-[9px] uppercase disabled:opacity-30 border border-emerald-200"
                                                                >
                                                                    <ChevronRight size={12} /> Transfer
                                                                </button>
                                                                {user?.role === "admin" && (
                                                                    <>
                                                                        <button
                                                                            onClick={() => openRestockModal(item)}
                                                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg transition-all font-black text-[9px] uppercase border border-blue-200"
                                                                        >
                                                                            <PlusCircle size={12} /> Restock
                                                                        </button>
                                                                        <button onClick={() => handleEditStock(item)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400">
                                                                            <Edit2 size={16} />
                                                                        </button>
                                                                        <button onClick={() => deleteStockItem(item._id)} className="p-2 hover:bg-red-50 rounded-lg text-red-300">
                                                                            <Trash2 size={16} />
                                                                        </button>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {activeTab === 'fixed-assets' && (
                                    <div className="space-y-4">
                                        {filteredFixedAssets.length === 0 ? (
                                            <div className="text-center py-20 text-gray-300 text-sm italic border-2 border-dashed border-gray-100 rounded-[2rem]">
                                                <Wrench className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                                No fixed assets found.
                                            </div>
                                        ) : (
                                            filteredFixedAssets.map((asset) => {
                                                const isExpanded = expandedAsset === asset._id
                                                const totalDismissed = asset.dismissals.reduce((s, d) => s + d.valueLost, 0)
                                                return (
                                                    <div key={asset._id} className={`rounded-2xl border overflow-hidden transition-all ${asset.status === 'fully_dismissed' ? 'bg-red-50/50 border-red-100 opacity-60' :
                                                        asset.status === 'partially_dismissed' ? 'bg-amber-50/40 border-amber-100' :
                                                            'bg-white border-gray-200'
                                                        }`}>
                                                        <div className="p-5">
                                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                                                                <div className="flex items-center gap-3">
                                                                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${asset.status === 'fully_dismissed' ? 'bg-red-100 text-red-500' :
                                                                        asset.status === 'partially_dismissed' ? 'bg-amber-100 text-amber-600' :
                                                                            'bg-emerald-100 text-emerald-600'
                                                                        }`}>
                                                                        <Wrench size={18} />
                                                                    </div>
                                                                    <div>
                                                                        <p className="font-black text-slate-800 text-lg">{asset.name}</p>
                                                                        <div className="flex items-center gap-2 mt-0.5">
                                                                            <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{asset.category}</span>
                                                                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${asset.status === 'fully_dismissed' ? 'bg-red-100 text-red-600' :
                                                                                asset.status === 'partially_dismissed' ? 'bg-amber-100 text-amber-600' :
                                                                                    'bg-emerald-100 text-emerald-600'
                                                                                }`}>{asset.status === 'fully_dismissed' ? 'Dismissed' : asset.status === 'partially_dismissed' ? 'Partial' : 'Active'}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-6">
                                                                    <div className="text-center">
                                                                        <p className="text-2xl font-black text-slate-800">{asset.quantity}</p>
                                                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Qty</p>
                                                                    </div>
                                                                    <div className="text-center">
                                                                        <p className="text-lg font-black text-orange-600">{asset.unitPrice.toLocaleString()} <span className="text-[10px]">Br</span></p>
                                                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Unit Price</p>
                                                                    </div>
                                                                    <div className="text-center">
                                                                        <p className="text-lg font-black text-emerald-600">{asset.totalValue.toLocaleString()} <span className="text-[10px]">Br</span></p>
                                                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Value</p>
                                                                    </div>
                                                                    {totalDismissed > 0 && (
                                                                        <div className="text-center">
                                                                            <p className="text-lg font-black text-red-500">-{totalDismissed.toLocaleString()} <span className="text-[10px]">Br</span></p>
                                                                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Lost</p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="flex items-center gap-1">
                                                                    {user?.role === "admin" && (
                                                                        <>
                                                                            {asset.status !== 'fully_dismissed' && (
                                                                                <button
                                                                                    onClick={() => openDismissModal(asset)}
                                                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-lg transition-all font-black text-[9px] uppercase border border-red-200"
                                                                                >
                                                                                    <AlertTriangle size={12} /> Dismiss
                                                                                </button>
                                                                            )}
                                                                            <button onClick={() => handleEditAsset(asset)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400">
                                                                                <Edit2 size={16} />
                                                                            </button>
                                                                            <button onClick={() => deleteFixedAsset(asset._id)} className="p-2 hover:bg-red-50 rounded-lg text-red-300">
                                                                                <Trash2 size={16} />
                                                                            </button>
                                                                        </>
                                                                    )}
                                                                    {asset.dismissals.length > 0 && (
                                                                        <button
                                                                            onClick={() => setExpandedAsset(isExpanded ? null : asset._id)}
                                                                            className="p-2 hover:bg-gray-100 rounded-lg text-gray-400"
                                                                        >
                                                                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            {asset.notes && (
                                                                <p className="mt-2 text-xs text-gray-400 italic pl-[52px]">{asset.notes}</p>
                                                            )}
                                                        </div>

                                                        {/* Dismissal History */}
                                                        {isExpanded && asset.dismissals.length > 0 && (
                                                            <div className="border-t border-gray-100 bg-gray-50/50 px-5 py-4">
                                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Dismissal History</p>
                                                                <div className="space-y-2">
                                                                    {asset.dismissals.map((d, i) => (
                                                                        <div key={i} className="flex items-start gap-3 p-3 bg-white rounded-xl border border-gray-100">
                                                                            <div className="h-8 w-8 bg-red-50 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                                                                <AlertTriangle size={14} className="text-red-400" />
                                                                            </div>
                                                                            <div className="flex-1 min-w-0">
                                                                                <p className="text-sm font-bold text-slate-800">{d.reason}</p>
                                                                                <p className="text-[10px] text-gray-400 mt-0.5">
                                                                                    {d.quantity} unit(s) · -{d.valueLost.toLocaleString()} Br · {new Date(d.date).toLocaleDateString()}
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )
                                            })
                                        )}
                                    </div>
                                )}


                                {activeTab === 'categories' && (
                                    <div className="space-y-8">
                                        <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                                                <h3 className="font-black text-xs uppercase tracking-widest text-[#8B4513]">
                                                    {editingCategory ? "Update Category" : `Add New ${categoryType === 'stock' ? 'Stock' : 'Asset'} Category`}
                                                </h3>
                                                <div className="flex p-1 bg-gray-200/50 rounded-xl">
                                                    <button
                                                        onClick={() => setCategoryType('stock')}
                                                        className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${categoryType === 'stock' ? 'bg-white text-[#8B4513] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                                    >
                                                        Stock
                                                    </button>
                                                    <button
                                                        onClick={() => setCategoryType('fixed-asset')}
                                                        className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${categoryType === 'fixed-asset' ? 'bg-white text-[#8B4513] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                                    >
                                                        Fixed Asset
                                                    </button>
                                                    <button
                                                        onClick={() => setCategoryType('expense')}
                                                        className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${categoryType === 'expense' ? 'bg-white text-[#8B4513] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                                    >
                                                        Expense
                                                    </button>
                                                </div>
                                            </div>
                                            {user?.role === "admin" && (
                                                <form onSubmit={handleSaveCategory} className="flex gap-3">
                                                    <input
                                                        type="text"
                                                        placeholder="Category Name (e.g. Vegetables)"
                                                        value={newCategory.name}
                                                        onChange={(e) => setNewCategory({ name: e.target.value })}
                                                        className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-[#8B4513]/5"
                                                        required
                                                    />
                                                    <button
                                                        type="submit"
                                                        disabled={saveLoading || !newCategory.name}
                                                        className="bg-[#8B4513] text-white px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest disabled:opacity-50 hover:bg-[#A0522D] transition-all shadow-lg shadow-[#8B4513]/20"
                                                    >
                                                        {saveLoading ? "Saving..." : (editingCategory ? "Update" : "Add")}
                                                    </button>
                                                    {editingCategory && (
                                                        <button
                                                            type="button"
                                                            onClick={() => { setEditingCategory(null); setNewCategory({ name: "" }) }}
                                                            className="bg-white text-gray-400 border border-gray-200 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-gray-50"
                                                        >
                                                            Cancel
                                                        </button>
                                                    )}
                                                </form>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {(categoryType === 'stock' ? categories : categoryType === 'fixed-asset' ? assetCategories : expenseCategories).map((cat) => (
                                                <div key={cat._id} className="p-4 bg-white border border-gray-100 rounded-2xl flex justify-between items-center group hover:border-[#8B4513] hover:shadow-md transition-all">
                                                    <div className="font-black text-lg text-gray-800">{cat.name}</div>
                                                    {user?.role === "admin" && (
                                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                                onClick={() => { setEditingCategory(cat); setNewCategory({ name: cat.name }) }}
                                                                className="text-gray-300 hover:text-[#8B4513] transition-colors p-2 rounded-lg hover:bg-[#8B4513]/5"
                                                            >
                                                                <Edit2 size={16} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteCategory(cat._id)}
                                                                className="text-gray-300 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-50"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                            {(categoryType === 'stock' ? categories : categoryType === 'fixed-asset' ? assetCategories : expenseCategories).length === 0 && (
                                                <div className="col-span-full text-center py-20 text-gray-300 text-sm italic border-2 border-dashed border-gray-100 rounded-[2rem]">
                                                    No {categoryType === 'stock' ? 'stock' : categoryType === 'fixed-asset' ? 'asset' : 'expense'} categories found. Add your first one above!
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'expenses' && (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                    <th className="pb-4 pl-4">Date</th>
                                                    <th className="pb-4">Name</th>
                                                    <th className="pb-4">Category</th>
                                                    <th className="pb-4">Amount</th>
                                                    <th className="pb-4">Description</th>
                                                    <th className="pb-4 text-right pr-4">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {filteredOperationalExpenses.map((expense) => (
                                                    <tr key={expense._id} className="group hover:bg-gray-50/50 transition-colors">
                                                        <td className="py-5 pl-4">
                                                            <p className="font-bold text-slate-800">{new Date(expense.date).toLocaleDateString()}</p>
                                                        </td>
                                                        <td className="py-5">
                                                            <p className="font-black text-slate-800">{expense.name || <span className="text-gray-300 italic">—</span>}</p>
                                                        </td>
                                                        <td className="py-5 text-sm font-bold text-gray-600">
                                                            {expense.category}
                                                        </td>
                                                        <td className="py-5">
                                                            <p className="text-xl font-black text-red-600">
                                                                {expense.amount.toLocaleString()}
                                                                <span className="text-[10px] font-bold text-gray-400 ml-1">ETB</span>
                                                            </p>
                                                        </td>
                                                        <td className="py-5 text-xs text-gray-400 max-w-[200px] truncate">
                                                            {expense.description}
                                                        </td>
                                                        <td className="py-5 text-right pr-4">
                                                            {user?.role === "admin" && (
                                                                <div className="flex justify-end gap-2">
                                                                    <button
                                                                        onClick={() => {
                                                                            setEditingOperationalExpense(expense);
                                                                            setOperationalExpenseFormData({
                                                                                date: new Date(expense.date).toISOString().split('T')[0],
                                                                                name: expense.name || "",
                                                                                category: expense.category,
                                                                                amount: expense.amount.toString(),
                                                                                description: expense.description || ""
                                                                            });
                                                                            setShowOperationalExpenseForm(true);
                                                                        }}
                                                                        className="p-2 hover:bg-gray-100 rounded-lg text-gray-400"
                                                                    >
                                                                        <Edit2 size={16} />
                                                                    </button>
                                                                    <button onClick={() => deleteOperationalExpense(expense._id)} className="p-2 hover:bg-red-50 rounded-lg text-red-300">
                                                                        <Trash2 size={16} />
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                                {filteredOperationalExpenses.length === 0 && (
                                                    <tr>
                                                        <td colSpan={5} className="py-20 text-center text-gray-300 text-sm italic">
                                                            No expenses found for this period.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {activeTab === 'transfers' && (
                                    <div className="space-y-4">
                                        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
                                            <div className="flex bg-gray-100/50 rounded-xl p-1">
                                                <button onClick={() => { setTransferFilterStatus("all"); fetchTransferRequests("all"); }} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${transferFilterStatus === "all" ? "bg-white text-emerald-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>All</button>
                                                <button onClick={() => { setTransferFilterStatus("pending"); fetchTransferRequests("pending"); }} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${transferFilterStatus === "pending" ? "bg-white text-emerald-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>Pending</button>
                                                <button onClick={() => { setTransferFilterStatus("approved"); fetchTransferRequests("approved"); }} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${transferFilterStatus === "approved" ? "bg-white text-emerald-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>Approved</button>
                                                <button onClick={() => { setTransferFilterStatus("denied"); fetchTransferRequests("denied"); }} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${transferFilterStatus === "denied" ? "bg-white text-emerald-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>Denied</button>
                                            </div>
                                            <button onClick={() => setShowTransferRequestForm(true)} className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-sm shadow-emerald-600/20">
                                                <Plus size={14} /> New Request
                                            </button>
                                        </div>

                                        {transfersLoading ? (
                                            <div className="flex flex-col items-center justify-center py-20 opacity-20">
                                                <History className="w-16 h-16 animate-spin-slow mb-4" />
                                                <p className="font-black uppercase tracking-widest text-xs">Loading Transfers...</p>
                                            </div>
                                        ) : transferRequests.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-gray-100 rounded-[2rem]">
                                                <Package className="h-12 w-12 text-gray-200 mb-4" />
                                                <h3 className="text-lg font-black text-gray-400">No Transfer Requests</h3>
                                                <p className="text-gray-400 text-xs font-bold mt-1 uppercase tracking-widest">
                                                    No requests found for this filter
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="grid gap-4">
                                                {transferRequests.filter(req =>
                                                    req.stockId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                                    req.notes?.toLowerCase().includes(searchTerm.toLowerCase())
                                                ).map(req => (
                                                    <div key={req._id} className="p-5 hover:bg-gray-50/50 transition-colors flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border border-gray-100 rounded-2xl group bg-white">
                                                        <div className="flex gap-4 items-center">
                                                            <div className={`h-12 w-12 rounded-xl flex items-center justify-center shadow-sm ${req.status === 'approved' ? 'bg-emerald-50 text-emerald-600' :
                                                                req.status === 'denied' ? 'bg-red-50 text-red-600' :
                                                                    'bg-amber-50 text-amber-600'
                                                                }`}>
                                                                <ArrowRightLeft className="h-5 w-5" />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <div className="flex items-center gap-3">
                                                                    <h3 className="text-base font-black text-gray-900">{req.stockId?.name}</h3>
                                                                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${req.status === 'approved' ? 'bg-emerald-50 text-emerald-600' :
                                                                        req.status === 'denied' ? 'bg-red-50 text-red-600' :
                                                                            'bg-amber-50 text-amber-600'
                                                                        }`}>
                                                                        {req.status}
                                                                    </span>
                                                                </div>
                                                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                                    <span className="flex items-center gap-1"><Package className="h-3 w-3" /> {req.quantity} {req.stockId?.unit}</span>
                                                                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(req.createdAt).toLocaleDateString()}</span>
                                                                    <span className="text-gray-300">By {req.requestedBy?.name}</span>
                                                                </div>
                                                                {req.notes && <p className="text-xs text-gray-500 italic mt-1">{req.notes}</p>}
                                                                {req.status === 'denied' && req.denialReason && (
                                                                    <p className="text-xs text-red-500 font-bold mt-1 flex items-center gap-1">
                                                                        <AlertTriangle size={12} /> Reason: {req.denialReason}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col items-end gap-2">
                                                            {req.status === 'pending' && user?.role === 'admin' ? (
                                                                <div className="flex gap-2">
                                                                    <button onClick={() => handleTransferAction(req._id, 'approved')} className="bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white px-3 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all">Approve</button>
                                                                    <button onClick={() => setDenialModal({ isOpen: true, requestId: req._id, reason: "" })} className="bg-red-50 text-red-600 hover:bg-red-600 hover:text-white px-3 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all">Deny</button>
                                                                </div>
                                                            ) : (
                                                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                                                    {req.handledBy ? `Handled by ${req.handledBy.name}` : ''}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </motion.div>
                        </div>
                    </div>
                </div>
                <AnimatePresence>
                    {showStockForm && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={resetStockForm} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
                            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="relative bg-white rounded-[2rem] p-8 max-w-xl w-full">
                                <h2 className="text-2xl font-black mb-6">{editingStock ? 'Edit Item' : 'Add New Item'}</h2>
                                <form onSubmit={handleSaveStock} className="space-y-4">
                                    <input type="text" placeholder="Name" value={stockFormData.name} onChange={e => setStockFormData({ ...stockFormData, name: e.target.value })} className="w-full p-4 bg-gray-50 rounded-xl outline-none font-bold" required />
                                    <div className="grid grid-cols-2 gap-4">
                                        <select
                                            value={stockFormData.category}
                                            onChange={e => setStockFormData({ ...stockFormData, category: e.target.value })}
                                            className="p-4 bg-gray-50 rounded-xl font-bold"
                                            required
                                        >
                                            {categories.length > 0 ? (
                                                categories.map(cat => (
                                                    <option key={cat._id} value={cat.name}>{cat.name}</option>
                                                ))
                                            ) : (
                                                <>
                                                    <option value="">Select Category</option>
                                                    <option value="meat">Meat</option>
                                                    <option value="dairy">Dairy</option>
                                                    <option value="drinks">Drinks</option>
                                                    <option value="supplies">Supplies</option>
                                                </>
                                            )}
                                        </select>
                                        <select value={stockFormData.unit} onChange={e => setStockFormData({ ...stockFormData, unit: e.target.value })} className="p-4 bg-gray-50 rounded-xl font-bold">
                                            <option value="kg">kg</option>
                                            <option value="L">L</option>
                                            <option value="pcs">pcs</option>
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">In Store Qty</label>
                                            <input type="number" step="any" placeholder="In Store Qty" value={stockFormData.quantity} onChange={e => setStockFormData({ ...stockFormData, quantity: e.target.value })} className="p-4 bg-gray-50 rounded-xl font-bold w-full" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Purchased Unit Price</label>
                                            <input type="number" step="any" placeholder="Purchased Unit Price" value={stockFormData.totalPurchaseCost} onChange={e => setStockFormData({ ...stockFormData, totalPurchaseCost: e.target.value })} className="p-4 bg-gray-50 rounded-xl font-bold w-full" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Limit For Store Alert</label>
                                            <input type="number" placeholder="Store Min Limit" value={stockFormData.storeMinLimit} onChange={e => setStockFormData({ ...stockFormData, storeMinLimit: e.target.value })} className="p-4 bg-gray-50 rounded-xl font-bold w-full" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Selling Price</label>
                                            <input type="number" step="any" placeholder="Selling Price" value={stockFormData.unitCost} onChange={e => setStockFormData({ ...stockFormData, unitCost: e.target.value })} className="w-full p-4 bg-gray-50 rounded-xl font-bold" />
                                        </div>

                                    </div>
                                    <div className="flex gap-4 pt-4">
                                        <button type="button" onClick={resetStockForm} className="flex-1 py-4 font-bold text-gray-400">Cancel</button>
                                        <button type="submit" className="flex-[2] py-4 bg-[#8B4513] text-white rounded-xl font-bold">Save Item</button>
                                    </div>
                                </form>
                            </motion.div>
                        </div>
                    )}

                    {showRestockModal && restockingItem && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowRestockModal(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
                            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="relative bg-white rounded-[2rem] p-8 max-w-sm w-full">
                                <h2 className="text-xl font-black mb-4">Restock {restockingItem.name}</h2>
                                <form onSubmit={handleRestockSubmit} className="space-y-4">
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Amount to add</label>
                                        <input type="number" step="any" placeholder="Amount to add" value={restockAmount} onChange={e => setRestockAmount(e.target.value)} className="w-full p-4 bg-gray-50 rounded-xl font-bold" required />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Purchased Unit Price</label>
                                        <input type="number" step="any" placeholder="Purchased Unit Price" value={newUnitCost} onChange={e => setNewUnitCost(e.target.value)} className="w-full p-4 bg-gray-50 rounded-xl font-bold" required />
                                    </div>
                                    <div className="flex gap-3 pt-4">
                                        <button type="button" onClick={() => setShowRestockModal(false)} className="flex-1 py-3 bg-gray-100 rounded-xl font-bold">Cancel</button>
                                        <button type="submit" className="flex-1 py-3 bg-[#8B4513] text-white rounded-xl font-bold">Restock</button>
                                    </div>
                                </form>
                            </motion.div>
                        </div>
                    )}

                    {showTransferModal && transferringItem && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowTransferModal(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
                            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="relative bg-white rounded-[2rem] p-8 max-w-sm w-full">
                                <h2 className="text-xl font-black mb-1">Transfer to Stock</h2>
                                <p className="text-xs text-gray-400 mb-4">Max: {transferringItem.storeQuantity} {transferringItem.unit}</p>
                                <form onSubmit={handleTransferSubmit} className="space-y-4">
                                    <input type="number" step="any" placeholder="Amount" max={transferringItem.storeQuantity} value={transferAmount} onChange={e => setTransferAmount(e.target.value)} className="w-full p-4 bg-gray-50 rounded-xl font-black text-xl text-emerald-600 shadow-inner" required />
                                    <div className="flex gap-3 pt-4">
                                        <button type="button" onClick={() => setShowTransferModal(false)} className="flex-1 py-3 bg-gray-100 rounded-xl font-bold">Cancel</button>
                                        <button type="submit" className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm">Move to POS</button>
                                    </div>
                                </form>
                            </motion.div>
                        </div>
                    )}

                    {/* Add/Edit Fixed Asset Modal */}
                    {showAssetForm && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={resetAssetForm} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
                            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="relative bg-white rounded-[2rem] p-8 max-w-xl w-full">
                                <h2 className="text-2xl font-black mb-6">{editingAsset ? 'Edit Fixed Asset' : 'Add Fixed Asset'}</h2>
                                <form onSubmit={handleSaveAsset} className="space-y-4">
                                    <input type="text" placeholder="Asset Name (e.g. Coffee Grinder)" value={assetFormData.name} onChange={e => setAssetFormData({ ...assetFormData, name: e.target.value })} className="w-full p-4 bg-gray-50 rounded-xl outline-none font-bold" required />
                                    <div className="grid grid-cols-2 gap-4">
                                        <select
                                            value={assetFormData.category}
                                            onChange={e => setAssetFormData({ ...assetFormData, category: e.target.value })}
                                            className="p-4 bg-gray-50 rounded-xl font-bold"
                                        >
                                            {assetCategories.length > 0 ? (
                                                assetCategories.map(cat => (
                                                    <option key={cat._id} value={cat.name}>{cat.name}</option>
                                                ))
                                            ) : (
                                                <option value="">Select Category</option>
                                            )}
                                        </select>
                                        <input type="date" value={assetFormData.purchaseDate} onChange={e => setAssetFormData({ ...assetFormData, purchaseDate: e.target.value })} className="p-4 bg-gray-50 rounded-xl font-bold" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Quantity</label>
                                            <input type="number" placeholder="How many?" value={assetFormData.quantity} onChange={e => setAssetFormData({ ...assetFormData, quantity: e.target.value })} className="w-full p-4 bg-gray-50 rounded-xl font-bold" required min="1" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Unit Price (Br)</label>
                                            <input type="number" placeholder="Price per unit" value={assetFormData.unitPrice} onChange={e => setAssetFormData({ ...assetFormData, unitPrice: e.target.value })} className="w-full p-4 bg-gray-50 rounded-xl font-bold" required min="0" />
                                        </div>
                                    </div>
                                    {assetFormData.quantity && assetFormData.unitPrice && (
                                        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                                            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Total Value</span>
                                            <p className="text-2xl font-black text-emerald-700">{(Number(assetFormData.quantity) * Number(assetFormData.unitPrice)).toLocaleString()} Br</p>
                                        </div>
                                    )}
                                    <textarea placeholder="Notes (optional)" value={assetFormData.notes} onChange={e => setAssetFormData({ ...assetFormData, notes: e.target.value })} className="w-full p-4 bg-gray-50 rounded-xl outline-none font-bold resize-none" rows={2} />
                                    <div className="flex gap-4 pt-4">
                                        <button type="button" onClick={resetAssetForm} className="flex-1 py-4 font-bold text-gray-400">Cancel</button>
                                        <button type="submit" className="flex-[2] py-4 bg-amber-600 text-white rounded-xl font-bold hover:bg-amber-700 transition-colors">{saveLoading ? "Saving..." : (editingAsset ? "Update Asset" : "Add Asset")}</button>
                                    </div>
                                </form>
                            </motion.div>
                        </div>
                    )}

                    {/* Dismiss Asset Modal */}
                    {showDismissModal && dismissingAsset && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowDismissModal(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
                            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="relative bg-white rounded-[2rem] p-8 max-w-sm w-full">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="h-10 w-10 bg-red-100 rounded-full flex items-center justify-center">
                                        <AlertTriangle size={20} className="text-red-500" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black">Dismiss Asset</h2>
                                        <p className="text-xs text-gray-400">{dismissingAsset.name} · {dismissingAsset.quantity} remaining</p>
                                    </div>
                                </div>
                                <form onSubmit={handleDismissSubmit} className="space-y-4">
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">How many to dismiss?</label>
                                        <input type="number" placeholder="Quantity" value={dismissQuantity} onChange={e => {
                                            setDismissQuantity(e.target.value)
                                            setDismissValue((Number(e.target.value) * dismissingAsset.unitPrice).toString())
                                        }} max={dismissingAsset.quantity} className="w-full p-4 bg-gray-50 rounded-xl font-black text-xl text-red-600" required min="1" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Value Lost (Br)</label>
                                        <input type="number" placeholder="Value lost" value={dismissValue} onChange={e => setDismissValue(e.target.value)} className="w-full p-4 bg-gray-50 rounded-xl font-bold" required min="0" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Reason for dismissal</label>
                                        <textarea placeholder="e.g. Broken beyond repair, lost, damaged..." value={dismissReason} onChange={e => setDismissReason(e.target.value)} className="w-full p-4 bg-gray-50 rounded-xl outline-none font-bold resize-none" rows={3} required />
                                    </div>
                                    <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                                        <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">Asset value will decrease by</p>
                                        <p className="text-2xl font-black text-red-700">-{Number(dismissValue || 0).toLocaleString()} Br</p>
                                    </div>
                                    <div className="flex gap-3 pt-4">
                                        <button type="button" onClick={() => setShowDismissModal(false)} className="flex-1 py-3 bg-gray-100 rounded-xl font-bold">Cancel</button>
                                        <button type="submit" className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors">{saveLoading ? "Processing..." : "Confirm Dismiss"}</button>
                                    </div>
                                </form>
                            </motion.div>
                        </div>
                    )}

                    {showOperationalExpenseForm && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={resetOperationalExpenseForm} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
                            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="relative bg-white rounded-[2rem] p-8 max-w-xl w-full">
                                <h2 className="text-2xl font-black mb-6">{editingOperationalExpense ? 'Edit Operational Expense' : 'Add Operational Expense'}</h2>
                                <form onSubmit={handleSaveOperationalExpense} className="space-y-4">
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Expense Name</label>
                                        <input type="text" placeholder="e.g. Electricity Bill, Rent, Water" value={operationalExpenseFormData.name} onChange={e => setOperationalExpenseFormData({ ...operationalExpenseFormData, name: e.target.value })} className="w-full p-4 bg-gray-50 rounded-xl outline-none font-bold" required />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Date</label>
                                            <input type="date" value={operationalExpenseFormData.date} onChange={e => setOperationalExpenseFormData({ ...operationalExpenseFormData, date: e.target.value })} className="w-full p-4 bg-gray-50 rounded-xl outline-none font-bold" required />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Category</label>
                                            <select
                                                value={operationalExpenseFormData.category}
                                                onChange={e => setOperationalExpenseFormData({ ...operationalExpenseFormData, category: e.target.value })}
                                                className="w-full p-4 bg-gray-50 rounded-xl font-bold"
                                                required
                                            >
                                                {expenseCategories.length > 0 ? (
                                                    expenseCategories.map(cat => (
                                                        <option key={cat._id} value={cat.name}>{cat.name}</option>
                                                    ))
                                                ) : (
                                                    <option value="">Select Category</option>
                                                )}
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Amount (ETB)</label>
                                        <input type="number" placeholder="Amount" value={operationalExpenseFormData.amount} onChange={e => setOperationalExpenseFormData({ ...operationalExpenseFormData, amount: e.target.value })} className="w-full p-4 bg-gray-50 rounded-xl outline-none font-bold" required min="0" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Description</label>
                                        <textarea placeholder="e.g. Rent for November, Electricity bill..." value={operationalExpenseFormData.description} onChange={e => setOperationalExpenseFormData({ ...operationalExpenseFormData, description: e.target.value })} className="w-full p-4 bg-gray-50 rounded-xl outline-none font-bold resize-none" rows={3} />
                                    </div>
                                    <div className="flex gap-4 pt-4">
                                        <button type="button" onClick={resetOperationalExpenseForm} className="flex-1 py-4 font-bold text-gray-400">Cancel</button>
                                        <button type="submit" className="flex-[2] py-4 bg-red-600 text-white rounded-xl font-bold">{saveLoading ? "Saving..." : "Save Expense"}</button>
                                    </div>
                                </form>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* Transfer Denial Modal */}
                <AnimatePresence>
                    {denialModal.isOpen && (
                        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDenialModal({ ...denialModal, isOpen: false })} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
                            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white w-full max-w-md rounded-[2rem] p-10 shadow-2xl">
                                <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-3">
                                    <XCircle className="text-red-500 h-6 w-6" />
                                    Deny Transfer Request
                                </h3>
                                <textarea placeholder="Reason for denial..." value={denialModal.reason} onChange={e => setDenialModal({ ...denialModal, reason: e.target.value })} className="w-full bg-gray-50 border-2 border-red-50 rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none focus:border-red-400 transition-all h-32 resize-none mb-4" />
                                <div className="flex gap-3">
                                    <button onClick={() => handleTransferAction(denialModal.requestId, 'denied', denialModal.reason)} disabled={!denialModal.reason} className="flex-1 bg-red-500 text-white py-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-600 disabled:opacity-50 transition-all">Confirm Denial</button>
                                    <button onClick={() => setDenialModal({ ...denialModal, isOpen: false })} className="px-6 border-2 border-gray-100 text-gray-400 rounded-xl font-bold text-xs">Cancel</button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* New Transfer Request Modal */}
                <AnimatePresence>
                    {showTransferRequestForm && (
                        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowTransferRequestForm(false)} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
                            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative bg-white w-full max-w-xl rounded-[2.5rem] p-10 shadow-2xl">
                                <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-3 mb-8">
                                    <ArrowRightLeft className="text-emerald-600 h-7 w-7" />
                                    New Transfer Request
                                </h2>
                                <div className="space-y-6">
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block">Select Stock Item</label>
                                        <div className="relative">
                                            <select value={newTransferRequest.stockId} onChange={e => setNewTransferRequest({ ...newTransferRequest, stockId: e.target.value })} className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none focus:border-emerald-500 transition-all appearance-none cursor-pointer">
                                                <option value="">Choose item...</option>
                                                {stockItems.filter(i => i.trackQuantity && (i.storeQuantity || 0) > 0).map(item => (
                                                    <option key={item._id} value={item._id}>{item.name} (Store: {item.storeQuantity} {item.unit})</option>
                                                ))}
                                            </select>
                                            <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5 pointer-events-none" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block">Quantity to Transfer</label>
                                        <input type="number" step="any" placeholder="0.00" value={newTransferRequest.quantity} onChange={e => setNewTransferRequest({ ...newTransferRequest, quantity: e.target.value })} className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none focus:border-emerald-500 transition-all" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block">Purpose / Notes</label>
                                        <textarea placeholder="Why is this transfer needed?" value={newTransferRequest.notes} onChange={e => setNewTransferRequest({ ...newTransferRequest, notes: e.target.value })} className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none focus:border-emerald-500 transition-all h-28 resize-none" />
                                    </div>
                                    <div className="flex gap-4 pt-2">
                                        <button onClick={handleCreateTransferRequest} disabled={transferRequestSaving || !newTransferRequest.stockId || !newTransferRequest.quantity} className="flex-1 bg-emerald-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-lg shadow-emerald-600/20">{transferRequestSaving ? "Submitting..." : "Submit Request"}</button>
                                        <button onClick={() => setShowTransferRequestForm(false)} className="px-8 border-2 border-gray-100 text-gray-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-50">Cancel</button>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* Confirmations */}
                <ConfirmationCard
                    isOpen={confirmationState.isOpen}
                    onClose={closeConfirmation}
                    onConfirm={confirmationState.onConfirm}
                    title={confirmationState.options.title}
                    message={confirmationState.options.message}
                    type={confirmationState.options.type}
                />
                <NotificationCard
                    isOpen={notificationState.isOpen}
                    onClose={closeNotification}
                    title={notificationState.options.title}
                    message={notificationState.options.message}
                    type={notificationState.options.type}
                />
            </div >
        </ProtectedRoute >
    )
}
