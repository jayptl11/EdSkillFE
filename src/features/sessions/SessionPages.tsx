import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  CalendarDays,
  ChevronDown,
  Clock3,
  LoaderCircle,
  MapPin,
  Plus,
  RefreshCcw,
  Search,
  Sparkles,
  UserRound,
  Video,
  X,
} from 'lucide-react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { getErrorMessage, isApiError } from '../../api/client'
import { SiteHeader } from '../../components/Brand'
import { MotionPage } from '../../components/MotionPage'
import { showToast } from '../../components/toastEvents'
import { profileApi, profileKeys } from '../profile/profileApi'
import { formatLastActive } from '../profile/profileUtils'
import type { ProfileField, ProfileSkillDto } from '../profile/types'
import { getSkillIcon } from '../skills/skillIcons'
import { useAppStore } from '../../store/useAppStore'
import {
  buildCreateSessionPayload,
  canRenderSessionRoomEntry,
  formatSessionDateTime,
  formatSessionPoints,
  getCurrentSessionRole,
  getSessionRoomRoute,
  getSessionStatusClassName,
  getSessionStatusLabel,
  invalidateSessionQueries,
  invalidateWalletQueries,
  toDateTimeLocalValue,
  toUtcIsoFromLocalDateTime,
} from './sessionUtils'
import { sessionsApi, sessionKeys } from './sessionsApi'
import type {
  AllowedDurationMinutes,
  BookSessionRequest,
  CreateSessionRequest,
  DurationPricingOptionDto,
  SessionDto,
  SessionStatus,
} from './types'

const ALLOWED_DURATIONS: AllowedDurationMinutes[] = [30, 45, 60, 90, 120]

type SessionBoardMode = 'learning' | 'teaching'
type CreateSessionField = 'skillId' | 'durationOptions' | 'scheduledAt'
type CreateSessionFieldErrors = Partial<Record<CreateSessionField, string>>

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
  const [fieldErrors, setFieldErrors] = useState<CreateSessionFieldErrors>({})
  const profileQuery = useQuery({
    queryKey: profileKeys.me(),
    queryFn: profileApi.getMyProfile,
    enabled: Boolean(session?.accessToken),
  })
  const teachingSkills = profileQuery.data?.teachingSkills ?? []
  const hasOwnedTeachingSkills = teachingSkills.length > 0

  const createMutation = useMutation({
    mutationFn: (payload: CreateSessionRequest) => sessionsApi.create(payload),
    onSuccess: async (createdSession) => {
      setFieldErrors({})
      showToast({ kind: 'success', message: 'Tạo lịch học thành công.' })
      await invalidateSessionQueries(queryClient, createdSession.sessionId)
      navigate(`/dashboard/skills/${createdSession.sessionId}`)
    },
    onError: async (error) => {
      if (isApiError(error)) {
        if (error.code === 'COMPANION_PROFILE_INCOMPLETE') {
          setFieldErrors({})
          await profileQuery.refetch()
          return
        }

        if (error.code === 'COMPANION_SKILL_NOT_OWNED' || error.code === 'SKILL_NOT_FOUND') {
          setFieldErrors((current) => ({
            ...current,
            skillId:
              error.code === 'COMPANION_SKILL_NOT_OWNED'
                ? 'Bạn chỉ được mở buổi học với kỹ năng đang sở hữu trong hồ sơ dạy học.'
                : 'Kỹ năng không tồn tại.',
          }))
          return
        }

        if (error.code === 'INVALID_DURATION_OPTIONS') {
          setFieldErrors((current) => ({
            ...current,
            durationOptions: 'Chỉ được chọn 30, 45, 60, 90 hoặc 120 phút và không được trùng.',
          }))
          return
        }

        if (error.code === 'SESSION_TIME_CONFLICT') {
          setFieldErrors((current) => ({
            ...current,
            scheduledAt: 'Khung giờ này trùng với lịch khác.',
          }))
          return
        }
      }

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

  if (profileQuery.isError) {
    return (
      <MotionPage className="page dashboard-page profile-page session-hub-page">
        <SiteHeader />
        <section className="profile-state-card error">
          <AlertCircle size={24} />
          <div>
            <h2>Không thể tải hồ sơ dạy học</h2>
            <p>{getErrorMessage(profileQuery.error)}</p>
          </div>
        </section>
      </MotionPage>
    )
  }

  if (!profileQuery.data) {
    return null
  }

  if (!profileQuery.data.isCompanionOnboardingComplete) {
    return <TeachingSoftGate missingFields={profileQuery.data.missingCompanionProfileFields} />
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFieldErrors({})

    if (!hasOwnedTeachingSkills) {
      return
    }

    if (!formValues.skillId) {
      setFieldErrors({ skillId: 'Hãy chọn kỹ năng cho buổi học này.' })
      return
    }

    if (!formValues.scheduledAt) {
      setFieldErrors({ scheduledAt: 'Vui lòng chọn thời gian bắt đầu.' })
      return
    }

    const scheduledDate = new Date(formValues.scheduledAt)
    if (scheduledDate <= new Date()) {
      setFieldErrors({ scheduledAt: 'Thời gian bắt đầu phải là thời gian trong tương lai.' })
      return
    }

    createMutation.mutate(
      buildCreateSessionPayload({
        selectedSkillId: formValues.skillId,
        description: formValues.description,
        selectedMaxDuration: formValues.selectedMaxDuration,
        scheduledAtIso: toUtcIsoFromLocalDateTime(formValues.scheduledAt),
      }),
    )
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
          <p>Nêu đúng kỹ năng, thời gian và mô tả ngắn gọn. Buổi học của bạn sẽ hiển thị trong khu tìm buổi học ngay khi được mở.</p>
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
              {hasOwnedTeachingSkills ? (
                <button className="button primary" disabled={createMutation.isPending} type="submit">
                  {createMutation.isPending ? <LoaderCircle className="spin" size={18} /> : <Plus size={18} />}
                  Mở buổi học
                </button>
              ) : (
                <Link className="button secondary" to="/dashboard/profile?intent=teach">
                  Cập nhật hồ sơ dạy học
                </Link>
              )}
            </div>
          </div>

          <section className="profile-section-card">
            {hasOwnedTeachingSkills ? (
              <div className="profile-form-grid">
                <OwnedSkillPicker
                  error={fieldErrors.skillId}
                  onSelect={(skillId) => {
                    setFieldErrors((current) => ({ ...current, skillId: undefined }))
                    setFormValues((current) => ({ ...current, skillId }))
                  }}
                  options={teachingSkills}
                  selectedSkillId={formValues.skillId}
                />

                <label className="profile-field">
                  <span>Thời gian bắt đầu *</span>
                  <input
                    onChange={(event) => {
                      setFieldErrors((current) => ({ ...current, scheduledAt: undefined }))
                      setFormValues((current) => ({ ...current, scheduledAt: event.target.value }))
                    }}
                    type="datetime-local"
                    value={formValues.scheduledAt}
                  />
                  {fieldErrors.scheduledAt ? <p className="profile-field-error">{fieldErrors.scheduledAt}</p> : null}
                </label>

                <div className="profile-field full">
                  <span className="profile-field-label">Thời lượng tối đa *</span>
                  <p className="profile-helper-copy">
                    Chọn mốc lớn nhất bạn muốn mở. Hệ thống sẽ tự mở rộng các mốc ngắn hơn hợp lệ trong response.
                  </p>
                  <div className="session-duration-options">
                    {ALLOWED_DURATIONS.map((duration) => {
                      const selected = formValues.selectedMaxDuration === duration
                      return (
                        <button
                          aria-pressed={selected}
                          className={`session-duration-option ${selected ? 'active' : ''}`}
                          key={duration}
                          onClick={() => {
                            setFieldErrors((current) => ({ ...current, durationOptions: undefined }))
                            setFormValues((current) => ({ ...current, selectedMaxDuration: duration }))
                          }}
                          type="button"
                        >
                          {duration} phút
                        </button>
                      )
                    })}
                  </div>
                  {fieldErrors.durationOptions ? <p className="profile-field-error">{fieldErrors.durationOptions}</p> : null}
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
            ) : (
              <CreateSessionEmptySkillsState />
            )}
          </section>
        </form>

        <aside className="session-guide-card">
          <h3>Mẹo để buổi học dễ được chọn</h3>
          <ul>
            <li>Chỉ chọn kỹ năng đang có trong hồ sơ dạy học để người học tìm đúng chủ đề bạn đang mở.</li>
            <li>Nêu ngắn gọn đầu ra sau buổi học thay vì mô tả quá dài.</li>
            <li>Chọn mốc thời lượng lớn nhất phù hợp để hệ thống tự mở các lựa chọn ngắn hơn hợp lệ.</li>
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
  const canJoinRoom = canRenderSessionRoomEntry(session) && currentRole !== 'viewer'
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
        <span className={`session-status-chip ${getSessionStatusClassName(session.status)}`}>
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
        {canJoinRoom ? (
          <Link className="button secondary" to={getSessionRoomRoute(session.sessionId)}>
            Join session
          </Link>
        ) : null}
      </div>
    </article>
  )
}

function OwnedSkillPicker({
  error,
  onSelect,
  options,
  selectedSkillId,
}: {
  error?: string
  onSelect: (skillId: string) => void
  options: ProfileSkillDto[]
  selectedSkillId: string
}) {
  const listboxId = useId()
  const blurTimeoutRef = useRef<number | null>(null)
  const [draft, setDraft] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  const selectedOption = options.find((option) => option.skillId === selectedSkillId) ?? null
  const normalizedDraft = draft.trim().toLowerCase()
  const filteredOptions = normalizedDraft
    ? options.filter((option) => option.name.toLowerCase().includes(normalizedDraft))
    : options
  const currentActiveIndex = activeIndex < filteredOptions.length ? activeIndex : 0

  useEffect(() => {
    setDraft(selectedOption?.name ?? '')
  }, [selectedOption?.name])

  const handleSelect = (option: ProfileSkillDto) => {
    onSelect(option.skillId)
    setDraft(option.name)
    setIsOpen(false)
    setActiveIndex(0)
  }

  const handleBlur = () => {
    blurTimeoutRef.current = window.setTimeout(() => {
      setIsOpen(false)
      setDraft(selectedOption?.name ?? '')
    }, 120)
  }

  const handleFocus = () => {
    if (blurTimeoutRef.current !== null) {
      window.clearTimeout(blurTimeoutRef.current)
      blurTimeoutRef.current = null
    }

    setIsOpen(true)
    setActiveIndex(0)
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && (event.key === 'ArrowDown' || event.key === 'Enter')) {
      setIsOpen(true)
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (filteredOptions.length === 0) {
        return
      }
      setActiveIndex((current) => (current + 1) % filteredOptions.length)
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      if (filteredOptions.length === 0) {
        return
      }
      setActiveIndex((current) => (current - 1 + filteredOptions.length) % filteredOptions.length)
      return
    }

    if (event.key === 'Escape') {
      setIsOpen(false)
      setDraft(selectedOption?.name ?? '')
      return
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      const option = filteredOptions[currentActiveIndex] ?? filteredOptions[0]
      if (option) {
        handleSelect(option)
      }
    }
  }

  return (
    <div className="profile-field full">
      <span className="profile-field-label">Kỹ năng *</span>
      <p className="profile-helper-copy">Gõ để lọc trong danh sách kỹ năng dạy hiện có của bạn.</p>
      <div className="skill-autocomplete owned-skill-combobox">
        <div className="skill-autocomplete-input-shell">
          <Search size={17} />
          <input
            aria-autocomplete="list"
            aria-controls={listboxId}
            aria-expanded={isOpen}
            onBlur={handleBlur}
            onChange={(event) => {
              setDraft(event.target.value)
              setIsOpen(true)
              setActiveIndex(0)
            }}
            onFocus={handleFocus}
            onKeyDown={handleKeyDown}
            placeholder="Tìm kỹ năng dạy..."
            role="combobox"
            value={draft}
          />
          <button
            aria-label="Hiển thị danh sách kỹ năng dạy"
            className="skill-autocomplete-toggle"
            onMouseDown={(event) => {
              event.preventDefault()
              setIsOpen((current) => !current)
            }}
            type="button"
          >
            <ChevronDown size={18} />
          </button>
        </div>

        {isOpen ? (
          <div className="skill-autocomplete-popover owned-skill-popover" role="presentation">
            <div className="skill-autocomplete-list" id={listboxId} role="listbox">
              {filteredOptions.map((option, index) => {
                const SkillIcon = getSkillIcon(option.iconKey)
                return (
                  <button
                    aria-selected={option.skillId === selectedSkillId}
                    className={`skill-autocomplete-option ${index === currentActiveIndex ? 'active' : ''}`}
                    key={option.skillId}
                    onMouseDown={(event) => {
                      event.preventDefault()
                      handleSelect(option)
                    }}
                    role="option"
                    type="button"
                  >
                    <span aria-hidden="true" className="skill-autocomplete-option-icon">
                      <SkillIcon size={16} />
                    </span>
                    <span className="skill-autocomplete-option-copy">
                      <span>{option.name}</span>
                      <small>{option.skillId === selectedSkillId ? 'Đang chọn' : 'Kỹ năng dạy của bạn'}</small>
                    </span>
                  </button>
                )
              })}

              {filteredOptions.length === 0 ? (
                <div className="skill-autocomplete-state empty">
                  <span>Không tìm thấy kỹ năng phù hợp.</span>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
      {error ? <p className="profile-field-error">{error}</p> : null}
    </div>
  )
}

function CreateSessionEmptySkillsState() {
  return (
    <div className="session-note-banner info create-session-empty-state">
      <strong>Chưa có kỹ năng dạy để mở buổi học</strong>
      <p>Hãy cập nhật kỹ năng dạy trong hồ sơ trước khi tạo buổi học mới.</p>
      <div>
        <Link className="button secondary" to="/dashboard/profile?intent=teach">
          Cập nhật hồ sơ dạy học
        </Link>
      </div>
    </div>
  )
}

function getOnboardingFieldLabel(field: ProfileField | string) {
  switch (field) {
    case 'displayName':
      return 'Tên hiển thị'
    case 'bio':
      return 'Tiểu sử'
    case 'dateOfBirth':
      return 'Ngày sinh'
    case 'phone':
      return 'Số điện thoại'
    case 'degreeUrl':
      return 'Bằng cấp'
    case 'credentialUrls':
      return 'Chứng chỉ'
    case 'skillsToTeach':
      return 'Kỹ năng muốn dạy'
    case 'skillsToLearn':
      return 'Kỹ năng muốn học'
    case 'avatarUrl':
      return 'Ảnh đại diện'
    case 'isPublic':
      return 'Trạng thái công khai hồ sơ'
    default:
      return 'Thông tin hồ sơ cần bổ sung'
  }
}

function TeachingSoftGate({ missingFields = [] }: { missingFields?: Array<ProfileField | string> }) {
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
          <p>EdSkill chỉ cho phép mở buổi học khi hồ sơ dạy học đã đầy đủ theo kiểm tra của backend.</p>
        </div>
        <div className="profile-hero-actions">
          <Link className="button primary" to="/dashboard/profile?intent=teach">
            Hoàn thiện hồ sơ dạy học
          </Link>
        </div>
      </section>

      <section className="session-form-layout">
        <section className="profile-form-card session-create-card">
          <div className="profile-form-heading">
            <div>
              <span className="eyebrow">
                <AlertCircle size={15} />
                Chưa thể mở buổi học
              </span>
              <h2>Checklist hồ sơ cần bổ sung</h2>
            </div>
          </div>

          <section className="profile-section-card">
            <div className="session-note-banner danger">
              <strong>Hồ sơ dạy học chưa hoàn tất</strong>
              <p>Vui lòng bổ sung các mục còn thiếu dưới đây trước khi tạo buổi học.</p>
            </div>

            {missingFields.length > 0 ? (
              <ul className="session-onboarding-checklist">
                {missingFields.map((field) => (
                  <li key={field}>{getOnboardingFieldLabel(field)}</li>
                ))}
              </ul>
            ) : (
              <p className="profile-empty-copy">Hệ thống chưa cung cấp danh sách mục cần bổ sung.</p>
            )}
          </section>
        </section>

        <aside className="session-guide-card">
          <h3>Lưu ý</h3>
          <ul>
            <li>Trạng thái onboarding được backend quyết định.</li>
            <li>Danh sách trên chỉ hiển thị các mục cần thiết cho người dùng cuối.</li>
            <li>Sau khi cập nhật hồ sơ, bạn có thể quay lại để mở buổi học.</li>
          </ul>
        </aside>
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
    description: '',
    selectedMaxDuration: 60 as AllowedDurationMinutes,
    scheduledAt: toDateTimeLocalValue(new Date(Date.now() + 24 * 60 * 60 * 1000)),
  }
}

// â”€â”€ Duration Picker Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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



