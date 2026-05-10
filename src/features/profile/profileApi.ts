import { apiGet, apiPatch, apiPost } from '../../api/client'
import type {
  AvatarUploadUrlDto,
  GenerateAvatarUploadUrlRequest,
  ProfileDto,
  UpdateMyProfilePayload,
} from './types'

export const profileKeys = {
  me: () => ['profile', 'me'] as const,
  user: (userId: string) => ['profile', userId] as const,
}

export const profileApi = {
  getMyProfile: () => apiGet<ProfileDto>('/api/profile/me', { auth: true }),

  updateMyProfile: (payload: UpdateMyProfilePayload) =>
    apiPatch<ProfileDto>('/api/profile/me', payload, { auth: true }),

  getUserProfile: (userId: string) => apiGet<ProfileDto>(`/api/profile/${userId}`),

  createAvatarUploadUrl: (payload: GenerateAvatarUploadUrlRequest) =>
    apiPost<AvatarUploadUrlDto>('/api/profile/me/avatar-upload-url', payload, { auth: true }),
}

export async function uploadAvatar(file: File): Promise<string> {
  const meta = await profileApi.createAvatarUploadUrl({
    fileName: file.name,
    contentType: file.type as GenerateAvatarUploadUrlRequest['contentType'],
    fileSize: file.size,
  })

  const uploadResponse = await fetch(meta.uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type,
    },
    body: file,
  })

  if (!uploadResponse.ok) {
    throw new Error('Avatar upload failed')
  }

  return meta.publicUrl
}
