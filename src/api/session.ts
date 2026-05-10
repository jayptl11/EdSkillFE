import { type AuthSession, type UserRole } from '../store/useAppStore'

export interface LoginResponse {
  accessToken: string | null
  refreshToken: string | null
  userId: string
  email: string | null
  username: string | null
  lastLogin: string | null
  roles: string[] | null
  shouldPromptDailyReminderTime: boolean
}

export const normalizeSession = (response: LoginResponse): AuthSession => ({
  accessToken: response.accessToken ?? '',
  refreshToken: response.refreshToken ?? '',
  userId: response.userId,
  email: response.email ?? '',
  username: response.username ?? '',
  roles: normalizeRoles(response.roles),
  lastLogin: response.lastLogin,
  shouldPromptDailyReminderTime: response.shouldPromptDailyReminderTime,
})

const normalizeRoles = (roles: string[] | null): UserRole[] => {
  const validRoles = new Set<UserRole>(['learner', 'companion', 'admin'])
  const normalized = (roles ?? []).filter((role): role is UserRole =>
    validRoles.has(role as UserRole),
  )

  return normalized.length > 0 ? normalized : ['learner']
}
