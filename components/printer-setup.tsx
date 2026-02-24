"use client"

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  useKitchenPrinter, 
  convertToKitchenOrder,
  COMMON_SETUPS 
} from '@/hooks/use-kitchen-printer'
import { PRINTER_CONFIGS, PrinterConfig } from '@/lib/pos-printer'
import { 
  Printer, 
  Wifi, 
  Usb, 
  Bluetooth, 
  Cable,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Settings,
  Plus,
  RefreshCw
} from 'lucide-react'

interface PrinterSetupProps {
  onClose?: () => void
}

export function PrinterSetup({ onClose }: PrinterSetupProps) {
  const {
    printers,
    isConnecting,
    isPrinting,
    addPrinter,
    connectPrinters,
    printOrder,
    autoDetectPrinter,
    support,
    error
  } = useKitchenPrinter()

  const [selectedConfig, setSelectedConfig] = useState<string>('')
  const [customIP, setCustomIP] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Test order for printing
  const testOrder = {
    _id: 'test-001',
    orderNumber: 'TEST-001',
    createdAt: new Date(),
    customerName: 'Test Customer',
    tableNumber: '5',
    orderType: 'dine-in',
    items: [
      {
        _id: 'item-1',
        name: 'Espresso',
        quantity: 2,
        price: 3.50,
        category: 'Coffee'
      },
      {
        _id: 'item-2',
        name: 'Croissant',
        quantity: 1,
        price: 4.00,
        category: 'Pastry',
        notes: 'Extra butter'
      }
    ],
    specialInstructions: 'Rush order - customer waiting',
    priority: 'urgent',
    server: 'Admin'
  }

  const handleAddPrinter = () => {
    if (!selectedConfig) return

    let config: PrinterConfig
    let id: string

    switch (selectedConfig) {
      case 'network':
        if (!customIP) {
          alert('Please enter IP address for network printer')
          return
        }
        const networkSetup = COMMON_SETUPS.NETWORK_PRINTER(customIP)
        id = networkSetup.id
        config = networkSetup.config
        break
      case 'auto':
        autoDetectPrinter()
        return
      case 'SQUARE_POS':
        const squareSetup = COMMON_SETUPS.SQUARE_POS()
        id = squareSetup.id
        config = squareSetup.config
        break
      case 'CLOVER_POS':
        const cloverSetup = COMMON_SETUPS.CLOVER_POS()
        id = cloverSetup.id
        config = cloverSetup.config
        break
      case 'USB_THERMAL':
        const usbSetup = COMMON_SETUPS.USB_THERMAL()
        id = usbSetup.id
        config = usbSetup.config
        break
      case 'EPSON_TM':
        const epsonSetup = COMMON_SETUPS.EPSON_TM()
        id = epsonSetup.id
        config = epsonSetup.config
        break
      case 'STAR_TSP':
        const starSetup = COMMON_SETUPS.STAR_TSP()
        id = starSetup.id
        config = starSetup.config
        break
      default:
        return
    }

    addPrinter(id, config)
    setSelectedConfig('')
    setCustomIP('')
  }

  const handleTestPrint = async () => {
    const kitchenOrder = convertToKitchenOrder(testOrder)
    await printOrder(kitchenOrder)
  }

  const getConnectionIcon = (interfaceType: string) => {
    switch (interfaceType) {
      case 'wifi':
      case 'ethernet':
        return <Wifi className="h-4 w-4" />
      case 'usb':
        return <Usb className="h-4 w-4" />
      case 'bluetooth':
        return <Bluetooth className="h-4 w-4" />
      case 'serial':
        return <Cable className="h-4 w-4" />
      default:
        return <Printer className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-[#8B4513]">Kitchen Printer Setup</h2>
          <p className="text-gray-600">Configure printers for kitchen order printing</p>
        </div>
        {onClose && (
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        )}
      </div>

      {/* Browser Support Status */}
      <Card className="border-2 border-[#8B4513]">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5 text-[#8B4513]" />
            <span>Browser Support</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center space-x-2">
              <Usb className="h-4 w-4" />
              <span className="text-sm">USB</span>
              {support.usb ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Cable className="h-4 w-4" />
              <span className="text-sm">Serial</span>
              {support.serial ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Bluetooth className="h-4 w-4" />
              <span className="text-sm">Bluetooth</span>
              {support.bluetooth ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Wifi className="h-4 w-4" />
              <span className="text-sm">Network</span>
              {support.network ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Printer */}
      <Card className="border-2 border-[#8B4513]">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Plus className="h-5 w-5 text-[#8B4513]" />
            <span>Add Kitchen Printer</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Quick Setup Options */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#8B4513]">Quick Setup</label>
              <select 
                value={selectedConfig}
                onChange={(e) => setSelectedConfig(e.target.value)}
                className="w-full p-2 border-2 border-[#8B4513] rounded-lg"
              >
                <option value="">Select printer type...</option>
                <option value="auto">🔍 Auto-detect USB printer</option>
                <option value="USB_THERMAL">🖨️ Generic USB thermal printer</option>
                <option value="EPSON_TM">📄 Epson TM series</option>
                <option value="STAR_TSP">⭐ Star Micronics TSP</option>
                <option value="SQUARE_POS">🟦 Square POS Terminal</option>
                <option value="CLOVER_POS">🍀 Clover Station</option>
                <option value="network">🌐 Network printer (IP)</option>
              </select>
            </div>

            {/* Network IP Input */}
            {selectedConfig === 'network' && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#8B4513]">Printer IP Address</label>
                <input
                  type="text"
                  value={customIP}
                  onChange={(e) => setCustomIP(e.target.value)}
                  placeholder="192.168.1.100"
                  className="w-full p-2 border-2 border-[#8B4513] rounded-lg"
                />
              </div>
            )}
          </div>

          <div className="flex space-x-2">
            <Button 
              onClick={handleAddPrinter}
              disabled={!selectedConfig || isConnecting}
              className="bg-[#8B4513] hover:bg-[#D2691E] text-white"
            >
              {isConnecting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Printer
                </>
              )}
            </Button>

            <Button 
              onClick={() => setShowAdvanced(!showAdvanced)}
              variant="outline"
              className="border-[#8B4513] text-[#8B4513]"
            >
              Advanced Setup
            </Button>
          </div>

          {/* Advanced Configuration */}
          {showAdvanced && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h4 className="font-medium text-[#8B4513] mb-2">Supported Cash Register Systems</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <p><strong>Vintage:</strong> Ritty's Incorruptible Cashier, NCR Model 1-50, Hallwood, Ideal</p>
                <p><strong>Classic:</strong> Burroughs, Gross, Sweda, Sperry Rand, Remington</p>
                <p><strong>Electronic:</strong> Sharp, Casio, Royal, Panasonic, Fujitsu, Toshiba TEC</p>
                <p><strong>Modern POS:</strong> Square, Clover, Toast, Lightspeed, Shopify POS</p>
                <p><strong>Payment Terminals:</strong> Verifone, Ingenico, PAX, Sunmi, Newland</p>
                <p><strong>Printers:</strong> Epson, Star Micronics, Citizen, Bematech, Sam4s</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Connected Printers */}
      <Card className="border-2 border-[#8B4513]">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Printer className="h-5 w-5 text-[#8B4513]" />
              <span>Kitchen Printers ({printers.length})</span>
            </div>
            <div className="flex space-x-2">
              <Button 
                onClick={connectPrinters}
                disabled={isConnecting || printers.length === 0}
                size="sm"
                className="bg-[#8B4513] hover:bg-[#D2691E] text-white"
              >
                {isConnecting ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  'Connect All'
                )}
              </Button>
              <Button 
                onClick={handleTestPrint}
                disabled={isPrinting || printers.filter(p => p.connected).length === 0}
                size="sm"
                variant="outline"
                className="border-[#8B4513] text-[#8B4513]"
              >
                {isPrinting ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                    Printing...
                  </>
                ) : (
                  'Test Print'
                )}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {printers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Printer className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No printers configured</p>
              <p className="text-sm">Add a printer above to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {printers.map((printer) => (
                <div key={printer.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getConnectionIcon('usb')}
                    <div>
                      <div className="font-medium text-gray-800">{printer.name}</div>
                      <div className="text-sm text-gray-500">ID: {printer.id}</div>
                      {printer.lastPrint && (
                        <div className="text-xs text-gray-400">
                          Last print: {printer.lastPrint.toLocaleTimeString()}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {printer.connected ? (
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Connected
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <XCircle className="h-3 w-3 mr-1" />
                        Disconnected
                      </Badge>
                    )}
                    {printer.error && (
                      <Badge variant="outline" className="text-orange-600 border-orange-200">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        {printer.error}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="border-2 border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 text-red-800">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-medium">Error:</span>
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card className="border border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg">Setup Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-gray-600">
          <div>
            <strong>1. USB Printers:</strong> Connect your thermal printer via USB and click "Auto-detect" or select your specific model.
          </div>
          <div>
            <strong>2. Network Printers:</strong> Enter your printer's IP address (usually found in printer settings or network configuration).
          </div>
          <div>
            <strong>3. POS Integration:</strong> For Square, Clover, or other POS systems, select the appropriate option and follow system-specific setup.
          </div>
          <div>
            <strong>4. Testing:</strong> Use "Test Print" to verify your printer is working correctly before processing real orders.
          </div>
          <div>
            <strong>Note:</strong> Some browsers may require HTTPS for USB/Serial printer access. Network printers work in all browsers.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}