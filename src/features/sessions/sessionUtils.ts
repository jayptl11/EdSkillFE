import type { QueryClient } from '@tanstack/react-query'
import { walletKeys } from '../wallet/walletApi'
import { sessionKeys } from './sessionsApi'
import type { AllowedDurationMinutes, CreateSessionRequest, SessionActorRole, SessionDto, SessionStatus } from './types'

const activePollingStatuses: SessionStatus[] = ['Pending', 'Confirmed', 'InProgress', 'PendingReview']

export function formatSessionDateTime(value: string | null) {
  if (!value) {
    return 'Chưa có'
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function formatSessionPoints(value: number) {
  return `${new Intl.NumberFormat().format(value)} points`
}

export function getSessionStatusLabel(status: SessionStatus) {
  return {
    Available: 'Available',
    Pending: 'Pending',
    Confirmed: 'Confirmed',
    InProgress: 'In progress',
    PendingReview: 'Pending review',
    Completed: 'Completed',
    Cancelled: 'Cancelled',
    Disputed: 'Disputed',
  }[status]
}

export function getCurrentSessionRole(session: SessionDto, userId?: string | null): SessionActorRole {
  if (!userId) {
    return 'viewer'
  }

  if (session.companionId === userId) {
    return 'companion'
  }

  if (session.learnerId === userId) {
    return 'learner'
  }

  return 'viewer'
}

export function canBookSession(session: SessionDto, userId?: string | null) {
  return session.status === 'Available' && Boolean(userId) && session.companionId !== userId
}

export function canCancelSession(session: SessionDto, actorRole: SessionActorRole) {
  if (actorRole === 'viewer') {
    return false
  }

  return session.status === 'Pending' || session.status === 'Confirmed'
}

export function shouldPollSessionStatus(status: SessionStatus | null | undefined) {
  return status ? activePollingStatuses.includes(status) : false
}

export function buildJitsiUrl(roomId: string) {
  const baseUrl = import.meta.env.VITE_JITSI_BASE_URL?.replace(/\/$/, '') ?? 'https://meet.jit.si'
  return `${baseUrl}/${roomId}`
}

export function getSessionRoomRoute(sessionId: string) {
  return `/sessions/${sessionId}/room`
}

export function canRenderSessionRoomEntry(session: Pick<SessionDto, 'deliveryMode' | 'status' | 'jitsiRoomId'>) {
  return (
    session.deliveryMode === 'Online'
    && (session.status === 'Confirmed' || session.status === 'InProgress')
    && session.jitsiRoomId !== null
  )
}

export function toDateTimeLocalValue(date: Date) {
  const offset = date.getTimezoneOffset()
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16)
}

export function buildCreateSessionPayload(input: {
  selectedSkillId: string
  description: string
  selectedMaxDuration: AllowedDurationMinutes
  scheduledAtIso: string
}): CreateSessionRequest {
  return {
    skillId: input.selectedSkillId,
    description: input.description.trim() || null,
    durationOptions: [input.selectedMaxDuration],
    scheduledAt: input.scheduledAtIso,
  }
}

export async function invalidateWalletQueries(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: walletKeys.all() }),
  ])
}

export async function invalidateSessionQueries(queryClient: QueryClient, sessionId?: string) {
  const tasks = [
    queryClient.invalidateQueries({ queryKey: sessionKeys.lists() }),
    queryClient.invalidateQueries({ queryKey: sessionKeys.roomAccesses() }),
    queryClient.invalidateQueries({ queryKey: sessionKeys.statuses() }),
  ]

  if (sessionId) {
    tasks.push(queryClient.invalidateQueries({ queryKey: sessionKeys.detail(sessionId) }))
    tasks.push(queryClient.invalidateQueries({ queryKey: sessionKeys.roomAccess(sessionId) }))
    tasks.push(queryClient.invalidateQueries({ queryKey: sessionKeys.status(sessionId) }))
  } else {
    tasks.push(queryClient.invalidateQueries({ queryKey: sessionKeys.details() }))
  }

  await Promise.all(tasks)
}
