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
import {
  normalizePaginatedSessions,
  normalizeSessionDto,
  normalizeSessionRoomAccessDto,
  normalizeSessionStatusDto,
} from './sessionNormalization'

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
  create: async (payload: CreateSessionRequest) =>
    normalizeSessionDto(await apiPost<SessionDto>('/api/sessions', payload, { auth: true })),

  list: async (params: SessionsListParams) =>
    normalizePaginatedSessions(await apiGet<PaginatedResponse<SessionDto>>(`/api/sessions${toQueryString(params)}`, { auth: true })),

  getById: async (sessionId: string) =>
    normalizeSessionDto(await apiGet<SessionDto>(`/api/sessions/${sessionId}`, { auth: true })),

  getRoomAccess: async (sessionId: string) =>
    normalizeSessionRoomAccessDto(await apiGet<SessionRoomAccessDto>(`/api/sessions/${sessionId}/room-access`, { auth: true })),

  book: async (sessionId: string, payload: BookSessionRequest) =>
    normalizeSessionDto(await apiPost<SessionDto>(`/api/sessions/${sessionId}/book`, payload, { auth: true })),

  confirm: async (sessionId: string) =>
    normalizeSessionDto(await apiPost<SessionDto>(`/api/sessions/${sessionId}/confirm`, undefined, { auth: true })),

  reject: async (sessionId: string, payload: RejectSessionPayload) =>
    normalizeSessionDto(await apiPost<SessionDto>(`/api/sessions/${sessionId}/reject`, payload, { auth: true })),

  cancel: async (sessionId: string, payload: CancelSessionPayload) =>
    normalizeSessionDto(await apiPost<SessionDto>(`/api/sessions/${sessionId}/cancel`, payload, { auth: true })),

  join: async (sessionId: string) =>
    normalizeSessionDto(await apiPost<SessionDto>(`/api/sessions/${sessionId}/join`, undefined, { auth: true })),

  leave: async (sessionId: string, payload: LeaveSessionPayload) =>
    normalizeSessionDto(await apiPost<SessionDto>(`/api/sessions/${sessionId}/leave`, payload, { auth: true })),

  confirmCompletion: (sessionId: string) =>
    apiPost<void>(`/api/sessions/${sessionId}/confirm-completion`, undefined, { auth: true }),

  getStatus: async (sessionId: string) =>
    normalizeSessionStatusDto(await apiGet<SessionStatusDto>(`/api/sessions/${sessionId}/status`, { auth: true })),
}
