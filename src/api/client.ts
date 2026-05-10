import { useAppStore } from '../store/useAppStore'
import { normalizeSession, type LoginResponse } from './session'

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ??
  'https://edskill-production.up.railway.app'

const AUTH_EXPIRED_EVENT = 'edskill:auth-expired'

export interface ApiFieldError {
  property?: string
  message?: string
  errorCode?: string
}

export interface ApiError {
  status: number
  code: string
  message: string
  fieldErrors: string[]
  details: ApiFieldError[]
}

interface ProblemDetails {
  errorCode?: string
  errorMessage?: string
  statusCode?: number
  message?: string
  title?: string
  errors?: ApiFieldError[]
}

interface ApiRequestOptions extends RequestInit {
  auth?: boolean
  retryOnUnauthorized?: boolean
}

type RequestOptions = Omit<ApiRequestOptions, 'body' | 'method'>

export const authExpiredEventName = AUTH_EXPIRED_EVENT

export const createApiError = (status: number, body: unknown): ApiError => {
  const problem = isRecord(body) ? (body as ProblemDetails) : {}
  const details = Array.isArray(problem.errors) ? problem.errors : []
  const fieldErrors = details.map((error) => error.message).filter(isString)

  return {
    status,
    code:
      problem.errorCode ??
      details.find((error) => error.errorCode)?.errorCode ??
      String(problem.statusCode ?? status),
    message:
      problem.errorMessage ??
      problem.message ??
      problem.title ??
      fieldErrors[0] ??
      'Unable to complete the request.',
    fieldErrors,
    details,
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

export const apiGet = <T>(path: string, options: RequestOptions = {}) =>
  apiRequest<T>(path, { ...options, method: 'GET' })

export const apiPost = <T>(path: string, payload?: unknown, options: RequestOptions = {}) =>
  apiRequest<T>(path, {
    ...options,
    method: 'POST',
    body: payload === undefined ? undefined : JSON.stringify(payload),
  })

export const apiPatch = <T>(path: string, payload?: unknown, options: RequestOptions = {}) =>
  apiRequest<T>(path, {
    ...options,
    method: 'PATCH',
    body: payload === undefined ? undefined : JSON.stringify(payload),
  })

export const apiDelete = <T = void>(path: string, options: RequestOptions = {}) =>
  apiRequest<T>(path, { ...options, method: 'DELETE' })

export const apiRequest = async <T>(path: string, options: ApiRequestOptions): Promise<T> => {
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
    POLICY_VERSION_INVALID:
      'Chính sách đã được cập nhật. Vui lòng tải lại và xác nhận phiên bản mới nhất.',
    POLICY_DOCUMENT_NOT_FOUND:
      'Hiện không thể tải chính sách của hệ thống. Vui lòng thử lại sau.',
    UNSUPPORTED_POLICY_TYPE: 'Đã xảy ra lỗi tích hợp chính sách. Vui lòng thử lại sau.',
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
    PROFILE_NOT_FOUND: 'Không tìm thấy hồ sơ người dùng.',
    PROFILE_PRIVATE: 'Người dùng này đang để hồ sơ ở chế độ riêng tư.',
    INVALID_DISPLAY_NAME: 'Tên hiển thị không hợp lệ.',
    INVALID_BIO: 'Tiểu sử không hợp lệ.',
    INVALID_UNIVERSITY: 'Thông tin trường học không hợp lệ.',
    INVALID_FACULTY: 'Thông tin khoa/ngành không hợp lệ.',
    INVALID_YEAR_OF_STUDY: 'Năm học không hợp lệ.',
    INVALID_SKILLS_TO_TEACH: 'Danh sách kỹ năng muốn dạy không hợp lệ.',
    INVALID_SKILLS_TO_LEARN: 'Danh sách kỹ năng muốn học không hợp lệ.',
    SKILL_NOT_FOUND: 'Kỹ năng không tồn tại trong skill catalog.',
    SKILL_INACTIVE: 'Kỹ năng này hiện đang bị ẩn và chưa thể dùng.',
    DUPLICATE_SKILL_SELECTION: 'Danh sách kỹ năng đang có mục bị trùng sau khi chuẩn hóa.',
    SKILL_NAME_EXISTS: 'Tên kỹ năng đã tồn tại.',
    SKILL_SLUG_EXISTS: 'Slug kỹ năng đã tồn tại.',
    SKILL_ALIAS_CONFLICT: 'Alias kỹ năng đang trùng với một kỹ năng khác.',
    INVALID_SKILL_NAME: 'Tên kỹ năng không hợp lệ.',
    INVALID_SKILL_SLUG: 'Slug kỹ năng không hợp lệ.',
    INVALID_SKILL_CATEGORY: 'Category kỹ năng không hợp lệ.',
    INVALID_SKILL_ALIASES: 'Danh sách alias kỹ năng không hợp lệ.',
    INVALID_LIMIT: 'Giới hạn số lượng kết quả không hợp lệ.',
    INSUFFICIENT_POINTS: 'So du points khong du de thuc hien giao dich nay.',
    SELF_BOOKING: 'Ban khong the tu book session cua chinh minh.',
    SESSION_NOT_AVAILABLE: 'Session nay khong con o trang thai Available.',
    SESSION_INVALID_STATUS: 'Session khong dung trang thai de thuc hien thao tac nay.',
    POINT_WALLET_NOT_FOUND: 'Khong tim thay wallet points cua nguoi dung.',
    SYSTEM_CONFIG_NOT_FOUND: 'Khong tim thay cau hinh he thong can thiet.',
    SYSTEM_CONFIG_INVALID_VALUE: 'Gia tri cau hinh he thong khong hop le.',
    SESSION_LIMIT_REACHED: 'Ban da dat toi gioi han session cho phep.',
    INVALID_AVATAR_URL: 'Đường dẫn avatar không hợp lệ.',
    INVALID_AVATAR_FILE_NAME: 'Tên tệp avatar không hợp lệ.',
    INVALID_AVATAR_CONTENT_TYPE: 'Định dạng avatar chưa được hỗ trợ.',
    INVALID_AVATAR_FILE_SIZE: 'Kích thước avatar vượt quá giới hạn cho phép.',
    INVALID_PROFILE_VISIBILITY: 'Trạng thái hiển thị hồ sơ không hợp lệ.',
    VALIDATION_ERROR: 'Dữ liệu gửi lên chưa hợp lệ.',
    '400': 'Thông tin gửi lên chưa hợp lệ.',
    '401': 'Bạn cần đăng nhập để tiếp tục.',
    '403': 'Bạn không có quyền thực hiện thao tác này.',
    '404': 'Không tìm thấy dữ liệu yêu cầu.',
    '409': 'Dữ liệu đã tồn tại.',
    '422': 'Dữ liệu gửi lên chưa hợp lệ.',
    '429': 'Bạn thao tác quá nhanh. Vui lòng thử lại sau.',
    '500': 'Máy chủ đang gặp lỗi. Vui lòng thử lại sau.',
  }

  return messages[code] ?? fallback
}
