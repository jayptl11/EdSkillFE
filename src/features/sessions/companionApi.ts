import { apiGet } from '../../api/client'
import { toQueryString } from '../../api/query'
import type { SessionDto, SessionPricingPreviewDto } from '../sessions/types'

// ─── Enums ──────────────────────────────────────────────────────────────────

export type CredentialCountGroup = 'Zero' | 'One' | 'Two' | 'ThreeOrMore'

// ─── Params ─────────────────────────────────────────────────────────────────

export interface CompanionSearchParams {
  skillId: string
  /** Ngưỡng thời lượng tối thiểu (phút) — backend lọc >= giá trị này */
  minimumDurationMinutes?: 30 | 45 | 60 | 90 | 120
  /** Điểm tối đa learner muốn chi — backend lọc learnerChargePoints <= giá trị này */
  maxLearnerChargePoints?: number
  /** Nhóm chứng chỉ */
  credentialCountGroup?: CredentialCountGroup
  page?: number
  limit?: number
}

export interface CompanionDetailParams {
  skillId: string
  minimumDurationMinutes?: 30 | 45 | 60 | 90 | 120
  maxLearnerChargePoints?: number
  credentialCountGroup?: CredentialCountGroup
  reviewPage?: number
  reviewLimit?: number
}

// ─── DTOs ───────────────────────────────────────────────────────────────────

export interface CompanionSearchItemDto {
  companionId: string
  displayName: string
  avatarUrl: string | null
  bio: string | null
  skillsToTeach: string[]
  /** Số chứng chỉ đã xác minh */
  credentialCount: number
  avgRating: number
  totalReviews: number
  matchingSessionCount: number
  lowestPointCost: number
  pricingPreview: SessionPricingPreviewDto | null
  nextScheduledAt: string
  /** Danh sách offer đã match — nội bộ FE, không render trực tiếp trên card */
  matchedOffers: SessionDto[]
}

export interface CompanionSearchResponse {
  data: CompanionSearchItemDto[]
  total: number
  page: number
  limit: number
}

export interface ReviewItemDto {
  reviewId: string
  rating: number
  comment: string | null
  reviewerDisplayName: string
  createdAt: string
}

export interface CompanionDetailDto {
  companionId: string
  displayName: string
  avatarUrl: string | null
  bio: string | null
  skillsToTeach: string[]
  roles: string[]
  /** Số chứng chỉ đã xác minh */
  credentialCount: number
  totalSessions: number
  lastActiveAt: string | null
  avgRating: number
  totalReviews: number
  reviews: {
    data: ReviewItemDto[]
    total: number
    page: number
    limit: number
  }
  /** Sessions đã được BE lọc sẵn: online + skillId + filter duration/price/credential */
  sessions: SessionDto[]
}

// ─── Validation error ────────────────────────────────────────────────────────

export type CompanionValidationErrorCode =
  | 'UNSUPPORTED_DELIVERY_MODE_FILTER'
  | 'UNSUPPORTED_LOCATION_FILTER'
  | 'INVALID_MINIMUM_DURATION'
  | 'INVALID_MAX_LEARNER_CHARGE_POINTS'
  | 'INVALID_CREDENTIAL_COUNT_GROUP'

export interface CompanionValidationError {
  statusCode: 422
  errorCode: 'VALIDATION_ERROR'
  message: string
  errors: Array<{
    property: string
    message: string
    errorCode: CompanionValidationErrorCode
  }>
}

// ─── Query Keys ─────────────────────────────────────────────────────────────

export const companionKeys = {
  search: (params: CompanionSearchParams) => ['companions', 'search', params] as const,
  detail: (companionId: string, params: CompanionDetailParams) =>
    ['companions', 'detail', companionId, params] as const,
}

// ─── Query builder (theo tài liệu §8.2) ─────────────────────────────────────

export function buildCompanionSearchQuery(filters: CompanionSearchParams): string {
  const params = new URLSearchParams()

  params.set('skillId', filters.skillId)

  if (filters.minimumDurationMinutes) {
    params.set('minimumDurationMinutes', String(filters.minimumDurationMinutes))
  }

  if (typeof filters.maxLearnerChargePoints === 'number' && filters.maxLearnerChargePoints > 0) {
    params.set('maxLearnerChargePoints', String(filters.maxLearnerChargePoints))
  }

  if (filters.credentialCountGroup) {
    params.set('credentialCountGroup', filters.credentialCountGroup)
  }

  params.set('page', String(filters.page ?? 1))
  params.set('limit', String(filters.limit ?? 20))

  return `?${params.toString()}`
}

// ─── API ────────────────────────────────────────────────────────────────────

export const companionApi = {
  search: (params: CompanionSearchParams) =>
    apiGet<CompanionSearchResponse>(`/api/companions/search${toQueryString(params)}`),

  getDetail: (companionId: string, params: CompanionDetailParams) =>
    apiGet<CompanionDetailDto>(`/api/companions/${companionId}${toQueryString(params)}`),
}
