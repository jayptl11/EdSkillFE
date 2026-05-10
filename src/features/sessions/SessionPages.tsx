import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  CalendarDays,
  LoaderCircle,
  Plus,
  RefreshCcw,
  Search,
  Sparkles,
} from 'lucide-react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { getErrorMessage } from '../../api/client'
import { SiteHeader } from '../../components/Brand'
import { MotionPage } from '../../components/MotionPage'
import { showToast } from '../../components/toastEvents'
import { useAppStore } from '../../store/useAppStore'
import {
  buildJitsiUrl,
  canBookSession,
  formatSessionDateTime,
  formatSessionPoints,
  getCurrentSessionRole,
  getSessionStatusLabel,
  invalidateSessionQueries,
  invalidateWalletQueries,
  toDateTimeLocalValue,
} from './sessionUtils'
import { sessionsApi, sessionKeys } from './sessionsApi'
import type { CreateSessionPayload, SessionDto, SessionStatus } from './types'

type SessionBoardMode = 'marketplace' | 'learning' | 'teaching'

const SESSION_LIMIT = 12

const sessionStatusOptions: Array<{ label: string; value: SessionStatus | '' }> = [
  { label: 'Tat ca status', value: '' },
  { label: 'Available', value: 'Available' },
  { label: 'Pending', value: 'Pending' },
  { label: 'Confirmed', value: 'Confirmed' },
  { label: 'In progress', value: 'InProgress' },
  { label: 'Pending review', value: 'PendingReview' },
  { label: 'Completed', value: 'Completed' },
  { label: 'Cancelled', value: 'Cancelled' },
  { label: 'Disputed', value: 'Disputed' },
]

export function SessionMarketplacePage() {
  return <SessionBoardPage mode="marketplace" />
}

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

  const createMutation = useMutation({
    mutationFn: (payload: CreateSessionPayload) => sessionsApi.create(payload),
    onSuccess: async (createdSession) => {
      showToast({ kind: 'success', message: 'Session offer da duoc tao.' })
      await invalidateSessionQueries(queryClient, createdSession.sessionId)
      navigate(`/dashboard/sessions/${createdSession.sessionId}`)
    },
    onError: (error) => {
      showToast({ kind: 'error', message: getErrorMessage(error) })
    },
  })

  if (!session?.accessToken) {
    return <Navigate replace state={{ message: 'Vui long dang nhap de tiep tuc.' }} to="/login" />
  }

  if (!session.roles.includes('companion')) {
    return <Navigate replace to="/dashboard" />
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!formValues.skill.trim()) {
      showToast({ kind: 'error', message: 'Skill la bat buoc.' })
      return
    }

    if (!formValues.scheduledAt) {
      showToast({ kind: 'error', message: 'Vui long chon thoi diem session.' })
      return
    }

    if (formValues.durationMinutes <= 0 || formValues.pointCost <= 0) {
      showToast({ kind: 'error', message: 'Duration va point cost phai lon hon 0.' })
      return
    }

    createMutation.mutate({
      skill: formValues.skill.trim(),
      description: formValues.description.trim() || undefined,
      durationMinutes: formValues.durationMinutes,
      pointCost: formValues.pointCost,
      scheduledAt: new Date(formValues.scheduledAt).toISOString(),
    })
  }

  return (
    <MotionPage className="page dashboard-page profile-page session-hub-page">
      <SiteHeader />
      <section className="dashboard-hero profile-hero">
        <div>
          <span className="eyebrow">
            <Plus size={15} />
            Tao session offer
          </span>
          <h1>Dang lich hoc de learner co the book.</h1>
          <p>
            Offer moi duoc tao o status Available. Khi learner book, points se duoc hold va session
            chuyen sang Pending.
          </p>
        </div>
        <div className="profile-hero-actions">
          <Link className="button secondary" to="/dashboard/sessions/teaching">
            Ve teaching sessions
          </Link>
        </div>
      </section>

      <section className="session-form-layout">
        <form className="profile-form-card session-create-card" onSubmit={handleSubmit}>
          <div className="profile-form-heading">
            <div>
              <span className="eyebrow">
                <Sparkles size={15} />
                Companion offer
              </span>
              <h2>Chi tiet session</h2>
            </div>
            <div className="profile-form-actions">
              <button className="button primary" disabled={createMutation.isPending} type="submit">
                {createMutation.isPending ? <LoaderCircle className="spin" size={18} /> : <Plus size={18} />}
                Tao offer
              </button>
            </div>
          </div>

          <section className="profile-section-card">
            <div className="profile-form-grid">
              <label className="profile-field">
                <span>Skill *</span>
                <input
                  onChange={(event) =>
                    setFormValues((current) => ({ ...current, skill: event.target.value }))
                  }
                  placeholder="VD: Excel, IELTS speaking, React basics"
                  value={formValues.skill}
                />
              </label>

              <label className="profile-field">
                <span>Scheduled at *</span>
                <input
                  onChange={(event) =>
                    setFormValues((current) => ({ ...current, scheduledAt: event.target.value }))
                  }
                  type="datetime-local"
                  value={formValues.scheduledAt}
                />
              </label>

              <label className="profile-field">
                <span>Duration (minutes)</span>
                <input
                  min={15}
                  onChange={(event) =>
                    setFormValues((current) => ({
                      ...current,
                      durationMinutes: Number(event.target.value),
                    }))
                  }
                  type="number"
                  value={formValues.durationMinutes}
                />
              </label>

              <label className="profile-field">
                <span>Point cost</span>
                <input
                  min={1}
                  onChange={(event) =>
                    setFormValues((current) => ({
                      ...current,
                      pointCost: Number(event.target.value),
                    }))
                  }
                  type="number"
                  value={formValues.pointCost}
                />
              </label>

              <label className="profile-field full">
                <span>Description</span>
                <textarea
                  onChange={(event) =>
                    setFormValues((current) => ({ ...current, description: event.target.value }))
                  }
                  rows={5}
                  value={formValues.description}
                />
              </label>
            </div>
          </section>
        </form>

        <aside className="session-guide-card">
          <h3>Nho cho MVP</h3>
          <ul>
            <li>Offer moi bat dau o status Available.</li>
            <li>Learner book se hold points ngay lap tuc.</li>
            <li>Companion can confirm de tao jitsiRoomId.</li>
            <li>Payout chi xay ra khi session Completed hoac late cancel.</li>
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
  const [statusFilter, setStatusFilter] = useState<SessionStatus | ''>(mode === 'marketplace' ? 'Available' : '')
  const [skillFilter, setSkillFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')

  const listQuery = useQuery({
    queryKey: sessionKeys.list({
      status: mode === 'marketplace' ? 'Available' : statusFilter,
      role: mode === 'learning' ? 'learner' : mode === 'teaching' ? 'companion' : undefined,
      page,
      limit: SESSION_LIMIT,
    }),
    queryFn: () =>
      sessionsApi.list({
        status: mode === 'marketplace' ? 'Available' : statusFilter,
        role: mode === 'learning' ? 'learner' : mode === 'teaching' ? 'companion' : undefined,
        page,
        limit: SESSION_LIMIT,
      }),
  })

  const bookMutation = useMutation({
    mutationFn: (sessionId: string) => sessionsApi.book(sessionId),
    onSuccess: async (bookedSession) => {
      showToast({ kind: 'success', message: 'Session da duoc book. Wallet se duoc lam moi.' })
      await Promise.all([
        invalidateSessionQueries(queryClient, bookedSession.sessionId),
        invalidateWalletQueries(queryClient),
      ])
      navigate(`/dashboard/sessions/${bookedSession.sessionId}`)
    },
    onError: (error) => {
      showToast({ kind: 'error', message: getErrorMessage(error) })
    },
  })

  if (!session?.accessToken) {
    return <Navigate replace state={{ message: 'Vui long dang nhap de tiep tuc.' }} to="/login" />
  }

  if (mode === 'learning' && !session.roles.includes('learner')) {
    return <Navigate replace to="/dashboard" />
  }

  if (mode === 'teaching' && !session.roles.includes('companion')) {
    return <Navigate replace to="/dashboard" />
  }

  const sessions = (listQuery.data?.data ?? []).filter((item) => {
    if (mode !== 'marketplace') {
      return true
    }

    const matchesSkill =
      !skillFilter.trim() || item.skill.toLowerCase().includes(skillFilter.trim().toLowerCase())
    const matchesDate = !dateFilter || item.scheduledAt.slice(0, 10) === dateFilter
    return matchesSkill && matchesDate
  })

  const totalPages =
    mode === 'marketplace'
      ? Math.max(1, Math.ceil((listQuery.data?.total ?? 0) / SESSION_LIMIT))
      : Math.max(1, Math.ceil((listQuery.data?.total ?? 0) / SESSION_LIMIT))

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
            Ve dashboard
          </Link>
          {mode === 'teaching' ? (
            <Link className="button primary" to="/dashboard/sessions/new">
              <Plus size={18} />
              Tao offer moi
            </Link>
          ) : null}
        </div>
      </section>

      <section className="session-board-shell">
        <div className="session-board-toolbar">
          <div>
            <h2>{getBoardToolbarTitle(mode)}</h2>
            <p>
              {mode === 'marketplace'
                ? 'Thi truong session Available. Chon mot offer phu hop roi book va theo doi status.'
                : 'Danh sach session duoc tra ve theo role cua ban. Mo detail de thao tac theo status.'}
            </p>
          </div>

          <div className="session-filter-grid">
            {mode === 'marketplace' ? (
              <>
                <label className="session-filter-field">
                  <span>Loc theo skill</span>
                  <div className="admin-search-shell">
                    <Search size={16} />
                    <input
                      onChange={(event) => setSkillFilter(event.target.value)}
                      placeholder="Nhap skill"
                      value={skillFilter}
                    />
                  </div>
                </label>
                <label className="session-filter-field">
                  <span>Loc theo ngay</span>
                  <input
                    onChange={(event) => setDateFilter(event.target.value)}
                    type="date"
                    value={dateFilter}
                  />
                </label>
              </>
            ) : (
              <label className="session-filter-field">
                <span>Status</span>
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
            )}

            <button
              className="button secondary"
              onClick={() => {
                void listQuery.refetch()
              }}
              type="button"
            >
              <RefreshCcw size={18} />
              Lam moi
            </button>
          </div>
        </div>

        {listQuery.isLoading ? (
          <section className="profile-state-card">
            <LoaderCircle className="spin" size={20} />
            <p>Dang tai session list...</p>
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
                <h3>Chua co session nao phu hop.</h3>
                <p>
                  {mode === 'marketplace'
                    ? 'Thu doi bo loc hoac quay lai sau khi companion tao them offer.'
                    : 'Role nay hien chua co session khop voi bo loc da chon.'}
                </p>
              </section>
            ) : (
              <div className="session-card-grid">
                {sessions.map((item) => (
                  <SessionCard
                    canBook={mode === 'marketplace' && canBookSession(item, session.userId)}
                    isBooking={bookMutation.isPending && bookMutation.variables === item.sessionId}
                    key={item.sessionId}
                    onBook={() => bookMutation.mutate(item.sessionId)}
                    session={item}
                    viewerId={session.userId}
                  />
                ))}
              </div>
            )}

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
  const joinUrl = session.jitsiRoomId ? buildJitsiUrl(session.jitsiRoomId) : null

  return (
    <article className="session-card">
      <div className="session-card-top">
        <span className={`session-status-chip status-${session.status.toLowerCase()}`}>
          {getSessionStatusLabel(session.status)}
        </span>
        <span className="session-cost-chip">{formatSessionPoints(session.pointCost)}</span>
      </div>

      <h3>{session.skill}</h3>
      <p>{session.description || 'Chua co mo ta them cho session nay.'}</p>

      <dl className="session-card-meta">
        <div>
          <dt>Scheduled</dt>
          <dd>{formatSessionDateTime(session.scheduledAt)}</dd>
        </div>
        <div>
          <dt>Duration</dt>
          <dd>{session.durationMinutes} phut</dd>
        </div>
        <div>
          <dt>Vai tro cua ban</dt>
          <dd>{currentRole === 'viewer' ? 'Viewer' : currentRole}</dd>
        </div>
      </dl>

      <div className="session-card-actions">
        <Link className="button secondary" to={`/dashboard/sessions/${session.sessionId}`}>
          Xem chi tiet
        </Link>
        {canBook ? (
          <button className="button primary" disabled={isBooking} onClick={onBook} type="button">
            {isBooking ? <LoaderCircle className="spin" size={18} /> : 'Book'}
          </button>
        ) : null}
        {session.status === 'Confirmed' && joinUrl && currentRole !== 'viewer' ? (
          <a className="button secondary" href={joinUrl} rel="noreferrer" target="_blank">
            Mo room
          </a>
        ) : null}
      </div>
    </article>
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
        Trang truoc
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
  if (mode === 'marketplace') {
    return 'Session marketplace'
  }

  if (mode === 'learning') {
    return 'My learning sessions'
  }

  return 'My teaching sessions'
}

function getBoardTitle(mode: SessionBoardMode) {
  if (mode === 'marketplace') {
    return 'Kham pha session Available va book ngay khi phu hop.'
  }

  if (mode === 'learning') {
    return 'Theo doi cac session ban da book trong vai tro learner.'
  }

  return 'Quan ly offer va session dang day trong vai tro companion.'
}

function getBoardDescription(mode: SessionBoardMode) {
  if (mode === 'marketplace') {
    return 'Marketplace goi GET /api/sessions voi status=Available, sau do FE loc them theo skill va ngay.'
  }

  if (mode === 'learning') {
    return 'Session list nay duoc backend tra ve theo role=learner cua current user.'
  }

  return 'Session list nay duoc backend tra ve theo role=companion, kem CTA tao offer moi.'
}

function getBoardToolbarTitle(mode: SessionBoardMode) {
  if (mode === 'marketplace') {
    return 'Danh sach offer'
  }

  if (mode === 'learning') {
    return 'Learning sessions'
  }

  return 'Teaching sessions'
}

function createInitialOfferForm() {
  return {
    skill: '',
    description: '',
    durationMinutes: 60,
    pointCost: 100,
    scheduledAt: toDateTimeLocalValue(new Date(Date.now() + 24 * 60 * 60 * 1000)),
  }
}
