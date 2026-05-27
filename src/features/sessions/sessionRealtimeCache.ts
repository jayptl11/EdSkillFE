import type { MySpaceDto, MySpaceRoomAccessDto, MySpaceSessionDto } from '../my-space/types'
import type { SessionDto, SessionRoomAccessDto, SessionRoomStateDto } from './types'

interface MySpaceSessionPatchResult {
  found: boolean
  nextData: MySpaceDto | undefined
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
      session,
    }
  })

  return {
    changed,
    found,
    items: nextItems,
  }
}

function patchMySpaceRoomAccess(roomAccess: MySpaceRoomAccessDto | undefined, roomState: SessionRoomStateDto) {
  if (!roomAccess) {
    return roomAccess
  }

  const nextHostReady = roomState.hasCompanionJoined

  if (
    roomAccess.hostReady === nextHostReady
    && roomAccess.hasCompanionJoined === roomState.hasCompanionJoined
    && roomAccess.joinOpenAt === roomState.joinOpenAt
    && roomAccess.joinCloseAt === roomState.joinCloseAt
  ) {
    return roomAccess
  }

  return {
    ...roomAccess,
    hostReady: nextHostReady,
    hasCompanionJoined: roomState.hasCompanionJoined,
    joinOpenAt: roomState.joinOpenAt,
    joinCloseAt: roomState.joinCloseAt,
  }
}

function patchMySpaceRoomStateCollection(items: MySpaceSessionDto[], roomState: SessionRoomStateDto) {
  let changed = false

  const nextItems = items.map((item) => {
    if (item.session.sessionId !== roomState.sessionId) {
      return item
    }

    const nextRoomAccess = patchMySpaceRoomAccess(item.roomAccess, roomState)
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

  const companion = patchMySpaceRoomStateCollection(current.companionSessions, roomState)
  const learner = patchMySpaceRoomStateCollection(current.learnerSessions, roomState)

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

  if (
    current.status === roomState.status
    && current.hostReady === nextHostReady
    && current.hasCompanionJoined === roomState.hasCompanionJoined
    && current.joinOpenAt === roomState.joinOpenAt
    && current.joinCloseAt === roomState.joinCloseAt
  ) {
    return current
  }

  return {
    ...current,
    status: roomState.status,
    hostReady: nextHostReady,
    hasCompanionJoined: roomState.hasCompanionJoined,
    joinOpenAt: roomState.joinOpenAt,
    joinCloseAt: roomState.joinCloseAt,
  }
}
