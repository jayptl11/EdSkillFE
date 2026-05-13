import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import {
  ArrowRight,
  KeyRound,
  LoaderCircle,
  RotateCcw,
  Send,
} from 'lucide-react'
import {
  authExpiredEventName,
  forgotPassword,
  getErrorMessage,
  isApiError,
  login,
  normalizeSession,
  register,
  resendOtp,
  resetPassword,
  verifyOtp,
  type SignupIntent,
} from './api/auth'
import { queryClient } from './api/queryClient'
import { AuthPage, FieldIcon } from './components/AuthLayout'
import { SiteHeader } from './components/Brand'
import { DashboardShell } from './components/DashboardView'
import { LearningHero } from './components/LearningHero'
import { MotionPage } from './components/MotionPage'
import { ToastViewport } from './components/Toast'
import { showToast } from './components/toastEvents'

import { OwnerProfilePage, PublicProfilePage } from './features/profile/ProfilePages'
import { profileApi } from './features/profile/profileApi'
import { PolicyConsentGate } from './features/policies/PolicyConsentGate'
import { PoliciesPage, PolicyDetailPage } from './features/policies/PolicyPages'
import { policyApi, policyKeys } from './features/policies/policyApi'
import {
  buildAcceptedPolicies,
  getRequiredSignupPolicies,
  requiredSignupPolicyTypes,
} from './features/policies/policyUtils'
import { AdminSessionWalletPage } from './features/admin-session-wallet/AdminSessionWalletPage'
import { AdminSkillsPage } from './features/skills/AdminSkillsPage'
import { SessionDetailPage } from './features/sessions/SessionDetailPage'
import {
  CreateSessionOfferPage,
  LearningSessionsPage,
  TeachingSessionsPage,
} from './features/sessions/SessionPages'
import { CompanionSearchPage } from './features/sessions/CompanionSearchPage'
import { CompanionDetailPage } from './features/sessions/CompanionDetailPage'
import { WalletPage } from './features/wallet/WalletPage'
import { useAppStore, type UserRole } from './store/useAppStore'
import './App.css'

type OtpPurpose = 'register' | 'reset'

interface RouteState {
  email?: string
  purpose?: OtpPurpose
  resetToken?: string
  message?: string
  intent?: SignupIntent
}

const authIntentStorageKey = 'edskill-auth-intent'

function App() {
  const location = useLocation()

  return (
    <>
      <AuthExpiryWatcher />
      <ToastViewport />
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/learn" element={<LearnEntryPage />} />
          <Route path="/teach" element={<TeachEntryPage />} />
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
          <Route
            path="/dashboard/admin/session-wallet"
            element={
              <ProtectedRoute>
                <AdminSessionWalletPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/wallet"
            element={
              <ProtectedRoute>
                <WalletPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/skills/learning"
            element={
              <ProtectedRoute>
                <LearningSessionsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/skills/teaching"
            element={
              <ProtectedRoute>
                <TeachingSessionsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/skills/new"
            element={
              <ProtectedRoute>
                <CreateSessionOfferPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/skills/:sessionId"
            element={
              <ProtectedRoute>
                <SessionDetailPage />
              </ProtectedRoute>
            }
          />
          <Route path="/profile/:userId" element={<PublicProfilePage />} />
          <Route
            path="/dashboard/companions"
            element={
              <ProtectedRoute>
                <CompanionSearchPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/companions/:companionId"
            element={
              <ProtectedRoute>
                <CompanionDetailPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate replace to="/" />} />
        </Routes>
      </AnimatePresence>
    </>
  )
}

function AuthExpiryWatcher() {
  const navigate = useNavigate()

  useEffect(() => {
    const handleExpiredSession = () => {
      queryClient.clear()
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
    return (
      <Navigate
        replace
        state={{ message: 'Vui lòng đăng nhập để tiếp tục.' }}
        to="/login"
      />
    )
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

function LearnEntryPage() {
  const session = useAppStore((state) => state.session)

  if (!session?.accessToken) {
    return <Navigate replace to="/register" />
  }

  return <Navigate replace to="/dashboard" />
}

function TeachEntryPage() {
  const session = useAppStore((state) => state.session)

  if (!session?.accessToken) {
    return <Navigate replace to="/register" />
  }

  return <TeachAccessRedirect />
}

function TeachAccessRedirect() {
  const navigate = useNavigate()
  const hasTriggeredEnableRef = useRef(false)
  const profileQuery = useQuery({
    queryKey: ['profile', 'me', 'teaching-access'],
    queryFn: profileApi.getMyProfile,
  })
  const enableMutation = useMutation({
    mutationFn: profileApi.enableCompanion,
  })

  useEffect(() => {
    const profile = profileQuery.data
    if (!profile) {
      return
    }

    if (!profile.roles.includes('companion')) {
      if (!hasTriggeredEnableRef.current) {
        hasTriggeredEnableRef.current = true
        enableMutation.mutate()
      }
      return
    }

    navigate(profile.isCompanionOnboardingComplete ? '/dashboard/skills/teaching' : '/dashboard/profile?intent=teach', {
      replace: true,
    })
  }, [enableMutation, navigate, profileQuery.data])

  useEffect(() => {
    const profile = enableMutation.data
    if (!profile) {
      return
    }

    navigate(profile.isCompanionOnboardingComplete ? '/dashboard/skills/teaching' : '/dashboard/profile?intent=teach', {
      replace: true,
    })
  }, [enableMutation.data, navigate])

  useEffect(() => {
    if (enableMutation.isError) {
      showToast({ kind: 'error', message: getErrorMessage(enableMutation.error) })
      navigate('/dashboard', { replace: true })
    }
  }, [enableMutation.error, enableMutation.isError, navigate])

  return (
    <MotionPage className="page dashboard-page">
      <SiteHeader />
      <section className="profile-state-card teaching-redirect-card">
        <LoaderCircle className="spin" size={24} />
        <div>
          <h2>Đang chuẩn bị khu vực dạy học</h2>
          <p>EdSkill đang đưa bạn tới đúng bước tiếp theo để bắt đầu dạy.</p>
        </div>
      </section>
    </MotionPage>
  )
}

function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const routeState = getRouteState(location.state)
  const intent = useResolvedIntent(location.search, routeState.intent)
  const setSession = useAppStore((state) => state.setSession)
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const copy = getAuthCopy()

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
      rememberIntent(intent)
      navigate(getPostAuthRoute(), { replace: true })
    } catch (error) {
      showToast({ kind: 'error', message: getErrorMessage(error) })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthPage
      accent="secure"
      contextLabel="Đăng nhập"
      panelLabel={copy.panelLabel}
      panelLines={copy.panelLines}
      panelTitle={copy.panelTitle}
      steps={[{ label: 'Đăng nhập', active: true }]}
      subtitle={copy.loginSubtitle}
      title={copy.loginTitle}
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          Email hoặc tên đăng nhập
          <div className="input-shell">
            <FieldIcon type="user" />
            <input
              autoComplete="off"
              onChange={(event) => setIdentifier(event.target.value)}
              value={identifier}
            />
          </div>
        </label>
        <label>
          Mật khẩu
          <div className="input-shell">
            <FieldIcon type="password" />
            <input
              autoComplete="off"
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              value={password}
            />
          </div>
        </label>
        <motion.button
          className="button primary full"
          disabled={isSubmitting}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
        >
          {isSubmitting ? 'Đang đăng nhập...' : copy.loginButton}
          <ArrowRight size={18} />
        </motion.button>
        <div className="form-links">
          <Link to={`/forgot-password${buildIntentSearch(intent)}`}>Quên mật khẩu?</Link>
          <Link to={`/register${buildIntentSearch(intent)}`}>{copy.switchToRegisterLabel}</Link>
        </div>
      </form>
    </AuthPage>
  )
}

function RegisterPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const routeState = getRouteState(location.state)
  const intent = useResolvedIntent(location.search, routeState.intent)
  const [form, setForm] = useState({
    email: '',
    username: '',
    firstName: '',
    lastName: '',
    password: '',
  })
  const [hasAcceptedPolicies, setHasAcceptedPolicies] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const policiesQuery = useQuery({
    queryKey: policyKeys.catalog(),
    queryFn: policyApi.getPolicies,
    staleTime: 5 * 60 * 1000,
  })
  const requiredPolicies = getRequiredSignupPolicies(policiesQuery.data ?? [])
  const hasRequiredPolicyCatalog = requiredPolicies.length === requiredSignupPolicyTypes.length
  const copy = getAuthCopy()

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const validationMessage = validateRegisterForm(form)

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
        signupIntent: intent,
        acceptedPolicies: buildAcceptedPolicies(requiredPolicies),
      })
      rememberIntent(intent)
      navigate(`/verify-otp${buildIntentSearch(intent)}`, {
        state: {
          email: form.email.trim(),
          intent,
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
          message: 'Chính sách đã được cập nhật. Vui lòng đọc và xác nhận lại trước khi tiếp tục.',
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
      accent="secure"
      contextLabel="Đăng ký"
      panelLabel={copy.panelLabel}
      panelLines={copy.panelLines}
      panelTitle={copy.panelTitle}
      subtitle={copy.registerSubtitle}
      title={copy.registerTitle}
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="two-column">
          <label>
            Tên
            <div className="input-shell">
              <FieldIcon type="user" />
              <input
                autoComplete="off"
                onChange={(event) => updateField('firstName', event.target.value)}
                value={form.firstName}
              />
            </div>
          </label>
          <label>
            Họ
            <div className="input-shell">
              <FieldIcon type="user" />
              <input
                autoComplete="off"
                onChange={(event) => updateField('lastName', event.target.value)}
                value={form.lastName}
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
              onChange={(event) => updateField('email', event.target.value)}
              type="email"
              value={form.email}
            />
          </div>
        </label>
        <label>
          Tên đăng nhập
          <div className="input-shell">
            <FieldIcon type="user" />
            <input
              autoComplete="off"
              onChange={(event) => updateField('username', event.target.value)}
              value={form.username}
            />
          </div>
        </label>
        <label>
          Mật khẩu
          <div className="input-shell">
            <FieldIcon type="password" />
            <input
              autoComplete="off"
              onChange={(event) => updateField('password', event.target.value)}
              type="password"
              value={form.password}
            />
          </div>
        </label>
        <div className="policy-signup-panel">
          <div className="policy-signup-head">
            <h3>Chính sách bắt buộc khi tạo tài khoản</h3>
            <p>EdSkill cần ghi nhận việc đồng ý với các chính sách đang áp dụng trước khi bạn bắt đầu.</p>
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
              Hệ thống đang thiếu chính sách bắt buộc để tạo tài khoản. Vui lòng thử lại sau.
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
                    {policy.title}
                  </Link>
                ))}
              </div>
              <label className="policy-consent-checkbox signup">
                <input
                  checked={hasAcceptedPolicies}
                  onChange={(event) => setHasAcceptedPolicies(event.target.checked)}
                  type="checkbox"
                />
                <span>Tôi đã đọc và đồng ý với các chính sách bắt buộc của EdSkill.</span>
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
          {isSubmitting ? 'Đang tạo tài khoản...' : copy.registerButton}
          <ArrowRight size={18} />
        </motion.button>
        <p className="auth-footnote">
          Đã có tài khoản? <Link to={`/login${buildIntentSearch(intent)}`}>{copy.switchToLoginLabel}</Link>
        </p>
      </form>
    </AuthPage>
  )
}

function VerifyOtpPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const routeState = getRouteState(location.state)
  const intent = useResolvedIntent(location.search, routeState.intent)
  const [email, setEmail] = useState(routeState.email ?? '')
  const [otp, setOtp] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const purpose = routeState.purpose ?? 'register'
  const copy = getAuthCopy()

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
        navigate(`/reset-password${buildIntentSearch(intent)}`, {
          state: {
            email: email.trim(),
            intent,
            message: 'OTP đã được xác thực. Hãy tạo mật khẩu mới.',
            resetToken: response.resetToken,
          },
        })
        return
      }

      if (purpose === 'reset') {
        showToast({
          kind: 'error',
          message: 'OTP đã được xác thực nhưng hệ thống chưa trả về mã đặt lại mật khẩu.',
        })
        return
      }

      navigate(`/login${buildIntentSearch(intent)}`, {
        replace: true,
        state: {
          message: 'Email đã xác thực. Đăng nhập để bắt đầu với EdSkill.',
        },
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
      accent={purpose === 'reset' ? 'reset' : 'secure'}
      contextLabel="Xác thực email"
      panelLabel={copy.panelLabel}
      panelLines={copy.panelLines}
      panelTitle={copy.panelTitle}
      steps={[
        { label: 'Tạo tài khoản', done: purpose === 'register' },
        { label: 'Xác thực email', active: true },
        { label: purpose === 'reset' ? 'Đặt lại mật khẩu' : 'Bắt đầu với EdSkill' },
      ]}
      subtitle="Kiểm tra email và nhập mã xác thực để tiếp tục."
      title="Nhập mã OTP"
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          Địa chỉ email
          <div className="input-shell">
            <FieldIcon type="email" />
            <input
              autoComplete="off"
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              value={email}
            />
          </div>
        </label>
        <label>
          Mã OTP
          <div className="input-shell">
            <FieldIcon type="token" />
            <input
              autoComplete="off"
              className="otp-input"
              inputMode="numeric"
              maxLength={6}
              onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
              value={otp}
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
  const location = useLocation()
  const intent = useResolvedIntent(location.search)
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
      navigate(`/verify-otp${buildIntentSearch(intent)}`, {
        state: {
          email: email.trim(),
          intent,
          message: 'Hướng dẫn đặt lại mật khẩu đã được gửi tới email của bạn.',
          purpose: 'reset',
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
      accent="reset"
      contextLabel="Khôi phục tài khoản"
      panelLabel="Đặt lại mật khẩu"
      panelLines={['Nhập email đã đăng ký', 'Nhận mã xác thực', 'Tạo lại mật khẩu an toàn']}
      panelTitle="Lấy lại quyền truy cập tài khoản."
      steps={[{ label: 'Nhập email', active: true }, { label: 'Xác thực email' }, { label: 'Tạo mật khẩu mới' }]}
      subtitle="Nhập email tài khoản để nhận hướng dẫn đặt lại mật khẩu."
      title="Khôi phục mật khẩu"
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          Email tài khoản
          <div className="input-shell">
            <FieldIcon type="email" />
            <input
              autoComplete="off"
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              value={email}
            />
          </div>
        </label>
        <motion.button
          className="button primary full"
          disabled={isSubmitting}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
        >
          {isSubmitting ? 'Đang gửi...' : 'Gửi mã xác thực'}
          <Send size={18} />
        </motion.button>
        <p className="auth-footnote">
          Nhớ mật khẩu rồi? <Link to={`/login${buildIntentSearch(intent)}`}>Đăng nhập</Link>
        </p>
      </form>
    </AuthPage>
  )
}

function ResetPasswordPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const routeState = getRouteState(location.state)
  const intent = useResolvedIntent(location.search, routeState.intent)
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
      navigate(`/login${buildIntentSearch(intent)}`, {
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
      accent="reset"
      contextLabel="Tạo mật khẩu mới"
      panelLabel="Bảo vệ tài khoản"
      panelLines={['Mật khẩu đủ mạnh', 'Dễ nhớ với bạn', 'An toàn hơn cho tài khoản']}
      panelTitle="Tạo mật khẩu mới để tiếp tục."
      steps={[{ label: 'Nhập email', done: true }, { label: 'Xác thực email', done: true }, { label: 'Tạo mật khẩu mới', active: true }]}
      subtitle="Chọn mật khẩu mới để tiếp tục dùng EdSkill an toàn."
      title="Tạo mật khẩu mới"
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          Mã đặt lại
          <div className="input-shell textarea-shell">
            <FieldIcon type="token" />
            <textarea onChange={(event) => setResetToken(event.target.value)} rows={3} value={resetToken} />
          </div>
        </label>
        <label>
          Mật khẩu mới
          <div className="input-shell">
            <FieldIcon type="password" />
            <input
              autoComplete="off"
              onChange={(event) => setNewPassword(event.target.value)}
              type="password"
              value={newPassword}
            />
          </div>
        </label>
        <motion.button
          className="button primary full"
          disabled={isSubmitting}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
        >
          {isSubmitting ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
          <ArrowRight size={18} />
        </motion.button>
      </form>
    </AuthPage>
  )
}

function DashboardPage() {
  const session = useAppStore((state) => state.session)
  const primaryRole = getPrimaryRole(session?.roles ?? [])

  if (!session) {
    return <Navigate replace to="/login" />
  }

  return (
    <DashboardShell
      dailyReminderNeeded={session.shouldPromptDailyReminderTime}
      email={session.email}
      getCardCopy={getDashboardCopy}
      primaryRole={primaryRole}
      roles={session.roles}
      username={session.username}
    />
  )
}

const validateRegisterForm = (form: {
  email: string
  username: string
  firstName: string
  lastName: string
  password: string
}) => {
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
  if (card === 'Mục tiêu kỹ năng') {
    return role === 'companion'
      ? 'Chốt kỹ năng bạn muốn dạy và làm rõ hồ sơ công khai của mình.'
      : 'Chọn kỹ năng gần nhất bạn muốn cải thiện để tìm đúng buổi học.'
  }

  if (card === 'Lộ trình học') {
    return 'Đi theo các bước ngắn, rõ và dễ bắt đầu thay vì phải tự sắp xếp mọi thứ từ đầu.'
  }

  if (card === 'Buổi học') {
    return role === 'companion'
      ? 'Quản lý lịch dạy, xác nhận người học và mở thêm buổi học mới.'
      : 'Theo dõi buổi học đã đăng ký và những bước cần xác nhận tiếp theo.'
  }

  return 'Giữ nhịp đều mỗi ngày để biến kế hoạch học thành tiến triển thật.'
}

function normalizeIntent(value: string | null | undefined): SignupIntent | null {
  if (value === 'learn' || value === 'teach') {
    return value
  }

  return null
}

function getStoredIntent(): SignupIntent | null {
  if (typeof window === 'undefined') {
    return null
  }

  return normalizeIntent(window.localStorage.getItem(authIntentStorageKey))
}

function rememberIntent(intent: SignupIntent) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(authIntentStorageKey, intent)
  }
}

function useResolvedIntent(search: string, routeIntent?: SignupIntent) {
  const intentFromSearch = normalizeIntent(new URLSearchParams(search).get('intent'))
  const resolved = intentFromSearch ?? routeIntent ?? getStoredIntent() ?? 'learn'

  useEffect(() => {
    rememberIntent(resolved)
  }, [resolved])

  return resolved
}

function buildIntentSearch(intent: SignupIntent) {
  return intent === 'teach' ? '?intent=teach' : ''
}

function getPostAuthRoute() {
  return '/dashboard'
}

function getAuthCopy() {
  return {
    loginButton: 'Đăng nhập',
    loginSubtitle: 'Đăng nhập để tiếp tục hành trình học tập của bạn trên EdSkill.',
    loginTitle: 'Chào mừng bạn quay lại.',
    panelLabel: 'Khám phá skill mới',
    panelLines: ['Bắt đầu nhẹ nhàng cùng EdSkill'],
    panelTitle: 'Khám phá các skill mới để hoàn thiện bản thân hơn.',
    registerButton: 'Đăng ký',
    registerSubtitle: 'Tạo tài khoản để bắt đầu khám phá những kỹ năng phù hợp với bạn.',
    registerTitle: 'Bắt đầu cùng EdSkill.',
    switchToLoginLabel: 'Đăng nhập',
    switchToRegisterLabel: 'Đăng ký',
  }
}

export default App
