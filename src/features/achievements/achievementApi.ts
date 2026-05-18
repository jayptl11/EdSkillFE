import { apiGet, apiPatch, apiPost } from '../../api/client'
import {
  uploadFileToPresignedUrl,
} from '../profile/profileApi'
import type {
  AchievementIconUploadUrlDto,
  AdminAchievementDto,
  CreateAchievementRequest,
  GenerateAchievementIconUploadUrlRequest,
  MyAchievementsDto,
  UpdateAchievementRequest,
} from './types'

const ALLOWED_ACHIEVEMENT_ICON_TYPES = new Set<GenerateAchievementIconUploadUrlRequest['contentType']>([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
])

const MAX_ACHIEVEMENT_ICON_SIZE_BYTES = 10 * 1024 * 1024

export const achievementKeys = {
  adminList: (includeInactive: boolean) => ['achievements', 'admin', { includeInactive }] as const,
  me: () => ['achievements', 'me'] as const,
}

export const achievementApi = {
  getMyAchievements: () => apiGet<MyAchievementsDto>('/api/achievements/me', { auth: true }),

  getAdminAchievements: (includeInactive = true) =>
    apiGet<AdminAchievementDto[]>(`/api/admin/achievements?includeInactive=${includeInactive}`, { auth: true }),

  createIconUploadUrl: (payload: GenerateAchievementIconUploadUrlRequest) =>
    apiPost<AchievementIconUploadUrlDto>('/api/admin/achievements/icon-upload-url', payload, { auth: true }),

  createAchievement: (payload: CreateAchievementRequest) =>
    apiPost<AdminAchievementDto>('/api/admin/achievements', payload, { auth: true }),

  updateAchievement: (achievementId: string, payload: UpdateAchievementRequest) =>
    apiPatch<AdminAchievementDto>(`/api/admin/achievements/${achievementId}`, payload, { auth: true }),
}

export function validateAchievementIcon(file: File) {
  if (!file.name.trim()) {
    throw new Error('Tên file icon là bắt buộc.')
  }

  if (!ALLOWED_ACHIEVEMENT_ICON_TYPES.has(file.type as GenerateAchievementIconUploadUrlRequest['contentType'])) {
    throw new Error('Icon chỉ hỗ trợ JPG, JPEG, PNG hoặc WEBP.')
  }

  if (file.size <= 0) {
    throw new Error('File icon không hợp lệ.')
  }

  if (file.size > MAX_ACHIEVEMENT_ICON_SIZE_BYTES) {
    throw new Error('Kích thước icon phải nhỏ hơn hoặc bằng 10 MB.')
  }
}

export function requestAchievementIconUploadUrl(file: File): Promise<AchievementIconUploadUrlDto> {
  validateAchievementIcon(file)

  return achievementApi.createIconUploadUrl({
    fileName: file.name,
    contentType: file.type as GenerateAchievementIconUploadUrlRequest['contentType'],
    fileSize: file.size,
  })
}

export async function uploadAchievementIcon(file: File) {
  const uploadMeta = await requestAchievementIconUploadUrl(file)
  await uploadFileToPresignedUrl(uploadMeta.uploadUrl, file)
  return uploadMeta.publicUrl
}
