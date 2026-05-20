import type { QueryKey } from '@tanstack/react-query'
import { useAppStore } from '../store/useAppStore'

export const QUERY_CACHE_STORAGE_KEY = 'edskill-react-query-cache'
export const QUERY_CACHE_BUSTER = 'edskill-react-query-v2'
export const QUERY_CACHE_MAX_AGE = 1000 * 60 * 60 * 24

const PUBLIC_SCOPE = 'public'
const AUTH_SCOPE = 'auth'
const GUEST_SCOPE = 'guest'

export function getCacheUserId(userId?: string | null) {
  return userId ?? useAppStore.getState().session?.userId ?? GUEST_SCOPE
}

export const cacheScope = {
  public: (...parts: ReadonlyArray<unknown>) => [PUBLIC_SCOPE, ...parts] as const,
  user: (userId: string | null | undefined, ...parts: ReadonlyArray<unknown>) =>
    [AUTH_SCOPE, getCacheUserId(userId), ...parts] as const,
}

export function isAuthQueryKey(queryKey: QueryKey) {
  return Array.isArray(queryKey) && queryKey[0] === AUTH_SCOPE
}

export function getAuthQueryUserId(queryKey: QueryKey) {
  if (!isAuthQueryKey(queryKey) || typeof queryKey[1] !== 'string') {
    return null
  }

  return queryKey[1]
}
