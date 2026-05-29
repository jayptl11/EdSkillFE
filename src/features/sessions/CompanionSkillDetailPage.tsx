import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, CalendarDays, Clock3, LoaderCircle, MapPin, Star, Video, X } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getErrorMessage, isApiError } from '../../api/client'
import { SiteHeader } from '../../components/Brand'
import { MotionPage } from '../../components/MotionPage'
import { showToast } from '../../components/toastEvents'
import { getSkillIcon } from '../skills/skillIcons'
import { sessionsApi } from './sessionsApi'
import { formatSessionDateTime, invalidateSessionQueries, invalidateWalletQueries } from './sessionUtils'
import { companionApi, companionKeys } from './companionApi'
import type { AllowedDurationMinutes, DurationPricingOptionDto, SessionDto } from './types'

const REVIEW_LIMIT = 10
const OFFER_LIMIT = 20

export function CompanionSkillDetailPage() {
  const { companionId = '', skillId = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [reviewPage, setReviewPage] = useState(1)
  const [offerPage, setOfferPage] = useState(1)
  const [bookingOffer, setBookingOffer] = useState<SessionDto | null>(null)

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

  const error = detailQuery.error
  const isProfilePrivate = isApiError(error) && error.code === 'PROFILE_PRIVATE'
  const isSkillMissing = isApiError(error) && (error.code === 'SKILL_NOT_FOUND' || error.code === 'PROFILE_NOT_FOUND' || error.status === 404)

  const profileLink = `/dashboard/companions/${companionId}?skillId=${skillId}`

  return (
    <>
      <MotionPage className="page dashboard-page profile-page session-hub-page">
        <SiteHeader />

        <section className="dashboard-hero profile-hero">
          <div>
            <span className="eyebrow">
              <Clock3 size={15} />
              Skill detail
            </span>
            <h1>Xem lịch học mở và đánh giá của companion theo từng kỹ năng.</h1>
            <p>Trang này chỉ dùng `companionId + skillId` để lấy offer, review và thực hiện booking.</p>
          </div>
          <div className="profile-hero-actions">
            <Link className="button secondary" to={profileLink}>
              Về public profile
            </Link>
          </div>
        </section>

        {detailQuery.isLoading ? (
          <section className="profile-state-card">
            <LoaderCircle className="spin" size={24} />
            <p>Đang tải chi tiết kỹ năng...</p>
          </section>
        ) : null}

        {isProfilePrivate ? (
          <section className="profile-state-card">
            <AlertCircle size={22} />
            <div>
              <h2>Public profile đang bị ẩn</h2>
              <p>Companion này đang để hồ sơ ở chế độ riêng tư nên chưa thể xem skill detail.</p>
            </div>
          </section>
        ) : null}

        {isSkillMissing ? (
          <section className="profile-state-card">
            <AlertCircle size={22} />
            <div>
              <h2>Không tìm thấy skill detail</h2>
              <p>Kỹ năng này không còn khả dụng trên public profile của companion.</p>
            </div>
          </section>
        ) : null}

        {detailQuery.isError && !isProfilePrivate && !isSkillMissing ? (
          <section className="profile-state-card error">
            <AlertCircle size={22} />
            <div>
              <h2>Không thể tải skill detail</h2>
              <p>{getErrorMessage(detailQuery.error)}</p>
            </div>
          </section>
        ) : null}

        {detailQuery.data ? (
          <section className="companion-detail-shell">
            <section className="companion-skill-hero">
              <div className="companion-skill-hero-copy">
                <span className="companion-public-skill-icon large" aria-hidden="true">
                  {(() => {
                    const SkillIcon = getSkillIcon(detailQuery.data.skill.iconKey)
                    return <SkillIcon size={28} />
                  })()}
                </span>
                <div>
                  <h2>{detailQuery.data.skill.name}</h2>
                  <div className="companion-profile-rating left">
                    <strong>{detailQuery.data.avgRating.toFixed(1)}</strong>
                    <Star fill="currentColor" size={18} />
                    <span>({detailQuery.data.totalReviews} Review)</span>
                  </div>
                </div>
              </div>
            </section>

            <section className="companion-detail-layout companion-skill-detail-layout">
              <article className="companion-detail-main">
                <section className="companion-public-skills-panel" id="booking">
                  <div className="companion-section-heading">
                    <h3>Lịch học mở</h3>
                    <p>Chọn đúng offer và thời lượng hợp lệ trước khi gửi request booking.</p>
                  </div>

                  {detailQuery.data.offers.data.length === 0 ? (
                    <section className="profile-state-card">
                      <p>Chưa có lịch mở cho kỹ năng này.</p>
                    </section>
                  ) : (
                    <div className="companion-offer-list">
                      {detailQuery.data.offers.data.map((offer) => (
                        <article className="companion-offer-card" key={offer.sessionId}>
                          <div className="companion-extra-session-head">
                            <div>
                              <strong>{offer.description || offer.skill}</strong>
                              <span>{formatSessionDateTime(offer.scheduledAt)}</span>
                            </div>
                            <span className="companion-extra-session-price">{getOfferPriceLabel(offer)}</span>
                          </div>

                          <div className="companion-offer-meta">
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

                          <div className="companion-offer-actions">
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

                  {detailQuery.data.offers.total > OFFER_LIMIT ? (
                    <div className="session-pagination" style={{ marginTop: '1rem' }}>
                      <button
                        className="button secondary"
                        disabled={offerPage <= 1}
                        onClick={() => setOfferPage((page) => page - 1)}
                        type="button"
                      >
                        Trang trước
                      </button>
                      <span>
                        Trang {offerPage} / {Math.ceil(detailQuery.data.offers.total / OFFER_LIMIT)}
                      </span>
                      <button
                        className="button secondary"
                        disabled={offerPage >= Math.ceil(detailQuery.data.offers.total / OFFER_LIMIT)}
                        onClick={() => setOfferPage((page) => page + 1)}
                        type="button"
                      >
                        Trang sau
                      </button>
                    </div>
                  ) : null}
                </section>
              </article>

              <aside className="companion-detail-sidebar companion-skill-sidebar">
                <section className="companion-review-section">
                  <div className="companion-section-heading">
                    <h3>Đánh giá</h3>
                    <p>Đây là review cấp companion được backend trả về cho skill detail.</p>
                  </div>

                  {detailQuery.data.reviews.data.length === 0 ? (
                    <p className="companion-review-empty">Chưa có đánh giá nào.</p>
                  ) : (
                    <div className="companion-review-list">
                      {detailQuery.data.reviews.data.map((review) => (
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

                  {detailQuery.data.reviews.total > REVIEW_LIMIT ? (
                    <div className="session-pagination" style={{ marginTop: '1rem' }}>
                      <button
                        className="button secondary"
                        disabled={reviewPage <= 1}
                        onClick={() => setReviewPage((page) => page - 1)}
                        type="button"
                      >
                        Trang trước
                      </button>
                      <span>
                        Trang {reviewPage} / {Math.ceil(detailQuery.data.reviews.total / REVIEW_LIMIT)}
                      </span>
                      <button
                        className="button secondary"
                        disabled={reviewPage >= Math.ceil(detailQuery.data.reviews.total / REVIEW_LIMIT)}
                        onClick={() => setReviewPage((page) => page + 1)}
                        type="button"
                      >
                        Trang sau
                      </button>
                    </div>
                  ) : null}
                </section>
              </aside>
            </section>
          </section>
        ) : null}
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

export function OfferBookingModal({
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

  const modalContent = (
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

  return createPortal(modalContent, document.body)
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
