import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  CalendarDays,
  Clock3,
  LoaderCircle,
  MapPin,
  Plus,
  RefreshCcw,
  Sparkles,
  UserRound,
  Video,
  X,
} from 'lucide-react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { getErrorMessage } from '../../api/client'
import { SiteHeader } from '../../components/Brand'
import { MotionPage } from '../../components/MotionPage'
import { showToast } from '../../components/toastEvents'
import { profileApi, profileKeys } from '../profile/profileApi'
import { formatLastActive } from '../profile/profileUtils'
import { SkillAutocomplete } from '../skills/SkillAutocomplete'
import { useAppStore } from '../../store/useAppStore'
import {
  buildJitsiUrl,
  formatSessionDateTime,
  formatSessionPoints,
  getCurrentSessionRole,
  getSessionStatusLabel,
  invalidateSessionQueries,
  invalidateWalletQueries,
  toDateTimeLocalValue,
} from './sessionUtils'
import { sessionsApi, sessionKeys } from './sessionsApi'
import type {
  AllowedDurationMinutes,
  BookSessionRequest,
  CreateSessionRequest,
  DurationPricingOptionDto,
  SessionDeliveryMode,
  SessionDto,
  SessionStatus,
} from './types'

const ALLOWED_DURATIONS: AllowedDurationMinutes[] = [30, 45, 60, 90, 120]

type SessionBoardMode = 'learning' | 'teaching'

const SESSION_LIMIT = 12

const sessionStatusOptions: Array<{ label: string; value: SessionStatus | '' }> = [
  { label: 'Tất cả trạng thái', value: '' },
  { label: 'Đang mở đăng ký', value: 'Available' },
  { label: 'Chờ xác nhận', value: 'Pending' },
  { label: 'Đã xác nhận', value: 'Confirmed' },
  { label: 'Đang diễn ra', value: 'InProgress' },
  { label: 'Chờ xác nhận hoàn tất', value: 'PendingReview' },
  { label: 'Đã hoàn tất', value: 'Completed' },
  { label: 'Đã hủy', value: 'Cancelled' },
  { label: 'Cần hỗ trợ', value: 'Disputed' },
]

export function LearningSessionsPage() {
  return <SessionBoardPage mode="learning" />
}

export function TeachingSessionsPage() {
  return <SessionBoardPage mode="teaching" />
}

export function CreateSessionOfferPage() {
  const session = useAppStore((state) => state.session)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [formValues, setFormValues] = useState(createInitialOfferForm)
  const profileQuery = useQuery({
    queryKey: profileKeys.me(),
    queryFn: profileApi.getMyProfile,
    enabled: Boolean(session?.accessToken),
  })

  const createMutation = useMutation({
    mutationFn: (payload: CreateSessionRequest) => sessionsApi.create(payload),
    onSuccess: async (createdSession) => {
      showToast({ kind: 'success', message: 'Buổi học đã được mở.' })
      await invalidateSessionQueries(queryClient, createdSession.sessionId)
      navigate(`/dashboard/skills/${createdSession.sessionId}`)
    },
    onError: (error) => {
      showToast({ kind: 'error', message: getErrorMessage(error) })
    },
  })

  if (!session?.accessToken) {
    return <Navigate replace state={{ intent: 'teach', message: 'Vui lòng đăng nhập để tiếp tục.' }} to="/login" />
  }

  if (!session.roles.includes('companion')) {
    return <Navigate replace to="/teach" />
  }

  if (profileQuery.isLoading) {
    return (
      <MotionPage className="page dashboard-page profile-page session-hub-page">
        <SiteHeader />
        <section className="profile-state-card">
          <LoaderCircle className="spin" size={24} />
          <p>Đang kiểm tra hồ sơ dạy học...</p>
        </section>
      </MotionPage>
    )
  }

  if (profileQuery.data && !profileQuery.data.isCompanionOnboardingComplete) {
    return <TeachingSoftGate />
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!formValues.skillId) {
      showToast({ kind: 'error', message: 'Hãy chọn kỹ năng cho buổi học này.' })
      return
    }

    if (!formValues.deliveryMode) {
      showToast({ kind: 'error', message: 'Vui lòng chọn hình thức học: Online hoặc Gặp trực tiếp.' })
      return
    }

    if (formValues.deliveryMode === 'Offline' && !formValues.location.trim()) {
      showToast({ kind: 'error', message: 'Vui lòng nhập địa điểm cho buổi học gặp trực tiếp.' })
      return
    }

    if (formValues.durationOptions.length === 0) {
      showToast({ kind: 'error', message: 'Vui lòng chọn ít nhất một thời lượng cho buổi học.' })
      return
    }

    if (!formValues.scheduledAt) {
      showToast({ kind: 'error', message: 'Vui lòng chọn thời gian bắt đầu.' })
      return
    }

    const scheduledDate = new Date(formValues.scheduledAt)
    if (scheduledDate <= new Date()) {
      showToast({ kind: 'error', message: 'Thời gian bắt đầu phải là thời gian trong tương lai.' })
      return
    }

    createMutation.mutate({
      skillId: formValues.skillId,
      description: formValues.description.trim() || null,
      deliveryMode: formValues.deliveryMode,
      location: formValues.deliveryMode === 'Offline' ? formValues.location.trim() : null,
      durationOptions: formValues.durationOptions,
      scheduledAt: scheduledDate.toISOString(),
    })
  }

  return (
    <MotionPage className="page dashboard-page profile-page session-hub-page">
      <SiteHeader />
      <section className="dashboard-hero profile-hero">
        <div>
          <span className="eyebrow">
            <Plus size={15} />
            Mở buổi học mới
          </span>
          <h1>Tạo một buổi học rõ ràng để người học dễ quyết định đăng ký.</h1>
          <p>
            Nêu đúng kỹ năng, thời gian và mô tả ngắn gọn. Buổi học của bạn sẽ hiển thị trong khu
            tìm buổi học ngay khi được mở.
          </p>
        </div>
        <div className="profile-hero-actions">
          <Link className="button secondary" to="/dashboard/skills/teaching">
            Về lịch dạy của tôi
          </Link>
        </div>
      </section>

      <section className="session-form-layout">
        <form className="profile-form-card session-create-card" onSubmit={handleSubmit}>
          <div className="profile-form-heading">
            <div>
              <span className="eyebrow">
                <Sparkles size={15} />
                Buổi học công khai
              </span>
              <h2>Thông tin buổi học</h2>
            </div>
            <div className="profile-form-actions">
              <button className="button primary" disabled={createMutation.isPending} type="submit">
                {createMutation.isPending ? <LoaderCircle className="spin" size={18} /> : <Plus size={18} />}
                Mở buổi học
              </button>
            </div>
          </div>

          <section className="profile-section-card">
            <div className="profile-form-grid">
              <div className="profile-field full">
                <SkillAutocomplete
                  helperText="Chọn đúng kỹ năng để người học tìm thấy bạn dễ hơn."
                  label="Kỹ năng *"
                  onRemove={() => setFormValues((c) => ({ ...c, skillId: '', skillName: '' }))}
                  onSelect={(name) => {
                    // Lấy skillId từ API search khi user chọn
                    // Dùng skillName để hiển thị, skillId để gửi lên server
                    setFormValues((c) => ({ ...c, skillName: name, skillId: name }))
                  }}
                  onSelectWithId={(id, name) => setFormValues((c) => ({ ...c, skillId: id, skillName: name }))}
                  placeholder="Gõ tên kỹ năng để tìm kiếm..."
                  selectedSkills={formValues.skillName ? [formValues.skillName] : []}
                />
              </div>

              <div className="profile-field full">
                <span className="profile-field-label">Hình thức học *</span>
                <div className="session-delivery-toggle">
                  <button
                    className={`session-delivery-option ${formValues.deliveryMode === 'Online' ? 'active' : ''}`}
                    onClick={() => setFormValues((c) => ({ ...c, deliveryMode: 'Online', location: '' }))}
                    type="button"
                  >
                    <Video size={16} />
                    Online
                  </button>
                  <button
                    className={`session-delivery-option ${formValues.deliveryMode === 'Offline' ? 'active' : ''}`}
                    onClick={() => setFormValues((c) => ({ ...c, deliveryMode: 'Offline' }))}
                    type="button"
                  >
                    <MapPin size={16} />
                    Gặp trực tiếp
                  </button>
                </div>
              </div>

              {formValues.deliveryMode === 'Offline' ? (
                <label className="profile-field full">
                  <span>Địa điểm *</span>
                  <input
                    maxLength={500}
                    onChange={(event) => setFormValues((c) => ({ ...c, location: event.target.value }))}
                    placeholder="Ví dụ: Quận 1, TP.HCM hoặc 123 Nguyễn Huệ, Q1"
                    value={formValues.location}
                  />
                </label>
              ) : null}

              <label className="profile-field">
                <span>Thời gian bắt đầu *</span>
                <input
                  onChange={(event) => setFormValues((current) => ({ ...current, scheduledAt: event.target.value }))}
                  type="datetime-local"
                  value={formValues.scheduledAt}
                />
              </label>

              <div className="profile-field full">
                <span className="profile-field-label">Thời lượng cho phép *</span>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', margin: '0 0 0.5rem' }}>
                  Người học sẽ chọn một trong các thời lượng này khi đặt buổi học. Giá sẽ được tính tự động.
                </p>
                <div className="session-duration-options">
                  {ALLOWED_DURATIONS.map((d) => {
                    const selected = formValues.durationOptions.includes(d)
                    return (
                      <button
                        className={`session-duration-option ${selected ? 'active' : ''}`}
                        key={d}
                        onClick={() =>
                          setFormValues((current) => ({
                            ...current,
                            durationOptions: selected
                              ? current.durationOptions.filter((o) => o !== d)
                              : [...current.durationOptions, d].sort((a, b) => a - b),
                          }))
                        }
                        type="button"
                      >
                        {d} phút
                      </button>
                    )
                  })}
                </div>
              </div>

              <label className="profile-field full">
                <span>Mô tả buổi học</span>
                <textarea
                  onChange={(event) => setFormValues((current) => ({ ...current, description: event.target.value }))}
                  placeholder="Bạn sẽ giúp người học đạt được điều gì trong buổi này?"
                  rows={5}
                  value={formValues.description}
                />
              </label>
            </div>
          </section>
        </form>

        <aside className="session-guide-card">
          <h3>Mẹo để buổi học dễ được chọn</h3>
          <ul>
            <li>Đặt tên kỹ năng rõ như người học thường tìm kiếm.</li>
            <li>Nêu ngắn gọn đầu ra sau buổi học thay vì mô tả quá dài.</li>
            <li>Chọn nhiều thời lượng để người học linh hoạt hơn khi đặt lịch.</li>
            <li>Giá sẽ được hệ thống tính tự động dựa trên kỹ năng và chứng chỉ của bạn.</li>
          </ul>
        </aside>
      </section>
    </MotionPage>
  )
}

function SessionBoardPage({ mode }: { mode: SessionBoardMode }) {
  const session = useAppStore((state) => state.session)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<SessionStatus | ''>('')
  const teachingProfileQuery = useQuery({
    queryKey: profileKeys.me(),
    queryFn: profileApi.getMyProfile,
    enabled: Boolean(session?.accessToken) && mode === 'teaching',
  })

  const listQuery = useQuery({
    queryKey: sessionKeys.list({
      limit: SESSION_LIMIT,
      page,
      role: mode === 'learning' ? 'learner' : 'companion',
      status: statusFilter,
    }),
    queryFn: () =>
      sessionsApi.list({
        limit: SESSION_LIMIT,
        page,
        role: mode === 'learning' ? 'learner' : 'companion',
        status: statusFilter,
      }),
  })

  const [bookingTarget, setBookingTarget] = useState<SessionDto | null>(null)

  const bookMutation = useMutation({
    mutationFn: ({ sessionId, payload }: { sessionId: string; payload: BookSessionRequest }) =>
      sessionsApi.book(sessionId, payload),
    onSuccess: async (bookedSession) => {
      showToast({ kind: 'success', message: 'Đặt buổi học thành công. Ví điểm sẽ được cập nhật.' })
      setBookingTarget(null)
      await Promise.all([
        invalidateSessionQueries(queryClient, bookedSession.sessionId),
        invalidateWalletQueries(queryClient),
      ])
      navigate(`/dashboard/skills/${bookedSession.sessionId}`)
    },
    onError: (error) => {
      showToast({ kind: 'error', message: getErrorMessage(error) })
    },
  })

  if (!session?.accessToken) {
    return (
      <Navigate
        replace
        state={{
          intent: mode === 'teaching' ? 'teach' : undefined,
          message: 'Vui lòng đăng nhập để tiếp tục.',
        }}
        to="/login"
      />
    )
  }

  if (mode === 'learning' && !session.roles.includes('learner')) {
    return <Navigate replace to="/dashboard" />
  }

  if (mode === 'teaching' && !session.roles.includes('companion')) {
    return <Navigate replace to="/teach" />
  }

  if (mode === 'teaching' && teachingProfileQuery.isLoading) {
    return (
      <MotionPage className="page dashboard-page profile-page session-hub-page">
        <SiteHeader />
        <section className="profile-state-card">
          <LoaderCircle className="spin" size={24} />
          <p>Đang kiểm tra hồ sơ dạy học...</p>
        </section>
      </MotionPage>
    )
  }

  if (mode === 'teaching' && teachingProfileQuery.data && !teachingProfileQuery.data.isCompanionOnboardingComplete) {
    return <TeachingSoftGate />
  }

  const sessions = listQuery.data?.data ?? []

  const totalPages = Math.max(1, Math.ceil((listQuery.data?.total ?? 0) / SESSION_LIMIT))

  return (
    <MotionPage className="page dashboard-page profile-page session-hub-page">
      <SiteHeader />
      <section className="dashboard-hero profile-hero">
        <div>
          <span className="eyebrow">
            <CalendarDays size={15} />
            {getBoardEyebrow(mode)}
          </span>
          <h1>{getBoardTitle(mode)}</h1>
          <p>{getBoardDescription(mode)}</p>
        </div>
        <div className="profile-hero-actions">
          <Link className="button secondary" to="/dashboard">
            Về trang của tôi
          </Link>
          {mode === 'teaching' ? (
            <Link className="button primary" to="/dashboard/skills/new">
              <Plus size={18} />
              Mở buổi học
            </Link>
          ) : null}
        </div>
      </section>

      <section className="session-board-shell">
        <div className="session-board-toolbar">
          <div>
            <h2>{getBoardToolbarTitle(mode)}</h2>
            <p>
              Mở từng buổi học để xác nhận lịch, tham gia phòng học hoặc xem chi tiết.
            </p>
          </div>

          <div className="session-filter-grid">
            <label className="session-filter-field">
              <span>Trạng thái</span>
              <select
                onChange={(event) => {
                  setStatusFilter(event.target.value as SessionStatus | '')
                  setPage(1)
                }}
                value={statusFilter}
              >
                {sessionStatusOptions.map((option) => (
                  <option key={option.label} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <button
              className="button secondary"
              onClick={() => {
                void listQuery.refetch()
              }}
              type="button"
            >
              <RefreshCcw size={18} />
              Làm mới
            </button>
          </div>
        </div>

        {listQuery.isLoading ? (
          <section className="profile-state-card">
            <LoaderCircle className="spin" size={20} />
            <p>Đang tải danh sách buổi học...</p>
          </section>
        ) : null}

        {listQuery.isError ? (
          <section className="profile-state-card error">
            <AlertCircle size={20} />
            <p>{getErrorMessage(listQuery.error)}</p>
          </section>
        ) : null}

        {listQuery.data ? (
          <>
            {sessions.length === 0 ? (
              <section className="session-empty-state">
                <h3>Chưa có buổi học nào phù hợp.</h3>
                <p>
                  {mode === 'learning'
                    ? 'Bạn chưa đặt buổi học nào.'
                    : 'Bạn chưa tạo lịch học nào.'}
                </p>
              </section>
            ) : (
              <div className="session-card-grid">
                {sessions.map((item) => (
                  <SessionCard
                    canBook={false}
                    isBooking={bookMutation.isPending && bookMutation.variables?.sessionId === item.sessionId}
                    key={item.sessionId}
                    onBook={() => setBookingTarget(item)}
                    session={item}
                    viewerId={session.userId}
                  />
                ))}
              </div>
            )}

            {bookingTarget ? (
              <DurationPickerModal
                isPending={bookMutation.isPending}
                onClose={() => setBookingTarget(null)}
                onConfirm={(dur) =>
                  bookMutation.mutate({ sessionId: bookingTarget.sessionId, payload: { selectedDurationMinutes: dur } })
                }
                session={bookingTarget}
              />
            ) : null}

            <PaginationControls currentPage={page} onPageChange={setPage} totalPages={totalPages} />
          </>
        ) : null}
      </section>
    </MotionPage>
  )
}

function SessionCard({
  session,
  viewerId,
  canBook,
  isBooking,
  onBook,
}: {
  session: SessionDto
  viewerId: string
  canBook: boolean
  isBooking: boolean
  onBook: () => void
}) {
  const currentRole = getCurrentSessionRole(session, viewerId)
  const isOnline = session.deliveryMode === 'Online'
  const canJoin = isOnline && session.jitsiRoomId !== null
  const joinUrl = session.jitsiRoomId ? buildJitsiUrl(session.jitsiRoomId) : null
  const isFormula = session.pricingModel === 'FormulaV1'
  const preview = session.pricingPreview
  const priceLabel =
    isFormula && preview && session.selectedDurationMinutes === null
      ? preview.minLearnerChargePoints === preview.maxLearnerChargePoints
        ? `${preview.minLearnerChargePoints} điểm`
        : `${preview.minLearnerChargePoints} – ${preview.maxLearnerChargePoints} điểm`
      : formatSessionPoints(session.pointCost)
  const companionQuery = useQuery({
    queryKey: [...profileKeys.user(session.companionId), 'session-card'],
    queryFn: () => profileApi.getUserProfile(session.companionId),
    retry: false,
  })
  const companionProfile = companionQuery.data

  return (
    <article className="session-card session-discovery-card">
      <div className="session-card-top">
        <span className={`session-status-chip status-${session.status.toLowerCase()}`}>
          {getSessionStatusLabel(session.status)}
        </span>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <span className={`session-delivery-badge ${isOnline ? 'online' : 'offline'}`}>
            {isOnline ? <Video size={12} /> : <MapPin size={12} />}
            {isOnline ? 'Online' : 'Trực tiếp'}
          </span>
          <span className="session-cost-chip">{priceLabel}</span>
        </div>
      </div>

      <div className="session-teacher-row">
        {companionProfile?.avatarUrl ? (
          <img alt={companionProfile.displayName} className="session-teacher-avatar" src={companionProfile.avatarUrl} />
        ) : (
          <div className="session-teacher-avatar placeholder">
            <UserRound size={18} />
          </div>
        )}
        <div>
          <strong>{companionProfile?.displayName || 'Người dạy trên EdSkill'}</strong>
          <span>{companionProfile?.bio || 'Hồ sơ đang được cập nhật'}</span>
        </div>
      </div>

      <h3>{session.skill}</h3>
      <p>{session.description || 'Người dạy sẽ giới thiệu rõ mục tiêu và cách đồng hành trong buổi học này.'}</p>

      {!isOnline && session.location ? (
        <div className="session-location-row">
          <MapPin size={14} />
          <span>{session.location}</span>
        </div>
      ) : null}

      <dl className="session-card-meta">
        <div>
          <dt>Thời gian</dt>
          <dd>{formatSessionDateTime(session.scheduledAt)}</dd>
        </div>
        <div>
          <dt>Thời lượng</dt>
          <dd>
            {isFormula && session.selectedDurationMinutes
              ? `${session.selectedDurationMinutes} phút (đã chọn)`
              : isFormula && session.durationOptions.length > 0
              ? session.durationOptions.map((d) => `${d} ph`).join(' / ')
              : `${session.durationMinutes} phút`}
          </dd>
        </div>
        <div>
          <dt>Vai trò của bạn</dt>
          <dd>{currentRole === 'viewer' ? 'Đang xem' : currentRole === 'learner' ? 'Người học' : 'Người dạy'}</dd>
        </div>
        <div>
          <dt>Hoạt động gần đây</dt>
          <dd>{companionProfile ? formatLastActive(companionProfile.lastActiveAt) : 'Đang tải'}</dd>
        </div>
      </dl>

      {companionProfile?.skillsToTeach?.length ? (
        <div className="session-skill-strip">
          {companionProfile.skillsToTeach.slice(0, 3).map((skill) => (
            <span key={skill}>{skill}</span>
          ))}
        </div>
      ) : null}

      <div className="session-card-actions">
        <Link className="button secondary" to={`/dashboard/skills/${session.sessionId}`}>
          Xem chi tiết
        </Link>
        {canBook ? (
          <button className="button primary" disabled={isBooking} onClick={onBook} type="button">
            {isBooking ? <LoaderCircle className="spin" size={18} /> : 'Đăng ký'}
          </button>
        ) : null}
        {session.status === 'Confirmed' && canJoin && joinUrl && currentRole !== 'viewer' ? (
          <a className="button secondary" href={joinUrl} rel="noreferrer" target="_blank">
            Vào phòng học
          </a>
        ) : null}
      </div>
    </article>
  )
}

function TeachingSoftGate() {
  return (
    <MotionPage className="page dashboard-page profile-page session-hub-page">
      <SiteHeader />
      <section className="dashboard-hero profile-hero">
        <div>
          <span className="eyebrow">
            <Clock3 size={15} />
            Hoàn thiện hồ sơ trước khi dạy
          </span>
          <h1>Bạn cần hoàn thiện hồ sơ dạy học trước khi mở hoặc quản lý buổi học.</h1>
          <p>
            EdSkill sẽ chỉ cho người học thấy hồ sơ rõ ràng, công khai và đủ thông tin để họ yên
            tâm đăng ký.
          </p>
        </div>
        <div className="profile-hero-actions">
          <Link className="button primary" to="/dashboard/profile?intent=teach">
            Hoàn thiện hồ sơ dạy học
          </Link>
        </div>
      </section>
    </MotionPage>
  )
}

function PaginationControls({
  currentPage,
  onPageChange,
  totalPages,
}: {
  currentPage: number
  onPageChange: (page: number) => void
  totalPages: number
}) {
  return (
    <div className="session-pagination">
      <button
        className="button secondary"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
        type="button"
      >
        Trang trước
      </button>
      <span>
        Trang {currentPage} / {totalPages}
      </span>
      <button
        className="button secondary"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        type="button"
      >
        Trang sau
      </button>
    </div>
  )
}

function getBoardEyebrow(mode: SessionBoardMode) {
  if (mode === 'learning') {
    return 'Buổi học của tôi'
  }

  return 'Khu dạy học'
}

function getBoardTitle(mode: SessionBoardMode) {
  if (mode === 'learning') {
    return 'Theo dõi các buổi học bạn đã đăng ký.'
  }

  return 'Quản lý những buổi học bạn đang mở và đang dạy.'
}

function getBoardDescription(mode: SessionBoardMode) {
  if (mode === 'learning') {
    return 'Xem lại lịch học, trạng thái xác nhận và đường vào phòng học của bạn.'
  }

  return 'Kiểm tra buổi học nào đang chờ xác nhận, đang diễn ra hoặc đã hoàn tất.'
}

function getBoardToolbarTitle(mode: SessionBoardMode) {
  if (mode === 'learning') {
    return 'Lịch học của tôi'
  }

  return 'Lịch dạy của tôi'
}

function createInitialOfferForm() {
  return {
    skillId: '',
    skillName: '',
    deliveryMode: '' as SessionDeliveryMode | '',
    location: '',
    description: '',
    durationOptions: [60] as AllowedDurationMinutes[],
    scheduledAt: toDateTimeLocalValue(new Date(Date.now() + 24 * 60 * 60 * 1000)),
  }
}

// ── Duration Picker Modal ──────────────────────────────────────────────────────

function DurationPickerModal({
  session,
  isPending,
  onConfirm,
  onClose,
}: {
  session: SessionDto
  isPending: boolean
  onConfirm: (duration: AllowedDurationMinutes) => void
  onClose: () => void
}) {
  const pricingOptions = session.durationPricingOptions
  const hasExactPricing = pricingOptions.length > 0

  // Fallback sang durationOptions nếu session cũ không có durationPricingOptions
  const legacyOptions = session.durationOptions

  const [selectedOption, setSelectedOption] = useState<DurationPricingOptionDto | null>(
    () => {
      if (hasExactPricing && pricingOptions.length === 1) return pricingOptions[0]
      return null
    },
  )

  // Legacy fallback: chưa có durationPricingOptions
  const [legacySelected, setLegacySelected] = useState<AllowedDurationMinutes | null>(
    () => (!hasExactPricing && legacyOptions.length === 1 ? (legacyOptions[0] as AllowedDurationMinutes) : null),
  )

  const preview = session.pricingPreview

  const handleConfirm = () => {
    if (hasExactPricing && selectedOption) {
      onConfirm(selectedOption.durationMinutes as AllowedDurationMinutes)
    } else if (!hasExactPricing && legacySelected !== null) {
      onConfirm(legacySelected)
    }
  }

  const canSubmit = hasExactPricing ? selectedOption !== null : legacySelected !== null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Chọn thời lượng buổi học</h3>
          <button aria-label="Đóng" className="modal-close" onClick={onClose} type="button">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
            Kỹ năng: <strong>{session.skill}</strong>
          </p>

          {hasExactPricing ? (
            <>
              <div className="session-duration-options">
                {pricingOptions.map((opt) => (
                  <button
                    className={`session-duration-option ${selectedOption?.durationMinutes === opt.durationMinutes ? 'active' : ''}`}
                    key={opt.durationMinutes}
                    onClick={() => setSelectedOption(opt)}
                    type="button"
                  >
                    {opt.durationMinutes} phút
                  </button>
                ))}
              </div>
              <p
                style={{
                  fontSize: '0.875rem',
                  marginTop: '1rem',
                  color: selectedOption ? 'var(--color-text-primary, inherit)' : 'var(--color-text-secondary)',
                  fontWeight: selectedOption ? 600 : 400,
                  minHeight: '1.5em',
                }}
              >
                {selectedOption
                  ? `Chi phí: ${selectedOption.learnerChargePoints} điểm`
                  : 'Chọn thời lượng để xem điểm cần trả'}
              </p>
            </>
          ) : (
            // Legacy fallback: session cũ không có durationPricingOptions
            <>
              {preview ? (
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
                  Dự kiến chi phí:{' '}
                  <strong>
                    {preview.minLearnerChargePoints === preview.maxLearnerChargePoints
                      ? `${preview.minLearnerChargePoints} điểm`
                      : `${preview.minLearnerChargePoints} – ${preview.maxLearnerChargePoints} điểm`}
                  </strong>
                </p>
              ) : null}
              <div className="session-duration-options">
                {legacyOptions.map((d) => (
                  <button
                    className={`session-duration-option ${legacySelected === d ? 'active' : ''}`}
                    key={d}
                    onClick={() => setLegacySelected(d as AllowedDurationMinutes)}
                    type="button"
                  >
                    {d} phút
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="modal-footer">
          <button className="button secondary" disabled={isPending} onClick={onClose} type="button">
            Hủy
          </button>
          <button
            className="button primary"
            disabled={!canSubmit || isPending}
            onClick={handleConfirm}
            type="button"
          >
            {isPending ? <LoaderCircle className="spin" size={16} /> : null}
            Xác nhận đặt lịch
          </button>
        </div>
      </div>
    </div>
  )
}
