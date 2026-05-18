import type { ProfileSkillDto } from '../profile/types'

export type SessionDeliveryMode = 'Online' | 'Offline'

export type MySpaceSkillDto = ProfileSkillDto

export interface CompanionSpaceCardDto {
  companionSpaceCardId: string
  skill: MySpaceSkillDto
  title: string
  description: string | null
  pricePoints: number
  durationMinutes: 30 | 45 | 60 | 90 | 120
  deliveryModes: SessionDeliveryMode[]
  languages: string[]
  coverImageUrl: string | null
  credentialUrls: string[]
  isPublished: boolean
  createdAt: string
  updatedAt: string
}

export interface LearnerSpaceCardDto {
  learnerSpaceCardId: string
  skill: MySpaceSkillDto
  title: string
  description: string | null
  targetPoints: number
  durationMinutes: 30 | 45 | 60 | 90 | 120
  deliveryModes: SessionDeliveryMode[]
  languages: string[]
  coverImageUrl: string | null
  isPublished: boolean
  createdAt: string
  updatedAt: string
}

export interface MySpaceDto {
  companionCards: CompanionSpaceCardDto[]
  learnerCards: LearnerSpaceCardDto[]
}

export interface GenerateMySpaceUploadUrlRequest {
  fileName: string
  contentType: 'application/pdf' | 'image/jpeg' | 'image/png' | 'image/webp'
  fileSize: number
}

export interface MySpaceUploadUrlDto {
  uploadUrl: string
  publicUrl: string
  objectKey: string
  expiresAt: string
}

export interface CreateCompanionSpaceCardRequest {
  skillId: string
  title: string
  description?: string | null
  pricePoints: number
  durationMinutes: 30 | 45 | 60 | 90 | 120
  deliveryModes: SessionDeliveryMode[]
  languages?: string[] | null
  coverImageUrl?: string | null
  credentialUrls?: string[] | null
  isPublished: boolean
}

export type UpdateCompanionSpaceCardRequest = Partial<CreateCompanionSpaceCardRequest>

export interface CreateLearnerSpaceCardRequest {
  skillId: string
  title: string
  description?: string | null
  targetPoints: number
  durationMinutes: 30 | 45 | 60 | 90 | 120
  deliveryModes: SessionDeliveryMode[]
  languages?: string[] | null
  coverImageUrl?: string | null
  isPublished: boolean
}

export type UpdateLearnerSpaceCardRequest = Partial<CreateLearnerSpaceCardRequest>

