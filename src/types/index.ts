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
  | 'readonly'
  | 'superadmin'

export type ProjectStatus = 'active' | 'completed' | 'on_hold' | 'cancelled'

export type HealthScore = 'healthy' | 'warning' | 'critical'

export type RequestStatus =
  | 'draft'
  | 'submitted'           // Admin proyek submit → menunggu PM
  | 'pending_pm_review'   // NEW: Menunggu acknowledge PM
  | 'revision_requested'  // NEW: PM minta revisi → balik ke admin proyek
  | 'in_review'           // PM sudah acknowledge → menunggu admin pusat
  | 'approved'            // Admin pusat setujui
  | 'rejected'            // Admin pusat tolak
  | 'po_issued'           // PO sudah diterbitkan
  | 'on_delivery'         // Barang sedang dikirim
  | 'partial'             // Terima sebagian
  | 'completed'           // Selesai
  | 'discrepancy'         // NEW: Logistik tandai barang tidak sesuai PO

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
  phone: string
  role: UserRole
  projectIds: string[]
  assignedProjectId?: string
  isActive: boolean
  fcmToken?: string
  createdAt: Date
}

// ============================================
// PROJECT
// ============================================

export interface Project {
  id: string
  companyId: string
  name: string
  location?: string
  status: 'active' | 'completed' | 'on_hold' | 'cancelled'
  progressPercent: number
  progressHistory?: {
    percent: number
    note: string
    updatedBy: string
    updatedByName: string
    updatedAt: Date
  }[]
  startDate?: Date
  endDate?: Date
  budget?: number
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
  photos?: { url: string; path: string }[]

  // PM acknowledge
  pmAcknowledgedBy?: string
  pmAcknowledgedByName?: string
  pmAcknowledgedAt?: Date
  pmRevisionNote?: string       // Catatan revisi dari PM

  // Admin pusat approval
  approvedBy?: string
  approvedByName?: string
  rejectedReason?: string

  // PO
  poNumber?: string
  poUrl?: string
  poFileUrl?: string
  poFilePath?: string
  poNotes?: string
  poIssuedAt?: Date
  poIssuedBy?: string
  poIssuedByName?: string

  // Delivery
  expectedDelivery?: Date
  deliveryConfirmedBy?: string
  deliveryConfirmedByName?: string
  deliveryConfirmedAt?: Date

  // Discrepancy (logistik tandai tidak sesuai)
  discrepancyNote?: string
  discrepancyReportedBy?: string
  discrepancyReportedByName?: string
  discrepancyReportedAt?: Date

  createdAt: Date
  updatedAt: Date
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
  photos?: { url: string; path: string }[]
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
  | 'request_pm_review'       // NEW: notif ke PM untuk acknowledge
  | 'request_revision'        // NEW: notif ke admin proyek untuk revisi
  | 'request_approved'
  | 'request_rejected'
  | 'request_po_issued'
  | 'request_on_delivery'     // NEW: notif ke logistik saat PO diterbitkan
  | 'request_discrepancy'     // NEW: notif ke admin pusat saat barang tidak sesuai
  | 'request_completed'       // NEW: notif selesai
  | 'project_progress'        // Progress proyek diupdate
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

// ============================================
// COMPANY & SUBSCRIPTION
// ============================================

export type PlanType = 'trial' | 'starter' | 'builder' | 'prime' | 'enterprise'

export interface CompanyProfile {
  id: string
  name: string
  address: string
  phone: string
  ownerName: string
  ownerEmail: string
  plan: PlanType
  trialStartDate: Date
  trialEndDate: Date
  isTrialActive: boolean
  maxProjects: number
  maxUsers: number
  createdAt: Date
}

export const PLAN_LIMITS: Record<PlanType, { maxProjects: number; maxUsers: number; label: string; price: number }> = {
  trial:      { maxProjects: 5,   maxUsers: 999,  label: 'Trial 30 Hari',  price: 0 },
  starter:    { maxProjects: 1,   maxUsers: 3,    label: 'Starter',        price: 0 },
  builder:    { maxProjects: 5,   maxUsers: 999,  label: 'Builder',        price: 799000 },
  prime:      { maxProjects: 15,  maxUsers: 999,  label: 'Prime',          price: 1899000 },
  enterprise: { maxProjects: 999, maxUsers: 999,  label: 'Enterprise',     price: 0 },
}