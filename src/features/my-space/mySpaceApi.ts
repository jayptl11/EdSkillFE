import { apiGet } from '../../api/client'
import { cacheScope } from '../../api/cacheScope'
import type { MySpaceDto } from './types'

export const mySpaceKeys = {
  root: () => cacheScope.user(undefined, 'my-space'),
  me: () => cacheScope.user(undefined, 'my-space', 'me'),
}

export const mySpaceApi = {
  getMySpace: () => apiGet<MySpaceDto>('/api/my-space', { auth: true }),
}
