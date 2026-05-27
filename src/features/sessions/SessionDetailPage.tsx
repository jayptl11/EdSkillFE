import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  CheckCheck,
  Clock3,
  LoaderCircle,
  MapPin,
  RefreshCcw,
  Star,
  Video,
  X,
  XCircle,
} from 'lucide-react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { getErrorMessage, isApiError } from '../../api/client'
import { invalidateSessionCompletionQueries } from '../../api/cacheInvalidation'
import { SiteHeader } from '../../components/Brand'
import { MotionPage } from '../../components/MotionPage'
import { showToast } from '../../components/toastEvents'
import { useAppStore } from '../../store/useAppStore'
import { useSessionRealtimeEffect } from './SessionRealtimeProvider'
import {
  canBookSession,
  canCancelSession,
  canOpenSessionRoomPage,
  formatSessionDateTime,
  formatSessionPoints,
  getCurrentSessionRole,
  getSessionRoomEntryLabel,
  getSessionRoomRoute,
  getSessionStatusLabel,
  invalidateSessionQueries,
  invalidateWalletQueries,
  parseSessionDateTime,
} from './sessionUtils'
import { reviewDashboardKeys } from '../reviews/reviewDashboardApi'
import { sessionsApi, sessionKeys } from './sessionsApi'
import { reviewApi } from './reviewApi'
import type { AllowedDurationMinutes, BookSessionRequest, DurationPricingOptionDto, SessionDto } from './types'

export function SessionDetailPage() {
  const { sessionId = '' } = useParams()
  const authSession = useAppStore((state) => state.session)
  const queryClient = useQueryClient()
  const [cancelReason, setCancelReason] = useState('')
  const [rejectReason, setRejectReason] = useState('')

  const detailQuery = useQuery({
    queryKey: sessionKeys.detail(sessionId),
    queryFn: () => sessionsApi.getById(sessionId),
    enabled: Boolean(sessionId),
  })

  const sessionData = detailQuery.data
  const viewerRole = getCurrentSessionRole(sessionData ?? emptySession, authSession?.userId)

  const roomAccessQuery = useQuery({
    queryKey: sessionKeys.roomAccess(sessionId),
    queryFn: () => sessionsApi.getRoomAccess(sessionId),
    enabled:
      Boolean(sessionId)
      && sessionData?.deliveryMode === 'Online'
      && viewerRole !== 'viewer',
  })
  const roomAccessData = roomAccessQuery.data
  const roomAccessRefetch = roomAccessQuery.refetch
  const canOpenRoomPage = canOpenSessionRoomPage(roomAccessData)
  const showRoomEntryAction = sessionData?.deliveryMode === 'Online' && viewerRole !== 'viewer' && (roomAccessData || roomAccessQuery.isLoading)
  const shouldUseRealtimeSubscription =
    Boolean(sessionId)
    && sessionData?.deliveryMode === 'Online'
    && viewerRole !== 'viewer'

  useEffect(() => {
    const access = roomAccessData

    if (!access || canOpenSessionRoomPage(access) || access.denyCode !== 'SESSION_JOIN_WINDOW_CLOSED') {
      return undefined
    }

    const now = Date.now()
    const openAt = parseSessionDateTime(access.joinOpenAt)?.getTime() ?? Number.NaN

    if (!Number.isFinite(openAt) || now >= openAt) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      void roomAccessRefetch()
    }, Math.max(0, openAt - now) + 500)

    return () => window.clearTimeout(timeoutId)
  }, [roomAccessData, roomAccessRefetch])

  useSessionRealtimeEffect({
    enabled: shouldUseRealtimeSubscription,
    onReconnect: () => {
      void detailQuery.refetch()
      void roomAccessQuery.refetch()
    },
    onRoomStateUpdated: (payload) => {
      if (payload.sessionId !== sessionId) {
        return
      }

      void roomAccessQuery.refetch()
    },
    onSubscribeError: (error) => {
      if (isApiError(error) && (error.code === 'FORBIDDEN' || error.code === 'UNAUTHORIZED')) {
        void detailQuery.refetch()
      }

      showToast({ kind: 'error', message: getErrorMessage(error) })
    },
    sessionId,
  })

  const [bookingOpen, setBookingOpen] = useState(false)

  const bookMutation = useMutation({
    mutationFn: (payload: BookSessionRequest) => sessionsApi.book(sessionId, payload),
    onSuccess: async (updated) => {
      setBookingOpen(false)
      showToast({ kind: 'success', message: 'Đặt buổi học thành công. Ví điểm sẽ được cập nhật.' })
      await Promise.all([
        invalidateSessionQueries(queryClient, updated.sessionId),
        invalidateWalletQueries(queryClient),
      ])
    },
    onError: handleActionError,
  })

  const confirmMutation = useMutation({
    mutationFn: () => sessionsApi.confirm(sessionId),
    onSuccess: handleSessionOnlySuccess('Buổi học đã được xác nhận.'),
    onError: handleActionError,
  })

  const rejectMutation = useMutation({
    mutationFn: () => sessionsApi.reject(sessionId, { reason: rejectReason.trim() || undefined }),
    onSuccess: handleWalletSessionSuccess('Buổi học đã bị từ chối và người học được hoàn điểm.'),
    onError: handleActionError,
  })

  const cancelMutation = useMutation({
    mutationFn: () => sessionsApi.cancel(sessionId, { reason: cancelReason.trim() || undefined }),
    onSuccess: handleWalletSessionSuccess('Buổi học đã được hủy.'),
    onError: handleActionError,
  })

  const completionMutation = useMutation({
    mutationFn: () => sessionsApi.confirmCompletion(sessionId),
    onSuccess: async () => {
      showToast({ kind: 'success', message: 'Đã xác nhận hoàn tất buổi học.' })
      await Promise.all([
        invalidateSessionQueries(queryClient, sessionId),
        invalidateSessionCompletionQueries(queryClient),
      ])
    },
    onError: handleActionError,
  })

  if (!authSession?.accessToken) {
    return <Navigate replace state={{ message: 'Vui lòng đăng nhập để tiếp tục.' }} to="/login" />
  }

  function handleActionError(error: unknown) {
    showToast({ kind: 'error', message: getErrorMessage(error) })
  }

  function handleSessionOnlySuccess(message: string) {
    return async (updatedSession: SessionDto) => {
      showToast({ kind: 'success', message })
      await invalidateSessionQueries(queryClient, updatedSession.sessionId)
    }
  }

  function handleWalletSessionSuccess(message: string) {
    return async (updatedSession: SessionDto) => {
      showToast({ kind: 'success', message })
      await Promise.all([
        invalidateSessionQueries(queryClient, updatedSession.sessionId),
        invalidateWalletQueries(queryClient),
      ])
    }
  }

  return (
    <>
      <MotionPage className="page dashboard-page profile-page session-hub-page">
      <SiteHeader />
      <section className="dashboard-hero profile-hero">
        <div>
          <span className="eyebrow">
            <Clock3 size={15} />
            Chi tiết buổi học
          </span>
          <h1>Theo dõi trạng thái buổi học theo thời gian thực.</h1>
          <p>
            Các nút thao tác thay đổi tùy theo trạng thái hiện tại và vai trò của bạn trong buổi học.
          </p>
        </div>
        <div className="profile-hero-actions">
          <Link className="button secondary" to="/dashboard/skills/learning">
            Buổi học của tôi
          </Link>
          <button
            className="button secondary"
            onClick={() => {
              void detailQuery.refetch()
              void roomAccessQuery.refetch()
            }}
            type="button"
          >
            <RefreshCcw size={18} />
            Làm mới
          </button>
        </div>
      </section>

      {detailQuery.isLoading ? (
        <section className="profile-state-card">
          <LoaderCircle className="spin" size={24} />
          <p>Đang tải chi tiết buổi học...</p>
        </section>
      ) : null}

      {detailQuery.isError ? (
        <section className="profile-state-card error">
          <AlertCircle size={22} />
          <div>
            <h2>Không thể tải chi tiết buổi học</h2>
            <p>{getErrorMessage(detailQuery.error)}</p>
          </div>
        </section>
      ) : null}

      {sessionData ? (
        <section className="session-detail-layout">
          <article className="profile-form-card session-detail-card">
            <div className="profile-form-heading">
              <div>
                <span className={`session-status-chip status-${sessionData.status.toLowerCase()}`}>
                  {getSessionStatusLabel(sessionData.status)}
                </span>
                <h2>{sessionData.skill}</h2>
              </div>
              {sessionData.pricingModel !== 'FormulaV1' ? (
                <div className="session-detail-points">{formatSessionPoints(sessionData.pointCost)}</div>
              ) : null}
            </div>

            <p className="session-detail-description">
              {sessionData.description || 'Chưa có mô tả thêm cho buổi học này.'}
            </p>

            <dl className="session-detail-grid">
              <DetailItem label="Vai trò của bạn" value={viewerRole === 'learner' ? 'Người học' : viewerRole === 'companion' ? 'Người hướng dẫn' : 'Người xem'} />
              <DetailItem label="Hình thức" value={sessionData.deliveryMode === 'Online' ? 'Online' : 'Gặp trực tiếp'} />
              <DetailItem label="Thời gian" value={formatSessionDateTime(sessionData.scheduledAt)} />
              <DetailItem label="Thời lượng" value={`${sessionData.durationMinutes} phút`} />
              <DetailItem label="Bắt đầu" value={formatSessionDateTime(sessionData.actualStartAt)} />
              <DetailItem label="Kết thúc" value={formatSessionDateTime(sessionData.actualEndAt)} />
              <DetailItem
                label="Thời lượng thực tế"
                value={sessionData.actualDuration ? `${sessionData.actualDuration} phút` : 'Chưa có'}
              />
              <DetailItem label="Đã hủy lúc" value={formatSessionDateTime(sessionData.cancelledAt)} />
            </dl>

            {sessionData.deliveryMode === 'Offline' && sessionData.location ? (
              <div className="session-note-banner info">
                <MapPin size={16} />
                <div>
                  <strong>Địa điểm gặp mặt</strong>
                  <p>{sessionData.location}</p>
                </div>
              </div>
            ) : null}

            {sessionData.cancelReason ? (
              <div className="session-note-banner">
                <strong>Lý do hủy</strong>
                <p>{sessionData.cancelReason}</p>
              </div>
            ) : null}

            {sessionData.status === 'PendingReview' ? (
              <div className="session-note-banner info">
                <strong>Xác nhận hoàn tất</strong>
                <p>
                  Người học: {sessionData.learnerConfirmed ? 'đã xác nhận' : 'chờ'} | Người hướng dẫn:{' '}
                  {sessionData.companionConfirmed ? 'đã xác nhận' : 'chờ'}
                </p>
              </div>
            ) : null}

            {sessionData.status === 'Disputed' ? (
              <div className="session-note-banner danger">
                <strong>Đang tranh chấp</strong>
                <p>
                  Thời lượng thực tế ngắn hơn mức tối thiểu. Vui lòng liên hệ bộ phận hỗ trợ để được giải quyết.
                </p>
              </div>
            ) : null}
          </article>

          <aside className="session-side-stack">
            <section className="profile-section-card session-action-panel">
              <div className="session-action-head">
                <h3>Thao tác</h3>
                <p>Các nút thao tác sẽ thay đổi theo trạng thái hiện tại.</p>
              </div>

              <div className="session-action-stack">
                {canBookSession(sessionData, authSession.userId) && authSession.roles.includes('learner') ? (
                  <button className="button primary" disabled={bookMutation.isPending} onClick={() => setBookingOpen(true)} type="button">
                    {bookMutation.isPending ? <LoaderCircle className="spin" size={18} /> : 'Đăng ký'}
                  </button>
                ) : null}

                {sessionData.status === 'Pending' && viewerRole === 'companion' ? (
                  <>
                    <button
                      className="button primary"
                      disabled={confirmMutation.isPending}
                      onClick={() => confirmMutation.mutate()}
                      type="button"
                    >
                      {confirmMutation.isPending ? <LoaderCircle className="spin" size={18} /> : <CheckCheck size={18} />}
                      Xác nhận
                    </button>
                    <label className="profile-field">
                      <span>Lý do từ chối</span>
                      <textarea
                        onChange={(event) => setRejectReason(event.target.value)}
                        rows={3}
                        value={rejectReason}
                      />
                    </label>
                    <button
                      className="button secondary ghost"
                      disabled={rejectMutation.isPending}
                      onClick={() => rejectMutation.mutate()}
                      type="button"
                    >
                      {rejectMutation.isPending ? <LoaderCircle className="spin" size={18} /> : <XCircle size={18} />}
                      Từ chối
                    </button>
                  </>
                ) : null}

                {canCancelSession(sessionData, viewerRole) ? (
                  <>
                    <label className="profile-field">
                      <span>Lý do hủy</span>
                      <textarea
                        onChange={(event) => setCancelReason(event.target.value)}
                        rows={3}
                        value={cancelReason}
                      />
                    </label>
                    <button
                      className="button secondary ghost"
                      disabled={cancelMutation.isPending}
                      onClick={() => cancelMutation.mutate()}
                      type="button"
                    >
                      {cancelMutation.isPending ? <LoaderCircle className="spin" size={18} /> : <XCircle size={18} />}
                      Hủy buổi học
                    </button>
                  </>
                ) : null}

                {showRoomEntryAction ? (
                  canOpenRoomPage ? (
                    <Link className="button primary" to={getSessionRoomRoute(sessionData.sessionId)}>
                      <Video size={18} />
                      Join session
                    </Link>
                  ) : (
                    <button className="button primary" disabled type="button">
                      <Video size={18} />
                      {getSessionRoomEntryLabel(roomAccessQuery.data, roomAccessQuery.isLoading)}
                    </button>
                  )
                ) : null}

                {sessionData.status === 'PendingReview' && viewerRole !== 'viewer' ? (
                  <button
                    className="button primary"
                    disabled={
                      completionMutation.isPending ||
                      (viewerRole === 'learner' && sessionData.learnerConfirmed) ||
                      (viewerRole === 'companion' && sessionData.companionConfirmed)
                    }
                    onClick={() => completionMutation.mutate()}
                    type="button"
                  >
                    {completionMutation.isPending ? (
                      <LoaderCircle className="spin" size={18} />
                    ) : (
                      'Xác nhận hoàn tất'
                    )}
                  </button>
                ) : null}
              </div>
            </section>

            {showRoomEntryAction ? (
              <section className="profile-section-card session-action-panel">
                {canOpenRoomPage ? (
                  <Link className="button secondary" to={getSessionRoomRoute(sessionData.sessionId)}>
                    Mở phòng học trực tuyến
                  </Link>
                ) : (
                  <button className="button secondary" disabled type="button">
                    {getSessionRoomEntryLabel(roomAccessQuery.data, roomAccessQuery.isLoading)}
                  </button>
                )}
              </section>
            ) : null}

            {sessionData.status === 'Completed' && viewerRole !== 'viewer' ? (
              <ReviewForm sessionId={sessionData.sessionId} />
            ) : null}
          </aside>
        </section>
      ) : null}
    </MotionPage>

      {bookingOpen && sessionData ? (
        <SessionDetailBookModal
          isPending={bookMutation.isPending}
          onClose={() => setBookingOpen(false)}
          onConfirm={(dur) => bookMutation.mutate({ selectedDurationMinutes: dur })}
          session={sessionData}
        />
      ) : null}
    </>
  )
}
function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

const emptySession: SessionDto = {
  sessionId: '',
  companionId: '',
  learnerId: null,
  skill: '',
  description: null,
  deliveryMode: 'Online',
  location: null,
  durationMinutes: 0,
  pointCost: 0,
  pricingModel: 'LegacyManual',
  durationOptions: [],
  durationPricingOptions: [],
  selectedDurationMinutes: null,
  pricingPreview: null,
  pricingBreakdown: null,
  scheduledAt: new Date(0).toISOString(),
  status: 'Available',
  jitsiRoomId: null,
  actualStartAt: null,
  actualEndAt: null,
  actualDuration: null,
  learnerConfirmed: false,
  companionConfirmed: false,
  cancelReason: null,
  cancelledAt: null,
  disbursedAt: null,
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
}

// ─── Detail Book Modal ──────────────────────────────────────────────────────

function SessionDetailBookModal({
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
  const isFormula = session.pricingModel === 'FormulaV1'
  const legacyOptions = session.durationOptions
  const preview = session.pricingPreview

  const [selectedOption, setSelectedOption] = useState<DurationPricingOptionDto | null>(() => {
    if (hasExactPricing && pricingOptions.length === 1) return pricingOptions[0]
    return null
  })

  const [legacySelected, setLegacySelected] = useState<AllowedDurationMinutes | null>(() => {
    if (!hasExactPricing && legacyOptions.length === 1) return legacyOptions[0] as AllowedDurationMinutes
    return null
  })

  // LegacyManual hoặc không có options: không cần modal
  if (!isFormula || (legacyOptions.length === 0 && !hasExactPricing)) {
    return null
  }

  const canSubmit = hasExactPricing ? selectedOption !== null : legacySelected !== null

  const handleConfirm = () => {
    if (hasExactPricing && selectedOption) {
      onConfirm(selectedOption.durationMinutes as AllowedDurationMinutes)
    } else if (!hasExactPricing && legacySelected !== null) {
      onConfirm(legacySelected)
    }
  }

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

// ─── Review Form ────────────────────────────────────────────────────────────

function ReviewForm({ sessionId }: { sessionId: string }) {
  const queryClient = useQueryClient()
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [windowClosed, setWindowClosed] = useState(false)

  const reviewMutation = useMutation({
    mutationFn: () =>
      reviewApi.create({
        sessionId,
        rating: rating as 1 | 2 | 3 | 4 | 5,
        comment: comment.trim() || null,
      }),
    onSuccess: () => {
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: reviewDashboardKeys.root() }),
        queryClient.invalidateQueries({ queryKey: sessionKeys.detail(sessionId) }),
      ])
      setSubmitted(true)
      showToast({ kind: 'success', message: 'Đã gửi đánh giá thành công.' })
    },
    onError: (error) => {
      const msg = getErrorMessage(error)
      if (msg.includes('REVIEW_ALREADY_EXISTS')) {
        setSubmitted(true)
      } else if (msg.includes('REVIEW_WINDOW_CLOSED')) {
        setWindowClosed(true)
      } else {
        showToast({ kind: 'error', message: msg })
      }
    },
  })

  if (windowClosed) {
    return (
      <section className="profile-section-card session-action-panel">
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
          Đã quá thời gian đánh giá (48 giờ sau khi hoàn tất).
        </p>
      </section>
    )
  }

  if (submitted) {
    return (
      <section className="profile-section-card session-action-panel">
        <p style={{ color: 'var(--color-success)', fontSize: '0.875rem', fontWeight: 500 }}>
          ✓ Đã gửi đánh giá
        </p>
      </section>
    )
  }

  const displayRating = hoverRating || rating

  return (
    <section className="profile-section-card session-action-panel">
      <div className="session-action-head">
        <h3>Đánh giá buổi học</h3>
        <p>Chia sẻ trải nghiệm của bạn để giúp người học khác tham khảo.</p>
      </div>
      <div className="session-review-stars">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            aria-label={`${star} sao`}
            className={`review-star ${star <= displayRating ? 'active' : ''}`}
            key={star}
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            type="button"
          >
            <Star size={24} />
          </button>
        ))}
      </div>
      <label className="profile-field" style={{ marginTop: '0.75rem' }}>
        <span>Nhận xét (không bắt buộc)</span>
        <textarea
          maxLength={1000}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Chia sẻ điều bạn thấy hay về buổi học này..."
          rows={3}
          value={comment}
        />
      </label>
      <button
        className="button primary"
        disabled={rating === 0 || reviewMutation.isPending}
        onClick={() => reviewMutation.mutate()}
        style={{ marginTop: '0.5rem' }}
        type="button"
      >
        {reviewMutation.isPending ? <LoaderCircle className="spin" size={18} /> : 'Gửi đánh giá'}
      </button>
    </section>
  )
}

