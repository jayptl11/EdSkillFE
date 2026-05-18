export interface AchievementSummaryDto {
  achievementId: string
  name: string
  description: string
  iconUrl: string | null
  awardedAt: string
}

export type AchievementTrack = 'learner' | 'companion'
export type AchievementMetric = 'completed_sessions' | 'completed_hours' | 'distinct_completed_learners'

export interface MyAchievementEarnedDto {
  achievementId: string
  name: string
  description: string
  iconUrl: string | null
  track: AchievementTrack
  metric: AchievementMetric
  threshold: number
  awardedAt: string
}

export interface MyUpcomingAchievementDto {
  achievementId: string
  name: string
  description: string
  iconUrl: string | null
  track: AchievementTrack
  metric: AchievementMetric
  currentValue: number
  threshold: number
  remainingValue: number
  progressPercent: number
}

export interface MyAchievementsDto {
  earned: MyAchievementEarnedDto[]
  upcoming: MyUpcomingAchievementDto[]
}

export interface AdminAchievementDto {
  achievementId: string
  name: string
  description: string
  iconUrl: string | null
  track: AchievementTrack
  metric: AchievementMetric
  threshold: number
  sortOrder: number
  isActive: boolean
  effectiveFromUtc: string
}

export interface AchievementIconUploadUrlDto {
  uploadUrl: string
  publicUrl: string
  objectKey: string
  expiresAt: string
}

export interface GenerateAchievementIconUploadUrlRequest {
  fileName: string
  contentType: 'image/jpeg' | 'image/jpg' | 'image/png' | 'image/webp'
  fileSize: number
}

export interface CreateAchievementRequest {
  name: string
  description: string
  iconUrl: string | null
  track: AchievementTrack
  metric: AchievementMetric
  threshold: number
  sortOrder: number
}

export interface UpdateAchievementRequest {
  name?: string | null
  description?: string | null
  iconUrl?: string | null
  track?: AchievementTrack | null
  metric?: AchievementMetric | null
  threshold?: number | null
  sortOrder?: number | null
  isActive?: boolean | null
}
