import { useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  AlertCircle,
  Award,
  BookOpen,
  ChevronDown,
  Clock,
  Code,
  Coins,
  Globe,
  LineChart,
  LoaderCircle,
  Palette,
  Star,
  UserRound,
  Heart,
  Sparkles,
  X,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { getErrorMessage } from '../../api/client'
import { SiteHeader } from '../../components/Brand'
import { MotionPage } from '../../components/MotionPage'
import { SkillAutocomplete } from '../skills/SkillAutocomplete'
import {
  companionApi,
  companionKeys,
  type CompanionSearchParams,
  type CredentialCountGroup,
} from '../sessions/companionApi'

// ─── Constants ───────────────────────────────────────────────────────────────

const COMPANION_LIMIT = 12

const DURATION_OPTIONS: { value: 30 | 45 | 60 | 90 | 120; label: string }[] = [
  { value: 30, label: '30 phút' },
  { value: 45, label: '45 phút' },
  { value: 60, label: '60 phút' },
  { value: 90, label: '90 phút' },
  { value: 120, label: '120 phút' },
]

const CREDENTIAL_OPTIONS: { value: CredentialCountGroup; label: string }[] = [
  { value: 'Zero', label: '0 chứng chỉ' },
  { value: 'One', label: '1 chứng chỉ' },
  { value: 'Two', label: '2 chứng chỉ' },
  { value: 'ThreeOrMore', label: '3+ chứng chỉ' },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mapValidationError(errorCode: string): string {
  switch (errorCode) {
    case 'INVALID_MINIMUM_DURATION':
      return 'Thời lượng không hợp lệ. Vui lòng chọn lại.'
    case 'INVALID_MAX_LEARNER_CHARGE_POINTS':
      return 'Điểm tối đa phải lớn hơn 0.'
    case 'INVALID_CREDENTIAL_COUNT_GROUP':
      return 'Nhóm chứng chỉ không hợp lệ. Vui lòng chọn lại.'
    case 'UNSUPPORTED_DELIVERY_MODE_FILTER':
    case 'UNSUPPORTED_LOCATION_FILTER':
      return 'Tham số tìm kiếm không hợp lệ. Vui lòng thử lại.'
    default:
      return 'Có lỗi xảy ra. Vui lòng thử lại.'
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export function CompanionSearchPage() {
  // Skill
  const [skillId, setSkillId] = useState('')
  const [skillName, setSkillName] = useState('')

  // 3 filter mới
  const [minimumDurationMinutes, setMinimumDurationMinutes] = useState<30 | 45 | 60 | 90 | 120 | undefined>(undefined)
  const [maxLearnerChargePoints, setMaxLearnerChargePoints] = useState<string>('')
  const [credentialCountGroup, setCredentialCountGroup] = useState<CredentialCountGroup | undefined>(undefined)

  // Dropdown state
  const [openDropdown, setOpenDropdown] = useState<'duration' | 'points' | 'credential' | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    if (!openDropdown) return
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [openDropdown])

  const hasActiveFilters = minimumDurationMinutes || (maxLearnerChargePoints && Number(maxLearnerChargePoints) > 0) || credentialCountGroup

  const clearAllFilters = () => {
    setMinimumDurationMinutes(undefined)
    setMaxLearnerChargePoints('')
    setCredentialCountGroup(undefined)
    setOpenDropdown(null)
  }

  // Search state
  const [searchParams, setSearchParams] = useState<CompanionSearchParams | null>(null)

  const searchQuery = useQuery({
    queryKey: companionKeys.search(searchParams!),
    queryFn: () => companionApi.search(searchParams!),
    enabled: searchParams !== null,
  })

  // ─── Handlers ──────────────────────────────────────────────────────────

  const handleSearch = () => {
    if (!skillId) return

    const pointsNum = maxLearnerChargePoints ? Number(maxLearnerChargePoints) : undefined

    const params: CompanionSearchParams = {
      skillId,
      page: 1,
      limit: COMPANION_LIMIT,
    }

    if (minimumDurationMinutes) {
      params.minimumDurationMinutes = minimumDurationMinutes
    }

    if (pointsNum && pointsNum > 0) {
      params.maxLearnerChargePoints = pointsNum
    }

    if (credentialCountGroup) {
      params.credentialCountGroup = credentialCountGroup
    }

    setSearchParams(params)
  }

  const buildDetailLink = (companionId: string) => {
    const qs = new URLSearchParams({ skillId })
    if (minimumDurationMinutes) qs.set('minimumDurationMinutes', String(minimumDurationMinutes))
    if (maxLearnerChargePoints && Number(maxLearnerChargePoints) > 0)
      qs.set('maxLearnerChargePoints', maxLearnerChargePoints)
    if (credentialCountGroup) qs.set('credentialCountGroup', credentialCountGroup)
    return `/dashboard/companions/${companionId}?${qs.toString()}`
  }

  // ─── Derived ───────────────────────────────────────────────────────────

  const companions = searchQuery.data?.data ?? []

  // Extract user-friendly error messages from 422
  const validationMessages: string[] = (() => {
    if (!searchQuery.isError) return []
    const err = searchQuery.error as any
    if (err?.statusCode === 422 && Array.isArray(err?.errors)) {
      return err.errors.map((e: any) => mapValidationError(e.errorCode))
    }
    return []
  })()

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <MotionPage className="page dashboard-page profile-page session-hub-page">
      <SiteHeader />

      {/* ── Hero ── */}
      <section className="discovery-hero-section">
        <div className="discovery-hero-content">
          <h1>Tìm người dạy giỏi nhất</h1>

          {/* Search pill */}
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


            <button
              className="button primary discovery-search-btn"
              disabled={!skillId || searchQuery.isFetching}
              onClick={handleSearch}
              type="button"
            >
              {searchQuery.isFetching ? <LoaderCircle className="spin" size={20} /> : 'Tìm kiếm'}
            </button>
          </div>

          {/* Chip filter bar */}
          <div className="discovery-chip-filters" ref={dropdownRef}>
            {/* Duration chip */}
            <div className="dfilter-chip-wrap">
              <button
                className={`dfilter-chip${minimumDurationMinutes ? ' dfilter-chip--active' : ''}`}
                onClick={() => setOpenDropdown(openDropdown === 'duration' ? null : 'duration')}
                type="button"
              >
                <Clock size={14} />
                <span>{minimumDurationMinutes ? `≥ ${minimumDurationMinutes} phút` : 'Thời lượng'}</span>
                {minimumDurationMinutes ? (
                  <span
                    className="dfilter-chip-clear"
                    onClick={(e) => { e.stopPropagation(); setMinimumDurationMinutes(undefined) }}
                  >
                    <X size={12} />
                  </span>
                ) : (
                  <ChevronDown size={13} className="dfilter-chip-chevron" />
                )}
              </button>
              {openDropdown === 'duration' && (
                <div className="dfilter-dropdown">
                  <button
                    className={`dfilter-dropdown-opt${!minimumDurationMinutes ? ' dfilter-dropdown-opt--selected' : ''}`}
                    onClick={() => { setMinimumDurationMinutes(undefined); setOpenDropdown(null) }}
                    type="button"
                  >
                    Tất cả
                  </button>
                  {DURATION_OPTIONS.map((o) => (
                    <button
                      className={`dfilter-dropdown-opt${minimumDurationMinutes === o.value ? ' dfilter-dropdown-opt--selected' : ''}`}
                      key={o.value}
                      onClick={() => { setMinimumDurationMinutes(o.value); setOpenDropdown(null) }}
                      type="button"
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Points chip */}
            <div className="dfilter-chip-wrap">
              <button
                className={`dfilter-chip${maxLearnerChargePoints && Number(maxLearnerChargePoints) > 0 ? ' dfilter-chip--active' : ''}`}
                onClick={() => setOpenDropdown(openDropdown === 'points' ? null : 'points')}
                type="button"
              >
                <Coins size={14} />
                <span>{maxLearnerChargePoints && Number(maxLearnerChargePoints) > 0 ? `≤ ${maxLearnerChargePoints} điểm` : 'Điểm tối đa'}</span>
                {maxLearnerChargePoints && Number(maxLearnerChargePoints) > 0 ? (
                  <span
                    className="dfilter-chip-clear"
                    onClick={(e) => { e.stopPropagation(); setMaxLearnerChargePoints('') }}
                  >
                    <X size={12} />
                  </span>
                ) : (
                  <ChevronDown size={13} className="dfilter-chip-chevron" />
                )}
              </button>
              {openDropdown === 'points' && (
                <div className="dfilter-dropdown dfilter-dropdown--input">
                  <label className="dfilter-dropdown-label">Nhập điểm tối đa</label>
                  <input
                    className="dfilter-dropdown-input"
                    min={1}
                    onChange={(e) => setMaxLearnerChargePoints(e.target.value)}
                    type="number"
                    value={maxLearnerChargePoints}
                  />
                  <button
                    className="dfilter-dropdown-apply"
                    onClick={() => setOpenDropdown(null)}
                    type="button"
                  >
                    Áp dụng
                  </button>
                </div>
              )}
            </div>

            {/* Credential chip */}
            <div className="dfilter-chip-wrap">
              <button
                className={`dfilter-chip${credentialCountGroup ? ' dfilter-chip--active' : ''}`}
                onClick={() => setOpenDropdown(openDropdown === 'credential' ? null : 'credential')}
                type="button"
              >
                <Award size={14} />
                <span>{credentialCountGroup ? CREDENTIAL_OPTIONS.find(o => o.value === credentialCountGroup)?.label ?? 'Chứng chỉ' : 'Chứng chỉ'}</span>
                {credentialCountGroup ? (
                  <span
                    className="dfilter-chip-clear"
                    onClick={(e) => { e.stopPropagation(); setCredentialCountGroup(undefined) }}
                  >
                    <X size={12} />
                  </span>
                ) : (
                  <ChevronDown size={13} className="dfilter-chip-chevron" />
                )}
              </button>
              {openDropdown === 'credential' && (
                <div className="dfilter-dropdown">
                  <button
                    className={`dfilter-dropdown-opt${!credentialCountGroup ? ' dfilter-dropdown-opt--selected' : ''}`}
                    onClick={() => { setCredentialCountGroup(undefined); setOpenDropdown(null) }}
                    type="button"
                  >
                    Tất cả
                  </button>
                  {CREDENTIAL_OPTIONS.map((o) => (
                    <button
                      className={`dfilter-dropdown-opt${credentialCountGroup === o.value ? ' dfilter-dropdown-opt--selected' : ''}`}
                      key={o.value}
                      onClick={() => { setCredentialCountGroup(o.value); setOpenDropdown(null) }}
                      type="button"
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Clear all */}
            {hasActiveFilters && (
              <button className="dfilter-clear-all" onClick={clearAllFilters} type="button">
                <X size={14} />
                <span>Xóa bộ lọc</span>
              </button>
            )}
          </div>

          {/* Quick skills */}
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

      {/* ── Results ── */}
      {searchQuery.data || searchQuery.isError ? (
        <section className="session-board-shell" style={{ marginTop: '20px' }}>

          {/* Validation errors từ BE */}
          {validationMessages.length > 0 ? (
            <section className="profile-state-card error">
              <AlertCircle size={20} />
              <div>
                {validationMessages.map((msg, i) => (
                  <p key={i} style={{ margin: '0.25rem 0' }}>{msg}</p>
                ))}
              </div>
            </section>
          ) : searchQuery.isError ? (
            <section className="profile-state-card error">
              <AlertCircle size={20} />
              <p>{getErrorMessage(searchQuery.error)}</p>
            </section>
          ) : null}

          {/* Empty state */}
          {searchQuery.data && companions.length === 0 ? (
            <section className="session-empty-state">
              <h3>Không tìm thấy người dạy phù hợp.</h3>
              <p>Thử bỏ bớt điều kiện lọc để xem thêm kết quả.</p>
            </section>
          ) : null}

          {/* Companion cards */}
          {companions.length > 0 ? (
            <div className="discovery-hz-grid">
              {companions.map((companion) => {
                const priceLabel = companion.pricingPreview
                  ? companion.pricingPreview.minLearnerChargePoints === companion.pricingPreview.maxLearnerChargePoints
                    ? `${companion.pricingPreview.minLearnerChargePoints} điểm`
                    : `${companion.pricingPreview.minLearnerChargePoints} – ${companion.pricingPreview.maxLearnerChargePoints} điểm`
                  : `${companion.lowestPointCost} điểm`

                return (
                  <article className="discovery-hz-card" key={companion.companionId}>
                    <Link
                      className="discovery-hz-card-link"
                      to={buildDetailLink(companion.companionId)}
                    >
                      {/* Image block */}
                      <div className="discovery-hz-image">
                        {companion.avatarUrl ? (
                          <img alt={companion.displayName} src={companion.avatarUrl} />
                        ) : (
                          <div className="discovery-hz-placeholder">
                            <UserRound size={48} color="#9ca3af" />
                          </div>
                        )}
                      </div>

                      {/* Info block */}
                      <div className="discovery-hz-info">
                        <div className="discovery-hz-header">
                          <span className="discovery-hz-points">{priceLabel}</span>
                        </div>
                        
                        <div className="discovery-hz-name">
                          <strong>{companion.displayName}</strong>
                        </div>
                        
                        <div className="discovery-hz-rating">
                          {companion.totalReviews > 0 ? (
                            <>
                              <strong>{companion.avgRating.toFixed(1)}</strong>
                              <Star fill="#f59e0b" size={16} style={{ color: '#f59e0b', margin: '0 4px' }} />
                              <span>({companion.totalReviews} Review)</span>
                            </>
                          ) : (
                            <span className="discovery-hz-new">New Companion</span>
                          )}
                        </div>

                        <div className="discovery-hz-skill">
                           {companion.skillsToTeach?.[0] || skillName || 'Tất cả kỹ năng'}
                        </div>

                        <p className="discovery-hz-bio">
                          {companion.bio || 'Hồ sơ đang được cập nhật. Giáo viên chưa có thông tin giới thiệu chi tiết.'}
                        </p>

                        <div className="discovery-hz-tags">
                           {companion.skillsToTeach?.slice(0, 3).map((s, idx) => (
                             <span className="hz-tag" key={idx}>{s}</span>
                           ))}
                           {(!companion.skillsToTeach || companion.skillsToTeach.length === 0) && (
                             <span className="hz-tag">Kỹ năng chung</span>
                           )}
                        </div>

                        <div className="discovery-hz-actions">
                          <span className="hz-btn-view">Xem chi tiết</span>
                          <span className="hz-btn-book" onClick={(e) => { e.preventDefault(); e.stopPropagation(); /* TODO booking */ }}>Đăng Kí</span>
                        </div>
                      </div>
                    </Link>
                  </article>
                )
              })}
            </div>
          ) : null}
        </section>
      ) : null}
    </MotionPage>
  )
}
