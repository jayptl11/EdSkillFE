import type { QueryKey } from '@tanstack/react-query'
import { queryClient } from './queryClient'
import {
  cacheScope,
  getAuthQueryUserId,
  isAuthQueryKey,
  QUERY_CACHE_BUSTER,
  QUERY_CACHE_STORAGE_KEY,
} from './cacheScope'

interface PersistedQueryRecord {
  queryKey?: QueryKey
}

interface PersistedClientState {
  mutations?: unknown[]
  queries?: PersistedQueryRecord[]
}

interface PersistedClientSnapshot {
  buster?: string
  clientState?: PersistedClientState
  timestamp?: number
}

export async function clearUserQueryCache(userId: string) {
  const queryKey = cacheScope.user(userId)

  updatePersistedQueries((currentQueryKey) => !isAuthQueryKey(currentQueryKey) || getAuthQueryUserId(currentQueryKey) !== userId)
  await queryClient.cancelQueries({ queryKey })
  queryClient.removeQueries({ queryKey })
}

export async function pruneForeignAuthCaches(currentUserId: string | null) {
  const shouldRemove = (queryKey: QueryKey) =>
    isAuthQueryKey(queryKey) && (!currentUserId || getAuthQueryUserId(queryKey) !== currentUserId)

  updatePersistedQueries((queryKey) =>
    !isAuthQueryKey(queryKey) || (currentUserId !== null && getAuthQueryUserId(queryKey) === currentUserId),
  )
  await queryClient.cancelQueries({ predicate: (query) => shouldRemove(query.queryKey) })
  queryClient.removeQueries({ predicate: (query) => shouldRemove(query.queryKey) })
}

function updatePersistedQueries(shouldKeep: (queryKey: QueryKey) => boolean) {
  if (typeof window === 'undefined') {
    return
  }

  const rawSnapshot = window.localStorage.getItem(QUERY_CACHE_STORAGE_KEY)
  if (!rawSnapshot) {
    return
  }

  let snapshot: PersistedClientSnapshot

  try {
    snapshot = JSON.parse(rawSnapshot) as PersistedClientSnapshot
  } catch {
    window.localStorage.removeItem(QUERY_CACHE_STORAGE_KEY)
    return
  }

  if (snapshot.buster && snapshot.buster !== QUERY_CACHE_BUSTER) {
    window.localStorage.removeItem(QUERY_CACHE_STORAGE_KEY)
    return
  }

  const queries = snapshot.clientState?.queries ?? []
  const filteredQueries = queries.filter((query) => Array.isArray(query.queryKey) && shouldKeep(query.queryKey))

  if (filteredQueries.length === queries.length) {
    return
  }

  const nextSnapshot: PersistedClientSnapshot = {
    ...snapshot,
    clientState: {
      mutations: snapshot.clientState?.mutations ?? [],
      queries: filteredQueries,
    },
  }

  window.localStorage.setItem(QUERY_CACHE_STORAGE_KEY, JSON.stringify(nextSnapshot))
}
