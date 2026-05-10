export type SessionStatus =
  | 'Available'
  | 'Pending'
  | 'Confirmed'
  | 'InProgress'
  | 'PendingReview'
  | 'Completed'
  | 'Cancelled'
  | 'Disputed'

export type SessionRoleFilter = 'learner' | 'companion'
export type SessionActorRole = SessionRoleFilter | 'viewer'

export interface SessionDto {
  sessionId: string
  companionId: string
  learnerId: string | null
  skill: string
  description: string | null
  durationMinutes: number
  pointCost: number
  scheduledAt: string
  status: SessionStatus
  jitsiRoomId: string | null
  actualStartAt: string | null
  actualEndAt: string | null
  actualDuration: number | null
  learnerConfirmed: boolean
  companionConfirmed: boolean
  cancelReason: string | null
  cancelledAt: string | null
  disbursedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface SessionStatusDto {
  status: SessionStatus
  learnerConfirmed: boolean
  companionConfirmed: boolean
}

export interface CreateSessionPayload {
  skill: string
  description?: string
  durationMinutes: number
  pointCost: number
  scheduledAt: string
}

export interface SessionsListParams {
  status?: SessionStatus | ''
  role?: SessionRoleFilter
  page?: number
  limit?: number
}

export interface RejectSessionPayload {
  reason?: string
}

export interface CancelSessionPayload {
  reason?: string
}

export interface LeaveSessionPayload {
  actualDuration?: number
}
