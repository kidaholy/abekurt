"use client"

import { useState, useEffect } from "react"
import { ProtectedRoute } from "@/components/protected-route"
import { BentoNavbar } from "@/components/bento-navbar"
import { CartSidebar, CartItem } from "@/components/cart-sidebar"
import { MenuItemCard } from "@/components/menu-item-card"
import { OrderAnimation } from "@/components/order-animation"
import { useAuth } from "@/context/auth-context"
import { useLanguage } from "@/context/language-context"
import { ConfirmationCard, NotificationCard } from "@/components/confirmation-card"
import { useConfirmation } from "@/hooks/use-confirmation"
import { ShoppingCart, RefreshCw, X, Search, Hash } from 'lucide-react'
import { motion, AnimatePresence } from "framer-motion"
import { useMemo, useRef } from "react"
import { useSettings } from "@/context/settings-context"
import { getReceiptHTML } from "@/components/receipt-template"

interface MenuItem {
  _id: string
  menuId?: string
  name: string
  description?: string
  category: string
  price: number
  image?: string
  available?: boolean
  preparationTime?: number
  reportUnit?: string
  distributions?: string[]
}


export default function CashierPOSPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [menuLoading, setMenuLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [orderNumber, setOrderNumber] = useState("")
  const [showOrderAnimation, setShowOrderAnimation] = useState(false)
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false)
  const [tableNumber, setTableNumber] = useState("")
  const [isButcherOrder, setIsButcherOrder] = useState(false)
  const [isDrinksOrder, setIsDrinksOrder] = useState(false)
  const [showCart, setShowCart] = useState(false)
  const [paperWidth, setPaperWidth] = useState(80)
  const [searchTerm, setSearchTerm] = useState("")
  const [idSearchTerm, setIdSearchTerm] = useState("")
  const [selectedBatchId, setSelectedBatchId] = useState<string>("")
  const [variantModal, setVariantModal] = useState<{ item: MenuItem } | null>(null)
  const { token, user, logout } = useAuth()
  const { t } = useLanguage()
  const { settings } = useSettings()
  const { confirmationState, confirm, closeConfirmation, notificationState, notify, closeNotification } = useConfirmation()

  // Printing State
  const receiptRef = useRef<HTMLDivElement>(null)
  const [lastOrderData, setLastOrderData] = useState<any>(null)

  useEffect(() => {
    let mounted = true

    // 🚀 HYDRATION CACHE: Load from localStorage immediately
    const cachedMenu = localStorage.getItem("pos_menu_cache")
    if (cachedMenu) {
      try {
        const parsed = JSON.parse(cachedMenu)
        setMenuItems(parsed)
        setMenuLoading(false)
      } catch (err) {
        console.error("Failed to parse menu cache")
      }
    }

    const fetchMenuItems = async (retryCount = 0) => {
      if (!token) return

      try {
        if (retryCount === 0 && !localStorage.getItem("pos_menu_cache")) setMenuLoading(true)
        setError(null)

        const response = await fetch("/api/menu", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!mounted) return

        if (response.ok) {
          const data = await response.json()

          // Update Cache
          localStorage.setItem("pos_menu_cache", JSON.stringify(data))

          setMenuItems(data)
          setMenuLoading(false)
        } else {
          // If 5xx error or network error, retry
          if (response.status >= 500 && retryCount < 3) {
            console.log(`Menu fetch failed (Attempt ${retryCount + 1}). Retrying in 1s...`)
            setTimeout(() => fetchMenuItems(retryCount + 1), 1000 * (retryCount + 1))
          } else {
            setError("Failed to load menu items")
            setMenuLoading(false)
          }
        }
      } catch (err) {
        if (!mounted) return

        if (retryCount < 3) {
          console.log(`Menu fetch error (Attempt ${retryCount + 1}). Retrying...`)
          setTimeout(() => fetchMenuItems(retryCount + 1), 1000 * (retryCount + 1))
        } else {
          setError("Failed to load menu items. Please check your connection.")
          setMenuLoading(false)
        }
      }
    }

    fetchMenuItems()

    return () => { mounted = false }
  }, [token])

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'menuUpdated') {
        // Simple re-fetch without complex retry logic for updates
        const refreshMenu = async () => {
          if (!token) return
          try {
            const response = await fetch("/api/menu", { headers: { Authorization: `Bearer ${token}` } })
            if (response.ok) {
              const data = await response.json()
              setMenuItems(data)
            }
          } catch (err) { console.error("Failed to refresh menu") }
        }
        refreshMenu()
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [token])

  const isMeatOnly = useMemo(() => {
    return cartItems.length > 0 && cartItems.every(item =>
      item.category === "Butchery" ||
      item.category === "Meat" ||
      item.reportUnit === "kg"
    )
  }, [cartItems])

  const isDrinksOnly = useMemo(() => {
    return cartItems.length > 0 && cartItems.every(item =>
      item.category === "Drinks" ||
      item.category === "Beverages" ||
      item.category === "Coffee" ||
      item.category === "Juice"
    )
  }, [cartItems])

  useEffect(() => {
    // Refresh user profile to ensure we have the latest floor assignment
    const refreshUserProfile = async () => {
      if (!token) return
      try {
        const res = await fetch("/api/system-check", {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (res.ok) {
          const data = await res.json()
          if (data.user && JSON.stringify(data.user) !== JSON.stringify(user)) {
            // Update local storage and context if different
            // Note: We can't directly update context from here easily without exposing a setUser method,
            // but we can update localStorage which AuthProvider uses on mount/reload.
            // A full page reload might be needed or we rely on AuthProvider to re-check.
            // For now, let's just log it. In a real app, we'd want a refreshUser method in context.
            // Actually, let's force a reload if floorId changed significantly to ensure consistency
            if (data.user.batchId !== user?.batchId) {
              console.log("Batch assignment changed, reloading...")
              localStorage.setItem("user", JSON.stringify(data.user))
              window.location.reload()
            }
          }
        }
      } catch (err) { console.error("Failed to refresh user profile", err) }
    }

    refreshUserProfile()
  }, [token, user])

  const handleAddToCart = (item: MenuItem) => {
    // If item has distributions, show variant modal first
    if (item.distributions && item.distributions.length > 0) {
      setVariantModal({ item })
      return
    }

    const existingItem = cartItems.find((ci) => ci.id === item._id)
    if (existingItem) {
      setCartItems(cartItems.map((ci) => (ci.id === item._id ? { ...ci, quantity: ci.quantity + 1 } : ci)))
    } else {
      setCartItems([...cartItems, {
        id: item._id,
        menuId: item.menuId,
        name: item.name,
        price: item.price,
        quantity: 1,
        category: item.category,
        reportUnit: item.reportUnit
      }])
    }
  }

  const handleSelectVariant = (item: MenuItem, distribution: string) => {
    const cartItemId = `${item._id}_${distribution}`
    const cartItemName = `${item.name} - ${distribution}`

    const existingItem = cartItems.find((ci) => ci.id === cartItemId)
    if (existingItem) {
      setCartItems(cartItems.map((ci) => (ci.id === cartItemId ? { ...ci, quantity: ci.quantity + 1 } : ci)))
    } else {
      setCartItems([...cartItems, {
        id: cartItemId,
        menuId: item.menuId,
        name: cartItemName,
        price: item.price,
        quantity: 1,
        category: item.category,
        reportUnit: item.reportUnit,
        distribution
      }])
    }
    setVariantModal(null)
  }

  const handleRemoveFromCart = (id: string) => {
    setCartItems(cartItems.filter((item) => item.id !== id))
  }

  const handleClearCart = async () => {
    const confirmed = await confirm({
      title: "Clear Cart",
      message: "Are you sure you want to remove all items from your cart?",
      type: "warning"
    })

    if (confirmed) {
      setCartItems([])
      notify({
        title: "Cart Cleared",
        message: "All items have been removed from your cart.",
        type: "success"
      })
    }
  }

  const handleQuantityChange = (id: string, quantity: number) => {
    if (quantity === 0) {
      handleRemoveFromCart(id)
    } else {
      setCartItems(cartItems.map((item) => (item.id === id ? { ...item, quantity } : item)))
    }
  }

  const handleCheckout = async () => {
    if (cartItems.length === 0) return

    if (!isButcherOrder && !isMeatOnly && !isDrinksOrder && !isDrinksOnly && !tableNumber) {
      notify({
        title: "Table Required",
        message: "Please select a table number before checking out.",
        type: "error"
      })
      return
    }

    const vatRate = parseFloat(settings.vat_rate || "0.08")
    const totalAmount = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
    const subtotal = totalAmount / (1 + vatRate)
    const tax = totalAmount - subtotal

    // Determine table number based on order type
    const finalTableNumber = isButcherOrder ? "Buy&Go" : isDrinksOrder ? "Drinks" : tableNumber

    setIsCheckoutLoading(true)
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          items: cartItems.map((item) => ({
            menuItemId: item.id,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
          })),
          totalAmount,
          subtotal,
          tax,
          paymentMethod: "cash",
          status: "pending",
          tableNumber: finalTableNumber,
          batchId: selectedBatchId || user?.batchId
        }),
      })

      if (response.ok) {
        const data = await response.json()

        // Immediate Feedback: Start animation and clear cart state
        setOrderNumber(data.orderNumber)
        setShowOrderAnimation(true)
        setCartItems([]) // Clear cart immediately for next order
        setTableNumber("") // Clear table reset
        setIsButcherOrder(false) // Reset butcher order
        setIsDrinksOrder(false) // Reset drinks order
        setIsCheckoutLoading(false) // Stop loader early since animation is showing

        // Sync with other tabs
        localStorage.setItem('newOrderCreated', Date.now().toString())

        setTimeout(() => {
          // Check if printing is enabled in settings
          if (settings.enable_cashier_printing === "false") {
            setShowOrderAnimation(false)
            return
          }

          // Isolated Iframe Printing
          const receiptHtml = getReceiptHTML({
            orderNumber: data.orderNumber,
            tableNumber: finalTableNumber,
            items: cartItems.map(item => ({
              menuId: item.menuId,
              name: item.name,
              quantity: item.quantity,
              price: item.price
            })),
            subtotal,
            tax,
            total: totalAmount,
            paperWidth,
            appName: settings.app_name,
            appTagline: settings.app_tagline,
            vatRate: settings.vat_rate
          })

          const iframe = document.createElement('iframe')
          iframe.style.position = 'fixed'
          iframe.style.right = '0'
          iframe.style.bottom = '0'
          iframe.style.width = '0'
          iframe.style.height = '0'
          iframe.style.border = '0'
          document.body.appendChild(iframe)

          const doc = iframe.contentWindow?.document
          if (doc) {
            doc.open()
            doc.write(receiptHtml)
            doc.close()

            // Brief delay to ensure iframe is ready
            setTimeout(() => {
              iframe.contentWindow?.focus()
              iframe.contentWindow?.print()

              // Cleanup POS state after print dialog opens (Speed up: 300ms)
              setTimeout(() => {
                document.body.removeChild(iframe)
                setShowOrderAnimation(false)
              }, 300)
            }, 300)
          }
        }, 800) // Speed up: Delay print for only 800ms (synced with fast animation)
      } else {
        const errorData = await response.json()
        notify({
          title: "Order Failed",
          message: errorData.message || "Failed to create the order. Please try again.",
          type: "error"
        })
      }
    } catch (err) {
      notify({
        title: "Error",
        message: "Failed to create order. Please check your connection and try again.",
        type: "error"
      })
    } finally {
      setIsCheckoutLoading(false)
    }
  }

  const categories = ["all", ...new Set(menuItems.map((item) => item.category))]
  const filteredItems = (categoryFilter === "all" ? menuItems : menuItems.filter((item) => item.category === categoryFilter))
    .filter((item) => {
      const nameMatch = !searchTerm || item.name.toLowerCase().includes(searchTerm.toLowerCase())
      const idMatch = !idSearchTerm || (item.menuId && item.menuId.toLowerCase() === idSearchTerm.toLowerCase())
      return nameMatch && idMatch
    })
    .sort((a, b) => {
      const idA = a.menuId || ""
      const idB = b.menuId || ""
      return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' })
    })

  return (
    <ProtectedRoute requiredRoles={["cashier"]}>
      <div className="min-h-screen bg-gray-50 p-1 md:p-6 overflow-x-hidden">
        <div className="max-w-[1900px] mx-auto md:space-y-6 w-full overflow-hidden">
          <div className="mb-4 md:mb-0">
            <BentoNavbar />
          </div>

          {/* Desktop Header */}
          <div className="hidden md:block bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <ShoppingCart className="h-8 w-8 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 leading-tight">POS System</h1>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-sm text-gray-600">Welcome, {user?.name}</p>
                    <span className="text-gray-300">•</span>
                    <p className="text-sm text-gray-500 font-medium">
                      {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                    </p>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500 font-bold uppercase tracking-wider">Store Inventory</div>
                <div className="text-2xl font-black text-blue-600">{menuItems.length}</div>
              </div>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-4 items-start pb-20 md:pb-0 w-full overflow-hidden">
            <div className="flex-1 min-w-0 w-full flex flex-col md:gap-4 overflow-hidden">
              {/* Search Bar Group */}
              <div className="px-4 md:px-0 mb-4 md:mb-0 flex flex-col md:flex-row gap-3">
                {/* Name Search */}
                <div className="flex-[2] relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search by item name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full pl-11 pr-10 py-3.5 bg-white border-2 border-gray-100 rounded-2xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium shadow-sm"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  )}
                </div>

                {/* ID Search */}
                <div className="flex-1 relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Hash className="h-5 w-5 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                  </div>
                  <input
                    type="text"
                    placeholder="Item ID"
                    value={idSearchTerm}
                    onChange={(e) => setIdSearchTerm(e.target.value)}
                    className="block w-full pl-11 pr-10 py-3.5 bg-white border-2 border-gray-100 rounded-2xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-medium shadow-sm"
                  />
                  {idSearchTerm && (
                    <button
                      onClick={() => setIdSearchTerm("")}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Category Filter - Robust Horizontal Slider */}
              <div className="sticky top-0 md:static z-[40] bg-gray-50/95 backdrop-blur-md md:bg-transparent border-b md:border-none border-gray-200 w-full">
                <div
                  className="flex flex-nowrap overflow-x-scroll px-4 md:px-0 gap-3 py-4 scroll-smooth"
                  style={{
                    WebkitOverflowScrolling: 'touch',
                    touchAction: 'pan-x',
                    scrollbarWidth: 'thin',
                  }}
                >
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setCategoryFilter(cat)}
                      className={`px-5 py-2.5 rounded-full font-black text-[14px] md:text-sm whitespace-nowrap transition-all flex-shrink-0 active:scale-90 shadow-sm ${categoryFilter === cat
                        ? "bg-[#2d5a41] text-white shadow-[#2d5a41]/30 ring-2 ring-[#2d5a41]/20 scale-105"
                        : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
                        }`}
                    >
                      {cat === "all" ? "ALL ITEMS" : cat.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Menu Grid */}
              <div className="md:bg-white md:rounded-xl md:p-6 pt-2 md:shadow-sm md:border border-gray-200 min-h-[600px]">
                {menuLoading ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <RefreshCw className="h-12 w-12 animate-spin text-gray-400 mb-4" />
                    <p className="text-gray-600">Loading menu...</p>
                  </div>
                ) : error ? (
                  <div className="text-center py-20">
                    <div className="text-6xl mb-4">⚠️</div>
                    <h2 className="text-xl font-bold text-red-600 mb-2">Failed to Load Menu</h2>
                    <p className="text-gray-600 mb-6">{error}</p>
                    <button
                      onClick={() => window.location.reload()}
                      className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Retry
                    </button>
                  </div>
                ) : filteredItems.length === 0 ? (
                  <div className="text-center py-20">
                    <div className="text-6xl mb-4 opacity-30">🍽️</div>
                    <h2 className="text-xl font-medium text-gray-400">No items found</h2>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-0 md:gap-4 bg-white md:bg-transparent rounded-2xl md:rounded-none overflow-hidden shadow-sm md:shadow-none border border-gray-100 md:border-none w-full">
                    {filteredItems.map((item, idx) => (
                      <div key={item._id} className="transform transition-transform md:hover:scale-[1.02]">
                        <MenuItemCard
                          name={item.name}
                          price={item.price}
                          description={item.description}
                          image={item.image}
                          category={item.category}
                          preparationTime={item.preparationTime}
                          menuId={item.menuId}
                          onAddToCart={() => handleAddToCart(item)}
                          index={idx}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Desktop Side Cart - Large prominent sidebar */}
            </div>
            <div className="hidden lg:block w-[400px] sticky top-6 bg-white rounded-[32px] shadow-xl border border-gray-200 overflow-hidden h-[calc(100vh-120px)]">
              <CartSidebar
                items={cartItems}
                onRemove={handleRemoveFromCart}
                onQuantityChange={handleQuantityChange}
                onCheckout={handleCheckout}
                onClose={undefined}
                isLoading={isCheckoutLoading}
                isEmbedded={true}
                tableNumber={tableNumber}
                setTableNumber={setTableNumber}
                isMeatOnly={isMeatOnly}
                isDrinksOnly={isDrinksOnly}
                isButcherOrder={isButcherOrder}
                setIsButcherOrder={setIsButcherOrder}
                isDrinksOrder={isDrinksOrder}
                setIsDrinksOrder={setIsDrinksOrder}
                paperWidth={paperWidth}
                setPaperWidth={setPaperWidth}
                assignedBatchId={selectedBatchId || user?.batchId}
                setSelectedBatchId={setSelectedBatchId}
                onClear={handleClearCart}
              />
            </div>
          </div>

          {/* Universal Cart Drawer */}
          <AnimatePresence>
            {showCart && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowCart(false)}
                  className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
                />
                <motion.div
                  initial={{ x: "100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "100%" }}
                  transition={{ type: "spring", damping: 25, stiffness: 200 }}
                  className="fixed inset-y-0 right-0 w-full md:w-[450px] bg-white z-[101] shadow-2xl flex flex-col"
                >
                  <div className="flex-1 overflow-hidden">
                    <CartSidebar
                      items={cartItems}
                      onRemove={handleRemoveFromCart}
                      onQuantityChange={handleQuantityChange}
                      onCheckout={handleCheckout}
                      onClose={() => setShowCart(false)}
                      isLoading={isCheckoutLoading}
                      isEmbedded={true}
                      tableNumber={tableNumber}
                      setTableNumber={setTableNumber}
                      isMeatOnly={isMeatOnly}
                      isDrinksOnly={isDrinksOnly}
                      isButcherOrder={isButcherOrder}
                      setIsButcherOrder={setIsButcherOrder}
                      isDrinksOrder={isDrinksOrder}
                      setIsDrinksOrder={setIsDrinksOrder}
                      paperWidth={paperWidth}
                      setPaperWidth={setPaperWidth}
                      assignedBatchId={selectedBatchId || user?.batchId}
                      setSelectedBatchId={setSelectedBatchId}
                      onClear={handleClearCart}
                    />
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* Order Animation */}
          {showOrderAnimation && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl p-10 shadow-2xl max-w-md w-full">
                <OrderAnimation orderNumber={orderNumber} totalItems={cartItems.length} isVisible={showOrderAnimation} />
              </div>
            </div>
          )}

          {/* Variant Selection Modal */}
          {variantModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-white rounded-3xl p-8 shadow-2xl max-w-sm w-full">
                <h3 className="text-xl font-black text-gray-900 mb-2 text-center">{variantModal.item.name}</h3>
                <p className="text-sm text-gray-500 text-center mb-6">Select a distribution</p>
                <div className="space-y-3">
                  {variantModal.item.distributions?.map((dist) => (
                    <button
                      key={dist}
                      onClick={() => handleSelectVariant(variantModal.item, dist)}
                      className="w-full py-4 bg-blue-50 hover:bg-blue-100 border-2 border-blue-200 rounded-2xl font-bold text-blue-700 transition-all hover:scale-[1.02] active:scale-95"
                    >
                      {dist}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setVariantModal(null)}
                  className="w-full mt-4 py-3 text-gray-500 font-bold hover:text-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Floating Circular Cart Button - Hidden on Desktop when sidebar is visible */}
          <div className="fixed bottom-8 right-8 z-[80] lg:hidden">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowCart(true)}
              className="w-16 h-16 bg-[#2d5a41] text-white rounded-full shadow-2xl flex items-center justify-center relative group"
            >
              {/* Glossy overlay */}
              <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-full z-0" />

              <ShoppingCart size={28} className="group-hover:animate-bounce z-10" />

              {cartItems.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-white shadow-md animate-in zoom-in duration-300 z-20">
                  {cartItems.length}
                </span>
              )}
            </motion.button>
          </div>


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
      </div>
    </ProtectedRoute >
  )
}
