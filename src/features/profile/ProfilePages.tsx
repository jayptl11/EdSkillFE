import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  Camera,
  EyeOff,
  Globe2,
  Info,
  LoaderCircle,
  Save,
  Trash2,
  Upload,
  UserRound,
} from 'lucide-react'
import { getErrorMessage, isApiError } from '../../api/client'
import { SiteHeader } from '../../components/Brand'
import { CustomSelect } from '../../components/CustomSelect'
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
  buildProfilePatch,
  extractProfileFieldErrors,
  formatLastActive,
  getRoleBadgeLabel,
  toProfileFormValues,
  validateAvatarFile,
  validateProfileForm,
  type ProfileFieldErrors,
} from './profileUtils'
import type { ProfileDto, ProfileField, ProfileFormValues } from './types'

const emptyForm: ProfileFormValues = {
  displayName: '',
  bio: '',
  university: '',
  faculty: '',
  yearOfStudy: null,
  skillsToTeach: [],
  skillsToLearn: [],
  isPublic: true,
  avatarUrl: null,
}

export function OwnerProfilePage() {
  const session = useAppStore((state) => state.session)
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const previewUrlRef = useRef<string | null>(null)
  const hasInitializedRef = useRef(false)
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
      showToast({ kind: 'success', message: 'Hồ sơ đã được cập nhật.' })
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

    const nextValues = toProfileFormValues(profile)
    queryClient.setQueryData(profileKeys.me(), profile)
    queryClient.invalidateQueries({ queryKey: profileKeys.user(profile.userId) })
    hasInitializedRef.current = true
    setInitialValues(nextValues)
    setFormValues(nextValues)
    setFieldErrors({})
    setAvatarPreviewUrl(profile.avatarUrl)
  }, [profileQuery.data, queryClient])

  useEffect(
    () => () => {
      clearLocalPreview()
    },
    [],
  )

  if (!session) {
    return <Navigate to="/login" replace />
  }

  const patchPayload = buildProfilePatch(formValues, initialValues)
  const isDirty = Object.keys(patchPayload).length > 0

  const handleChange = (field: keyof ProfileFormValues, value: string | number | boolean | null) => {
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

  function replaceLocalPreview(url: string) {
    clearLocalPreview()
    previewUrlRef.current = url
  }

  function clearLocalPreview() {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
      previewUrlRef.current = null
    }
  }

  function applyProfileSnapshot(profile: ProfileDto) {
    const nextValues = toProfileFormValues(profile)
    queryClient.setQueryData(profileKeys.me(), profile)
    queryClient.invalidateQueries({ queryKey: profileKeys.user(profile.userId) })
    hasInitializedRef.current = true
    setInitialValues(nextValues)
    setFormValues(nextValues)
    setFieldErrors({})
    setAvatarPreviewUrl(profile.avatarUrl)
    clearLocalPreview()
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const nextErrors = validateProfileForm(formValues)
    setFieldErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      showToast({ kind: 'error', message: 'Vui lòng kiểm tra lại các trường đang bị báo lỗi.' })
      return
    }

    if (!isDirty) {
      return
    }

    updateProfileMutation.mutate(patchPayload)
  }

  async function handleAvatarChange(file: File) {
    const validationMessage = validateAvatarFile(file)
    if (validationMessage) {
      throw new Error(validationMessage)
    }

    const uploadMeta = await requestAvatarUploadUrl(file)
    await uploadFileToPresignedUrl(uploadMeta.uploadUrl, file)

    setFormValues((current) => ({ ...current, avatarUrl: uploadMeta.publicUrl }))

    const profile = await saveAvatarUrl(uploadMeta.publicUrl)
    applyProfileSnapshot(profile)
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
      showToast({ kind: 'success', message: 'Avatar đã được cập nhật thành công.' })
    } catch (error) {
      setAvatarPreviewUrl(previousAvatarUrl)
      setFormValues((current) => ({ ...current, avatarUrl: previousAvatarUrl }))
      clearLocalPreview()
      showToast({
        kind: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Tải avatar thất bại. Hồ sơ hiện tại chưa bị thay đổi.',
      })
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  const handleRemoveAvatar = async () => {
    setIsUploadingAvatar(true)
    clearFieldError('avatarUrl')

    try {
      const profile = await clearSavedAvatar()
      applyProfileSnapshot(profile)
      showToast({ kind: 'success', message: 'Avatar đã được xóa khỏi hồ sơ.' })
    } catch (error) {
      showToast({ kind: 'error', message: getErrorMessage(error) })
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  const selectSkill = (field: 'skillsToTeach' | 'skillsToLearn', skillName: string) => {
    const normalized = skillName.trim()
    const currentList = formValues[field]

    if (currentList.some((skill) => skill.trim().toLowerCase() === normalized.toLowerCase())) {
      showToast({ kind: 'info', message: 'Kỹ năng này đã có trong danh sách.' })
      return
    }

    if (currentList.length >= 20) {
      setFieldErrors((current) => ({
        ...current,
        [field]: 'Tối đa 20 kỹ năng cho mỗi danh sách.',
      }))
      return
    }

    setFormValues((current) => ({
      ...current,
      [field]: [...current[field], normalized],
    }))
    clearFieldError(field)
  }

  const removeSkill = (field: 'skillsToTeach' | 'skillsToLearn', skill: string) => {
    setFormValues((current) => ({
      ...current,
      [field]: current[field].filter((item) => item !== skill),
    }))
    clearFieldError(field)
  }

  return (
    <MotionPage className="page dashboard-page profile-page">
      <SiteHeader />
      <section className="dashboard-hero profile-hero">
        <div>
          <span className="eyebrow">
            <Globe2 size={15} />
            Quản lý hồ sơ cá nhân
          </span>
          <h1>Hoàn thiện hồ sơ EdSkill của bạn.</h1>
          <p>
            Cập nhật thông tin công khai, kỹ năng muốn dạy hoặc học, và avatar để cộng đồng dễ
            kết nối hơn.
          </p>
        </div>
        <div className="profile-hero-actions">
          <Link className="button secondary" to="/dashboard">
            Về dashboard
          </Link>
          {formValues.isPublic ? (
            <Link className="button primary" to={`/profile/${session.userId}`}>
              Xem hồ sơ công khai
            </Link>
          ) : (
            <span className="profile-private-chip">
              <EyeOff size={16} />
              Hồ sơ đang riêng tư
            </span>
          )}
        </div>
      </section>

      {profileQuery.isLoading ? (
        <section className="profile-state-card">
          <LoaderCircle className="spin" size={24} />
          <p>Đang tải hồ sơ của bạn...</p>
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

      {profileQuery.data ? (
        <section className="profile-layout">
          <aside className="profile-side-card">
            <div className="profile-avatar-shell profile-panel">
              <div className="profile-avatar-header">
                {avatarPreviewUrl ? (
                  <img className="profile-avatar" src={avatarPreviewUrl} alt={formValues.displayName} />
                ) : (
                  <div className="profile-avatar placeholder">
                    <UserRound size={44} />
                  </div>
                )}
                <div className="profile-avatar-copy">
                  <span className="profile-mini-label">Hồ sơ cá nhân</span>
                  <h2>{formValues.displayName || 'Chưa có tên hiển thị'}</h2>
                  <p>
                    Hoàn thiện avatar, vai trò và trạng thái hiển thị để hồ sơ của bạn rõ ràng hơn
                    khi xuất hiện công khai.
                  </p>
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
                  {isUploadingAvatar ? <LoaderCircle className="spin" size={18} /> : <Upload size={18} />}
                  {isUploadingAvatar ? 'Đang tải...' : 'Đổi avatar'}
                </button>
                <button
                  className="button secondary ghost"
                  disabled={(!avatarPreviewUrl && !formValues.avatarUrl) || isUploadingAvatar}
                  onClick={() => {
                    void handleRemoveAvatar()
                  }}
                  type="button"
                >
                  <Trash2 size={18} />
                  Xóa avatar
                </button>
              </div>
              <p className="profile-helper-copy">Hỗ trợ JPG, PNG, WEBP. Kích thước tối đa 5 MB.</p>
              {fieldErrors.avatarUrl ? <p className="profile-field-error">{fieldErrors.avatarUrl}</p> : null}
            </div>

            <div className="profile-meta-card profile-panel">
              <h2>Vai trò & hoạt động</h2>
              <div className="profile-role-row">
                {profileQuery.data.roles.map((role) => (
                  <span className="profile-role-badge" key={role}>
                    {getRoleBadgeLabel(role)}
                  </span>
                ))}
              </div>
              <dl className="profile-stats profile-stats-tiles">
                <div>
                  <dt>Total sessions</dt>
                  <dd>{profileQuery.data.totalSessions}</dd>
                </div>
                <div>
                  <dt>Last active</dt>
                  <dd>{formatLastActive(profileQuery.data.lastActiveAt)}</dd>
                </div>
                <div>
                  <dt>Public status</dt>
                  <dd>{formValues.isPublic ? 'Public profile' : 'Private profile'}</dd>
                </div>
              </dl>
            </div>
          </aside>

          <form className="profile-form-card" onSubmit={handleSubmit}>
            <div className="profile-form-heading">
              <div>
                <span className="eyebrow">
                  <Camera size={15} />
                  Hồ sơ chính
                </span>
                <h2>Thông tin hiển thị</h2>
              </div>
              <div className="profile-form-actions">
                <button
                  className="button primary"
                  disabled={!isDirty || updateProfileMutation.isPending || isUploadingAvatar}
                  type="submit"
                >
                  {updateProfileMutation.isPending ? (
                    <LoaderCircle className="spin" size={18} />
                  ) : (
                    <Save size={18} />
                  )}
                  Lưu hồ sơ
                </button>
              </div>
            </div>

            <section className="profile-section-card">
              <div className="profile-section-heading">
                <div>
                  <h3>Nội dung chính</h3>
                </div>
              </div>

              <div className="profile-form-grid">
                <Field
                  error={fieldErrors.displayName}
                  helper="Tên nên ngắn gọn, dễ nhớ và không dùng ký tự đặc biệt."
                  label="Tên hiển thị"
                  required
                >
                  <input
                    onChange={(event) => handleChange('displayName', event.target.value)}
                    value={formValues.displayName}
                  />
                </Field>

                <Field
                  className="profile-field-switch"
                  error={fieldErrors.isPublic}
                  helper="Bạn có thể đổi lại bất cứ lúc nào."
                  label="Chế độ hồ sơ"
                >
                  <label className="profile-switch">
                    <input
                      className="profile-switch-input"
                      checked={formValues.isPublic}
                      onChange={(event) => handleChange('isPublic', event.target.checked)}
                      type="checkbox"
                    />
                    <span className="profile-switch-track" aria-hidden="true">
                      <span className="profile-switch-thumb" />
                    </span>
                    <span className="profile-switch-copy">
                      <strong>{formValues.isPublic ? 'Public profile' : 'Private profile'}</strong>
                      <small>
                        {formValues.isPublic
                          ? 'Người khác có thể xem hồ sơ công khai của bạn.'
                          : 'Chỉ bạn mới xem được trang hồ sơ này.'}
                      </small>
                    </span>
                  </label>
                </Field>

                <Field
                  className="full"
                  error={fieldErrors.bio}
                  helper="Một đoạn giới thiệu ngắn về điều bạn đang học hoặc có thể chia sẻ."
                  label="Tiểu sử"
                >
                  <textarea
                    onChange={(event) => handleChange('bio', event.target.value)}
                    rows={4}
                    value={formValues.bio}
                  />
                </Field>
              </div>
            </section>

            <section className="profile-section-card">
              <div className="profile-section-heading">
                <div>
                  <h3>Thông tin học tập</h3>
                </div>
              </div>

              <div className="profile-form-grid">
                <Field
                  error={fieldErrors.university}
                  helper="Tên trường hoặc tổ chức bạn đang theo học."
                  label="Trường"
                >
                  <input
                    onChange={(event) => handleChange('university', event.target.value)}
                    value={formValues.university}
                  />
                </Field>

                <Field
                  error={fieldErrors.faculty}
                  helper="Khoa, ngành hoặc lĩnh vực học tập chính."
                  label="Khoa / ngành"
                >
                  <input
                    onChange={(event) => handleChange('faculty', event.target.value)}
                    value={formValues.faculty}
                  />
                </Field>

                <Field
                  error={fieldErrors.yearOfStudy}
                  helper="Có thể để trống nếu bạn chưa muốn hiển thị."
                  label="Năm học"
                >
                  <CustomSelect
                    onChange={(val) => handleChange('yearOfStudy', val)}
                    options={[
                      { label: 'Chưa cập nhật', value: '' },
                      ...[1, 2, 3, 4, 5, 6].map((year) => ({
                        label: `Năm ${year}`,
                        value: year,
                      })),
                    ]}
                    placeholder="Chưa cập nhật"
                    value={formValues.yearOfStudy ?? ''}
                  />
                </Field>
              </div>
            </section>

            <section className="profile-section-card">
              <div className="profile-section-heading">
                <div>
                  <h3>Kỹ năng</h3>
                </div>
              </div>

              <div className="profile-skills-grid">
                <SkillAutocomplete
                  error={fieldErrors.skillsToTeach}
                  label="Kỹ năng muốn dạy"
                  onRemove={(skill) => removeSkill('skillsToTeach', skill)}
                  onSelect={(skill) => selectSkill('skillsToTeach', skill)}
                  placeholder="Tìm kỹ năng muốn dạy"
                  selectedSkills={formValues.skillsToTeach}
                />
                <SkillAutocomplete
                  error={fieldErrors.skillsToLearn}
                  label="Kỹ năng muốn học"
                  onRemove={(skill) => removeSkill('skillsToLearn', skill)}
                  onSelect={(skill) => selectSkill('skillsToLearn', skill)}
                  placeholder="Tìm kỹ năng muốn học"
                  selectedSkills={formValues.skillsToLearn}
                />
              </div>
            </section>
          </form>
        </section>
      ) : null}
    </MotionPage>
  )
}

export function PublicProfilePage() {
  const { userId = '' } = useParams()

  const profileQuery = useQuery({
    queryKey: profileKeys.user(userId),
    queryFn: () => profileApi.getUserProfile(userId),
    enabled: Boolean(userId),
    retry: (failureCount, error) =>
      !isApiError(error) || (error.status >= 500 && failureCount < 1),
  })

  const error = profileQuery.error
  const isPrivateProfile = isApiError(error) && error.code === 'PROFILE_PRIVATE'
  const isNotFoundProfile =
    isApiError(error) && (error.code === 'PROFILE_NOT_FOUND' || error.status === 404)

  return (
    <MotionPage className="page dashboard-page profile-page public-profile-page">
      <SiteHeader />
      <section className="dashboard-hero profile-hero">
        <div>
          <span className="eyebrow">
            <Globe2 size={15} />
            Hồ sơ công khai
          </span>
          <h1>Thông tin hiển thị của thành viên EdSkill.</h1>

        </div>
        <Link className="button secondary" to="/dashboard">
          Về dashboard
        </Link>
      </section>

      {profileQuery.isLoading ? (
        <section className="profile-state-card">
          <LoaderCircle className="spin" size={24} />
          <p>Đang tải hồ sơ công khai...</p>
        </section>
      ) : null}

      {isPrivateProfile ? (
        <section className="profile-state-card">
          <EyeOff size={22} />
          <div>
            <h2>Hồ sơ đang ở chế độ riêng tư</h2>
            <p>Người dùng này đang để hồ sơ ở chế độ riêng tư nên chưa thể xem công khai.</p>
          </div>
        </section>
      ) : null}

      {isNotFoundProfile ? (
        <section className="profile-state-card">
          <AlertCircle size={22} />
          <div>
            <h2>Không tìm thấy hồ sơ</h2>
            <p>UserId này chưa có hồ sơ công khai để hiển thị.</p>
          </div>
        </section>
      ) : null}

      {profileQuery.isError && !isPrivateProfile && !isNotFoundProfile ? (
        <section className="profile-state-card error">
          <AlertCircle size={22} />
          <div>
            <h2>Không thể tải hồ sơ công khai</h2>
            <p>{getErrorMessage(profileQuery.error)}</p>
          </div>
        </section>
      ) : null}

      {profileQuery.data ? <PublicProfileCard profile={profileQuery.data} /> : null}
    </MotionPage>
  )
}

function PublicProfileCard({ profile }: { profile: ProfileDto }) {
  return (
    <section className="public-profile-card">
      <div className="public-profile-head">
        {profile.avatarUrl ? (
          <img className="profile-avatar" src={profile.avatarUrl} alt={profile.displayName} />
        ) : (
          <div className="profile-avatar placeholder">
            <UserRound size={44} />
          </div>
        )}
        <div>
          <span className="profile-mini-label">Hồ sơ công khai</span>
          <div className="profile-role-row">
            {profile.roles.map((role) => (
              <span className="profile-role-badge" key={role}>
                {getRoleBadgeLabel(role)}
              </span>
            ))}
          </div>
          <h2>{profile.displayName}</h2>
          <p>{profile.bio || 'Người dùng này chưa cập nhật tiểu sử.'}</p>
        </div>
      </div>

      <div className="public-profile-summary">
        <div className="public-profile-summary-card">
          <span>Trường</span>
          <strong>{profile.university || 'Chưa cập nhật'}</strong>
        </div>
        <div className="public-profile-summary-card">
          <span>Năm học</span>
          <strong>{profile.yearOfStudy ? `Năm ${profile.yearOfStudy}` : 'Chưa cập nhật'}</strong>
        </div>
        <div className="public-profile-summary-card">
          <span>Hoạt động gần nhất</span>
          <strong>{formatLastActive(profile.lastActiveAt)}</strong>
        </div>
        <div className="public-profile-summary-card">
          <span>Total sessions</span>
          <strong>{profile.totalSessions}</strong>
        </div>
      </div>

      <div className="public-profile-grid">
        <div className="profile-meta-card">
          <h3>Thông tin học tập</h3>
          <dl className="profile-stats">
            <div>
              <dt>Trường</dt>
              <dd>{profile.university || 'Chưa cập nhật'}</dd>
            </div>
            <div>
              <dt>Khoa / ngành</dt>
              <dd>{profile.faculty || 'Chưa cập nhật'}</dd>
            </div>
            <div>
              <dt>Năm học</dt>
              <dd>{profile.yearOfStudy ? `Năm ${profile.yearOfStudy}` : 'Chưa cập nhật'}</dd>
            </div>
            <div>
              <dt>Last active</dt>
              <dd>{formatLastActive(profile.lastActiveAt)}</dd>
            </div>
            <div>
              <dt>Total sessions</dt>
              <dd>{profile.totalSessions}</dd>
            </div>
          </dl>
        </div>

        <div className="profile-meta-card">
          <h3>Kỹ năng muốn dạy</h3>
          <SkillChips emptyLabel="Chưa cập nhật kỹ năng muốn dạy." skills={profile.skillsToTeach} />
        </div>

        <div className="profile-meta-card">
          <h3>Kỹ năng muốn học</h3>
          <SkillChips emptyLabel="Chưa cập nhật kỹ năng muốn học." skills={profile.skillsToLearn} />
        </div>
      </div>
    </section>
  )
}

function SkillChips({
  emptyLabel,
  onRemove,
  skills,
}: {
  emptyLabel: string
  onRemove?: (skill: string) => void
  skills: string[]
}) {
  if (skills.length === 0) {
    return <p className="profile-empty-copy">{emptyLabel}</p>
  }

  return (
    <div className="profile-chip-wrap">
      {skills.map((skill) => (
        <span className="profile-chip" key={skill}>
          {skill}
          {onRemove ? (
            <button aria-label={`Xóa ${skill}`} onClick={() => onRemove(skill)} type="button">
              ×
            </button>
          ) : null}
        </span>
      ))}
    </div>
  )
}

function Field({
  children,
  className,
  error,
  helper,
  label,
  required = false,
}: {
  children: ReactNode
  className?: string
  error?: string
  helper?: string
  label: string
  required?: boolean
}) {
  return (
    <div className={`profile-field ${className ?? ''}`.trim()}>
      <div className="profile-label-row">
        <span>
          {label}
          {required ? ' *' : ''}
        </span>
        {helper ? (
          <span className="profile-hint" tabIndex={0}>
            <Info size={14} />
            <span className="profile-hint-bubble">{helper}</span>
          </span>
        ) : null}
      </div>
      {children}
      {error ? <p className="profile-field-error">{error}</p> : null}
    </div>
  )
}
