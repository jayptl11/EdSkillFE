import { useAppStore } from '../store/useAppStore'
import { apiPost } from './client'
import type { LoginResponse } from './session'
import type { AcceptedPolicyInput } from '../features/policies/types'

export {
  authExpiredEventName,
  createApiError,
  getErrorMessage,
  isApiError,
  type ApiError,
} from './client'
export { normalizeSession, type LoginResponse } from './session'

export type SignupIntent = 'learn' | 'teach'

export interface RegisterRequest {
  email: string
  username: string
  firstName: string
  lastName: string
  password: string
  signupIntent: SignupIntent
  acceptedPolicies: AcceptedPolicyInput[]
}

export interface LoginRequest {
  identifier: string
  password: string
}

export interface VerifyOtpResponse {
  purpose?: 'Register' | 'ResetPassword' | string
  resetToken?: string | null
  message?: string
  userId?: string
  email?: string | null
  username?: string | null
  createdAt?: string
}

export const register = (payload: RegisterRequest) =>
  apiPost<{ message?: string }>('/api/auth/register', payload)

export const verifyOtp = (email: string, otp: string) =>
  apiPost<VerifyOtpResponse>('/api/auth/verify-otp', { email, otp })

export const resendOtp = (email: string) =>
  apiPost<{ message?: string }>('/api/auth/resend-otp', { email })

export const login = (payload: LoginRequest) => apiPost<LoginResponse>('/api/auth/login', payload)

export const forgotPassword = (email: string) =>
  apiPost<{ message?: string }>('/api/auth/forgot-password', { email })

export const resetPassword = (resetToken: string, newPassword: string) =>
  apiPost<{ message?: string }>('/api/auth/reset-password', { resetToken, newPassword })

export const logout = () => {
  const session = useAppStore.getState().session

  return apiPost<{ message?: string }>(
    '/api/auth/logout',
    { refreshToken: session?.refreshToken },
    { auth: true },
  )
}
