// Export utilities for reports with PDF, CSV, and Word generation
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, AlignmentType, WidthType, BorderStyle } from 'docx'

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF
  }
}

export interface ExportData {
  title: string
  period: string
  data: any[]
  headers: string[]
  summary?: Record<string, any>
  metadata?: Record<string, any>
}

export interface ComprehensiveSection {
  title: string
  summary?: Record<string, any>
  headers?: string[]
  data?: any[]
  content?: string[]
}

export interface ComprehensiveExportData {
  title: string
  period: string
  sections: ComprehensiveSection[]
  metadata?: Record<string, any>
}

export class ReportExporter {
  static exportToCSV(exportData: ExportData) {
    const { title, period, data, headers, summary } = exportData

    // Create CSV content
    let csvContent = `${title} - ${period.toUpperCase()}\n`
    csvContent += `Generated: ${new Date().toLocaleString()}\n\n`

    // Add summary if provided
    if (summary) {
      csvContent += 'SUMMARY\n'
      Object.entries(summary).forEach(([key, value]) => {
        csvContent += `${key},${value}\n`
      })
      csvContent += '\n'
    }

    // Add headers
    csvContent += headers.join(',') + '\n'

    // Add data rows
    data.forEach(row => {
      const csvRow = headers.map(header => {
        const value = row[header] || ''
        // Escape commas and quotes
        return typeof value === 'string' && value.includes(',')
          ? `"${value.replace(/"/g, '""')}"`
          : value
      })
      csvContent += csvRow.join(',') + '\n'
    })

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${title.toLowerCase().replace(/\s+/g, '-')}-${period}-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  static exportToPDF(exportData: ExportData) {
    const { title, period, data, headers, summary, metadata } = exportData

    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.width

    // Header
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text(title, pageWidth / 2, 20, { align: 'center' })

    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text(`Period: ${period.toUpperCase()}`, pageWidth / 2, 30, { align: 'center' })
    doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 40, { align: 'center' })

    let yPosition = 50

    // Summary section
    if (summary) {
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text('Summary', 20, yPosition)
      yPosition += 10

      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      Object.entries(summary).forEach(([key, value]) => {
        doc.text(`${key}: ${value}`, 20, yPosition)
        yPosition += 6
      })
      yPosition += 10
    }

    // Data table
    const tableData = data.map(row =>
      headers.map(header => row[header] || '')
    )

    // Use autoTable plugin
    const autoTable = (doc as any).autoTable
    if (autoTable) {
      autoTable({
        head: [headers],
        body: tableData,
        startY: yPosition,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [139, 69, 19] }, // Beef brown color
        alternateRowStyles: { fillColor: [245, 245, 245] }
      })
    }

    // Footer - simplified without getNumberOfPages
    doc.setFontSize(8)
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, 20, doc.internal.pageSize.height - 10)
    if (metadata?.companyName) {
      doc.text(metadata.companyName, pageWidth - 60, doc.internal.pageSize.height - 10)
    }

    // Download
    doc.save(`${title.toLowerCase().replace(/\s+/g, '-')}-${period}-${new Date().toISOString().split('T')[0]}.pdf`)
  }

  static exportToWord(exportData: ExportData) {
    const { title, period, data, headers, summary, metadata } = exportData

    // Create document sections
    const children: (Paragraph | Table)[] = []

    // Title
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: title,
            bold: true,
            size: 32,
            font: {
              name: "Noto Sans Ethiopic",
              cs: "Noto Sans Ethiopic",
              ascii: "Noto Sans Ethiopic",
              hAnsi: "Noto Sans Ethiopic"
            },
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      })
    )

    // Period and generation info
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Period: ${period.toUpperCase()}`,
            size: 24,
            font: {
              name: "Noto Sans Ethiopic",
              cs: "Noto Sans Ethiopic",
              ascii: "Noto Sans Ethiopic",
              hAnsi: "Noto Sans Ethiopic"
            },
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
      })
    )

    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Generated: ${new Date().toLocaleString()}`,
            size: 20,
            font: {
              name: "Noto Sans Ethiopic",
              cs: "Noto Sans Ethiopic",
              ascii: "Noto Sans Ethiopic",
              hAnsi: "Noto Sans Ethiopic"
            },
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 300 },
      })
    )

    // Summary section
    if (summary) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "Summary",
              bold: true,
              size: 28,
              font: {
                name: "Noto Sans Ethiopic",
                cs: "Noto Sans Ethiopic",
                ascii: "Noto Sans Ethiopic",
                hAnsi: "Noto Sans Ethiopic"
              },
            }),
          ],
          spacing: { after: 200 },
        })
      )

      // Create summary table
      const summaryRows = Object.entries(summary).map(([key, value]) =>
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({
                children: [new TextRun({
                  text: key, bold: true, font: {
                    name: "Noto Sans Ethiopic",
                    cs: "Noto Sans Ethiopic",
                    ascii: "Noto Sans Ethiopic",
                    hAnsi: "Noto Sans Ethiopic"
                  }
                })],
              })],
              width: { size: 40, type: WidthType.PERCENTAGE },
            }),
            new TableCell({
              children: [new Paragraph({
                children: [new TextRun({
                  text: String(value), font: {
                    name: "Noto Sans Ethiopic",
                    cs: "Noto Sans Ethiopic",
                    ascii: "Noto Sans Ethiopic",
                    hAnsi: "Noto Sans Ethiopic"
                  }
                })],
              })],
              width: { size: 60, type: WidthType.PERCENTAGE },
            }),
          ],
        })
      )

      children.push(
        new Table({
          rows: summaryRows,
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1 },
            bottom: { style: BorderStyle.SINGLE, size: 1 },
            left: { style: BorderStyle.SINGLE, size: 1 },
            right: { style: BorderStyle.SINGLE, size: 1 },
            insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
            insideVertical: { style: BorderStyle.SINGLE, size: 1 },
          },
        })
      )

      children.push(
        new Paragraph({
          children: [new TextRun({ text: "" })],
          spacing: { after: 300 },
        })
      )
    }

    // Data section
    if (data.length > 0) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "Data",
              bold: true,
              size: 28,
              font: {
                name: "Noto Sans Ethiopic",
                cs: "Noto Sans Ethiopic",
                ascii: "Noto Sans Ethiopic",
                hAnsi: "Noto Sans Ethiopic"
              },
            }),
          ],
          spacing: { after: 200 },
        })
      )

      // Create header row
      const headerRow = new TableRow({
        children: headers.map(header =>
          new TableCell({
            children: [new Paragraph({
              children: [new TextRun({
                text: header, bold: true, font: {
                  name: "Noto Sans Ethiopic",
                  cs: "Noto Sans Ethiopic",
                  ascii: "Noto Sans Ethiopic",
                  hAnsi: "Noto Sans Ethiopic"
                }
              })],
              alignment: AlignmentType.CENTER,
            })],
            shading: { fill: "D3D3D3" },
          })
        ),
      })

      // Create data rows
      const dataRows = data.map(row =>
        new TableRow({
          children: headers.map(header =>
            new TableCell({
              children: [new Paragraph({
                children: [new TextRun({
                  text: String(row[header] || ''), font: {
                    name: "Noto Sans Ethiopic",
                    cs: "Noto Sans Ethiopic",
                    ascii: "Noto Sans Ethiopic",
                    hAnsi: "Noto Sans Ethiopic"
                  }
                })],
              })],
            })
          ),
        })
      )

      children.push(
        new Table({
          rows: [headerRow, ...dataRows],
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1 },
            bottom: { style: BorderStyle.SINGLE, size: 1 },
            left: { style: BorderStyle.SINGLE, size: 1 },
            right: { style: BorderStyle.SINGLE, size: 1 },
            insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
            insideVertical: { style: BorderStyle.SINGLE, size: 1 },
          },
        })
      )
    }

    // Footer
    if (metadata?.companyName) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: metadata.companyName,
              size: 20,
              font: {
                name: "Noto Sans Ethiopic",
                cs: "Noto Sans Ethiopic",
                ascii: "Noto Sans Ethiopic",
                hAnsi: "Noto Sans Ethiopic"
              },
            }),
          ],
          alignment: AlignmentType.RIGHT,
          spacing: { before: 400 },
        })
      )
    }

    // Create document
    const doc = new Document({
      sections: [{
        children,
      }],
    })

    // Generate and download
    Packer.toBlob(doc).then(blob => {
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `${title.toLowerCase().replace(/\s+/g, '-')}-${period}-${new Date().toISOString().split('T')[0]}.docx`
      link.click()
    })
  }

  static exportComprehensiveToWord(exportData: ComprehensiveExportData) {
    const { title, period, sections, metadata } = exportData

    const children: (Paragraph | Table)[] = []

    // Main Title
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: title,
            bold: true,
            size: 36,
            font: {
              name: "Noto Sans Ethiopic",
              cs: "Noto Sans Ethiopic",
              ascii: "Noto Sans Ethiopic",
              hAnsi: "Noto Sans Ethiopic"
            },
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      })
    )

    // Period and info
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Period: ${period.toUpperCase()}`, size: 24, font: {
              name: "Noto Sans Ethiopic",
              cs: "Noto Sans Ethiopic",
              ascii: "Noto Sans Ethiopic",
              hAnsi: "Noto Sans Ethiopic"
            }
          }),
        ],
        alignment: AlignmentType.CENTER,
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `Generated: ${new Date().toLocaleString()}`, size: 20, font: {
              name: "Noto Sans Ethiopic",
              cs: "Noto Sans Ethiopic",
              ascii: "Noto Sans Ethiopic",
              hAnsi: "Noto Sans Ethiopic"
            }
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      })
    )

    // Process sections
    sections.forEach((section) => {
      // Section Heading
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: section.title,
              bold: true,
              size: 28,
              underline: {},
              font: {
                name: "Noto Sans Ethiopic",
                cs: "Noto Sans Ethiopic",
                ascii: "Noto Sans Ethiopic",
                hAnsi: "Noto Sans Ethiopic"
              },
            }),
          ],
          spacing: { before: 400, after: 200 },
        })
      )

      // Section Content (text paragraphs)
      if (section.content) {
        section.content.forEach(text => {
          children.push(
            new Paragraph({
              children: [new TextRun({
                text, size: 22, font: {
                  name: "Noto Sans Ethiopic",
                  cs: "Noto Sans Ethiopic",
                  ascii: "Noto Sans Ethiopic",
                  hAnsi: "Noto Sans Ethiopic"
                }
              })],
              spacing: { after: 120 },
            })
          )
        })
      }

      // Section Summary Table
      if (section.summary) {
        const summaryRows = Object.entries(section.summary).map(([key, value]) =>
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph({
                  children: [new TextRun({
                    text: key, bold: true, size: 20, font: {
                      name: "Noto Sans Ethiopic",
                      cs: "Noto Sans Ethiopic",
                      ascii: "Noto Sans Ethiopic",
                      hAnsi: "Noto Sans Ethiopic"
                    }
                  })]
                })],
                width: { size: 40, type: WidthType.PERCENTAGE },
                shading: { fill: "F5F5F5" }
              }),
              new TableCell({
                children: [new Paragraph({
                  children: [new TextRun({
                    text: String(value), size: 20, font: {
                      name: "Noto Sans Ethiopic",
                      cs: "Noto Sans Ethiopic",
                      ascii: "Noto Sans Ethiopic",
                      hAnsi: "Noto Sans Ethiopic"
                    }
                  })]
                })],
                width: { size: 60, type: WidthType.PERCENTAGE },
              }),
            ],
          })
        )

        children.push(
          new Table({
            rows: summaryRows,
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1 },
              bottom: { style: BorderStyle.SINGLE, size: 1 },
              left: { style: BorderStyle.SINGLE, size: 1 },
              right: { style: BorderStyle.SINGLE, size: 1 },
              insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
              insideVertical: { style: BorderStyle.SINGLE, size: 1 },
            },
          }),
          new Paragraph({ children: [], spacing: { after: 200 } })
        )
      }

      // Section Data Table
      if (section.data && section.headers && section.data.length > 0) {
        const headerRow = new TableRow({
          children: section.headers.map(header =>
            new TableCell({
              children: [new Paragraph({
                children: [new TextRun({
                  text: header, bold: true, size: 18, font: {
                    name: "Noto Sans Ethiopic",
                    cs: "Noto Sans Ethiopic",
                    ascii: "Noto Sans Ethiopic",
                    hAnsi: "Noto Sans Ethiopic"
                  }
                })],
                alignment: AlignmentType.CENTER,
              })],
              shading: { fill: "D3D3D3" },
            })
          ),
        })

        const dataRows = section.data.map(row =>
          new TableRow({
            children: section.headers!.map(header =>
              new TableCell({
                children: [new Paragraph({
                  children: [new TextRun({
                    text: String(row[header] || ''), size: 18, font: {
                      name: "Noto Sans Ethiopic",
                      cs: "Noto Sans Ethiopic",
                      ascii: "Noto Sans Ethiopic",
                      hAnsi: "Noto Sans Ethiopic"
                    }
                  })],
                })],
              })
            ),
          })
        )

        children.push(
          new Table({
            rows: [headerRow, ...dataRows],
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1 },
              bottom: { style: BorderStyle.SINGLE, size: 1 },
              left: { style: BorderStyle.SINGLE, size: 1 },
              right: { style: BorderStyle.SINGLE, size: 1 },
              insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
              insideVertical: { style: BorderStyle.SINGLE, size: 1 },
            },
          })
        )
      }
    })

    // Final Footer
    if (metadata?.companyName) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `© ${new Date().getFullYear()} ${metadata.companyName}`,
              size: 18,
              italics: true,
              font: {
                name: "Noto Sans Ethiopic",
                cs: "Noto Sans Ethiopic",
                ascii: "Noto Sans Ethiopic",
                hAnsi: "Noto Sans Ethiopic"
              },
            }),
          ],
          alignment: AlignmentType.RIGHT,
          spacing: { before: 800 },
        })
      )
    }

    const doc = new Document({
      sections: [{ children }],
    })

    Packer.toBlob(doc).then(blob => {
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `${title.toLowerCase().replace(/\s+/g, '-')}-${period}-${new Date().toISOString().split('T')[0]}.docx`
      link.click()
    })
  }

  static exportToExcel(exportData: ExportData) {
    // For now, we'll use CSV format as Excel export requires additional libraries
    // This can be enhanced later with libraries like xlsx
    this.exportToCSV(exportData)
  }
}

// Profit calculation utilities
export class ProfitCalculator {
  static calculateNetProfit(revenue: number, expenses: any, stockItems: any[]) {
    // Calculate total stock value
    const totalStockValue = stockItems
      .reduce((sum, item) => sum + (item.quantity * (item.unitCost || 0)), 0)

    // Net Worth = Orders - Period Expenditures - Inherited Stock
    // To avoid doubling, we only subtract Stock Value that wasn't already recorded as an expense this period.
    const totalExpenditures = expenses.totalOtherExpenses || 0
    const inheritedStockValue = Math.max(0, totalStockValue - totalExpenditures)

    const netProfit = revenue - totalExpenditures - inheritedStockValue

    return {
      revenue,
      otherExpenses: expenses.totalOtherExpenses || 0,
      totalStockValue, // Keeping for asset valuation report
      totalInvestment: expenses.totalOtherExpenses || 0, // Operating investment
      netProfit,
      profitMargin: revenue > 0 ? (netProfit / revenue) * 100 : 0
    }
  }
}