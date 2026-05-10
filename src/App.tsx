import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import {
  ArrowRight,
  GraduationCap,
  KeyRound,
  RotateCcw,
  Send,
  UsersRound,
} from 'lucide-react'
import {
  authExpiredEventName,
  forgotPassword,
  getErrorMessage,
  isApiError,
  login,
  logout,
  normalizeSession,
  register,
  resendOtp,
  resetPassword,
  verifyOtp,
  type PublicRegisterRole,
} from './api/auth'
import { AuthPage, FieldIcon, OtpPreview, RoleOption } from './components/AuthLayout'
import { SiteHeader } from './components/Brand'
import { DashboardShell } from './components/DashboardView'
import { LearningHero } from './components/LearningHero'
import { MotionPage } from './components/MotionPage'
import { ToastViewport } from './components/Toast'
import { showToast } from './components/toastEvents'
import { OwnerProfilePage, PublicProfilePage } from './features/profile/ProfilePages'
import { PolicyConsentGate } from './features/policies/PolicyConsentGate'
import { PoliciesPage, PolicyDetailPage } from './features/policies/PolicyPages'
import { policyApi, policyKeys } from './features/policies/policyApi'
import {
  buildAcceptedPolicies,
  getPolicyLabel,
  getRequiredSignupPolicies,
  requiredSignupPolicyTypes,
} from './features/policies/policyUtils'
import { AdminSkillsPage } from './features/skills/AdminSkillsPage'
import { useAppStore, type UserRole } from './store/useAppStore'
import './App.css'

type OtpPurpose = 'register' | 'reset'

interface RouteState {
  email?: string
  purpose?: OtpPurpose
  resetToken?: string
  message?: string
}

function App() {
  const location = useLocation()

  return (
    <>
      <AuthExpiryWatcher />
      <ToastViewport />
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/policies" element={<PoliciesPage />} />
          <Route path="/policies/:slug" element={<PolicyDetailPage />} />
          <Route path="/verify-otp" element={<VerifyOtpPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/profile"
            element={
              <ProtectedRoute>
                <OwnerProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/admin/skills"
            element={
              <ProtectedRoute>
                <AdminSkillsPage />
              </ProtectedRoute>
            }
          />
          <Route path="/profile/:userId" element={<PublicProfilePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    </>
  )
}

function AuthExpiryWatcher() {
  const navigate = useNavigate()

  useEffect(() => {
    const handleExpiredSession = () => {
      navigate('/login', {
        replace: true,
        state: { message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' },
      })
    }

    window.addEventListener(authExpiredEventName, handleExpiredSession)
    return () => window.removeEventListener(authExpiredEventName, handleExpiredSession)
  }, [navigate])

  return null
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const session = useAppStore((state) => state.session)

  if (!session?.accessToken) {
    return <Navigate to="/login" replace state={{ message: 'Vui lòng đăng nhập để tiếp tục.' }} />
  }

  return <PolicyConsentGate>{children}</PolicyConsentGate>
}

function useRouteToast(message?: string) {
  useEffect(() => {
    if (message) {
      showToast({ kind: 'info', message })
    }
  }, [message])
}

function LandingPage() {
  const session = useAppStore((state) => state.session)

  return (
    <MotionPage className="page landing-page">
      <SiteHeader />
      <LearningHero isSignedIn={Boolean(session)} />
    </MotionPage>
  )
}

function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const routeState = getRouteState(location.state)
  const setSession = useAppStore((state) => state.setSession)
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useRouteToast(routeState.message)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!identifier.trim() || !password) {
      showToast({ kind: 'error', message: 'Vui lòng nhập email hoặc tên đăng nhập và mật khẩu.' })
      return
    }

    setIsSubmitting(true)

    try {
      const response = await login({ identifier: identifier.trim(), password })
      setSession(normalizeSession(response))
      navigate('/dashboard', { replace: true })
    } catch (error) {
      showToast({ kind: 'error', message: getErrorMessage(error) })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthPage
      title="Đăng nhập"
      subtitle="Nhập thông tin tài khoản để tiếp tục."
      panelLabel="Login"
      panelTitle="Chào mừng bạn quay lại EdSkill."
      panelLines={[
        'Tiếp tục học kỹ năng bạn cần',
        'Chia sẻ điều bạn giỏi',
        'Xây dựng hồ sơ uy tín trong cộng đồng',
      ]}
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          Email hoặc tên đăng nhập
          <div className="input-shell">
            <FieldIcon type="user" />
            <input
              autoComplete="off"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}

            />
          </div>
        </label>
        <label>
          Mật khẩu
          <div className="input-shell">
            <FieldIcon type="password" />
            <input
              autoComplete="off"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
        </label>
        <motion.button
          className="button primary full"
          disabled={isSubmitting}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
        >
          {isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
          <ArrowRight size={18} />
        </motion.button>
        <button className="button google full" disabled type="button">
          Đăng nhập Google sẽ có sau
        </button>
        <div className="form-links">
          <Link to="/forgot-password">Quên mật khẩu?</Link>
          <Link to="/register">Tạo tài khoản</Link>
        </div>
      </form>
    </AuthPage>
  )
}

function RegisterPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    email: '',
    username: '',
    firstName: '',
    lastName: '',
    password: '',
  })
  const [roles, setRoles] = useState<PublicRegisterRole[]>(['learner'])
  const [hasAcceptedPolicies, setHasAcceptedPolicies] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const policiesQuery = useQuery({
    queryKey: policyKeys.catalog(),
    queryFn: policyApi.getPolicies,
    staleTime: 5 * 60 * 1000,
  })
  const requiredPolicies = getRequiredSignupPolicies(policiesQuery.data ?? [])
  const hasRequiredPolicyCatalog = requiredPolicies.length === requiredSignupPolicyTypes.length

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const toggleRole = (role: PublicRegisterRole) => {
    setRoles((current) =>
      current.includes(role) ? current.filter((item) => item !== role) : [...current, role],
    )
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const validationMessage = validateRegisterForm(form, roles)

    if (validationMessage) {
      showToast({ kind: 'error', message: validationMessage })
      return
    }

    if (policiesQuery.isLoading) {
      showToast({ kind: 'info', message: 'Đang tải chính sách bắt buộc. Vui lòng thử lại sau giây lát.' })
      return
    }

    if (policiesQuery.isError || !hasRequiredPolicyCatalog) {
      showToast({
        kind: 'error',
        message: 'Hiện không thể tải chính sách của hệ thống. Vui lòng thử lại sau.',
      })
      return
    }

    if (!hasAcceptedPolicies) {
      showToast({
        kind: 'error',
        message: 'Vui lòng đọc và đồng ý với các chính sách bắt buộc trước khi tạo tài khoản.',
      })
      return
    }

    setIsSubmitting(true)

    try {
      await register({
        ...form,
        email: form.email.trim(),
        username: form.username.trim(),
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        roles,
        acceptedPolicies: buildAcceptedPolicies(requiredPolicies),
      })
      navigate('/verify-otp', {
        state: {
          email: form.email.trim(),
          purpose: 'register',
          message: 'Mã xác thực đã được gửi tới email của bạn.',
        },
      })
    } catch (error) {
      if (isApiError(error) && error.code === 'POLICY_VERSION_INVALID') {
        setHasAcceptedPolicies(false)
        await policiesQuery.refetch()
        showToast({
          kind: 'error',
          message:
            'Chính sách đã được cập nhật. Vui lòng đọc và xác nhận lại trước khi tiếp tục.',
        })
      } else {
        showToast({ kind: 'error', message: getErrorMessage(error) })
      }

    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthPage
      title="Tạo tài khoản"
      subtitle="Điền thông tin cơ bản và chọn vai trò phù hợp."
      panelLabel="Register"
      panelTitle="Bắt đầu với EdSkill."
      panelLines={[
        'Học điều bạn cần',
        'Dạy điều bạn giỏi',
        'Cùng phát triển trong cộng đồng trao đổi kỹ năng ngang hàng',
      ]}
      accent="learn"
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="two-column">
          <label>
            Tên
            <div className="input-shell">
              <FieldIcon type="user" />
              <input
                autoComplete="off"
                value={form.firstName}
                onChange={(event) => updateField('firstName', event.target.value)}

              />
            </div>
          </label>
          <label>
            Họ
            <div className="input-shell">
              <FieldIcon type="user" />
              <input
                autoComplete="off"
                value={form.lastName}
                onChange={(event) => updateField('lastName', event.target.value)}
              />
            </div>
          </label>
        </div>
        <label>
          Địa chỉ email
          <div className="input-shell">
            <FieldIcon type="email" />
            <input
              autoComplete="off"
              type="email"
              value={form.email}
              onChange={(event) => updateField('email', event.target.value)}

            />
          </div>
        </label>
        <label>
          Tên đăng nhập
          <div className="input-shell">
            <FieldIcon type="user" />
            <input
              autoComplete="off"
              value={form.username}
              onChange={(event) => updateField('username', event.target.value)}
            />
          </div>
        </label>
        <label>
          Mật khẩu
          <div className="input-shell">
            <FieldIcon type="password" />
            <input
              autoComplete="off"
              type="password"
              value={form.password}
              onChange={(event) => updateField('password', event.target.value)}

            />
          </div>
        </label>
        <div className="role-options" aria-label="Chọn vai trò">
          <RoleOption
            active={roles.includes('learner')}
            label="Learner"
            description="Học kỹ năng bạn cần với Companion phù hợp và lộ trình gợi ý."
            Icon={GraduationCap}
            onClick={() => toggleRole('learner')}
          />
          <RoleOption
            active={roles.includes('companion')}
            label="Companion"
            description="Chia sẻ kỹ năng, hướng dẫn Learner bằng kinh nghiệm thực tế."
            Icon={UsersRound}
            onClick={() => toggleRole('companion')}
          />
        </div>
        <div className="policy-signup-panel">
          <div className="policy-signup-head">
            <h3>Chính sách bắt buộc khi đăng ký</h3>
            <p>
              EdSkill cần ghi nhận đồng ý với Điều khoản sử dụng, Chính sách riêng tư và Chính sách
              Points/Tokens tại thời điểm tạo tài khoản.
            </p>
          </div>
          {policiesQuery.isLoading ? (
            <p className="status-message info">Đang tải các chính sách bắt buộc...</p>
          ) : null}
          {policiesQuery.isError ? (
            <p className="status-message error">
              Hiện không thể tải chính sách của hệ thống. Vui lòng thử lại sau.
            </p>
          ) : null}
          {!policiesQuery.isLoading && !policiesQuery.isError && !hasRequiredPolicyCatalog ? (
            <p className="status-message error">
              Hệ thống đang thiếu policy bắt buộc để đăng ký. Vui lòng thử lại sau.
            </p>
          ) : null}
          {!policiesQuery.isLoading && hasRequiredPolicyCatalog ? (
            <>
              <div className="policy-inline-links">
                {requiredPolicies.map((policy) => (
                  <Link
                    className="policy-inline-link"
                    key={policy.slug}
                    rel="noreferrer"
                    target="_blank"
                    to={`/policies/${policy.slug}`}
                  >
                    {getPolicyLabel(policy.slug, policy.title)}
                  </Link>
                ))}
              </div>
              <label className="policy-consent-checkbox signup">
                <input
                  checked={hasAcceptedPolicies}
                  onChange={(event) => setHasAcceptedPolicies(event.target.checked)}
                  type="checkbox"
                />
                <span>
                  Tôi đồng ý với Điều khoản sử dụng, Chính sách riêng tư và Chính sách
                  Points/Tokens của EdSkill.
                </span>
              </label>
            </>
          ) : null}
        </div>
        <motion.button
          className="button primary full"
          disabled={isSubmitting || policiesQuery.isLoading}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
        >
          {isSubmitting ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}
          <ArrowRight size={18} />
        </motion.button>
        <p className="auth-footnote">
          Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
        </p>
      </form>
    </AuthPage>
  )
}

function VerifyOtpPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const routeState = getRouteState(location.state)
  const [email, setEmail] = useState(routeState.email ?? '')
  const [otp, setOtp] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const purpose = routeState.purpose ?? 'register'

  useRouteToast(routeState.message)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!isEmail(email) || otp.trim().length < 4) {
      showToast({ kind: 'error', message: 'Vui lòng nhập email hợp lệ và mã OTP.' })
      return
    }

    setIsSubmitting(true)

    try {
      const response = await verifyOtp(email.trim(), otp.trim())

      if (response.resetToken) {
        navigate('/reset-password', {
          state: {
            email: email.trim(),
            resetToken: response.resetToken,
            message: 'OTP đã được xác thực. Hãy tạo mật khẩu mới.',
          },
        })
        return
      }

      if (purpose === 'reset') {
        showToast({
          kind: 'error',
          message: 'OTP đã được xác thực nhưng backend chưa trả về mã đặt lại mật khẩu.',
        })
        return
      }

      navigate('/login', {
        replace: true,
        state: { message: 'Đăng ký đã xác thực. Vui lòng đăng nhập.' },
      })
    } catch (error) {
      showToast({ kind: 'error', message: getErrorMessage(error) })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResend = async () => {
    if (!isEmail(email)) {
      showToast({ kind: 'error', message: 'Vui lòng nhập email hợp lệ trước khi gửi lại OTP.' })
      return
    }

    setIsResending(true)

    try {
      await resendOtp(email.trim())
      showToast({ kind: 'success', message: 'OTP mới đã được gửi tới email của bạn.' })
    } catch (error) {
      showToast({ kind: 'error', message: getErrorMessage(error) })
    } finally {
      setIsResending(false)
    }
  }

  return (
    <AuthPage
      title="Nhập mã OTP"
      subtitle="Kiểm tra email và nhập mã xác thực để tiếp tục."
      panelLabel="Verify Email"
      panelTitle="Xác minh email của bạn."
      panelLines={[
        'Hoàn tất bước này để bảo vệ tài khoản',
        'Ví điểm, token',
        'Hồ sơ kỹ năng trên EdSkill',
      ]}
      accent={purpose === 'reset' ? 'reset' : 'secure'}
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          Địa chỉ email
          <div className="input-shell">
            <FieldIcon type="email" />
            <input
              autoComplete="off"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}

            />
          </div>
        </label>
        <label>
          Mã OTP
          <OtpPreview value={otp} />
          <div className="input-shell">
            <FieldIcon type="token" />
            <input
              autoComplete="off"
              className="otp-input"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}

            />
          </div>
        </label>
        <motion.button
          className="button primary full"
          disabled={isSubmitting}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
        >
          {isSubmitting ? 'Đang xác thực...' : 'Xác thực OTP'}
          <KeyRound size={18} />
        </motion.button>
        <motion.button
          className="button secondary full"
          disabled={isResending}
          onClick={handleResend}
          type="button"
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
        >
          {isResending ? 'Đang gửi...' : 'Gửi lại OTP'}
          <RotateCcw size={18} />
        </motion.button>
      </form>
    </AuthPage>
  )
}

function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!isEmail(email)) {
      showToast({ kind: 'error', message: 'Vui lòng nhập email hợp lệ.' })
      return
    }

    setIsSubmitting(true)

    try {
      await forgotPassword(email.trim())
      navigate('/verify-otp', {
        state: {
          email: email.trim(),
          purpose: 'reset',
          message: 'Hướng dẫn đặt lại mật khẩu đã được gửi tới email của bạn.',
        },
      })
    } catch (error) {
      showToast({ kind: 'error', message: getErrorMessage(error) })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthPage
      title="Khôi phục mật khẩu"
      subtitle="Nhập email tài khoản để nhận hướng dẫn đặt lại."
      panelLabel="Forgot Password"
      panelTitle="Quên mật khẩu?"
      panelLines={[
        'Nhập email đã đăng ký',
        'EdSkill sẽ gửi cho bạn liên kết để đặt lại mật khẩu',
      ]}
      accent="reset"
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          Email tài khoản
          <div className="input-shell">
            <FieldIcon type="email" />
            <input
              autoComplete="off"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}

            />
          </div>
        </label>
        <motion.button
          className="button primary full"
          disabled={isSubmitting}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
        >
          {isSubmitting ? 'Đang gửi...' : 'Gửi liên kết đặt lại'}
          <Send size={18} />
        </motion.button>
        <p className="auth-footnote">
          Nhớ mật khẩu rồi? <Link to="/login">Đăng nhập</Link>
        </p>
      </form>
    </AuthPage>
  )
}

function ResetPasswordPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const routeState = getRouteState(location.state)
  const [resetToken, setResetToken] = useState(routeState.resetToken ?? '')
  const [newPassword, setNewPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useRouteToast(routeState.message)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!resetToken.trim()) {
      showToast({ kind: 'error', message: 'Thiếu mã đặt lại. Vui lòng xác thực OTP lại.' })
      return
    }

    if (!isStrongPassword(newPassword)) {
      showToast({
        kind: 'error',
        message: 'Mật khẩu cần ít nhất 8 ký tự, gồm chữ hoa, chữ thường và số.',
      })
      return
    }

    setIsSubmitting(true)

    try {
      await resetPassword(resetToken.trim(), newPassword)
      navigate('/login', {
        replace: true,
        state: { message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập.' },
      })
    } catch (error) {
      showToast({ kind: 'error', message: getErrorMessage(error) })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthPage
      title="Tạo mật khẩu mới."
      subtitle="Chọn mật khẩu mạnh để bảo vệ tài khoản và tiếp tục sử dụng EdSkill an toàn."
      panelLabel="Reset Password"
      panelTitle="Tạo mật khẩu mới."
      panelLines={['Chọn mật khẩu mạnh', 'Bảo vệ tài khoản EdSkill']}
      accent="reset"
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          Mã đặt lại
          <div className="input-shell textarea-shell">
            <FieldIcon type="token" />
            <textarea
              value={resetToken}
              onChange={(event) => setResetToken(event.target.value)}

              rows={3}
            />
          </div>
        </label>
        <label>
          Mật khẩu mới
          <div className="input-shell">
            <FieldIcon type="password" />
            <input
              autoComplete="off"
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
          </div>
        </label>
        <motion.button
          className="button primary full"
          disabled={isSubmitting}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
        >
          {isSubmitting ? 'Đang cập nhật...' : 'Đặt lại mật khẩu'}
          <ArrowRight size={18} />
        </motion.button>
      </form>
    </AuthPage>
  )
}

function DashboardPage() {
  const navigate = useNavigate()
  const session = useAppStore((state) => state.session)
  const clearSession = useAppStore((state) => state.clearSession)
  const primaryRole = getPrimaryRole(session?.roles ?? [])

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      showToast({ kind: 'info', message: getErrorMessage(error) })
    } finally {
      clearSession()
      navigate('/login', { replace: true, state: { message: 'Bạn đã đăng xuất thành công.' } })
    }
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return (
    <DashboardShell
      username={session.username}
      email={session.email}
      roles={session.roles}
      dailyReminderNeeded={session.shouldPromptDailyReminderTime}
      primaryRole={primaryRole}
      onLogout={handleLogout}
      profileHref="/dashboard/profile"
      getCardCopy={getDashboardCopy}
    />
  )
}

const validateRegisterForm = (
  form: {
    email: string
    username: string
    firstName: string
    lastName: string
    password: string
  },
  roles: PublicRegisterRole[],
) => {
  if (!form.firstName.trim() || !form.lastName.trim()) {
    return 'Vui lòng nhập đầy đủ họ và tên.'
  }

  if (!isEmail(form.email)) {
    return 'Vui lòng nhập email hợp lệ.'
  }

  if (form.username.trim().length < 3 || form.username.trim().length > 50) {
    return 'Tên đăng nhập phải có 3-50 ký tự.'
  }

  if (!isStrongPassword(form.password)) {
    return 'Mật khẩu cần ít nhất 8 ký tự, gồm chữ hoa, chữ thường và số.'
  }

  if (roles.length === 0) {
    return 'Vui lòng chọn ít nhất một vai trò.'
  }

  return ''
}

const getRouteState = (state: unknown): RouteState => {
  if (!state || typeof state !== 'object') {
    return {}
  }

  return state as RouteState
}

const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())

const isStrongPassword = (value: string) =>
  /[A-Z]/.test(value) && /[a-z]/.test(value) && /\d/.test(value) && value.length >= 8

const getPrimaryRole = (roles: UserRole[]) => {
  if (roles.includes('admin')) {
    return 'admin'
  }

  if (roles.includes('companion')) {
    return 'companion'
  }

  return 'learner'
}

const getDashboardCopy = (card: string, role: string) => {
  if (card === 'Phiên đồng hành' && role === 'companion') {
    return 'Chuẩn bị lịch đồng hành và các yêu cầu hỗ trợ từ Learner.'
  }

  if (card === 'Phiên đồng hành') {
    return 'Kết nối với Companion khi module ghép cặp sẵn sàng.'
  }

  if (card === 'Nhắc học hằng ngày') {
    return 'Theo dõi trạng thái nhắc học để chuẩn bị luồng cài đặt tiếp theo.'
  }

  return 'Sẵn sàng cho module tính năng tiếp theo của EdSkill.'
}

export default App
