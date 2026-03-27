"use client"

import { useState, useEffect } from "react"
import { useLanguage } from "@/context/language-context"
import { useSettings } from "@/context/settings-context"
import { useAuth } from "@/context/auth-context"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { X, Trash2, ShoppingCart } from "lucide-react"

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
  onClear?: () => void
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
  onClear,
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
    : "w-full md:w-[400px] bg-card border-l border-border flex flex-col md:h-screen md:sticky md:right-0 md:top-0 shadow-lg"

  return (
    <div className={containerClasses}>
      {/* Unified Header */}
      <div className={`p-4 border-b border-border bg-gray-50/50 flex justify-between items-center ${isEmbedded ? 'rounded-t-[32px]' : ''}`}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#2d5a41]/10 flex items-center justify-center text-[#2d5a41]">
            <ShoppingCart size={18} />
          </div>
          <div>
            <h2 className="text-lg font-black text-gray-800 tracking-tight">{t("cashier.orderCart")}</h2>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{items.length} {t("cashier.items")}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {items.length > 0 && onClear && (
            <button
              onClick={onClear}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
              title="Clear Cart"
            >
              <Trash2 size={18} />
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="md:hidden p-2 hover:bg-black/5 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Unified Compact Metadata */}
      <div className={`${isEmbedded ? 'pb-3' : 'px-4 pb-3'} space-y-2 mt-3`}>
        {/* Toggle Row */}
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
                className={`flex-1 p-2 rounded-xl flex items-center justify-center gap-2 transition-all border-1.5 ${isButcherOrder
                  ? "bg-[#8B4513]/10 border-[#8B4513] text-[#8B4513] shadow-sm"
                  : "bg-gray-50 border-gray-100 text-gray-500 hover:border-gray-200"
                  }`}
              >
                <span className="text-[11px] font-black uppercase tracking-tight">🥩 Butcher</span>
                {isButcherOrder && <span className="w-1.5 h-1.5 rounded-full bg-[#8B4513] animate-pulse"></span>}
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
                className={`flex-1 p-2 rounded-xl flex items-center justify-center gap-2 transition-all border-1.5 ${isDrinksOrder
                  ? "bg-amber-50 border-amber-400 text-amber-700 shadow-sm"
                  : "bg-gray-50 border-gray-100 text-gray-500 hover:border-gray-200"
                  }`}
              >
                <span className="text-[11px] font-black uppercase tracking-tight">🥤 Drinks</span>
                {isDrinksOrder && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>}
              </button>
            )}
          </div>
        )}

        {!isButcherOrder && !isDrinksOrder && !isDrinksOnly && (
          <div className="flex items-center gap-2">
            <Dialog open={isTableModalOpen} onOpenChange={setIsTableModalOpen}>
              <DialogTrigger asChild>
                <button className="flex-1 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-xs font-bold flex justify-between items-center hover:border-[#2d5a41] hover:bg-[#2d5a41]/5 transition-all outline-none">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">🪑</span>
                    <span className={tableNumber ? "text-gray-900" : "text-gray-400"}>
                      {tableNumber ? `Table ${tableNumber}` : "Table #"}
                    </span>
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
                  className={`px-3 py-1.5 rounded-lg text-[9px] font-black transition-all ${paperWidth === size
                    ? "bg-[#2d5a41] text-white shadow-md scale-105"
                    : "bg-white text-gray-400 border border-gray-50"
                    }`}
                >
                  {size}mm
                </button>
              ))}
            </div>
          </div>
        )}

        {isButcherOrder && (
          <div className="bg-[#8B4513]/5 border-1.5 border-dashed border-[#8B4513]/20 rounded-xl py-2 px-3 text-center">
            <p className="text-[#8B4513] text-[10px] font-black uppercase tracking-widest">Meat Buy & Go Mode</p>
          </div>
        )}

        {isDrinksOrder && (
          <div className="bg-amber-50 border-1.5 border-dashed border-amber-200 rounded-xl py-2 px-3 text-center">
            <p className="text-amber-700 text-[10px] font-black uppercase tracking-widest">Drinks To Go Mode</p>
          </div>
        )}

        {isDrinksOnly && !isDrinksOrder && (
          <div className="bg-amber-50 border-1.5 border-dashed border-amber-200 rounded-xl py-2 px-3 text-center">
            <p className="text-amber-700 text-[10px] font-black uppercase tracking-widest">🥤 Drinks — Served Immediately</p>
          </div>
        )}
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
            {/* Headers for table-like view */}
            <div className="px-4 py-2 flex text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 mb-2">
              <span className="flex-1">Item</span>
              <span className="w-24 text-center">Quantity</span>
              <span className="w-20 text-right">Price</span>
            </div>

            {items.map((item, idx) => (
              <div
                key={item.id}
                className="bg-gray-50 hover:bg-[#2d5a41]/5 rounded-2xl p-4 flex items-center gap-4 border border-transparent hover:border-[#2d5a41]/20 transition-all group animate-slide-in-up"
                style={{ animationDelay: `${idx * 40}ms` }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {item.menuId && <span className="text-[10px] font-black bg-white px-1.5 py-0.5 rounded border border-gray-100 text-gray-500">#{item.menuId}</span>}
                    <h3 className="font-black text-sm text-gray-800 tracking-tight leading-none truncate">
                      {item.name}
                    </h3>
                  </div>
                  {item.distribution && (
                    <p className="text-[9px] text-blue-600 font-bold uppercase tracking-wider bg-blue-50 w-fit px-1.5 py-0.5 rounded italic">{item.distribution}</p>
                  )}
                  <p className="text-[10px] text-gray-400 font-black mt-1 uppercase tracking-widest">{item.price} {t("common.currencyBr")}</p>
                </div>

                <div className="flex items-center bg-white rounded-full p-1 gap-1.5 shadow-sm border border-gray-100">
                  <button
                    onClick={() => onQuantityChange(item.id, Math.max(1, item.quantity - 1))}
                    className="w-8 h-8 bg-gray-50 shadow-sm rounded-full flex items-center justify-center text-xs hover:bg-red-50 hover:text-red-500 transition-all font-black text-gray-600 border border-gray-100 shrink-0"
                  >
                    −
                  </button>
                  <span className="w-4 text-center font-black text-sm text-gray-800">{item.quantity}</span>
                  <button
                    onClick={() => onQuantityChange(item.id, item.quantity + 1)}
                    className="w-8 h-8 bg-[#2d5a41] text-white shadow-md rounded-full flex items-center justify-center text-xs hover:scale-110 transition-all font-black shrink-0"
                  >
                    +
                  </button>
                </div>

                <div className="flex items-center justify-end gap-3 pr-1 min-w-[80px]">
                  <div className="text-right">
                    <p className="text-[9px] text-gray-400 font-black uppercase tracking-tighter mb-0.5">Total</p>
                    <span className="text-sm font-black text-[#2d5a41] tracking-tight">{(item.price * item.quantity).toFixed(0)} <span className="text-[10px]">{t("common.currencyBr")}</span></span>
                  </div>
                  <button
                    onClick={() => onRemove(item.id)}
                    className="p-2 -mr-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all flex items-center justify-center shrink-0"
                    title="Remove item"
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
      <div className={`p-4 border-t border-border bg-gray-50/30 space-y-3`}>
        <div className="space-y-2 bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400 font-black uppercase tracking-widest text-[10px]">{t("cashier.subtotal")}</span>
            <span className="font-bold text-gray-800">{subtotal.toFixed(0)} {t("common.currencyBr")}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400 font-black uppercase tracking-widest text-[10px]">{t("cashier.tax")} ({(vatRate * 100).toFixed(0)}%)</span>
            <span className="font-bold text-gray-800">{tax.toFixed(0)} {t("common.currencyBr")}</span>
          </div>
          <div className="border-t border-gray-100 pt-2 flex justify-between items-center">
            <span className="font-black text-gray-800 uppercase tracking-widest text-xs">{t("cashier.total")}</span>
            <span className="text-2xl font-black text-[#2d5a41] tracking-tighter">{total.toFixed(0)} <span className="text-sm">{t("common.currencyBr")}</span></span>
          </div>
        </div>

        <button
          onClick={onCheckout}
          disabled={items.length === 0 || isLoading}
          className="w-full bg-[#f5bc6b] text-[#1a1a1a] font-black py-4 rounded-2xl hover:shadow-lg transition-all transform hover:scale-[1.01] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <span className="animate-spin text-xl">⏳</span>
              {t("cashier.processing")}
            </>
          ) : (
            <>
              <span className="text-xl">{isDrinksOnly || isDrinksOrder ? '🥤' : '🚀'}</span>
              <span className="uppercase tracking-widest text-sm">
                {isDrinksOnly || isDrinksOrder ? 'Place Order' : t("cashier.sendToKitchen")}
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
