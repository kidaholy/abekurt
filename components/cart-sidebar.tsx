"use client"

import { useState, useEffect } from "react"
import { useLanguage } from "@/context/language-context"
import { useSettings } from "@/context/settings-context"
import { useAuth } from "@/context/auth-context"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { X } from "lucide-react"

export interface CartItem {
  id: string
  menuId?: string
  name: string
  price: number
  quantity: number
  category: string
  reportUnit?: string
  distribution?: string  // selected variant label
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
  isDrinksOnly?: boolean
  isButcherOrder?: boolean
  setIsButcherOrder?: (val: boolean) => void
  isDrinksOrder?: boolean
  setIsDrinksOrder?: (val: boolean) => void
  paperWidth: number
  setPaperWidth: (val: number) => void
  assignedBatchId?: string
  setSelectedBatchId?: (val: string) => void
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
  isDrinksOnly = false,
  isButcherOrder = false,
  setIsButcherOrder,
  isDrinksOrder = false,
  setIsDrinksOrder,
  paperWidth,
  setPaperWidth,
  assignedBatchId,
  setSelectedBatchId,
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
  const [activeBatchTab, setActiveBatchTab] = useState<string>("")
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

        if (tablesRes.ok) {
          const tData = await tablesRes.json()
          console.log(`📡 Loaded ${tData.length} tables`)
          setTables(tData)
        }
        if (batchesRes.ok) {
          const data = await batchesRes.json()
          console.log(`📡 Loaded ${data.length} batches`)
          setBatches(data)
          // If we have an assignedBatchId, use it as initial tab, otherwise used the first batch
          if (assignedBatchId) {
            setActiveBatchTab(assignedBatchId)
          } else if (data.length > 0) {
            setActiveBatchTab(data[0]._id)
          }
        }
      } catch (err) { console.error("Failed to load data", err) }
    }
    fetchData()
  }, [token, assignedBatchId])


  // Helper to get batch name for selected context
  const getSelectedBatchDisplay = () => {
    const bId = assignedBatchId || activeBatchTab;
    if (!bId) return "";
    const batch = batches.find(b => String(b._id) === String(bId))
    return batch ? `Batch #${batch.batchNumber}` : ""
  }

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
        {/* Compact Toggles for Butcher/Drinks */}
        {(setIsButcherOrder || setIsDrinksOrder) && (
          <div className="flex gap-2">
            {setIsButcherOrder && (
              <button
                onClick={() => {
                  const newValue = !isButcherOrder;
                  setIsButcherOrder(newValue);
                  if (newValue) {
                    setTableNumber("");
                    if (setIsDrinksOrder) setIsDrinksOrder(false);
                  }
                }}
                className={`flex-1 p-2 rounded-xl flex flex-col items-center justify-center transition-all border-1.5 ${isButcherOrder
                  ? "bg-[#8B4513]/10 border-[#8B4513] text-[#8B4513]"
                  : "bg-gray-50 border-gray-100 text-gray-500 hover:border-gray-200"
                  }`}
              >
                <span className="text-[10px] font-black uppercase tracking-tight">🥩 Butcher</span>
                {isButcherOrder && <span className="text-[8px] font-bold opacity-60">Buy&Go</span>}
              </button>
            )}
            {setIsDrinksOrder && (
              <button
                onClick={() => {
                  const newValue = !isDrinksOrder;
                  setIsDrinksOrder(newValue);
                  if (newValue) {
                    setTableNumber("");
                    if (setIsButcherOrder) setIsButcherOrder(false);
                  }
                }}
                className={`flex-1 p-2 rounded-xl flex flex-col items-center justify-center transition-all border-1.5 ${isDrinksOrder
                  ? "bg-amber-50 border-amber-400 text-amber-700"
                  : "bg-gray-50 border-gray-100 text-gray-500 hover:border-gray-200"
                  }`}
              >
                <span className="text-[10px] font-black uppercase tracking-tight">🥤 Drinks</span>
                {isDrinksOrder && <span className="text-[8px] font-bold opacity-60">To Go</span>}
              </button>
            )}
          </div>
        )}

        {!isButcherOrder && !isDrinksOrder ? (
          <div className="animate-fade-in">
            <div className="flex items-center gap-2">
              <Dialog open={isTableModalOpen} onOpenChange={setIsTableModalOpen}>
                <DialogTrigger asChild>
                  <button className="flex-1 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-xs font-bold flex justify-between items-center hover:border-[#2d5a41] hover:bg-[#2d5a41]/5 transition-all outline-none">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">🪑</span>
                      <span>{tableNumber ? `Table ${tableNumber}` : "Table #"}</span>
                    </div>
                    <span className="text-[10px] text-gray-400">▼</span>
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col p-4">
                  <DialogHeader className="mb-2">
                    <DialogTitle className="text-lg">Select Table</DialogTitle>
                  </DialogHeader>
                  <Tabs value={activeBatchTab} onValueChange={setActiveBatchTab} className="flex-1 flex flex-col overflow-hidden">
                    <TabsList className="bg-transparent h-auto flex flex-wrap justify-start gap-1 p-0 mb-3">
                      {batches.map(batch => (
                        <TabsTrigger key={batch._id} value={batch._id} className="data-[state=active]:bg-[#2d5a41] data-[state=active]:text-white px-3 py-1.5 rounded-full text-[10px] font-bold border border-gray-100 bg-gray-50">
                          Batch #{batch.batchNumber}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    <div className="flex-1 overflow-y-auto pr-1">
                      {batches.map(batch => (
                        <TabsContent key={batch._id} value={batch._id} className="mt-0">
                          <div className="grid grid-cols-4 gap-2">
                            {tables.map(table => (
                              <button
                                key={table._id}
                                onClick={() => {
                                  setTableNumber(table.tableNumber)
                                  if (setSelectedBatchId) setSelectedBatchId(batch._id)
                                  setIsTableModalOpen(false)
                                }}
                                className={`p-3 rounded-lg border flex flex-col items-center justify-center transition-all ${tableNumber === table.tableNumber && assignedBatchId === batch._id
                                  ? "bg-[#2d5a41] border-[#2d5a41] text-white shadow-md scale-105"
                                  : "bg-white border-gray-50 hover:border-[#2d5a41] text-gray-700"
                                  }`}
                              >
                                <span className="text-sm font-black">{table.tableNumber}</span>
                              </button>
                            ))}
                          </div>
                        </TabsContent>
                      ))}
                    </div>
                  </Tabs>
                </DialogContent>
              </Dialog>

              <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-xl border border-gray-100">
                {[80, 58].map((size) => (
                  <button
                    key={size}
                    onClick={() => setPaperWidth(size)}
                    className={`px-2 py-1.5 rounded-lg text-[9px] font-black transition-all ${paperWidth === size
                      ? "bg-[#2d5a41] text-white"
                      : "bg-white text-gray-400 border border-gray-50"
                      }`}
                  >
                    {size}mm
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : isButcherOrder ? (
          <div className="bg-emerald-50 border-2 border-dashed border-emerald-200 rounded-2xl p-4 text-center">
            <p className="text-emerald-700 text-xs font-black uppercase tracking-widest">
              🥩 Meat Buy & Go Order
            </p>
            <p className="text-emerald-600 text-[10px] font-bold mt-1">
              No waiter or table required for this mode.
            </p>
          </div>
        ) : isDrinksOrder ? (
          <div className="bg-amber-50 border-2 border-dashed border-amber-300 rounded-2xl p-4 text-center">
            <p className="text-amber-700 text-xs font-black uppercase tracking-widest">
              🥤 Drinks To Go
            </p>
            <p className="text-amber-600 text-[10px] font-bold mt-1">
              No table required for drinks order.
            </p>
          </div>
        ) : null}


      </div>

      {/* Items - Mobile Optimized Table View */}
      <div className={`flex-1 overflow-y-auto ${isEmbedded ? 'py-2' : 'p-4'} custom-scrollbar`}>
        {items.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <div className="text-6xl mb-4 opacity-20">🛒</div>
            <p className="font-bold">{t("cashier.cartEmpty")}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Headers for table-like view (only visible on mobile or small viewports) */}
            <div className="px-4 py-2 flex text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 mb-2">
              <span className="flex-1">Item</span>
              <span className="w-20 text-center">Qty</span>
              <span className="w-16 text-right">Price</span>
            </div>

            {items.map((item, idx) => (
              <div
                key={item.id}
                className="bg-white hover:bg-gray-50 rounded-xl p-3 flex items-center gap-3 border border-gray-100 hover:border-[#2d5a41]/30 transition-all animate-slide-in-up"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm text-gray-900 leading-tight">
                    {item.menuId ? `#${item.menuId} ` : ""}{item.name}
                  </h3>
                  {item.distribution && (
                    <p className="text-[9px] text-blue-600 font-bold uppercase tracking-wide mt-0.5">{item.distribution}</p>
                  )}
                  <p className="text-[10px] text-gray-400 font-bold mt-0.5">{item.price} {t("common.currencyBr")}</p>
                </div>

                <div className="flex items-center bg-gray-50 rounded-full p-1 gap-1 border border-gray-100">
                  <button
                    onClick={() => onQuantityChange(item.id, Math.max(1, item.quantity - 1))}
                    className="w-7 h-7 bg-white shadow-sm rounded-full flex items-center justify-center text-xs hover:bg-gray-100 transition-all font-bold text-gray-600 border border-gray-100"
                  >
                    −
                  </button>
                  <span className="w-5 text-center font-bold text-xs text-gray-800">{item.quantity}</span>
                  <button
                    onClick={() => onQuantityChange(item.id, item.quantity + 1)}
                    className="w-7 h-7 bg-[#2d5a41] text-white shadow-md rounded-full flex items-center justify-center text-xs hover:bg-black transition-all font-bold"
                  >
                    +
                  </button>
                </div>

                <div className="flex items-center justify-end gap-2 pr-1 ml-auto">
                  <span className="text-sm font-black text-[#2d5a41]">{(item.price * item.quantity).toFixed(0)}</span>
                  <button
                    onClick={() => onRemove(item.id)}
                    className="p-2 ml-1 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all flex items-center justify-center shrink-0"
                  >
                    <X size={16} strokeWidth={3} />
                  </button>
                </div>
              </div>
            ))}
          </div>
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
