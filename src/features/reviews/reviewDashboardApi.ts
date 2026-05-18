import { apiGet, apiPost } from '../../api/client'
import type { CreateReviewRequest, ReviewDashboardDto, ReviewDto } from './types'

export const reviewDashboardKeys = {
  me: () => ['reviews', 'me', 'dashboard'] as const,
}

export const reviewDashboardApi = {
  getMyDashboard: () => apiGet<ReviewDashboardDto>('/api/reviews/me/dashboard', { auth: true }),
  createReview: (payload: CreateReviewRequest) =>
    apiPost<ReviewDto>('/api/reviews', payload, { auth: true }),
}

