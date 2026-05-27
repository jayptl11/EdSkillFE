import type { PaginatedResponse } from '../../api/types'
import type { SessionDto, SessionRoomAccessDto, SessionRoomStateDto, SessionStatus, SessionStatusDto } from './types'

const sessionStatuses: SessionStatus[] = [
  'Available',
  'Pending',
  'Confirmed',
  'InProgress',
  'PendingReview',
  'Completed',
  'Cancelled',
  'Disputed',
]

export function normalizeSessionStatus(status: unknown): SessionStatus {
  if (typeof status === 'string') {
    if ((sessionStatuses as string[]).includes(status)) {
      return status as SessionStatus
    }

    const numericStatus = Number(status)
    if (Number.isInteger(numericStatus) && numericStatus >= 0 && numericStatus < sessionStatuses.length) {
      return sessionStatuses[numericStatus]
    }
  }

  if (typeof status === 'number' && Number.isInteger(status) && status >= 0 && status < sessionStatuses.length) {
    return sessionStatuses[status]
  }

  return 'Available'
}

export function getSessionStatusClassName(status: unknown) {
  return `status-${normalizeSessionStatus(status).toLowerCase()}`
}

export function normalizeSessionDto(session: SessionDto): SessionDto {
  return {
    ...session,
    status: normalizeSessionStatus(session.status),
  }
}

export function normalizeSessionStatusDto(statusDto: SessionStatusDto): SessionStatusDto {
  return {
    ...statusDto,
    status: normalizeSessionStatus(statusDto.status),
  }
}

export function normalizeSessionRoomAccessDto(roomAccess: SessionRoomAccessDto): SessionRoomAccessDto {
  return {
    ...roomAccess,
    status: normalizeSessionStatus(roomAccess.status),
  }
}

export function normalizeSessionRoomStateDto(roomState: SessionRoomStateDto): SessionRoomStateDto {
  return {
    ...roomState,
    status: normalizeSessionStatus(roomState.status),
  }
}

export function normalizePaginatedSessions(response: PaginatedResponse<SessionDto>): PaginatedResponse<SessionDto> {
  return {
    ...response,
    data: response.data.map(normalizeSessionDto),
  }
}
