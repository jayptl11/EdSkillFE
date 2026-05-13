import { apiGet, apiPost, apiPut } from '../../api/client'
import type {
  AvatarUploadUrlDto,
  CredentialUploadUrlDto,
  GenerateAvatarUploadUrlRequest,
  GenerateCredentialUploadUrlRequest,
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
    apiPut<ProfileDto>('/api/profile/me', payload, { auth: true }),

  enableCompanion: () => apiPost<ProfileDto>('/api/profile/me/enable-companion', undefined, { auth: true }),

  getUserProfile: (userId: string) => apiGet<ProfileDto>(`/api/profile/${userId}`),

  createAvatarUploadUrl: (payload: GenerateAvatarUploadUrlRequest) =>
    apiPost<AvatarUploadUrlDto>('/api/profile/me/avatar-upload-url', payload, { auth: true }),

  createCredentialUploadUrl: (payload: GenerateCredentialUploadUrlRequest) =>
    apiPost<CredentialUploadUrlDto>('/api/profile/me/credential-upload-url', payload, { auth: true }),
}

export function requestAvatarUploadUrl(file: File): Promise<AvatarUploadUrlDto> {
  return profileApi.createAvatarUploadUrl({
    fileName: file.name,
    contentType: file.type as GenerateAvatarUploadUrlRequest['contentType'],
    fileSize: file.size,
  })
}

export function requestCredentialUploadUrl(file: File): Promise<CredentialUploadUrlDto> {
  return profileApi.createCredentialUploadUrl({
    fileName: file.name,
    contentType: file.type as GenerateCredentialUploadUrlRequest['contentType'],
    fileSize: file.size,
  })
}

export async function uploadFileToPresignedUrl(uploadUrl: string, file: File): Promise<void> {
  let response: Response

  try {
    response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type,
      },
      body: file,
    })
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(
        'Không thể tải tệp lên storage. Nếu request PUT tối giản này vẫn bị CORS thì đây là vấn đề cấu hình CORS của bucket R2, FE không tự xử lý hoàn toàn được.',
        { cause: error },
      )
    }

    throw new Error('Không thể tải tệp lên storage. Vui lòng thử lại.', { cause: error })
  }

  if (!response.ok) {
    throw new Error('Tải tệp lên storage thất bại. Vui lòng thử lại.')
  }
}

export function saveAvatarUrl(publicUrl: string): Promise<ProfileDto> {
  return profileApi.updateMyProfile({ avatarUrl: publicUrl })
}

export function clearSavedAvatar(): Promise<ProfileDto> {
  return profileApi.updateMyProfile({ avatarUrl: null })
}
