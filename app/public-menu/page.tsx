"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "@/components/ui/carousel"
import { cn } from "@/lib/utils"

// Category icon mapping
const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
        "Hot Coffee": "☕",
        "Iced & Cold Coffee": "🧊",
        "Tea & Infusions": "🍵",
        "Hot Specialties": "🔥",
        "Drinks": "🥤",
        "Juice": "🧃",
        "Mojito": "🍹",
        "Breakfast": "🍳",
        "Salad": "🥗",
        "Burrito": "🌯",
        "Burgers": "🍔",
        "Wraps": "🌯",
        "Sandwich": "🥪",
        "Pasta": "🍝",
        "Chicken": "🍗",
        "Ethiopian Taste": "🇪🇹",
    }
    return icons[category] || "🍽️"
}

interface MenuItem {
    _id: string
    menuId: string
    name: string
    description?: string
    mainCategory: 'Food' | 'Drinks'
    category: string
    price: number
    image?: string
    preparationTime?: number
}

export default function PublicMenuPage() {
    const [menuItems, setMenuItems] = useState<MenuItem[]>([])
    const [mainCategoryFilter, setMainCategoryFilter] = useState<'Food' | 'Drinks'>('Food')
    const [categoryFilter, setCategoryFilter] = useState("all")
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchMenu = async () => {
            try {
                setLoading(true)
                const res = await fetch("/api/public/menu")
                if (res.ok) {
                    const data = await res.json()
                    setMenuItems(data)
                } else {
                    setError("Failed to load menu")
                }
            } catch {
                setError("Failed to load menu. Please check your connection.")
            } finally {
                setLoading(false)
            }
        }
        fetchMenu()
    }, [])

    const itemsInTab = menuItems.filter(item => (item.mainCategory || 'Food') === mainCategoryFilter)
    const categories = ["all", ...new Set(itemsInTab.map(item => item.category))]
    const filteredItems = (categoryFilter === "all" ? itemsInTab : itemsInTab.filter(item => item.category === categoryFilter))
        .sort((a, b) => {
            const idA = a.menuId || ""
            const idB = b.menuId || ""
            return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' })
        })

    return (
        <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
            {/* Hero Header */}
            <div className="relative overflow-hidden bg-gradient-to-r from-[#8B4513] via-[#A0522D] to-[#D2691E]">
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-4 left-10 text-6xl animate-bounce" style={{ animationDelay: '0s' }}>☕</div>
                    <div className="absolute top-8 right-20 text-5xl animate-bounce" style={{ animationDelay: '0.5s' }}>🍰</div>
                    <div className="absolute bottom-4 left-1/3 text-4xl animate-bounce" style={{ animationDelay: '1s' }}>🥐</div>
                    <div className="absolute bottom-2 right-1/4 text-5xl animate-bounce" style={{ animationDelay: '1.5s' }}>🍹</div>
                </div>
                <div className="relative max-w-5xl mx-auto px-4 py-10 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-2 tracking-tight drop-shadow-lg">
                            🍽️ Our Menu
                        </h1>
                        <p className="text-lg text-white/80 font-medium">
                            Fresh & delicious — crafted with love
                        </p>
                    </motion.div>
                </div>
                {/* Wave separator */}
                <svg viewBox="0 0 1440 60" className="w-full -mb-1" preserveAspectRatio="none">
                    <path d="M0,30 C360,60 720,0 1080,30 C1260,45 1380,15 1440,30 L1440,60 L0,60 Z" fill="#FFFBF0" />
                </svg>
            </div>

            <div className="max-w-5xl mx-auto px-4 py-6">
                {/* Loading */}
                {loading && (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="relative w-20 h-20 mb-4">
                            <div className="absolute inset-0 border-4 border-amber-200 rounded-full animate-ping" />
                            <div className="absolute inset-2 border-4 border-t-[#8B4513] border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
                            <div className="absolute inset-0 flex items-center justify-center text-3xl">☕</div>
                        </div>
                        <p className="text-[#8B4513] font-semibold text-lg">Loading menu...</p>
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="text-center py-16">
                        <div className="text-6xl mb-4">😢</div>
                        <h2 className="text-2xl font-bold text-red-500 mb-2">Oops!</h2>
                        <p className="text-gray-500 mb-6">{error}</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-6 py-3 bg-[#8B4513] text-white rounded-full font-bold hover:bg-[#A0522D] transition-colors shadow-lg"
                        >
                            🔄 Try Again
                        </button>
                    </div>
                )}

                {!loading && !error && (
                    <>
                        {/* Food / Drinks Tabs */}
                        <div className="flex justify-center gap-3 mb-6">
                            {(['Food', 'Drinks'] as const).map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => { setMainCategoryFilter(tab); setCategoryFilter('all') }}
                                    className={`flex items-center gap-2 px-8 py-3 rounded-full font-extrabold text-base transition-all duration-300 shadow-md ${mainCategoryFilter === tab
                                        ? 'bg-[#8B4513] text-white shadow-xl scale-105 ring-2 ring-[#D2691E]/50'
                                        : 'bg-white text-gray-500 hover:bg-amber-50 hover:text-[#8B4513] border border-gray-200'
                                        }`}
                                >
                                    {tab === 'Food' ? '🍽️' : '🥤'} {tab}
                                    <span className="text-xs opacity-70 bg-black/10 px-2 py-0.5 rounded-full">
                                        {menuItems.filter(i => (i.mainCategory || 'Food') === tab).length}
                                    </span>
                                </button>
                            ))}
                        </div>

                        {/* Sub-category Slider (Slide View) */}
                        <div className="mb-8 relative px-10">
                            <Carousel
                                opts={{
                                    align: "start",
                                    containScroll: "trimSnaps",
                                }}
                                className="w-full"
                            >
                                <CarouselContent className="-ml-2">
                                    {categories.map((cat: string) => (
                                        <CarouselItem key={cat} className="pl-2 basis-auto">
                                            <button
                                                onClick={() => setCategoryFilter(cat)}
                                                className={cn(
                                                    "flex items-center gap-2 px-5 py-2.5 rounded-full font-bold whitespace-nowrap text-sm transition-all duration-300 border shadow-sm",
                                                    categoryFilter === cat
                                                        ? "bg-[#8B4513] text-white border-[#8B4513] shadow-md scale-105"
                                                        : "bg-white text-gray-500 hover:bg-amber-50 hover:text-[#8B4513] border-gray-200"
                                                )}
                                            >
                                                <span>{cat === "all" ? "✨" : getCategoryIcon(cat)}</span>
                                                <span>{cat === "all" ? "All" : cat}</span>
                                            </button>
                                        </CarouselItem>
                                    ))}
                                </CarouselContent>
                                <div className="hidden md:block">
                                    <CarouselPrevious className="-left-12 size-8 bg-white/80 hover:bg-white text-[#8B4513] border-none shadow-md" />
                                    <CarouselNext className="-right-12 size-8 bg-white/80 hover:bg-white text-[#8B4513] border-none shadow-md" />
                                </div>
                            </Carousel>
                        </div>

                        {/* Empty */}
                        {filteredItems.length === 0 && (
                            <div className="text-center py-20">
                                <div className="text-7xl mb-4 opacity-40">🍽️</div>
                                <h2 className="text-2xl font-bold text-gray-400">No items found</h2>
                                <p className="text-gray-400 mt-1">Try a different category</p>
                            </div>
                        )}

                        {/* Menu Items (List View) */}
                        {filteredItems.length > 0 && (
                            <motion.div
                                className="flex flex-col gap-4"
                                layout
                            >
                                <AnimatePresence mode="popLayout">
                                    {filteredItems.map((item, idx) => (
                                        <motion.div
                                            key={item._id}
                                            layout
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            transition={{ duration: 0.2, delay: idx * 0.03 }}
                                            className="group bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden border border-gray-100 flex items-center p-3 gap-4"
                                        >
                                            {/* Compact Image */}
                                            <div className="relative w-24 h-24 rounded-xl overflow-hidden shrink-0 bg-amber-50 flex items-center justify-center">
                                                {item.image ? (
                                                    <Image
                                                        src={item.image}
                                                        alt={item.name}
                                                        fill
                                                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                                                        sizes="100px"
                                                    />
                                                ) : (
                                                    <span className="text-4xl opacity-40">
                                                        {getCategoryIcon(item.category)}
                                                    </span>
                                                )}

                                                {/* Price Overlay for Mobile accessibility if needed, but we put it on right */}
                                            </div>

                                            {/* Details */}
                                            <div className="flex-grow min-w-0">
                                                <div className="flex justify-between items-start mb-0.5">
                                                    <h3 className="text-base font-bold text-gray-800 transition-colors group-hover:text-[#8B4513] truncate pr-2">
                                                        {item.name}
                                                    </h3>
                                                    <span className="text-base font-extrabold text-[#8B4513] whitespace-nowrap">
                                                        {item.price} Br
                                                    </span>
                                                </div>

                                                {item.description && (
                                                    <p className="text-xs text-gray-500 line-clamp-2 mb-2 leading-relaxed">
                                                        {item.description}
                                                    </p>
                                                )}

                                                <div className="flex items-center gap-3">
                                                    <span className="inline-flex items-center px-2 py-0.5 bg-amber-50 text-[#8B4513] text-[10px] font-bold rounded-md border border-amber-100/50 uppercase tracking-tighter">
                                                        {item.category}
                                                    </span>
                                                    {item.preparationTime && (
                                                        <span className="flex items-center gap-1 text-[10px] text-gray-400 font-medium">
                                                            ⏱ {item.preparationTime} min
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Selection Indicator/Arrow */}
                                            <div className="text-amber-200 group-hover:text-[#8B4513] transition-colors pr-1">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </motion.div>
                        )}

                        {/* Footer */}
                        <div className="text-center mt-12 pb-8">
                            <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm px-6 py-3 rounded-full shadow-sm border border-gray-100">
                                <span className="text-lg">☕</span>
                                <span className="text-sm text-gray-500 font-medium">Powered by Abekut</span>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
