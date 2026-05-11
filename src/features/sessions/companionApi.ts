import { apiGet } from '../../api/client'
import { toQueryString } from '../../api/query'
import type { SessionDeliveryMode, SessionDto } from '../sessions/types'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CompanionSearchParams {
  skillId: string
  deliveryMode?: SessionDeliveryMode
  location?: string
  page?: number
  limit?: number
}

export interface CompanionSearchItemDto {
  companionId: string
  displayName: string
  avatarUrl: string | null
  bio: string | null
  skillsToTeach: string[]
  avgRating: number
  totalReviews: number
  matchingSessionCount: number
  lowestPointCost: number
  nextScheduledAt: string
}

export interface CompanionSearchResponse {
  data: CompanionSearchItemDto[]
  total: number
  page: number
  limit: number
}

export interface CompanionDetailParams {
  skillId: string
  deliveryMode?: SessionDeliveryMode
  location?: string
  reviewPage?: number
  reviewLimit?: number
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
  sessions: SessionDto[]
}

// ─── Query Keys ─────────────────────────────────────────────────────────────

export const companionKeys = {
  search: (params: CompanionSearchParams) => ['companions', 'search', params] as const,
  detail: (companionId: string, params: CompanionDetailParams) =>
    ['companions', 'detail', companionId, params] as const,
}

// ─── API ────────────────────────────────────────────────────────────────────

export const companionApi = {
  search: (params: CompanionSearchParams) =>
    apiGet<CompanionSearchResponse>(`/api/companions/search${toQueryString(params)}`),

  getDetail: (companionId: string, params: CompanionDetailParams) =>
    apiGet<CompanionDetailDto>(`/api/companions/${companionId}${toQueryString(params)}`),
}
