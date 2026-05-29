import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode, type RefObject } from 'react'
import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import {
  AlertCircle,
  Award,
  CalendarDays,
  Camera,
  Check,
  ChevronDown,
  ChevronRight,
  Clock3,
  Coins,
  CreditCard,
  LayoutGrid,
  LoaderCircle,
  MapPin,
  Plus,
  Save,
  Star,
  Trash2,
  Trophy,
  Upload,
  UserRound,
  Video,
  X,
} from 'lucide-react'
import { getErrorMessage } from '../../api/client'
import { syncProfileCaches } from '../../api/cacheInvalidation'
import { SiteHeader } from '../../components/Brand'
import { MotionPage } from '../../components/MotionPage'
import { showToast } from '../../components/toastEvents'
import { achievementApi, achievementKeys } from '../achievements/achievementApi'
import type { MyAchievementEarnedDto, MyUpcomingAchievementDto } from '../achievements/types'
import { mySpaceApi, mySpaceKeys } from '../my-space/mySpaceApi'
import type { MySpaceSessionDto } from '../my-space/types'
import {
  profileApi,
  profileKeys,
  requestAvatarUploadUrl,
  requestCredentialUploadUrl,
  uploadFileToPresignedUrl,
} from '../profile/profileApi'
import {
  buildProfileUpdatePayload,
  formatLastActive,
  toProfileFormValues,
  validateAvatarFile,
  validateCredentialFile,
  validateProfileForm,
  type ProfileFieldErrors,
} from '../profile/profileUtils'
import type { ProfileDto, ProfileField, ProfileFormValues, UserGender } from '../profile/types'
import { reviewDashboardApi, reviewDashboardKeys } from '../reviews/reviewDashboardApi'
import type { ReviewTaskDto } from '../reviews/types'
import {
  canOpenSessionRoomPage,
  formatSessionDateTime,
  getSessionRoomEntryLabel,
  getSessionRoomRoute,
  getSessionStatusClassName,
  getSessionStatusLabel,
} from '../sessions/sessionUtils'
import type { SessionDto } from '../sessions/types'
import { walletApi, walletKeys } from '../wallet/walletApi'
import type { PaymentStatus, PaymentTransactionDto, PointTransactionDto } from '../wallet/types'
import {
  formatCurrencyVnd,
  formatDateTime,
  formatPoints,
  getPaymentItemLabel,
  getPaymentStatusLabel,
} from '../wallet/walletUtils'

type DashboardTabId = 'profile' | 'my-space' | 'achievements' | 'reviews' | 'transactions'
type MySpaceRole = 'companion' | 'learner'
type ReviewDraft = { task: ReviewTaskDto; rating: 1 | 2 | 3 | 4 | 5; comment: string }

const dashboardTabs: Array<{ id: DashboardTabId; label: string }> = [
  { id: 'profile', label: 'Thông tin chung' },
  { id: 'my-space', label: 'My Space' },
  { id: 'achievements', label: 'Bảng thành tích' },
  { id: 'reviews', label: 'Đánh giá' },
  { id: 'transactions', label: 'Lịch sử giao dịch' },
]

const genderOptions: Array<{ label: string; value: string }> = [
  { label: 'Chưa chọn', value: '' },
  { label: 'Nam', value: 'Male' },
  { label: 'Nữ', value: 'Female' },
  { label: 'Khác', value: 'Other' },
  { label: 'Không muốn chia sẻ', value: 'PreferNotToSay' },
]

function normalizeGenderOptionValue(value: string): UserGender | '' {
  if (value === 'Other') {
    return 'NonBinary'
  }

  return value as UserGender | ''
}

function toDashboardProfileFormValues(profile: ProfileDto): ProfileFormValues {
  const values = toProfileFormValues(profile)

  if (values.credentialUrls.length === 0 && profile.degreeUrl) {
    values.credentialUrls = [profile.degreeUrl]
  }

  return values
}

function getCredentialKind(url: string): 'image' | 'pdf' | 'other' {
  const normalizedUrl = url.split('?')[0].toLowerCase()

  if (normalizedUrl.endsWith('.pdf')) {
    return 'pdf'
  }

  if (
    normalizedUrl.endsWith('.jpg') ||
    normalizedUrl.endsWith('.jpeg') ||
    normalizedUrl.endsWith('.png') ||
    normalizedUrl.endsWith('.webp') ||
    normalizedUrl.endsWith('.gif')
  ) {
    return 'image'
  }

  return 'other'
}

export function DashboardTabsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = normalizeDashboardTab(searchParams.get('tab'))
  const profileQuery = useQuery({
    queryKey: profileKeys.me(),
    queryFn: profileApi.getMyProfile,
  })

  return (
    <MotionPage className="page dashboard-tabs-page">
      <SiteHeader />
      <nav className="dashboard-tab-nav" aria-label="Dashboard tabs">
        {dashboardTabs.map((tab) => (
          <DashboardTabButton
            active={activeTab === tab.id}
            key={tab.id}
            onClick={() => setSearchParams(tab.id === 'profile' ? {} : { tab: tab.id })}
            tab={tab}
          />
        ))}
      </nav>

      {activeTab === 'profile' ? <GeneralInfoTab profileQuery={profileQuery} /> : null}
      {activeTab === 'my-space' ? <MySpaceTab profileQuery={profileQuery} /> : null}
      {activeTab === 'achievements' ? <AchievementsTab /> : null}
      {activeTab === 'reviews' ? <ReviewsTab /> : null}
      {activeTab === 'transactions' ? <TransactionsTab /> : null}
    </MotionPage>
  )
}

function GeneralInfoTab({ profileQuery }: { profileQuery: UseQueryResult<ProfileDto> }) {
  if (profileQuery.isLoading) {
    return <DashboardState label="Đang tải thông tin cá nhân..." />
  }

  if (profileQuery.isError) {
    return <DashboardState error={getErrorMessage(profileQuery.error)} label="Không thể tải thông tin cá nhân" />
  }

  return profileQuery.data ? <GeneralInfoForm key={profileQuery.data.userId} profile={profileQuery.data} /> : null
}

function GeneralInfoForm({ profile }: { profile: ProfileDto }) {
  const queryClient = useQueryClient()
  const avatarInputRef = useRef<HTMLInputElement | null>(null)
  const credentialInputRef = useRef<HTMLInputElement | null>(null)
  const [formValues, setFormValues] = useState<ProfileFormValues>(() => toDashboardProfileFormValues(profile))
  const [initialValues, setInitialValues] = useState<ProfileFormValues>(() => toDashboardProfileFormValues(profile))
  const [fieldErrors, setFieldErrors] = useState<ProfileFieldErrors>({})
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [isUploadingCredential, setIsUploadingCredential] = useState(false)
  const credentialUrls = formValues.credentialUrls
  const credentialCount = Math.max(profile.credentialCount, credentialUrls.length)

  const applyProfileSnapshot = (nextProfile: ProfileDto) => {
    const nextValues = toDashboardProfileFormValues(nextProfile)
    void syncProfileCaches(queryClient, nextProfile)
    setFormValues(nextValues)
    setInitialValues(nextValues)
  }

  const updateMutation = useMutation({
    mutationFn: profileApi.updateMyProfile,
    onSuccess: (updatedProfile) => {
      applyProfileSnapshot(updatedProfile)
      setFieldErrors({})
      showToast({ kind: 'success', message: 'Thông tin cá nhân đã được cập nhật.' })
    },
    onError: (error) => {
      showToast({ kind: 'error', message: getErrorMessage(error) })
    },
  })

  const payload = buildProfileUpdatePayload(formValues, initialValues)
  const isDirty = Object.keys(payload).length > 0

  const handleChange = (field: keyof ProfileFormValues, value: string | boolean | null) => {
    setFormValues((current) => ({ ...current, [field]: value }))
    clearFieldError(field)
  }

  const clearFieldError = (field: ProfileField) => {
    setFieldErrors((current) => {
      if (!current[field]) {
        return current
      }

      const next = { ...current }
      delete next[field]
      return next
    })
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors = validateProfileForm(formValues)
    setFieldErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      showToast({ kind: 'error', message: 'Vui lòng kiểm tra lại thông tin vừa nhập.' })
      return
    }

    if (!isDirty) {
      return
    }

    updateMutation.mutate(payload)
  }

  const handleAvatarInputChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    const validationMessage = validateAvatarFile(file)
    if (validationMessage) {
      showToast({ kind: 'error', message: validationMessage })
      return
    }

    setIsUploadingAvatar(true)

    try {
      const uploadMeta = await requestAvatarUploadUrl(file)
      await uploadFileToPresignedUrl(uploadMeta.uploadUrl, file)
      const updatedProfile = await profileApi.updateMyProfile({ avatarUrl: uploadMeta.publicUrl })
      applyProfileSnapshot(updatedProfile)
      showToast({ kind: 'success', message: 'Ảnh đại diện đã được cập nhật.' })
    } catch (error) {
      showToast({ kind: 'error', message: getErrorMessage(error) })
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  const handleCredentialInputChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    const validationMessage = validateCredentialFile(file)
    if (validationMessage) {
      showToast({ kind: 'error', message: validationMessage })
      return
    }

    setIsUploadingCredential(true)
    clearFieldError('credentialUrls')

    try {
      const uploadMeta = await requestCredentialUploadUrl(file)
      await uploadFileToPresignedUrl(uploadMeta.uploadUrl, file)
      const updatedProfile = await profileApi.updateMyProfile({
        credentialUrls: [...credentialUrls, uploadMeta.publicUrl],
      })
      applyProfileSnapshot(updatedProfile)
      showToast({ kind: 'success', message: 'Chứng chỉ đã được tải lên thành công.' })
    } catch (error) {
      showToast({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Tải chứng chỉ thất bại. Vui lòng thử lại.',
      })
    } finally {
      setIsUploadingCredential(false)
    }
  }

  const handleRemoveCredential = async (urlToRemove: string) => {
    setIsUploadingCredential(true)
    clearFieldError('credentialUrls')

    try {
      const nextUrls = credentialUrls.filter((url) => url !== urlToRemove)
      const updatedProfile = await profileApi.updateMyProfile({
        credentialUrls: nextUrls.length > 0 ? nextUrls : null,
      })
      applyProfileSnapshot(updatedProfile)
      showToast({ kind: 'success', message: 'Chứng chỉ đã được xóa khỏi hồ sơ.' })
    } catch (error) {
      showToast({ kind: 'error', message: getErrorMessage(error) })
    } finally {
      setIsUploadingCredential(false)
    }
  }

  return (
    <section className="dashboard-profile-layout">
      <aside className="dashboard-owner-card">
        <div className="dashboard-avatar-frame">
          {formValues.avatarUrl ? (
            <img alt={formValues.displayName || 'Avatar'} src={formValues.avatarUrl} />
          ) : (
            <UserRound size={70} />
          )}
        </div>
        <h1>{formValues.displayName || 'Chưa cập nhật tên'}</h1>
        <p className="dashboard-owner-location">{formValues.address || 'Chưa cập nhật địa chỉ'}</p>
        <input
          accept="image/jpeg,image/png,image/webp"
          className="dashboard-file-input"
          onChange={handleAvatarInputChange}
          ref={avatarInputRef}
          type="file"
        />
        <button
          className="dashboard-soft-button"
          disabled={isUploadingAvatar}
          onClick={() => avatarInputRef.current?.click()}
          type="button"
        >
          {isUploadingAvatar ? <LoaderCircle className="spin" size={16} /> : <Camera size={16} />}
          Chỉnh sửa ảnh đại diện
        </button>
        <div className="dashboard-owner-meta">
          <span>{formatLastActive(profile.lastActiveAt)}</span>
        </div>
      </aside>

      <form className="dashboard-profile-form" onSubmit={handleSubmit}>
        <div className="dashboard-section-head compact">
          <h2>Thông tin cá nhân</h2>
          <div className="dashboard-form-actions">
            <button className="dashboard-outline-button" type="button" onClick={() => setFormValues(initialValues)}>
              Chỉnh sửa
            </button>
            <button className="dashboard-primary-button" disabled={!isDirty || updateMutation.isPending} type="submit">
              {updateMutation.isPending ? <LoaderCircle className="spin" size={16} /> : <Save size={16} />}
              Submit
            </button>
          </div>
        </div>

        <div className="dashboard-profile-grid">
          <DashboardField error={fieldErrors.displayName} label="Họ và tên">
            <input value={formValues.displayName} onChange={(event) => handleChange('displayName', event.target.value)} />
          </DashboardField>
          <DashboardField error={fieldErrors.dateOfBirth} label="Ngày tháng năm sinh">
            <input
              max={new Date().toISOString().split('T')[0]}
              min="1900-01-01"
              type="date"
              value={formValues.dateOfBirth}
              onChange={(event) => handleChange('dateOfBirth', event.target.value)}
            />
          </DashboardField>
          <DashboardField error={fieldErrors.phone} label="Số điện thoại">
            <input value={formValues.phone} onChange={(event) => handleChange('phone', event.target.value)} />
          </DashboardField>
          <DashboardField error={fieldErrors.gender} label="Giới tính">
            <DashboardGenderSelect
              value={formValues.gender}
              onChange={(value) => handleChange('gender', value)}
            />
          </DashboardField>
          <DashboardField label="Email">
            <input readOnly value={profile.email} />
          </DashboardField>
          <DashboardField error={fieldErrors.socialLinkUrl} label="Mạng xã hội">
            <input
              placeholder="https://..."
              value={formValues.socialLinkUrl}
              onChange={(event) => handleChange('socialLinkUrl', event.target.value)}
            />
          </DashboardField>
          <DashboardField className="full" error={fieldErrors.address} label="Địa chỉ">
            <input value={formValues.address} onChange={(event) => handleChange('address', event.target.value)} />
          </DashboardField>
          <DashboardField className="full" error={fieldErrors.bio} label="Giới thiệu về bản thân">
            <textarea rows={5} value={formValues.bio} onChange={(event) => handleChange('bio', event.target.value)} />
          </DashboardField>
          <DashboardField className="full" error={fieldErrors.credentialUrls} label="Chứng chỉ / Bằng cấp">
            <div className="dashboard-credential-panel">
              <div className="dashboard-credential-meta">
                <strong>{credentialCount}</strong>
                <span>chứng chỉ đã tải lên</span>
              </div>
              <input
                accept="application/pdf,image/jpeg,image/png,image/webp"
                className="dashboard-file-input"
                onChange={handleCredentialInputChange}
                ref={credentialInputRef}
                type="file"
              />
              <div className="dashboard-credential-actions">
                <button
                  className="dashboard-soft-button"
                  disabled={isUploadingCredential}
                  onClick={() => credentialInputRef.current?.click()}
                  type="button"
                >
                  {isUploadingCredential ? <LoaderCircle className="spin" size={16} /> : <Upload size={16} />}
                  {isUploadingCredential ? 'Đang tải...' : 'Tải lên chứng chỉ'}
                </button>
              </div>
              {credentialUrls.length > 0 ? (
                <div className="dashboard-credential-list">
                  {credentialUrls.map((url, index) => {
                    const credentialKind = getCredentialKind(url)

                    return (
                      <article className="dashboard-credential-card" key={url}>
                        <div className="dashboard-credential-preview">
                          {credentialKind === 'image' ? (
                            <img alt={`Chứng chỉ ${index + 1}`} src={url} />
                          ) : credentialKind === 'pdf' ? (
                            <iframe src={url} title={`Chứng chỉ ${index + 1}`} />
                          ) : (
                            <div className="dashboard-credential-fallback">
                              <Award size={28} />
                              <span>Không xem trước được định dạng này</span>
                            </div>
                          )}
                        </div>
                        <div className="dashboard-credential-card-foot">
                          <a className="dashboard-credential-link" href={url} rel="noopener noreferrer" target="_blank">
                            <Award size={16} />
                            {`Chứng chỉ #${index + 1}`}
                          </a>
                          <button
                            aria-label={`Xóa chứng chỉ ${index + 1}`}
                            className="dashboard-credential-remove"
                            disabled={isUploadingCredential}
                            onClick={() => void handleRemoveCredential(url)}
                            type="button"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </article>
                    )
                  })}
                </div>
              ) : (
                <p className="dashboard-credential-empty">Chưa có chứng chỉ nào được cập nhật.</p>
              )}
            </div>
          </DashboardField>
        </div>
      </form>
    </section>
  )
}

function MySpaceTab({ profileQuery }: { profileQuery: UseQueryResult<ProfileDto> }) {
  const mySpaceQuery = useQuery({
    queryKey: mySpaceKeys.me(),
    queryFn: mySpaceApi.getMySpace,
  })

  if (profileQuery.isLoading || mySpaceQuery.isLoading) {
    return <DashboardState label="Đang tải My Space..." />
  }

  if (profileQuery.isError) {
    return <DashboardState error={getErrorMessage(profileQuery.error)} label="Không thể tải hồ sơ" />
  }

  if (mySpaceQuery.isError) {
    return <DashboardState error={getErrorMessage(mySpaceQuery.error)} label="Không thể tải My Space" />
  }

  const profile = profileQuery.data
  const mySpace = mySpaceQuery.data

  if (!profile || !mySpace) {
    return null
  }

  return (
    <section className="dashboard-space-page">
      <MySpaceSection
        ctaDisabled={profile.teachingSkills.length === 0}
        ctaDisabledLabel="Chưa có kỹ năng dạy"
        ctaLabel="Mở buổi học mới"
        ctaTo="/dashboard/skills/new"
        emptyText="Các buổi học bạn mở sẽ xuất hiện ở đây."
        emptyTitle="Chưa có buổi học companion"
        fallbackAvatarUrl={profile.avatarUrl}
        role="companion"
        sessions={mySpace.companionSessions}
        title="Companion Space"
      />
      <MySpaceSection
        ctaLabel="Tìm companion để đặt lịch"
        ctaTo="/dashboard/companions"
        emptyText="Các buổi học bạn đã đăng ký sẽ xuất hiện ở đây."
        emptyTitle="Chưa có buổi học learner"
        fallbackAvatarUrl={profile.avatarUrl}
        role="learner"
        sessions={mySpace.learnerSessions}
        title="Learner Space"
      />
    </section>
  )
}

function DashboardTabButton({
  active,
  onClick,
  tab,
}: {
  active: boolean
  onClick: () => void
  tab: { id: DashboardTabId; label: string }
}) {
  return (
    <button
      aria-current={active ? 'page' : undefined}
      className={`dashboard-tab-pill${active ? ' active' : ''}`}
      onClick={onClick}
      type="button"
    >
      {renderDashboardTabIcon(tab.id)}
      {tab.label}
    </button>
  )
}

function MySpaceSection({
  ctaDisabled = false,
  ctaDisabledLabel,
  ctaLabel,
  ctaTo,
  emptyText,
  emptyTitle,
  fallbackAvatarUrl,
  role,
  sessions,
  title,
}: {
  ctaDisabled?: boolean
  ctaDisabledLabel?: string
  ctaLabel: string
  ctaTo: string
  emptyText: string
  emptyTitle: string
  fallbackAvatarUrl: string | null
  role: MySpaceRole
  sessions: MySpaceSessionDto[]
  title: string
}) {
  const railRef = useRef<HTMLDivElement | null>(null)
  const cardSlotsPerRow = useMySpaceCardSlotsPerRow(railRef)
  const maxSessionsWithoutPagination = Math.max(1, cardSlotsPerRow - 1)
  const hasPagination = sessions.length > maxSessionsWithoutPagination
  const reservedSlots = 1 + (hasPagination ? 1 : 0)
  const sessionsPerPage = Math.max(1, cardSlotsPerRow - reservedSlots)
  const [page, setPage] = useState(0)
  const totalPages = Math.max(1, Math.ceil(sessions.length / sessionsPerPage))
  const startIndex = page * sessionsPerPage
  const visibleSessions = sessions.slice(startIndex, startIndex + sessionsPerPage)

  useEffect(() => {
    setPage((current) => Math.min(current, Math.max(0, totalPages - 1)))
  }, [totalPages])

  const handleNext = () => {
    if (totalPages <= 1) {
      return
    }

    setPage((current) => (current + 1) % totalPages)
  }

  return (
    <section className="dashboard-space-section">
      <div className="dashboard-section-head">
        <h1>{title}</h1>
      </div>
      <div className="dashboard-space-rail" ref={railRef}>
        {ctaDisabled ? (
          <button className="dashboard-add-card" disabled type="button">
            <Plus size={92} />
            {ctaDisabledLabel ?? ctaLabel}
          </button>
        ) : (
          <Link className="dashboard-add-card" to={ctaTo}>
            <Plus size={92} />
            {ctaLabel}
          </Link>
        )}
        {visibleSessions.map((item) => (
          <MySpaceSessionCard
            fallbackAvatarUrl={fallbackAvatarUrl}
            item={item}
            key={item.session.sessionId}
            role={role}
          />
        ))}
        {sessions.length > sessionsPerPage ? (
          <button
            aria-label={`Xem thêm trong ${title}`}
            className="dashboard-space-nav-card"
            onClick={handleNext}
            type="button"
          >
            <ChevronRight size={44} />
            <span>Next</span>
          </button>
        ) : null}
        {sessions.length === 0 ? <DashboardEmpty text={emptyText} title={emptyTitle} /> : null}
      </div>
    </section>
  )
}

function useMySpaceCardSlotsPerRow(containerRef: RefObject<HTMLDivElement | null>) {
  const [cardSlotsPerRow, setCardSlotsPerRow] = useState(3)

  useEffect(() => {
    const element = containerRef.current
    if (!element) {
      return undefined
    }

    const updateSlots = () => {
      const minCardWidth = 220
      const gap = 18
      const width = element.clientWidth
      const slots = Math.max(1, Math.floor((width + gap) / (minCardWidth + gap)))
      setCardSlotsPerRow(slots)
    }

    updateSlots()

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateSlots)
      return () => window.removeEventListener('resize', updateSlots)
    }

    const observer = new ResizeObserver(() => updateSlots())
    observer.observe(element)

    return () => observer.disconnect()
  }, [containerRef])

  return cardSlotsPerRow
}

function MySpaceSessionCard({
  fallbackAvatarUrl,
  item,
  role,
}: {
  fallbackAvatarUrl: string | null
  item: MySpaceSessionDto
  role: MySpaceRole
}) {
  const { session } = item
  const avatarUrl = role === 'learner' ? item.companion.avatarUrl : item.learner?.avatarUrl ?? fallbackAvatarUrl
  const personName =
    role === 'learner'
      ? item.companion.displayName
      : item.learner?.displayName ?? 'Chưa có learner'
  const personLabel = role === 'learner' ? 'Companion' : 'Learner'
  const isOnline = session.deliveryMode === 'Online'
  const roomAccess = item.roomAccess
  const canOpenRoomPage = canOpenSessionRoomPage(roomAccess)
  const detailRoute = `/dashboard/skills/${session.sessionId}`
  const showConfirmLearnerAction = role === 'companion' && session.status === 'Pending' && Boolean(session.learnerId)
  const showRoomEntryAction = isOnline && roomAccess !== undefined

  return (
    <article className="dashboard-space-card">
      <div className="dashboard-space-image">
        {avatarUrl ? (
          <img alt={personName} src={avatarUrl} />
        ) : (
          <UserRound size={44} />
        )}
      </div>
      <div className="dashboard-space-card-head">
        <h2>{session.skill}</h2>
        <strong>{getMySpacePointsLabel(session)}</strong>
      </div>
      <div className="dashboard-review-task-tags">
        <span className={`session-status-chip ${getSessionStatusClassName(session.status)}`}>
          {getSessionStatusLabel(session.status)}
        </span>
        <span className={`session-delivery-badge ${isOnline ? 'online' : 'offline'}`}>
          {isOnline ? <Video size={12} /> : <MapPin size={12} />}
          {isOnline ? 'Online' : 'Trực tiếp'}
        </span>
      </div>
      <dl className="dashboard-card-meta">
        <div>
          <dt>{personLabel}</dt>
          <dd>{personName}</dd>
        </div>
        <div>
          <dt>Thời gian</dt>
          <dd>
            <CalendarDays size={13} />
            {formatSessionDateTime(session.scheduledAt)}
          </dd>
        </div>
        <div>
          <dt>Thời lượng</dt>
          <dd>
            <Clock3 size={13} />
            {getMySpaceDurationLabel(session)}
          </dd>
        </div>
      </dl>
      <p>{session.description || 'Chưa có mô tả buổi học.'}</p>
      <div className="dashboard-space-card-foot">
        <span>{item.skill?.name ?? session.skill}</span>
        {session.jitsiRoomId ? <span>Có phòng Online</span> : null}
      </div>
      <div className="dashboard-space-actions">
        {showConfirmLearnerAction ? (
          <Link className="dashboard-primary-button" to={detailRoute}>
            Xác nhận sinh viên
          </Link>
        ) : showRoomEntryAction ? (
          canOpenRoomPage ? (
            <Link className="dashboard-primary-button" to={getSessionRoomRoute(session.sessionId)}>
              Join session
            </Link>
          ) : (
            <button className="dashboard-primary-button" disabled type="button">
              {getSessionRoomEntryLabel(roomAccess)}
            </button>
          )
        ) : null}
        <Link className="dashboard-outline-button" to={detailRoute}>
          Xem chi tiết
        </Link>
      </div>
    </article>
  )
}

function getMySpaceDurationLabel(session: SessionDto) {
  const durationCandidates = [session.durationMinutes, ...session.durationOptions].filter((duration) => duration > 0)
  const displayDuration = session.selectedDurationMinutes
    ?? (durationCandidates.length > 0 ? Math.max(...durationCandidates) : session.durationMinutes)

  return `${displayDuration} phút`
}

function getMySpacePointsLabel(session: SessionDto) {
  if (session.pricingBreakdown) {
    return `${formatPoints(session.pricingBreakdown.learnerChargePoints)} điểm`
  }

  const preview = session.pricingPreview
  if (preview) {
    const { minLearnerChargePoints, maxLearnerChargePoints } = preview
    return minLearnerChargePoints === maxLearnerChargePoints
      ? `${formatPoints(minLearnerChargePoints)} điểm`
      : `${formatPoints(minLearnerChargePoints)} - ${formatPoints(maxLearnerChargePoints)} điểm`
  }

  return `${formatPoints(session.pointCost)} điểm`
}

function AchievementsTab() {
  const achievementsQuery = useQuery({
    queryKey: achievementKeys.me(),
    queryFn: achievementApi.getMyAchievements,
  })

  if (achievementsQuery.isLoading) {
    return <DashboardState label="Đang tải bảng thành tích..." />
  }

  if (achievementsQuery.isError) {
    return <DashboardState error={getErrorMessage(achievementsQuery.error)} label="Không thể tải bảng thành tích" />
  }

  const data = achievementsQuery.data
  if (!data) {
    return null
  }

  return (
    <section className="dashboard-achievements-page">
      <AchievementStrip achievements={data.earned} />
      <section>
        <h1>Các thành tích sắp đạt được</h1>
        {data.upcoming.length === 0 ? (
          <DashboardEmpty title="Chưa có thành tích sắp đạt" text="Backend chưa trả về thành tích nào trong danh sách sắp đạt." />
        ) : (
          <div className="dashboard-upcoming-grid">
            {data.upcoming.map((achievement) => (
              <UpcomingAchievementCard achievement={achievement} key={achievement.achievementId} />
            ))}
          </div>
        )}
      </section>
    </section>
  )
}

function AchievementStrip({ achievements }: { achievements: MyAchievementEarnedDto[] }) {
  return (
    <section>
      <h1>Các thành tích nổi bật</h1>
      {achievements.length === 0 ? (
        <DashboardEmpty title="Chưa có thành tích nổi bật" text="Hoàn thành thêm hoạt động để mở khóa thành tích." />
      ) : (
        <div className="dashboard-earned-strip">
          {achievements.map((achievement) => (
            <article className="dashboard-earned-card" key={achievement.achievementId}>
              {achievement.iconUrl ? <img alt={achievement.name} src={achievement.iconUrl} /> : <Award size={58} />}
              <div>
                <strong>{achievement.name}</strong>
                <span>{achievement.description}</span>
                <small>{formatDateTime(achievement.awardedAt)}</small>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

function UpcomingAchievementCard({ achievement }: { achievement: MyUpcomingAchievementDto }) {
  const progress = Math.max(0, Math.min(100, achievement.progressPercent))

  return (
    <article className="dashboard-upcoming-card">
      <div className="dashboard-upcoming-icon">
        {achievement.iconUrl ? <img alt={achievement.name} src={achievement.iconUrl} /> : <Award size={42} />}
      </div>
      <h2>{achievement.name}</h2>
      <p>{achievement.description}</p>
      <div className="dashboard-progress-track">
        <span style={{ width: `${progress}%` }} />
      </div>
      <small>
        {formatPoints(achievement.currentValue)} / {formatPoints(achievement.threshold)} · còn {formatPoints(achievement.remainingValue)}
      </small>
    </article>
  )
}

function ReviewsTab() {
  const queryClient = useQueryClient()
  const [reviewDraft, setReviewDraft] = useState<ReviewDraft | null>(null)
  const reviewsQuery = useQuery({
    queryKey: reviewDashboardKeys.me(),
    queryFn: reviewDashboardApi.getMyDashboard,
  })

  const createReviewMutation = useMutation({
    mutationFn: reviewDashboardApi.createReview,
    onSuccess: () => {
      setReviewDraft(null)
      void queryClient.invalidateQueries({ queryKey: reviewDashboardKeys.root() })
      showToast({ kind: 'success', message: 'Đã gửi đánh giá.' })
    },
    onError: (error) => showToast({ kind: 'error', message: getErrorMessage(error) }),
  })

  if (reviewsQuery.isLoading) {
    return <DashboardState label="Đang tải đánh giá..." />
  }

  if (reviewsQuery.isError) {
    return <DashboardState error={getErrorMessage(reviewsQuery.error)} label="Không thể tải đánh giá" />
  }

  const dashboard = reviewsQuery.data
  if (!dashboard) {
    return null
  }

  return (
    <section className="dashboard-reviews-page">
      <h1>Tổng quan đánh giá</h1>
      <section className="dashboard-review-summary">
        <div>
          <strong>{dashboard.receivedSummary.avgRating.toFixed(1)}</strong>
          <span>Điểm trung bình từ {dashboard.receivedSummary.totalReviews} đánh giá</span>
        </div>
        <div className="dashboard-rating-bars">
          {[5, 4, 3, 2, 1].map((rating) => {
            const count = dashboard.receivedSummary.ratingBreakdown.find((item) => item.rating === rating)?.count ?? 0
            const width = dashboard.receivedSummary.totalReviews > 0 ? (count / dashboard.receivedSummary.totalReviews) * 100 : 0
            return (
              <div key={rating}>
                <span>{rating} sao</span>
                <div><i style={{ width: `${width}%` }} /></div>
                <small>{count}</small>
              </div>
            )
          })}
        </div>
        <div className="dashboard-recent-reviews">
          {dashboard.receivedSummary.recentReviews.length === 0 ? (
            <p>Chưa có đánh giá gần đây.</p>
          ) : (
            dashboard.receivedSummary.recentReviews.slice(0, 3).map((review) => (
              <article key={review.reviewId}>
                {review.reviewerAvatarUrl ? <img alt={review.reviewerDisplayName} src={review.reviewerAvatarUrl} /> : <UserRound size={22} />}
                <div>
                  <strong>{review.reviewerDisplayName}</strong>
                  <span>{review.rating} sao · {formatDateTime(review.createdAt)}</span>
                  {review.comment ? <p>{review.comment}</p> : null}
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      <h1>Bài đánh giá</h1>
      <div className="dashboard-review-task-list">
        {dashboard.reviewTasks.length === 0 ? (
          <DashboardEmpty title="Chưa có bài đánh giá cần xử lý" text="Các session đã hoàn thành sẽ xuất hiện tại đây khi backend trả về." />
        ) : (
          dashboard.reviewTasks.map((task) => (
            <ReviewTaskCard
              key={task.sessionId}
              onReview={() => setReviewDraft({ task, rating: 5, comment: '' })}
              task={task}
            />
          ))
        )}
      </div>

      {reviewDraft ? (
        <ReviewModal
          draft={reviewDraft}
          isPending={createReviewMutation.isPending}
          onChange={setReviewDraft}
          onClose={() => setReviewDraft(null)}
          onSubmit={(draft) =>
            createReviewMutation.mutate({
              sessionId: draft.task.sessionId,
              rating: draft.rating,
              comment: draft.comment.trim() || null,
            })
          }
        />
      ) : null}
    </section>
  )
}

function ReviewTaskCard({ onReview, task }: { onReview: () => void; task: ReviewTaskDto }) {
  return (
    <article className="dashboard-review-task">
      {task.revieweeAvatarUrl ? <img alt={task.revieweeDisplayName} src={task.revieweeAvatarUrl} /> : <UserRound size={44} />}
      <div className="dashboard-review-task-main">
        <div>
          <h2>{task.revieweeDisplayName}</h2>
          <span>{task.skillName}</span>
        </div>
        {task.description ? <p>{task.description}</p> : null}
        <div className="dashboard-review-task-tags">
          <span>{formatPoints(task.pricePoints)} điểm</span>
          <span>Hoàn thành {formatDateTime(task.completedAt)}</span>
          {task.reviewStatus === 'can_review' ? <span>Hạn đánh giá {formatDateTime(task.reviewWindowClosesAt)}</span> : null}
        </div>
      </div>
      {task.reviewStatus === 'can_review' ? (
        <button className="dashboard-outline-button" onClick={onReview} type="button">
          Đánh giá ngay
        </button>
      ) : (
        <span className="dashboard-status-chip">{getReviewStatusLabel(task.reviewStatus)}</span>
      )}
    </article>
  )
}

function TransactionsTab() {
  const [pointPage, setPointPage] = useState(1)
  const [paymentPage, setPaymentPage] = useState(1)
  const summaryQuery = useQuery({
    queryKey: walletKeys.summary(),
    queryFn: walletApi.getSummary,
  })
  const pointTransactionsQuery = useQuery({
    queryKey: walletKeys.transactions({ page: pointPage, limit: 20 }),
    queryFn: () => walletApi.getTransactions({ page: pointPage, limit: 20 }),
  })
  const paymentsQuery = useQuery({
    queryKey: walletKeys.payments({ page: paymentPage, limit: 20 }),
    queryFn: () => walletApi.getPayments({ page: paymentPage, limit: 20 }),
  })
  const retryPaymentMutation = useMutation({
    mutationFn: (paymentTransactionId: string) => walletApi.retryPayment(paymentTransactionId),
    onSuccess: (result) => {
      window.location.assign(result.paymentUrl)
    },
    onError: (error) => {
      showToast({ kind: 'error', message: getErrorMessage(error) })
    },
  })

  return (
    <section className="dashboard-transactions-page">
      <div className="dashboard-section-title-row">
        <h1>Lịch sử giao dịch</h1>
        <p>Giữ nguyên những gì ở trong ví điểm</p>
      </div>
      {summaryQuery.isLoading ? <DashboardState label="Đang tải ví điểm..." /> : null}
      {summaryQuery.isError ? <DashboardState error={getErrorMessage(summaryQuery.error)} label="Không thể tải ví điểm" /> : null}
      {summaryQuery.data ? (
        <section className="dashboard-wallet-summary-grid">
          <SummaryTile label="Số dư khả dụng" value={summaryQuery.data.balance} />
          <SummaryTile label="Điểm đang giữ" value={summaryQuery.data.heldBalance} />
          <SummaryTile label="Tổng đã nhận" value={summaryQuery.data.totalEarned} />
          <SummaryTile label="Tổng đã chi" value={summaryQuery.data.totalSpent} />
        </section>
      ) : null}

      <TransactionList
        currentPage={pointPage}
        emptyText="Chưa có lịch sử điểm."
        isError={pointTransactionsQuery.isError}
        isLoading={pointTransactionsQuery.isLoading}
        items={pointTransactionsQuery.data?.data ?? []}
        onPageChange={setPointPage}
        renderItem={(item) => <PointTransactionCard item={item} key={item.pointTransactionId} />}
        title="Biến động điểm"
        total={pointTransactionsQuery.data?.total ?? 0}
      />

      <TransactionList
        currentPage={paymentPage}
        emptyText="Chưa có lịch sử thanh toán."
        isError={paymentsQuery.isError}
        isLoading={paymentsQuery.isLoading}
        items={paymentsQuery.data?.data ?? []}
        onPageChange={setPaymentPage}
        renderItem={(item) => (
          <PaymentTransactionCard
            isRetrying={retryPaymentMutation.isPending && retryPaymentMutation.variables === item.paymentTransactionId}
            item={item}
            key={item.paymentTransactionId}
            onRetry={() => retryPaymentMutation.mutate(item.paymentTransactionId)}
          />
        )}
        title="Thanh toán"
        total={paymentsQuery.data?.total ?? 0}
      />
    </section>
  )
}

function DashboardField({
  children,
  className,
  error,
  label,
}: {
  children: ReactNode
  className?: string
  error?: string
  label: string
}) {
  return (
    <label className={`dashboard-field ${className ?? ''}`.trim()}>
      <span>{label}</span>
      {children}
      {error ? <small>{error}</small> : null}
    </label>
  )
}

function DashboardGenderSelect({
  onChange,
  value,
}: {
  onChange: (value: UserGender | '') => void
  value: UserGender | ''
}) {
  const [isOpen, setIsOpen] = useState(false)
  const selectRef = useRef<HTMLDivElement | null>(null)
  const selectedOption = genderOptions.find((option) => normalizeGenderOptionValue(option.value) === value) ?? genderOptions[0]

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  return (
    <div className="dashboard-select" ref={selectRef}>
      <button
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={`dashboard-select-trigger${isOpen ? ' open' : ''}`}
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <span>{selectedOption.label}</span>
        <ChevronDown className="dashboard-select-chevron" size={17} />
      </button>
      {isOpen ? (
        <div className="dashboard-select-menu" role="listbox">
          {genderOptions.map((option) => {
            const isSelected = normalizeGenderOptionValue(option.value) === value

            return (
              <button
                aria-selected={isSelected}
                className={`dashboard-select-option${isSelected ? ' selected' : ''}`}
                key={option.value || 'empty'}
                onClick={() => {
                  onChange(normalizeGenderOptionValue(option.value))
                  setIsOpen(false)
                }}
                role="option"
                type="button"
              >
                <span>{option.label}</span>
                {isSelected ? <Check size={15} /> : null}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

function DashboardState({ error, label }: { error?: string; label: string }) {
  return (
    <section className={`dashboard-state-card${error ? ' error' : ''}`}>
      {error ? <AlertCircle size={22} /> : <LoaderCircle className="spin" size={22} />}
      <div>
        <h2>{label}</h2>
        {error ? <p>{error}</p> : null}
      </div>
    </section>
  )
}

function DashboardEmpty({ text, title }: { text: string; title: string }) {
  return (
    <section className="dashboard-empty-card">
      <h2>{title}</h2>
      <p>{text}</p>
    </section>
  )
}

function ReviewModal({
  draft,
  isPending,
  onChange,
  onClose,
  onSubmit,
}: {
  draft: ReviewDraft
  isPending: boolean
  onChange: (draft: ReviewDraft) => void
  onClose: () => void
  onSubmit: (draft: ReviewDraft) => void
}) {
  return (
    <div className="dashboard-modal-backdrop">
      <section className="dashboard-review-modal">
        <div className="dashboard-modal-head">
          <h2>Đánh giá {draft.task.revieweeDisplayName}</h2>
          <button aria-label="Đóng" className="dashboard-icon-button" onClick={onClose} type="button">
            <X size={18} />
          </button>
        </div>
        <div className="dashboard-star-row">
          {[1, 2, 3, 4, 5].map((rating) => (
            <button
              aria-label={`${rating} sao`}
              className={rating <= draft.rating ? 'active' : ''}
              key={rating}
              onClick={() => onChange({ ...draft, rating: rating as 1 | 2 | 3 | 4 | 5 })}
              type="button"
            >
              <Star fill="currentColor" size={28} />
            </button>
          ))}
        </div>
        <textarea
          placeholder="Chia sẻ ngắn gọn cảm nhận của bạn"
          rows={4}
          value={draft.comment}
          onChange={(event) => onChange({ ...draft, comment: event.target.value })}
        />
        <button className="dashboard-primary-button wide" disabled={isPending} onClick={() => onSubmit(draft)} type="button">
          {isPending ? <LoaderCircle className="spin" size={16} /> : null}
          Gửi đánh giá
        </button>
      </section>
    </div>
  )
}

function SummaryTile({ label, value }: { label: string; value: number }) {
  return (
    <article className="dashboard-summary-tile">
      <span>{label}</span>
      <strong>{formatPoints(value)}</strong>
    </article>
  )
}

function TransactionList<TItem>({
  currentPage,
  emptyText,
  isError,
  isLoading,
  items,
  onPageChange,
  renderItem,
  title,
  total,
}: {
  currentPage: number
  emptyText: string
  isError: boolean
  isLoading: boolean
  items: TItem[]
  onPageChange: (page: number) => void
  renderItem: (item: TItem) => ReactNode
  title: string
  total: number
}) {
  const totalPages = Math.max(1, Math.ceil(total / 20))

  return (
    <section className="dashboard-transaction-section">
      <h2>{title}</h2>
      {isLoading ? <DashboardState label={`Đang tải ${title.toLowerCase()}...`} /> : null}
      {isError ? <DashboardState error="Không thể tải dữ liệu giao dịch." label={`Không thể tải ${title.toLowerCase()}`} /> : null}
      {!isLoading && !isError && items.length === 0 ? <DashboardEmpty title={emptyText} text="Danh sách hiện chưa có dữ liệu phù hợp." /> : null}
      <div className="dashboard-transaction-list">{items.map(renderItem)}</div>
      {totalPages > 1 ? (
        <div className="dashboard-pagination">
          <button disabled={currentPage <= 1} onClick={() => onPageChange(currentPage - 1)} type="button">
            Trang trước
          </button>
          <span>Trang {currentPage} / {totalPages}</span>
          <button disabled={currentPage >= totalPages} onClick={() => onPageChange(currentPage + 1)} type="button">
            Trang sau
          </button>
        </div>
      ) : null}
    </section>
  )
}

function PointTransactionCard({ item }: { item: PointTransactionDto }) {
  return (
    <article className="dashboard-transaction-card">
      <Coins size={24} />
      <div>
        <strong>{item.note || 'Giao dịch điểm'}</strong>
        <span>{formatDateTime(item.createdAt)}</span>
      </div>
      <div className="dashboard-transaction-amount">
        <strong>{item.amount > 0 ? '+' : ''}{formatPoints(item.amount)} điểm</strong>
        <span>Số dư sau: {formatPoints(item.balanceAfter)}</span>
      </div>
    </article>
  )
}

function PaymentTransactionCard({
  isRetrying = false,
  item,
  onRetry,
}: {
  isRetrying?: boolean
  item: PaymentTransactionDto
  onRetry: () => void
}) {
  return (
    <article className="dashboard-transaction-card">
      <CreditCard size={24} />
      <div>
        <strong>{item.packageName || item.subscriptionPlanName || 'Giao dịch thanh toán'}</strong>
        <span>{getPaymentItemLabel(item)} · {formatDateTime(item.createdAt)}</span>
        <span>Thanh toán lúc: {formatDateTime(item.paidAt)}</span>
      </div>
      <div className="dashboard-transaction-amount">
        <strong>{formatCurrencyVnd(item.amountVnd)} {item.currency}</strong>
        <span>{getPaymentStatusLabel(item.status as PaymentStatus)}</span>
        {item.status === 'Pending' ? (
          <button disabled={isRetrying} onClick={onRetry} type="button">
            Thử lại thanh toán
          </button>
        ) : null}
      </div>
    </article>
  )
}

function normalizeDashboardTab(value: string | null): DashboardTabId {
  if (value === 'my-space' || value === 'achievements' || value === 'reviews' || value === 'transactions') {
    return value
  }

  return 'profile'
}

function renderDashboardTabIcon(tab: DashboardTabId) {
  const iconProps = { className: 'dashboard-tab-icon', size: 16 }

  if (tab === 'my-space') {
    return <LayoutGrid {...iconProps} />
  }

  if (tab === 'achievements') {
    return <Trophy {...iconProps} />
  }

  if (tab === 'reviews') {
    return <Star {...iconProps} />
  }

  if (tab === 'transactions') {
    return <CreditCard {...iconProps} />
  }

  return <UserRound {...iconProps} />
}

function getReviewStatusLabel(status: ReviewTaskDto['reviewStatus']) {
  if (status === 'already_reviewed') {
    return 'Đã đánh giá'
  }

  if (status === 'window_closed') {
    return 'Đã hết hạn'
  }

  return 'Đánh giá ngay'
}
