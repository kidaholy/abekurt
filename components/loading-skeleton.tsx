"use client"

export function MenuItemSkeleton() {
  return (
    <div className="card-base animate-pulse">
      <div className="w-full h-40 bg-muted rounded-lg mb-4" />
      <div className="h-6 bg-muted rounded w-3/4 mb-3" />
      <div className="h-4 bg-muted rounded w-full mb-3" />
      <div className="h-4 bg-muted rounded w-2/3 mb-4" />
      <div className="h-10 bg-muted rounded-lg" />
    </div>
  )
}

export function OrderCardSkeleton() {
  return (
    <div className="card-base animate-pulse border-l-4 border-muted">
      <div className="h-6 bg-muted rounded w-1/3 mb-3" />
      <div className="space-y-2 mb-4">
        <div className="h-4 bg-muted rounded w-full" />
        <div className="h-4 bg-muted rounded w-4/5" />
      </div>
      <div className="h-10 bg-muted rounded-lg" />
    </div>
  )
}
