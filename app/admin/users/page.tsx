"use client"
import { useState, useEffect } from "react"
import { ProtectedRoute } from "@/components/protected-route"
import { BentoNavbar } from "@/components/bento-navbar"
import { AnimatedButton } from "@/components/animated-button"
import { useAuth } from "@/context/auth-context"
import { useLanguage } from "@/context/language-context"
import { ConfirmationCard, NotificationCard } from "@/components/confirmation-card"
import { useConfirmation } from "@/hooks/use-confirmation"

interface User {
  _id: string
  name: string
  email: string
  password: string
  plainPassword?: string
  role: "admin" | "chef" | "cashier" | "display" | "store_keeper"
  isActive: boolean
  batchId?: string
  assignedCategories?: string[]
}

interface Batch {
  _id: string
  batchNumber: string
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [formLoading, setFormLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "cashier" as "admin" | "chef" | "cashier" | "display" | "store_keeper",
    batchId: "",
    assignedCategories: [] as string[],
  })
  const [batches, setBatches] = useState<Batch[]>([])
  const [categories, setCategories] = useState<{ _id: string, name: string }[]>([])

  const { token, user: currentUser } = useAuth()
  const { t } = useLanguage()
  const { confirmationState, confirm, closeConfirmation, notificationState, notify, closeNotification } = useConfirmation()
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({})

  const togglePasswordVisibility = (userId: string) => {
    setRevealedPasswords(prev => ({ ...prev, [userId]: !prev[userId] }))
  }

  useEffect(() => {
    if (token) {
      fetchUsers()
      fetchBatches()
      fetchCategories()
    }
  }, [token])

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/categories?type=menu", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        setCategories(await response.json())
      }
    } catch (err) {
      console.error("Failed to fetch categories")
    }
  }

  const fetchBatches = async () => {
    try {
      const response = await fetch("/api/batches", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        setBatches(await response.json())
      }
    } catch (err) {
      console.error("Failed to fetch batches")
    }
  }

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/users", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        const data = await response.json()
        setUsers(data)
      }
    } catch (err) {
      console.error("Failed to fetch users")
    } finally {
      setLoading(false)
    }
  }

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormLoading(true)

    const url = editingUser ? `/api/users/${editingUser._id}` : "/api/users"
    const method = editingUser ? "PUT" : "POST"

    try {
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        const data = await response.json()
        if (!editingUser) {
          notify({
            title: "User Created Successfully!",
            message: `Email: ${data.credentials.email}\nPassword: ${data.credentials.password}`,
            type: "success"
          })
        } else {
          notify({
            title: "User Updated",
            message: "User information has been updated successfully.",
            type: "success"
          })
        }
        resetForm()
        fetchUsers()
      } else {
        const errorData = await response.json()
        notify({
          title: "Save Failed",
          message: errorData.message || "Failed to save user",
          type: "error"
        })
      }
    } catch (err) {
      console.error("Failed to save user")
    } finally {
      setFormLoading(false)
    }
  }

  const handleDelete = async (userToDelete: User) => {
    const confirmed = await confirm({
      title: "Delete User",
      message: `Are you sure you want to delete "${userToDelete.name}"?\n\nThis action cannot be undone.`,
      type: "danger",
      confirmText: "Delete User",
      cancelText: "Cancel"
    })

    if (!confirmed) return

    try {
      const response = await fetch(`/api/users/${userToDelete._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        fetchUsers()
      }
    } catch (err) {
      console.error("Failed to delete user")
    }
  }

  const handleToggleStatus = async (userToToggle: User) => {
    if (userToToggle._id === currentUser?.id) {
      notify({
        title: "Action Denied",
        message: "You cannot deactivate your own account.",
        type: "error"
      })
      return
    }

    try {
      const response = await fetch(`/api/users/${userToToggle._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: userToToggle.name,
          email: userToToggle.email,
          isActive: !userToToggle.isActive
        }),
      })

      if (response.ok) {
        notify({
          title: "Status Updated",
          message: `${userToToggle.name} is now ${!userToToggle.isActive ? 'Active' : 'Deactivated'}.`,
          type: "success"
        })
        fetchUsers()
      } else {
        const errorData = await response.json()
        notify({
          title: "Update Failed",
          message: errorData.message || "Failed to update status",
          type: "error"
        })
      }
    } catch (err) {
      console.error("Failed to toggle status")
    }
  }

  const generatePassword = () => {
    setFormData({ ...formData, password: Math.random().toString(36).slice(-8) })
  }

  const handleEdit = (userToEdit: User) => {
    setEditingUser(userToEdit)
    setFormData({
      name: userToEdit.name,
      email: userToEdit.email,
      password: "",
      role: userToEdit.role,
      batchId: userToEdit.batchId || "",
      assignedCategories: userToEdit.assignedCategories || [],
    })
    setShowForm(true)
  }

  const resetForm = () => {
    setEditingUser(null)
    setFormData({
      name: "",
      email: "",
      password: "",
      role: "cashier",
      batchId: "",
      assignedCategories: [],
    })
    setShowForm(false)
  }

  return (
    <ProtectedRoute requiredRoles={["admin"]}>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <BentoNavbar />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Control Sidebar */}
            <div className="lg:col-span-3 flex flex-col gap-4 lg:sticky lg:top-4">
              <div className="bg-[#8B4513] rounded-2xl p-6 md:p-8 shadow-xl shadow-[#8B4513]/20 text-white relative overflow-hidden">
                <div className="relative z-10">
                  <h1 className="text-2xl md:text-3xl font-black mb-2 tracking-tight">{t("adminUsers.title")} 👥</h1>
                  <p className="opacity-80 text-xs md:text-sm font-bold uppercase tracking-widest mb-6">{t("adminUsers.totalActiveStaff")}: {users.length}</p>
                  <button
                    onClick={() => { resetForm(); setShowForm(true); }}
                    className="w-full bg-white text-[#8B4513] px-6 py-4 rounded-xl font-black text-sm uppercase tracking-widest shadow-lg hover:bg-gray-50 transition-all flex items-center justify-center gap-2 transform active:scale-95"
                  >
                    ✨ {t("adminUsers.addNewMember")}
                  </button>
                </div>
                <div className="absolute -bottom-4 -right-4 text-8xl opacity-10 transform -rotate-12">👥</div>
              </div>

              <div className="hidden lg:block bg-[#D2691E] rounded-2xl p-6 shadow-sm relative overflow-hidden">
                <div className="relative z-10">
                  <h2 className="text-xl font-bold mb-2 text-white">{t("adminUsers.permissionsCard")}</h2>
                  <p className="text-white/80 font-medium text-sm">{t("adminUsers.permissionsDesc")}</p>
                </div>
                <div className="absolute -bottom-6 -right-6 text-9xl opacity-10 transform">🛡️</div>
              </div>
            </div>

            <div className="lg:col-span-9">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 min-h-[600px]">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-20 md:py-32">
                    <div className="text-5xl md:text-6xl animate-bounce mb-4">🧩</div>
                    <p className="text-gray-400 font-black uppercase tracking-widest text-xs">{t("adminUsers.assemblingTeam")}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
                    {users.map((u) => {
                      const isMe = u._id === currentUser?.id
                      const badge = u.role === "admin"
                        ? { color: "bg-[#8B4513] text-white", label: "Admin" }
                        : u.role === "chef"
                          ? { color: "bg-orange-600 text-white", label: "Chef" }
                          : u.role === "display"
                            ? { color: "bg-purple-600 text-white", label: "Display" } :
                            u.role === "store_keeper" ? { color: "bg-emerald-600 text-white", label: "Store Keeper" }
                              : { color: "bg-[#CD853F] text-white", label: "Cashier" }

                      return (
                        <div key={u._id} className={`bg-gray-50 rounded-2xl p-5 border transition-all flex flex-col relative group ${!u.isActive ? 'opacity-60 grayscale border-dashed border-gray-300' : 'border-gray-100 hover:border-[#8B4513]/30 hover:shadow-xl'}`}>
                          {isMe && <div className="absolute top-4 right-4 text-[9px] font-black text-[#8B4513] bg-white border border-[#8B4513]/20 px-3 py-1 rounded-full uppercase tracking-widest z-10 shadow-sm">You</div>}
                          {!isMe && (
                            <div className={`absolute top-4 right-4 text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest z-10 shadow-sm ${u.isActive ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}>
                              {u.isActive ? 'Active' : 'Deactivated'}
                            </div>
                          )}
                          <div className="w-14 h-14 md:w-16 md:h-16 bg-white rounded-2xl flex items-center justify-center text-2xl md:text-3xl mb-4 shadow-sm group-hover:scale-110 transition-transform">
                            {u.role === "admin" ? "🎩" : u.role === "chef" ? "🍳" : u.role === "display" ? "📺" : u.role === "store_keeper" ? "📦" : "☕"}
                          </div>
                          {u.role === "chef" && u.assignedCategories && u.assignedCategories.length > 0 && (
                            <div className="mb-3 flex flex-wrap gap-1.5 pt-1">
                              {u.assignedCategories.map(cat => (
                                <span key={cat} className="text-[10px] font-black uppercase tracking-tight text-orange-600 bg-orange-50 px-2.5 py-1 rounded-lg border border-orange-200 shadow-sm flex items-center gap-1">
                                  <span className="text-xs">🍳</span> {cat}
                                </span>
                              ))}
                            </div>
                          )}
                          {(u.role === "cashier" || u.role === "display") && u.batchId && (
                            <div className="mb-2">
                              <span className="text-[10px] font-black uppercase tracking-widest text-[#8B4513] bg-[#8B4513]/5 px-2 py-1 rounded">
                                📍 {batches.find(b => b._id === u.batchId)?.batchNumber ? `Batch #${batches.find(b => b._id === u.batchId)?.batchNumber}` : "Assigned Batch"}
                              </span>
                            </div>
                          )}
                          <h3 className={`font-black text-lg text-slate-800 mb-0.5 ${!u.isActive ? 'line-through' : ''}`}>{u.name}</h3>
                          <p className="text-xs text-gray-400 mb-2 font-bold truncate tracking-tight">{u.email}</p>

                          <div className="mb-4 flex items-center gap-2">
                            <div className="bg-white border border-gray-100 rounded-xl px-3 py-2 flex items-center justify-between flex-1 min-h-[40px]">
                              <span className={`text-[10px] font-mono font-bold ${revealedPasswords[u._id] ? 'text-blue-600' : 'text-gray-300'}`}>
                                {revealedPasswords[u._id] ? (u.plainPassword || "********") : "••••••••"}
                                {!u.plainPassword && revealedPasswords[u._id] && <span className="text-[9px] text-gray-400 ml-1">(Reset to View)</span>}
                              </span>
                              <button
                                onClick={() => togglePasswordVisibility(u._id)}
                                className="text-gray-400 hover:text-[#8B4513] transition-colors p-1"
                              >
                                {revealedPasswords[u._id] ? "👁️" : "🙈"}
                              </button>
                            </div>
                          </div>

                          <div className="flex justify-between items-center mt-auto bg-white/60 backdrop-blur-sm rounded-2xl p-3 border border-white">
                            <span className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${badge.color}`}>
                              {badge.label}
                            </span>
                            <div className="flex gap-2">
                              {!isMe && (
                                <button
                                  onClick={() => handleToggleStatus(u)}
                                  title={u.isActive ? "Deactivate User" : "Activate User"}
                                  className={`w-8 h-8 md:w-9 md:h-9 bg-white rounded-xl flex items-center justify-center shadow-sm hover:scale-110 active:scale-95 transition-all text-sm ${u.isActive ? 'text-gray-400 hover:text-emerald-500' : 'text-emerald-500 hover:text-gray-400'}`}
                                >
                                  {u.isActive ? "👁️" : "👁️‍🗨️"}
                                </button>
                              )}
                              <button onClick={() => handleEdit(u)} className="w-8 h-8 md:w-9 md:h-9 bg-white rounded-xl flex items-center justify-center shadow-sm hover:scale-110 active:scale-95 transition-all text-sm">✏️</button>
                              {!isMe && (
                                <button onClick={() => handleDelete(u)} className="w-8 h-8 md:w-9 md:h-9 bg-white rounded-xl flex items-center justify-center shadow-sm hover:bg-red-50 hover:text-red-500 hover:scale-110 active:scale-95 transition-all text-sm">🗑️</button>
                              )}
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

        {/* Create/Edit Modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
            <div className="bg-white rounded-[2.5rem] md:rounded-[3.5rem] shadow-2xl max-w-md w-full relative overflow-hidden flex flex-col max-h-[90vh]">
              <button
                onClick={resetForm}
                className="absolute top-6 right-6 w-10 h-10 bg-gray-50 rounded-2xl flex items-center justify-center font-bold text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all z-10"
              >✕</button>

              <div className="flex-1 overflow-y-auto p-6 md:p-10 pt-16 md:pt-20 scrollbar-hide">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  {editingUser ? t("adminUsers.editProfile") : t("adminUsers.newMember")}
                </h2>
                <form onSubmit={handleCreateOrUpdate} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-600 ml-2">{t("adminUsers.displayName")}</label>
                    <input
                      required
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-gray-50 border-none rounded-2xl p-4 outline-none focus:ring-4 focus:ring-[#8B4513]/10 font-medium"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-600 ml-2">{t("adminUsers.emailAddress")}</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      className="w-full bg-gray-50 border-none rounded-2xl p-4 outline-none focus:ring-4 focus:ring-[#8B4513]/10 font-medium"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-600 ml-2">{t("adminUsers.accessLevel")}</label>
                    <div className="flex flex-wrap gap-2">
                      {["cashier", "chef", "admin", "display", "store_keeper"].map(r => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setFormData({ ...formData, role: r as any })}
                          className={`flex-1 min-w-[120px] py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all ${formData.role === r ? "bg-[#8B4513] text-white shadow-lg" : "bg-gray-50 text-gray-400 hover:bg-gray-100"}`}
                        >
                          {r === "display" ? "Display" : t(`adminUsers.${r}`)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {(formData.role === "cashier" || formData.role === "display") && (
                    <div className="space-y-2 animate-fade-in">
                      <label className="text-sm font-bold text-gray-600 ml-2">Assigned Batch</label>
                      <select
                        value={formData.batchId}
                        onChange={e => setFormData({ ...formData, batchId: e.target.value })}
                        className="w-full bg-gray-50 border-none rounded-2xl p-4 outline-none focus:ring-4 focus:ring-[#8B4513]/10 font-medium appearance-none"
                      >
                        <option value="">All Batches (Global)</option>
                        {batches.map(batch => (
                          <option key={batch._id} value={batch._id}>Batch #{batch.batchNumber}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="space-y-2 relative">
                    <label className="text-sm font-bold text-gray-600 ml-2">
                      {t("adminUsers.password")} <span className="text-gray-400 text-xs">{editingUser ? t("adminUsers.optional") : ""}</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        required={!editingUser}
                        value={formData.password}
                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                        className="flex-1 bg-gray-50 border-none rounded-2xl p-4 outline-none focus:ring-4 focus:ring-[#8B4513]/10 font-mono text-sm"
                      />
                      <button
                        type="button"
                        onClick={generatePassword}
                        className="bg-gray-200 text-gray-600 px-4 rounded-2xl font-bold text-[10px] uppercase hover:bg-gray-300 transition-colors"
                      >
                        {t("adminUsers.generate")}
                      </button>
                    </div>
                  </div>

                  {formData.role === "chef" && (
                    <div className="space-y-3 animate-fade-in bg-orange-50/50 p-6 rounded-[2.5rem] border border-orange-100/50">
                      <div className="flex justify-between items-center px-1">
                        <label className="text-xs font-black uppercase tracking-widest text-[#8B4513]">Kitchen Assignments</label>
                        <span className="text-[10px] font-bold text-orange-600 bg-white px-2 py-0.5 rounded-full shadow-sm border border-orange-100">
                          {(Array.isArray(formData.assignedCategories) ? formData.assignedCategories.length : 0)} Selected
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 max-h-[180px] overflow-y-auto p-1 pr-2 custom-scrollbar">
                        {categories.map(category => {
                          const catName = category.name.trim().normalize("NFC")
                          const isSelected = Array.isArray(formData.assignedCategories) &&
                            formData.assignedCategories.some(c => c.trim().normalize("NFC") === catName)

                          return (
                            <button
                              key={category._id}
                              type="button"
                              onClick={() => {
                                const currentCats = Array.isArray(formData.assignedCategories) ? [...formData.assignedCategories] : []
                                const alreadySelected = currentCats.some(c => c.trim().normalize("NFC") === catName)

                                const newCats = alreadySelected
                                  ? currentCats.filter(c => c.trim().normalize("NFC") !== catName)
                                  : [...currentCats, category.name.trim().normalize("NFC")]

                                setFormData({ ...formData, assignedCategories: newCats })
                              }}
                              className={`text-left p-3 rounded-2xl text-[10px] font-black uppercase transition-all flex items-center gap-3 border-2 ${isSelected
                                ? "bg-[#8B4513] text-white border-[#8B4513] shadow-lg shadow-orange-900/20"
                                : "bg-white text-gray-400 border-gray-50 hover:border-orange-200 hover:text-orange-600 shadow-sm"
                                }`}
                            >
                              <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${isSelected ? "bg-white/20" : "bg-gray-50"}`}>
                                {isSelected ? "✓" : "🍳"}
                              </div>
                              <span className="truncate">{category.name}</span>
                            </button>
                          )
                        })}
                      </div>

                      {Array.isArray(formData.assignedCategories) && formData.assignedCategories.length > 0 && (
                        <div className="pt-2 flex flex-wrap gap-1">
                          {formData.assignedCategories.map(cat => (
                            <span key={cat} className="text-[8px] font-black bg-[#8B4513]/10 text-[#8B4513] px-2 py-0.5 rounded-full uppercase">
                              {cat}
                            </span>
                          ))}
                        </div>
                      )}

                      {categories.length === 0 && <p className="text-center text-gray-400 py-4 text-[10px] font-bold uppercase tracking-widest bg-white rounded-2xl border border-dashed border-gray-200">No categories found</p>}
                    </div>
                  )}

                  <div className="flex gap-3 pt-4">
                    {editingUser && (
                      <button
                        type="button"
                        onClick={resetForm}
                        className="flex-1 py-4 text-gray-400 font-bold hover:bg-gray-50 rounded-2xl transition-colors"
                      >
                        {t("common.cancel")}
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={formLoading}
                      className="flex-[2] bg-[#8B4513] text-white py-4 rounded-2xl font-bold shadow-xl shadow-[#8B4513]/20 hover:scale-[1.02] transition-transform active:scale-95 disabled:opacity-50"
                    >
                      {formLoading ? t("common.loading") : (editingUser ? t("adminUsers.updateProfile") : t("adminUsers.createAccount"))}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

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
