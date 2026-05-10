import type { UserRole } from '../../store/useAppStore'

export type ProfileRole = UserRole

export interface ProfileDto {
  userId: string
  displayName: string
  avatarUrl: string | null
  bio: string | null
  dateOfBirth: string | null
  phone: string | null
  degreeUrl: string | null
  skillsToTeach: string[]
  skillsToLearn: string[]
  isPublic: boolean
  roles: ProfileRole[]
  totalSessions: number
  lastActiveAt: string | null
  isCompanionOnboardingComplete: boolean
  missingCompanionProfileFields: ProfileField[]
}

export interface AvatarUploadUrlDto {
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

export interface GenerateDegreeUploadUrlRequest {
  fileName: string
  contentType: 'application/pdf' | 'image/jpeg' | 'image/png' | 'image/webp'
  fileSize: number
}

export interface UpdateMyProfilePayload {
  displayName?: string
  hasDisplayName?: boolean
  bio?: string | null
  hasBio?: boolean
  dateOfBirth?: string | null
  hasDateOfBirth?: boolean
  phone?: string | null
  hasPhone?: boolean
  degreeUrl?: string | null
  hasDegreeUrl?: boolean
  skillsToTeach?: string[] | null
  hasSkillsToTeach?: boolean
  skillsToLearn?: string[] | null
  hasSkillsToLearn?: boolean
  avatarUrl?: string | null
  hasAvatarUrl?: boolean
  isPublic?: boolean
  hasIsPublic?: boolean
}

export interface ProfileFormValues {
  displayName: string
  bio: string
  dateOfBirth: string
  phone: string
  degreeUrl: string | null
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
  | 'skillsToTeach'
  | 'skillsToLearn'
  | 'avatarUrl'
  | 'isPublic'
