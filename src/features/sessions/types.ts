export type SessionStatus =
  | 'Available'
  | 'Pending'
  | 'Confirmed'
  | 'InProgress'
  | 'PendingReview'
  | 'Completed'
  | 'Cancelled'
  | 'Disputed'

export type SessionDeliveryMode = 'Online' | 'Offline'

export type SessionPricingModel = 'FormulaV1' | 'LegacyManual'

export type SessionRoleFilter = 'learner' | 'companion'
export type SessionActorRole = SessionRoleFilter | 'viewer'

export interface SessionPricingPreviewDto {
  minCompanionPayoutPoints: number
  maxCompanionPayoutPoints: number
  minLearnerChargePoints: number
  maxLearnerChargePoints: number
  minPlatformFeePoints: number
  maxPlatformFeePoints: number
}

/** Exact pricing breakdown per duration option — dùng trong modal chọn thời lượng */
export interface DurationPricingOptionDto {
  durationMinutes: number
  /** Số điểm learner phải trả — field chính cần hiển thị khi user chọn option này */
  learnerChargePoints: number
  /** Internal — không hiển thị trong modal book */
  companionPayoutPoints: number
  /** Internal — không hiển thị trong modal book */
  platformFeePoints: number
  /** Internal — không render trong UI cơ bản */
  durationMultiplierPercent: number
  /** BE đánh dấu cho session đã book; FE dùng local state làm source chính */
  isSelected: boolean
}

export interface SessionPricingBreakdownDto {
  learnerChargePoints: number
  companionPayoutPoints: number
  platformFeePoints: number
  skillBasePoints: number | null
  credentialBonusPoints: number | null
  durationMultiplierPercent: number | null
}

export interface SessionDto {
  sessionId: string
  companionId: string
  learnerId: string | null
  skill: string
  description: string | null
  deliveryMode: SessionDeliveryMode
  location: string | null
  durationMinutes: number
  pointCost: number
  pricingModel: SessionPricingModel
  durationOptions: number[]
  /** Danh sách exact pricing per option — source chính cho modal chọn thời lượng */
  durationPricingOptions: DurationPricingOptionDto[]
  selectedDurationMinutes: number | null
  pricingPreview: SessionPricingPreviewDto | null
  pricingBreakdown: SessionPricingBreakdownDto | null
  scheduledAt: string
  status: SessionStatus
  jitsiRoomId: string | null
  actualStartAt: string | null
  actualEndAt: string | null
  actualDuration: number | null
  learnerConfirmed: boolean
  companionConfirmed: boolean
  cancelReason: string | null
  cancelledAt: string | null
  disbursedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface SessionStatusDto {
  status: SessionStatus
  learnerConfirmed: boolean
  companionConfirmed: boolean
}

/** @deprecated Dùng CreateSessionRequest thay thế */
export interface CreateSessionPayload {
  skill: string
  description?: string
  durationMinutes: number
  pointCost: number
  scheduledAt: string
}

export type AllowedDurationMinutes = 30 | 45 | 60 | 90 | 120

export interface CreateSessionRequest {
  skillId: string
  description?: string | null
  deliveryMode: SessionDeliveryMode
  location?: string | null
  durationOptions: AllowedDurationMinutes[]
  scheduledAt: string
}

export interface BookSessionRequest {
  selectedDurationMinutes: AllowedDurationMinutes
}

export interface SessionsListParams {
  status?: SessionStatus | ''
  role?: SessionRoleFilter
  page?: number
  limit?: number
}

export interface RejectSessionPayload {
  reason?: string
}

export interface CancelSessionPayload {
  reason?: string
}

export interface LeaveSessionPayload {
  actualDuration?: number
}
