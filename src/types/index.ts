// ============================================
// CORE TYPES
// ============================================

export type UserRole =
  | 'owner'
  | 'admin'
  | 'pm'
  | 'supervisor'
  | 'logistik'
  | 'admin_site'
  | 'mandor'
  | 'readonly'

export type ProjectStatus = 'active' | 'completed' | 'on_hold' | 'cancelled'

export type HealthScore = 'healthy' | 'warning' | 'critical'

export type RequestStatus =
  | 'draft'
  | 'submitted'
  | 'in_review'
  | 'approved'
  | 'rejected'
  | 'po_issued'
  | 'on_delivery'
  | 'partial'
  | 'completed'
  | 'discrepancy'

export type AssetStatus =
  | 'active'
  | 'idle'
  | 'maintenance'
  | 'lost'
  | 'retired'

export type PettyCashStatus =
  | 'pending_approval'
  | 'approved'
  | 'in_progress'
  | 'pending_reimbursement'
  | 'completed'
  | 'rejected'

// ============================================
// COMPANY & USER
// ============================================

export interface Company {
  id: string
  name: string
  plan: 'starter' | 'builder' | 'prime' | 'enterprise'
  projectLimit: number
  subscriptionEnd: Date | null
  createdAt: Date
}

export interface LogisUser {
  id: string
  companyId: string
  name: string
  email: string
  phone?: string
  role: UserRole
  projectIds: string[]
  createdAt: Date
  isActive: boolean
}

// ============================================
// PROJECT
// ============================================

export interface Project {
  id: string
  companyId: string
  name: string
  location: string
  status: ProjectStatus
  healthScore: HealthScore
  progressPercent: number
  budgetTotal: number
  budgetUsed: number
  startDate: Date
  endDate: Date
  pmId: string
  createdAt: Date
}

// ============================================
// MODUL 1 — REQUESTS
// ============================================

export interface RequestItem {
  name: string
  quantity: number
  unit: string
  notes?: string
}

export interface MaterialRequest {
  id: string
  projectId: string
  companyId: string
  requestedBy: string
  requestedByName: string
  items: RequestItem[]
  urgency: 'urgent' | 'normal' | 'low'
  reason: string
  currentStockPhoto?: string
  status: RequestStatus
  poNumber?: string
  poUrl?: string
  expectedDelivery?: Date
  approvedBy?: string
  rejectedReason?: string
  createdAt: Date
  updatedAt: Date
  photos?: { url: string; path: string }[]
}

export interface DeliveryConfirmation {
  id: string
  requestId: string
  projectId: string
  confirmedBy: string
  itemsReceived: RequestItem[]
  hasDiscrepancy: boolean
  discrepancyNotes?: string
  photos: string[]
  confirmedAt: Date
}

// ============================================
// MODUL 2 — INVENTORY & PETTY CASH
// ============================================

export type InventoryCategory = 'material' | 'apd' | 'consumable' | 'tool'

export interface InventoryItem {
  id: string
  projectId: string
  companyId: string
  name: string
  category: InventoryCategory
  quantity: number
  unit: string
  minimumStock: number
  lastUpdated: Date
  updatedBy: string
}

export interface PettyCashTransaction {
  id: string
  projectId: string
  companyId: string
  requestedBy: string
  requestedById: string
  amount: number
  category: string
  subcategory: string
  description: string
  purchaseType: 'cash' | 'reimbursement' | 'online'
  receipts: string[]
  photos?: { url: string; path: string }[]  // ← tambahkan ini
  status: PettyCashStatus
  approvedBy?: string
  approvedByName?: string
  rejectedReason?: string
  anomalyFlag: boolean
  anomalyReason?: string
  isEmergency: boolean
  emergencyApprovedBy?: string
  onlineUrl?: string
  onlinePlatform?: string
  notes?: string
  createdAt: Date
  completedAt?: Date
}

export interface OnlinePurchase {
  id: string
  projectId: string
  companyId: string
  requestedBy: string
  productUrl: string
  productName: string
  quantity: number
  estimatedPrice: number
  actualPrice?: number
  platform: 'shopee' | 'tokopedia' | 'blibli' | 'lazada' | 'other'
  orderScreenshot?: string
  paymentScreenshot?: string
  receiptScreenshot?: string
  status: 'pending_approval' | 'approved' | 'ordered' | 'on_delivery' | 'received' | 'reimbursed'
  isReimbursement: boolean
  reimbursedAt?: Date
  createdAt: Date
}

// ============================================
// MODUL 3 — ASSETS
// ============================================

export type AssetType = 'heavy_equipment' | 'power_tool' | 'scaffolding' | 'measuring' | 'vehicle' | 'other'

export interface Asset {
  id: string
  companyId: string
  name: string
  type: AssetType
  serialNumber?: string
  currentProjectId: string | null
  currentPicId: string | null
  status: AssetStatus
  condition: 'good' | 'fair' | 'poor' | 'damaged'
  operatingHours: number
  serviceIntervalHours: number
  lastServiceDate: Date | null
  nextServiceDue: Date | null
  purchaseDate: Date | null
  purchasePrice: number | null
  isRented: boolean
  rentalEndDate?: Date
  photos: string[]
  createdAt: Date
}

export interface AssetTransfer {
  id: string
  assetId: string
  companyId: string
  fromProjectId: string
  toProjectId: string
  handoverById: string
  receivedById: string
  quantity?: number
  conditionAtTransfer: string
  photos: string[]
  notes?: string
  signedAt: Date
}

// ============================================
// MODUL 4 — REPORTS & DASHBOARD
// ============================================

export interface DailyReport {
  id: string
  projectId: string
  companyId: string
  submittedBy: string
  date: Date
  weather: 'sunny' | 'cloudy' | 'rainy' | 'stormy'
  workersPresent: number
  workersAbsent: number
  workItems: string[]
  issues: string[]
  photos: string[]
  notes?: string
  createdAt: Date
}

export interface ProjectHealthData {
  projectId: string
  budgetScore: number
  reportingScore: number
  assetScore: number
  materialScore: number
  financialScore: number
  totalScore: number
  healthStatus: HealthScore
  calculatedAt: Date
}

// ============================================
// NOTIFICATIONS
// ============================================
export type NotificationType =
  | 'request_new'
  | 'request_approved'
  | 'request_rejected'
  | 'petty_cash_new'
  | 'petty_cash_approved'
  | 'petty_cash_rejected'
  | 'asset_service_due'
  | 'asset_lost'
  | 'stock_critical'

export interface LogisNotification {
  id: string
  companyId: string
  type: NotificationType
  title: string
  message: string
  href: string
  isRead: boolean
  createdAt: Date
  createdBy: string
  createdByName: string
  targetRoles: string[]
}