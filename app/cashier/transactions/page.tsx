"use client"

import { useEffect, useState } from "react"
import { ProtectedRoute } from "@/components/protected-route"
import { BentoNavbar } from "@/components/bento-navbar"
import { useAuth } from "@/context/auth-context"
import { useLanguage } from "@/context/language-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, TrendingUp, Receipt, RefreshCw } from 'lucide-react'

interface Order {
  _id: string
  orderNumber: string
  totalAmount: number
  paymentStatus: string
  paymentMethod: string
  status: string
  tableNumber: string
  createdAt: string
  distributions?: string[]
  distribution?: string
}

export default function TransactionsPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const { token } = useAuth()
  const { t } = useLanguage()

  useEffect(() => {
    fetchOrders()
  }, [token])

  const fetchOrders = async () => {
    try {
      const response = await fetch("/api/orders", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        setOrders(await response.json())
      }
    } catch (err) {
      console.error("Failed to load orders")
    } finally {
      setLoading(false)
    }
  }

  const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0)
  const avgTransaction = totalRevenue / (orders.length || 1)

  return (
    <ProtectedRoute requiredRoles={["admin"]}>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <BentoNavbar />

          {/* Header */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-50 rounded-lg">
                  <Receipt className="h-8 w-8 text-purple-600" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Transactions</h1>
                  <p className="text-sm text-gray-600 mt-1">Complete transaction history</p>
                </div>
              </div>
              <button
                onClick={fetchOrders}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <RefreshCw className="h-5 w-5 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border border-gray-200">
              <CardContent className="p-6">
                <div className="inline-flex p-3 rounded-lg bg-green-50 text-green-600 mb-4">
                  <DollarSign className="h-6 w-6" />
                </div>
                <p className="text-sm font-medium text-gray-600">Total Sales</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {totalRevenue.toFixed(0)} ETB
                </p>
              </CardContent>
            </Card>

            <Card className="border border-gray-200">
              <CardContent className="p-6">
                <div className="inline-flex p-3 rounded-lg bg-blue-50 text-blue-600 mb-4">
                  <Receipt className="h-6 w-6" />
                </div>
                <p className="text-sm font-medium text-gray-600">Volume</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{orders.length}</p>
              </CardContent>
            </Card>

            <Card className="border border-gray-200">
              <CardContent className="p-6">
                <div className="inline-flex p-3 rounded-lg bg-purple-50 text-purple-600 mb-4">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <p className="text-sm font-medium text-gray-600">Average Ticket</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {avgTransaction.toFixed(0)} ETB
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Transaction Log */}
          <Card className="border border-gray-200">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-gray-900">Transaction Log</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <RefreshCw className="h-12 w-12 animate-spin text-gray-400 mb-4" />
                  <p className="text-gray-600">Loading transactions...</p>
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-20">
                  <Receipt className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">No transactions found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Order #</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Table</th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Amount</th>
                        <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Payment</th>
                        <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Date/Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((order) => (
                        <tr key={order._id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="py-4 px-4">
                            <span className="text-sm font-medium text-gray-900">#{order.orderNumber}</span>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <span className="text-sm font-medium text-blue-600">Table {order.tableNumber}</span>
                            {((order.distributions && order.distributions.length > 0) || order.distribution) && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {order.distributions && order.distributions.length > 0 ? (
                                  order.distributions.map((d, i) => (
                                    <span key={i} className="text-[9px] font-black text-[#2d5a41] bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 uppercase tracking-tighter">
                                      {d}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-[9px] font-black text-[#2d5a41] bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 uppercase tracking-tighter">
                                    {order.distribution}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="py-4 px-4 text-right">
                            <span className="text-sm font-bold text-gray-900">{order.totalAmount.toFixed(2)} ETB</span>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${order.paymentStatus === 'paid'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-gray-100 text-gray-600'
                              }`}>
                              {order.paymentMethod || order.paymentStatus || 'pending'}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${order.status === 'completed'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-orange-100 text-orange-700'
                              }`}>
                              {order.status}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <div className="text-sm text-gray-600">
                              {new Date(order.createdAt).toLocaleDateString()}
                            </div>
                            <div className="text-xs text-gray-400">
                              {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  )
}
