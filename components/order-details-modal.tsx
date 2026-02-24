"use client"

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useSettings } from '@/context/settings-context'
import { 
  X, 
  Calendar, 
  Clock, 
  User, 
  CreditCard, 
  ShoppingBag,
  MapPin,
  Phone,
  Mail,
  Receipt
} from 'lucide-react'

interface OrderDetailsModalProps {
  order: any
  isOpen: boolean
  onClose: () => void
}

export function OrderDetailsModal({ order, isOpen, onClose }: OrderDetailsModalProps) {
  const { settings } = useSettings()
  
  if (!isOpen || !order) return null

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'preparing':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const totalItems = order.items?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0
  const subtotal = order.items?.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0) || 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-[#8B4513]">Order Details</h2>
            <p className="text-gray-600">#{order.orderNumber}</p>
          </div>
          <Button onClick={onClose} variant="ghost" size="sm" className="rounded-full">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* Order Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-2 border-[#8B4513]/20">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <Calendar className="h-8 w-8 text-[#8B4513]" />
                  <div>
                    <p className="text-sm text-gray-600">Order Date</p>
                    <p className="font-bold text-gray-800">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(order.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-[#8B4513]/20">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <Receipt className="h-8 w-8 text-[#8B4513]" />
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <Badge className={`${getStatusColor(order.status)} border font-medium`}>
                      {order.status.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-[#8B4513]/20">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <CreditCard className="h-8 w-8 text-[#8B4513]" />
                  <div>
                    <p className="text-sm text-gray-600">Payment</p>
                    <p className="font-bold text-gray-800">{order.paymentMethod}</p>
                    <p className="text-xs text-gray-500">
                      {order.totalAmount} ብር
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Customer Information */}
          {(order.customerName || order.customerPhone || order.customerEmail || order.tableNumber) && (
            <Card className="border-2 border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5 text-[#8B4513]" />
                  <span>Customer Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {order.customerName && (
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-600">Name:</span>
                      <span className="font-medium">{order.customerName}</span>
                    </div>
                  )}
                  {order.customerPhone && (
                    <div className="flex items-center space-x-2">
                      <Phone className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-600">Phone:</span>
                      <span className="font-medium">{order.customerPhone}</span>
                    </div>
                  )}
                  {order.customerEmail && (
                    <div className="flex items-center space-x-2">
                      <Mail className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-600">Email:</span>
                      <span className="font-medium">{order.customerEmail}</span>
                    </div>
                  )}
                  {order.tableNumber && (
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-600">Table:</span>
                      <span className="font-medium">#{order.tableNumber}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Menu Items */}
          <Card className="border-2 border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <ShoppingBag className="h-5 w-5 text-[#8B4513]" />
                  <span>Menu Items ({totalItems} items)</span>
                </div>
                <Badge variant="outline" className="text-[#8B4513] border-[#8B4513]">
                  {order.items?.length || 0} different items
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.items?.map((item: any, index: number) => (
                  <div key={index} className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-bold text-lg text-gray-800">{item.name}</h4>
                        
                        {item.category && (
                          <Badge variant="outline" className="mt-2 text-xs">
                            {item.category}
                          </Badge>
                        )}
                        
                        {item.description && (
                          <p className="text-sm text-gray-600 mt-2">{item.description}</p>
                        )}
                        
                        {item.notes && (
                          <div className="mt-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
                            <p className="text-sm text-blue-800">
                              <strong>Special Instructions:</strong> {item.notes}
                            </p>
                          </div>
                        )}

                        {item.modifiers && item.modifiers.length > 0 && (
                          <div className="mt-2">
                            <p className="text-sm font-medium text-gray-700">Modifications:</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {item.modifiers.map((modifier: string, idx: number) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  + {modifier}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="text-right ml-4">
                        <div className="text-2xl font-bold text-[#8B4513]">×{item.quantity}</div>
                        <div className="text-sm text-gray-600 mt-1">
                          {item.price} ብር each
                        </div>
                        <div className="text-lg font-bold text-gray-800 mt-2 border-t border-gray-300 pt-2">
                          {(item.price * item.quantity).toFixed(2)} ብር
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Order Totals */}
              <div className="mt-6 border-t border-gray-300 pt-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal ({totalItems} items):</span>
                    <span className="font-medium">{subtotal.toFixed(2)} ብር</span>
                  </div>
                  
                  {order.tax && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Tax:</span>
                      <span className="font-medium">{order.tax} ብር</span>
                    </div>
                  )}
                  
                  {order.discount && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Discount:</span>
                      <span className="font-medium">-{order.discount} ብር</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between text-lg font-bold text-[#8B4513] border-t border-gray-300 pt-2">
                    <span>Total Amount:</span>
                    <span>{order.totalAmount} ብር</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Special Instructions */}
          {order.specialInstructions && (
            <Card className="border-2 border-orange-200 bg-orange-50">
              <CardHeader>
                <CardTitle className="text-orange-800">Special Instructions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-orange-700">{order.specialInstructions}</p>
              </CardContent>
            </Card>
          )}

          {/* Order Timeline */}
          {order.timeline && order.timeline.length > 0 && (
            <Card className="border-2 border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-[#8B4513]" />
                  <span>Order Timeline</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {order.timeline.map((event: any, index: number) => (
                    <div key={index} className="flex items-center space-x-3 p-2 rounded-lg bg-gray-50">
                      <div className="w-2 h-2 bg-[#8B4513] rounded-full"></div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-800">{event.action}</p>
                        <p className="text-sm text-gray-600">
                          {new Date(event.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
          <Button onClick={onClose} variant="outline" className="border-[#8B4513] text-[#8B4513]">
            Close
          </Button>
          <Button 
            onClick={() => window.print()} 
            className="bg-[#8B4513] hover:bg-[#D2691E] text-white"
          >
            Print Order
          </Button>
        </div>
      </div>
    </div>
  )
}