import { apiGet, apiPost } from '../../api/client'
import { cacheScope } from '../../api/cacheScope'
import type { CreateReviewRequest, ReviewDashboardDto, ReviewDto } from './types'

export const reviewDashboardKeys = {
  root: () => cacheScope.user(undefined, 'reviews', 'me'),
  me: () => cacheScope.user(undefined, 'reviews', 'me', 'dashboard'),
}

export const reviewDashboardApi = {
  getMyDashboard: () => apiGet<ReviewDashboardDto>('/api/reviews/me/dashboard', { auth: true }),
  createReview: (payload: CreateReviewRequest) =>
    apiPost<ReviewDto>('/api/reviews', payload, { auth: true }),
}
