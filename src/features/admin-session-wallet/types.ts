export type AdminConfigKey =
  | 'point.signup_bonus'
  | 'point.platform_fee_pct'
  | 'token.learner_per_session'
  | 'token.companion_per_session'
  | 'token.daily_earn_limit'
  | 'token.weekly_earn_limit'
  | 'session.min_duration_minutes'
  | 'session.cancel_deadline_hours'
  | 'session.late_cancel_companion_pct'
  | 'session.late_cancel_platform_pct'
  | 'session.max_per_day_per_companion'
  | 'session.buffer_minutes'

export interface AdminConfigItemDto {
  key: AdminConfigKey | string
  value: string
  description: string | null
  updatedAt: string | null
  updatedBy: string | null
}

export interface GrantPointsPayload {
  userIds: string[]
  amount: number
  note?: string
}

export interface GrantPointsResponse {
  granted: number
}
