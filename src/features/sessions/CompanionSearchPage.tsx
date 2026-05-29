import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  AlertCircle,
  Award,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coins,
  LoaderCircle,
  Star,
  UserRound,
  X,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { getErrorMessage } from '../../api/client'
import { SiteHeader } from '../../components/Brand'
import { MotionPage } from '../../components/MotionPage'
import { skillApi, skillKeys } from '../skills/skillApi'
import { getSkillIcon } from '../skills/skillIcons'
import { SkillAutocomplete } from '../skills/SkillAutocomplete'
import {
  companionApi,
  companionKeys,
  type CompanionSearchParams,
  type CompanionValidationError,
  type CredentialCountGroup,
} from '../sessions/companionApi'

const COMPANION_LIMIT = 12
const QUICK_SKILLS_WINDOW = 5

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

export function CompanionSearchPage() {
  const [skillId, setSkillId] = useState('')
  const [skillName, setSkillName] = useState('')
  const [minimumDurationMinutes, setMinimumDurationMinutes] = useState<30 | 45 | 60 | 90 | 120 | undefined>(
    undefined,
  )
  const [maxLearnerChargePoints, setMaxLearnerChargePoints] = useState('')
  const [credentialCountGroup, setCredentialCountGroup] = useState<CredentialCountGroup | undefined>(undefined)
  const [openDropdown, setOpenDropdown] = useState<'duration' | 'points' | 'credential' | null>(null)
  const [searchParams, setSearchParams] = useState<CompanionSearchParams | null>(null)
  const [quickSkillsStartIndex, setQuickSkillsStartIndex] = useState(0)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!openDropdown) {
      return
    }

    const handleClick = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null)
      }
    }

    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [openDropdown])

  const searchQuery = useQuery({
    queryKey: companionKeys.search(searchParams!),
    queryFn: () => companionApi.search(searchParams!),
    enabled: searchParams !== null,
    staleTime: 60 * 1000,
  })

  const quickSkillsQuery = useQuery({
    queryKey: skillKeys.search({ limit: 100 }),
    queryFn: () => skillApi.search({ limit: 100 }),
    staleTime: 5 * 60 * 1000,
  })

  const hasActiveFilters =
    minimumDurationMinutes ||
    (maxLearnerChargePoints && Number(maxLearnerChargePoints) > 0) ||
    credentialCountGroup

  const clearAllFilters = () => {
    setMinimumDurationMinutes(undefined)
    setMaxLearnerChargePoints('')
    setCredentialCountGroup(undefined)
    setOpenDropdown(null)
  }

  const handleSearch = (overrideSkillId?: string) => {
    const activeSkillId = overrideSkillId || skillId
    if (!activeSkillId) {
      return
    }

    const pointsNum = maxLearnerChargePoints ? Number(maxLearnerChargePoints) : undefined

    const params: CompanionSearchParams = {
      skillId: activeSkillId,
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

  const buildProfileLink = (companionId: string) => {
    const queryString = new URLSearchParams({ skillId })

    return `/dashboard/companions/${companionId}?${queryString.toString()}`
  }

  const buildSkillDetailLink = (companionId: string) => `/dashboard/companions/${companionId}/skills/${skillId}`

  const companions = searchQuery.data?.data ?? []
  const quickSkills = quickSkillsQuery.data ?? []
  const visibleQuickSkills = quickSkills.slice(quickSkillsStartIndex, quickSkillsStartIndex + QUICK_SKILLS_WINDOW)
  const canShowPreviousQuickSkills = quickSkillsStartIndex > 0
  const canShowNextQuickSkills = quickSkillsStartIndex + QUICK_SKILLS_WINDOW < quickSkills.length

  const validationMessages: string[] = (() => {
    if (!searchQuery.isError) {
      return []
    }

    const error = searchQuery.error as unknown as CompanionValidationError | undefined
    if (error?.statusCode === 422 && Array.isArray(error?.errors)) {
      return error.errors.map((item) => mapValidationError(item.errorCode))
    }

    return []
  })()

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
                onRemove={() => {
                  setSkillId('')
                  setSkillName('')
                }}
                onSelect={(name) => setSkillName(name)}
                onSelectWithId={(id, name) => {
                  setSkillId(id)
                  setSkillName(name)
                  handleSearch(id)
                }}
                placeholder="Hãy thử học thêm..."
                selectedSkills={skillName ? [skillName] : []}
              />
            </div>

            <button
              className="button primary discovery-search-btn"
              disabled={!skillId || searchQuery.isFetching}
              onClick={() => handleSearch()}
              type="button"
            >
              {searchQuery.isFetching ? <LoaderCircle className="spin" size={20} /> : 'Tìm kiếm'}
            </button>
          </div>

          <div className="discovery-chip-filters" ref={dropdownRef}>
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
                    onClick={(event) => {
                      event.stopPropagation()
                      setMinimumDurationMinutes(undefined)
                    }}
                  >
                    <X size={12} />
                  </span>
                ) : (
                  <ChevronDown className="dfilter-chip-chevron" size={13} />
                )}
              </button>

              {openDropdown === 'duration' ? (
                <div className="dfilter-dropdown">
                  <button
                    className={`dfilter-dropdown-opt${!minimumDurationMinutes ? ' dfilter-dropdown-opt--selected' : ''}`}
                    onClick={() => {
                      setMinimumDurationMinutes(undefined)
                      setOpenDropdown(null)
                    }}
                    type="button"
                  >
                    Tất cả
                  </button>
                  {DURATION_OPTIONS.map((option) => (
                    <button
                      className={`dfilter-dropdown-opt${minimumDurationMinutes === option.value ? ' dfilter-dropdown-opt--selected' : ''}`}
                      key={option.value}
                      onClick={() => {
                        setMinimumDurationMinutes(option.value)
                        setOpenDropdown(null)
                      }}
                      type="button"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="dfilter-chip-wrap">
              <button
                className={`dfilter-chip${
                  maxLearnerChargePoints && Number(maxLearnerChargePoints) > 0 ? ' dfilter-chip--active' : ''
                }`}
                onClick={() => setOpenDropdown(openDropdown === 'points' ? null : 'points')}
                type="button"
              >
                <Coins size={14} />
                <span>
                  {maxLearnerChargePoints && Number(maxLearnerChargePoints) > 0
                    ? `≤ ${maxLearnerChargePoints} điểm`
                    : 'Điểm tối đa'}
                </span>
                {maxLearnerChargePoints && Number(maxLearnerChargePoints) > 0 ? (
                  <span
                    className="dfilter-chip-clear"
                    onClick={(event) => {
                      event.stopPropagation()
                      setMaxLearnerChargePoints('')
                    }}
                  >
                    <X size={12} />
                  </span>
                ) : (
                  <ChevronDown className="dfilter-chip-chevron" size={13} />
                )}
              </button>

              {openDropdown === 'points' ? (
                <div className="dfilter-dropdown dfilter-dropdown--input">
                  <label className="dfilter-dropdown-label">Nhập điểm tối đa</label>
                  <input
                    className="dfilter-dropdown-input"
                    min={1}
                    onChange={(event) => setMaxLearnerChargePoints(event.target.value)}
                    type="number"
                    value={maxLearnerChargePoints}
                  />
                  <button className="dfilter-dropdown-apply" onClick={() => setOpenDropdown(null)} type="button">
                    Áp dụng
                  </button>
                </div>
              ) : null}
            </div>

            <div className="dfilter-chip-wrap">
              <button
                className={`dfilter-chip${credentialCountGroup ? ' dfilter-chip--active' : ''}`}
                onClick={() => setOpenDropdown(openDropdown === 'credential' ? null : 'credential')}
                type="button"
              >
                <Award size={14} />
                <span>
                  {credentialCountGroup
                    ? CREDENTIAL_OPTIONS.find((option) => option.value === credentialCountGroup)?.label ?? 'Chứng chỉ'
                    : 'Chứng chỉ'}
                </span>
                {credentialCountGroup ? (
                  <span
                    className="dfilter-chip-clear"
                    onClick={(event) => {
                      event.stopPropagation()
                      setCredentialCountGroup(undefined)
                    }}
                  >
                    <X size={12} />
                  </span>
                ) : (
                  <ChevronDown className="dfilter-chip-chevron" size={13} />
                )}
              </button>

              {openDropdown === 'credential' ? (
                <div className="dfilter-dropdown">
                  <button
                    className={`dfilter-dropdown-opt${!credentialCountGroup ? ' dfilter-dropdown-opt--selected' : ''}`}
                    onClick={() => {
                      setCredentialCountGroup(undefined)
                      setOpenDropdown(null)
                    }}
                    type="button"
                  >
                    Tất cả
                  </button>
                  {CREDENTIAL_OPTIONS.map((option) => (
                    <button
                      className={`dfilter-dropdown-opt${credentialCountGroup === option.value ? ' dfilter-dropdown-opt--selected' : ''}`}
                      key={option.value}
                      onClick={() => {
                        setCredentialCountGroup(option.value)
                        setOpenDropdown(null)
                      }}
                      type="button"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            {hasActiveFilters ? (
              <button className="dfilter-clear-all" onClick={clearAllFilters} type="button">
                <X size={14} />
                <span>Xóa bộ lọc</span>
              </button>
            ) : null}
          </div>

          {!quickSkillsQuery.isLoading && !quickSkillsQuery.isError && visibleQuickSkills.length > 0 ? (
            <div className="discovery-quick-skills">
              <button
                aria-hidden={!canShowPreviousQuickSkills}
                aria-label="Hiển thị kỹ năng trước"
                className={`quick-skill-chip quick-skill-chip-more ${!canShowPreviousQuickSkills ? 'is-hidden' : ''}`}
                disabled={!canShowPreviousQuickSkills}
                onClick={() => setQuickSkillsStartIndex((current) => Math.max(0, current - 1))}
                type="button"
              >
                <ChevronLeft size={18} />
              </button>

              <div className="discovery-quick-skills-track">
                {visibleQuickSkills.map((skill) => {
                  const SkillIcon = getSkillIcon(skill.iconKey)

                  return (
                    <button
                      className="quick-skill-chip"
                      key={skill.id}
                      onClick={() => {
                        setSkillId(skill.id)
                        setSkillName(skill.name)
                        handleSearch(skill.id)
                      }}
                      type="button"
                    >
                      <SkillIcon size={18} />
                      <span>{skill.name}</span>
                    </button>
                  )
                })}
              </div>

              <button
                aria-hidden={!canShowNextQuickSkills}
                aria-label="Hiển thị thêm kỹ năng"
                className={`quick-skill-chip quick-skill-chip-more ${!canShowNextQuickSkills ? 'is-hidden' : ''}`}
                disabled={!canShowNextQuickSkills}
                onClick={() => setQuickSkillsStartIndex((current) => current + 1)}
                type="button"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          ) : null}
        </div>
      </section>

      {searchQuery.data || searchQuery.isError ? (
        <section className="session-board-shell" style={{ marginTop: '20px' }}>
          {validationMessages.length > 0 ? (
            <section className="profile-state-card error">
              <AlertCircle size={20} />
              <div>
                {validationMessages.map((message, index) => (
                  <p key={index} style={{ margin: '0.25rem 0' }}>
                    {message}
                  </p>
                ))}
              </div>
            </section>
          ) : searchQuery.isError ? (
            <section className="profile-state-card error">
              <AlertCircle size={20} />
              <p>{getErrorMessage(searchQuery.error)}</p>
            </section>
          ) : null}

          {searchQuery.data && companions.length === 0 ? (
            <section className="session-empty-state">
              <h3>Không tìm thấy người dạy phù hợp.</h3>
              <p>Thử bỏ bớt điều kiện lọc để xem thêm kết quả.</p>
            </section>
          ) : null}

          {companions.length > 0 ? (
            <div className="discovery-hz-grid">
              {companions.map((companion) => {
                const priceLabel = companion.pricingPreview
                  ? companion.pricingPreview.minLearnerChargePoints === companion.pricingPreview.maxLearnerChargePoints
                    ? `${companion.pricingPreview.minLearnerChargePoints} điểm`
                    : `${companion.pricingPreview.minLearnerChargePoints} – ${companion.pricingPreview.maxLearnerChargePoints} điểm`
                  : `${companion.lowestPointCost} điểm`

                const featuredSkill = companion.skillsToTeach?.[0] || skillName || 'Tất cả kỹ năng'

                return (
                  <article
                    className="discovery-hz-card"
                    key={companion.companionId}
                  >
                    <div className="discovery-hz-card-link">
                      <Link
                        aria-label={`Xem profile ${companion.displayName}`}
                        className="discovery-hz-image"
                        to={buildProfileLink(companion.companionId)}
                      >
                        {companion.avatarUrl ? (
                          <img alt={companion.displayName} src={companion.avatarUrl} />
                        ) : (
                          <div className="discovery-hz-placeholder">
                            <UserRound color="#9ca3af" size={48} />
                          </div>
                        )}
                      </Link>

                      <div className="discovery-hz-info">
                        <div className="discovery-hz-header">
                          <div className="discovery-hz-price-stack">
                            <span className="discovery-hz-points">{priceLabel}</span>
                            {companion.subscriptionBadge ? (
                              <span className="wallet-premium-badge search-premium-badge">
                                {companion.subscriptionBadge}
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <div className="discovery-hz-name">
                          <Link className="discovery-hz-name-link" to={buildProfileLink(companion.companionId)}>
                            <strong>{companion.displayName}</strong>
                          </Link>
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

                        {/* <div className="discovery-hz-skill" title={featuredSkill}>
                          {featuredSkill}
                        </div> */}

                        <p className="discovery-hz-bio">
                          {companion.bio || 'Hồ sơ đang được cập nhật. Giáo viên chưa có thông tin giới thiệu chi tiết.'}
                        </p>

                        <div className="discovery-hz-tags">
                          {companion.skillsToTeach?.slice(0, 3).map((skill) => (
                            <span className="hz-tag" key={skill}>
                              {skill}
                            </span>
                          ))}
                          {(!companion.skillsToTeach || companion.skillsToTeach.length === 0) && (
                            <span className="hz-tag">Kỹ năng chung</span>
                          )}
                        </div>

                        <div className="discovery-hz-actions">
                          <Link className="hz-btn-view" to={buildSkillDetailLink(companion.companionId)}>
                            Xem chi tiết
                          </Link>
                          <Link className="hz-btn-book" to={buildProfileLink(companion.companionId)}>
                            Profile
                          </Link>
                        </div>
                      </div>
                    </div>
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
