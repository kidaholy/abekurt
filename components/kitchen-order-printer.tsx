"use client"

import React, { useEffect } from 'react'
import { useKitchenPrinter, convertToKitchenOrder } from '@/hooks/use-kitchen-printer'
import { toast } from 'sonner'

interface KitchenOrderPrinterProps {
  orders: any[]
  onOrderPrinted?: (orderId: string) => void
}

export function KitchenOrderPrinter({ orders, onOrderPrinted }: KitchenOrderPrinterProps) {
  const { printOrder, printers } = useKitchenPrinter()

  useEffect(() => {
    // Check for new orders that need to be printed to kitchen
    const newOrders = orders.filter(order => 
      order.status === 'pending' && 
      !order.printedToKitchen &&
      order.items && 
      order.items.length > 0
    )

    if (newOrders.length > 0 && printers.some(p => p.connected)) {
      newOrders.forEach(async (order) => {
        try {
          const kitchenOrder = convertToKitchenOrder(order)
          const success = await printOrder(kitchenOrder)
          
          if (success) {
            toast.success(`Order ${order.orderNumber} sent to kitchen printer`)
            onOrderPrinted?.(order._id)
          } else {
            toast.error(`Failed to print order ${order.orderNumber} to kitchen`)
          }
        } catch (error) {
          console.error('Kitchen printing error:', error)
          toast.error(`Kitchen printer error for order ${order.orderNumber}`)
        }
      })
    }
  }, [orders, printOrder, printers, onOrderPrinted])

  // This component doesn't render anything visible
  return null
}

// Hook for manual kitchen printing
export function useManualKitchenPrint() {
  const { printOrder, printers, isPrinting } = useKitchenPrinter()

  const printToKitchen = async (orderData: any): Promise<boolean> => {
    if (!printers.some(p => p.connected)) {
      toast.error('No kitchen printers connected')
      return false
    }

    try {
      const kitchenOrder = convertToKitchenOrder(orderData)
      const success = await printOrder(kitchenOrder)
      
      if (success) {
        toast.success(`Order ${orderData.orderNumber} sent to kitchen`)
        return true
      } else {
        toast.error('Failed to print to kitchen')
        return false
      }
    } catch (error) {
      console.error('Manual kitchen print error:', error)
      toast.error('Kitchen printer error')
      return false
    }
  }

  return {
    printToKitchen,
    isPrinting,
    hasConnectedPrinters: printers.some(p => p.connected)
  }
}