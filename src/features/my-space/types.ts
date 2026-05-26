import type { SessionDto, SessionRoomAccessDto } from '../sessions/types'

export interface MySpaceSkillDto {
  skillId: string
  name: string
  iconKey: string | null
}

export interface MySpaceUserSummaryDto {
  userId: string
  displayName: string
  avatarUrl: string | null
}

export interface MySpaceSessionDto {
  session: SessionDto
  skill: MySpaceSkillDto | null
  companion: MySpaceUserSummaryDto
  learner: MySpaceUserSummaryDto | null
  roomAccess?: Pick<SessionRoomAccessDto, 'canOpenRoomPage' | 'canJoin' | 'denyCode' | 'denyMessage' | 'joinOpenAt' | 'joinCloseAt'>
}

export interface MySpaceDto {
  companionSessions: MySpaceSessionDto[]
  learnerSessions: MySpaceSessionDto[]
}
