"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { useManualKitchenPrint } from '@/components/kitchen-order-printer'
import { Printer, RefreshCw } from 'lucide-react'

interface PrintToKitchenButtonProps {
  order: any
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'sm' | 'default' | 'lg'
  className?: string
  showText?: boolean
}

export function PrintToKitchenButton({ 
  order, 
  variant = 'outline',
  size = 'sm',
  className = '',
  showText = true
}: PrintToKitchenButtonProps) {
  const { printToKitchen, isPrinting, hasConnectedPrinters } = useManualKitchenPrint()

  const handlePrint = async () => {
    await printToKitchen(order)
  }

  if (!hasConnectedPrinters) {
    return (
      <Button
        variant="ghost"
        size={size}
        disabled
        className={`text-gray-400 ${className}`}
        title="No kitchen printers connected"
      >
        <Printer className="h-4 w-4" />
        {showText && <span className="ml-1">No Printer</span>}
      </Button>
    )
  }

  return (
    <Button
      onClick={handlePrint}
      disabled={isPrinting}
      variant={variant}
      size={size}
      className={`${className}`}
      title="Print order to kitchen"
    >
      {isPrinting ? (
        <RefreshCw className="h-4 w-4 animate-spin" />
      ) : (
        <Printer className="h-4 w-4" />
      )}
      {showText && (
        <span className="ml-1">
          {isPrinting ? 'Printing...' : 'Print to Kitchen'}
        </span>
      )}
    </Button>
  )
}

// Compact version for tight spaces
export function CompactPrintButton({ order, className = '' }: { order: any, className?: string }) {
  return (
    <PrintToKitchenButton
      order={order}
      variant="ghost"
      size="sm"
      showText={false}
      className={`w-8 h-8 p-0 ${className}`}
    />
  )
}

// Full-width version for order cards
export function FullWidthPrintButton({ order, className = '' }: { order: any, className?: string }) {
  return (
    <PrintToKitchenButton
      order={order}
      variant="outline"
      size="default"
      showText={true}
      className={`w-full border-[#8B4513] text-[#8B4513] hover:bg-[#8B4513] hover:text-white ${className}`}
    />
  )
}