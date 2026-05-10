import { apiGet, apiPatch, apiPost } from '../../api/client'
import type { AdminConfigItemDto, GrantPointsPayload, GrantPointsResponse } from './types'

export const adminSessionWalletKeys = {
  all: () => ['admin-session-wallet'] as const,
  config: () => ['admin-session-wallet', 'config'] as const,
}

export const adminSessionWalletApi = {
  grantPoints: (payload: GrantPointsPayload) =>
    apiPost<GrantPointsResponse>('/api/admin/points/grant', payload, { auth: true }),

  getConfig: () => apiGet<AdminConfigItemDto[]>('/api/admin/config', { auth: true }),

  patchConfig: (key: string, value: string) =>
    apiPatch<AdminConfigItemDto>(`/api/admin/config/${encodeURIComponent(key)}`, { value }, { auth: true }),
}
