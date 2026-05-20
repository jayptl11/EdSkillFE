import { apiGet, apiPatch, apiPost } from '../../api/client'
import { cacheScope } from '../../api/cacheScope'
import type { AdminConfigItemDto, GrantPointsPayload, GrantPointsResponse } from './types'

export const adminSessionWalletKeys = {
  all: () => cacheScope.user(undefined, 'admin-session-wallet'),
  config: () => cacheScope.user(undefined, 'admin-session-wallet', 'config'),
}

export const adminSessionWalletApi = {
  grantPoints: (payload: GrantPointsPayload) =>
    apiPost<GrantPointsResponse>('/api/admin/points/grant', payload, { auth: true }),

  getConfig: () => apiGet<AdminConfigItemDto[]>('/api/admin/config', { auth: true }),

  patchConfig: (key: string, value: string) =>
    apiPatch<AdminConfigItemDto>(`/api/admin/config/${encodeURIComponent(key)}`, { value }, { auth: true }),
}
