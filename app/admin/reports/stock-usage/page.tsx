"use client";

import { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/protected-route";
import { useAuth } from "@/context/auth-context";
import { useLanguage } from "@/context/language-context";
import { ReportExporter } from "@/lib/export-utils";
import {
  Printer,
  Download,
  ArrowLeft,
  Package,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock,
  DollarSign,
  ShoppingCart,
  FileText,
  Calendar,
} from "lucide-react";
import Link from "next/link";

interface StockAnalysisItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  openingStock: number;
  purchased: number;
  consumed: number;
  adjustments: number;
  closingStock: number;
  currentUnitCost: number;
  weightedAvgCost: number;
  openingValue: number;
  purchaseValue: number;
  consumedValue: number;
  closingValue: number;
  costOfGoodsSold: number;
  usageVelocity: number;
  daysUntilStockOut: number | null;
  stockOutIncidents: number;
  isLowStock: boolean;
  isNearStockOut: boolean;
  minLimit: number;
  status: string;
  supplier: string;
  lastUpdated: string;
}

export default function StockUsageReportPage() {
  const [filter, setFilter] = useState("week");
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();
  const { t } = useLanguage();

  useEffect(() => {
    if (token) {
      fetchReportData();
    }
  }, [token, filter]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/reports/stock-usage?period=${filter}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (response.ok) {
        const data = await response.json();
        setReportData(data);
      }
    } catch (error) {
      console.error("Failed to fetch stock usage report", error);
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    if (!reportData) return;

    const csvData = {
      title: "Stock Usage Report - Inventory Movement Analysis",
      period: `${filter.toUpperCase()} (${new Date(
        reportData.startDate
      ).toLocaleDateString()} - ${new Date(
        reportData.endDate
      ).toLocaleDateString()})`,
      headers: [
        "Item Name",
        "Unit",
        "Opening Stock",
        "Restocked",
        "Sold",
        "Adjustments",
        "Closing Stock",
        "Unit Cost",
        "Total Value",
        "Usage Velocity",
        "Days Until Stock-Out",
        "Status",
      ],
      data: reportData.stockAnalysis.map((item: StockAnalysisItem) => ({
        "Item Name": item.name,
        Unit: item.unit,
        "Opening Stock": item.openingStock,
        Restocked: item.purchased,
        Sold: item.consumed,
        Adjustments: item.adjustments,
        "Closing Stock": item.closingStock,
        "Unit Cost": `${item.currentUnitCost} ብር`,
        "Total Value": `${item.closingValue.toLocaleString()} ብር`,
        "Usage Velocity": `${item.usageVelocity}/${reportData.periodDays}d`,
        "Days Until Stock-Out": item.daysUntilStockOut || "N/A",
        Status: item.isLowStock
          ? "LOW STOCK"
          : item.isNearStockOut
          ? "NEAR STOCK-OUT"
          : "OK",
      })),
      summary: {
        "Total Opening Value": `${reportData.summary.totalOpeningValue.toLocaleString()} ብር`,
        "Total Purchased Price": `${reportData.summary.totalPurchaseValue.toLocaleString()} ብር`,
        "Total Other Expenses": `${reportData.summary.totalOtherExpenses.toLocaleString()} ብር`,
        "Total Investment": `${reportData.summary.totalExpenses.toLocaleString()} ብር`,
        "Total Consumed (COGS)": `${reportData.summary.totalConsumedValue.toLocaleString()} ብር`,
        "Total Closing Value": `${reportData.summary.totalClosingValue.toLocaleString()} ብር`,
        "Gross Profit": `${reportData.summary.grossProfit.toLocaleString()} ብር`,
        "Gross Profit Margin": `${reportData.summary.grossProfitMargin.toFixed(
          1
        )}%`,
        "Net Profit": `${reportData.summary.netProfit.toLocaleString()} ብር`,
        "Net Profit Margin": `${reportData.summary.netProfitMargin.toFixed(
          1
        )}%`,
      },
    };

    ReportExporter.exportToCSV(csvData);
  };

  const exportPDF = () => {
    if (!reportData) return;

    const pdfData = {
      title: "Stock Usage Report - Complete Inventory Analysis",
      period: `${filter.toUpperCase()} (${new Date(
        reportData.startDate
      ).toLocaleDateString()} - ${new Date(
        reportData.endDate
      ).toLocaleDateString()})`,
      headers: [
        "Item",
        "Unit",
        "Opening",
        "Purchased",
        "Consumed",
        "Closing",
        "Value",
      ],
      data: reportData.stockAnalysis
        .slice(0, 20)
        .map((item: StockAnalysisItem) => ({
          Item: item.name,
          Unit: item.unit,
          Opening: item.openingStock.toString(),
          Purchased: item.purchased.toString(),
          Consumed: item.consumed.toString(),
          Closing: item.closingStock.toString(),
          Value: `${item.closingValue.toLocaleString()} ብር`,
        })),
      summary: {
        "Total Orders Processed": reportData.summary.totalOrders.toString(),
        "Total Revenue": `${reportData.summary.totalRevenue.toLocaleString()} ብር`,
        "Total Investment": `${reportData.summary.totalExpenses.toLocaleString()} ብር`,
        "Purchased Price": `${reportData.summary.totalPurchaseValue.toLocaleString()} ብር`,
        "Other Expenses": `${reportData.summary.totalOtherExpenses.toLocaleString()} ብር`,
        "Cost of Goods Sold": `${reportData.summary.totalConsumedValue.toLocaleString()} ብር`,
        "Gross Profit": `${reportData.summary.grossProfit.toLocaleString()} ብር (${reportData.summary.grossProfitMargin.toFixed(
          1
        )}%)`,
        "Net Profit": `${reportData.summary.netProfit.toLocaleString()} ብር (${reportData.summary.netProfitMargin.toFixed(
          1
        )}%)`,
        "Low Stock Alerts": `${reportData.summary.lowStockItemsCount} items`,
        "Near Stock-Out Alerts": `${reportData.summary.nearStockOutItemsCount} items`,
      },
    };

    ReportExporter.exportToPDF(pdfData);
  };

  if (loading) {
    return (
      <ProtectedRoute requiredRoles={["admin"]}>
        <div className="min-h-screen bg-gray-50 p-8">
          <div className="max-w-7xl mx-auto">
            <div className="p-20 text-center">
              <div className="w-10 h-10 border-4 border-[#8B4513] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="font-bold text-gray-400">
                Loading Stock Usage Report...
              </p>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRoles={["admin"]}>
      <div className="min-h-screen bg-gray-50 p-8 font-sans print:bg-white print:p-0">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
            <div>
              <Link
                href="/admin/reports"
                className="flex items-center gap-2 text-gray-400 hover:text-[#8B4513] font-bold mb-2 transition-colors"
              >
                <ArrowLeft size={16} /> Back to Reports
              </Link>
              <h1 className="text-3xl font-black text-slate-900">
                Stock Usage Report
              </h1>
              <p className="text-gray-500 font-medium mt-1">
                Complete inventory movement analysis from delivery to customer
                plate
              </p>
            </div>

            <div className="flex gap-4 items-center">
              {/* Period Filter */}
              <div className="flex gap-2 bg-white p-1.5 rounded-lg shadow-sm border">
                {["today", "week", "month", "year"].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-4 py-2 rounded-md text-sm font-bold capitalize transition-all ${
                      filter === f
                        ? "bg-[#8B4513] text-white shadow-md"
                        : "text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>

              {/* Export Options */}
              <div className="flex gap-2">
                <button
                  onClick={exportCSV}
                  className="bg-[#D2691E] text-white px-4 py-2 rounded-lg shadow-sm hover:bg-[#B8541A] transition-colors flex items-center gap-2"
                >
                  <Download size={16} />
                  <span className="font-bold">CSV</span>
                </button>
                <button
                  onClick={exportPDF}
                  className="bg-[#8B4513] text-white px-4 py-2 rounded-lg shadow-sm hover:bg-[#7A3D0F] transition-colors flex items-center gap-2"
                >
                  <FileText size={16} />
                  <span className="font-bold">PDF</span>
                </button>
                <button
                  onClick={() => window.print()}
                  className="bg-white text-[#8B4513] px-4 py-2 rounded-lg shadow-sm hover:bg-gray-50 transition-colors border border-gray-200"
                >
                  <Printer size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Print Header */}
          <div className="hidden print:block mb-8">
            <h1 className="text-2xl font-black mb-2">
              Stock Usage Report - Inventory Movement Analysis
            </h1>
            <p className="text-sm">
              Period: {filter.toUpperCase()} |{" "}
              {new Date(reportData?.startDate).toLocaleDateString()} -{" "}
              {new Date(reportData?.endDate).toLocaleDateString()}
            </p>
            <p className="text-sm text-gray-500">
              Generated: {new Date().toLocaleString()}
            </p>
          </div>

          {reportData && (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">
                        Total Inventory Value
                      </p>
                      <p className="text-2xl font-bold text-blue-600">
                        {reportData.summary.totalClosingValue.toLocaleString()}{" "}
                        ብር
                      </p>
                    </div>
                    <Package className="w-8 h-8 text-blue-500" />
                  </div>
                </div>

                <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">
                        Total Investment
                      </p>
                      <p className="text-2xl font-bold text-red-600">
                        {reportData.summary.totalExpenses.toLocaleString()} ብር
                      </p>
                    </div>
                    <TrendingDown className="w-8 h-8 text-red-500" />
                  </div>
                </div>

                <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">
                        Net Profit
                      </p>
                      <p className="text-2xl font-bold text-green-600">
                        {reportData.summary.netProfit.toLocaleString()} ብር
                      </p>
                    </div>
                    <DollarSign className="w-8 h-8 text-green-500" />
                  </div>
                </div>

                <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">
                        Cost of Goods Sold
                      </p>
                      <p className="text-2xl font-bold text-orange-600">
                        {reportData.summary.totalConsumedValue.toLocaleString()}{" "}
                        ብር
                      </p>
                    </div>
                    <ShoppingCart className="w-8 h-8 text-orange-500" />
                  </div>
                </div>

                <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">
                        Stock Alerts
                      </p>
                      <p className="text-2xl font-bold text-gray-600">
                        {reportData.summary.lowStockItemsCount +
                          reportData.summary.nearStockOutItemsCount}
                      </p>
                    </div>
                    <AlertTriangle className="w-8 h-8 text-gray-500" />
                  </div>
                </div>
              </div>

              {/* Investment Summary */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-bold text-gray-900">
                    Investment & Expense Summary
                  </h3>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-center">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <p className="text-2xl font-bold text-blue-600">
                        {reportData.summary.totalOpeningValue.toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-500">
                        Opening Value (ብር)
                      </p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg">
                      <p className="text-2xl font-bold text-green-600">
                        {reportData.summary.totalPurchaseValue.toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-500">
                        Purchased Price (ብር)
                      </p>
                    </div>
                    <div className="p-4 bg-yellow-50 rounded-lg">
                      <p className="text-2xl font-bold text-yellow-600">
                        {reportData.summary.totalOtherExpenses.toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-500">
                        Other Expenses (ብር)
                      </p>
                    </div>
                    <div className="p-4 bg-red-50 rounded-lg">
                      <p className="text-2xl font-bold text-red-600">
                        {reportData.summary.totalExpenses.toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-500">
                        Total Investment (ብር)
                      </p>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-lg">
                      <p className="text-2xl font-bold text-purple-600">
                        {reportData.summary.totalClosingValue.toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-500">
                        Closing Value (ብር)
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stock Analysis Table */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-bold text-gray-900">
                    Detailed Stock Analysis
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">
                          Item Name
                        </th>
                        <th className="text-center py-3 px-4 font-semibold text-sm text-gray-700">
                          Unit
                        </th>
                        <th className="text-center py-3 px-4 font-semibold text-sm text-gray-700">
                          Opening
                        </th>
                        <th className="text-center py-3 px-4 font-semibold text-sm text-gray-700">
                          Restocked
                        </th>
                        <th className="text-center py-3 px-4 font-semibold text-sm text-gray-700">
                          Sold
                        </th>
                        <th className="text-center py-3 px-4 font-semibold text-sm text-gray-700">
                          Remaining
                        </th>
                        <th className="text-center py-3 px-4 font-semibold text-sm text-gray-700">
                          Unit Cost
                        </th>
                        <th className="text-right py-3 px-4 font-semibold text-sm text-gray-700">
                          Total Value
                        </th>
                        <th className="text-center py-3 px-4 font-semibold text-sm text-gray-700">
                          Velocity
                        </th>
                        <th className="text-center py-3 px-4 font-semibold text-sm text-gray-700">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {reportData.stockAnalysis.map(
                        (item: StockAnalysisItem, idx: number) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-3 h-3 rounded-full ${
                                    item.status === "finished"
                                      ? "bg-red-500"
                                      : item.isLowStock
                                      ? "bg-orange-500"
                                      : "bg-green-500"
                                  }`}
                                />
                                <div>
                                  <p className="font-medium text-sm text-gray-900">
                                    {item.name}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {item.category}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-center text-sm text-gray-600">
                              {item.unit}
                            </td>
                            <td className="py-3 px-4 text-center text-sm font-medium">
                              {item.openingStock}
                            </td>
                            <td className="py-3 px-4 text-center text-sm font-medium text-green-600">
                              +{item.purchased}
                            </td>
                            <td className="py-3 px-4 text-center text-sm font-medium text-red-600">
                              -{item.consumed}
                            </td>
                            <td className="py-3 px-4 text-center text-sm font-medium">
                              {item.closingStock}
                            </td>
                            <td className="py-3 px-4 text-center text-sm">
                              {item.currentUnitCost} ብር
                            </td>
                            <td className="py-3 px-4 text-right text-sm font-medium">
                              {item.closingValue.toLocaleString()} ብር
                            </td>
                            <td className="py-3 px-4 text-center text-sm">
                              {item.usageVelocity.toFixed(1)}/
                              {reportData.periodDays}d
                            </td>
                            <td className="py-3 px-4 text-center">
                              {item.isLowStock ? (
                                <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                                  LOW STOCK
                                </span>
                              ) : item.isNearStockOut ? (
                                <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
                                  NEAR OUT
                                </span>
                              ) : (
                                <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                                  OK
                                </span>
                              )}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                    <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                      <tr>
                        <td
                          colSpan={7}
                          className="py-3 px-4 text-right font-bold text-gray-700"
                        >
                          Total Inventory Value:
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-lg text-blue-600">
                          {reportData.summary.totalClosingValue.toLocaleString()}{" "}
                          ብር
                        </td>
                        <td colSpan={2}></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Alerts Section */}
              {(reportData.alerts.lowStockItems.length > 0 ||
                reportData.alerts.nearStockOutItems.length > 0) && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Low Stock Items */}
                  {reportData.alerts.lowStockItems.length > 0 && (
                    <div className="bg-white rounded-lg shadow-sm border border-red-200">
                      <div className="px-6 py-4 border-b border-red-200 bg-red-50">
                        <h3 className="text-lg font-bold text-red-800 flex items-center gap-2">
                          <AlertTriangle size={20} />
                          Low Stock Alerts
                        </h3>
                      </div>
                      <div className="p-6 space-y-3">
                        {reportData.alerts.lowStockItems.map(
                          (item: any, idx: number) => (
                            <div
                              key={idx}
                              className="flex justify-between items-center p-3 bg-red-50 rounded-lg border border-red-200"
                            >
                              <div>
                                <p className="font-medium text-red-800">
                                  {item.name}
                                </p>
                                <p className="text-sm text-red-600">
                                  Below minimum limit
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-red-600">
                                  {item.currentStock} {item.unit}
                                </p>
                                <p className="text-xs text-red-500">
                                  Min: {item.minLimit}
                                </p>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}

                  {/* Near Stock-Out Items */}
                  {reportData.alerts.nearStockOutItems.length > 0 && (
                    <div className="bg-white rounded-lg shadow-sm border border-orange-200">
                      <div className="px-6 py-4 border-b border-orange-200 bg-orange-50">
                        <h3 className="text-lg font-bold text-orange-800 flex items-center gap-2">
                          <Clock size={20} />
                          Near Stock-Out
                        </h3>
                      </div>
                      <div className="p-6 space-y-3">
                        {reportData.alerts.nearStockOutItems.map(
                          (item: any, idx: number) => (
                            <div
                              key={idx}
                              className="flex justify-between items-center p-3 bg-orange-50 rounded-lg border border-orange-200"
                            >
                              <div>
                                <p className="font-medium text-orange-800">
                                  {item.name}
                                </p>
                                <p className="text-sm text-orange-600">
                                  Will run out soon
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-orange-600">
                                  {item.currentStock} {item.unit}
                                </p>
                                <p className="text-xs text-orange-500">
                                  {item.daysUntilStockOut} days left
                                </p>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
