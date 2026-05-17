import type { UserRole } from '../../store/useAppStore'
import type { AchievementSummaryDto } from '../achievements/types'
import type { ActiveSubscriptionSummaryDto, ResolvedSubscriptionEntitlementsDto } from '../wallet/types'

export type ProfileRole = UserRole

export interface ProfileSkillDto {
  skillId: string
  name: string
  iconKey: string | null
}

export interface ProfileDto {
  userId: string
  displayName: string
  avatarUrl: string | null
  bio: string | null
  dateOfBirth: string | null
  phone: string | null
  degreeUrl: string | null
  credentialUrls: string[]
  credentialCount: number
  skillsToTeach: string[]
  skillsToLearn: string[]
  teachingSkills: ProfileSkillDto[]
  learningSkills: ProfileSkillDto[]
  achievements: AchievementSummaryDto[]
  isPublic: boolean
  roles: ProfileRole[]
  totalSessions: number
  lastActiveAt: string | null
  isCompanionOnboardingComplete: boolean
  missingCompanionProfileFields: ProfileField[]
  activeSubscriptions: ActiveSubscriptionSummaryDto[]
  subscriptionEntitlements: ResolvedSubscriptionEntitlementsDto | null
}

export interface AvatarUploadUrlDto {
  uploadUrl: string
  publicUrl: string
  objectKey: string
  expiresAt: string
}

export interface CredentialUploadUrlDto {
  uploadUrl: string
  publicUrl: string
  objectKey: string
  expiresAt: string
}

export interface GenerateAvatarUploadUrlRequest {
  fileName: string
  contentType: 'image/jpeg' | 'image/png' | 'image/webp'
  fileSize: number
}

export interface GenerateCredentialUploadUrlRequest {
  fileName: string
  contentType: 'application/pdf' | 'image/jpeg' | 'image/png' | 'image/webp'
  fileSize: number
}

/** @deprecated Dùng GenerateCredentialUploadUrlRequest thay thế */
export interface GenerateDegreeUploadUrlRequest {
  fileName: string
  contentType: 'application/pdf' | 'image/jpeg' | 'image/png' | 'image/webp'
  fileSize: number
}

/**
 * Partial update – chỉ gửi field muốn thay đổi.
 * Omit field = BE giữ nguyên.
 * Gửi null cho bio/phone/avatarUrl = BE xóa giá trị đó.
 */
export interface UpdateMyProfilePayload {
  displayName?: string | null
  bio?: string | null
  dateOfBirth?: string | null
  phone?: string | null
  credentialUrls?: string[] | null
  skillsToTeach?: string[] | null
  skillsToLearn?: string[] | null
  avatarUrl?: string | null
  isPublic?: boolean
}

export interface ProfileFormValues {
  displayName: string
  bio: string
  dateOfBirth: string
  phone: string
  credentialUrls: string[]
  skillsToTeach: string[]
  skillsToLearn: string[]
  isPublic: boolean
  avatarUrl: string | null
}

export type ProfileField =
  | 'displayName'
  | 'bio'
  | 'dateOfBirth'
  | 'phone'
  | 'degreeUrl'
  | 'credentialUrls'
  | 'skillsToTeach'
  | 'skillsToLearn'
  | 'avatarUrl'
  | 'isPublic'
