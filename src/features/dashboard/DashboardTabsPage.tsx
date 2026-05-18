import { useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import {
  AlertCircle,
  Award,
  Camera,
  Coins,
  CreditCard,
  LoaderCircle,
  Plus,
  Save,
  Star,
  Trash2,
  Upload,
  UserRound,
  X,
} from 'lucide-react'
import { getErrorMessage } from '../../api/client'
import { SiteHeader } from '../../components/Brand'
import { MotionPage } from '../../components/MotionPage'
import { showToast } from '../../components/toastEvents'
import { achievementApi, achievementKeys } from '../achievements/achievementApi'
import type { MyAchievementEarnedDto, MyUpcomingAchievementDto } from '../achievements/types'
import { mySpaceApi, mySpaceKeys } from '../my-space/mySpaceApi'
import type {
  CompanionSpaceCardDto,
  CreateCompanionSpaceCardRequest,
  CreateLearnerSpaceCardRequest,
  LearnerSpaceCardDto,
  SessionDeliveryMode,
} from '../my-space/types'
import {
  profileApi,
  profileKeys,
  requestAvatarUploadUrl,
  uploadFileToPresignedUrl,
} from '../profile/profileApi'
import {
  buildProfileUpdatePayload,
  formatLastActive,
  toProfileFormValues,
  validateAvatarFile,
  validateProfileForm,
  type ProfileFieldErrors,
} from '../profile/profileUtils'
import type { ProfileDto, ProfileField, ProfileFormValues, ProfileSkillDto, UserGender } from '../profile/types'
import { reviewDashboardApi, reviewDashboardKeys } from '../reviews/reviewDashboardApi'
import type { ReviewTaskDto } from '../reviews/types'
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
type MySpaceCard = CompanionSpaceCardDto | LearnerSpaceCardDto
type MySpaceModalState =
  | { role: MySpaceRole; mode: 'create'; card?: never }
  | { role: MySpaceRole; mode: 'edit'; card: MySpaceCard }
type ReviewDraft = { task: ReviewTaskDto; rating: 1 | 2 | 3 | 4 | 5; comment: string }

const dashboardTabs: Array<{ id: DashboardTabId; label: string }> = [
  { id: 'profile', label: 'Thông tin chung' },
  { id: 'my-space', label: 'My Space' },
  { id: 'achievements', label: 'Bảng thành tích' },
  { id: 'reviews', label: 'Đánh giá' },
  { id: 'transactions', label: 'Lịch sử giao dịch' },
]

const durationOptions = [30, 45, 60, 90, 120] as const
const deliveryModeOptions: SessionDeliveryMode[] = ['Online', 'Offline']

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
          <button
            aria-current={activeTab === tab.id ? 'page' : undefined}
            className={`dashboard-tab-pill${activeTab === tab.id ? ' active' : ''}`}
            key={tab.id}
            onClick={() => setSearchParams(tab.id === 'profile' ? {} : { tab: tab.id })}
            type="button"
          >
            {tab.label}
          </button>
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
  const [formValues, setFormValues] = useState<ProfileFormValues>(() => toProfileFormValues(profile))
  const [initialValues, setInitialValues] = useState<ProfileFormValues>(() => toProfileFormValues(profile))
  const [fieldErrors, setFieldErrors] = useState<ProfileFieldErrors>({})
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)

  const updateMutation = useMutation({
    mutationFn: profileApi.updateMyProfile,
    onSuccess: (updatedProfile) => {
      const nextValues = toProfileFormValues(updatedProfile)
      queryClient.setQueryData(profileKeys.me(), updatedProfile)
      setFormValues(nextValues)
      setInitialValues(nextValues)
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
      const nextValues = toProfileFormValues(updatedProfile)
      queryClient.setQueryData(profileKeys.me(), updatedProfile)
      setFormValues(nextValues)
      setInitialValues(nextValues)
      showToast({ kind: 'success', message: 'Ảnh đại diện đã được cập nhật.' })
    } catch (error) {
      showToast({ kind: 'error', message: getErrorMessage(error) })
    } finally {
      setIsUploadingAvatar(false)
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
          <span>{profile.roles.includes('companion') ? 'Companion' : 'Learner'}</span>
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
            <select
              value={formValues.gender}
              onChange={(event) => handleChange('gender', event.target.value as UserGender | '')}
            >
              <option value="">Chưa chọn</option>
              <option value="Male">Nam</option>
              <option value="Female">Nữ</option>
              <option value="NonBinary">Phi nhị nguyên</option>
              <option value="PreferNotToSay">Không muốn chia sẻ</option>
            </select>
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
        </div>
      </form>
    </section>
  )
}

function MySpaceTab({ profileQuery }: { profileQuery: UseQueryResult<ProfileDto> }) {
  const queryClient = useQueryClient()
  const [modalState, setModalState] = useState<MySpaceModalState | null>(null)
  const [previewCard, setPreviewCard] = useState<MySpaceCard | null>(null)
  const mySpaceQuery = useQuery({
    queryKey: mySpaceKeys.me(),
    queryFn: mySpaceApi.getMySpace,
  })

  const deleteCompanionMutation = useMutation({
    mutationFn: mySpaceApi.deleteCompanionCard,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: mySpaceKeys.me() })
      showToast({ kind: 'success', message: 'Đã xóa thẻ companion.' })
    },
    onError: (error) => showToast({ kind: 'error', message: getErrorMessage(error) }),
  })

  const deleteLearnerMutation = useMutation({
    mutationFn: mySpaceApi.deleteLearnerCard,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: mySpaceKeys.me() })
      showToast({ kind: 'success', message: 'Đã xóa thẻ learner.' })
    },
    onError: (error) => showToast({ kind: 'error', message: getErrorMessage(error) }),
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
        addDisabled={profile.teachingSkills.length === 0}
        cards={mySpace.companionCards}
        fallbackAvatarUrl={profile.avatarUrl}
        onAdd={() => setModalState({ role: 'companion', mode: 'create' })}
        onDelete={(card) => deleteCompanionMutation.mutate(card.companionSpaceCardId)}
        onEdit={(card) => setModalState({ role: 'companion', mode: 'edit', card })}
        onPreview={setPreviewCard}
        role="companion"
        title="Companion Space"
      />
      <MySpaceSection
        addDisabled={profile.learningSkills.length === 0}
        cards={mySpace.learnerCards}
        fallbackAvatarUrl={profile.avatarUrl}
        onAdd={() => setModalState({ role: 'learner', mode: 'create' })}
        onDelete={(card) => deleteLearnerMutation.mutate(card.learnerSpaceCardId)}
        onEdit={(card) => setModalState({ role: 'learner', mode: 'edit', card })}
        onPreview={setPreviewCard}
        role="learner"
        title="Learner Space"
      />

      {modalState ? (
        <MySpaceCardModal
          modalState={modalState}
          onClose={() => setModalState(null)}
          profile={profile}
        />
      ) : null}
      {previewCard ? <MySpacePreviewModal card={previewCard} onClose={() => setPreviewCard(null)} /> : null}
    </section>
  )
}

function MySpaceSection<TCard extends MySpaceCard>({
  addDisabled,
  cards,
  fallbackAvatarUrl,
  onAdd,
  onDelete,
  onEdit,
  onPreview,
  role,
  title,
}: {
  addDisabled: boolean
  cards: TCard[]
  fallbackAvatarUrl: string | null
  onAdd: () => void
  onDelete: (card: TCard) => void
  onEdit: (card: TCard) => void
  onPreview: (card: TCard) => void
  role: MySpaceRole
  title: string
}) {
  return (
    <section className="dashboard-space-section">
      <div className="dashboard-section-head">
        <h1>{title}</h1>
      </div>
      <div className="dashboard-space-rail">
        <button className="dashboard-add-card" disabled={addDisabled} onClick={onAdd} type="button">
          <Plus size={92} />
          {addDisabled ? 'Chưa có kỹ năng phù hợp' : 'Thêm thẻ'}
        </button>
        {cards.map((card) => (
          <MySpaceCardItem
            card={card}
            fallbackAvatarUrl={fallbackAvatarUrl}
            key={getMySpaceCardId(card)}
            onDelete={() => onDelete(card)}
            onEdit={() => onEdit(card)}
            onPreview={() => onPreview(card)}
            role={role}
          />
        ))}
      </div>
    </section>
  )
}

function MySpaceCardItem({
  card,
  fallbackAvatarUrl,
  onDelete,
  onEdit,
  onPreview,
  role,
}: {
  card: MySpaceCard
  fallbackAvatarUrl: string | null
  onDelete: () => void
  onEdit: () => void
  onPreview: () => void
  role: MySpaceRole
}) {
  const points = role === 'companion' ? (card as CompanionSpaceCardDto).pricePoints : (card as LearnerSpaceCardDto).targetPoints

  return (
    <article className="dashboard-space-card">
      <div className="dashboard-space-image">
        {card.coverImageUrl || fallbackAvatarUrl ? (
          <img alt={card.title} src={card.coverImageUrl ?? fallbackAvatarUrl ?? ''} />
        ) : (
          <UserRound size={44} />
        )}
      </div>
      <div className="dashboard-space-card-head">
        <h2>{card.title}</h2>
        <strong>{formatPoints(points)} Điểm</strong>
      </div>
      <h3>About the lesson</h3>
      <dl className="dashboard-card-meta">
        <div>
          <dt>Thời lượng</dt>
          <dd>{card.durationMinutes} phút</dd>
        </div>
        <div>
          <dt>Hình thức</dt>
          <dd>{card.deliveryModes.join(', ') || 'Chưa chọn'}</dd>
        </div>
        <div>
          <dt>Ngôn ngữ</dt>
          <dd>{card.languages.join(', ') || 'Chưa chọn'}</dd>
        </div>
      </dl>
      <p>{card.description || 'Chưa có mô tả kỹ năng.'}</p>
      <div className="dashboard-space-card-foot">
        <span>{card.isPublished ? 'Đang hiển thị' : 'Bản nháp'}</span>
        {role === 'companion' ? <span>{(card as CompanionSpaceCardDto).credentialUrls.length} chứng chỉ</span> : null}
      </div>
      <div className="dashboard-space-actions">
        <button className="dashboard-outline-button" onClick={onEdit} type="button">
          Chỉnh sửa
        </button>
        <button className="dashboard-outline-button" onClick={onPreview} type="button">
          Xem trước
        </button>
        <button className="dashboard-icon-button" aria-label="Xóa thẻ" onClick={onDelete} type="button">
          <Trash2 size={16} />
        </button>
      </div>
    </article>
  )
}

function MySpaceCardModal({
  modalState,
  onClose,
  profile,
}: {
  modalState: MySpaceModalState
  onClose: () => void
  profile: ProfileDto
}) {
  const queryClient = useQueryClient()
  const coverInputRef = useRef<HTMLInputElement | null>(null)
  const credentialInputRef = useRef<HTMLInputElement | null>(null)
  const role = modalState.role
  const card = modalState.mode === 'edit' ? modalState.card : null
  const skillOptions = role === 'companion' ? profile.teachingSkills : profile.learningSkills
  const [form, setForm] = useState(() => toMySpaceForm(card, skillOptions))
  const [isUploading, setIsUploading] = useState(false)

  const saveCompanionMutation = useMutation({
    mutationFn: (payload: CreateCompanionSpaceCardRequest) =>
      modalState.mode === 'edit' && role === 'companion'
        ? mySpaceApi.updateCompanionCard((modalState.card as CompanionSpaceCardDto).companionSpaceCardId, payload)
        : mySpaceApi.createCompanionCard(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: mySpaceKeys.me() })
      showToast({ kind: 'success', message: 'Đã lưu thẻ companion.' })
      onClose()
    },
    onError: (error) => showToast({ kind: 'error', message: getErrorMessage(error) }),
  })

  const saveLearnerMutation = useMutation({
    mutationFn: (payload: CreateLearnerSpaceCardRequest) =>
      modalState.mode === 'edit' && role === 'learner'
        ? mySpaceApi.updateLearnerCard((modalState.card as LearnerSpaceCardDto).learnerSpaceCardId, payload)
        : mySpaceApi.createLearnerCard(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: mySpaceKeys.me() })
      showToast({ kind: 'success', message: 'Đã lưu thẻ learner.' })
      onClose()
    },
    onError: (error) => showToast({ kind: 'error', message: getErrorMessage(error) }),
  })

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const languages = parseCsv(form.languagesText).slice(0, 3)
    const basePayload = {
      skillId: form.skillId,
      title: form.title.trim(),
      description: form.description.trim() || null,
      durationMinutes: form.durationMinutes,
      deliveryModes: form.deliveryModes,
      languages,
      coverImageUrl: form.coverImageUrl || null,
      isPublished: form.isPublished,
    }

    if (!basePayload.skillId || !basePayload.title || basePayload.deliveryModes.length === 0) {
      showToast({ kind: 'error', message: 'Vui lòng nhập kỹ năng, tiêu đề và hình thức học.' })
      return
    }

    if (role === 'companion') {
      saveCompanionMutation.mutate({
        ...basePayload,
        pricePoints: Number(form.points),
        credentialUrls: form.credentialUrls,
      })
      return
    }

    saveLearnerMutation.mutate({
      ...basePayload,
      targetPoints: Number(form.points),
    })
  }

  const handleCoverUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) {
      return
    }

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      showToast({ kind: 'error', message: 'Ảnh bìa chỉ hỗ trợ JPG, PNG, WEBP và tối đa 5 MB.' })
      return
    }

    setIsUploading(true)
    try {
      const uploadMeta = await mySpaceApi.createCoverUploadUrl({
        fileName: file.name,
        contentType: file.type as 'image/jpeg' | 'image/png' | 'image/webp',
        fileSize: file.size,
      })
      await uploadFileToPresignedUrl(uploadMeta.uploadUrl, file)
      setForm((current) => ({ ...current, coverImageUrl: uploadMeta.publicUrl }))
    } catch (error) {
      showToast({ kind: 'error', message: getErrorMessage(error) })
    } finally {
      setIsUploading(false)
    }
  }

  const handleCredentialUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) {
      return
    }

    if (form.credentialUrls.length >= 4) {
      showToast({ kind: 'error', message: 'Tối đa 4 file chứng chỉ cho mỗi thẻ companion.' })
      return
    }

    if (!['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) {
      showToast({ kind: 'error', message: 'Chứng chỉ chỉ hỗ trợ PDF/JPG/PNG/WEBP và tối đa 10 MB.' })
      return
    }

    setIsUploading(true)
    try {
      const uploadMeta = await mySpaceApi.createCredentialUploadUrl({
        fileName: file.name,
        contentType: file.type as 'application/pdf' | 'image/jpeg' | 'image/png' | 'image/webp',
        fileSize: file.size,
      })
      await uploadFileToPresignedUrl(uploadMeta.uploadUrl, file)
      setForm((current) => ({ ...current, credentialUrls: [...current.credentialUrls, uploadMeta.publicUrl] }))
    } catch (error) {
      showToast({ kind: 'error', message: getErrorMessage(error) })
    } finally {
      setIsUploading(false)
    }
  }

  const isPending = saveCompanionMutation.isPending || saveLearnerMutation.isPending

  return (
    <div className="dashboard-modal-backdrop">
      <form className="dashboard-space-modal" onSubmit={handleSubmit}>
        <div className="dashboard-modal-head">
          <h2>{modalState.mode === 'create' ? 'Đăng tải kỹ năng' : 'Chỉnh sửa kỹ năng'}</h2>
          <button aria-label="Đóng" className="dashboard-icon-button" onClick={onClose} type="button">
            <X size={18} />
          </button>
        </div>

        <div className="dashboard-space-modal-grid">
          <div className="dashboard-space-modal-fields">
            <DashboardField label="Kĩ năng">
              <select value={form.skillId} onChange={(event) => setForm({ ...form, skillId: event.target.value })}>
                <option value="">Chọn kỹ năng</option>
                {skillOptions.map((skill) => (
                  <option key={skill.skillId} value={skill.skillId}>
                    {skill.name}
                  </option>
                ))}
              </select>
            </DashboardField>
            <DashboardField label="Thời lượng dạy">
              <select
                value={form.durationMinutes}
                onChange={(event) => setForm({ ...form, durationMinutes: Number(event.target.value) as typeof durationOptions[number] })}
              >
                {durationOptions.map((duration) => (
                  <option key={duration} value={duration}>
                    {duration} phút
                  </option>
                ))}
              </select>
            </DashboardField>
            <DashboardField label={role === 'companion' ? 'Điểm buổi học' : 'Điểm mục tiêu'}>
              <input
                min={0}
                type="number"
                value={form.points}
                onChange={(event) => setForm({ ...form, points: Number(event.target.value) })}
              />
            </DashboardField>
            <div className="dashboard-mode-row">
              {deliveryModeOptions.map((mode) => (
                <label key={mode}>
                  <input
                    checked={form.deliveryModes.includes(mode)}
                    onChange={() => setForm((current) => ({ ...current, deliveryModes: toggleValue(current.deliveryModes, mode) }))}
                    type="checkbox"
                  />
                  {mode}
                </label>
              ))}
            </div>
            <DashboardField label="Ngôn ngữ giảng dạy">
              <input
                placeholder="Việt, English"
                value={form.languagesText}
                onChange={(event) => setForm({ ...form, languagesText: event.target.value })}
              />
            </DashboardField>
            <DashboardField label="Tiêu đề kĩ năng">
              <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
            </DashboardField>
            <DashboardField label="Mô tả kĩ năng">
              <textarea rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
            </DashboardField>
            <label className="dashboard-publish-row">
              <input
                checked={form.isPublished}
                onChange={(event) => setForm({ ...form, isPublished: event.target.checked })}
                type="checkbox"
              />
              Hiển thị thẻ này
            </label>
          </div>

          <div className="dashboard-space-upload-panel">
            <div className="dashboard-cover-preview">
              {form.coverImageUrl ? <img alt="Ảnh đại diện thẻ" src={form.coverImageUrl} /> : <span>Ảnh đại diện này sẽ luôn mặc định là ảnh đại diện gốc trừ khi người dùng muốn thay đổi</span>}
            </div>
            <input
              accept="image/jpeg,image/png,image/webp"
              className="dashboard-file-input"
              onChange={handleCoverUpload}
              ref={coverInputRef}
              type="file"
            />
            <button className="dashboard-soft-button" disabled={isUploading} onClick={() => coverInputRef.current?.click()} type="button">
              <Upload size={16} />
              Thay đổi ảnh đại diện
            </button>
            {role === 'companion' ? (
              <>
                <input
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  className="dashboard-file-input"
                  onChange={handleCredentialUpload}
                  ref={credentialInputRef}
                  type="file"
                />
                <button
                  className="dashboard-soft-button"
                  disabled={isUploading}
                  onClick={() => credentialInputRef.current?.click()}
                  type="button"
                >
                  <Upload size={16} />
                  Tải chứng chỉ
                </button>
                <p>{form.credentialUrls.length} / 4 chứng chỉ</p>
              </>
            ) : null}
          </div>
        </div>

        <button className="dashboard-primary-button wide" disabled={isPending || isUploading} type="submit">
          {isPending ? <LoaderCircle className="spin" size={16} /> : null}
          Đăng tải kĩ năng!
        </button>
      </form>
    </div>
  )
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
      void queryClient.invalidateQueries({ queryKey: reviewDashboardKeys.me() })
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
        renderItem={(item) => <PaymentTransactionCard item={item} key={item.paymentTransactionId} />}
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

function MySpacePreviewModal({ card, onClose }: { card: MySpaceCard; onClose: () => void }) {
  return (
    <div className="dashboard-modal-backdrop">
      <article className="dashboard-preview-modal">
        <div className="dashboard-modal-head">
          <h2>{card.title}</h2>
          <button aria-label="Đóng" className="dashboard-icon-button" onClick={onClose} type="button">
            <X size={18} />
          </button>
        </div>
        {card.coverImageUrl ? <img alt={card.title} src={card.coverImageUrl} /> : null}
        <p>{card.description || 'Chưa có mô tả kỹ năng.'}</p>
        <div className="dashboard-review-task-tags">
          <span>{card.skill.name}</span>
          <span>{card.durationMinutes} phút</span>
          <span>{card.deliveryModes.join(', ')}</span>
          <span>{card.languages.join(', ') || 'Chưa chọn ngôn ngữ'}</span>
        </div>
      </article>
    </div>
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

function PaymentTransactionCard({ item }: { item: PaymentTransactionDto }) {
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
        {item.status === 'Pending' && item.paymentUrl ? (
          <button onClick={() => window.location.assign(item.paymentUrl!)} type="button">
            Thử lại thanh toán
          </button>
        ) : null}
      </div>
    </article>
  )
}

function toMySpaceForm(card: MySpaceCard | null, skillOptions: ProfileSkillDto[]) {
  const isCompanion = card && 'pricePoints' in card

  return {
    skillId: card?.skill.skillId ?? skillOptions[0]?.skillId ?? '',
    title: card?.title ?? '',
    description: card?.description ?? '',
    points: card ? (isCompanion ? card.pricePoints : (card as LearnerSpaceCardDto).targetPoints) : 0,
    durationMinutes: card?.durationMinutes ?? 60,
    deliveryModes: card?.deliveryModes ?? ['Online'],
    languagesText: card?.languages.join(', ') ?? '',
    coverImageUrl: card?.coverImageUrl ?? '',
    credentialUrls: isCompanion ? card.credentialUrls : [],
    isPublished: card?.isPublished ?? true,
  }
}

function getMySpaceCardId(card: MySpaceCard) {
  return 'companionSpaceCardId' in card ? card.companionSpaceCardId : card.learnerSpaceCardId
}

function normalizeDashboardTab(value: string | null): DashboardTabId {
  if (value === 'my-space' || value === 'achievements' || value === 'reviews' || value === 'transactions') {
    return value
  }

  return 'profile'
}

function parseCsv(value: string) {
  return [...new Set(value.split(',').map((item) => item.trim()).filter(Boolean))]
}

function toggleValue<T>(values: T[], value: T) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value]
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
