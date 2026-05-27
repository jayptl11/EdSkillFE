/* eslint-disable react-refresh/only-export-components, react-hooks/set-state-in-effect */
import { HubConnectionBuilder, HubConnectionState, LogLevel, type HubConnection } from '@microsoft/signalr'
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { API_BASE_URL } from '../../api/client'
import { useAppStore } from '../../store/useAppStore'
import type { MySpaceDto } from '../my-space/types'
import { mySpaceKeys } from '../my-space/mySpaceApi'
import { sessionKeys } from './sessionsApi'
import { patchMySpaceRoomStateData, patchMySpaceSessionData, patchSessionRoomAccessData } from './sessionRealtimeCache'
import type { SessionDto, SessionRoomAccessDto, SessionRoomStateDto } from './types'

export const SESSION_UPDATED_EVENT = 'session.updated'
export const SESSION_ROOM_STATE_UPDATED_EVENT = 'session.room-state.updated'

type RealtimeConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting'

interface SessionRealtimeListener {
  onReconnect?: () => void
  onRoomStateUpdated?: (payload: SessionRoomStateDto) => void
  onSessionUpdated?: (payload: SessionDto) => void
}

interface SessionRealtimeContextValue {
  addListener: (listener: SessionRealtimeListener) => () => void
  connectionState: RealtimeConnectionState
  releaseSessionSubscription: (sessionId: string) => Promise<void>
  retainSessionSubscription: (sessionId: string) => Promise<void>
}

interface SessionRealtimeEffectOptions extends SessionRealtimeListener {
  enabled?: boolean
  onSubscribeError?: (error: unknown) => void
  sessionId?: string | null
}

const SessionRealtimeContext = createContext<SessionRealtimeContextValue | null>(null)

function buildSessionHubUrl() {
  return `${API_BASE_URL}/hubs/sessions`
}

export function SessionRealtimeProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const authSession = useAppStore((state) => state.session)
  const connectionRef = useRef<HubConnection | null>(null)
  const listenersRef = useRef(new Map<number, SessionRealtimeListener>())
  const nextListenerIdRef = useRef(0)
  const subscriptionCountsRef = useRef(new Map<string, number>())
  const [connectionState, setConnectionState] = useState<RealtimeConnectionState>('disconnected')

  const addListener = (listener: SessionRealtimeListener) => {
    const id = nextListenerIdRef.current++
    listenersRef.current.set(id, listener)

    return () => {
      listenersRef.current.delete(id)
    }
  }

  const notifySessionUpdated = (payload: SessionDto) => {
    listenersRef.current.forEach((listener) => {
      listener.onSessionUpdated?.(payload)
    })
  }

  const notifyRoomStateUpdated = (payload: SessionRoomStateDto) => {
    listenersRef.current.forEach((listener) => {
      listener.onRoomStateUpdated?.(payload)
    })
  }

  const notifyReconnected = () => {
    listenersRef.current.forEach((listener) => {
      listener.onReconnect?.()
    })
  }

  const retainSessionSubscription = async (sessionId: string) => {
    const nextCount = (subscriptionCountsRef.current.get(sessionId) ?? 0) + 1
    subscriptionCountsRef.current.set(sessionId, nextCount)

    if (nextCount !== 1 || connectionRef.current?.state !== HubConnectionState.Connected) {
      return
    }

    await connectionRef.current.invoke('SubscribeSession', sessionId)
  }

  const releaseSessionSubscription = async (sessionId: string) => {
    const currentCount = subscriptionCountsRef.current.get(sessionId)
    if (!currentCount) {
      return
    }

    if (currentCount > 1) {
      subscriptionCountsRef.current.set(sessionId, currentCount - 1)
      return
    }

    subscriptionCountsRef.current.delete(sessionId)

    if (connectionRef.current?.state !== HubConnectionState.Connected) {
      return
    }

    await connectionRef.current.invoke('UnsubscribeSession', sessionId)
  }

  useEffect(() => {
    if (!authSession?.accessToken) {
      subscriptionCountsRef.current.clear()

      if (connectionRef.current) {
        const connection = connectionRef.current
        connectionRef.current = null
        void connection.stop()
      }

      return undefined
    }

    const connection = new HubConnectionBuilder()
      .withUrl(buildSessionHubUrl(), {
        accessTokenFactory: () => useAppStore.getState().session?.accessToken ?? '',
      })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build()

    connectionRef.current = connection
    setConnectionState('connecting')

    connection.on(SESSION_UPDATED_EVENT, (payload: SessionDto) => {
      queryClient.setQueryData(sessionKeys.detail(payload.sessionId), payload)

      let foundInMySpace = false
      const hasMySpaceCache = Boolean(queryClient.getQueryState(mySpaceKeys.me()))

      queryClient.setQueryData(mySpaceKeys.me(), (current: unknown) => {
        const result = patchMySpaceSessionData(current as MySpaceDto | undefined, payload)
        foundInMySpace = result.found
        return result.nextData
      })

      if (hasMySpaceCache && !foundInMySpace) {
        void queryClient.invalidateQueries({ queryKey: mySpaceKeys.me() })
      }

      notifySessionUpdated(payload)
    })

    connection.on(SESSION_ROOM_STATE_UPDATED_EVENT, (payload: SessionRoomStateDto) => {
      queryClient.setQueryData(sessionKeys.roomAccess(payload.sessionId), (current: unknown) => {
        return patchSessionRoomAccessData(current as SessionRoomAccessDto | undefined, payload)
      })

      queryClient.setQueryData(mySpaceKeys.me(), (current: unknown) => {
        return patchMySpaceRoomStateData(current as MySpaceDto | undefined, payload)
      })

      notifyRoomStateUpdated(payload)
    })

    connection.onreconnecting(() => {
      setConnectionState('reconnecting')
    })

    connection.onreconnected(async () => {
      setConnectionState('connected')

      const sessionIds = [...subscriptionCountsRef.current.keys()]
      await Promise.allSettled(sessionIds.map((sessionId) => connection.invoke('SubscribeSession', sessionId)))

      notifyReconnected()
    })

    connection.onclose(() => {
      if (connectionRef.current === connection) {
        setConnectionState('disconnected')
      }
    })

    let disposed = false

    void connection.start()
      .then(() => {
        if (!disposed && connectionRef.current === connection) {
          const sessionIds = [...subscriptionCountsRef.current.keys()]
          void Promise.allSettled(sessionIds.map((sessionId) => connection.invoke('SubscribeSession', sessionId)))
          setConnectionState('connected')
        }
      })
      .catch(() => {
        if (!disposed && connectionRef.current === connection) {
          setConnectionState('disconnected')
        }
      })

    return () => {
      disposed = true

      if (connectionRef.current === connection) {
        connectionRef.current = null
      }

      setConnectionState('disconnected')
      void connection.stop()
    }
  }, [authSession?.accessToken, queryClient])

  const value = useMemo<SessionRealtimeContextValue>(() => ({
    addListener,
    connectionState,
    releaseSessionSubscription,
    retainSessionSubscription,
  }), [connectionState])

  return (
    <SessionRealtimeContext.Provider value={value}>
      {children}
    </SessionRealtimeContext.Provider>
  )
}

export function useSessionRealtime() {
  const context = useContext(SessionRealtimeContext)

  if (!context) {
    throw new Error('useSessionRealtime must be used within SessionRealtimeProvider.')
  }

  return context
}

export function useSessionRealtimeEffect({
  enabled = true,
  onReconnect,
  onRoomStateUpdated,
  onSessionUpdated,
  onSubscribeError,
  sessionId,
}: SessionRealtimeEffectOptions) {
  const realtime = useSessionRealtime()
  const callbacksRef = useRef<SessionRealtimeEffectOptions>({
    enabled,
    onReconnect,
    onRoomStateUpdated,
    onSessionUpdated,
    onSubscribeError,
    sessionId,
  })

  useEffect(() => {
    callbacksRef.current = {
      enabled,
      onReconnect,
      onRoomStateUpdated,
      onSessionUpdated,
      onSubscribeError,
      sessionId,
    }
  }, [enabled, onReconnect, onRoomStateUpdated, onSessionUpdated, onSubscribeError, sessionId])

  useEffect(() => {
    if (!enabled) {
      return undefined
    }

    return realtime.addListener({
      onReconnect: () => callbacksRef.current.onReconnect?.(),
      onRoomStateUpdated: (payload) => callbacksRef.current.onRoomStateUpdated?.(payload),
      onSessionUpdated: (payload) => callbacksRef.current.onSessionUpdated?.(payload),
    })
  }, [enabled, realtime])

  useEffect(() => {
    if (!enabled || !sessionId) {
      return undefined
    }

    let released = false

    void realtime.retainSessionSubscription(sessionId).catch((error) => {
      if (!released) {
        callbacksRef.current.onSubscribeError?.(error)
      }
    })

    return () => {
      released = true
      void realtime.releaseSessionSubscription(sessionId)
    }
  }, [enabled, realtime, sessionId])

  return {
    connectionState: realtime.connectionState,
  }
}
