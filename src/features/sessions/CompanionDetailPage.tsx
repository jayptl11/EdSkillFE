import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  AlertCircle,
  Award,
  CalendarDays,
  LoaderCircle,
  Star,
  UserRound,
  Video,
} from 'lucide-react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { getErrorMessage } from '../../api/client'
import { SiteHeader } from '../../components/Brand'
import { MotionPage } from '../../components/MotionPage'
import { formatSessionDateTime } from '../sessions/sessionUtils'
import { companionApi, companionKeys } from '../sessions/companionApi'
import type { CredentialCountGroup } from '../sessions/companionApi'

export function CompanionDetailPage() {
  const { companionId = '' } = useParams()
  const [searchParams] = useSearchParams()
  const [reviewPage, setReviewPage] = useState(1)

  // Đọc skill + 3 filter params từ URL (được truyền từ search page)
  const skillId = searchParams.get('skillId') ?? ''
  const minimumDurationMinutes = searchParams.get('minimumDurationMinutes')
    ? (Number(searchParams.get('minimumDurationMinutes')) as 30 | 45 | 60 | 90 | 120)
    : undefined
  const maxLearnerChargePoints = searchParams.get('maxLearnerChargePoints')
    ? Number(searchParams.get('maxLearnerChargePoints'))
    : undefined
  const credentialCountGroup = (searchParams.get('credentialCountGroup') as CredentialCountGroup | null) ?? undefined

  const detailQuery = useQuery({
    queryKey: companionKeys.detail(companionId, {
      skillId,
      minimumDurationMinutes,
      maxLearnerChargePoints,
      credentialCountGroup,
      reviewPage,
      reviewLimit: 10,
    }),
    queryFn: () =>
      companionApi.getDetail(companionId, {
        skillId,
        minimumDurationMinutes,
        maxLearnerChargePoints,
        credentialCountGroup,
        reviewPage,
        reviewLimit: 10,
      }),
    enabled: Boolean(companionId) && Boolean(skillId),
  })

  const companion = detailQuery.data

  if (!skillId) {
    return (
      <MotionPage className="page dashboard-page profile-page session-hub-page">
        <SiteHeader />
        <section className="profile-state-card error">
          <AlertCircle size={22} />
          <p>Thiếu thông tin kỹ năng. Vui lòng quay lại trang tìm kiếm.</p>
        </section>
      </MotionPage>
    )
  }

  return (
    <MotionPage className="page dashboard-page profile-page session-hub-page">
      <SiteHeader />

      {/* ── Page header ── */}
      <section className="dashboard-hero profile-hero">
        <div>
          <span className="eyebrow">
            <UserRound size={15} />
            Hồ sơ người dạy
          </span>
          <h1>Xem chi tiết hồ sơ và lịch học còn trống.</h1>
        </div>
        <div className="profile-hero-actions">
          <Link className="button secondary" to="/dashboard/companions">
            Quay lại tìm kiếm
          </Link>
        </div>
      </section>

      {/* ── Loading ── */}
      {detailQuery.isLoading ? (
        <section className="profile-state-card">
          <LoaderCircle className="spin" size={24} />
          <p>Đang tải hồ sơ...</p>
        </section>
      ) : null}

      {/* ── Error ── */}
      {detailQuery.isError ? (
        <section className="profile-state-card error">
          <AlertCircle size={22} />
          <p>{getErrorMessage(detailQuery.error)}</p>
        </section>
      ) : null}

      {/* ── Content ── */}
      {companion ? (
        <section className="session-detail-layout">
          <article className="profile-form-card session-detail-card">

            {/* ── Profile header ── */}
            <div className="session-teacher-row" style={{ marginBottom: '1.5rem' }}>
              {companion.avatarUrl ? (
                <img
                  alt={companion.displayName}
                  className="session-teacher-avatar"
                  src={companion.avatarUrl}
                  style={{ width: 64, height: 64 }}
                />
              ) : (
                <div className="session-teacher-avatar placeholder" style={{ width: 64, height: 64 }}>
                  <UserRound size={28} />
                </div>
              )}
              <div>
                <h2 style={{ margin: 0 }}>{companion.displayName}</h2>
                <p style={{ margin: '0.25rem 0 0', color: 'var(--color-text-secondary)' }}>
                  {companion.bio || 'Hồ sơ đang được cập nhật'}
                </p>

                {/* Credential badge */}
                {companion.credentialCount > 0 ? (
                  <div className="companion-credential-badge" style={{ marginTop: '0.5rem' }}>
                    <Award size={14} />
                    <span>{companion.credentialCount} chứng chỉ đã xác minh</span>
                  </div>
                ) : null}
              </div>
            </div>

            {/* ── Stats ── */}
            <dl className="session-detail-grid">
              <div>
                <dt>Đánh giá</dt>
                <dd>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Star size={14} style={{ color: 'var(--color-warning, #f59e0b)' }} />
                    {companion.avgRating.toFixed(1)} ({companion.totalReviews} đánh giá)
                  </span>
                </dd>
              </div>
              <div>
                <dt>Tổng buổi đã dạy</dt>
                <dd>{companion.totalSessions} buổi</dd>
              </div>
            </dl>

            {/* ── Kỹ năng ── */}
            {companion.skillsToTeach.length > 0 ? (
              <div style={{ marginTop: '1rem' }}>
                <p style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                  Kỹ năng có thể dạy
                </p>
                <div className="session-skill-strip">
                  {companion.skillsToTeach.map((s) => (
                    <span key={s}>{s}</span>
                  ))}
                </div>
              </div>
            ) : null}

            {/* ── Lịch học ── */}
            {companion.sessions.length > 0 ? (
              <div style={{ marginTop: '2rem' }}>
                <h3>Lịch học đang mở</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                  Chỉ hiển thị lịch khớp với kỹ năng và điều kiện bạn đang tìm.
                </p>
                <div className="session-card-grid" style={{ marginTop: '1rem' }}>
                  {companion.sessions.map((s) => {
                    const isFormula = s.pricingModel === 'FormulaV1'
                    const hasDurationPricing = isFormula && s.durationPricingOptions.length > 0

                    // Giá hiển thị: lấy từ durationPricingOptions nếu formula, fallback pointCost
                    const priceLabel = hasDurationPricing
                      ? (() => {
                          const points = s.durationPricingOptions.map((o) => o.learnerChargePoints)
                          const min = Math.min(...points)
                          const max = Math.max(...points)
                          return min === max ? `${min} điểm` : `${min} – ${max} điểm`
                        })()
                      : `${s.pointCost} điểm`

                    return (
                      <article className="session-card" key={s.sessionId}>
                        <div className="session-card-top">
                          {/* Chỉ online — không render offline badge */}
                          <span className="session-delivery-badge online">
                            <Video size={12} />
                            Online
                          </span>
                          <span className="session-cost-chip">{priceLabel}</span>
                        </div>

                        <p>{s.description || 'Người dạy chưa thêm mô tả.'}</p>

                        <dl className="session-card-meta">
                          {/* Thời gian */}
                          <div>
                            <dt>Thời gian</dt>
                            <dd>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <CalendarDays size={13} />
                                {formatSessionDateTime(s.scheduledAt)}
                              </span>
                            </dd>
                          </div>

                          {/* Thời lượng — dùng durationPricingOptions nếu formula */}
                          <div>
                            <dt>Thời lượng</dt>
                            <dd>
                              {hasDurationPricing ? (
                                <div className="session-duration-pricing-list">
                                  {s.durationPricingOptions.map((opt) => (
                                    <span className="session-duration-price-chip" key={opt.durationMinutes}>
                                      <span className="duration-label">{opt.durationMinutes} ph</span>
                                      <span className="duration-price">{opt.learnerChargePoints} đ</span>
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                `${s.durationMinutes} phút`
                              )}
                            </dd>
                          </div>
                        </dl>

                        <div className="session-card-actions">
                          <Link className="button primary" to={`/dashboard/skills/${s.sessionId}`}>
                            Đặt buổi học
                          </Link>
                        </div>
                      </article>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div style={{ marginTop: '2rem' }}>
                <h3>Lịch học đang mở</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                  Người dạy này chưa có lịch trống khớp với tiêu chí bạn đang tìm.
                </p>
              </div>
            )}

            {/* ── Đánh giá ── */}
            <div style={{ marginTop: '2rem' }}>
              <h3>Nhận xét từ người học</h3>
              {companion.reviews.data.length === 0 ? (
                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                  Chưa có đánh giá nào.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.75rem' }}>
                  {companion.reviews.data.map((review) => (
                    <div className="session-note-banner info" key={review.reviewId}>
                      <div style={{ width: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                          <strong>{review.reviewerDisplayName}</strong>
                          <span style={{ display: 'flex', gap: '2px' }}>
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                fill={i < review.rating ? 'currentColor' : 'none'}
                                key={i}
                                size={14}
                                style={{ color: 'var(--color-warning, #f59e0b)' }}
                              />
                            ))}
                          </span>
                        </div>
                        {review.comment ? (
                          <p style={{ margin: 0, fontSize: '0.875rem' }}>{review.comment}</p>
                        ) : null}
                        <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                          {new Date(review.createdAt).toLocaleDateString('vi-VN')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {companion.reviews.total > 10 ? (
                <div className="session-pagination" style={{ marginTop: '1rem' }}>
                  <button
                    className="button secondary"
                    disabled={reviewPage <= 1}
                    onClick={() => setReviewPage((p) => p - 1)}
                    type="button"
                  >
                    Trang trước
                  </button>
                  <span>
                    Trang {reviewPage} / {Math.ceil(companion.reviews.total / 10)}
                  </span>
                  <button
                    className="button secondary"
                    disabled={reviewPage >= Math.ceil(companion.reviews.total / 10)}
                    onClick={() => setReviewPage((p) => p + 1)}
                    type="button"
                  >
                    Trang sau
                  </button>
                </div>
              ) : null}
            </div>

          </article>
        </section>
      ) : null}
    </MotionPage>
  )
}
