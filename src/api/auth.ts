import { useAppStore, type AuthSession, type UserRole } from '../store/useAppStore'

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ??
  'https://edskill-production.up.railway.app'

const AUTH_EXPIRED_EVENT = 'edskill:auth-expired'

export type PublicRegisterRole = 'learner' | 'companion'

export interface RegisterRequest {
  email: string
  username: string
  firstName: string
  lastName: string
  password: string
  roles: PublicRegisterRole[]
}

export interface LoginRequest {
  identifier: string
  password: string
}

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

export interface VerifyOtpResponse {
  purpose?: 'Register' | 'ResetPassword' | string
  resetToken?: string | null
  message?: string
  userId?: string
  email?: string | null
  username?: string | null
  createdAt?: string
}

export interface ApiError {
  status: number
  code: string
  message: string
  fieldErrors: string[]
}

interface ProblemDetails {
  errorCode?: string
  errorMessage?: string
  statusCode?: number
  message?: string
  title?: string
  errors?: Array<{
    property?: string
    message?: string
    errorCode?: string
  }>
}

interface ApiRequestOptions extends RequestInit {
  auth?: boolean
  retryOnUnauthorized?: boolean
}

export const authExpiredEventName = AUTH_EXPIRED_EVENT

export const createApiError = (status: number, body: unknown): ApiError => {
  const problem = isRecord(body) ? (body as ProblemDetails) : {}
  const fieldErrors = Array.isArray(problem.errors)
    ? problem.errors.map((error) => error.message).filter(isString)
    : []

  return {
    status,
    code:
      problem.errorCode ??
      problem.errors?.find((error) => error.errorCode)?.errorCode ??
      String(problem.statusCode ?? status),
    message:
      problem.errorMessage ??
      problem.message ??
      problem.title ??
      fieldErrors[0] ??
      'Unable to complete the request.',
    fieldErrors,
  }
}

export const isApiError = (error: unknown): error is ApiError =>
  isRecord(error) &&
  typeof error.status === 'number' &&
  typeof error.code === 'string' &&
  typeof error.message === 'string'

export const getErrorMessage = (error: unknown) => {
  if (isApiError(error)) {
    const message = translateApiError(error.code, error.message)
    const fieldErrors = error.fieldErrors.map((fieldError) =>
      translateApiError(error.code, fieldError),
    )

    return fieldErrors.length > 0 ? [message, ...fieldErrors].join(' ') : message
  }

  if (error instanceof Error) {
    return 'Không thể kết nối tới máy chủ. Vui lòng thử lại.'
  }

  return 'Đã có lỗi xảy ra. Vui lòng thử lại.'
}

export const register = (payload: RegisterRequest) =>
  apiRequest<{ message?: string }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const verifyOtp = (email: string, otp: string) =>
  apiRequest<VerifyOtpResponse>('/api/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ email, otp }),
  })

export const resendOtp = (email: string) =>
  apiRequest<{ message?: string }>('/api/auth/resend-otp', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })

export const login = (payload: LoginRequest) =>
  apiRequest<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const forgotPassword = (email: string) =>
  apiRequest<{ message?: string }>('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })

export const resetPassword = (resetToken: string, newPassword: string) =>
  apiRequest<{ message?: string }>('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ resetToken, newPassword }),
  })

export const logout = () => {
  const session = useAppStore.getState().session

  return apiRequest<{ message?: string }>('/api/auth/logout', {
    method: 'POST',
    auth: true,
    body: JSON.stringify({ refreshToken: session?.refreshToken }),
  })
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

const apiRequest = async <T>(path: string, options: ApiRequestOptions): Promise<T> => {
  const response = await request(path, options)

  if (response.status === 401 && options.auth && options.retryOnUnauthorized !== false) {
    const refreshed = await refreshSession()

    if (refreshed) {
      const retry = await request(path, { ...options, retryOnUnauthorized: false })
      return parseResponse<T>(retry)
    }

    useAppStore.getState().clearSession()
    window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT))
  }

  return parseResponse<T>(response)
}

const request = (path: string, options: ApiRequestOptions) => {
  const session = useAppStore.getState().session
  const headers = new Headers(options.headers)

  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json')
  }

  if (options.auth && session?.accessToken) {
    headers.set('Authorization', `Bearer ${session.accessToken}`)
  }

  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  })
}

const parseResponse = async <T>(response: Response): Promise<T> => {
  const text = await response.text()
  const data = text ? safeJsonParse(text) : {}

  if (!response.ok) {
    throw createApiError(response.status, data)
  }

  return data as T
}

const refreshSession = async () => {
  const refreshToken = useAppStore.getState().session?.refreshToken

  if (!refreshToken) {
    return false
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/refresh-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    })
    const data = await parseResponse<LoginResponse>(response)

    useAppStore.getState().setSession(normalizeSession(data))
    return true
  } catch {
    return false
  }
}

const normalizeRoles = (roles: string[] | null): UserRole[] => {
  const validRoles = new Set<UserRole>(['learner', 'companion', 'admin'])
  const normalized = (roles ?? []).filter((role): role is UserRole =>
    validRoles.has(role as UserRole),
  )

  return normalized.length > 0 ? normalized : ['learner']
}

const safeJsonParse = (value: string) => {
  try {
    return JSON.parse(value)
  } catch {
    return { message: value }
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isString = (value: unknown): value is string => typeof value === 'string'

const translateApiError = (code: string, fallback: string) => {
  const messages: Record<string, string> = {
    ACCOUNT_SUSPENDED: 'Tài khoản đã bị tạm khóa.',
    EMAIL_EXISTS: 'Email này đã được đăng ký.',
    USERNAME_EXISTS: 'Tên đăng nhập này đã tồn tại.',
    INVALID_EMAIL_FORMAT: 'Email không đúng định dạng.',
    INVALID_USERNAME: 'Tên đăng nhập không hợp lệ.',
    INVALID_PASSWORD: 'Mật khẩu không hợp lệ.',
    INVALID_ROLE: 'Vai trò không hợp lệ.',
    OTP_RATE_LIMITED: 'Bạn đã yêu cầu OTP quá nhiều lần. Vui lòng thử lại sau.',
    RESEND_RATE_LIMITED: 'Bạn đã gửi lại OTP quá nhiều lần. Vui lòng thử lại sau.',
    INVALID_OTP: 'Mã OTP không đúng hoặc đã hết hạn.',
    INVALID_PURPOSE: 'Mục đích xác thực OTP không hợp lệ.',
    USER_EXISTS: 'Tài khoản đã tồn tại.',
    USER_NOT_FOUND: 'Không tìm thấy tài khoản.',
    INVALID_CREDENTIALS: 'Thông tin đăng nhập không đúng.',
    INVALID_GOOGLE_TOKEN: 'Token Google không hợp lệ.',
    INVALID_REFRESH_TOKEN: 'Phiên đăng nhập không hợp lệ.',
    TOKEN_EXPIRED: 'Phiên đăng nhập đã hết hạn.',
    TOKEN_REUSE_DETECTED: 'Phát hiện token đã được dùng lại. Vui lòng đăng nhập lại.',
    INVALID_TOKEN: 'Mã xác thực không hợp lệ.',
    '400': 'Thông tin gửi lên chưa hợp lệ.',
    '401': 'Bạn cần đăng nhập để tiếp tục.',
    '403': 'Bạn không có quyền thực hiện thao tác này.',
    '409': 'Dữ liệu đã tồn tại.',
    '429': 'Bạn thao tác quá nhanh. Vui lòng thử lại sau.',
    '500': 'Máy chủ đang gặp lỗi. Vui lòng thử lại sau.',
  }

  return messages[code] ?? fallback
}
