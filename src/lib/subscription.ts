import { CompanyProfile, PlanType, PLAN_LIMITS } from '@/types'

// ============================================
// SUBSCRIPTION HELPERS
// ============================================

/**
 * Cek apakah trial masih aktif
 */
export function isTrialActive(company: CompanyProfile | null): boolean {
  if (!company) return false
  if (!company.isTrialActive) return false
  if (!company.trialEndDate) return true
  return new Date() < new Date(company.trialEndDate)
}

/**
 * Cek apakah subscription expired
 */
export function isSubscriptionExpired(company: CompanyProfile | null): boolean {
  if (!company) return true
  // Trial aktif = belum expired
  if (isTrialActive(company)) return false
  // Kalau bukan trial, cek plan-nya
  if (company.plan === 'trial') return true
  return false
}

/**
 * Dapatkan limit proyek berdasarkan plan
 */
export function getMaxProjects(plan: PlanType): number {
  return PLAN_LIMITS[plan]?.maxProjects ?? 1
}

/**
 * Dapatkan limit user berdasarkan plan
 */
export function getMaxUsers(plan: PlanType): number {
  return PLAN_LIMITS[plan]?.maxUsers ?? 3
}

/**
 * Cek apakah bisa create proyek baru
 */
export function canCreateProject(
  company: CompanyProfile | null,
  currentProjectCount: number
): { allowed: boolean; reason?: string } {
  if (!company) return { allowed: false, reason: 'Data perusahaan tidak ditemukan' }

  if (isSubscriptionExpired(company)) {
    return { allowed: false, reason: 'Trial atau langganan sudah habis. Silakan upgrade.' }
  }

  const maxProjects = getMaxProjects(company.plan)
  if (currentProjectCount >= maxProjects) {
    return {
      allowed: false,
      reason: `Limit proyek tercapai (${currentProjectCount}/${maxProjects}). Upgrade plan untuk menambah.`,
    }
  }

  return { allowed: true }
}

/**
 * Cek apakah bisa invite user baru
 */
export function canInviteUser(
  company: CompanyProfile | null,
  currentUserCount: number
): { allowed: boolean; reason?: string } {
  if (!company) return { allowed: false, reason: 'Data perusahaan tidak ditemukan' }

  if (isSubscriptionExpired(company)) {
    return { allowed: false, reason: 'Trial atau langganan sudah habis. Silakan upgrade.' }
  }

  const maxUsers = getMaxUsers(company.plan)
  if (currentUserCount >= maxUsers) {
    return {
      allowed: false,
      reason: `Limit user tercapai (${currentUserCount}/${maxUsers}). Upgrade plan untuk menambah.`,
    }
  }

  return { allowed: true }
}

/**
 * Format harga ke Rupiah
 */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(price)
}

/**
 * Label plan yang readable
 */
export function getPlanLabel(plan: PlanType): string {
  return PLAN_LIMITS[plan]?.label ?? plan
}
