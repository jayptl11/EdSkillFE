import { apiPost } from '../../api/client'
import { cacheScope } from '../../api/cacheScope'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CreateReviewRequest {
  sessionId: string
  rating: 1 | 2 | 3 | 4 | 5
  comment?: string | null
}

export interface ReviewDto {
  reviewId: string
  sessionId: string
  reviewerId: string
  revieweeId: string
  rating: number
  comment: string | null
  createdAt: string
}

// ─── Query Keys ─────────────────────────────────────────────────────────────

export const reviewKeys = {
  session: (sessionId: string) => cacheScope.user(undefined, 'reviews', 'session', sessionId),
}

// ─── API ────────────────────────────────────────────────────────────────────

export const reviewApi = {
  create: (payload: CreateReviewRequest) => apiPost<ReviewDto>('/api/reviews', payload, { auth: true }),
}
