"use client"

import { useState } from "react"
import { useSocket } from "@/hooks/use-socket"
import { useSocketEmit } from "@/hooks/use-socket"

interface Order {
  _id: string
  orderNumber: string
  status: string
  items: any[]
}

interface RealTimeOrdersProps {
  onOrderUpdate?: (order: Order) => void
}

export function RealTimeOrders({ onOrderUpdate }: RealTimeOrdersProps) {
  const [orders, setOrders] = useState<Order[]>([])
  const emit = useSocketEmit()

  const handleOrderUpdate = (event: string, data: any) => {
    if (event === "order-update") {
      setOrders((prev) => {
        const exists = prev.find((o) => o._id === data._id)
        if (exists) {
          return prev.map((o) => (o._id === data._id ? data : o))
        }
        return [data, ...prev]
      })

      if (onOrderUpdate) {
        onOrderUpdate(data)
      }
    }
  }

  useSocket({
    events: ["order-update", "order-status-updated"],
    onEvent: handleOrderUpdate,
  })

  const emitOrderUpdate = (order: Order) => {
    emit("order-update", order)
  }

  return {
    orders,
    emitOrderUpdate,
  }
}
