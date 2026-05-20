import { apiGet } from '../../api/client'
import { toQueryString } from '../../api/query'
import type { AchievementSummaryDto } from '../achievements/types'
import type { SessionDto, SessionPricingPreviewDto } from './types'

export type CredentialCountGroup = 'Zero' | 'One' | 'Two' | 'ThreeOrMore'

export interface CompanionSearchParams {
  skillId: string
  minimumDurationMinutes?: 30 | 45 | 60 | 90 | 120
  maxLearnerChargePoints?: number
  credentialCountGroup?: CredentialCountGroup
  page?: number
  limit?: number
}

export interface CompanionSkillDetailParams {
  reviewPage?: number
  reviewLimit?: number
  offerPage?: number
  offerLimit?: number
}

export interface CompanionSearchItemDto {
  companionId: string
  displayName: string
  avatarUrl: string | null
  bio: string | null
  skillsToTeach: string[]
  credentialCount: number
  avgRating: number
  totalReviews: number
  matchingSessionCount: number
  lowestPointCost: number
  pricingPreview: SessionPricingPreviewDto | null
  nextScheduledAt: string
  matchedOffers: SessionDto[]
  subscriptionBadge: string | null
  hasPriorityVisibility: boolean
}

export interface CompanionSearchResponse {
  data: CompanionSearchItemDto[]
  total: number
  page: number
  limit: number
}

export interface CompanionActivitySummaryDto {
  totalSessions: number
  totalTeachingHours: number
  avgRating: number
  totalReviews: number
  lastActiveAt: string | null
}

export interface CompanionTeachingSkillDto {
  skillId: string
  name: string
  iconKey: string | null
  offerCount: number
  startingPointCost: number | null
  nextScheduledAt: string | null
  hasAvailableOffers: boolean
}

export interface CompanionPublicProfileDto {
  companionId: string
  displayName: string
  avatarUrl: string | null
  bio: string | null
  roles: string[]
  activitySummary: CompanionActivitySummaryDto
  achievements: AchievementSummaryDto[]
  teachingSkills: CompanionTeachingSkillDto[]
  subscriptionBadge: string | null
  hasPriorityVisibility: boolean
}

export interface CompanionSkillInfoDto {
  skillId: string
  name: string
  iconKey: string | null
}

export interface CompanionReviewDto {
  reviewId: string
  rating: number
  comment: string | null
  reviewerDisplayName: string
  createdAt: string
}

export interface CompanionReviewListDto {
  data: CompanionReviewDto[]
  total: number
  page: number
  limit: number
}

export interface SessionListDto {
  data: SessionDto[]
  total: number
  page: number
  limit: number
}

export interface CompanionSkillDetailDto {
  companionId: string
  skill: CompanionSkillInfoDto
  avgRating: number
  totalReviews: number
  offers: SessionListDto
  reviews: CompanionReviewListDto
}

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

export const companionKeys = {
  search: (params: CompanionSearchParams) => ['companions', 'search', params] as const,
  publicProfile: (companionId: string) => ['companions', 'public-profile', companionId] as const,
  skillDetail: (companionId: string, skillId: string, params: CompanionSkillDetailParams) =>
    ['companions', 'skill-detail', companionId, skillId, params] as const,
}

export const companionApi = {
  search: (params: CompanionSearchParams) =>
    apiGet<CompanionSearchResponse>(`/api/companions/search${toQueryString(params)}`, { auth: true }),

  getPublicProfile: (companionId: string) =>
    apiGet<CompanionPublicProfileDto>(`/api/companions/${companionId}/public-profile`),

  getSkillDetail: (companionId: string, skillId: string, params: CompanionSkillDetailParams) =>
    apiGet<CompanionSkillDetailDto>(
      `/api/companions/${companionId}/skills/${skillId}${toQueryString(params)}`,
    ),
}
