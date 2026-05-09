import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type UserRole = 'learner' | 'companion' | 'admin'

export interface AuthSession {
  accessToken: string
  refreshToken: string
  userId: string
  email: string
  username: string
  roles: UserRole[]
  lastLogin: string | null
  shouldPromptDailyReminderTime: boolean
}

interface AppState {
  session: AuthSession | null
  setSession: (session: AuthSession) => void
  clearSession: () => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      session: null,
      setSession: (session) => set({ session }),
      clearSession: () => set({ session: null }),
    }),
    {
      name: 'edskill-auth-session',
      version: 1,
    },
  ),
)
