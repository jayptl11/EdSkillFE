import type { UserRole } from '../../store/useAppStore'

export type ProfileRole = UserRole

export interface ProfileDto {
  userId: string
  displayName: string
  avatarUrl: string | null
  bio: string | null
  university: string | null
  faculty: string | null
  yearOfStudy: number | null
  skillsToTeach: string[]
  skillsToLearn: string[]
  isPublic: boolean
  roles: ProfileRole[]
  totalSessions: number
  lastActiveAt: string | null
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

export interface UpdateMyProfilePayload {
  displayName?: string
  bio?: string | null
  university?: string | null
  faculty?: string | null
  yearOfStudy?: number | null
  skillsToTeach?: string[] | null
  skillsToLearn?: string[] | null
  avatarUrl?: string | null
  isPublic?: boolean
}

export interface ProfileFormValues {
  displayName: string
  bio: string
  university: string
  faculty: string
  yearOfStudy: number | null
  skillsToTeach: string[]
  skillsToLearn: string[]
  isPublic: boolean
  avatarUrl: string | null
}

export type ProfileField =
  | 'displayName'
  | 'bio'
  | 'university'
  | 'faculty'
  | 'yearOfStudy'
  | 'skillsToTeach'
  | 'skillsToLearn'
  | 'avatarUrl'
  | 'isPublic'
