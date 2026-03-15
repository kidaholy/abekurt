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
      className={`group transition-all duration-200 cursor-pointer animate-slide-in-up overflow-hidden
        flex flex-row md:flex-col md:card-base md:p-6 p-2 gap-3 md:gap-0
        border-b md:border-2 border-gray-100 md:border-border
        ${isSelected ? "bg-accent/5 md:bg-white md:border-accent md:shadow-lg md:shadow-accent/50" : "bg-white"}
      `}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Item Image - Ultra compact on mobile */}
      <div className="relative w-14 h-14 md:w-full md:h-24 bg-gradient-to-br from-accent/20 to-primary/20 rounded-lg overflow-hidden flex-shrink-0">
        {image ? (
          <Image
            src={image}
            alt={name}
            fill
            className="object-cover transition-all duration-500 group-hover:scale-110"
            sizes="(max-width: 768px) 56px, (max-width: 1200px) 33vw, 20vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-xl md:text-6xl opacity-70">{getCategoryEmoji(category)}</div>
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 flex flex-row items-center justify-between md:flex-col md:items-stretch gap-2">
        <div className="min-w-0 flex-1 md:mt-2">
          <h3 className="text-[13px] md:text-sm font-bold text-gray-900 truncate leading-none md:leading-normal">
            {name}
          </h3>
          <div className="flex items-center gap-2 mt-1 whitespace-nowrap">
            <span className="text-[10px] text-gray-400 font-mono">#{menuId || index}</span>
            <span className="text-gray-300 md:hidden">•</span>
            <span className="text-[10px] md:text-sm font-black text-accent md:hidden">
              {price} Br
            </span>
          </div>
          {/* Hide description on mobile to save height */}
          {description && (
            <p className="hidden md:block text-[10px] text-muted-foreground mt-1 line-clamp-1">{description}</p>
          )}
        </div>

        <div className="flex items-center gap-3 md:mt-3">
          <div className="hidden md:block text-sm font-black text-accent">
            {price} {t("common.currencyBr")}
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddToCart();
            }}
            className={`flex items-center justify-center gap-1.5 px-3 py-1.5 md:w-full md:py-2 rounded-lg font-black text-[11px] md:text-xs transition-all
              ${isSelected
                ? "bg-green-100 text-green-700 border border-green-200"
                : "bg-accent text-accent-foreground shadow-sm active:scale-90"
              }
            `}
          >
            {isSelected ? (
              <>
                <span className="text-xs">✓</span>
                <span className="md:inline">{t("menu.added")}</span>
              </>
            ) : (
              <>
                <span className="text-xs">🛒</span>
                <span className="md:inline">{t("menu.add")}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
