import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const ORANGE = [249, 115, 22] as [number, number, number]
const DARK = [17, 17, 17] as [number, number, number]
const LIGHT = [245, 240, 235] as [number, number, number]
const GRAY = [120, 115, 110] as [number, number, number]

function createDoc(title: string, subtitle: string): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  // Header background
  doc.setFillColor(...DARK)
  doc.rect(0, 0, 210, 35, 'F')

  // Orange accent bar
  doc.setFillColor(...ORANGE)
  doc.rect(0, 0, 4, 35, 'F')

  // Logo text
  doc.setTextColor(...LIGHT)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('LOGIS', 12, 14)

  // Title
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...ORANGE)
  doc.text(title.toUpperCase(), 12, 22)

  // Subtitle
  doc.setFontSize(9)
  doc.setTextColor(180, 175, 170)
  doc.text(subtitle, 12, 29)

  // Date on right
  doc.setFontSize(8)
  doc.setTextColor(180, 175, 170)
  const now = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
  doc.text(`Dicetak: ${now}`, 198, 29, { align: 'right' })

  return doc
}

function addFooter(doc: jsPDF): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pageCount = (doc as any).internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFillColor(...DARK)
    doc.rect(0, 285, 210, 15, 'F')
    doc.setFontSize(7)
    doc.setTextColor(...GRAY)
    doc.text('Logis — Sistem Administrasi & Logistik Konstruksi', 12, 291)
    doc.text(`Halaman ${i} dari ${pageCount}`, 198, 291, { align: 'right' })
  }
}

// ============================================
// 1. EXPORT REQUESTS
// ============================================
export function exportRequestsPDF(
  requests: {
    id: string
    requestedByName: string
    items: { name: string; quantity: number; unit: string }[]
    urgency: string
    status: string
    reason: string
    createdAt: Date | null
  }[],
  projectName?: string
): void {
  const doc = createDoc(
    'Laporan Request Material',
    projectName ? `Proyek: ${projectName}` : 'Semua Proyek'
  )

  // Summary
  doc.setFontSize(9)
  doc.setTextColor(...GRAY)
  doc.text(`Total Request: ${requests.length}`, 12, 44)

  const statusCount = requests.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const summaryText = Object.entries(statusCount)
    .map(([s, c]) => `${s}: ${c}`)
    .join('  |  ')
  doc.text(summaryText, 12, 50)

  // Table
  const rows = requests.map((r) => [
    `#${r.id.slice(-6).toUpperCase()}`,
    r.requestedByName,
    r.items.map((i) => `${i.name} (${i.quantity} ${i.unit})`).join('\n'),
    r.urgency.toUpperCase(),
    r.status.replace('_', ' ').toUpperCase(),
    r.createdAt
      ? new Date(r.createdAt).toLocaleDateString('id-ID')
      : '—',
  ])

  autoTable(doc, {
    startY: 56,
    head: [['ID', 'Diminta Oleh', 'Item', 'Urgensi', 'Status', 'Tanggal']],
    body: rows,
    styles: {
      fontSize: 8,
      cellPadding: 3,
      textColor: [50, 45, 40],
    },
    headStyles: {
      fillColor: ORANGE,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    alternateRowStyles: {
      fillColor: [250, 248, 245],
    },
    columnStyles: {
      0: { cellWidth: 18 },
      1: { cellWidth: 30 },
      2: { cellWidth: 70 },
      3: { cellWidth: 18 },
      4: { cellWidth: 28 },
      5: { cellWidth: 22 },
    },
  })

  addFooter(doc)
  doc.save(`logis-requests-${Date.now()}.pdf`)
}

// ============================================
// 2. EXPORT PETTY CASH
// ============================================
export function exportPettyCashPDF(
  transactions: {
    id: string
    requestedBy: string
    category: string
    description: string
    amount: number
    purchaseType: string
    status: string
    anomalyFlag: boolean
    createdAt: Date | null
  }[],
  projectName?: string
): void {
  const doc = createDoc(
    'Laporan Petty Cash',
    projectName ? `Proyek: ${projectName}` : 'Semua Proyek'
  )

  // Total amount
  const total = transactions
    .filter((t) => t.status !== 'rejected')
    .reduce((sum, t) => sum + t.amount, 0)

  doc.setFontSize(9)
  doc.setTextColor(...GRAY)
  doc.text(`Total Transaksi: ${transactions.length}`, 12, 44)
  doc.setTextColor(...ORANGE)
  doc.setFont('helvetica', 'bold')
  doc.text(
    `Total Pengeluaran: ${new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(total)}`,
    12,
    50
  )
  doc.setFont('helvetica', 'normal')

  const rows = transactions.map((t) => [
    `#${t.id.slice(-6).toUpperCase()}`,
    t.requestedBy,
    t.category,
    t.description.length > 40
      ? t.description.slice(0, 40) + '...'
      : t.description,
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(t.amount),
    t.status.replace('_', ' ').toUpperCase(),
    t.anomalyFlag ? '⚠️' : '✓',
    t.createdAt
      ? new Date(t.createdAt).toLocaleDateString('id-ID')
      : '—',
  ])

  autoTable(doc, {
    startY: 56,
    head: [['ID', 'Oleh', 'Kategori', 'Deskripsi', 'Nominal', 'Status', 'Flag', 'Tanggal']],
    body: rows,
    styles: {
      fontSize: 7.5,
      cellPadding: 2.5,
      textColor: [50, 45, 40],
    },
    headStyles: {
      fillColor: ORANGE,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    alternateRowStyles: {
      fillColor: [250, 248, 245],
    },
    columnStyles: {
      0: { cellWidth: 16 },
      1: { cellWidth: 24 },
      2: { cellWidth: 24 },
      3: { cellWidth: 50 },
      4: { cellWidth: 26 },
      5: { cellWidth: 22 },
      6: { cellWidth: 10 },
      7: { cellWidth: 18 },
    },
  })

  addFooter(doc)
  doc.save(`logis-petty-cash-${Date.now()}.pdf`)
}

// ============================================
// 3. EXPORT INVENTORY
// ============================================
export function exportInventoryPDF(
  items: {
    id: string
    name: string
    category: string
    quantity: number
    unit: string
    minStock?: number
  }[],
  projectName: string
): void {
  const doc = createDoc(
    'Laporan Inventory Gudang',
    `Proyek: ${projectName}`
  )

  const lowStock = items.filter(
    (i) => i.minStock && i.quantity <= i.minStock
  ).length

  doc.setFontSize(9)
  doc.setTextColor(...GRAY)
  doc.text(`Total Item: ${items.length}`, 12, 44)
  if (lowStock > 0) {
    doc.setTextColor(239, 68, 68)
    doc.text(`⚠ ${lowStock} item stok kritis`, 60, 44)
  }

  const rows = items.map((item, index) => [
    String(index + 1),
    item.name,
    item.category,
    `${item.quantity} ${item.unit}`,
    item.minStock ? `${item.minStock} ${item.unit}` : '—',
    item.minStock && item.quantity <= item.minStock ? 'KRITIS' : 'Normal',
  ])

  autoTable(doc, {
    startY: 52,
    head: [['No', 'Nama Item', 'Kategori', 'Stok', 'Min. Stok', 'Status']],
    body: rows,
    styles: {
      fontSize: 9,
      cellPadding: 3,
      textColor: [50, 45, 40],
    },
    headStyles: {
      fillColor: ORANGE,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [250, 248, 245],
    },
    bodyStyles: {
      lineColor: [230, 225, 220],
      lineWidth: 0.1,
    },
    didParseCell: (data) => {
      if (data.column.index === 5 && data.cell.raw === 'KRITIS') {
        data.cell.styles.textColor = [239, 68, 68]
        data.cell.styles.fontStyle = 'bold'
      }
    },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 65 },
      2: { cellWidth: 35 },
      3: { cellWidth: 30 },
      4: { cellWidth: 30 },
      5: { cellWidth: 20 },
    },
  })

  addFooter(doc)
  doc.save(`logis-inventory-${projectName.replace(/\s+/g, '-')}-${Date.now()}.pdf`)
}