"use client"

import Image from "next/image"
import { useLanguage } from "@/context/language-context"

interface MenuItemCardProps {
  menuId?: string
  name: string
  price: number
  description?: string
  image?: string
  category: string
  preparationTime?: number
  onAddToCart: () => void
  isSelected?: boolean
  index?: number
}

export function MenuItemCard({
  menuId,
  name,
  price,
  description,
  image,
  category,
  preparationTime,
  onAddToCart,
  isSelected = false,
  index = 0,
}: MenuItemCardProps) {
  const { t } = useLanguage()
  const getCategoryEmoji = (cat: string) => {
    const emojiMap: Record<string, string> = {
      "Hot Coffee": "☕",
      "Iced & Cold Coffee": "🧊",
      "Tea & Infusions": "🍵",
      "Hot Specialties": "🔥",
      "Drinks": "🥤",
      "Juice": "🧃",
      "Mojito": "🍹",
      Breakfast: "🥞",
      Salad: "🥗",
      Burrito: "🌯",
      Burgers: "🍔",
      Wraps: "🌯",
      Sandwich: "🥪",
      Pasta: "🍝",
      Chicken: "🍗",
      "Ethiopian Taste": "🇪🇹",
    }
    return emojiMap[cat] || "🍴"
  }

  return (
    <div
      onClick={onAddToCart}
      className={`group transition-all duration-200 cursor-pointer animate-slide-in-up overflow-hidden
        flex flex-row md:flex-col md:card-base md:p-6 p-3 gap-3 md:gap-0
        border-b border-gray-100 md:border-2 md:border-border
        w-full min-w-0 max-w-full
        ${isSelected ? "bg-accent/5 md:bg-white md:border-accent shadow-sm md:shadow-lg md:shadow-accent/50" : "bg-white hover:bg-gray-50 md:hover:bg-white"}
      `}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Item Image - Ultra compact on mobile */}
      <div className="relative w-16 h-16 md:w-full md:h-28 bg-gradient-to-br from-accent/20 to-primary/20 rounded-lg overflow-hidden flex-shrink-0 shadow-sm md:shadow-none border border-gray-100 md:border-none">
        {image ? (
          <Image
            src={image}
            alt={name}
            fill
            className="object-cover transition-all duration-300 group-hover:scale-105"
            sizes="(max-width: 768px) 64px, (max-width: 1200px) 33vw, 20vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-50/50 md:bg-transparent">
            <div className="text-2xl md:text-6xl opacity-60 md:opacity-70">{getCategoryEmoji(category)}</div>
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 flex flex-row items-center justify-between md:flex-col md:items-stretch gap-2">
        <div className="min-w-0 flex-1 md:mt-3 flex flex-col justify-center">
          <h3 className="text-[13px] md:text-base font-bold text-gray-900 truncate leading-tight">
            {name}
          </h3>
          <div className="flex items-center gap-1.5 mt-0.5 whitespace-nowrap">
            <span className="text-[10px] md:text-xs text-gray-400 font-mono">#{menuId || index}</span>
            <span className="text-gray-300 md:hidden">•</span>
            <span className="text-[11px] font-black text-accent md:hidden">
              {price} {t("common.currencyBr")}
            </span>
          </div>
          {/* Show 1-line description on mobile list view */}
          {description && (
            <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5 line-clamp-1 leading-snug">{description}</p>
          )}
        </div>

        <div className="flex items-center gap-3 md:mt-3 flex-shrink-0">
          <div className="hidden md:block text-base font-black text-accent">
            {price} <span className="text-sm font-medium">{t("common.currencyBr")}</span>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddToCart();
            }}
            className={`flex items-center justify-center px-3 py-1.5 md:w-full md:py-2.5 rounded-full md:rounded-lg font-bold text-[11px] md:text-sm transition-all shadow-sm active:scale-95
              ${isSelected
                ? "bg-green-500 text-white shadow-green-200"
                : "bg-accent text-white hover:bg-accent/90 shadow-accent/20"
              }
            `}
          >
            {isSelected ? (
              <>
                <span className="text-xs md:hidden">✓</span>
                <span className="hidden md:inline">{t("menu.added")}</span>
              </>
            ) : (
              <>
                <span className="text-xs md:hidden leading-none">+ {t("menu.add")}</span>
                <span className="hidden md:inline flex items-center justify-center gap-2">
                  <span>🛒</span> {t("menu.add")}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
