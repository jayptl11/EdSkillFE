import type { QueryClient } from '@tanstack/react-query'
import { mySpaceKeys } from '../my-space/mySpaceApi'
import { walletKeys } from '../wallet/walletApi'
import { sessionKeys } from './sessionsApi'
import type {
  AllowedDurationMinutes,
  CreateSessionRequest,
  SessionActorRole,
  SessionDto,
  SessionRoomAccessDto,
  SessionStatus,
} from './types'
import { getSessionStatusClassName as getNormalizedSessionStatusClassName, normalizeSessionStatus } from './sessionNormalization'

const activePollingStatuses: SessionStatus[] = ['Pending', 'Confirmed', 'InProgress', 'PendingReview']
const SESSION_DATE_TIME_WITHOUT_ZONE_PATTERN = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d{1,7})?)?$/
const SESSION_DATE_TIME_WITH_ZONE_PATTERN = /(?:Z|[+-]\d{2}:\d{2})$/i

function normalizeSessionDateTimeString(value: string) {
  const trimmedValue = value.trim()

  if (!SESSION_DATE_TIME_WITHOUT_ZONE_PATTERN.test(trimmedValue) || SESSION_DATE_TIME_WITH_ZONE_PATTERN.test(trimmedValue)) {
    return trimmedValue
  }

  return `${trimmedValue.replace(' ', 'T')}Z`
}

export function parseSessionDateTime(value: string | Date | null | undefined) {
  if (!value) {
    return null
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }

  const parsedDate = new Date(normalizeSessionDateTimeString(value))
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate
}

export function formatSessionDateTime(value: string | null) {
  const date = parseSessionDateTime(value)

  if (!date) {
    return 'Chưa có'
  }

  return date.toLocaleString('vi-VN', {
    hour12: false,
  })
}

export function formatSessionPoints(value: number) {
  return `${new Intl.NumberFormat().format(value)} points`
}

export function getSessionStatusLabel(status: SessionStatus | string | number) {
  const normalizedStatus = normalizeSessionStatus(status)

  return {
    Available: 'Available',
    Pending: 'Pending',
    Confirmed: 'Confirmed',
    InProgress: 'In progress',
    PendingReview: 'Pending review',
    Completed: 'Completed',
    Cancelled: 'Cancelled',
    Disputed: 'Disputed',
  }[normalizedStatus]
}

export function getSessionStatusClassName(status: SessionStatus | string | number) {
  return getNormalizedSessionStatusClassName(status)
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

export function canOpenSessionRoomPage(
  access?: Pick<SessionRoomAccessDto, 'canOpenRoomPage' | 'canJoin'> | null,
) {
  if (!access) {
    return false
  }

  return access.canOpenRoomPage === true || access.canJoin === true
}

export function getSessionRoomEntryLabel(
  access?: Pick<SessionRoomAccessDto, 'denyCode' | 'joinOpenAt' | 'joinCloseAt'> | null,
  isLoading = false,
) {
  if (isLoading) {
    return 'Đang kiểm tra phòng học'
  }

  if (access?.denyCode === 'SESSION_HOST_NOT_READY') {
    return 'Đợi Companion mở phòng'
  }

  if (access?.denyCode === 'SESSION_JOIN_WINDOW_CLOSED') {
    const now = Date.now()
    const openAt = parseSessionDateTime(access.joinOpenAt)?.getTime() ?? Number.NaN
    const closeAt = parseSessionDateTime(access.joinCloseAt)?.getTime() ?? Number.NaN

    if (Number.isFinite(closeAt) && now > closeAt) {
      return 'Đã qua thời gian'
    }

    if (Number.isFinite(openAt) && now < openAt) {
      return 'Chưa tới giờ vào phòng'
    }
  }

  return 'Chưa thể vào phòng'
}

export function canRenderSessionRoomEntry(session: Pick<SessionDto, 'deliveryMode' | 'status' | 'jitsiRoomId'>) {
  return (
    session.deliveryMode === 'Online'
    && (session.status === 'Confirmed' || session.status === 'InProgress')
    && session.jitsiRoomId !== null
  )
}

export function toUtcIsoFromLocalDateTime(localValue: string) {
  return new Date(localValue).toISOString()
}

export function toLocalDateTimeInputValue(value: string | Date) {
  const date = parseSessionDateTime(value)

  if (!date) {
    return ''
  }

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')

  return `${year}-${month}-${day}T${hours}:${minutes}`
}

export function toDateTimeLocalValue(date: Date) {
  return toLocalDateTimeInputValue(date)
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
    queryClient.invalidateQueries({ queryKey: mySpaceKeys.root() }),
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
