import { apiGet } from '../../api/client'
import { cacheScope } from '../../api/cacheScope'
import type { MySpaceDto, MySpaceRoomAccessDto } from './types'
import { normalizeSessionDto } from '../sessions/sessionNormalization'

interface RawMySpaceRoomAccessDto extends Omit<MySpaceRoomAccessDto, 'canJoin'> {
  canJoin?: boolean
  canJoinNow?: boolean
}

interface RawMySpaceDto extends Omit<MySpaceDto, 'companionSessions' | 'learnerSessions'> {
  companionSessions: Array<MySpaceDto['companionSessions'][number] & { roomAccess?: RawMySpaceRoomAccessDto | null }>
  learnerSessions: Array<MySpaceDto['learnerSessions'][number] & { roomAccess?: RawMySpaceRoomAccessDto | null }>
}

function normalizeRoomAccess(roomAccess?: RawMySpaceRoomAccessDto | null) {
  if (!roomAccess) {
    return undefined
  }

  return {
    ...roomAccess,
    canJoin: roomAccess.canJoin ?? roomAccess.canJoinNow ?? false,
    hostReady: roomAccess.hostReady ?? roomAccess.hasCompanionJoined ?? false,
    hasCompanionJoined: roomAccess.hasCompanionJoined ?? roomAccess.hostReady ?? false,
  } satisfies MySpaceRoomAccessDto
}

function normalizeMySpace(dto: RawMySpaceDto): MySpaceDto {
  return {
    ...dto,
    companionSessions: dto.companionSessions.map((item) => ({
      ...item,
      session: normalizeSessionDto(item.session),
      roomAccess: normalizeRoomAccess(item.roomAccess),
    })),
    learnerSessions: dto.learnerSessions.map((item) => ({
      ...item,
      session: normalizeSessionDto(item.session),
      roomAccess: normalizeRoomAccess(item.roomAccess),
    })),
  }
}

export const mySpaceKeys = {
  root: () => cacheScope.user(undefined, 'my-space'),
  me: () => cacheScope.user(undefined, 'my-space', 'me'),
}

export const mySpaceApi = {
  getMySpace: async () => normalizeMySpace(await apiGet<RawMySpaceDto>('/api/my-space', { auth: true })),
}
