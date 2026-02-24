"use client"

interface MenuItem {
  _id: string
  name: string
  description?: string
  category: string
  price: number
  image?: string
  available?: boolean
  preparationTime?: number
}

interface MenuGridProps {
  items: MenuItem[]
  onAddToCart: (item: MenuItem) => void
}

export function MenuGrid({ items, onAddToCart }: MenuGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((item) => {
        const isAvailable = item.available !== false
        return (
          <button
            key={item._id}
            onClick={() => onAddToCart(item)}
            disabled={!isAvailable}
            className={`rounded-lg border-2 transition-all overflow-hidden text-left ${
              isAvailable
                ? "bg-card border-border hover:border-primary hover:shadow-lg cursor-pointer"
                : "bg-muted border-border opacity-50 cursor-not-allowed"
            }`}
          >
          {item.image && (
            <div className="w-full h-40 overflow-hidden bg-muted">
              <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
            </div>
          )}
            <div className="p-4">
              <h3 className="font-semibold text-foreground">{item.name}</h3>
              {item.description && <p className="text-xs text-muted-foreground mt-1">{item.description}</p>}
              <div className="flex items-center justify-between mt-3">
                <span className="text-lg font-bold text-primary">{item.price} Birr</span>
                {item.preparationTime && <span className="text-xs text-muted-foreground">{item.preparationTime}m</span>}
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
