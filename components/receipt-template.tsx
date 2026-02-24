"use client"

import React from "react"

interface ReceiptItem {
  menuId?: string
  name: string
  quantity: number
  price: number
}

interface ReceiptTemplateProps {
  orderNumber: string
  tableNumber: string
  items: ReceiptItem[]
  subtotal: number
  tax: number
  total: number
  date?: Date
  paperWidth?: number
  appName?: string
  appTagline?: string
  vatRate?: string
}

export const getReceiptHTML = ({
  orderNumber,
  tableNumber,
  items,
  subtotal,
  tax,
  total,
  date = new Date(),
  paperWidth = 80,
  appName = "PRIME ADDIS",
  appTagline = "Coffee & More",
  vatRate = "0.08"
}: ReceiptTemplateProps) => {
  const widthStr = `${paperWidth}mm`
  const vatPercent = (parseFloat(vatRate) * 100).toFixed(0)

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          @page {
            margin: 0;
            size: ${widthStr} auto;
          }
          html, body {
            margin: 0;
            padding: 0;
            width: ${widthStr};
            height: auto !important;
            overflow: hidden !important;
            font-family: 'Courier New', Courier, monospace;
            background: white;
            color: black;
          }
          .receipt {
            padding: 4mm;
            box-sizing: border-box;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .font-bold { font-weight: bold; }
          .uppercase { text-transform: uppercase; }
          .mb-1 { margin-bottom: 0.25rem; }
          .mb-4 { margin-bottom: 1rem; }
          .my-2 { margin-top: 0.5rem; margin-bottom: 0.5rem; }
          .border-b { border-bottom: 1px solid black; }
          .border-dashed { border-style: dashed; }
          .flex { display: flex; }
          .justify-between { justify-content: space-between; }
          table { width: 100%; border-collapse: collapse; }
          th, td { padding: 4px 0; font-size: 12px; }
          .total-row { font-size: 16px; margin-top: 8px; border-top: 1px solid black; padding-top: 8px; }
          .footer { margin-top: 20px; text-align: center; font-size: 10px; }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="text-center mb-4">
            <h1 style="margin:0; font-size: 20px;" class="uppercase">${appName}</h1>
            <p style="margin:5px 0 0 0; font-size: 12px;">${appTagline}</p>
            <div class="border-b border-dashed my-2"></div>
          </div>

          <div class="mb-4" style="font-size: 12px;">
            <div class="flex justify-between">
              <span>Order #:</span>
              <span class="font-bold">${orderNumber}</span>
            </div>
            <div class="flex justify-between">
              <span>Date:</span>
              <span>${date.toLocaleString()}</span>
            </div>
            <div class="flex justify-between">
              <span>Table:</span>
              <span class="font-bold">${tableNumber || "N/A"}</span>
            </div>
          </div>

          <div class="border-b border-dashed my-2"></div>

          <table>
            <thead>
              <tr class="border-b">
                <th class="text-left">Item</th>
                <th class="text-center">Qty</th>
                <th class="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(item => `
                <tr>
                  <td style="line-height: 1.2;">
                    ${item.menuId ? `#${item.menuId} ` : ""}${item.name}<br/>
                    <small>@${item.price.toFixed(0)} ETB</small>
                  </td>
                  <td class="text-center">${item.quantity}</td>
                  <td class="text-right font-bold">${(item.quantity * item.price).toFixed(0)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div style="margin-top: 10px; font-size: 12px;">
            <div class="flex justify-between">
              <span>Subtotal:</span>
              <span>${subtotal.toFixed(0)} ETB</span>
            </div>
            <div class="flex justify-between">
              <span>VAT (${vatPercent}%):</span>
              <span>${tax.toFixed(0)} ETB</span>
            </div>
            <div class="flex justify-between total-row font-bold">
              <span>TOTAL:</span>
              <span>${total.toFixed(0)} ETB</span>
            </div>
          </div>

          <div class="footer">
            <div class="border-b border-dashed mb-4"></div>
            <p class="font-bold uppercase mb-1">Thank You!</p>
            <p>Please visit us again</p>
            <p style="margin-top: 15px; opacity: 0.5;">Powered by Prime Addis POS</p>
          </div>
          <div style="height: 30px;"></div>
        </div>
      </body>
    </html>
  `
}

// Keep the component for backward compatibility if needed, 
// but we will primarily use the HTML string for iframe printing.
export const ReceiptTemplate = ({ orderNumber, tableNumber, items, subtotal, tax, total, paperWidth = 80 }: any) => {
  return null // We'll move the actual printing logic to the useReceiptPrint hook or function
}
