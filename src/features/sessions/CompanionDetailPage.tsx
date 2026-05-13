import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  AlertCircle,
  CalendarDays,
  LoaderCircle,
  MapPin,
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
import type { SessionDeliveryMode } from '../sessions/types'

export function CompanionDetailPage() {
  const { companionId = '' } = useParams()
  const [searchParams] = useSearchParams()
  const [reviewPage, setReviewPage] = useState(1)

  const skillId = searchParams.get('skillId') ?? ''
  const deliveryMode = (searchParams.get('deliveryMode') ?? '') as SessionDeliveryMode | ''
  const location = searchParams.get('location') ?? ''

  const detailQuery = useQuery({
    queryKey: companionKeys.detail(companionId, {
      skillId,
      deliveryMode: deliveryMode || undefined,
      location: location || undefined,
      reviewPage,
      reviewLimit: 10,
    }),
    queryFn: () =>
      companionApi.getDetail(companionId, {
        skillId,
        deliveryMode: deliveryMode || undefined,
        location: location || undefined,
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

      {detailQuery.isLoading ? (
        <section className="profile-state-card">
          <LoaderCircle className="spin" size={24} />
          <p>Đang tải hồ sơ...</p>
        </section>
      ) : null}

      {detailQuery.isError ? (
        <section className="profile-state-card error">
          <AlertCircle size={22} />
          <p>{getErrorMessage(detailQuery.error)}</p>
        </section>
      ) : null}

      {companion ? (
        <section className="session-detail-layout">
          {/* ── Header ── */}
          <article className="profile-form-card session-detail-card">
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
              </div>
            </div>

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

            {/* ── Lịch học phù hợp ── */}
            {companion.sessions.length > 0 ? (
              <div style={{ marginTop: '2rem' }}>
                <h3>Lịch học đang mở</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                  Chỉ hiển thị lịch khớp với kỹ năng và hình thức bạn đang tìm.
                </p>
                <div className="session-card-grid" style={{ marginTop: '1rem' }}>
                  {companion.sessions.map((s) => {
                    const isOnline = s.deliveryMode === 'Online'
                    const isFormula = s.pricingModel === 'FormulaV1'
                    const preview = s.pricingPreview
                    const priceLabel = isFormula && preview
                      ? preview.minLearnerChargePoints === preview.maxLearnerChargePoints
                        ? `${preview.minLearnerChargePoints} điểm`
                        : `${preview.minLearnerChargePoints} – ${preview.maxLearnerChargePoints} điểm`
                      : `${s.pointCost} điểm`
                    return (
                      <article className="session-card" key={s.sessionId}>
                        <div className="session-card-top">
                          <span className={`session-delivery-badge ${isOnline ? 'online' : 'offline'}`}>
                            {isOnline ? <Video size={12} /> : <MapPin size={12} />}
                            {isOnline ? 'Online' : 'Trực tiếp'}
                          </span>
                          <span className="session-cost-chip">{priceLabel}</span>
                        </div>
                        <p>{s.description || 'Người dạy chưa thêm mô tả.'}</p>
                        {!isOnline && s.location ? (
                          <div className="session-location-row">
                            <MapPin size={13} />
                            <span>{s.location}</span>
                          </div>
                        ) : null}
                        <dl className="session-card-meta">
                          <div>
                            <dt>Thời gian</dt>
                            <dd>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <CalendarDays size={13} />
                                {formatSessionDateTime(s.scheduledAt)}
                              </span>
                            </dd>
                          </div>
                          <div>
                            <dt>Thời lượng</dt>
                            <dd>
                              {isFormula && s.durationOptions.length > 0 ? (
                                <span style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                  {s.durationOptions.map((d) => (
                                    <span className="session-duration-chip" key={d}>{d} ph</span>
                                  ))}
                                </span>
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
