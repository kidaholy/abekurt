"use client";

import { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/protected-route";
import { useAuth } from "@/context/auth-context";
import { useLanguage } from "@/context/language-context";
import { useSettings } from "@/context/settings-context";
import { ReportExporter } from "@/lib/export-utils";
import {
  Printer,
  Download,
  ArrowLeft,
  Package,
  TrendingUp,
  DollarSign,
  TrendingDown,
  FileText,
} from "lucide-react";
import Link from "next/link";

interface StockItem {
  _id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  unitCost: number;
}

export default function NetWorthReportPage() {
  const [filter, setFilter] = useState("week");
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [periodData, setPeriodData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();
  const { t } = useLanguage();
  const { settings } = useSettings();

  useEffect(() => {
    if (token) {
      fetchReportData();
    }
  }, [token, filter]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      // Fetch Current Stock for Valuation
      const stockRes = await fetch("/api/stock", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (stockRes.ok) {
        const data = await stockRes.json();
        setStockItems(data);
      }

      // Fetch Period Sales & Expenses
      const salesRes = await fetch(`/api/reports/sales?period=${filter}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const usageRes = await fetch(
        `/api/reports/stock-usage?period=${filter}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (salesRes.ok && usageRes.ok) {
        const sales = await salesRes.json();
        const usage = await usageRes.json();
        console.log("Stock Usage Data:", usage); // Debug log
        console.log("Stock Analysis:", usage?.stockAnalysis); // Debug log
        setPeriodData({ sales, usage });
      }
    } catch (error) {
      console.error("Failed to fetch report data", error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate Net Worth Components (only when not loading)
  const totalRevenue = periodData?.sales?.summary?.totalRevenue || 0;
  const totalInvestment = periodData?.usage?.summary?.totalExpenses || 0;
  const totalPurchasedPrice =
    periodData?.usage?.summary?.totalPurchaseValue || 0;
  const totalOtherExpenses =
    periodData?.usage?.summary?.totalOtherExpenses || 0;

  // Net Worth = Revenue - Total Investment (Purchased Price + Other Expenses)
  // Group stock into categories for the formula
  const totalStockValue =
    stockItems && stockItems.length > 0
      ? stockItems.reduce(
        (acc, item) => acc + (item.quantity ?? 0) * (item.unitCost ?? 0),
        0
      )
      : 0;

  // Business Logic: Revenue - Investment - Physical Stock Value
  // 1. Total Investment (Primary Focus)
  const displayTotalInvestment = totalInvestment;

  // 2. Current Stock Asset Value
  const currentStockAssets = totalStockValue;

  // Net Worth = Revenue - Total Investment (including stock assets)
  const totalCompleteInvestment = displayTotalInvestment + totalStockValue;
  const netWorth = totalRevenue - totalCompleteInvestment;

  const exportNetWorthCSV = () => {
    const exportData = {
      title: "Net Worth Analysis Report",
      period: filter,
      headers: ["Component", "Type", "Amount (ብር)", "Description"],
      data: [
        {
          Component: "Revenue",
          Type: "Income",
          "Amount (ብር)": totalRevenue.toLocaleString(),
          Description: "Total sales revenue from orders",
        },
        {
          Component: "Total Investment",
          Type: "Expense",
          "Amount (ብር)": `-${totalCompleteInvestment.toLocaleString()}`,
          Description: "Total purchased price + other expenses + stock assets",
        },
        {
          Component: "Purchased Price",
          Type: "Investment",
          "Amount (ብር)": `-${totalPurchasedPrice.toLocaleString()}`,
          Description: "Cost of all purchased inventory items",
        },
        {
          Component: "Other Expenses",
          Type: "Expense",
          "Amount (ብር)": `-${totalOtherExpenses.toLocaleString()}`,
          Description: "Additional operational expenses",
        },
        {
          Component: "Net Worth",
          Type: "Result",
          "Amount (ብር)": netWorth.toLocaleString(),
          Description: "Revenue - Total Investment",
        },
      ],
      summary: {
        "Total Revenue": `${totalRevenue.toLocaleString()} ብር`,
        "Total Investment": `${totalCompleteInvestment.toLocaleString()} ብር`,
        "Purchased Price": `${totalPurchasedPrice.toLocaleString()} ብር`,
        "Other Expenses": `${totalOtherExpenses.toLocaleString()} ብር`,
        "Net Worth": `${netWorth.toLocaleString()} ብር`,
        "Profit Margin": `${totalRevenue > 0 ? ((netWorth / totalRevenue) * 100).toFixed(1) : 0
          }%`,
      },
    };

    ReportExporter.exportToCSV(exportData);
  };

  const exportNetWorthPDF = () => {
    const exportData = {
      title: "Net Worth Analysis Report",
      period: filter,
      headers: ["Component", "Type", "Amount", "Description"],
      data: [
        {
          Component: "Revenue",
          Type: "Income",
          Amount: `${totalRevenue.toLocaleString()} ብር`,
          Description: "Total sales revenue",
        },
        {
          Component: "Total Investment",
          Type: "Expense",
          Amount: `${totalCompleteInvestment.toLocaleString()} ብር`,
          Description: "Total purchased price + other expenses + stock assets",
        },
        {
          Component: "Purchased Price",
          Type: "Investment",
          Amount: `${totalPurchasedPrice.toLocaleString()} ብር`,
          Description: "Cost of all purchased inventory",
        },
      ],
      summary: {
        "Net Worth": `${netWorth.toLocaleString()} ብር`,
        "Profit Margin": `${totalRevenue > 0 ? ((netWorth / totalRevenue) * 100).toFixed(1) : 0
          }%`,
      },
    };

    ReportExporter.exportToPDF(exportData);
  };

  if (loading) {
    return (
      <ProtectedRoute requiredRoles={["admin"]}>
        <div className="min-h-screen bg-gray-50 p-8">
          <div className="max-w-7xl mx-auto">
            <div className="p-20 text-center">
              <div className="w-10 h-10 border-4 border-[#8B4513] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="font-bold text-gray-400">
                Loading Net Worth Analysis...
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
                Net Worth Analysis
              </h1>
              <p className="text-gray-500 font-medium mt-1">
                Comprehensive financial analysis: Revenue - Investment
              </p>
            </div>

            <div className="flex gap-4 items-center">
              {/* Period Filter */}
              <div className="flex gap-2 bg-white p-1.5 rounded-lg shadow-sm border">
                {["today", "week", "month", "year", "all"].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-4 py-2 rounded-md text-sm font-bold capitalize transition-all ${filter === f
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
                  onClick={exportNetWorthPDF}
                  className="bg-[#8B4513] text-white px-4 py-2 rounded-lg shadow-sm hover:bg-[#7A3D0F] transition-colors flex items-center gap-2"
                >
                  <FileText size={16} />
                  <span className="font-bold">PDF</span>
                </button>
                <button
                  onClick={exportNetWorthCSV}
                  className="bg-[#D2691E] text-white px-4 py-2 rounded-lg shadow-sm hover:bg-[#B8541A] transition-colors flex items-center gap-2"
                >
                  <Download size={16} />
                  <span className="font-bold">CSV</span>
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
              Net Worth Analysis Report
            </h1>
            <p className="text-sm">Period: {filter.toUpperCase()}</p>
            <p className="text-sm text-gray-500">
              Generated: {new Date().toLocaleString()}
            </p>
          </div>

          {/* Net Worth Formula */}
          <div className="bg-gradient-to-r from-[#8B4513] to-[#D2691E] rounded-lg p-8 text-white">
            <h2 className="text-lg font-bold mb-4">
              Net Worth Calculation Formula
            </h2>
            <div className="flex flex-wrap items-center gap-4 text-xl font-bold mb-4">
              <span className="bg-white/20 px-4 py-2 rounded-lg">Revenue</span>
              <span className="text-2xl">-</span>
              <span className="bg-white/20 px-4 py-2 rounded-lg">
                Total Investment
              </span>
              <span className="text-2xl">=</span>
              <span className="bg-white text-[#8B4513] px-6 py-3 rounded-lg font-black">
                {netWorth.toLocaleString()} ብር
              </span>
            </div>
            <p className="text-sm opacity-90">
              Net Worth represents the actual profit after accounting for all
              revenue and total investment including purchased price, expenses, and stock assets.
            </p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Revenue ({filter})
                  </p>
                  <p className="text-2xl font-bold text-green-600">
                    +{totalRevenue.toLocaleString()} ብር
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-green-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Total Investment ({filter})
                  </p>
                  <p className="text-2xl font-bold text-red-600">
                    -{totalCompleteInvestment.toLocaleString()} ብር
                  </p>
                </div>
                <TrendingDown className="w-8 h-8 text-red-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Total Stock Assets
                  </p>
                  <p className="text-2xl font-bold text-blue-600">
                    {totalStockValue.toLocaleString()} ብር
                  </p>
                </div>
                <Package className="w-8 h-8 text-blue-500" />
              </div>
            </div>

            <div
              className={`rounded-lg p-6 shadow-sm border ${netWorth >= 0
                ? "bg-green-50 border-green-200"
                : "bg-red-50 border-red-200"
                }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Final Net Worth ({filter})
                  </p>
                  <p
                    className={`text-2xl font-bold ${netWorth >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                  >
                    {netWorth.toLocaleString()} ብር
                  </p>
                </div>
                <TrendingUp
                  className={`w-8 h-8 ${netWorth >= 0 ? "text-green-500" : "text-red-500"
                    }`}
                />
              </div>
            </div>
          </div>

          {/* Main Order-Stock Value Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">Order-Stock Value Analysis</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Component</th>
                    <th className="text-center py-3 px-4 font-semibold text-sm text-gray-700">Type</th>
                    <th className="text-right py-3 px-4 font-semibold text-sm text-gray-700">Amount (ብር)</th>
                    <th className="text-center py-3 px-4 font-semibold text-sm text-gray-700">Percentage</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr className="hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-green-800">Total Revenue</td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">Income</span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-green-600">+{totalRevenue.toLocaleString()}</td>
                    <td className="py-3 px-4 text-center font-medium">100%</td>
                    <td className="py-3 px-4 text-sm text-gray-600">Total sales from {periodData?.sales?.summary?.totalOrders || 0} orders</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-red-800">Purchased Price</td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">Investment</span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-red-600">-{totalPurchasedPrice.toLocaleString()}</td>
                    <td className="py-3 px-4 text-center font-medium">
                      {totalRevenue > 0 ? ((totalPurchasedPrice / totalRevenue) * 100).toFixed(1) : 0}%
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">Cost of all purchased inventory items</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-orange-800">Other Expenses</td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">Expense</span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-orange-600">-{totalOtherExpenses.toLocaleString()}</td>
                    <td className="py-3 px-4 text-center font-medium">
                      {totalRevenue > 0 ? ((totalOtherExpenses / totalRevenue) * 100).toFixed(1) : 0}%
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">Additional operational expenses</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-blue-800">Stock Asset Value</td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">Investment</span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-blue-600">-{totalStockValue.toLocaleString()}</td>
                    <td className="py-3 px-4 text-center font-medium">
                      {totalRevenue > 0 ? ((totalStockValue / totalRevenue) * 100).toFixed(1) : 0}%
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">Current inventory investment value</td>
                  </tr>
                  <tr className="hover:bg-gray-50 border-t-2 border-gray-300">
                    <td className="py-3 px-4 font-bold text-gray-800">Total Investment</td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">Total</span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-gray-800">-{(displayTotalInvestment + totalStockValue).toLocaleString()}</td>
                    <td className="py-3 px-4 text-center font-medium">
                      {totalRevenue > 0 ? (((displayTotalInvestment + totalStockValue) / totalRevenue) * 100).toFixed(1) : 0}%
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">Purchased price + other expenses + stock assets</td>
                  </tr>
                </tbody>
                <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                  <tr>
                    <td className="py-4 px-4 font-bold text-lg text-gray-900">Net Worth</td>
                    <td className="py-4 px-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-sm font-bold ${netWorth >= 0
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                        }`}>
                        {netWorth >= 0 ? 'Profit' : 'Loss'}
                      </span>
                    </td>
                    <td className={`py-4 px-4 text-right font-bold text-xl ${netWorth >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                      {netWorth.toLocaleString()}
                    </td>
                    <td className="py-4 px-4 text-center font-bold">
                      {totalRevenue > 0 ? ((netWorth / totalRevenue) * 100).toFixed(1) : 0}%
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-600">
                      Revenue - Total Investment (including stock assets)
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Detailed Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Detailed Orders Summary */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-900">Orders Summary</h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <div>
                      <p className="font-medium text-green-800">Total Orders</p>
                      <p className="text-sm text-green-600">Completed transactions</p>
                    </div>
                    <p className="text-2xl font-bold text-green-600">{periodData?.sales?.summary?.totalOrders || 0}</p>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <div>
                      <p className="font-medium text-blue-800">Total Revenue</p>
                      <p className="text-sm text-blue-600">Sales income</p>
                    </div>
                    <p className="text-2xl font-bold text-blue-600">{totalRevenue.toLocaleString()} ብር</p>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                    <div>
                      <p className="font-medium text-purple-800">Average Order Value</p>
                      <p className="text-sm text-purple-600">Per transaction</p>
                    </div>
                    <p className="text-2xl font-bold text-purple-600">
                      {periodData?.sales?.summary?.totalOrders > 0
                        ? (totalRevenue / periodData.sales.summary.totalOrders).toFixed(0)
                        : 0} ብር
                    </p>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-800">Period</p>
                      <p className="text-sm text-gray-600">Analysis timeframe</p>
                    </div>
                    <p className="text-lg font-bold text-gray-600 uppercase">{filter}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed Stock Summary */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-900">Stock Summary</h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <div>
                      <p className="font-medium text-blue-800">Total Stock Items</p>
                      <p className="text-sm text-blue-600">Inventory count</p>
                    </div>
                    <p className="text-2xl font-bold text-blue-600">{stockItems.length}</p>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <div>
                      <p className="font-medium text-green-800">Total Stock Value</p>
                      <p className="text-sm text-green-600">Asset valuation</p>
                    </div>
                    <p className="text-2xl font-bold text-green-600">{totalStockValue.toLocaleString()} ብር</p>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                    <div>
                      <p className="font-medium text-red-800">Investment Cost</p>
                      <p className="text-sm text-red-600">Total purchased price</p>
                    </div>
                    <p className="text-2xl font-bold text-red-600">{totalPurchasedPrice.toLocaleString()} ብር</p>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                    <div>
                      <p className="font-medium text-orange-800">Other Expenses</p>
                      <p className="text-sm text-orange-600">Operational costs</p>
                    </div>
                    <p className="text-2xl font-bold text-orange-600">{totalOtherExpenses.toLocaleString()} ብር</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Inventory Investment Details Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">
                Inventory Investment Details
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">
                      Item Name
                    </th>
                    <th className="text-right py-3 px-4 font-semibold text-sm text-gray-700">
                      Unit Cost
                    </th>
                    <th className="text-center py-3 px-4 font-semibold text-sm text-gray-700">
                      Quantity
                    </th>
                    <th className="text-right py-3 px-4 font-semibold text-sm text-gray-700">
                      Total Purchase
                    </th>
                    <th className="text-center py-3 px-4 font-semibold text-sm text-gray-700">
                      Consumed
                    </th>
                    <th className="text-center py-3 px-4 font-semibold text-sm text-gray-700">
                      Remains
                    </th>
                    <th className="text-right py-3 px-4 font-semibold text-sm text-gray-700">
                      Potential Rev
                    </th>
                    <th className="text-center py-3 px-4 font-semibold text-sm text-gray-700">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {periodData?.usage?.stockAnalysis?.length > 0 ? (
                    periodData.usage.stockAnalysis
                      .filter((item: any) => item.openingStock > 0 || item.transferred > 0 || item.closingStock > 0 || item.consumed > 0)
                      .map((item: any, idx: number) => {
                        const totalHandled = (item.openingStock || 0) + (item.transferred || 0);
                        const remains = item.closingStock || 0;

                        return (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="py-3 px-4 font-medium text-gray-900">{item.name}</td>
                            <td className="py-3 px-4 text-right text-sm font-bold text-orange-600">
                              {(item.currentUnitCost || 0).toFixed(0)} ብር
                            </td>
                            <td className="py-3 px-4 text-center font-bold text-slate-800">
                              {totalHandled.toFixed(1)} <span className="text-xs text-gray-400 font-normal">{item.unit || "unit"}</span>
                            </td>
                            <td className="py-3 px-4 text-right font-bold text-green-600">
                              {(item.transferredValue || 0).toLocaleString()} ብር
                            </td>
                            <td className="py-3 px-4 text-center font-bold text-red-500">
                              {(item.consumed || 0).toFixed(1)} <span className="text-xs text-red-300 font-normal">Usage</span>
                            </td>
                            <td className="py-3 px-4 text-center font-bold text-slate-800">
                              {remains.toFixed(1)} <span className="text-xs text-gray-400 font-normal">{item.unit || "unit"}</span>
                            </td>
                            <td className="py-3 px-4 text-right font-bold text-blue-600">
                              {(item.closingValue || 0).toLocaleString()} ብር
                            </td>
                            <td className="py-3 px-4 text-center">
                              {item.isLowStock || remains <= (item.minLimit || 5) ? (
                                <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                                  Low Stock
                                </span>
                              ) : (
                                <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                                  OK
                                </span>
                              )}
                            </td>
                          </tr>
                        )
                      })
                  ) : (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-gray-500">
                        {loading ? "Loading inventory data..." : "No inventory data available for this period."}
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                  <tr>
                    <td colSpan={3} className="py-3 px-4 text-right font-bold text-gray-700">
                      Total Handled Value:
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-green-600">
                      {(periodData?.usage?.summary?.totalTransferredValue || 0).toLocaleString()} ብር
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-red-600">
                      {(periodData?.usage?.summary?.totalConsumedValue || 0).toLocaleString()} ብር
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-slate-800">
                      {(periodData?.usage?.summary?.totalClosingValue || totalStockValue || 0).toLocaleString()} ብር
                    </td>
                    <td className="py-3 px-4 text-right"></td>
                    <td className="py-3 px-4 text-center"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
