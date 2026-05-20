import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, Clock3, LoaderCircle, RefreshCcw, Video } from 'lucide-react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { getErrorMessage, isApiError } from '../../api/client'
import { SiteHeader } from '../../components/Brand'
import { MotionPage } from '../../components/MotionPage'
import { showToast } from '../../components/toastEvents'
import { useAppStore } from '../../store/useAppStore'
import { loadJitsiExternalApiScript } from './jitsiLoader'
import { sessionKeys, sessionsApi } from './sessionsApi'
import {
  formatSessionDateTime,
  getSessionStatusLabel,
  invalidateSessionQueries,
  invalidateWalletQueries,
  parseSessionDateTime,
} from './sessionUtils'
import type { SessionDto, SessionRoomAccessDto } from './types'

type SessionRoomPageState =
  | 'loading-access'
  | 'waiting-for-host'
  | 'access-denied'
  | 'ready-to-mount'
  | 'joining-room'
  | 'in-room'
  | 'leaving-room'
  | 'post-call'

export function SessionRoomPage() {
  const { sessionId = '' } = useParams()
  const authSession = useAppStore((state) => state.session)
  const queryClient = useQueryClient()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const jitsiApiRef = useRef<JitsiMeetExternalAPIInstance | null>(null)
  const joinedPostedRef = useRef(false)
  const leavePostedRef = useRef(false)
  const hasJoinedRef = useRef(false)
  const unmountedRef = useRef(false)
  const [pageState, setPageState] = useState<SessionRoomPageState>('loading-access')
  const [localError, setLocalError] = useState<string | null>(null)
  const [postCallSession, setPostCallSession] = useState<SessionDto | null>(null)

  const accessQuery = useQuery({
    queryKey: sessionKeys.roomAccess(sessionId),
    queryFn: () => sessionsApi.getRoomAccess(sessionId),
    enabled: Boolean(sessionId),
    refetchInterval: pageState === 'waiting-for-host' ? 10_000 : false,
  })

  const statusQuery = useQuery({
    queryKey: sessionKeys.status(sessionId),
    queryFn: () => sessionsApi.getStatus(sessionId),
    enabled: pageState === 'post-call' && postCallSession?.status === 'InProgress',
    refetchInterval: 15_000,
  })

  const accessData = accessQuery.data
  const shouldRenderRoom =
    pageState === 'ready-to-mount'
    || pageState === 'joining-room'
    || pageState === 'in-room'
    || pageState === 'leaving-room'

  const joinMutation = useMutation({
    mutationFn: () => sessionsApi.join(sessionId),
    onSuccess: async (updatedSession) => {
      await invalidateSessionQueries(queryClient, updatedSession.sessionId)

      if (unmountedRef.current) {
        return
      }

      setPageState('in-room')
    },
    onError: async (error) => {
      if (unmountedRef.current) {
        return
      }

      if (isApiError(error) && error.code === 'SESSION_HOST_NOT_READY') {
        setLocalError(null)
        const refreshedAccess = await accessQuery.refetch()

        if (unmountedRef.current) {
          return
        }

        setPageState(resolveAccessPageState(refreshedAccess.data))
        return
      }

      setLocalError(getErrorMessage(error))
      showToast({ kind: 'error', message: getErrorMessage(error) })
    },
  })

  const leaveMutation = useMutation({
    mutationFn: () => sessionsApi.leave(sessionId, { actualDuration: null }),
    onSuccess: async () => {
      await invalidateSessionQueries(queryClient, sessionId)
      const nextSession = await sessionsApi.getById(sessionId)

      if (unmountedRef.current) {
        return
      }

      setPostCallSession(nextSession)
      setPageState('post-call')
    },
    onError: async (error) => {
      await invalidateSessionQueries(queryClient, sessionId)

      if (unmountedRef.current) {
        return
      }

      setLocalError(getErrorMessage(error))
      setPageState('post-call')
      showToast({ kind: 'error', message: getErrorMessage(error) })
    },
  })

  const confirmCompletionMutation = useMutation({
    mutationFn: () => sessionsApi.confirmCompletion(sessionId),
    onSuccess: async () => {
      await Promise.all([
        invalidateSessionQueries(queryClient, sessionId),
        invalidateWalletQueries(queryClient),
      ])

      const nextSession = await sessionsApi.getById(sessionId)

      if (unmountedRef.current) {
        return
      }

      setPostCallSession(nextSession)
      showToast({ kind: 'success', message: 'Đã xác nhận hoàn tất buổi học.' })
    },
    onError: (error) => {
      showToast({ kind: 'error', message: getErrorMessage(error) })
    },
  })

  const deniedPresentation = useMemo(
    () => buildDeniedPresentation(accessData, accessQuery.error),
    [accessData, accessQuery.error],
  )

  useEffect(() => {
    if (!accessQuery.isLoading) {
      setPageState(resolveAccessPageState(accessData))
    }
  }, [accessData, accessQuery.isLoading])

  useEffect(() => {
    if (!accessData || accessData.canJoin || accessData.denyCode !== 'SESSION_JOIN_WINDOW_CLOSED') {
      return undefined
    }

    const now = Date.now()
    const openAt = parseSessionDateTime(accessData.joinOpenAt)?.getTime() ?? Number.NaN

    if (!Number.isFinite(openAt) || now >= openAt) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      void accessQuery.refetch()
    }, Math.max(0, openAt - now) + 500)

    return () => window.clearTimeout(timeoutId)
  }, [accessData, accessQuery])

  useEffect(() => {
    if (!accessData?.canJoin || !shouldRenderRoom) {
      return undefined
    }

    if (!accessData.roomName) {
      setLocalError('Phòng học chưa sẵn sàng. Vui lòng thử lại sau ít phút.')
      setPageState('access-denied')
      return undefined
    }

    const roomName = accessData.roomName
    let disposed = false
    let handleJoined: (() => void) | null = null
    let handleLeft: (() => void) | null = null

    const mountJitsi = async () => {
      try {
        await loadJitsiExternalApiScript(accessData.jitsiDomain)

        if (disposed || jitsiApiRef.current || !containerRef.current || !window.JitsiMeetExternalAPI) {
          return
        }

        const api = new window.JitsiMeetExternalAPI(accessData.jitsiDomain, {
          roomName,
          parentNode: containerRef.current,
          userInfo: {
            displayName: accessData.displayName,
            avatarURL: accessData.avatarUrl ?? undefined,
          },
          configOverwrite: {
            disableDeepLinking: true,
            startWithAudioMuted: false,
            startWithVideoMuted: false,
          },
          interfaceConfigOverwrite: {
            TOOLBAR_BUTTONS: ['microphone', 'camera', 'desktop', 'chat', 'hangup'],
          },
        })

        handleJoined = () => {
          hasJoinedRef.current = true
          if (joinedPostedRef.current) {
            return
          }

          joinedPostedRef.current = true
          setPageState('joining-room')
          joinMutation.mutate()
        }

        handleLeft = () => {
          void ensureLeave()
        }

        api.addListener('videoConferenceJoined', handleJoined)
        api.addListener('videoConferenceLeft', handleLeft)
        api.addListener('readyToClose', handleLeft)

        jitsiApiRef.current = api
        setPageState('joining-room')
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Không thể tải phòng học trực tuyến.'
        setLocalError(message)
        setPageState('access-denied')
      }
    }

    async function ensureLeave() {
      if (!hasJoinedRef.current || leavePostedRef.current) {
        return
      }

      leavePostedRef.current = true
      setPageState('leaving-room')
      await leaveMutation.mutateAsync()
    }

    void mountJitsi()

    const handleBeforeUnload = () => {
      void ensureLeave()
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      disposed = true
      window.removeEventListener('beforeunload', handleBeforeUnload)

      const api = jitsiApiRef.current
      if (api) {
        if (handleJoined) {
          api.removeListener('videoConferenceJoined', handleJoined)
        }

        if (handleLeft) {
          api.removeListener('videoConferenceLeft', handleLeft)
          api.removeListener('readyToClose', handleLeft)
        }

        api.dispose()
        jitsiApiRef.current = null
      }

      void ensureLeave()
    }
  }, [
    accessData?.avatarUrl,
    accessData?.canJoin,
    accessData?.displayName,
    accessData?.jitsiDomain,
    accessData?.roomName,
    shouldRenderRoom,
  ])

  useEffect(() => {
    if (!postCallSession || !statusQuery.data || statusQuery.data.status === postCallSession.status) {
      return
    }

    void sessionsApi.getById(sessionId).then((session) => {
      if (!unmountedRef.current) {
        setPostCallSession(session)
      }
    })
  }, [postCallSession, sessionId, statusQuery.data])

  useEffect(() => {
    return () => {
      unmountedRef.current = true
    }
  }, [])

  if (!authSession?.accessToken) {
    return <Navigate replace state={{ message: 'Vui lòng đăng nhập để tiếp tục.' }} to="/login" />
  }

  return (
    <MotionPage className="page dashboard-page profile-page session-hub-page session-room-page">
      <SiteHeader />

      <section className="dashboard-hero profile-hero session-room-hero">
        <div>
          <span className="eyebrow">
            <Video size={15} />
            Phòng học trực tuyến
          </span>
          <h1>Tham gia buổi học ngay trong EdSkill.</h1>
          <p>Hệ thống sẽ kiểm tra quyền truy cập trước khi mở phòng và chỉ ghi nhận khi bạn thực sự vào conference.</p>
        </div>
        <div className="profile-hero-actions">
          <Link className="button secondary" to={`/dashboard/skills/${sessionId}`}>
            Về chi tiết buổi học
          </Link>
          <button
            className="button secondary"
            onClick={() => {
              setLocalError(null)
              void accessQuery.refetch()
            }}
            type="button"
          >
            <RefreshCcw size={18} />
            Làm mới
          </button>
        </div>
      </section>

      {pageState === 'loading-access' || accessQuery.isLoading ? (
        <section className="profile-state-card">
          <LoaderCircle className="spin" size={24} />
          <div>
            <h2>Đang kiểm tra quyền vào phòng</h2>
            <p>EdSkill đang xác minh buổi học và cửa sổ tham gia phòng.</p>
          </div>
        </section>
      ) : null}

      {pageState === 'access-denied' ? (
        <SessionRoomDeniedState
          access={accessData}
          errorMessage={localError ?? deniedPresentation.message}
          title={deniedPresentation.title}
          onRetry={() => {
            setLocalError(null)
            void accessQuery.refetch()
          }}
        />
      ) : null}

      {pageState === 'waiting-for-host' ? (
        <SessionRoomWaitingState
          access={accessData}
          onRetry={() => {
            setLocalError(null)
            void accessQuery.refetch()
          }}
        />
      ) : null}

      {shouldRenderRoom && accessData?.canJoin ? (
        <section className="session-room-layout">
          <div className="session-room-stage">
            <div className="session-room-surface" ref={containerRef} />
          </div>
          <aside className="session-room-side">
            <section className="profile-section-card session-action-panel">
              <div className="session-action-head">
                <h3>{getRoomStateTitle(pageState)}</h3>
                <p>{getRoomStateMessage(pageState)}</p>
              </div>
              {pageState === 'joining-room' ? (
                <div className="session-room-inline-state">
                  <LoaderCircle className="spin" size={18} />
                  <span>Đang kết nối với phòng học...</span>
                </div>
              ) : null}
              {pageState === 'leaving-room' ? (
                <div className="session-room-inline-state">
                  <LoaderCircle className="spin" size={18} />
                  <span>Đang ghi nhận việc rời phòng...</span>
                </div>
              ) : null}
              {pageState === 'in-room' ? (
                <div className="session-note-banner info">
                  <strong>Bạn đang ở trong phòng học</strong>
                  <p>Khi rời phòng, EdSkill sẽ cập nhật trạng thái session theo phản hồi từ backend.</p>
                </div>
              ) : null}
            </section>
          </aside>
        </section>
      ) : null}

      {pageState === 'post-call' ? (
        <SessionPostCallPanel
          errorMessage={localError}
          isConfirming={confirmCompletionMutation.isPending}
          onConfirmCompletion={() => confirmCompletionMutation.mutate()}
          session={postCallSession}
        />
      ) : null}
    </MotionPage>
  )
}

function SessionRoomDeniedState({
  access,
  errorMessage,
  onRetry,
  title,
}: {
  access?: SessionRoomAccessDto
  errorMessage: string
  onRetry: () => void
  title: string
}) {
  return (
    <section className="session-room-denied-grid">
      <section className="profile-state-card error">
        <AlertCircle size={24} />
        <div>
          <h2>{title}</h2>
          <p>{errorMessage}</p>
        </div>
      </section>

      {access?.denyCode === 'SESSION_JOIN_WINDOW_CLOSED' ? (
        <SessionRoomCountdown joinCloseAt={access.joinCloseAt} joinOpenAt={access.joinOpenAt} scheduledAt={access.scheduledAt} />
      ) : null}

      <section className="profile-section-card session-action-panel">
        <div className="session-action-head">
          <h3>Tùy chọn tiếp theo</h3>
          <p>Bạn có thể quay lại buổi học hoặc thử kiểm tra lại quyền vào phòng.</p>
        </div>
        <div className="session-room-actions">
          <button className="button secondary" onClick={onRetry} type="button">
            <RefreshCcw size={18} />
            Kiểm tra lại
          </button>
          <Link className="button secondary" to={access ? `/dashboard/skills/${access.sessionId}` : '/dashboard/skills/learning'}>
            Về chi tiết buổi học
          </Link>
        </div>
      </section>
    </section>
  )
}

function SessionRoomWaitingState({
  access,
  onRetry,
}: {
  access?: SessionRoomAccessDto
  onRetry: () => void
}) {
  return (
    <section className="session-room-denied-grid">
      <section className="profile-state-card">
        <Clock3 size={24} />
        <div>
          <h2>Đợi Companion mở phòng</h2>
          <p>Companion chưa vào phòng học. Hệ thống sẽ mở phòng cho bạn ngay khi host sẵn sàng.</p>
        </div>
      </section>

      <section className="profile-section-card session-action-panel">
        <div className="session-action-head">
          <h3>Hệ thống đang kiểm tra quyền vào phòng</h3>
          <p>Buổi học sẽ mở ngay khi Companion vào phòng học.</p>
        </div>
        <div className="session-room-actions">
          <button className="button secondary" onClick={onRetry} type="button">
            <RefreshCcw size={18} />
            Làm mới
          </button>
          <Link className="button secondary" to={access ? `/dashboard/skills/${access.sessionId}` : '/dashboard/skills/learning'}>
            Về chi tiết buổi học
          </Link>
        </div>
      </section>
    </section>
  )
}

function SessionRoomCountdown({
  joinCloseAt,
  joinOpenAt,
  scheduledAt,
}: {
  joinCloseAt: string
  joinOpenAt: string
  scheduledAt: string
}) {
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(Date.now())
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [])

  const openAt = parseSessionDateTime(joinOpenAt)?.getTime() ?? Number.NaN
  const closeAt = parseSessionDateTime(joinCloseAt)?.getTime() ?? Number.NaN
  const msUntilOpen = openAt - now

  return (
    <section className="profile-section-card session-action-panel">
      <div className="session-action-head">
        <h3>{msUntilOpen > 0 ? 'Phòng học chưa mở' : 'Đã qua thời gian vào phòng'}</h3>
        <p>{msUntilOpen > 0 ? `Buổi học dự kiến bắt đầu lúc ${formatSessionDateTime(scheduledAt)}.` : 'Cửa sổ vào phòng đã kết thúc.'}</p>
      </div>
      <div className="session-room-countdown">
        <Clock3 size={18} />
        <strong>{msUntilOpen > 0 ? formatCountdown(msUntilOpen) : formatSessionDateTime(joinCloseAt)}</strong>
      </div>
      <p className="session-room-supporting-copy">
        {msUntilOpen > 0 ? 'Phòng học sẽ tự mở lại khi tới giờ tham gia.' : `Thời gian vào phòng đã đóng lúc ${formatSessionDateTime(new Date(closeAt).toISOString())}.`}
      </p>
    </section>
  )
}

function SessionPostCallPanel({
  errorMessage,
  isConfirming,
  onConfirmCompletion,
  session,
}: {
  errorMessage: string | null
  isConfirming: boolean
  onConfirmCompletion: () => void
  session: SessionDto | null
}) {
  const status = session?.status
  const canConfirm = Boolean(
    session &&
      status === 'PendingReview',
  )

  return (
    <section className="session-room-post-call">
      <section className="profile-section-card session-action-panel">
        <div className="session-action-head">
          <h3>Kết thúc buổi học</h3>
          <p>{getPostCallMessage(status)}</p>
        </div>

        {session ? (
          <div className="dashboard-review-task-tags session-room-post-call-meta">
            <span className={`session-status-chip status-${session.status.toLowerCase()}`}>
              {getSessionStatusLabel(session.status)}
            </span>
            <span>{formatSessionDateTime(session.scheduledAt)}</span>
          </div>
        ) : null}

        {errorMessage ? (
          <div className="session-note-banner danger">
            <strong>Không thể cập nhật trạng thái đầy đủ</strong>
            <p>{errorMessage}</p>
          </div>
        ) : null}

        <div className="session-room-actions">
          {canConfirm ? (
            <button className="button primary" disabled={isConfirming} onClick={onConfirmCompletion} type="button">
              {isConfirming ? <LoaderCircle className="spin" size={18} /> : null}
              Xác nhận hoàn thành
            </button>
          ) : null}
          {session ? (
            <Link className="button secondary" to={`/dashboard/skills/${session.sessionId}`}>
              Về chi tiết buổi học
            </Link>
          ) : (
            <Link className="button secondary" to="/dashboard/skills/learning">
              Về danh sách buổi học
            </Link>
          )}
        </div>
      </section>
    </section>
  )
}

function buildDeniedPresentation(accessData: SessionRoomAccessDto | undefined, error: unknown) {
  if (accessData?.denyCode === 'SESSION_HOST_NOT_READY') {
    return {
      title: 'Đợi Companion mở phòng',
      message: accessData.denyMessage ?? 'Companion chưa vào phòng học. Hệ thống sẽ mở phòng cho bạn ngay khi host sẵn sàng.',
    }
  }

  if (accessData?.denyCode === 'SESSION_JOIN_WINDOW_CLOSED') {
    const now = Date.now()
    const openAt = parseSessionDateTime(accessData.joinOpenAt)?.getTime() ?? Number.NaN
    const closeAt = parseSessionDateTime(accessData.joinCloseAt)?.getTime() ?? Number.NaN

    if (Number.isFinite(openAt) && now < openAt) {
      return {
        title: 'Phòng học chưa mở',
        message: accessData.denyMessage ?? 'Bạn chưa thể vào phòng học ở thời điểm này.',
      }
    }

    if (Number.isFinite(closeAt) && now > closeAt) {
      return {
        title: 'Đã qua thời gian vào phòng',
        message: accessData.denyMessage ?? 'Cửa sổ tham gia phòng học đã kết thúc.',
      }
    }
  }

  if (accessData?.denyCode === 'SESSION_ROOM_NOT_READY' || accessData?.denyCode === 'SESSION_INVALID_STATUS') {
    return {
      title: 'Buổi học chưa sẵn sàng',
      message: accessData.denyMessage ?? 'Buổi học chưa sẵn sàng để vào phòng. Vui lòng thử lại sau.',
    }
  }

  if (isApiError(error) && error.code === 'SESSION_NOT_ONLINE') {
    return {
      title: 'Session không hỗ trợ học online',
      message: 'Buổi học này không có phòng trực tuyến để tham gia.',
    }
  }

  if (isApiError(error) && error.code === 'SESSION_NOT_FOUND') {
    return {
      title: 'Không tìm thấy buổi học',
      message: 'Buổi học này không còn tồn tại hoặc bạn không còn quyền truy cập.',
    }
  }

  return {
    title: 'Không thể vào phòng học',
    message: accessData?.denyMessage ?? (error ? getErrorMessage(error) : 'Hiện chưa thể mở phòng học.'),
  }
}

function resolveAccessPageState(accessData?: SessionRoomAccessDto): Extract<
  SessionRoomPageState,
  'waiting-for-host' | 'access-denied' | 'ready-to-mount'
> {
  if (accessData?.canJoin) {
    return 'ready-to-mount'
  }

  if (accessData?.role === 'learner' && accessData.denyCode === 'SESSION_HOST_NOT_READY') {
    return 'waiting-for-host'
  }

  return 'access-denied'
}

function formatCountdown(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours} giờ ${minutes} phút ${seconds} giây`
  }

  if (minutes > 0) {
    return `${minutes} phút ${seconds} giây`
  }

  return `${seconds} giây`
}

function getRoomStateTitle(state: SessionRoomPageState) {
  if (state === 'joining-room') {
    return 'Đang vào phòng học'
  }

  if (state === 'leaving-room') {
    return 'Đang rời phòng học'
  }

  return 'Phòng học đang hoạt động'
}

function getRoomStateMessage(state: SessionRoomPageState) {
  if (state === 'joining-room') {
    return 'EdSkill sẽ chỉ ghi nhận tham gia khi conference đã kết nối thành công.'
  }

  if (state === 'leaving-room') {
    return 'Vui lòng chờ trong giây lát để hệ thống đồng bộ trạng thái buổi học.'
  }

  return 'Bạn có thể học trực tiếp trong cửa sổ này. Khi rời phòng, trạng thái buổi học sẽ được cập nhật tự động.'
}

function getPostCallMessage(status: SessionDto['status'] | null | undefined) {
  if (status === 'PendingReview') {
    return 'Buổi học đã kết thúc. Bạn có thể xác nhận hoàn thành ngay bây giờ.'
  }

  if (status === 'Disputed') {
    return 'Session chưa đạt điều kiện hoàn tất tự động. Vui lòng chờ hướng xử lý tiếp theo.'
  }

  if (status === 'InProgress') {
    return 'Bạn đã rời phòng. Hệ thống đang chờ participant còn lại kết thúc phiên học.'
  }

  if (status === 'Completed') {
    return 'Buổi học đã được hoàn tất.'
  }

  return 'EdSkill đang cập nhật trạng thái mới nhất của buổi học.'
}
