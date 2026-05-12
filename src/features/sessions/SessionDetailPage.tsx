import { useEffect, useMemo, useState } from 'react'
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
  XCircle,
} from 'lucide-react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { getErrorMessage } from '../../api/client'
import { SiteHeader } from '../../components/Brand'
import { MotionPage } from '../../components/MotionPage'
import { showToast } from '../../components/toastEvents'
import { useAppStore } from '../../store/useAppStore'
import {
  buildJitsiUrl,
  canBookSession,
  canCancelSession,
  formatSessionDateTime,
  formatSessionPoints,
  getCurrentSessionRole,
  getSessionStatusLabel,
  invalidateSessionQueries,
  invalidateWalletQueries,
  shouldPollSessionStatus,
} from './sessionUtils'
import { sessionsApi, sessionKeys } from './sessionsApi'
import { reviewApi } from './reviewApi'
import type { SessionDto, SessionStatusDto } from './types'

export function SessionDetailPage() {
  const { sessionId = '' } = useParams()
  const authSession = useAppStore((state) => state.session)
  const queryClient = useQueryClient()
  const [cancelReason, setCancelReason] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [leaveDuration, setLeaveDuration] = useState('')

  const detailQuery = useQuery({
    queryKey: sessionKeys.detail(sessionId),
    queryFn: () => sessionsApi.getById(sessionId),
    enabled: Boolean(sessionId),
  })

  const statusQuery = useQuery({
    queryKey: sessionKeys.status(sessionId),
    queryFn: () => sessionsApi.getStatus(sessionId),
    enabled: Boolean(sessionId) && shouldPollSessionStatus(detailQuery.data?.status),
    refetchInterval: 15_000,
  })

  const sessionData = useMemo(() => mergeSessionStatus(detailQuery.data, statusQuery.data), [detailQuery.data, statusQuery.data])
  const viewerRole = getCurrentSessionRole(sessionData ?? emptySession, authSession?.userId)

  useEffect(() => {
    if (!detailQuery.data || !statusQuery.data) {
      return
    }

    if (detailQuery.data.status !== statusQuery.data.status) {
      void queryClient.invalidateQueries({ queryKey: sessionKeys.detail(sessionId) })
    }
  }, [detailQuery.data, queryClient, sessionId, statusQuery.data])

  const bookMutation = useMutation({
    mutationFn: () => sessionsApi.book(sessionId),
    onSuccess: handleWalletSessionSuccess('Đăng ký buổi học thành công.'),
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

  const joinMutation = useMutation({
    mutationFn: () => sessionsApi.join(sessionId),
    onSuccess: async (updatedSession) => {
      showToast({ kind: 'success', message: 'Buổi học đã bắt đầu.' })
      await invalidateSessionQueries(queryClient, updatedSession.sessionId)

      if (updatedSession.jitsiRoomId) {
        window.open(buildJitsiUrl(updatedSession.jitsiRoomId), '_blank', 'noopener,noreferrer')
      }
    },
    onError: handleActionError,
  })

  const leaveMutation = useMutation({
    mutationFn: () =>
      sessionsApi.leave(sessionId, {
        actualDuration: leaveDuration.trim() ? Number(leaveDuration) : undefined,
      }),
    onSuccess: handleSessionOnlySuccess('Đã rời khỏi buổi học.'),
    onError: handleActionError,
  })

  const completionMutation = useMutation({
    mutationFn: () => sessionsApi.confirmCompletion(sessionId),
    onSuccess: handleWalletSessionSuccess('Đã xác nhận hoàn tất buổi học.'),
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
              void statusQuery.refetch()
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
              <div className="session-detail-points">{formatSessionPoints(sessionData.pointCost)}</div>
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
                  <button className="button primary" disabled={bookMutation.isPending} onClick={() => bookMutation.mutate()} type="button">
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

                {sessionData.status === 'Confirmed' && viewerRole !== 'viewer' && sessionData.deliveryMode === 'Online' ? (
                  <button
                    className="button primary"
                    disabled={joinMutation.isPending}
                    onClick={() => joinMutation.mutate()}
                    type="button"
                  >
                    {joinMutation.isPending ? <LoaderCircle className="spin" size={18} /> : <Video size={18} />}
                    Vào phòng học
                  </button>
                ) : null}

                {sessionData.status === 'InProgress' && viewerRole !== 'viewer' && sessionData.deliveryMode === 'Online' ? (
                  <>
                    <label className="profile-field">
                      <span>Thời lượng thực tế (phút, không bắt buộc)</span>
                      <input
                        min={1}
                        onChange={(event) => setLeaveDuration(event.target.value)}
                        type="number"
                        value={leaveDuration}
                      />
                    </label>
                    <button
                      className="button primary"
                      disabled={leaveMutation.isPending}
                      onClick={() => leaveMutation.mutate()}
                      type="button"
                    >
                      {leaveMutation.isPending ? <LoaderCircle className="spin" size={18} /> : 'Rời phòng học'}
                    </button>
                  </>
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

            {sessionData.deliveryMode === 'Online' && sessionData.jitsiRoomId ? (
              <section className="profile-section-card session-action-panel">
                <a className="button secondary" href={buildJitsiUrl(sessionData.jitsiRoomId)} rel="noreferrer" target="_blank">
                  Mở phòng học trực tuyến
                </a>
              </section>
            ) : null}

            {sessionData.status === 'Completed' && viewerRole !== 'viewer' ? (
              <ReviewForm sessionId={sessionData.sessionId} />
            ) : null}
          </aside>
        </section>
      ) : null}
    </MotionPage>
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

function mergeSessionStatus(sessionData?: SessionDto, statusData?: SessionStatusDto) {
  if (!sessionData) {
    return undefined
  }

  if (!statusData) {
    return sessionData
  }

  return {
    ...sessionData,
    status: statusData.status,
    learnerConfirmed: statusData.learnerConfirmed,
    companionConfirmed: statusData.companionConfirmed,
  }
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

// ─── Review Form ────────────────────────────────────────────────────────────

function ReviewForm({ sessionId }: { sessionId: string }) {
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

