"use client"

import { useState, useEffect, useCallback } from 'react'
import { 
  UniversalPOSPrinter, 
  KitchenPrinterManager, 
  PrinterConfig, 
  KitchenOrder,
  PRINTER_CONFIGS,
  checkPrinterSupport,
  detectPrinter
} from '@/lib/pos-printer'

interface PrinterStatus {
  id: string
  name: string
  connected: boolean
  lastPrint?: Date
  error?: string
}

interface UsePrinterReturn {
  printers: PrinterStatus[]
  isConnecting: boolean
  isPrinting: boolean
  addPrinter: (id: string, config: PrinterConfig) => void
  connectPrinters: () => Promise<void>
  printOrder: (order: KitchenOrder, printerId?: string) => Promise<boolean>
  autoDetectPrinter: () => Promise<void>
  support: {
    serial: boolean
    usb: boolean
    bluetooth: boolean
    network: boolean
  }
  error: string | null
}

export function useKitchenPrinter(): UsePrinterReturn {
  const [printerManager] = useState(() => new KitchenPrinterManager())
  const [printers, setPrinters] = useState<PrinterStatus[]>([])
  const [isConnecting, setIsConnecting] = useState(false)
  const [isPrinting, setIsPrinting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [support] = useState(() => checkPrinterSupport())

  // Add a printer configuration
  const addPrinter = useCallback((id: string, config: PrinterConfig) => {
    try {
      printerManager.addPrinter(id, config)
      setPrinters(prev => [
        ...prev.filter(p => p.id !== id),
        {
          id,
          name: `${config.brand} ${config.model}`,
          connected: false
        }
      ])
      setError(null)
    } catch (err) {
      setError(`Failed to add printer: ${err}`)
    }
  }, [printerManager])

  // Connect all printers
  const connectPrinters = useCallback(async () => {
    setIsConnecting(true)
    setError(null)
    
    try {
      const results = await printerManager.connectAll()
      
      setPrinters(prev => prev.map((printer, index) => ({
        ...printer,
        connected: results[index] || false,
        error: results[index] ? undefined : 'Connection failed'
      })))
      
      const connectedCount = results.filter(Boolean).length
      if (connectedCount === 0) {
        setError('No printers could be connected')
      }
    } catch (err) {
      setError(`Connection failed: ${err}`)
    } finally {
      setIsConnecting(false)
    }
  }, [printerManager])

  // Print order to kitchen
  const printOrder = useCallback(async (order: KitchenOrder, printerId?: string): Promise<boolean> => {
    setIsPrinting(true)
    setError(null)
    
    try {
      let success = false
      
      if (printerId) {
        // Print to specific printer
        success = await printerManager.printToSpecific(printerId, order)
        
        // Update printer status
        setPrinters(prev => prev.map(p => 
          p.id === printerId 
            ? { ...p, lastPrint: new Date(), error: success ? undefined : 'Print failed' }
            : p
        ))
      } else {
        // Print to all printers
        const results = await printerManager.printToAll(order)
        success = results.some(Boolean)
        
        // Update all printer statuses
        setPrinters(prev => prev.map((p, index) => ({
          ...p,
          lastPrint: results[index] ? new Date() : p.lastPrint,
          error: results[index] ? undefined : 'Print failed'
        })))
      }
      
      if (!success) {
        setError('All print attempts failed')
      }
      
      return success
    } catch (err) {
      setError(`Print failed: ${err}`)
      return false
    } finally {
      setIsPrinting(false)
    }
  }, [printerManager])

  // Auto-detect and add printer
  const autoDetectPrinter = useCallback(async () => {
    setIsConnecting(true)
    setError(null)
    
    try {
      const config = await detectPrinter()
      if (config) {
        const id = `auto-${Date.now()}`
        addPrinter(id, config)
        
        // Try to connect immediately
        setTimeout(() => connectPrinters(), 500)
      } else {
        setError('No compatible printer detected')
      }
    } catch (err) {
      setError(`Auto-detection failed: ${err}`)
    } finally {
      setIsConnecting(false)
    }
  }, [addPrinter, connectPrinters])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      printerManager.disconnectAll()
    }
  }, [printerManager])

  return {
    printers,
    isConnecting,
    isPrinting,
    addPrinter,
    connectPrinters,
    printOrder,
    autoDetectPrinter,
    support,
    error
  }
}

// Helper function to convert order data to KitchenOrder format
export function convertToKitchenOrder(orderData: any): KitchenOrder {
  return {
    orderId: orderData._id || orderData.id,
    orderNumber: orderData.orderNumber || `ORD-${Date.now()}`,
    timestamp: new Date(orderData.createdAt || Date.now()),
    customerName: orderData.customerName,
    tableNumber: orderData.tableNumber,
    orderType: orderData.orderType || 'dine-in',
    items: orderData.items?.map((item: any) => ({
      id: item._id || item.id,
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      notes: item.notes,
      category: item.category,
      modifiers: item.modifiers || []
    })) || [],
    specialInstructions: orderData.specialInstructions,
    priority: orderData.priority || 'normal',
    server: orderData.server
  }
}

// Predefined printer setups for common POS systems
export const COMMON_SETUPS = {
  // Square POS setup
  SQUARE_POS: () => ({
    id: 'square-kitchen',
    config: PRINTER_CONFIGS.SQUARE_TERMINAL
  }),
  
  // Clover POS setup
  CLOVER_POS: () => ({
    id: 'clover-kitchen',
    config: PRINTER_CONFIGS.CLOVER_STATION
  }),
  
  // Generic USB thermal printer
  USB_THERMAL: () => ({
    id: 'usb-kitchen',
    config: PRINTER_CONFIGS.GENERIC_THERMAL
  }),
  
  // Network printer setup
  NETWORK_PRINTER: (ipAddress: string) => ({
    id: 'network-kitchen',
    config: {
      ...PRINTER_CONFIGS.EPSON_TM_T20,
      ipAddress
    }
  }),
  
  // Epson TM series
  EPSON_TM: () => ({
    id: 'epson-kitchen',
    config: PRINTER_CONFIGS.EPSON_TM_T88V
  }),
  
  // Star Micronics
  STAR_TSP: () => ({
    id: 'star-kitchen',
    config: PRINTER_CONFIGS.STAR_TSP143
  })
}