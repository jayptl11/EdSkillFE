import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  AlertCircle,
  BookOpen,
  CalendarDays,
  Code,
  Globe,
  LineChart,
  LoaderCircle,
  Palette,
  Star,
  UserRound,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { getErrorMessage } from '../../api/client'
import { SiteHeader } from '../../components/Brand'
import { MotionPage } from '../../components/MotionPage'
import { SkillAutocomplete } from '../skills/SkillAutocomplete'
import { formatSessionDateTime } from '../sessions/sessionUtils'
import { companionApi, companionKeys, type CompanionSearchParams } from '../sessions/companionApi'
import { DeliveryLocationPicker } from '../sessions/DeliveryLocationPicker'
import type { SessionDeliveryMode } from '../sessions/types'

const COMPANION_LIMIT = 12

export function CompanionSearchPage() {
  const [skillId, setSkillId] = useState('')
  const [skillName, setSkillName] = useState('')
  const [deliveryMode, setDeliveryMode] = useState<SessionDeliveryMode | ''>('')
  const [location, setLocation] = useState('')
  const [searchParams, setSearchParams] = useState<CompanionSearchParams | null>(null)

  const searchQuery = useQuery({
    queryKey: companionKeys.search(searchParams!),
    queryFn: () => companionApi.search(searchParams!),
    enabled: searchParams !== null,
  })

  const handleSearch = () => {
    if (!skillId) return

    const params: CompanionSearchParams = {
      skillId,
      page: 1,
      limit: COMPANION_LIMIT,
    }

    if (deliveryMode) {
      params.deliveryMode = deliveryMode
    }

    if (deliveryMode === 'Offline' && location.trim()) {
      params.location = location.trim()
    }

    setSearchParams(params)
  }

  const companions = searchQuery.data?.data ?? []

  return (
    <MotionPage className="page dashboard-page profile-page session-hub-page">
      <SiteHeader />
      <section className="discovery-hero-section">
        <div className="discovery-hero-content">
          <h1>Tìm người dạy giỏi nhất</h1>

          <div className="discovery-search-pill">
            <div className="discovery-search-skill-wrap">
              <SkillAutocomplete
                helperText=""
                label=""
                mode="single"
                onRemove={() => { setSkillId(''); setSkillName('') }}
                onSelect={(name) => setSkillName(name)}
                onSelectWithId={(id, name) => { setSkillId(id); setSkillName(name) }}
                placeholder="Hãy thử học thêm..."
                selectedSkills={skillName ? [skillName] : []}
              />
            </div>

            <div className="discovery-search-divider" />

            <div className="discovery-search-location-wrap">
              <DeliveryLocationPicker
                location={location}
                mode={deliveryMode}
                onLocationChange={setLocation}
                onModeChange={setDeliveryMode}
              />
            </div>

            <button
              className="button primary discovery-search-btn"
              disabled={!skillId || searchQuery.isFetching}
              onClick={handleSearch}
              type="button"
            >
              {searchQuery.isFetching ? <LoaderCircle className="spin" size={20} /> : 'Tìm kiếm'}
            </button>
          </div>

          <div className="discovery-quick-skills">
            <button className="quick-skill-chip" onClick={() => { setSkillId('Tiếng Anh'); setSkillName('Tiếng Anh') }} type="button">
              <Globe size={18} />
              <span>Tiếng Anh</span>
            </button>
            <button className="quick-skill-chip" onClick={() => { setSkillId('Lập trình'); setSkillName('Lập trình') }} type="button">
              <Code size={18} />
              <span>Lập trình</span>
            </button>
            <button className="quick-skill-chip" onClick={() => { setSkillId('Thiết kế'); setSkillName('Thiết kế') }} type="button">
              <Palette size={18} />
              <span>Thiết kế</span>
            </button>
            <button className="quick-skill-chip" onClick={() => { setSkillId('Toán học'); setSkillName('Toán học') }} type="button">
              <LineChart size={18} />
              <span>Toán học</span>
            </button>
            <button className="quick-skill-chip" onClick={() => { setSkillId('Kỹ năng mềm'); setSkillName('Kỹ năng mềm') }} type="button">
              <BookOpen size={18} />
              <span>Kỹ năng mềm</span>
            </button>
          </div>
        </div>
      </section>

      {searchQuery.data || searchQuery.isError ? (
        <section className="session-board-shell" style={{ marginTop: '20px' }}>
          {searchQuery.isError ? (
            <section className="profile-state-card error">
              <AlertCircle size={20} />
              <p>{getErrorMessage(searchQuery.error)}</p>
            </section>
          ) : null}

          {searchQuery.data && companions.length === 0 ? (
            <section className="session-empty-state">
              <h3>Không tìm thấy người dạy phù hợp.</h3>
              <p>Thử đổi kỹ năng hoặc hình thức học để xem thêm kết quả.</p>
            </section>
          ) : null}

          {companions.length > 0 ? (
            <div className="session-card-grid">
              {companions.map((companion) => (
                <article className="session-card session-discovery-card" key={companion.companionId}>
                  <div className="session-teacher-row">
                    {companion.avatarUrl ? (
                      <img
                        alt={companion.displayName}
                        className="session-teacher-avatar"
                        src={companion.avatarUrl}
                      />
                    ) : (
                      <div className="session-teacher-avatar placeholder">
                        <UserRound size={18} />
                      </div>
                    )}
                    <div>
                      <strong>{companion.displayName}</strong>
                      <span>{companion.bio || 'Hồ sơ đang được cập nhật'}</span>
                    </div>
                  </div>

                  {companion.skillsToTeach.length > 0 ? (
                    <div className="session-skill-strip">
                      {companion.skillsToTeach.slice(0, 3).map((s) => (
                        <span key={s}>{s}</span>
                      ))}
                    </div>
                  ) : null}

                  <dl className="session-card-meta">
                    <div>
                      <dt>Đánh giá</dt>
                      <dd>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Star size={13} style={{ color: 'var(--color-warning, #f59e0b)' }} />
                          {companion.avgRating.toFixed(1)} ({companion.totalReviews} đánh giá)
                        </span>
                      </dd>
                    </div>
                    <div>
                      <dt>Giá từ</dt>
                      <dd>{companion.lowestPointCost} điểm</dd>
                    </div>
                    <div>
                      <dt>Lịch gần nhất</dt>
                      <dd>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <CalendarDays size={13} />
                          {formatSessionDateTime(companion.nextScheduledAt)}
                        </span>
                      </dd>
                    </div>
                    <div>
                      <dt>Lịch còn trống</dt>
                      <dd>{companion.matchingSessionCount} buổi</dd>
                    </div>
                  </dl>

                  <div className="session-card-actions">
                    <Link
                      className="button secondary"
                      to={`/dashboard/companions/${companion.companionId}?skillId=${skillId}${deliveryMode ? `&deliveryMode=${deliveryMode}` : ''}${deliveryMode === 'Offline' && location ? `&location=${encodeURIComponent(location)}` : ''}`}
                    >
                      Xem hồ sơ
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}
    </MotionPage>
  )
}
