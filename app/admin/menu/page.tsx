"use client"

import { useEffect, useState } from "react"
import { ProtectedRoute } from "@/components/protected-route"
import { BentoNavbar } from "@/components/bento-navbar"
import { AnimatedButton } from "@/components/animated-button"
import { useAuth } from "@/context/auth-context"

import { useLanguage } from "@/context/language-context"
import { compressImage, validateImageFile } from "@/lib/utils/image-utils"
import { ConfirmationCard, NotificationCard } from "@/components/confirmation-card"
import { useConfirmation } from "@/hooks/use-confirmation"

interface MenuItem {
  _id: string
  menuId: string
  name: string
  mainCategory: 'Food' | 'Drinks'
  category: string
  price: number
  description?: string
  image?: string
  preparationTime?: number
  available: boolean
  reportUnit?: 'kg' | 'liter' | 'piece'
  reportQuantity?: number
  stockItemId?: string | any
  stockConsumption?: number
  createdAt: string
  updatedAt: string
}

interface MenuItemForm {
  menuId: string
  name: string
  mainCategory: 'Food' | 'Drinks'
  category: string
  price: string
  description: string
  image: string
  preparationTime: string
  available: boolean
  reportUnit: 'kg' | 'liter' | 'piece'
  reportQuantity: string
  stockItemId: string
  stockConsumption: string
}

export default function AdminMenuPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [stockItems, setStockItems] = useState<any[]>([])
  const [filteredItems, setFilteredItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)

  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [createLoading, setCreateLoading] = useState(false)
  const [imageProcessing, setImageProcessing] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [mainCategoryFilter, setMainCategoryFilter] = useState<'Food' | 'Drinks'>('Food')
  const [formData, setFormData] = useState<MenuItemForm>({
    menuId: "",
    name: "",
    mainCategory: 'Food',
    category: "",
    price: "",
    description: "",
    image: "",
    preparationTime: "10",
    available: true,
    reportUnit: 'piece',
    reportQuantity: '1',
    stockItemId: "",
    stockConsumption: "0"
  })
  const [imageInputType, setImageInputType] = useState<'file' | 'url'>('file')
  const { token } = useAuth()
  const { t } = useLanguage()
  const { confirmationState, confirm, closeConfirmation, notificationState, notify, closeNotification } = useConfirmation()
  const [categories, setCategories] = useState<any[]>([])
  const [swapMode, setSwapMode] = useState(false)
  const [swapSourceId, setSwapSourceId] = useState<string | null>(null)
  const [showCategoryManager, setShowCategoryManager] = useState(false)
  const [categoryLoading, setCategoryLoading] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")

  useEffect(() => {
    if (token) {
      fetchMenuItems()
      fetchCategories()
      fetchStockItems()
    }
  }, [token])

  const fetchStockItems = async () => {
    try {
      const response = await fetch("/api/stock", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        const data = await response.json()
        setStockItems(data)
      }
    } catch (error) {
      console.error("Error fetching stock:", error)
    }
  }

  const fetchCategories = async () => {
    if (!token) return
    try {
      const response = await fetch("/api/categories?type=menu", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        const data = await response.json()
        setCategories(data)
      }
    } catch (error) {
      console.error("Error fetching categories:", error)
    }
  }

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCategoryName.trim()) return
    setCategoryLoading(true)
    try {
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newCategoryName, type: "menu" }),
      })
      if (response.ok) {
        setNewCategoryName("")
        fetchCategories()
      }
    } catch (error) {
      console.error("Error adding category:", error)
    } finally {
      setCategoryLoading(false)
    }
  }

  const handleDeleteCategory = async (id: string) => {
    const confirmed = await confirm({
      title: "Delete Category",
      message: "Are you sure you want to delete this category?\n\nMenu items in this category will still exist but the category filter will be gone.",
      type: "warning",
      confirmText: "Delete Category",
      cancelText: "Cancel"
    })

    if (!confirmed) return
    try {
      const response = await fetch(`/api/categories/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        fetchCategories()
      }
    } catch (error) {
      console.error("Error deleting category:", error)
    }
  }

  // Filters and search logic

  useEffect(() => {
    filterItems()
  }, [menuItems, searchTerm, categoryFilter, mainCategoryFilter])



  const fetchMenuItems = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/menu?t=${Date.now()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache',
        },
      })

      if (response.ok) {
        const data = await response.json()
        setMenuItems(data)
        setError(null)
      } else {
        const errData = await response.json().catch(() => ({}))
        setError(errData.message || `Error ${response.status}: Failed to load menu`)
      }
    } catch (error: any) {
      console.error("Error fetching menu items:", error)
      setError(error.message || "Network error: Failed to fetch menu")
    } finally {
      setLoading(false)
    }
  }

  const filterItems = () => {
    let filtered = menuItems.filter(item => (item.mainCategory || 'Food') === mainCategoryFilter)
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.menuId && item.menuId.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }
    if (categoryFilter !== "all") {
      filtered = filtered.filter(item => item.category === categoryFilter)
    }

    // Sort numerically by menuId
    filtered = [...filtered].sort((a, b) => {
      const idA = a.menuId || ""
      const idB = b.menuId || ""
      return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' })
    })

    setFilteredItems(filtered)
  }

  const handleSwap = async (targetMenuId: string) => {
    if (!swapSourceId) {
      setSwapSourceId(targetMenuId)
      notify({ title: "Select Target", message: "Select another item to swap IDs with.", type: "info" })
      return
    }

    if (swapSourceId === targetMenuId) {
      setSwapSourceId(null)
      return
    }

    try {
      const response = await fetch("/api/admin/menu/swap", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ menuId1: swapSourceId, menuId2: targetMenuId }),
      })

      if (response.ok) {
        notify({ title: "Success", message: "Menu IDs swapped successfully.", type: "success" })
        fetchMenuItems()
        setSwapMode(false)
        setSwapSourceId(null)
      } else {
        const errorData = await response.json()
        notify({ title: "Error", message: errorData.message || "Failed to swap IDs", type: "error" })
      }
    } catch (error) {
      notify({ title: "Error", message: "An error occurred while swapping", type: "error" })
    }
  }

  const handleNormalize = async () => {
    const confirmed = await confirm({
      title: "Re-index Menu IDs",
      message: "This will re-index all menu items sequentially (1, 2, 3...). Gaps in IDs will be closed.\n\nAre you sure?",
      type: "info",
      confirmText: "Re-index Now",
      cancelText: "Cancel"
    })

    if (!confirmed) return

    try {
      setLoading(true)
      const response = await fetch("/api/admin/menu/normalize", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.ok) {
        notify({ title: "Success", message: "Menu IDs re-indexed successfully!", type: "success" })
        fetchMenuItems()
        localStorage.setItem('menuUpdated', Date.now().toString())
      } else {
        const errorData = await response.json()
        notify({ title: "Error", message: errorData.message || "Normalization failed", type: "error" })
      }
    } catch (error) {
      console.error("Normalize error:", error)
      notify({ title: "Error", message: "An error occurred during normalization", type: "error" })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.category || !formData.price) {
      notify({
        title: "Missing Information",
        message: "Please fill in all required fields (Name, Category, and Price).",
        type: "error"
      })
      return
    }

    setCreateLoading(true)
    try {
      const url = editingItem
        ? `/api/admin/menu/${editingItem._id}`
        : "/api/admin/menu"

      const method = editingItem ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        const responseData = await response.json()
        notify({
          title: editingItem ? "Menu Item Updated" : "Menu Item Created",
          message: editingItem ? "Menu item has been updated successfully." : "New menu item has been added successfully.",
          type: "success"
        })
        resetForm()
        setTimeout(() => fetchMenuItems(), 500)
        localStorage.setItem('menuUpdated', Date.now().toString())
      } else {
        const errorData = await response.json()
        notify({
          title: "Save Failed",
          message: errorData.message || "Failed to save menu item",
          type: "error"
        })
      }
    } catch (error) {
      console.error("Error saving menu item:", error)
    } finally {
      setCreateLoading(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate
    const { valid, error } = validateImageFile(file)
    if (!valid) {
      notify({
        title: "Invalid Image",
        message: error || "Please select a valid image file",
        type: "error"
      })
      return
    }

    try {
      setImageProcessing(true)
      const compressedImage = await compressImage(file, {
        maxWidth: 800, // Larger for menu items
        maxHeight: 800,
        quality: 0.8
      })
      setFormData(prev => ({ ...prev, image: compressedImage }))
    } catch (err) {
      console.error("Image processing failed:", err)
      notify({
        title: "Image Processing Failed",
        message: "Failed to process the selected image. Please try again.",
        type: "error"
      })
    } finally {
      setImageProcessing(false)
    }
  }

  const handleEdit = (item: MenuItem) => {
    setEditingItem(item)
    setFormData({
      menuId: item.menuId || "",
      name: item.name,
      mainCategory: item.mainCategory || 'Food',
      category: item.category,
      price: item.price.toString(),
      description: item.description || "",
      image: item.image || "",
      preparationTime: item.preparationTime?.toString() || "10",
      available: item.available,
      reportUnit: item.reportUnit || 'piece',
      reportQuantity: item.reportQuantity?.toString() || "0",
      stockItemId: item.stockItemId?._id || item.stockItemId || "",
      stockConsumption: item.stockConsumption?.toString() || "0",
    })
    setShowCreateForm(true)
  }

  const handleDelete = async (item: MenuItem) => {
    const confirmed = await confirm({
      title: "Delete Menu Item",
      message: `Are you sure you want to delete "${item.name}"?\n\nThis action cannot be undone.`,
      type: "danger",
      confirmText: "Delete Item",
      cancelText: "Cancel"
    })

    if (!confirmed) return

    try {
      const response = await fetch(`/api/admin/menu/${item._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        fetchMenuItems()
        localStorage.setItem('menuUpdated', Date.now().toString())
      }
    } catch (error) {
      console.error("Error deleting menu item:", error)
    }
  }

  const handleExportCSV = () => {
    if (menuItems.length === 0) return

    const headers = ["Menu ID", "Name", "Category", "Price", "Available", "Description"]
    const rows = menuItems.map(item => [
      item.menuId || "",
      item.name,
      item.category,
      item.price,
      item.available ? "Yes" : "No",
      item.description || ""
    ])

    let csvContent = "data:text/csv;charset=utf-8,"
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n")

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `menu_export_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const resetForm = () => {
    setFormData({
      menuId: "", name: "", mainCategory: 'Food', category: "", price: "", description: "",
      image: "", preparationTime: "10", available: true,
      reportUnit: 'piece', reportQuantity: '1',
      stockItemId: "", stockConsumption: "0"
    })
    setEditingItem(null)
    setShowCreateForm(false)
  }

  return (
    <ProtectedRoute requiredRoles={["admin"]}>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <BentoNavbar />

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            {/* Control Sidebar */}
            <div className="md:col-span-4 lg:col-span-3 flex flex-col gap-4 md:sticky md:top-4">
              {/* Add New Button Card */}
              <div className="bg-[#8B4513] rounded-2xl p-6 md:p-8 shadow-xl shadow-[#8B4513]/20 text-white relative overflow-hidden">
                <div className="relative z-10">
                  <h2 className="text-xl md:text-2xl font-black mb-4 tracking-tight">{t("adminMenu.actions")}</h2>
                  <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-1 gap-3">
                      <button
                        onClick={() => { resetForm(); setShowCreateForm(true); }}
                        className="w-full bg-white text-[#8B4513] font-black py-4 rounded-xl shadow-lg hover:bg-gray-100 transition-all text-xs uppercase tracking-widest transform active:scale-95 flex items-center justify-center gap-2"
                      >
                        ➕ {t("adminMenu.addNewItem")}
                      </button>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={handleNormalize}
                          className="bg-white/10 hover:bg-white/20 text-white font-black py-3 rounded-xl transition-all text-[10px] uppercase tracking-widest border border-white/20 flex items-center justify-center gap-1"
                          title="Auto-fix ID gaps"
                        >
                          🔢 {t("adminMenu.reindex") || "Re-index"}
                        </button>
                        <button
                          onClick={() => { setSwapMode(!swapMode); setSwapSourceId(null); }}
                          className={`font-black py-3 rounded-xl border text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-1 ${swapMode ? "bg-purple-600 text-white border-purple-600 shadow-inner" : "bg-white/10 text-white border-white/20 hover:bg-white/20"}`}
                        >
                          🔄 {swapMode ? t("common.cancel") : t("adminMenu.swap") || "Swap"}
                        </button>
                      </div>

                      <button
                        onClick={handleExportCSV}
                        className="w-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white font-black py-2.5 rounded-xl transition-all text-[9px] uppercase tracking-widest border border-white/10 flex items-center justify-center gap-2"
                      >
                        📥 {t("adminMenu.exportCsv") || "Export CSV"}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="absolute -bottom-4 -right-4 text-8xl opacity-10 transform -rotate-12">☕</div>
              </div>

              {/* Filters Card */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                <h2 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                  <span>🔍</span> {t("adminMenu.filters")}
                </h2>
                <div className="space-y-4">
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                    <input
                      type="text"
                      placeholder={t("adminMenu.searchPlaceholder")}
                      className="w-full pl-12 pr-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:border-[#8B4513]/20 focus:bg-white transition-all outline-none font-bold text-sm"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 gap-4">
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400">{t("adminMenu.category")}</label>
                          <button
                            onClick={() => setShowCategoryManager(true)}
                            className="text-[10px] font-black uppercase tracking-widest text-[#8B4513] hover:underline"
                          >
                            {t("adminMenu.manage")}
                          </button>
                        </div>
                        <div className="relative">
                          <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3.5 text-sm font-bold appearance-none cursor-pointer focus:outline-none focus:ring-4 focus:ring-[#8B4513]/5 text-slate-700 pr-10"
                          >
                            <option value="all">{t("adminMenu.allCategories")}</option>
                            {categories.map((cat: any) => (
                              <option key={cat._id || cat.name} value={cat.name}>
                                {cat.name}
                              </option>
                            ))}
                          </select>
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-[10px]">
                            ▼
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="md:col-span-8 lg:col-span-9">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 min-h-[600px]">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                  <div>
                    <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">{t("adminMenu.title")}</h1>
                    <p className="text-gray-400 text-xs md:text-sm font-bold uppercase tracking-widest">{t("adminMenu.subtitle")}</p>
                  </div>
                  <div className="bg-[#8B4513]/5 px-4 py-2 rounded-xl border border-[#8B4513]/10 text-[#8B4513] text-[10px] font-black uppercase tracking-widest">
                    {filteredItems.length} {t("adminMenu.itemsFound")}
                  </div>
                </div>

                {/* Food / Drinks top-level tabs */}
                <div className="flex gap-2 mb-6">
                  {(['Food', 'Drinks'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => { setMainCategoryFilter(tab); setCategoryFilter('all') }}
                      className={`flex items-center gap-2 px-6 py-2.5 rounded-full font-black text-sm transition-all ${mainCategoryFilter === tab
                        ? 'bg-[#8B4513] text-white shadow-md'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                    >
                      {tab === 'Food' ? '🍽️' : '🥤'} {tab}
                      <span className="text-[10px] opacity-70">({menuItems.filter(i => (i.mainCategory || 'Food') === tab).length})</span>
                    </button>
                  ))}
                </div>

                {error && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-2xl font-bold flex items-center gap-3">
                    <span>⚠️</span> {error}
                  </div>
                )}

                {loading ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <div className="text-6xl animate-bounce mb-4 text-[#8B4513]">☕</div>
                    <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">{t("adminMenu.loading")}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredItems.map((item, index) => (
                      <div key={item._id} className="bg-gray-50 rounded-2xl overflow-hidden border border-gray-100 hover:shadow-xl transition-all group flex flex-col relative">
                        {/* Item Image */}
                        <div className="h-40 md:h-48 bg-gray-200 relative overflow-hidden">
                          {item.image ? (
                            <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-5xl opacity-30">☕</div>
                          )}
                          <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
                            <div className="bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-lg text-[9px] font-black text-[#8B4513] shadow-sm border border-white/50">
                              #{item.menuId}
                            </div>
                          </div>
                          <div className={`absolute top-4 right-4 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest z-10 backdrop-blur-md border border-white/50 shadow-sm ${item.available ? "bg-green-100/90 text-green-700" : "bg-red-100/90 text-red-700"}`}>
                            {item.available ? t("adminMenu.active") : t("adminMenu.hidden")}
                          </div>
                        </div>

                        <div className="p-5 flex-1 flex flex-col relative bg-white/50 backdrop-blur-sm">
                          <h3 className="font-black text-lg text-slate-800 mb-0.5 truncate">{item.name}</h3>
                          <p className="text-[10px] font-black text-[#8B4513] uppercase tracking-widest mb-4 opacity-70">{item.category}</p>
                          <div className="flex items-end gap-1 mb-6">
                            <span className="text-2xl font-black text-slate-900">{item.price}</span>
                            <span className="text-xs font-black text-slate-400 mb-1">{t("common.currencyBr")}</span>
                          </div>

                          <div className="flex gap-2 mt-auto">
                            <button
                              onClick={() => swapMode ? handleSwap(item.menuId) : handleEdit(item)}
                              className={`flex-1 font-black py-3 rounded-xl transition-all text-[10px] uppercase tracking-widest border transform active:scale-95 ${swapMode
                                ? (swapSourceId === item.menuId ? "bg-purple-600 text-white border-purple-600 shadow-lg" : "bg-purple-50 text-purple-600 border-purple-100 hover:bg-purple-100")
                                : "bg-white border-gray-100 text-slate-600 hover:border-[#8B4513]/20 hover:text-[#8B4513] hover:shadow-md"
                                }`}
                            >
                              {swapMode ? (swapSourceId === item.menuId ? "Selected" : "Swap ID") : t("adminMenu.edit")}
                            </button>
                            <button
                              onClick={() => handleDelete(item)}
                              className="w-10 h-10 bg-white border border-gray-100 text-red-500 flex items-center justify-center rounded-xl hover:bg-red-50 hover:border-red-100 transition-all transform active:scale-95 shadow-sm"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {!loading && filteredItems.length === 0 && (
                  <div className="text-center py-32">
                    <div className="text-7xl mb-6 opacity-20">🍃</div>
                    <h2 className="text-2xl font-bold text-gray-400">{t("adminMenu.empty")}</h2>
                    <p className="text-gray-400">{t("adminMenu.emptyDesc")}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Create/Edit Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
            <div className="bg-white rounded-[2.5rem] md:rounded-[3.5rem] shadow-2xl max-w-2xl w-full relative overflow-hidden flex flex-col max-h-[90vh]">
              <button
                onClick={resetForm}
                className="absolute top-6 right-6 w-10 h-10 bg-gray-50 rounded-2xl flex items-center justify-center font-bold text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all z-10"
              >✕</button>

              <div className="flex-1 overflow-y-auto p-6 md:p-10 pt-16 md:pt-20 scrollbar-hide">
                <h2 className="text-2xl md:text-3xl font-black text-gray-900 mb-8 tracking-tight">
                  {editingItem ? t("adminMenu.updateItem") : t("adminMenu.newItem")}
                </h2>

                <form onSubmit={handleCreateOrUpdate} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    {/* Image Upload Section */}
                    <div className="md:col-span-2">
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-sm font-bold text-gray-700">{t("adminMenu.itemImage") || "Item Image"}</label>
                        <div className="flex bg-gray-100 p-1 rounded-lg">
                          <button
                            type="button"
                            onClick={() => setImageInputType('file')}
                            className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${imageInputType === 'file' ? 'bg-white shadow text-[#2d5a41]' : 'text-gray-500'}`}
                          >
                            Upload File
                          </button>
                          <button
                            type="button"
                            onClick={() => setImageInputType('url')}
                            className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${imageInputType === 'url' ? 'bg-white shadow text-[#2d5a41]' : 'text-gray-500'}`}
                          >
                            Image URL
                          </button>
                        </div>
                      </div>

                      <div className="flex items-start gap-4">
                        <div className="w-24 h-24 bg-gray-100 rounded-2xl overflow-hidden flex-shrink-0 border border-gray-200">
                          {formData.image ? (
                            <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300 text-2xl">📷</div>
                          )}
                        </div>

                        <div className="flex-1 space-y-3">
                          {imageInputType === 'file' ? (
                            <>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageUpload}
                                disabled={imageProcessing}
                                className="block w-full text-sm text-gray-500
                                file:mr-4 file:py-2 file:px-4
                                file:rounded-full file:border-0
                                file:text-sm file:font-semibold
                                file:bg-[#2d5a41] file:text-white
                                hover:file:bg-[#1a3828] cursor-pointer"
                              />
                              <p className="text-xs text-gray-500">{imageProcessing ? "⏳ Processing..." : "Supports JPG, PNG, WebP. Max 5MB."}</p>
                            </>
                          ) : (
                            <div>
                              <input
                                type="url"
                                value={formData.image}
                                onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                                placeholder="https://example.com/image.jpg"
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d5a41]"
                              />
                              <p className="mt-2 text-xs text-gray-500">Enter a direct link to an image.</p>
                            </div>
                          )}

                          {formData.image && (
                            <button
                              type="button"
                              onClick={() => setFormData(prev => ({ ...prev, image: "" }))}
                              className="text-xs text-red-500 font-bold hover:underline"
                            >
                              Remove Image
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Menu ID (Optional)</label>
                        <input
                          type="text"
                          value={formData.menuId}
                          onChange={(e) => setFormData({ ...formData, menuId: e.target.value.trim() })}
                          className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d5a41]"
                          placeholder="AUTO-GEN"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">{t("adminMenu.itemName")} *</label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d5a41]"
                          placeholder="Flat White"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Main Category *</label>
                      <div className="flex gap-2">
                        {(['Food', 'Drinks'] as const).map(mc => (
                          <button
                            key={mc}
                            type="button"
                            onClick={() => setFormData({ ...formData, mainCategory: mc })}
                            className={`flex-1 py-3 rounded-2xl font-black text-sm transition-all border-2 ${formData.mainCategory === mc
                              ? 'bg-[#8B4513] text-white border-[#8B4513]'
                              : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-[#8B4513]/30'
                              }`}
                          >
                            {mc === 'Food' ? '🍽️' : '🥤'} {mc}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">{t("adminMenu.category")} *</label>
                      <select
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-3.5 text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#2d5a41]"
                        required
                      >
                        <option value="">{t("adminMenu.category")}</option>
                        {categories.map((cat: any) => <option key={cat._id || cat.name} value={cat.name}>{cat.name}</option>)}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">{t("adminMenu.priceBr")} *</label>
                        <input
                          type="number"
                          value={formData.price}
                          onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                          className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-3.5 text-sm"
                          placeholder="120"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">{t("adminMenu.prepTime")}</label>
                        <input
                          type="number"
                          value={formData.preparationTime}
                          onChange={(e) => setFormData({ ...formData, preparationTime: e.target.value })}
                          className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-3.5 text-sm"
                          placeholder="10"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">{t("adminMenu.description")}</label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-3.5 text-sm h-[80px]"
                        placeholder={t("adminMenu.descPlaceholder")}
                      />
                    </div>

                    {/* Reporting Configuration */}
                    <div className="bg-[#2d5a41]/5 p-6 rounded-[30px] border border-[#2d5a41]/10">
                      <h3 className="text-sm font-black text-[#2d5a41] uppercase tracking-widest mb-4">Reporting Configuration</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-2">Reporting Unit</label>
                          <select
                            value={formData.reportUnit}
                            onChange={(e) => setFormData({ ...formData, reportUnit: e.target.value as any })}
                            className="w-full bg-white border border-gray-200 rounded-2xl px-5 py-3.5 text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#2d5a41]"
                          >
                            <option value="kg">kg (Beef)</option>
                            <option value="liter">liter (Drinks/Milk)</option>
                            <option value="piece">piece (Soft Drinks)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-2">Amount per Sale</label>
                          <div className="relative">
                            <input
                              type="number"
                              step="any"
                              value={formData.reportQuantity}
                              onChange={(e) => setFormData({ ...formData, reportQuantity: e.target.value })}
                              className="w-full bg-white border border-gray-200 rounded-2xl px-5 py-3.5 text-sm"
                              placeholder="0.00"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#2d5a41] text-xs font-bold uppercase">
                              {formData.reportUnit}
                            </span>
                          </div>
                          <p className="mt-2 text-[10px] text-gray-400 font-medium">Used for calculating total consumption in reports.</p>
                        </div>
                      </div>
                    </div>

                    {/* Stock Linkage Configuration */}
                    <div className="bg-[#f5bc6b]/10 p-6 rounded-[30px] border border-[#f5bc6b]/20">
                      <h3 className="text-sm font-black text-[#8b6e3f] uppercase tracking-widest mb-4 flex items-center gap-2">
                        <span>📦</span> Stock Linkage (Optional)
                      </h3>
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-2">Link to Stock Item</label>
                          <select
                            value={formData.stockItemId}
                            onChange={(e) => setFormData({ ...formData, stockItemId: e.target.value })}
                            className="w-full bg-white border border-gray-200 rounded-2xl px-5 py-3.5 text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#f5bc6b]"
                          >
                            <option value="">No Stock Linked</option>
                            {stockItems.map((stock: any) => (
                              <option key={stock._id} value={stock._id}>
                                {stock.name} ({stock.unit})
                              </option>
                            ))}
                          </select>
                          <p className="mt-2 text-[10px] text-gray-400 font-medium italic">Select a stock item to auto-track inventory on every sale.</p>
                        </div>

                        {formData.stockItemId && (
                          <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Stock Used Per Sale</label>
                            <div className="relative">
                              <input
                                type="number"
                                step="any"
                                value={formData.stockConsumption}
                                onChange={(e) => setFormData({ ...formData, stockConsumption: e.target.value })}
                                className="w-full bg-white border border-gray-200 rounded-2xl px-5 py-3.5 text-sm"
                                placeholder="1.0"
                              />
                              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#f5bc6b] text-xs font-black">
                                {stockItems.find(s => s._id === formData.stockItemId)?.unit || 'units'}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-2 space-y-4 pt-6 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <div className={`w-12 h-6 rounded-full transition-colors relative ${formData.available ? 'bg-[#2d5a41]' : 'bg-gray-300'}`}>
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.available ? 'left-7' : 'left-1'}`}></div>
                        </div>
                        <input
                          type="checkbox"
                          className="hidden"
                          checked={formData.available}
                          onChange={(e) => setFormData({ ...formData, available: e.target.checked })}
                        />
                        <span className="font-bold text-gray-700 group-hover:text-black">{t("adminMenu.available")}</span>
                      </label>

                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={resetForm}
                          className="px-8 py-3.5 rounded-2xl font-bold text-gray-500 hover:bg-gray-50"
                        >
                          {t("adminMenu.cancel")}
                        </button>
                        <button
                          type="submit"
                          disabled={createLoading}
                          className="px-10 py-3.5 bg-[#2d5a41] text-white rounded-2xl font-bold custom-shadow hover:scale-105 transition-transform disabled:opacity-50"
                        >
                          {createLoading ? t("adminMenu.save") : (editingItem ? t("adminMenu.updateItem") : t("adminMenu.add"))}
                        </button>
                      </div>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        <CategoryManager
          show={showCategoryManager}
          onClose={() => setShowCategoryManager(false)}
          categories={categories}
          onAdd={handleAddCategory}
          onDelete={handleDeleteCategory}
          loading={categoryLoading}
          title={t("adminMenu.manageCategories")}
          value={newCategoryName}
          onChange={setNewCategoryName}
          t={t}
        />

        {/* Confirmation and Notification Cards */}
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
    </ProtectedRoute>
  )
}

function CategoryManager({ show, onClose, categories, onAdd, onDelete, loading, title, value, onChange, t }: any) {
  if (!show) return null

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[40px] p-8 max-w-md w-full custom-shadow">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold bubbly-text">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-red-500">✕</button>
        </div>

        <form onSubmit={onAdd} className="mb-6">
          <div className="flex gap-2">
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={t("adminMenu.newCatPlaceholder")}
              className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d5a41]"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-[#2d5a41] text-white px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-50"
            >
              {t("adminMenu.add")}
            </button>
          </div>
        </form>

        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
          {categories.map((cat: any) => (
            <div key={cat._id} className="flex justify-between items-center bg-gray-50 p-3 rounded-xl">
              <span className="font-medium text-gray-700">{cat.name}</span>
              <button
                onClick={() => onDelete(cat._id)}
                className="text-red-400 hover:text-red-600 p-1"
              >
                🗑️
              </button>
            </div>
          ))}
          {categories.length === 0 && <p className="text-center text-gray-400 py-4">{t("adminMenu.noCats")}</p>}
        </div>

        <button
          onClick={onClose}
          className="w-full mt-6 py-3 bg-gray-100 text-gray-600 font-bold rounded-2xl hover:bg-gray-200"
        >
          {t("adminMenu.close")}
        </button>
      </div>
    </div>
  )
}
