import type { MySpaceDto, MySpaceRoomAccessDto, MySpaceSessionDto } from '../my-space/types'
import type { SessionDto, SessionRoomAccessDto, SessionRoomStateDto } from './types'

interface MySpaceSessionPatchResult {
  found: boolean
  nextData: MySpaceDto | undefined
}

function canOpenRoomFromRoomState(roomState: SessionRoomStateDto, role: 'companion' | 'learner') {
  const isJoinableStatus = roomState.status === 'Confirmed' || roomState.status === 'InProgress'
  return isJoinableStatus && (role === 'companion' || roomState.hasCompanionJoined)
}

function patchMySpaceSessionCollection(items: MySpaceSessionDto[], session: SessionDto) {
  let found = false
  let changed = false

  const nextItems = items.map((item) => {
    if (item.session.sessionId !== session.sessionId) {
      return item
    }

    found = true

    if (item.session === session) {
      return item
    }

    changed = true
    return {
      ...item,
      session: {
        ...item.session,
        ...session,
      },
    }
  })

  return {
    changed,
    found,
    items: nextItems,
  }
}

function patchMySpaceRoomAccess(
  roomAccess: MySpaceRoomAccessDto | undefined,
  roomState: SessionRoomStateDto,
  role: 'companion' | 'learner',
) {
  if (!roomAccess) {
    return roomAccess
  }

  const nextHostReady = roomState.hasCompanionJoined
  const nextCanOpenRoomPage = canOpenRoomFromRoomState(roomState, role)
  const nextDenyCode = nextCanOpenRoomPage
    ? null
    : role === 'learner' && !nextHostReady && (roomState.status === 'Confirmed' || roomState.status === 'InProgress')
      ? 'SESSION_HOST_NOT_READY'
      : roomAccess.denyCode

  if (
    roomAccess.hostReady === nextHostReady
    && roomAccess.hasCompanionJoined === roomState.hasCompanionJoined
    && roomAccess.canJoin === nextCanOpenRoomPage
    && roomAccess.canOpenRoomPage === nextCanOpenRoomPage
    && roomAccess.denyCode === nextDenyCode
    && roomAccess.joinOpenAt === roomState.joinOpenAt
    && roomAccess.joinCloseAt === roomState.joinCloseAt
  ) {
    return roomAccess
  }

  return {
    ...roomAccess,
    canJoin: nextCanOpenRoomPage,
    canOpenRoomPage: nextCanOpenRoomPage,
    denyCode: nextDenyCode,
    denyMessage: nextCanOpenRoomPage ? null : roomAccess.denyMessage,
    hostReady: nextHostReady,
    hasCompanionJoined: roomState.hasCompanionJoined,
    joinOpenAt: roomState.joinOpenAt,
    joinCloseAt: roomState.joinCloseAt,
  }
}

function patchMySpaceRoomStateCollection(
  items: MySpaceSessionDto[],
  roomState: SessionRoomStateDto,
  role: 'companion' | 'learner',
) {
  let changed = false

  const nextItems = items.map((item) => {
    if (item.session.sessionId !== roomState.sessionId) {
      return item
    }

    const nextRoomAccess = patchMySpaceRoomAccess(item.roomAccess, roomState, role)
    if (nextRoomAccess === item.roomAccess) {
      return item
    }

    changed = true
    return {
      ...item,
      roomAccess: nextRoomAccess,
    }
  })

  return {
    changed,
    items: nextItems,
  }
}

export function patchMySpaceSessionData(current: MySpaceDto | undefined, session: SessionDto): MySpaceSessionPatchResult {
  if (!current) {
    return { found: false, nextData: current }
  }

  const companion = patchMySpaceSessionCollection(current.companionSessions, session)
  const learner = patchMySpaceSessionCollection(current.learnerSessions, session)

  if (!companion.changed && !learner.changed) {
    return {
      found: companion.found || learner.found,
      nextData: current,
    }
  }

  return {
    found: companion.found || learner.found,
    nextData: {
      ...current,
      companionSessions: companion.items,
      learnerSessions: learner.items,
    },
  }
}

export function patchMySpaceRoomStateData(current: MySpaceDto | undefined, roomState: SessionRoomStateDto) {
  if (!current) {
    return current
  }

  const companion = patchMySpaceRoomStateCollection(current.companionSessions, roomState, 'companion')
  const learner = patchMySpaceRoomStateCollection(current.learnerSessions, roomState, 'learner')

  if (!companion.changed && !learner.changed) {
    return current
  }

  return {
    ...current,
    companionSessions: companion.items,
    learnerSessions: learner.items,
  }
}

export function patchSessionRoomAccessData(
  current: SessionRoomAccessDto | undefined,
  roomState: SessionRoomStateDto,
) {
  if (!current || current.sessionId !== roomState.sessionId) {
    return current
  }

  const nextHostReady = roomState.hasCompanionJoined
  const nextCanOpenRoomPage = canOpenRoomFromRoomState(roomState, current.role)
  const nextDenyCode = nextCanOpenRoomPage
    ? null
    : current.role === 'learner' && !nextHostReady && (roomState.status === 'Confirmed' || roomState.status === 'InProgress')
      ? 'SESSION_HOST_NOT_READY'
      : current.denyCode

  if (
    current.status === roomState.status
    && current.hostReady === nextHostReady
    && current.hasCompanionJoined === roomState.hasCompanionJoined
    && current.canJoin === nextCanOpenRoomPage
    && current.canOpenRoomPage === nextCanOpenRoomPage
    && current.denyCode === nextDenyCode
    && current.joinOpenAt === roomState.joinOpenAt
    && current.joinCloseAt === roomState.joinCloseAt
  ) {
    return current
  }

  return {
    ...current,
    canJoin: nextCanOpenRoomPage,
    canOpenRoomPage: nextCanOpenRoomPage,
    denyCode: nextDenyCode,
    denyMessage: nextCanOpenRoomPage ? null : current.denyMessage,
    status: roomState.status,
    hostReady: nextHostReady,
    hasCompanionJoined: roomState.hasCompanionJoined,
    joinOpenAt: roomState.joinOpenAt,
    joinCloseAt: roomState.joinCloseAt,
  }
}
