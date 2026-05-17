import { useQuery } from '@tanstack/react-query'
import { AlertCircle, Award, BookOpen, LoaderCircle, Star, UserRound } from 'lucide-react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { getErrorMessage, isApiError } from '../../api/client'
import { SiteHeader } from '../../components/Brand'
import { MotionPage } from '../../components/MotionPage'
import { AchievementSection } from '../achievements/AchievementSection'
import { getSkillIcon } from '../skills/skillIcons'
import { companionApi, companionKeys, type CompanionTeachingSkillDto } from './companionApi'

export function CompanionDetailPage() {
  const { companionId = '' } = useParams()
  const [searchParams] = useSearchParams()
  const highlightedSkillId = searchParams.get('skillId') ?? ''

  const profileQuery = useQuery({
    queryKey: companionKeys.publicProfile(companionId),
    queryFn: () => companionApi.getPublicProfile(companionId),
    enabled: Boolean(companionId),
    retry: (failureCount, error) => !isApiError(error) || (error.status >= 500 && failureCount < 1),
  })

  const error = profileQuery.error
  const isPrivateProfile = isApiError(error) && error.code === 'PROFILE_PRIVATE'
  const isNotFoundProfile = isApiError(error) && (error.code === 'PROFILE_NOT_FOUND' || error.status === 404)

  return (
    <MotionPage className="page dashboard-page profile-page session-hub-page">
      <SiteHeader />

      <section className="dashboard-hero profile-hero">
        <div>
          <span className="eyebrow">
            <BookOpen size={15} />
            Public companion profile
          </span>
          <h1>Khám phá hồ sơ công khai và kỹ năng giảng dạy của companion.</h1>
          <p>Từ trang này, người học xem thành tích, danh sách kỹ năng và đi tiếp vào từng skill để đăng ký.</p>
        </div>
        <div className="profile-hero-actions">
          <Link className="button secondary" to="/dashboard/companions">
            Quay lại tìm kiếm
          </Link>
        </div>
      </section>

      {profileQuery.isLoading ? (
        <section className="profile-state-card">
          <LoaderCircle className="spin" size={24} />
          <p>Đang tải public profile...</p>
        </section>
      ) : null}

      {isPrivateProfile ? (
        <section className="profile-state-card">
          <AlertCircle size={22} />
          <div>
            <h2>Public profile đang bị ẩn</h2>
            <p>Companion này đang để hồ sơ ở chế độ riêng tư nên chưa thể xem công khai.</p>
          </div>
        </section>
      ) : null}

      {isNotFoundProfile ? (
        <section className="profile-state-card">
          <AlertCircle size={22} />
          <div>
            <h2>Không tìm thấy public profile</h2>
            <p>Companion này chưa có hồ sơ công khai hợp lệ.</p>
          </div>
        </section>
      ) : null}

      {profileQuery.isError && !isPrivateProfile && !isNotFoundProfile ? (
        <section className="profile-state-card error">
          <AlertCircle size={22} />
          <div>
            <h2>Không thể tải public profile</h2>
            <p>{getErrorMessage(profileQuery.error)}</p>
          </div>
        </section>
      ) : null}

      {profileQuery.data ? (
        <section className="companion-public-shell">
          <div className="companion-detail-layout companion-public-layout">
            <article className="companion-detail-main companion-public-main">
              <section className="companion-public-skills-panel">
                <div className="companion-section-heading">
                  <h3>Kỹ năng giảng dạy</h3>
                  <p>Hiển thị toàn bộ kỹ năng companion đang dạy theo đúng dữ liệu public profile.</p>
                </div>

                {profileQuery.data.teachingSkills.length === 0 ? (
                  <section className="profile-state-card">
                    <p>Companion này chưa có kỹ năng giảng dạy nào để hiển thị.</p>
                  </section>
                ) : (
                  <div className="companion-public-skill-list">
                    {profileQuery.data.teachingSkills.map((skill) => (
                      <PublicSkillCard
                        companionId={profileQuery.data!.companionId}
                        highlighted={highlightedSkillId === skill.skillId}
                        key={skill.skillId}
                        skill={skill}
                      />
                    ))}
                  </div>
                )}
              </section>
            </article>

            <aside className="companion-detail-sidebar companion-public-sidebar">
              <article className="companion-profile-card companion-public-profile-card">
                {profileQuery.data.avatarUrl ? (
                  <img alt={profileQuery.data.displayName} className="companion-profile-avatar" src={profileQuery.data.avatarUrl} />
                ) : (
                  <div className="companion-profile-avatar companion-profile-avatar--placeholder">
                    <UserRound size={80} />
                  </div>
                )}

                <span className="companion-profile-pill">About me</span>

                <div className="companion-profile-copy">
                  <h2>{profileQuery.data.displayName}</h2>
                  {profileQuery.data.subscriptionBadge ? (
                    <span className="wallet-premium-badge companion-premium-badge">
                      {profileQuery.data.subscriptionBadge}
                    </span>
                  ) : null}

                  <div className="companion-profile-rating">
                    <strong>{profileQuery.data.activitySummary.avgRating.toFixed(1)}</strong>
                    <Star fill="currentColor" size={18} />
                    <span>({profileQuery.data.activitySummary.totalReviews} Review)</span>
                  </div>

                  <p>{profileQuery.data.bio || 'Companion này chưa cập nhật phần giới thiệu công khai.'}</p>
                </div>

                <div className="companion-profile-stats">
                  <div className="companion-profile-stat">
                    <BookOpen size={16} />
                    <span>{profileQuery.data.activitySummary.totalSessions} buổi đã dạy</span>
                  </div>
                  <div className="companion-profile-stat">
                    <Award size={16} />
                    <span>{profileQuery.data.activitySummary.totalTeachingHours} giờ giảng dạy</span>
                  </div>
                </div>
              </article>

              <article className="companion-public-achievements-card">
                <AchievementSection
                  achievements={profileQuery.data.achievements}
                  compact
                  emptyLabel="Companion này chưa có thành tích nào."
                />
              </article>
            </aside>
          </div>
        </section>
      ) : null}
    </MotionPage>
  )
}

function PublicSkillCard({
  companionId,
  skill,
  highlighted,
}: {
  companionId: string
  skill: CompanionTeachingSkillDto
  highlighted: boolean
}) {
  const SkillIcon = getSkillIcon(skill.iconKey)
  const skillDetailPath = `/dashboard/companions/${companionId}/skills/${skill.skillId}`

  return (
    <article className={`companion-public-skill-card${highlighted ? ' is-highlighted' : ''}`}>
      <div className="companion-public-skill-head">
        <span className="companion-public-skill-icon" aria-hidden="true">
          <SkillIcon size={22} />
        </span>
        <div className="companion-public-skill-copy">
          <h4>{skill.name}</h4>
          <p>{skill.hasAvailableOffers && skill.startingPointCost != null ? `Từ ${skill.startingPointCost} điểm` : 'Chưa có lịch mở'}</p>
        </div>
      </div>

      <div className="companion-public-skill-actions">
        <Link className="button secondary" to={skillDetailPath}>
          Xem chi tiết
        </Link>
        {skill.hasAvailableOffers ? (
          <Link className="button primary" to={`${skillDetailPath}#booking`}>
            Đăng ký
          </Link>
        ) : (
          <button className="button secondary" disabled type="button">
            Chưa có lịch mở
          </button>
        )}
      </div>
    </article>
  )
}
