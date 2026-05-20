import { apiGet, apiPost } from '../../api/client'
import { cacheScope } from '../../api/cacheScope'
import { toQueryString } from '../../api/query'
import type { PaginatedResponse } from '../../api/types'
import type {
  BookSessionRequest,
  CancelSessionPayload,
  CreateSessionRequest,
  LeaveSessionPayload,
  RejectSessionPayload,
  SessionDto,
  SessionRoomAccessDto,
  SessionStatusDto,
  SessionsListParams,
} from './types'

export const sessionKeys = {
  all: () => cacheScope.user(undefined, 'sessions'),
  lists: () => cacheScope.user(undefined, 'sessions', 'list'),
  list: (params: SessionsListParams) => cacheScope.user(undefined, 'sessions', 'list', params),
  details: () => cacheScope.user(undefined, 'sessions', 'detail'),
  detail: (sessionId: string) => cacheScope.user(undefined, 'sessions', 'detail', sessionId),
  roomAccesses: () => cacheScope.user(undefined, 'sessions', 'room-access'),
  roomAccess: (sessionId: string) => cacheScope.user(undefined, 'sessions', 'room-access', sessionId),
  statuses: () => cacheScope.user(undefined, 'sessions', 'status'),
  status: (sessionId: string) => cacheScope.user(undefined, 'sessions', 'status', sessionId),
}

export const sessionsApi = {
  create: (payload: CreateSessionRequest) => apiPost<SessionDto>('/api/sessions', payload, { auth: true }),

  list: (params: SessionsListParams) =>
    apiGet<PaginatedResponse<SessionDto>>(`/api/sessions${toQueryString(params)}`, { auth: true }),

  getById: (sessionId: string) => apiGet<SessionDto>(`/api/sessions/${sessionId}`, { auth: true }),

  getRoomAccess: (sessionId: string) =>
    apiGet<SessionRoomAccessDto>(`/api/sessions/${sessionId}/room-access`, { auth: true }),

  book: (sessionId: string, payload: BookSessionRequest) =>
    apiPost<SessionDto>(`/api/sessions/${sessionId}/book`, payload, { auth: true }),

  confirm: (sessionId: string) =>
    apiPost<SessionDto>(`/api/sessions/${sessionId}/confirm`, undefined, { auth: true }),

  reject: (sessionId: string, payload: RejectSessionPayload) =>
    apiPost<SessionDto>(`/api/sessions/${sessionId}/reject`, payload, { auth: true }),

  cancel: (sessionId: string, payload: CancelSessionPayload) =>
    apiPost<SessionDto>(`/api/sessions/${sessionId}/cancel`, payload, { auth: true }),

  join: (sessionId: string) => apiPost<SessionDto>(`/api/sessions/${sessionId}/join`, undefined, { auth: true }),

  leave: (sessionId: string, payload: LeaveSessionPayload) =>
    apiPost<SessionDto>(`/api/sessions/${sessionId}/leave`, payload, { auth: true }),

  confirmCompletion: (sessionId: string) =>
    apiPost<void>(`/api/sessions/${sessionId}/confirm-completion`, undefined, { auth: true }),

  getStatus: (sessionId: string) =>
    apiGet<SessionStatusDto>(`/api/sessions/${sessionId}/status`, { auth: true }),
}
