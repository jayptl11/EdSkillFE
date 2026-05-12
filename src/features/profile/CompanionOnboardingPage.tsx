import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Eye,
  Globe2,
  LoaderCircle,
  Upload,
  UserRound,
} from 'lucide-react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { getErrorMessage, isApiError } from '../../api/client'
import { SiteHeader } from '../../components/Brand'
import { MotionPage } from '../../components/MotionPage'
import { showToast } from '../../components/toastEvents'
import { useAppStore } from '../../store/useAppStore'
import { SkillAutocomplete } from '../skills/SkillAutocomplete'
import {
  clearSavedAvatar,
  profileApi,
  profileKeys,
  requestAvatarUploadUrl,
  saveAvatarUrl,
  uploadFileToPresignedUrl,
} from './profileApi'
import {
  buildProfileUpdatePayload,
  extractProfileFieldErrors,
  formatLastActive,
  getRoleBadgeLabel,
  toProfileFormValues,
  validateAvatarFile,
  type ProfileFieldErrors,
} from './profileUtils'
import type { ProfileDto, ProfileField, ProfileFormValues } from './types'

const emptyForm: ProfileFormValues = {
  displayName: '',
  bio: '',
  dateOfBirth: '',
  phone: '',
  degreeUrl: null,
  skillsToTeach: [],
  skillsToLearn: [],
  isPublic: true,
  avatarUrl: null,
}

export function CompanionOnboardingPage() {
  const session = useAppStore((state) => state.session)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const previewUrlRef = useRef<string | null>(null)
  const hasInitializedRef = useRef(false)
  const [step, setStep] = useState<number>(1)
  const [formValues, setFormValues] = useState<ProfileFormValues>(emptyForm)
  const [initialValues, setInitialValues] = useState<ProfileFormValues>(emptyForm)
  const [fieldErrors, setFieldErrors] = useState<ProfileFieldErrors>({})
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)

  const profileQuery = useQuery({
    queryKey: profileKeys.me(),
    queryFn: profileApi.getMyProfile,
    retry: (failureCount, error) => !isApiError(error) && failureCount < 1,
  })

  const updateProfileMutation = useMutation({
    mutationFn: profileApi.updateMyProfile,
    onSuccess: (profile) => {
      applyProfileSnapshot(profile)
    },
    onError: (error) => {
      if (isApiError(error) && error.code === 'VALIDATION_ERROR') {
        setFieldErrors(extractProfileFieldErrors(error))
      }

      showToast({ kind: 'error', message: getErrorMessage(error) })
    },
  })

  useEffect(() => {
    const profile = profileQuery.data
    if (!profile || hasInitializedRef.current) {
      return
    }

    applyProfileSnapshot(profile)
    // Optional: Start at the first incomplete step, or always step 1
    if (profile.skillsToTeach.length > 0 && !profile.isCompanionOnboardingComplete) {
       setStep(2)
    }
  }, [profileQuery.data])

  useEffect(
    () => () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current)
      }
    },
    [],
  )

  if (!session?.accessToken) {
    return <Navigate replace state={{ intent: 'teach' }} to="/login" />
  }

  const profile = profileQuery.data
  const publicReady = profile?.isCompanionOnboardingComplete ?? false

  function applyProfileSnapshot(nextProfile: ProfileDto) {
    const nextValues = toProfileFormValues(nextProfile)
    queryClient.setQueryData(profileKeys.me(), nextProfile)
    queryClient.invalidateQueries({ queryKey: profileKeys.user(nextProfile.userId) })
    hasInitializedRef.current = true
    setInitialValues(nextValues)
    setFormValues(nextValues)
    setAvatarPreviewUrl(nextProfile.avatarUrl)
    setFieldErrors({})
  }

  function clearFieldError(field: ProfileField) {
    setFieldErrors((current) => {
      if (!current[field]) {
        return current
      }

      const next = { ...current }
      delete next[field]
      return next
    })
  }

  function handleChange(field: keyof ProfileFormValues, value: string | number | boolean | null) {
    setFormValues((current) => ({ ...current, [field]: value }))
    clearFieldError(field)
  }

  function replaceLocalPreview(url: string) {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
    }

    previewUrlRef.current = url
  }

  async function handleAvatarChange(file: File) {
    const validationMessage = validateAvatarFile(file)
    if (validationMessage) {
      throw new Error(validationMessage)
    }

    const uploadMeta = await requestAvatarUploadUrl(file)
    await uploadFileToPresignedUrl(uploadMeta.uploadUrl, file)
    setFormValues((current) => ({ ...current, avatarUrl: uploadMeta.publicUrl }))
    const updatedProfile = await saveAvatarUrl(uploadMeta.publicUrl)
    applyProfileSnapshot(updatedProfile)
  }

  const handleAvatarInputChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    const previousAvatarUrl = formValues.avatarUrl
    const nextPreviewUrl = URL.createObjectURL(file)

    setIsUploadingAvatar(true)
    setAvatarPreviewUrl(nextPreviewUrl)
    replaceLocalPreview(nextPreviewUrl)
    clearFieldError('avatarUrl')

    try {
      await handleAvatarChange(file)
      showToast({ kind: 'success', message: 'Ảnh đại diện đã được cập nhật.' })
    } catch (error) {
      setAvatarPreviewUrl(previousAvatarUrl)
      setFormValues((current) => ({ ...current, avatarUrl: previousAvatarUrl }))
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current)
        previewUrlRef.current = null
      }
      showToast({ kind: 'error', message: error instanceof Error ? error.message : getErrorMessage(error) })
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  const handleRemoveAvatar = async () => {
    setIsUploadingAvatar(true)

    try {
      const updatedProfile = await clearSavedAvatar()
      applyProfileSnapshot(updatedProfile)
      showToast({ kind: 'success', message: 'Ảnh đại diện đã được xóa.' })
    } catch (error) {
      showToast({ kind: 'error', message: getErrorMessage(error) })
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  const validateStep = (currentStep: number): boolean => {
    let isValid = true
    const errors: ProfileFieldErrors = {}

    if (currentStep === 1) {
      if (formValues.skillsToTeach.length === 0) {
        errors.skillsToTeach = 'Hãy chọn ít nhất một kỹ năng bạn muốn dạy.'
        isValid = false
      }
    }

    if (currentStep === 2) {
      if (!formValues.avatarUrl) {
        errors.avatarUrl = 'Vui lòng thêm ảnh đại diện.'
        isValid = false
      }
    }

    if (currentStep === 3) {
      if (!formValues.displayName.trim()) {
        errors.displayName = 'Vui lòng nhập tên hiển thị.'
        isValid = false
      }
      if (!formValues.dateOfBirth) {
        errors.dateOfBirth = 'Vui lòng chọn ngày sinh.'
        isValid = false
      } else {
        const date = new Date(formValues.dateOfBirth)
        const minDate = new Date('1900-01-01')
        const today = new Date()
        today.setHours(23, 59, 59, 999)
        if (Number.isNaN(date.getTime()) || date < minDate || date > today) {
          errors.dateOfBirth = 'Ngày sinh không hợp lệ.'
          isValid = false
        }
      }
      if (!formValues.phone.trim()) {
        errors.phone = 'Vui lòng nhập số điện thoại.'
        isValid = false
      } else {
        const phone = formValues.phone.trim()
        if (phone.length < 8 || phone.length > 20) {
          errors.phone = 'Số điện thoại phải có từ 8 đến 20 ký tự.'
          isValid = false
        } else if (!/^[\d+\-() ]+$/.test(phone)) {
          errors.phone = 'Số điện thoại chỉ được chứa chữ số, dấu +, -, () và dấu cách.'
          isValid = false
        }
      }
    }

    if (currentStep === 4) {
      const bioText = formValues.bio.trim()
      const wordCount = bioText ? bioText.split(/\s+/).length : 0

      if (!bioText) {
        errors.bio = 'Vui lòng viết mô tả ngắn về bạn.'
        isValid = false
      } else if (wordCount < 40) {
        errors.bio = `Vui lòng viết ít nhất 40 từ. Bạn đang có ${wordCount} từ.`
        isValid = false
      } else if (wordCount > 500) {
        errors.bio = `Mô tả không được vượt quá 500 từ. Bạn đang có ${wordCount} từ.`
        isValid = false
      }
    }

    if (currentStep === 5) {
      if (!formValues.isPublic) {
        errors.isPublic = 'Hãy bật hồ sơ công khai để người học có thể tìm thấy bạn.'
        isValid = false
      }
    }

    setFieldErrors(errors)
    return isValid
  }

  const handleNextStep = async () => {
    if (!validateStep(step)) {
      showToast({ kind: 'error', message: 'Vui lòng hoàn thiện các mục còn thiếu trước khi tiếp tục.' })
      return
    }

    try {
      if (step === 1) {
        await updateProfileMutation.mutateAsync({
          skillsToTeach: formValues.skillsToTeach,
        })
      }
      setStep((s) => Math.min(s + 1, 5))
    } catch {
      // handled in mutation
    }
  }

  const handlePrevStep = () => {
    setStep((s) => Math.max(s - 1, 1))
  }

  const saveFinalStep = async () => {
    if (!validateStep(5)) {
      showToast({ kind: 'error', message: 'Vui lòng hoàn thiện các mục còn thiếu trước khi tiếp tục.' })
      return
    }

    const updatePayload = buildProfileUpdatePayload(
      { ...formValues, isPublic: true },
      { ...initialValues, isPublic: true },
    )
    updatePayload.isPublic = true
    updatePayload.hasIsPublic = true

    try {
      const updatedProfile = await updateProfileMutation.mutateAsync(updatePayload)

      if (updatedProfile.isCompanionOnboardingComplete) {
        showToast({ kind: 'success', message: 'Hồ sơ dạy học đã sẵn sàng. Bạn có thể mở buổi học ngay.' })
        navigate('/dashboard/skills/teaching', { replace: true })
        return
      }

      showToast({ kind: 'info', message: 'Hồ sơ đã được lưu. Hãy kiểm tra lại các mục còn thiếu.' })
    } catch {
      // handled in mutation
    }
  }

  const selectSkill = (skillName: string) => {
    const normalized = skillName.trim()
    const currentList = formValues.skillsToTeach

    if (currentList.some((skill) => skill.trim().toLowerCase() === normalized.toLowerCase())) {
      showToast({ kind: 'info', message: 'Kỹ năng này đã có trong danh sách.' })
      return
    }

    setFormValues((current) => ({
      ...current,
      skillsToTeach: [...current.skillsToTeach, normalized],
    }))
    clearFieldError('skillsToTeach')
  }

  const removeSkill = (skill: string) => {
    setFormValues((current) => ({
      ...current,
      skillsToTeach: current.skillsToTeach.filter((item) => item !== skill),
    }))
    clearFieldError('skillsToTeach')
  }

  const stepTitles = [
    { num: 1, title: 'Kỹ năng', desc: 'Chọn môn học' },
    { num: 2, title: 'Ảnh', desc: 'Đại diện' },
    { num: 3, title: 'Cá nhân', desc: 'Thông tin' },
    { num: 4, title: 'Tiểu sử', desc: 'Giới thiệu' },
    { num: 5, title: 'Hoàn tất', desc: 'Công khai' },
  ]

  return (
    <MotionPage className="page dashboard-page profile-page onboarding-page">
      <SiteHeader />
      <section className="dashboard-hero profile-hero onboarding-hero">
        <div>
          <span className="eyebrow">
            <Globe2 size={15} />
            Hoàn thiện hồ sơ dạy học
          </span>
          <h1>Điền một lần rõ ràng để người học biết bạn dạy gì và có phù hợp không.</h1>
          <p>
            Luồng này dành riêng cho người dạy: chọn kỹ năng muốn dạy trước, sau đó hoàn thiện hồ
            sơ công khai.
          </p>
        </div>
        <div className="profile-hero-actions">
          <Link className="button secondary" to="/dashboard">
            Về trang của tôi
          </Link>
          {publicReady ? (
            <Link className="button primary" to="/dashboard/skills/teaching">
              Đi tới khu dạy học
            </Link>
          ) : null}
        </div>
      </section>

      <section className="onboarding-stepper onboarding-stepper-wizard">
        {stepTitles.map((s) => (
          <div key={s.num} className={`onboarding-step-card ${step === s.num ? 'active' : step > s.num ? 'done' : ''}`}>
            <strong>{s.num}</strong>
            <div className="stepper-text-hidden">
              <h2>{s.title}</h2>
            </div>
          </div>
        ))}
      </section>

      {profileQuery.isLoading ? (
        <section className="profile-state-card">
          <LoaderCircle className="spin" size={24} />
          <p>Đang tải hồ sơ dạy học của bạn...</p>
        </section>
      ) : null}

      {profileQuery.isError ? (
        <section className="profile-state-card error">
          <AlertCircle size={22} />
          <div>
            <h2>Không thể tải hồ sơ</h2>
            <p>{getErrorMessage(profileQuery.error)}</p>
          </div>
        </section>
      ) : null}

      {profile ? (
        <section className="onboarding-layout">
          <div className="onboarding-main">
            {step === 1 ? (
              <section className="profile-form-card onboarding-card">
                <div className="profile-form-heading">
                  <div>
                    <span className="eyebrow">Bước 1</span>
                    <h2>Bạn muốn dạy kỹ năng gì?</h2>
                  </div>
                </div>

                <SkillAutocomplete
                  error={fieldErrors.skillsToTeach}
                  helperText="Chọn các kỹ năng bạn thực sự sẵn sàng đồng hành cùng người học."
                  label="Kỹ năng muốn dạy"
                  onRemove={removeSkill}
                  onSelect={selectSkill}
                  placeholder="Tìm kỹ năng muốn dạy"
                  selectedSkills={formValues.skillsToTeach}
                />
              </section>
            ) : null}

            {step === 2 ? (
              <section className="profile-form-card onboarding-card">
                <div className="profile-form-heading">
                  <div>
                    <span className="eyebrow">Bước 2</span>
                    <h2>Cập nhật ảnh đại diện</h2>
                  </div>
                </div>

                <div className="onboarding-avatar-panel">
                  <div className="onboarding-avatar-head">
                    {avatarPreviewUrl ? (
                      <img alt={formValues.displayName || 'Ảnh đại diện'} className="profile-avatar" src={avatarPreviewUrl} />
                    ) : (
                      <div className="profile-avatar placeholder">
                        <UserRound size={44} />
                      </div>
                    )}
                    <div>
                      <h3>Ảnh đại diện</h3>
                      <p>Ảnh rõ mặt giúp hồ sơ của bạn đáng tin hơn và dễ được chọn hơn.</p>
                    </div>
                  </div>
                  <div className="profile-avatar-actions">
                    <input
                      accept="image/jpeg,image/png,image/webp"
                      className="profile-file-input"
                      onChange={handleAvatarInputChange}
                      ref={fileInputRef}
                      type="file"
                    />
                    <button
                      className="button secondary"
                      disabled={isUploadingAvatar}
                      onClick={() => fileInputRef.current?.click()}
                      type="button"
                    >
                      <Upload size={18} />
                      {isUploadingAvatar ? 'Đang tải...' : 'Đổi ảnh'}
                    </button>
                    <button
                      className="button secondary"
                      disabled={(!avatarPreviewUrl && !formValues.avatarUrl) || isUploadingAvatar}
                      onClick={() => void handleRemoveAvatar()}
                      type="button"
                    >
                      Xóa ảnh
                    </button>
                  </div>
                  {fieldErrors.avatarUrl ? <p className="profile-field-error">{fieldErrors.avatarUrl}</p> : null}
                </div>
              </section>
            ) : null}

            {step === 3 ? (
              <section className="profile-form-card onboarding-card">
                <div className="profile-form-heading">
                  <div>
                    <span className="eyebrow">Bước 3</span>
                    <h2>Thông tin cá nhân</h2>
                  </div>
                </div>

                <section className="profile-section-card">
                  <div className="profile-form-grid">
                    <OnboardingField error={fieldErrors.displayName} label="Tên hiển thị *">
                      <input
                        onChange={(event) => handleChange('displayName', event.target.value)}
                        value={formValues.displayName}
                      />
                    </OnboardingField>

                    <OnboardingField error={fieldErrors.dateOfBirth} label="Ngày sinh *">
                      <input
                        max={new Date().toISOString().split('T')[0]}
                        min="1900-01-01"
                        onChange={(event) => handleChange('dateOfBirth', event.target.value)}
                        type="date"
                        value={formValues.dateOfBirth}
                      />
                    </OnboardingField>

                    <OnboardingField error={fieldErrors.phone} label="Số điện thoại *">
                      <input
                        maxLength={20}
                        onChange={(event) => handleChange('phone', event.target.value)}
                        placeholder="+84 ..."
                        type="tel"
                        value={formValues.phone}
                      />
                    </OnboardingField>
                  </div>
                </section>
              </section>
            ) : null}

            {step === 4 ? (
              <section className="profile-form-card onboarding-card">
                <div className="profile-form-heading">
                  <div>
                    <span className="eyebrow">Bước 4</span>
                    <h2>Tiểu sử</h2>
                  </div>
                </div>

                <section className="profile-section-card">
                  <div className="profile-form-grid">
                    <OnboardingField className="full" error={fieldErrors.bio} label="Mô tả ngắn *">
                      <textarea
                        onChange={(event) => handleChange('bio', event.target.value)}
                        rows={6}
                        value={formValues.bio}
                        placeholder="Hãy chia sẻ về kinh nghiệm, phương pháp giảng dạy và những gì người học có thể mong đợi từ bạn..."
                      />
                      <div style={{ marginTop: '8px', fontSize: '13px', textAlign: 'right' }}>
                        {(() => {
                          const wc = formValues.bio.trim() ? formValues.bio.trim().split(/\s+/).length : 0
                          if (wc < 40) return <span style={{ color: 'var(--slate-500)' }}>{wc} / 40 từ tối thiểu</span>
                          return <span style={{ color: wc > 500 ? 'var(--error)' : 'var(--slate-500)' }}>{wc} / 500 từ</span>
                        })()}
                      </div>
                    </OnboardingField>
                  </div>
                </section>
              </section>
            ) : null}

            {step === 5 ? (
              <section className="profile-form-card onboarding-card">
                <div className="profile-form-heading">
                  <div>
                    <span className="eyebrow">Bước 5</span>
                    <h2>Hoàn tất & Mở công khai</h2>
                  </div>
                </div>

                <section className="profile-section-card">
                  <div className="profile-form-grid">
                    <div className="profile-field full">
                      <div className="profile-label-row">
                        <span>Hồ sơ công khai *</span>
                      </div>
                      <label className="profile-switch">
                        <input
                          checked={formValues.isPublic}
                          className="profile-switch-input"
                          onChange={(event) => handleChange('isPublic', event.target.checked)}
                          type="checkbox"
                        />
                        <span aria-hidden="true" className="profile-switch-track">
                          <span className="profile-switch-thumb" />
                        </span>
                        <span className="profile-switch-copy">
                          <strong>{formValues.isPublic ? 'Đang công khai' : 'Đang tắt công khai'}</strong>
                          <small>Người học chỉ có thể xem hồ sơ dạy học khi mục này được bật.</small>
                        </span>
                      </label>
                      {fieldErrors.isPublic ? <p className="profile-field-error">{fieldErrors.isPublic}</p> : null}
                    </div>
                  </div>
                </section>
              </section>
            ) : null}

            {/* Wizard Navigation Footer */}
            <div className="profile-form-actions onboarding-wizard-actions">
              {step > 1 ? (
                <button className="button secondary" onClick={handlePrevStep} type="button">
                  <ArrowLeft size={18} />
                  Quay lại
                </button>
              ) : (
                <div />
              )}
              {step < 5 ? (
                <button
                  className="button primary"
                  disabled={updateProfileMutation.isPending || isUploadingAvatar}
                  onClick={() => void handleNextStep()}
                  type="button"
                >
                  {updateProfileMutation.isPending ? <LoaderCircle className="spin" size={18} /> : <ArrowRight size={18} />}
                  Tiếp tục
                </button>
              ) : (
                <button
                  className="button primary"
                  disabled={updateProfileMutation.isPending || isUploadingAvatar}
                  onClick={() => void saveFinalStep()}
                  type="button"
                >
                  {updateProfileMutation.isPending ? <LoaderCircle className="spin" size={18} /> : <CheckCircle2 size={18} />}
                  Hoàn tất hồ sơ
                </button>
              )}
            </div>
          </div>

          <aside className="onboarding-side">
            <section className="public-profile-card onboarding-preview-card">
              <div className="public-profile-head">
                {avatarPreviewUrl ? (
                  <img alt={formValues.displayName || 'Ảnh hồ sơ'} className="profile-avatar" src={avatarPreviewUrl} />
                ) : (
                  <div className="profile-avatar placeholder">
                    <UserRound size={44} />
                  </div>
                )}
                <div>
                  <span className="profile-mini-label">Xem trước hồ sơ người dạy</span>
                  <div className="profile-role-row">
                    {profile.roles.map((role) => (
                      <span className="profile-role-badge" key={role}>
                        {getRoleBadgeLabel(role)}
                      </span>
                    ))}
                  </div>
                  <h2>{formValues.displayName || 'Tên hiển thị của bạn'}</h2>
                  <p>{formValues.bio || 'Mô tả ngắn của bạn sẽ hiển thị ở đây.'}</p>
                </div>
              </div>

              <div className="public-profile-summary">
                <div className="public-profile-summary-card">
                  <span>Hoạt động gần đây</span>
                  <strong>{formatLastActive(profile.lastActiveAt)}</strong>
                </div>
              </div>

              <div className="profile-meta-card">
                <div className="profile-section-heading">
                  <div>
                    <h3>Kỹ năng muốn dạy</h3>
                  </div>
                </div>
                {formValues.skillsToTeach.length === 0 ? (
                  <p className="profile-empty-copy">Chưa có kỹ năng nào.</p>
                ) : (
                  <div className="profile-chip-wrap">
                    {formValues.skillsToTeach.map((skill) => (
                      <span className="profile-chip" key={skill}>
                        {skill}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="onboarding-preview-footer">
                <div className={`onboarding-visibility-chip ${formValues.isPublic ? 'ready' : ''}`}>
                  <Eye size={16} />
                  <span>{formValues.isPublic ? 'Hồ sơ đang có thể công khai' : 'Hồ sơ chưa thể công khai'}</span>
                </div>
                {publicReady ? (
                  <Link className="button primary full" to="/dashboard/skills/new">
                    Mở buổi học đầu tiên
                  </Link>
                ) : null}
              </div>
            </section>
          </aside>
        </section>
      ) : null}
    </MotionPage>
  )
}

function OnboardingField({
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
    <div className={`profile-field ${className ?? ''}`.trim()}>
      <div className="profile-label-row">
        <span>{label}</span>
      </div>
      {children}
      {error ? <p className="profile-field-error">{error}</p> : null}
    </div>
  )
}
