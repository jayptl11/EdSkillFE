import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  Award,
  BookOpen,
  CalendarDays,
  LoaderCircle,
  MapPin,
  Star,
  UserRound,
  Video,
  X,
} from 'lucide-react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { getErrorMessage, isApiError } from '../../api/client'
import { SiteHeader } from '../../components/Brand'
import { MotionPage } from '../../components/MotionPage'
import { showToast } from '../../components/toastEvents'
import { AchievementSection } from '../achievements/AchievementSection'
import { getSkillIcon } from '../skills/skillIcons'
import { companionApi, companionKeys } from './companionApi'
import { sessionsApi } from './sessionsApi'
import { formatSessionDateTime, invalidateSessionQueries, invalidateWalletQueries } from './sessionUtils'
import type { AllowedDurationMinutes, DurationPricingOptionDto, SessionDto } from './types'

const REVIEW_LIMIT = 10
const OFFER_LIMIT = 20

export function CompanionLessonDetailPage() {
  const { companionId = '', skillId = '' } = useParams()
  const [searchParams] = useSearchParams()
  const urlSessionId = searchParams.get('sessionId')
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [reviewPage, setReviewPage] = useState(1)
  const [offerPage, setOfferPage] = useState(1)
  const [bookingOffer, setBookingOffer] = useState<SessionDto | null>(null)

  const profileQuery = useQuery({
    queryKey: companionKeys.publicProfile(companionId),
    queryFn: () => companionApi.getPublicProfile(companionId),
    enabled: Boolean(companionId),
    retry: (failureCount, error) => !isApiError(error) || (error.status >= 500 && failureCount < 1),
  })

  const detailQuery = useQuery({
    queryKey: companionKeys.skillDetail(companionId, skillId, {
      reviewPage,
      reviewLimit: REVIEW_LIMIT,
      offerPage,
      offerLimit: OFFER_LIMIT,
    }),
    queryFn: () =>
      companionApi.getSkillDetail(companionId, skillId, {
        reviewPage,
        reviewLimit: REVIEW_LIMIT,
        offerPage,
        offerLimit: OFFER_LIMIT,
      }),
    enabled: Boolean(companionId) && Boolean(skillId),
    retry: (failureCount, error) => !isApiError(error) || (error.status >= 500 && failureCount < 1),
  })

  const bookMutation = useMutation({
    mutationFn: ({ sessionId, selectedDurationMinutes }: { sessionId: string; selectedDurationMinutes: AllowedDurationMinutes }) =>
      sessionsApi.book(sessionId, { selectedDurationMinutes }),
    onSuccess: async (updatedSession) => {
      setBookingOffer(null)
      showToast({ kind: 'success', message: 'Đăng ký buổi học thành công.' })
      await Promise.all([invalidateSessionQueries(queryClient, updatedSession.sessionId), invalidateWalletQueries(queryClient)])
      navigate(`/dashboard/skills/${updatedSession.sessionId}`)
    },
    onError: (error) => {
      showToast({ kind: 'error', message: getErrorMessage(error) })
    },
  })

  const profileError = profileQuery.error
  const detailError = detailQuery.error
  const isPrivateProfile =
    (isApiError(profileError) && profileError.code === 'PROFILE_PRIVATE')
    || (isApiError(detailError) && detailError.code === 'PROFILE_PRIVATE')
  const isMissingProfile =
    (isApiError(profileError) && (profileError.code === 'PROFILE_NOT_FOUND' || profileError.status === 404))
    || (isApiError(detailError) && detailError.code === 'PROFILE_NOT_FOUND')
  const isMissingSkill = isApiError(detailError) && (detailError.code === 'SKILL_NOT_FOUND' || detailError.status === 404)

  const isLoading = profileQuery.isLoading || detailQuery.isLoading
  const hasUnexpectedError =
    (profileQuery.isError || detailQuery.isError) && !isPrivateProfile && !isMissingProfile && !isMissingSkill

  const profile = profileQuery.data
  const detail = detailQuery.data
  const rawOffers = detail?.offers.data ?? []
  const filteredOffers = urlSessionId ? rawOffers.filter((o) => o.sessionId === urlSessionId) : rawOffers
  const offers = filteredOffers.length > 0 ? filteredOffers : rawOffers
  const reviews = detail?.reviews.data ?? []
  
  const featuredOffer = offers.find((offer) => Boolean(offer.description?.trim())) ?? offers[0] ?? null
  const lessonTitle = detail?.skill.name || 'Chi tiết môn học'
  const lessonDescription = featuredOffer?.description?.trim()
    || (detail && profile
      ? `${profile.displayName} hiện có ${detail.offers.total} lịch mở cho môn ${detail.skill.name}. Chọn lịch phù hợp ở danh sách bên dưới để xem thời lượng, hình thức và gửi yêu cầu đặt lịch.`
      : 'Thông tin môn học đang được cập nhật.')

  const durationLabels = getDurationLabels(offers)
  const deliveryModeLabels = getDeliveryModeLabels(offers)
  const locationLabels = getLocationLabels(offers)
  const nextScheduleLabel = offers.length > 0 ? formatSessionDateTime(offers[0].scheduledAt) : 'Chưa có lịch mở'
  const priceLabel = getLessonPriceLabel(offers)
  const profileLink = `/dashboard/companions/${companionId}?skillId=${skillId}`
  const SkillIcon = getSkillIcon(detail?.skill.iconKey ?? null)

  return (
    <>
      <MotionPage className="page dashboard-page profile-page session-hub-page">
        <SiteHeader />

        <section className="companion-detail-shell companion-lesson-detail-shell">
          <div className="companion-detail-topbar companion-detail-topbar--spread">
            <Link className="button secondary" to="/dashboard/companions">
              Quay lại tìm kiếm
            </Link>
            <Link className="button secondary" to={profileLink}>
              Xem hồ sơ
            </Link>
          </div>

          {isLoading ? (
            <section className="profile-state-card">
              <LoaderCircle className="spin" size={24} />
              <p>Đang tải chi tiết môn học...</p>
            </section>
          ) : null}

          {isPrivateProfile ? (
            <section className="profile-state-card">
              <AlertCircle size={22} />
              <div>
                <h2>Hồ sơ công khai đang bị ẩn</h2>
                <p>Companion này đang để hồ sơ ở chế độ riêng tư nên chưa thể xem công khai.</p>
              </div>
            </section>
          ) : null}

          {isMissingProfile ? (
            <section className="profile-state-card">
              <AlertCircle size={22} />
              <div>
                <h2>Không tìm thấy hồ sơ công khai</h2>
                <p>Companion này chưa có hồ sơ công khai hợp lệ.</p>
              </div>
            </section>
          ) : null}

          {isMissingSkill ? (
            <section className="profile-state-card">
              <AlertCircle size={22} />
              <div>
                <h2>Không tìm thấy chi tiết môn học</h2>
                <p>Môn học này không còn khả dụng trên hồ sơ công khai của companion.</p>
              </div>
            </section>
          ) : null}

          {hasUnexpectedError ? (
            <section className="profile-state-card error">
              <AlertCircle size={22} />
              <div>
                <h2>Không thể tải dữ liệu</h2>
                <p>{getErrorMessage(profileError ?? detailError)}</p>
              </div>
            </section>
          ) : null}

          {profile && detail ? (
            <section className="companion-detail-layout companion-lesson-detail-layout">
              <article className="companion-detail-main">
                <section className="companion-lesson-hero">
                  <div className="companion-skill-hero-copy">
                    <span className="companion-public-skill-icon large" aria-hidden="true">
                      <SkillIcon size={28} />
                    </span>
                    <div className="companion-lesson-hero-copy">
                      <h1>{lessonTitle}</h1>
                      <div className="companion-profile-rating left">
                        <strong>{detail.avgRating.toFixed(1)}</strong>
                        <Star fill="currentColor" size={18} />
                        <span>({detail.totalReviews} đánh giá)</span>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="companion-lesson-panel" id="booking">
                  <div className="companion-lesson-heading">
                    <h2>Về buổi học</h2>
                    <div className="companion-lesson-price">{priceLabel}</div>
                  </div>

                  <div className="companion-lesson-facts">
                    <div className="companion-lesson-fact">
                      <span className="companion-lesson-label">Thời lượng:</span>
                      <div className="companion-lesson-chip-row">
                        {(durationLabels.length > 0 ? durationLabels : ['Đang cập nhật']).map((label) => (
                          <span className="companion-lesson-chip" key={label}>
                            {label}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="companion-lesson-fact">
                      <span className="companion-lesson-label">Hình thức:</span>
                      <div className="companion-lesson-chip-row">
                        {(deliveryModeLabels.length > 0 ? deliveryModeLabels : ['Đang cập nhật']).map((label) => (
                          <span className="companion-lesson-chip" key={label}>
                            {label}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="companion-lesson-fact">
                      <span className="companion-lesson-label">Lịch gần nhất:</span>
                      <div className="companion-lesson-chip-row">
                        <span className="companion-lesson-chip">{nextScheduleLabel}</span>
                      </div>
                    </div>

                    {locationLabels.length > 0 ? (
                      <div className="companion-lesson-fact">
                        <span className="companion-lesson-label">Địa điểm:</span>
                        <div className="companion-lesson-chip-row">
                          {locationLabels.map((label) => (
                            <span className="companion-lesson-chip" key={label}>
                              {label}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <p className="companion-lesson-description">{lessonDescription}</p>
                </section>

                <section className="companion-extra-sessions">
                  <div className="companion-section-heading">
                    <h3>Lịch học mở</h3>
                    <p>Chọn đúng lịch và thời lượng phù hợp trước khi gửi yêu cầu đăng ký.</p>
                  </div>

                  {offers.length === 0 ? (
                    <section className="profile-state-card">
                      <p>Chưa có lịch mở cho môn học này.</p>
                    </section>
                  ) : (
                    <div className="companion-extra-session-list">
                      {offers.map((offer) => (
                        <article className="companion-extra-session-card" key={offer.sessionId}>
                          <div className="companion-extra-session-head">
                            <div>
                              <strong>{offer.description || offer.skill}</strong>
                              <span>{formatSessionDateTime(offer.scheduledAt)}</span>
                            </div>
                            <span className="companion-extra-session-price">{getOfferPriceLabel(offer)}</span>
                          </div>

                          <div className="companion-extra-session-meta">
                            <span>
                              <CalendarDays size={14} />
                              {getDurationSummary(offer)}
                            </span>
                            <span>
                              <Video size={14} />
                              {offer.deliveryMode === 'Online' ? 'Online' : 'Offline'}
                            </span>
                            {offer.location ? (
                              <span>
                                <MapPin size={14} />
                                {offer.location}
                              </span>
                            ) : null}
                          </div>

                          <div className="companion-extra-session-actions">
                            <button
                              className="button primary"
                              disabled={offer.status !== 'Available' || bookMutation.isPending}
                              onClick={() => setBookingOffer(offer)}
                              type="button"
                            >
                              Đăng ký buổi học
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}

                  {!urlSessionId && detail.offers.total > OFFER_LIMIT ? (
                    <div className="session-pagination">
                      <button
                        className="button secondary"
                        disabled={offerPage <= 1}
                        onClick={() => setOfferPage((page) => page - 1)}
                        type="button"
                      >
                        Trang trước
                      </button>
                      <span>
                        Trang {offerPage} / {Math.ceil(detail.offers.total / OFFER_LIMIT)}
                      </span>
                      <button
                        className="button secondary"
                        disabled={offerPage >= Math.ceil(detail.offers.total / OFFER_LIMIT)}
                        onClick={() => setOfferPage((page) => page + 1)}
                        type="button"
                      >
                        Trang sau
                      </button>
                    </div>
                  ) : null}
                </section>

                <section className="companion-review-section">
                  <div className="companion-section-heading">
                    <h3>Đánh giá</h3>
                    <p>Đây là phần người học đánh giá riêng cho môn học này.</p>
                  </div>

                  {reviews.length === 0 ? (
                    <p className="companion-review-empty">Chưa có đánh giá nào.</p>
                  ) : (
                    <div className="companion-review-list">
                      {reviews.map((review) => (
                        <article className="companion-review-card" key={review.reviewId}>
                          <div className="companion-review-head">
                            <div className="companion-review-author">
                              <div className="companion-review-avatar" aria-hidden="true" />
                              <strong>{review.reviewerDisplayName}</strong>
                            </div>

                            <span className="companion-review-rating">
                              {review.rating}
                              <Star fill="currentColor" size={15} />
                            </span>
                          </div>

                          {review.comment ? <p>{review.comment}</p> : null}

                          <span className="companion-review-date">
                            {new Date(review.createdAt).toLocaleDateString('vi-VN')}
                          </span>
                        </article>
                      ))}
                    </div>
                  )}

                  {detail.reviews.total > REVIEW_LIMIT ? (
                    <div className="session-pagination">
                      <button
                        className="button secondary"
                        disabled={reviewPage <= 1}
                        onClick={() => setReviewPage((page) => page - 1)}
                        type="button"
                      >
                        Trang trước
                      </button>
                      <span>
                        Trang {reviewPage} / {Math.ceil(detail.reviews.total / REVIEW_LIMIT)}
                      </span>
                      <button
                        className="button secondary"
                        disabled={reviewPage >= Math.ceil(detail.reviews.total / REVIEW_LIMIT)}
                        onClick={() => setReviewPage((page) => page + 1)}
                        type="button"
                      >
                        Trang sau
                      </button>
                    </div>
                  ) : null}
                </section>
              </article>

              <aside className="companion-detail-sidebar companion-skill-sidebar">
                <article className="companion-profile-card companion-public-profile-card">
                  {profile.avatarUrl ? (
                    <img alt={profile.displayName} className="companion-profile-avatar" src={profile.avatarUrl} />
                  ) : (
                    <div className="companion-profile-avatar companion-profile-avatar--placeholder">
                      <UserRound size={80} />
                    </div>
                  )}

                  <span className="companion-profile-pill">Về tôi</span>


                  <div className="companion-profile-copy">
                    <h2>{profile.displayName}</h2>
                    {profile.subscriptionBadge ? (
                      <span className="wallet-premium-badge companion-premium-badge">
                        {profile.subscriptionBadge}
                      </span>
                    ) : null}

                    <div className="companion-profile-rating">
                      <strong>{profile.activitySummary.avgRating.toFixed(1)}</strong>
                      <Star fill="currentColor" size={18} />
                      <span>({profile.activitySummary.totalReviews} đánh giá)</span>
                    </div>

                    <p>{profile.bio || 'Companion này chưa cập nhật phần giới thiệu công khai.'}</p>
                  </div>

                  <div className="companion-profile-stats">
                    <div className="companion-profile-stat">
                      <BookOpen size={16} />
                      <span>{profile.activitySummary.totalSessions} buổi đã dạy</span>
                    </div>
                    <div className="companion-profile-stat">
                      <Award size={16} />
                      <span>{profile.activitySummary.totalTeachingHours} giờ giảng dạy</span>
                    </div>
                  </div>

                  <div className="companion-profile-skills">
                    {profile.teachingSkills.map((skill) => (
                      <span
                        className={`companion-lesson-chip${skill.skillId === detail.skill.skillId ? ' companion-lesson-chip--active' : ''}`}
                        key={skill.skillId}
                      >
                        {skill.name}
                      </span>
                    ))}
                  </div>
                </article>

                <article className="companion-public-achievements-card">
                  <AchievementSection
                    achievements={profile.achievements}
                    compact
                    emptyLabel="Companion này chưa có thành tích nào."
                  />
                </article>
              </aside>
            </section>
          ) : null}
        </section>
      </MotionPage>

      {bookingOffer ? (
        <OfferBookingModal
          isPending={bookMutation.isPending}
          offer={bookingOffer}
          onClose={() => setBookingOffer(null)}
          onConfirm={(selectedDurationMinutes) =>
            bookMutation.mutate({
              sessionId: bookingOffer.sessionId,
              selectedDurationMinutes,
            })
          }
        />
      ) : null}
    </>
  )
}

function OfferBookingModal({
  offer,
  isPending,
  onClose,
  onConfirm,
}: {
  offer: SessionDto
  isPending: boolean
  onClose: () => void
  onConfirm: (selectedDurationMinutes: AllowedDurationMinutes) => void
}) {
  const isFormula = offer.pricingModel === 'FormulaV1'
  const [selectedOption, setSelectedOption] = useState<DurationPricingOptionDto | null>(() =>
    isFormula && offer.durationPricingOptions.length === 1 ? offer.durationPricingOptions[0] : null,
  )

  const canSubmit = isFormula ? selectedOption !== null : true
  const selectedPoints = selectedOption?.learnerChargePoints ?? offer.pointCost

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h3>Đăng ký buổi học</h3>
          <button aria-label="Đóng" className="modal-close" onClick={onClose} type="button">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <p style={{ marginTop: 0 }}>{offer.description || offer.skill}</p>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
            {formatSessionDateTime(offer.scheduledAt)}
          </p>

          {isFormula ? (
            <>
              <h4 style={{ margin: '0 0 0.75rem' }}>Chọn thời lượng</h4>
              <div className="session-duration-options">
                {offer.durationPricingOptions.map((option) => (
                  <button
                    className={`session-duration-option${selectedOption?.durationMinutes === option.durationMinutes ? ' active' : ''}`}
                    key={option.durationMinutes}
                    onClick={() => setSelectedOption(option)}
                    type="button"
                  >
                    {option.durationMinutes} phút
                  </button>
                ))}
              </div>
            </>
          ) : (
            <p style={{ margin: '0 0 1rem' }}>Thời lượng cố định: {offer.durationMinutes} phút</p>
          )}

          <p style={{ fontWeight: 700, marginBottom: 0 }}>Số điểm cần trả: {selectedPoints} điểm</p>
        </div>

        <div className="modal-footer">
          <button className="button secondary" disabled={isPending} onClick={onClose} type="button">
            Hủy
          </button>
          <button
            className="button primary"
            disabled={!canSubmit || isPending}
            onClick={() =>
              onConfirm(
                isFormula
                  ? (selectedOption!.durationMinutes as AllowedDurationMinutes)
                  : (offer.durationMinutes as AllowedDurationMinutes),
              )
            }
            type="button"
          >
            {isPending ? <LoaderCircle className="spin" size={16} /> : null}
            Xác nhận đăng ký
          </button>
        </div>
      </div>
    </div>
  )
}

function getLessonPriceLabel(offers: SessionDto[]) {
  if (offers.length === 0) {
    return 'Đang cập nhật'
  }

  let minPoints = Number.POSITIVE_INFINITY
  let maxPoints = Number.NEGATIVE_INFINITY

  for (const offer of offers) {
    if (offer.pricingPreview) {
      minPoints = Math.min(minPoints, offer.pricingPreview.minLearnerChargePoints)
      maxPoints = Math.max(maxPoints, offer.pricingPreview.maxLearnerChargePoints)
      continue
    }

    minPoints = Math.min(minPoints, offer.pointCost)
    maxPoints = Math.max(maxPoints, offer.pointCost)
  }

  if (!Number.isFinite(minPoints) || !Number.isFinite(maxPoints)) {
    return 'Đang cập nhật'
  }

  return minPoints === maxPoints ? `${minPoints} điểm` : `${minPoints} - ${maxPoints} điểm`
}

function getDurationLabels(offers: SessionDto[]) {
  const labels = new Set<string>()

  for (const offer of offers) {
    if (offer.pricingModel === 'FormulaV1' && offer.durationPricingOptions.length > 0) {
      for (const option of offer.durationPricingOptions) {
        labels.add(`${option.durationMinutes} phút`)
      }
      continue
    }

    labels.add(`${offer.durationMinutes} phút`)
  }

  return [...labels].sort((left, right) => Number.parseInt(left, 10) - Number.parseInt(right, 10))
}

function getDeliveryModeLabels(offers: SessionDto[]) {
  const labels = new Set<string>()

  for (const offer of offers) {
    labels.add(offer.deliveryMode === 'Online' ? 'Online' : 'Offline')
  }

  return [...labels]
}

function getLocationLabels(offers: SessionDto[]) {
  const labels = new Set<string>()

  for (const offer of offers) {
    if (offer.location?.trim()) {
      labels.add(offer.location.trim())
    }
  }

  return [...labels]
}

function getOfferPriceLabel(offer: SessionDto) {
  if (offer.pricingModel === 'FormulaV1' && offer.pricingPreview) {
    const { minLearnerChargePoints, maxLearnerChargePoints } = offer.pricingPreview
    return minLearnerChargePoints === maxLearnerChargePoints
      ? `${minLearnerChargePoints} điểm`
      : `${minLearnerChargePoints} - ${maxLearnerChargePoints} điểm`
  }

  return `${offer.pointCost} điểm`
}

function getDurationSummary(offer: SessionDto) {
  if (offer.pricingModel === 'FormulaV1' && offer.durationPricingOptions.length > 0) {
    const durations = [...new Set(offer.durationPricingOptions.map((option) => option.durationMinutes))].sort((left, right) => left - right)
    return durations.length === 1 ? `${durations[0]} phút` : `${durations.join(' / ')} phút`
  }

  return `${offer.durationMinutes} phút`
}
