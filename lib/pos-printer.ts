// Universal POS Printer Library for Kitchen Orders
// Supports multiple cash register and POS systems

export interface PrinterConfig {
  type: 'thermal' | 'impact' | 'laser' | 'inkjet'
  brand: string
  model: string
  interface: 'serial' | 'parallel' | 'usb' | 'ethernet' | 'bluetooth' | 'wifi'
  baudRate?: number
  port?: string
  ipAddress?: string
  characterSet?: string
  paperWidth?: number // in mm
  lineSpacing?: number
}

export interface OrderItem {
  id: string
  name: string
  quantity: number
  price: number
  notes?: string
  category?: string
  modifiers?: string[]
}

export interface KitchenOrder {
  orderId: string
  orderNumber: string
  timestamp: Date
  customerName?: string
  tableNumber?: string
  orderType: 'dine-in' | 'takeout' | 'delivery'
  items: OrderItem[]
  specialInstructions?: string
  priority?: 'normal' | 'urgent' | 'rush'
  server?: string
}

// ESC/POS Commands (Standard for most thermal printers)
export const ESC_POS = {
  // Basic commands
  ESC: '\x1B',
  GS: '\x1D',
  LF: '\x0A',
  CR: '\x0D',
  
  // Text formatting
  BOLD_ON: '\x1B\x45\x01',
  BOLD_OFF: '\x1B\x45\x00',
  UNDERLINE_ON: '\x1B\x2D\x01',
  UNDERLINE_OFF: '\x1B\x2D\x00',
  DOUBLE_HEIGHT: '\x1B\x21\x10',
  DOUBLE_WIDTH: '\x1B\x21\x20',
  NORMAL_SIZE: '\x1B\x21\x00',
  
  // Alignment
  ALIGN_LEFT: '\x1B\x61\x00',
  ALIGN_CENTER: '\x1B\x61\x01',
  ALIGN_RIGHT: '\x1B\x61\x02',
  
  // Paper control
  CUT_PAPER: '\x1D\x56\x00',
  PARTIAL_CUT: '\x1D\x56\x01',
  FEED_LINE: '\x1B\x64\x02',
  
  // Initialize
  INIT: '\x1B\x40'
}

// Star Micronics Commands (Alternative standard)
export const STAR_COMMANDS = {
  ESC: '\x1B',
  BOLD_ON: '\x1B\x45',
  BOLD_OFF: '\x1B\x46',
  UNDERLINE_ON: '\x1B\x2D\x01',
  UNDERLINE_OFF: '\x1B\x2D\x00',
  CUT_PAPER: '\x1B\x64\x02',
  INIT: '\x1B\x40'
}

export class UniversalPOSPrinter {
  private config: PrinterConfig
  private connection: any = null

  constructor(config: PrinterConfig) {
    this.config = config
  }

  // Initialize printer connection
  async connect(): Promise<boolean> {
    try {
      switch (this.config.interface) {
        case 'serial':
          return await this.connectSerial()
        case 'usb':
          return await this.connectUSB()
        case 'ethernet':
          return await this.connectEthernet()
        case 'bluetooth':
          return await this.connectBluetooth()
        case 'wifi':
          return await this.connectWiFi()
        default:
          throw new Error(`Unsupported interface: ${this.config.interface}`)
      }
    } catch (error) {
      console.error('Printer connection failed:', error)
      return false
    }
  }

  // Serial connection (RS-232, RS-485)
  private async connectSerial(): Promise<boolean> {
    if ('serial' in navigator) {
      try {
        const port = await (navigator as any).serial.requestPort()
        await port.open({ 
          baudRate: this.config.baudRate || 9600,
          dataBits: 8,
          stopBits: 1,
          parity: 'none'
        })
        this.connection = port
        return true
      } catch (error) {
        console.error('Serial connection failed:', error)
        return false
      }
    }
    return false
  }

  // USB connection
  private async connectUSB(): Promise<boolean> {
    if ('usb' in navigator) {
      try {
        const device = await (navigator as any).usb.requestDevice({
          filters: [
            // Common POS printer vendor IDs
            { vendorId: 0x04b8 }, // Epson
            { vendorId: 0x0519 }, // Star Micronics
            { vendorId: 0x154f }, // Citizen
            { vendorId: 0x0fe6 }, // ICS Advent
            { vendorId: 0x20d1 }, // Rongta
            { vendorId: 0x0dd4 }, // Custom Engineering
          ]
        })
        await device.open()
        this.connection = device
        return true
      } catch (error) {
        console.error('USB connection failed:', error)
        return false
      }
    }
    return false
  }

  // Ethernet/Network connection
  private async connectEthernet(): Promise<boolean> {
    if (this.config.ipAddress) {
      try {
        // Use WebSocket or fetch for network printing
        const response = await fetch(`http://${this.config.ipAddress}:9100`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/octet-stream' },
          body: ESC_POS.INIT
        })
        return response.ok
      } catch (error) {
        console.error('Ethernet connection failed:', error)
        return false
      }
    }
    return false
  }

  // Bluetooth connection
  private async connectBluetooth(): Promise<boolean> {
    if ('bluetooth' in navigator) {
      try {
        const device = await (navigator as any).bluetooth.requestDevice({
          filters: [{ services: ['000018f0-0000-1000-8000-00805f9b34fb'] }],
          optionalServices: ['00001801-0000-1000-8000-00805f9b34fb']
        })
        const server = await device.gatt.connect()
        this.connection = server
        return true
      } catch (error) {
        console.error('Bluetooth connection failed:', error)
        return false
      }
    }
    return false
  }

  // WiFi connection
  private async connectWiFi(): Promise<boolean> {
    return await this.connectEthernet() // Same as ethernet for most cases
  }

  // Generate kitchen receipt format
  generateKitchenReceipt(order: KitchenOrder): string {
    let receipt = ''
    
    // Initialize printer
    receipt += ESC_POS.INIT
    
    // Header
    receipt += ESC_POS.ALIGN_CENTER
    receipt += ESC_POS.DOUBLE_HEIGHT + ESC_POS.BOLD_ON
    receipt += '=== KITCHEN ORDER ===\n'
    receipt += ESC_POS.NORMAL_SIZE + ESC_POS.BOLD_OFF
    receipt += ESC_POS.FEED_LINE
    
    // Order details
    receipt += ESC_POS.ALIGN_LEFT
    receipt += ESC_POS.BOLD_ON
    receipt += `Order #: ${order.orderNumber}\n`
    receipt += `Time: ${order.timestamp.toLocaleTimeString()}\n`
    receipt += `Type: ${order.orderType.toUpperCase()}\n`
    
    if (order.tableNumber) {
      receipt += `Table: ${order.tableNumber}\n`
    }
    
    if (order.customerName) {
      receipt += `Customer: ${order.customerName}\n`
    }
    
    if (order.server) {
      receipt += `Server: ${order.server}\n`
    }
    
    receipt += ESC_POS.BOLD_OFF
    receipt += this.generateLine(this.config.paperWidth || 48)
    
    // Priority indicator
    if (order.priority === 'urgent' || order.priority === 'rush') {
      receipt += ESC_POS.ALIGN_CENTER
      receipt += ESC_POS.BOLD_ON + ESC_POS.DOUBLE_HEIGHT
      receipt += `*** ${order.priority.toUpperCase()} ORDER ***\n`
      receipt += ESC_POS.NORMAL_SIZE + ESC_POS.BOLD_OFF
      receipt += ESC_POS.ALIGN_LEFT
      receipt += this.generateLine(this.config.paperWidth || 48)
    }
    
    // Items
    receipt += ESC_POS.BOLD_ON
    receipt += 'ITEMS:\n'
    receipt += ESC_POS.BOLD_OFF
    
    order.items.forEach((item, index) => {
      receipt += ESC_POS.BOLD_ON
      receipt += `${item.quantity}x ${item.name}\n`
      receipt += ESC_POS.BOLD_OFF
      
      if (item.modifiers && item.modifiers.length > 0) {
        item.modifiers.forEach(modifier => {
          receipt += `   + ${modifier}\n`
        })
      }
      
      if (item.notes) {
        receipt += `   NOTE: ${item.notes}\n`
      }
      
      if (index < order.items.length - 1) {
        receipt += '\n'
      }
    })
    
    // Special instructions
    if (order.specialInstructions) {
      receipt += this.generateLine(this.config.paperWidth || 48)
      receipt += ESC_POS.BOLD_ON
      receipt += 'SPECIAL INSTRUCTIONS:\n'
      receipt += ESC_POS.BOLD_OFF
      receipt += `${order.specialInstructions}\n`
    }
    
    // Footer
    receipt += this.generateLine(this.config.paperWidth || 48)
    receipt += ESC_POS.ALIGN_CENTER
    receipt += `Printed: ${new Date().toLocaleString()}\n`
    receipt += ESC_POS.FEED_LINE
    receipt += ESC_POS.FEED_LINE
    
    // Cut paper
    receipt += ESC_POS.CUT_PAPER
    
    return receipt
  }

  // Generate separator line
  private generateLine(width: number): string {
    return '-'.repeat(width) + '\n'
  }

  // Print to kitchen
  async printKitchenOrder(order: KitchenOrder): Promise<boolean> {
    try {
      const receipt = this.generateKitchenReceipt(order)
      return await this.sendToPrinter(receipt)
    } catch (error) {
      console.error('Kitchen printing failed:', error)
      return false
    }
  }

  // Send data to printer
  private async sendToPrinter(data: string): Promise<boolean> {
    if (!this.connection) {
      throw new Error('Printer not connected')
    }

    try {
      switch (this.config.interface) {
        case 'serial':
          return await this.sendSerial(data)
        case 'usb':
          return await this.sendUSB(data)
        case 'ethernet':
        case 'wifi':
          return await this.sendNetwork(data)
        case 'bluetooth':
          return await this.sendBluetooth(data)
        default:
          return false
      }
    } catch (error) {
      console.error('Print send failed:', error)
      return false
    }
  }

  private async sendSerial(data: string): Promise<boolean> {
    const writer = this.connection.writable.getWriter()
    const encoder = new TextEncoder()
    await writer.write(encoder.encode(data))
    writer.releaseLock()
    return true
  }

  private async sendUSB(data: string): Promise<boolean> {
    const encoder = new TextEncoder()
    const dataArray = encoder.encode(data)
    await this.connection.transferOut(1, dataArray)
    return true
  }

  private async sendNetwork(data: string): Promise<boolean> {
    const response = await fetch(`http://${this.config.ipAddress}:9100`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: data
    })
    return response.ok
  }

  private async sendBluetooth(data: string): Promise<boolean> {
    // Implementation depends on specific Bluetooth service
    // This is a simplified version
    return true
  }

  // Disconnect printer
  async disconnect(): Promise<void> {
    if (this.connection) {
      try {
        switch (this.config.interface) {
          case 'serial':
            await this.connection.close()
            break
          case 'usb':
            await this.connection.close()
            break
          case 'bluetooth':
            this.connection.disconnect()
            break
        }
      } catch (error) {
        console.error('Disconnect failed:', error)
      } finally {
        this.connection = null
      }
    }
  }
}

// Predefined configurations for popular POS systems
export const PRINTER_CONFIGS = {
  // Epson configurations
  EPSON_TM_T88V: {
    type: 'thermal' as const,
    brand: 'Epson',
    model: 'TM-T88V',
    interface: 'usb' as const,
    paperWidth: 48,
    characterSet: 'CP437'
  },
  
  EPSON_TM_T20: {
    type: 'thermal' as const,
    brand: 'Epson',
    model: 'TM-T20',
    interface: 'ethernet' as const,
    paperWidth: 48,
    characterSet: 'CP437'
  },

  // Star Micronics
  STAR_TSP143: {
    type: 'thermal' as const,
    brand: 'Star Micronics',
    model: 'TSP143',
    interface: 'usb' as const,
    paperWidth: 48,
    characterSet: 'CP437'
  },

  // NCR configurations
  NCR_7167: {
    type: 'thermal' as const,
    brand: 'NCR',
    model: '7167',
    interface: 'serial' as const,
    baudRate: 9600,
    paperWidth: 42
  },

  // Citizen
  CITIZEN_CT_S310A: {
    type: 'thermal' as const,
    brand: 'Citizen',
    model: 'CT-S310A',
    interface: 'usb' as const,
    paperWidth: 48
  },

  // Square Terminal
  SQUARE_TERMINAL: {
    type: 'thermal' as const,
    brand: 'Square',
    model: 'Terminal',
    interface: 'wifi' as const,
    paperWidth: 48
  },

  // Clover
  CLOVER_STATION: {
    type: 'thermal' as const,
    brand: 'Clover',
    model: 'Station',
    interface: 'ethernet' as const,
    paperWidth: 48
  },

  // Generic thermal printer
  GENERIC_THERMAL: {
    type: 'thermal' as const,
    brand: 'Generic',
    model: 'Thermal',
    interface: 'usb' as const,
    paperWidth: 48,
    characterSet: 'CP437'
  }
}

// Kitchen printer manager
export class KitchenPrinterManager {
  private printers: Map<string, UniversalPOSPrinter> = new Map()
  
  addPrinter(id: string, config: PrinterConfig): void {
    const printer = new UniversalPOSPrinter(config)
    this.printers.set(id, printer)
  }
  
  async connectAll(): Promise<boolean[]> {
    const results = []
    for (const [id, printer] of this.printers) {
      const connected = await printer.connect()
      console.log(`Printer ${id}: ${connected ? 'Connected' : 'Failed'}`)
      results.push(connected)
    }
    return results
  }
  
  async printToAll(order: KitchenOrder): Promise<boolean[]> {
    const results = []
    for (const [id, printer] of this.printers) {
      try {
        const success = await printer.printKitchenOrder(order)
        console.log(`Kitchen print ${id}: ${success ? 'Success' : 'Failed'}`)
        results.push(success)
      } catch (error) {
        console.error(`Kitchen print ${id} error:`, error)
        results.push(false)
      }
    }
    return results
  }
  
  async printToSpecific(printerId: string, order: KitchenOrder): Promise<boolean> {
    const printer = this.printers.get(printerId)
    if (!printer) {
      throw new Error(`Printer ${printerId} not found`)
    }
    return await printer.printKitchenOrder(order)
  }
  
  async disconnectAll(): Promise<void> {
    for (const printer of this.printers.values()) {
      await printer.disconnect()
    }
  }
}

// Browser compatibility check
export function checkPrinterSupport(): {
  serial: boolean
  usb: boolean
  bluetooth: boolean
  network: boolean
} {
  return {
    serial: 'serial' in navigator,
    usb: 'usb' in navigator,
    bluetooth: 'bluetooth' in navigator,
    network: true // Always available via fetch
  }
}

// Auto-detect printer type
export async function detectPrinter(): Promise<PrinterConfig | null> {
  const support = checkPrinterSupport()
  
  // Try USB first (most common)
  if (support.usb) {
    try {
      const device = await (navigator as any).usb.requestDevice({
        filters: [
          { vendorId: 0x04b8 }, // Epson
          { vendorId: 0x0519 }, // Star Micronics
          { vendorId: 0x154f }, // Citizen
        ]
      })
      
      // Return appropriate config based on vendor
      if (device.vendorId === 0x04b8) {
        return PRINTER_CONFIGS.EPSON_TM_T88V
      } else if (device.vendorId === 0x0519) {
        return PRINTER_CONFIGS.STAR_TSP143
      } else if (device.vendorId === 0x154f) {
        return PRINTER_CONFIGS.CITIZEN_CT_S310A
      }
    } catch (error) {
      console.log('USB printer detection failed:', error)
    }
  }
  
  // Fallback to generic
  return PRINTER_CONFIGS.GENERIC_THERMAL
}