"use client"

import { useState, useEffect } from "react"
import { ProtectedRoute } from "@/components/protected-route"
import { BentoNavbar } from "@/components/bento-navbar"
import { useAuth } from "@/context/auth-context"
import { useLanguage } from "@/context/language-context"
import { useSettings } from "@/context/settings-context"
import { Logo } from "@/components/logo"
import { compressImage, validateImageFile, formatFileSize, getBase64Size } from "@/lib/utils/image-utils"
import { Save, Upload, Link as LinkIcon, Info, CheckCircle2 } from "lucide-react"
import { ConfirmationCard, NotificationCard } from "@/components/confirmation-card"
import { useConfirmation } from "@/hooks/use-confirmation"

interface AdminSettings {
  logo_url: string
  app_name: string
  app_tagline: string
  vat_rate: string
  enable_cashier_printing: string
}

export default function AdminSettingsPage() {
  const { token } = useAuth()
  const { t } = useLanguage()
  const { settings, refreshSettings } = useSettings()
  const { confirmationState, confirm, closeConfirmation, notificationState, notify, closeNotification } = useConfirmation()
  const [formData, setFormData] = useState<AdminSettings>({
    logo_url: "",
    app_name: "Prime Addis",
    app_tagline: "Coffee Management",
    vat_rate: "0.08",
    enable_cashier_printing: "true"
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadMethod, setUploadMethod] = useState<"url" | "file">("url")

  // Table & Batch Management State
  const [activeTab, setActiveTab] = useState("branding")
  const [batches, setBatches] = useState<any[]>([])
  const [tables, setTables] = useState<any[]>([])

  // Edit States
  const [editingBatch, setEditingBatch] = useState<any>(null)
  const [newBatch, setNewBatch] = useState({ batchNumber: "", order: 0 })

  const [editingTable, setEditingTable] = useState<any>(null)
  const [newTable, setNewTable] = useState({ tableNumber: "", capacity: "" })

  // Category Management State
  const [categories, setCategories] = useState<any[]>([])
  const [editingCategory, setEditingCategory] = useState<any>(null)
  const [newCategory, setNewCategory] = useState({ name: "", type: "menu" as "menu" | "stock", description: "" })
  const [categoryType, setCategoryType] = useState<"menu" | "stock">("menu")

  useEffect(() => {
    if (settings) {
      setFormData({
        logo_url: settings.logo_url || "",
        app_name: settings.app_name || "Prime Addis",
        app_tagline: settings.app_tagline || "Coffee Management",
        vat_rate: settings.vat_rate || "0.08",
        enable_cashier_printing: settings.enable_cashier_printing || "true"
      })
    }
  }, [settings])

  useEffect(() => {
    if (activeTab === "tables") {
      fetchBatches()
      fetchTables()
    } else if (activeTab === "categories") {
      fetchCategories()
    }
  }, [activeTab, categoryType])

  const fetchBatches = async () => {
    try {
      const res = await fetch("/api/admin/batches", { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) setBatches(await res.json())
    } catch (err) { console.error("Failed to fetch batches", err) }
  }

  const fetchTables = async () => {
    try {
      const res = await fetch("/api/admin/tables", { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) setTables(await res.json())
    } catch (err) { console.error("Failed to fetch tables", err) }
  }

  const fetchCategories = async () => {
    try {
      const res = await fetch(`/api/categories?type=${categoryType}`, { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) setCategories(await res.json())
    } catch (err) { console.error("Failed to fetch categories", err) }
  }

  // --- Batch Handlers ---
  const handleAddBatch = async () => {
    try {
      const url = "/api/admin/batches"
      const method = editingBatch ? "PUT" : "POST"
      const body = editingBatch ? { ...newBatch, id: editingBatch._id } : newBatch

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body)
      })
      if (res.ok) {
        setNewBatch({ batchNumber: "", order: 0 })
        setEditingBatch(null)
        fetchBatches()
        notify({ title: "Success", message: `Batch ${editingBatch ? 'updated' : 'added'} successfully`, type: "success" })
      } else {
        const err = await res.json()
        notify({ title: "Error", message: err.message, type: "error" })
      }
    } catch (err) { notify({ title: "Error", message: "Failed to save batch", type: "error" }) }
  }

  const handleDeleteBatch = async (id: string) => {
    if (!await confirm({ title: "Delete Batch", message: "Are you sure? Associated tables will become unassigned.", type: "warning", confirmText: "Delete", cancelText: "Cancel" })) return
    try {
      const res = await fetch(`/api/admin/batches?id=${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) {
        fetchBatches()
        fetchTables() // Refresh tables as their batch association might have changed (if backend handled it)
        notify({ title: "Success", message: "Batch deleted", type: "success" })
      }
    } catch (err) { notify({ title: "Error", message: "Failed to delete batch", type: "error" }) }
  }

  // --- Table Handlers ---
  const handleAddTable = async () => {
    try {
      const url = "/api/admin/tables"
      const method = editingTable ? "PUT" : "POST"
      const body = editingTable ? { ...newTable, id: editingTable._id } : newTable

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body)
      })
      if (res.ok) {
        setNewTable({ tableNumber: "", capacity: "" })
        setEditingTable(null)
        fetchTables()
        notify({ title: "Success", message: `Table ${editingTable ? 'updated' : 'added'} successfully`, type: "success" })
      } else {
        const err = await res.json()
        notify({ title: "Error", message: err.message, type: "error" })
      }
    } catch (err) { notify({ title: "Error", message: "Failed to save table", type: "error" }) }
  }

  const handleEditTable = (table: any) => {
    setEditingTable(table)
    setNewTable({
      tableNumber: table.tableNumber,
      capacity: table.capacity || ""
    })
  }

  const handleCancelEditTable = () => {
    setEditingTable(null)
    setNewTable({ tableNumber: "", capacity: "" })
  }

  const handleDeleteTable = async (id: string) => {
    if (!await confirm({ title: "Delete Table", message: "Are you sure? This cannot be undone.", type: "warning", confirmText: "Delete", cancelText: "Cancel" })) return
    try {
      const res = await fetch(`/api/admin/tables?id=${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) {
        fetchTables()
        notify({ title: "Success", message: "Table deleted", type: "success" })
      }
    } catch (err) { notify({ title: "Error", message: "Failed to delete table", type: "error" }) }
  }

  // --- Category Handlers ---
  const handleSaveCategory = async () => {
    if (!newCategory.name) return
    try {
      const url = editingCategory ? `/api/categories/${editingCategory._id}` : "/api/categories"
      const method = editingCategory ? "PUT" : "POST"
      const body = editingCategory ? { name: newCategory.name } : { ...newCategory, type: categoryType }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body)
      })

      if (res.ok) {
        setNewCategory({ name: "", type: "menu", description: "" })
        setEditingCategory(null)
        fetchCategories()
        notify({ title: "Success", message: `Category ${editingCategory ? 'updated' : 'added'} successfully`, type: "success" })
      } else {
        const err = await res.json()
        notify({ title: "Error", message: err.message || "Failed to save category", type: "error" })
      }
    } catch (err) { notify({ title: "Error", message: "Failed to save category", type: "error" }) }
  }

  const handleDeleteCategory = async (id: string) => {
    if (!await confirm({ title: "Delete Category", message: "Are you sure? This may affect items using this category.", type: "warning", confirmText: "Delete", cancelText: "Cancel" })) return
    try {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) {
        fetchCategories()
        notify({ title: "Success", message: "Category deleted", type: "success" })
      }
    } catch (err) { notify({ title: "Error", message: "Failed to delete category", type: "error" }) }
  }




  const handleSaveSetting = async (key: string, value: string, type: string = "string", description?: string) => {
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ key, value, type, description }),
      })

      if (response.ok) {
        console.log(`✅ ${key} updated successfully`)
      } else {
        const error = await response.json()
        throw new Error(error.message || `Failed to update ${key}`)
      }
    } catch (error) {
      console.error(`Failed to update ${key}:`, error)
      throw error
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      // Save all settings one by one to better track failures
      const settingsToSave = [
        { key: "logo_url", value: formData.logo_url, type: "url", desc: t("adminSettings.applicationLogoUrl") },
        { key: "app_name", value: formData.app_name, type: "string", desc: t("adminSettings.applicationName") },
        { key: "app_tagline", value: formData.app_tagline, type: "string", desc: t("adminSettings.applicationTagline") },
        { key: "vat_rate", value: formData.vat_rate, type: "number", desc: "Value Added Tax (VAT) rate" },
        { key: "enable_cashier_printing", value: formData.enable_cashier_printing, type: "boolean", desc: "Auto-print setting" }
      ]

      for (const s of settingsToSave) {
        await handleSaveSetting(s.key, s.value, s.type, s.desc)
      }

      // Refresh settings in context
      await refreshSettings()
      notify({
        title: "Settings Saved",
        message: "Your application settings have been updated successfully.",
        type: "success"
      })
    } catch (error: any) {
      console.error("Failed to save settings:", error)
      notify({
        title: "Save Failed",
        message: error.message || "Failed to save settings. Please try again.",
        type: "error"
      })
    } finally {
      setSaving(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file
    const validation = validateImageFile(file)
    if (!validation.valid) {
      notify({
        title: "Invalid Image",
        message: validation.error || "Please select a valid image file",
        type: "error"
      })
      return
    }

    setUploading(true)
    try {
      // Compress and process image
      const compressedImage = await compressImage(file, {
        maxWidth: 400,
        maxHeight: 400,
        quality: 0.8,
        format: 'jpeg'
      })

      // Check final size
      const finalSize = getBase64Size(compressedImage)
      if (finalSize > 500 * 1024) { // 500KB limit for base64
        notify({
          title: "Image Too Large",
          message: "The compressed image is still too large. Please try a smaller image.",
          type: "error"
        })
        setUploading(false)
        return
      }

      setFormData(prev => ({ ...prev, logo_url: compressedImage }))
    } catch (error) {
      console.error('Failed to process image:', error)
      notify({
        title: "Image Processing Failed",
        message: "Failed to process the selected image. Please try again.",
        type: "error"
      })
    } finally {
      setUploading(false)
    }
  }

  const handleRemoveLogo = async () => {
    const confirmed = await confirm({
      title: "Remove Logo",
      message: "Are you sure you want to remove the current logo?\n\nThis will reset it to the default image.",
      type: "warning",
      confirmText: "Remove Logo",
      cancelText: "Cancel"
    })

    if (confirmed) {
      setFormData(prev => ({ ...prev, logo_url: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=200&h=200&fit=crop&crop=center' }))
    }
  }

  return (
    <ProtectedRoute requiredRoles={["admin"]}>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <BentoNavbar />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Sidebar - Preview */}
            <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-4 order-2 lg:order-1">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <h2 className="text-lg font-bold text-gray-900 mb-4">{t("adminSettings.logoPreview")}</h2>

                <div className="space-y-6">
                  <div className="text-center">
                    <h3 className="text-sm font-bold text-gray-500 mb-3">{t("adminSettings.currentLogo")}</h3>
                    <div className="flex justify-center">
                      <Logo size="lg" showText={true} overrideUrl={formData.logo_url} />
                    </div>
                  </div>

                  <div className="border-t pt-6">
                    <h3 className="text-sm font-bold text-gray-500 mb-3">{t("adminSettings.previewInNavigation")}</h3>
                    <div className="bg-gray-50 rounded-2xl p-4">
                      <div className="flex items-center justify-between">
                        <Logo size="md" showText={true} overrideUrl={formData.logo_url} />
                        <div className="text-xs text-gray-400">{t("adminSettings.navigationBar")}</div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-6 text-center">
                    <h3 className="text-sm font-bold text-gray-500 mb-4 uppercase tracking-widest">{t("adminSettings.browserTabPreview")}</h3>
                    <div className="bg-gray-100 rounded-xl p-3 flex items-center gap-3 border border-gray-200">
                      <div className="w-6 h-6 rounded bg-white p-0.5 shadow-sm overflow-hidden">
                        {formData.logo_url ? (
                          <img src={formData.logo_url} className="w-full h-full object-contain" alt={t("adminSettings.favicon")} />
                        ) : (
                          <div className="w-full h-full bg-[#f4a261] flex items-center justify-center text-[10px] text-white font-black">
                            {formData.app_name?.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 text-left">
                        <div className="text-[10px] font-bold text-slate-700 truncate w-32">
                          {formData.app_name} - {t("adminSettings.managementSystem")}
                        </div>
                        <div className="text-[8px] text-gray-400 -mt-1">prime-addis.vercel.app</div>
                      </div>
                      <div className="text-gray-300">✕</div>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-2 italic">{t("adminSettings.livePreviewBrowserTab")}</p>
                  </div>
                </div>
              </div>

              <div className="bg-[#D2691E] rounded-xl p-6 shadow-sm overflow-hidden relative">
                <div className="relative z-10">
                  <h3 className="text-xl font-bold text-[#1a1a1a] mb-4 flex items-center gap-2">
                    <Info className="w-5 h-5" />
                    {t("adminSettings.logoTips.title")}
                  </h3>
                  <ul className="space-y-3">
                    {[
                      t("adminSettings.logoTips.tip1"),
                      t("adminSettings.logoTips.tip2"),
                      t("adminSettings.logoTips.tip3"),
                      t("adminSettings.logoTips.tip4"),
                      t("adminSettings.logoTips.tip5"),
                      t("adminSettings.logoTips.tip6")
                    ].map((tip, i) => (
                      <li key={i} className="flex items-start gap-3 group">
                        <CheckCircle2 className="w-4 h-4 text-[#2d5a41] mt-0.5 flex-shrink-0" />
                        <p className="text-sm font-medium text-[#1a1a1a]/70 group-hover:text-[#1a1a1a] transition-colors">
                          {tip}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="absolute -bottom-6 -right-6 text-8xl opacity-20 transform group-hover:rotate-12 transition-transform duration-500">🎨</div>
              </div>
            </div>

            <div className="lg:col-span-8 order-1 lg:order-2">
              <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-gray-200">

                <div className="flex gap-4 mb-8 border-b border-gray-100 pb-2 overflow-x-auto scrollbar-hide">
                  <button
                    onClick={() => setActiveTab("branding")}
                    className={`pb-2 text-xs md:text-sm font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === "branding" ? "text-[#8B4513] border-b-2 border-[#8B4513]" : "text-gray-400 hover:text-gray-600"}`}
                  >
                    Branding
                  </button>
                  <button
                    onClick={() => setActiveTab("categories")}
                    className={`pb-2 text-xs md:text-sm font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === "categories" ? "text-[#8B4513] border-b-2 border-[#8B4513]" : "text-gray-400 hover:text-gray-600"}`}
                  >
                    Categories
                  </button>
                  <button
                    onClick={() => setActiveTab("tables")}
                    className={`pb-2 text-xs md:text-sm font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === "tables" ? "text-[#8B4513] border-b-2 border-[#8B4513]" : "text-gray-400 hover:text-gray-600"}`}
                  >
                    Tables
                  </button>
                </div>

                {activeTab === "branding" && (
                  <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="space-y-4">
                      <label className="block text-sm font-bold text-gray-700">
                        {t("adminSettings.logoUpload")}
                      </label>

                      {/* Upload Method Toggle */}
                      <div className="flex gap-2 mb-4 bg-gray-50 p-1 rounded-2xl w-fit">
                        <button
                          type="button"
                          onClick={() => setUploadMethod("url")}
                          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${uploadMethod === "url"
                            ? "bg-white text-[#8B4513] shadow-sm"
                            : "text-gray-400 hover:text-gray-600"
                            }`}
                        >
                          🔗 {t("adminSettings.url")}
                        </button>
                        <button
                          type="button"
                          onClick={() => setUploadMethod("file")}
                          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${uploadMethod === "file"
                            ? "bg-white text-[#8B4513] shadow-sm"
                            : "text-gray-400 hover:text-gray-600"
                            }`}
                        >
                          📁 {t("adminSettings.uploadFile")}
                        </button>
                      </div>

                      {uploadMethod === "url" ? (
                        /* URL Input */
                        <div className="space-y-3">
                          <input
                            type="url"
                            value={formData.logo_url.startsWith('data:') ? '' : formData.logo_url}
                            onChange={(e) => setFormData(prev => ({ ...prev, logo_url: e.target.value }))}
                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:ring-4 focus:ring-[#8B4513]/10 focus:border-[#8B4513]/20 transition-all font-medium"
                            placeholder={t("adminSettings.logoUrlPlaceholder")}
                          />
                          <p className="text-xs text-[#8B4513] font-bold flex items-center gap-2 ml-2">
                            <Info className="w-3 h-3" />
                            {t("adminSettings.urlFaviconHint")}
                          </p>
                        </div>
                      ) : (
                        /* File Upload */
                        <div className="space-y-3">
                          <div className="relative group">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleFileUpload}
                              disabled={uploading}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                            <div className="bg-gray-50 border-2 border-dashed border-gray-100 rounded-2xl px-6 py-10 transition-all group-hover:bg-gray-100/50 group-hover:border-[#8B4513]/20 flex flex-col items-center gap-3">
                              <div className="p-3 bg-white rounded-full custom-shadow">
                                <Upload className="w-6 h-6 text-[#8B4513]" />
                              </div>
                              <p className="text-sm font-bold text-slate-800">{t("adminSettings.uploadFile")}</p>
                              {uploading && (
                                <span className="animate-spin text-lg">⏳</span>
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-[#8B4513] font-bold flex items-center gap-2 ml-2">
                            <Info className="w-3 h-3" />
                            {t("adminSettings.fileFaviconHint")}
                          </p>
                        </div>
                      )}

                      {/* Current Logo Display */}
                      {formData.logo_url && (
                        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                          <div className="w-16 h-16 relative overflow-hidden rounded-xl border border-gray-200 bg-white p-1">
                            <img
                              src={formData.logo_url}
                              alt={t("adminSettings.currentLogoAlt")}
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-bold text-slate-800">
                              {formData.logo_url.startsWith('data:') ? t("adminSettings.uploadedImage") : t("adminSettings.urlImage")}
                            </p>
                            <p className="text-xs text-gray-400 font-medium truncate max-w-[200px]">
                              {formData.logo_url.startsWith('data:')
                                ? t("adminSettings.compressed")
                                : formData.logo_url}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={handleRemoveLogo}
                            className="bg-red-50 text-red-500 hover:bg-red-100 p-2.5 rounded-xl transition-colors"
                            title={t("adminSettings.removeLogo")}
                          >
                            🗑️
                          </button>
                        </div>
                      )}
                    </div>

                    {/* App Name */}
                    <div className="space-y-3">
                      <label className="block text-sm font-bold text-gray-700">
                        {t("adminSettings.appName")}
                      </label>
                      <input
                        type="text"
                        value={formData.app_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, app_name: e.target.value }))}
                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:ring-4 focus:ring-[#8B4513]/10 focus:border-[#8B4513]/20 transition-all font-bold"
                        placeholder={t("adminSettings.appNamePlaceholder")}
                        required
                      />
                      <p className="text-xs text-[#8B4513] font-bold flex items-center gap-2 ml-2">
                        <Info className="w-3 h-3" />
                        {t("adminSettings.appNameHint")}
                      </p>
                    </div>

                    {/* App Tagline */}
                    <div className="space-y-3">
                      <label className="block text-sm font-bold text-gray-700">
                        {t("adminSettings.appTagline")}
                      </label>
                      <input
                        type="text"
                        value={formData.app_tagline}
                        onChange={(e) => setFormData(prev => ({ ...prev, app_tagline: e.target.value }))}
                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:ring-4 focus:ring-[#8B4513]/10 focus:border-[#8B4513]/20 transition-all font-medium text-slate-600"
                        placeholder={t("adminSettings.appTaglinePlaceholder")}
                        required
                      />
                      <p className="text-xs text-gray-400 font-medium ml-2">
                        {t("adminSettings.appTaglineHint")}
                      </p>
                    </div>

                    {/* VAT Rate */}
                    <div className="space-y-3">
                      <label className="block text-sm font-bold text-gray-700">
                        {t("adminSettings.vatRate")}
                      </label>
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="1"
                            value={formData.vat_rate}
                            onChange={(e) => setFormData(prev => ({ ...prev, vat_rate: e.target.value }))}
                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:ring-4 focus:ring-[#8B4513]/10 focus:border-[#8B4513]/20 transition-all font-bold"
                            placeholder={t("adminSettings.vatRatePlaceholder")}
                            required
                          />
                        </div>
                        <div className="bg-[#8B4513]/5 px-6 py-4 rounded-2xl border border-[#8B4513]/10">
                          <span className="text-[#8B4513] font-black">
                            {(parseFloat(formData.vat_rate) * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-[#8B4513] font-bold flex items-center gap-2 ml-2">
                        <Info className="w-3 h-3" />
                        {t("adminSettings.vatRateHint")}
                      </p>
                    </div>

                    {/* Cashier Printing Toggle */}
                    <div className="space-y-4 p-8 bg-gray-50 rounded-[2.5rem] border-2 border-[#8B4513]/5 shadow-inner">
                      <div className="flex items-center justify-between gap-6">
                        <div className="flex-1 space-y-2">
                          <label className="text-base font-black text-gray-800 uppercase tracking-tight flex items-center gap-2">
                            🖨️ Cashier Printing
                            {formData.enable_cashier_printing === "true" ? (
                              <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full border border-green-200 animate-pulse">ENABLED</span>
                            ) : (
                              <span className="text-[10px] bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full border border-gray-300">DISABLED</span>
                            )}
                          </label>
                          <p className="text-xs text-gray-500 font-bold leading-relaxed">
                            {formData.enable_cashier_printing === "true"
                              ? "The system WILL automatically open the print dialog after every checkout."
                              : "the system will SKIP the print dialog. Orders will be saved but not printed automatically."}
                          </p>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setFormData({
                              ...formData,
                              enable_cashier_printing: formData.enable_cashier_printing === "true" ? "false" : "true"
                            })}
                            className={`relative inline-flex h-8 w-16 items-center rounded-full transition-all duration-300 shadow-lg focus:outline-none ${formData.enable_cashier_printing === "true" ? "bg-green-600 ring-4 ring-green-100" : "bg-gray-300 ring-4 ring-gray-100"
                              }`}
                          >
                            <span
                              className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-xl transition-transform duration-300 ${formData.enable_cashier_printing === "true" ? "translate-x-9" : "translate-x-1"
                                }`}
                            />
                          </button>
                          <span className={`text-[10px] font-black uppercase tracking-widest ${formData.enable_cashier_printing === "true" ? "text-green-600" : "text-gray-400"}`}>
                            {formData.enable_cashier_printing === "true" ? "Printing ON" : "Printing OFF"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Save Button */}
                    <div className="flex justify-end pt-6 border-t border-gray-100">
                      <button
                        type="submit"
                        disabled={saving}
                        className="bg-[#8B4513] text-white px-10 py-4 rounded-2xl font-bold transition-all shadow-xl hover:shadow-[#8B4513]/20 transform hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:transform-none flex items-center gap-3"
                      >
                        {saving ? (
                          <>
                            <span className="animate-spin text-lg">⏳</span>
                            {t("adminSettings.saving")}
                          </>
                        ) : (
                          <>
                            <Save className="w-5 h-5" />
                            {t("adminSettings.saveSettings")}
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}

                {activeTab === "tables" && (
                  <div className="space-y-8">
                    {/* Batch Management Section */}
                    <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                      <h3 className="font-black text-xs uppercase tracking-widest text-[#8B4513] mb-4">
                        Manage Batches
                      </h3>
                      <div className="flex gap-3 mb-4">
                        <input
                          type="text"
                          placeholder="Batch Number (e.g. #1)"
                          value={newBatch.batchNumber}
                          onChange={(e) => setNewBatch({ ...newBatch, batchNumber: e.target.value })}
                          className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-[#8B4513]/5"
                        />
                        <input
                          type="number"
                          placeholder="Order"
                          value={newBatch.order}
                          onChange={(e) => setNewBatch({ ...newBatch, order: parseInt(e.target.value) || 0 })}
                          className="w-24 bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-[#8B4513]/5"
                        />
                        <button
                          onClick={handleAddBatch}
                          disabled={!newBatch.batchNumber}
                          className="bg-[#8B4513] text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest disabled:opacity-50 hover:bg-[#A0522D] transition-all shadow-lg shadow-[#8B4513]/20"
                        >
                          {editingBatch ? "Update" : "Add"}
                        </button>
                        {editingBatch && (
                          <button
                            onClick={() => { setEditingBatch(null); setNewBatch({ batchNumber: "", order: 0 }) }}
                            className="bg-gray-200 text-gray-600 px-4 py-3 rounded-xl font-bold"
                          >
                            Cancel
                          </button>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {batches.map(batch => {
                          return (
                            <div key={batch._id} className="bg-white border border-gray-200 rounded-xl px-3 py-2 flex items-center gap-2 shadow-sm hover:shadow-md transition-all">
                              <span className="font-bold text-sm text-gray-700">Batch #{batch.batchNumber}</span>
                              <div className="flex items-center gap-1 ml-1 border-l pl-2 border-gray-100">
                                <button onClick={() => { setEditingBatch(batch); setNewBatch({ batchNumber: batch.batchNumber, order: batch.order }) }} className="text-gray-400 hover:text-[#8B4513] transition-colors">✏️</button>
                                <button onClick={() => handleDeleteBatch(batch._id)} className="text-gray-400 hover:text-red-500 transition-colors">🗑️</button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Table Management Section */}
                    <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-black text-xs uppercase tracking-widest text-[#8B4513]">
                          {editingTable ? "Update Table" : "Add New Table"}
                        </h3>
                        {editingTable && (
                          <button
                            onClick={handleCancelEditTable}
                            className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-600 bg-white px-3 py-1.5 rounded-lg border border-gray-200"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-1">
                          <input
                            type="text"
                            placeholder="Number (e.g. T-01)"
                            value={newTable.tableNumber}
                            onChange={(e) => setNewTable({ ...newTable, tableNumber: e.target.value })}
                            className={`w-full bg-white border rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-[#8B4513]/5 ${editingTable ? 'border-[#8B4513]' : 'border-gray-200'}`}
                          />
                        </div>
                        <div className="w-24">
                          <input
                            type="text"
                            placeholder="Seats"
                            value={newTable.capacity}
                            onChange={(e) => setNewTable({ ...newTable, capacity: e.target.value })}
                            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-[#8B4513]/5"
                          />
                        </div>
                        <button
                          onClick={handleAddTable}
                          disabled={!newTable.tableNumber}
                          className="bg-[#8B4513] text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest disabled:opacity-50 hover:bg-[#A0522D] transition-all shadow-lg shadow-[#8B4513]/20"
                        >
                          {editingTable ? "Update" : "Add"}
                        </button>
                      </div>
                    </div>

                    {/* Global Tables List */}
                    <div className="bg-white border border-gray-200 rounded-[2rem] overflow-hidden shadow-sm hover:border-emerald-200 transition-all">
                      <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                        <h4 className="font-black text-xs uppercase tracking-widest text-gray-500">Universal Tables</h4>
                        <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                          {tables.length} Total Tables
                        </span>
                      </div>
                      <div className="p-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {tables.map(table => (
                            <div key={table._id} className="p-4 bg-white border border-gray-100 rounded-2xl flex justify-between items-center group hover:border-[#8B4513] hover:shadow-md transition-all">
                              <div>
                                <div className="font-black text-lg text-gray-800">{table.tableNumber}</div>
                                {table.capacity && <div className="text-xs text-gray-400 font-bold">{table.capacity} Seats</div>}
                              </div>
                              <div className="flex gap-1">
                                <button onClick={() => handleEditTable(table)} className="text-gray-300 hover:text-[#8B4513] transition-colors p-2 rounded-lg hover:bg-[#8B4513]/5">✏️</button>
                                <button onClick={() => handleDeleteTable(table._id)} className="text-gray-300 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-50">🗑️</button>
                              </div>
                            </div>
                          ))}
                          {tables.length === 0 && (
                            <div className="col-span-full text-center py-20 text-gray-300 text-sm italic border-2 border-dashed border-gray-100 rounded-[2rem]">
                              No tables registered yet. Add your first table above!
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "categories" && (
                  <div className="space-y-8">
                    <div className="flex gap-2 mb-6 bg-gray-50 p-1 rounded-2xl w-fit">
                      <button
                        onClick={() => setCategoryType("menu")}
                        className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${categoryType === "menu"
                          ? "bg-white text-[#8B4513] shadow-sm"
                          : "text-gray-400 hover:text-gray-600"
                          }`}
                      >
                        Menu Categories
                      </button>
                      <button
                        onClick={() => setCategoryType("stock")}
                        className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${categoryType === "stock"
                          ? "bg-white text-[#8B4513] shadow-sm"
                          : "text-gray-400 hover:text-gray-600"
                          }`}
                      >
                        Stock Categories
                      </button>
                    </div>

                    <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                      <h3 className="font-black text-xs uppercase tracking-widest text-[#8B4513] mb-4">
                        {editingCategory ? "Update Category" : `Add New ${categoryType === 'menu' ? 'Menu' : 'Stock'} Category`}
                      </h3>
                      <div className="flex gap-3">
                        <input
                          type="text"
                          placeholder="Category Name"
                          value={newCategory.name}
                          onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                          className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-[#8B4513]/5"
                        />
                        <button
                          onClick={handleSaveCategory}
                          disabled={!newCategory.name}
                          className="bg-[#8B4513] text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest disabled:opacity-50 hover:bg-[#A0522D] transition-all shadow-lg shadow-[#8B4513]/20"
                        >
                          {editingCategory ? "Update" : "Add"}
                        </button>
                        {editingCategory && (
                          <button
                            onClick={() => { setEditingCategory(null); setNewCategory({ name: "", type: "menu", description: "" }) }}
                            className="bg-gray-200 text-gray-600 px-4 py-3 rounded-xl font-bold"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {categories.map(cat => (
                        <div key={cat._id} className="p-4 bg-white border border-gray-100 rounded-2xl flex justify-between items-center group hover:border-[#8B4513] hover:shadow-md transition-all">
                          <div>
                            <div className="font-black text-lg text-gray-800">{cat.name}</div>
                            <div className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{cat.type === 'menu' ? 'Menu' : 'Stock'}</div>
                          </div>
                          <div className="flex gap-1">
                            <button onClick={() => { setEditingCategory(cat); setNewCategory({ ...newCategory, name: cat.name }) }} className="text-gray-300 hover:text-[#8B4513] transition-colors p-2 rounded-lg hover:bg-[#8B4513]/5">✏️</button>
                            <button onClick={() => handleDeleteCategory(cat._id)} className="text-gray-300 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-50">🗑️</button>
                          </div>
                        </div>
                      ))}
                      {categories.length === 0 && (
                        <div className="col-span-full text-center py-20 text-gray-300 text-sm italic border-2 border-dashed border-gray-100 rounded-[2rem]">
                          No {categoryType} categories found. Add your first one above!
                        </div>
                      )}
                    </div>
                  </div>
                )}


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
      </div>
    </ProtectedRoute>
  )
}