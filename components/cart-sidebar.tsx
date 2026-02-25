"use client"

import { useState, useEffect } from "react"
import { useLanguage } from "@/context/language-context"
import { useSettings } from "@/context/settings-context"
import { useAuth } from "@/context/auth-context"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

export interface CartItem {
  id: string
  menuId?: string
  name: string
  price: number
  quantity: number
  category: string
  reportUnit?: string
}

interface CartSidebarProps {
  items: CartItem[]
  onRemove: (id: string) => void
  onQuantityChange: (id: string, quantity: number) => void
  onCheckout: () => void
  onClose?: () => void
  isLoading?: boolean
  isEmbedded?: boolean
  tableNumber: string
  setTableNumber: (val: string) => void
  isMeatOnly?: boolean
  isButcherOrder?: boolean
  setIsButcherOrder?: (val: boolean) => void
  paperWidth: number
  setPaperWidth: (val: number) => void
  assignedBatchId?: string
}

export function CartSidebar({
  items,
  onRemove,
  onQuantityChange,
  onCheckout,
  onClose,
  isLoading = false,
  isEmbedded = false,
  tableNumber,
  setTableNumber,
  isMeatOnly = false,
  isButcherOrder = false,
  setIsButcherOrder,
  paperWidth,
  setPaperWidth,
  assignedBatchId,
}: CartSidebarProps) {
  const { t } = useLanguage()
  const { settings } = useSettings()
  const { token } = useAuth()
  const vatRate = parseFloat(settings.vat_rate || "0.15")
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const subtotal = total / (1 + vatRate)
  const tax = total - subtotal

  // Settings State for Tables
  const [tables, setTables] = useState<any[]>([])
  const [batches, setBatches] = useState<any[]>([])
  const [isTableModalOpen, setIsTableModalOpen] = useState(false)

  useEffect(() => {
    // Fetch tables and batches
    const fetchData = async () => {
      if (!token) return

      try {
        const headers = { Authorization: `Bearer ${token}` }
        const [tablesRes, batchesRes] = await Promise.all([
          fetch("/api/tables", { headers }),
          fetch("/api/batches", { headers })
        ])

        if (tablesRes.ok) setTables(await tablesRes.json())
        if (batchesRes.ok) setBatches(await batchesRes.json())
      } catch (err) { console.error("Failed to load data", err) }
    }
    fetchData()
  }, [token])

  const visibleBatches = assignedBatchId
    ? batches.filter(b => b._id === assignedBatchId)
    : batches

  // If a batch is assigned, don't show unassigned tables tab
  const showUnassigned = !assignedBatchId

  // Helper to get batch name for selected table
  const getSelectedBatchNumber = () => {
    if (!tableNumber) return ""
    const table = tables.find(t => t.tableNumber === tableNumber)
    if (!table) return ""

    // Check if batchId is populated object or string ID
    const tableBatchId = (table.batchId && typeof table.batchId === 'object') ? table.batchId._id : table.batchId
    const batch = batches.find(b => String(b._id) === String(tableBatchId))
    return batch ? `Batch #${batch.batchNumber}` : ""
  }

  // Debug logging
  useEffect(() => {
    console.log("CartSidebar Debug Info:")
    console.log("- Assigned Batch ID:", assignedBatchId)
    console.log("- Total Batches Fetched:", batches.length)
    console.log("- Total Tables Fetched:", tables.length)
    console.log("- Visible Batches:", visibleBatches)

    if (assignedBatchId) {
      const assignedBatchFound = batches.find(b => b._id === assignedBatchId)
      console.log("- Assigned Batch Object Found:", assignedBatchFound)
      if (!assignedBatchFound) {
        console.warn("⚠️ Assigned batch ID is set but not found in fetched batches list!")
      }
    }
  }, [assignedBatchId, batches, tables, visibleBatches])

  const containerClasses = isEmbedded
    ? "w-full flex flex-col h-full bg-transparent"
    : "w-full md:w-80 bg-card border-l border-border flex flex-col md:h-screen md:sticky md:right-0 md:top-0 shadow-lg"

  return (
    <div className={containerClasses}>
      {/* Header - Only show if not embedded (POS handles its own header) */}
      {!isEmbedded && (
        <div className="p-4 border-b border-border bg-primary/10 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-foreground">{t("cashier.orderCart")}</h2>
            <p className="text-sm text-muted-foreground">{items.length} {t("cashier.items")}</p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="md:hidden p-2 hover:bg-black/5 rounded-full transition-colors"
            >
              ✕
            </button>
          )}
        </div>
      )}

      {/* Order Metadata */}
      <div className={`${isEmbedded ? 'pb-4' : 'px-4 pb-4'} space-y-3`}>
        {/* Butcher Option Toggle */}
        {setIsButcherOrder && (
          <button
            onClick={() => {
              const newValue = !isButcherOrder;
              setIsButcherOrder(newValue);
              if (newValue) {
                setTableNumber("");
              }
            }}
            className={`w-full p-3 rounded-2xl flex items-center justify-between transition-all border-2 ${isButcherOrder
              ? "bg-[#8B4513]/10 border-[#8B4513] text-[#8B4513]"
              : "bg-gray-50 border-gray-100 text-gray-500 hover:border-gray-200"
              }`}
          >
            <div className="flex items-center gap-2">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center border ${isButcherOrder ? "bg-[#8B4513] border-[#8B4513]" : "border-gray-300"}`}>
                {isButcherOrder && <span className="text-white text-[10px]">✓</span>}
              </div>
              <span className="text-xs font-black uppercase tracking-widest">Butcher Selection</span>
            </div>
            {isButcherOrder && <span className="text-[10px] font-bold opacity-60">Buy & Go</span>}
          </button>
        )}

        {!isButcherOrder ? (
          <div className="animate-fade-in">
            <div className="w-full">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">
                Table # {isMeatOnly && <span className="text-emerald-500 lowercase">(Optional)</span>}
              </label>

              <Dialog open={isTableModalOpen} onOpenChange={setIsTableModalOpen}>
                <DialogTrigger asChild>
                  <button className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold flex justify-between items-center hover:border-[#2d5a41] hover:bg-[#2d5a41]/5 transition-all outline-none">
                    <div className="flex flex-col items-start">
                      <span>{tableNumber ? `Table ${tableNumber}` : "Select Table"}</span>
                      {tableNumber && getSelectedBatchNumber() && (
                        <span className="text-[10px] text-gray-500 font-medium">{getSelectedBatchNumber()}</span>
                      )}
                    </div>
                    <span className="text-xs text-gray-400">▼</span>
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
                  <DialogHeader>
                    <DialogTitle>Select Table</DialogTitle>
                  </DialogHeader>

                  <Tabs defaultValue={assignedBatchId || batches[0]?._id || "unassigned"} className="flex-1 flex flex-col overflow-hidden">
                    <div className="px-1 border-b mb-4">
                      <TabsList className="bg-transparent h-auto flex-wrap justify-start gap-2">
                        {visibleBatches.map(batch => (
                          <TabsTrigger
                            key={batch._id}
                            value={batch._id}
                            className="data-[state=active]:bg-[#2d5a41] data-[state=active]:text-white px-4 py-2 rounded-full border border-transparent data-[state=active]:border-[#2d5a41] bg-gray-100"
                          >
                            Batch #{batch.batchNumber}
                          </TabsTrigger>
                        ))}
                        {showUnassigned && (
                          <TabsTrigger
                            value="unassigned"
                            className="data-[state=active]:bg-gray-800 data-[state=active]:text-white px-4 py-2 rounded-full border border-transparent bg-gray-100"
                          >
                            Unassigned
                          </TabsTrigger>
                        )}
                      </TabsList>
                    </div>

                    <div className="flex-1 overflow-y-auto min-h-[300px] p-1">
                      {visibleBatches.map(batch => (
                        <TabsContent key={batch._id} value={batch._id} className="mt-0">
                          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                            {tables.filter(t => {
                              const tableBatchId = (t.batchId && typeof t.batchId === 'object') ? t.batchId._id : t.batchId;
                              return tableBatchId && String(tableBatchId) === String(batch._id);
                            }).map(table => (
                              <button
                                key={table._id}
                                onClick={() => {
                                  setTableNumber(table.tableNumber)
                                  setIsTableModalOpen(false)
                                }}
                                className={`p-4 rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition-all ${tableNumber === table.tableNumber
                                  ? "bg-[#2d5a41] border-[#2d5a41] text-white shadow-lg scale-105"
                                  : "bg-white border-gray-100 hover:border-[#2d5a41] hover:shadow-md text-gray-700"
                                  }`}
                              >
                                <span className="text-lg font-black">{table.tableNumber}</span>
                                {table.capacity && <span className={`text-[10px] font-bold ${tableNumber === table.tableNumber ? "text-white/80" : "text-gray-400"}`}>{table.capacity} Seats</span>}
                              </button>
                            ))}
                            {tables.filter(t => {
                              const tableBatchId = (t.batchId && typeof t.batchId === 'object') ? t.batchId._id : t.batchId;
                              return tableBatchId && String(tableBatchId) === String(batch._id);
                            }).length === 0 && (
                                <div className="col-span-full py-10 text-center text-gray-400 italic">No tables in this batch</div>
                              )}
                          </div>
                        </TabsContent>
                      ))}

                      {showUnassigned && (
                        <TabsContent value="unassigned" className="mt-0">
                          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                            {tables.filter(t => {
                              const tBatchId = (t.batchId && typeof t.batchId === 'object') ? t.batchId._id : t.batchId;
                              return !tBatchId || !batches.some(b => String(b._id) === String(tBatchId));
                            }).map(table => (
                              <button
                                key={table._id}
                                onClick={() => {
                                  setTableNumber(table.tableNumber)
                                  setIsTableModalOpen(false)
                                }}
                                className={`p-4 rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition-all ${tableNumber === table.tableNumber
                                  ? "bg-[#2d5a41] border-[#2d5a41] text-white shadow-lg scale-105"
                                  : "bg-white border-gray-100 hover:border-[#2d5a41] hover:shadow-md text-gray-700"
                                  }`}
                              >
                                <span className="text-lg font-black">{table.tableNumber}</span>
                                {table.capacity && <span className={`text-[10px] font-bold ${tableNumber === table.tableNumber ? "text-white/80" : "text-gray-400"}`}>{table.capacity} Seats</span>}
                              </button>
                            ))}
                            {tables.filter(t => {
                              const tBatchId = (t.batchId && typeof t.batchId === 'object') ? t.batchId._id : t.batchId;
                              return !tBatchId || !batches.some(b => String(b._id) === String(tBatchId));
                            }).length === 0 && (
                                <div className="col-span-full py-10 text-center text-gray-400 italic">No unassigned tables</div>
                              )}
                          </div>
                        </TabsContent>
                      )}
                    </div>
                  </Tabs>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        ) : (
          <div className="bg-emerald-50 border-2 border-dashed border-emerald-200 rounded-2xl p-4 text-center animate-pulse">
            <p className="text-emerald-700 text-xs font-black uppercase tracking-widest">
              🥩 Meat Buy & Go Order
            </p>
            <p className="text-emerald-600 text-[10px] font-bold mt-1">
              No waiter or table required for this mode.
            </p>
          </div>
        )}

        {/* Paper Size Selection */}
        <div className="flex items-center justify-between gap-4 bg-gray-50 p-3 rounded-2xl border border-gray-100">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
            Print Size
          </label>
          <div className="flex gap-1">
            {[80, 58].map((size) => (
              <button
                key={size}
                onClick={() => setPaperWidth(size)}
                className={`px-3 py-1 rounded-lg text-[10px] font-black transition-all ${paperWidth === size
                  ? "bg-[#2d5a41] text-white shadow-sm"
                  : "bg-white text-gray-400 border border-gray-100 hover:border-gray-200"
                  }`}
              >
                {size}mm
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Items */}
      <div className={`flex-1 overflow-y-auto ${isEmbedded ? 'py-2' : 'p-4'} space-y-3 custom-scrollbar`}>
        {items.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <div className="text-6xl mb-4 opacity-20">🛒</div>
            <p className="font-bold">{t("cashier.cartEmpty")}</p>
          </div>
        ) : (
          items.map((item, idx) => (
            <div
              key={item.id}
              className="bg-gray-50 rounded-[25px] p-4 flex gap-3 border border-gray-100 hover:border-[#2d5a41]/30 transition-all animate-slide-in-up"
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <div className="flex-1">
                <h3 className="font-bold text-sm text-gray-800">
                  {item.menuId ? `#${item.menuId} ` : ""}{item.name}
                </h3>
                <p className="text-xs text-gray-500 font-bold">{item.price} {t("common.currencyBr")}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onQuantityChange(item.id, Math.max(1, item.quantity - 1))}
                  className="w-8 h-8 bg-white shadow-sm border border-gray-200 rounded-full flex items-center justify-center text-sm hover:bg-gray-100 transition-all font-bold"
                >
                  −
                </button>
                <span className="w-6 text-center font-bold text-gray-800">{item.quantity}</span>
                <button
                  onClick={() => onQuantityChange(item.id, item.quantity + 1)}
                  className="w-8 h-8 bg-[#2d5a41] text-white shadow-md rounded-full flex items-center justify-center text-sm hover:bg-black transition-all font-bold"
                >
                  +
                </button>
                <button
                  onClick={() => onRemove(item.id)}
                  className="ml-2 w-8 h-8 text-red-400 hover:text-red-500 transition-colors flex items-center justify-center"
                >
                  ✕
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Summary */}
      <div className={`${isEmbedded ? 'mt-auto pt-6' : 'p-4 border-t border-border bg-primary/5'} space-y-3`}>
        <div className="space-y-2 bg-gray-50 p-4 rounded-[30px] border border-gray-100">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 font-medium">{t("cashier.subtotal")}</span>
            <span className="font-bold text-gray-800">{subtotal.toFixed(0)} {t("common.currencyBr")}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 font-medium">{t("cashier.tax")} ({(vatRate * 100).toFixed(0)}%)</span>
            <span className="font-bold text-gray-800">{tax.toFixed(0)} {t("common.currencyBr")}</span>
          </div>
          <div className="border-t border-gray-200 pt-2 flex justify-between items-center">
            <span className="font-bold text-gray-800">{t("cashier.total")}</span>
            <span className="text-2xl font-bold text-[#2d5a41]">{total.toFixed(0)} {t("common.currencyBr")}</span>
          </div>
        </div>

        <button
          onClick={onCheckout}
          disabled={items.length === 0 || isLoading}
          className="w-full bg-[#f5bc6b] text-[#1a1a1a] font-bold py-4 rounded-full hover:shadow-lg transition-all transform hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 custom-shadow bubbly-button mb-2"
        >
          {isLoading ? (
            <>
              <span className="animate-spin text-xl">⏳</span>
              {t("cashier.processing")}
            </>
          ) : (
            <>
              <span className="text-xl">🚀</span>
              {t("cashier.sendToKitchen")}
            </>
          )}
        </button>
      </div>
    </div>
  )
}
