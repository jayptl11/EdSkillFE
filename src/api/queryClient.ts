import { QueryClient } from '@tanstack/react-query'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import {
  QUERY_CACHE_BUSTER,
  QUERY_CACHE_MAX_AGE,
  QUERY_CACHE_STORAGE_KEY,
} from './cacheScope'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: QUERY_CACHE_MAX_AGE,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

export const queryPersister = createSyncStoragePersister({
  key: QUERY_CACHE_STORAGE_KEY,
  storage: window.localStorage,
})

export const queryPersistOptions = {
  buster: QUERY_CACHE_BUSTER,
  maxAge: QUERY_CACHE_MAX_AGE,
  persister: queryPersister,
}
