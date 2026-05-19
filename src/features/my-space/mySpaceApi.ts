import { apiGet } from '../../api/client'
import type { MySpaceDto } from './types'

export const mySpaceKeys = {
  me: () => ['my-space', 'me'] as const,
}

export const mySpaceApi = {
  getMySpace: () => apiGet<MySpaceDto>('/api/my-space', { auth: true }),
}
