import type { SessionDto } from '../sessions/types'

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
}

export interface MySpaceDto {
  companionSessions: MySpaceSessionDto[]
  learnerSessions: MySpaceSessionDto[]
}
