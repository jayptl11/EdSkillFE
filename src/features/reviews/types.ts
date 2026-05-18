export interface ReviewDto {
  reviewId: string
  sessionId: string
  reviewerId: string
  revieweeId: string
  rating: number
  comment: string | null
  createdAt: string
}

export interface ReviewRatingBreakdownDto {
  rating: number
  count: number
}

export interface ReceivedReviewDto {
  reviewId: string
  sessionId: string
  rating: number
  comment: string | null
  reviewerDisplayName: string
  reviewerAvatarUrl: string | null
  createdAt: string
}

export interface ReviewReceivedSummaryDto {
  avgRating: number
  totalReviews: number
  ratingBreakdown: ReviewRatingBreakdownDto[]
  recentReviews: ReceivedReviewDto[]
}

export type ReviewStatus = 'can_review' | 'already_reviewed' | 'window_closed'

export interface ReviewTaskDto {
  sessionId: string
  revieweeId: string
  revieweeDisplayName: string
  revieweeAvatarUrl: string | null
  skillName: string
  pricePoints: number
  description: string | null
  reviewStatus: ReviewStatus
  existingReview: ReviewDto | null
  completedAt: string
  reviewWindowClosesAt: string
}

export interface ReviewDashboardDto {
  receivedSummary: ReviewReceivedSummaryDto
  reviewTasks: ReviewTaskDto[]
}

export interface CreateReviewRequest {
  sessionId: string
  rating: 1 | 2 | 3 | 4 | 5
  comment?: string | null
}

