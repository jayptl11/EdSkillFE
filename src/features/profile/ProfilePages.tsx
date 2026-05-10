import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  Camera,
  Eye,
  EyeOff,
  Globe2,
  LoaderCircle,
  Save,
  Trash2,
  Upload,
  UserRound,
} from 'lucide-react'
import { getErrorMessage, isApiError } from '../../api/client'
import { SiteHeader } from '../../components/Brand'
import { MotionPage } from '../../components/MotionPage'
import { showToast } from '../../components/toastEvents'
import { useAppStore } from '../../store/useAppStore'
import { profileApi, profileKeys, uploadAvatar } from './profileApi'
import {
  buildProfilePatch,
  extractProfileFieldErrors,
  formatLastActive,
  getRoleBadgeLabel,
  normalizeSkills,
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
  const [teachDraft, setTeachDraft] = useState('')
  const [learnDraft, setLearnDraft] = useState('')
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)

  const profileQuery = useQuery({
    queryKey: profileKeys.me(),
    queryFn: profileApi.getMyProfile,
    retry: (failureCount, error) => !isApiError(error) && failureCount < 1,
  })

  const updateProfileMutation = useMutation({
    mutationFn: profileApi.updateMyProfile,
    onSuccess: (profile) => {
      const nextValues = toProfileFormValues(profile)
      queryClient.setQueryData(profileKeys.me(), profile)
      queryClient.invalidateQueries({ queryKey: profileKeys.user(profile.userId) })
      hasInitializedRef.current = true
      setInitialValues(nextValues)
      setFormValues(nextValues)
      setFieldErrors({})
      setAvatarPreviewUrl(profile.avatarUrl)
      clearLocalPreview()
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
    hasInitializedRef.current = true
    setInitialValues(nextValues)
    setFormValues(nextValues)
    setAvatarPreviewUrl(profile.avatarUrl)
  }, [profileQuery.data])

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

  const handleAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    const validationMessage = validateAvatarFile(file)
    event.target.value = ''

    if (validationMessage) {
      showToast({ kind: 'error', message: validationMessage })
      return
    }

    const previousAvatarUrl = formValues.avatarUrl
    const nextPreviewUrl = URL.createObjectURL(file)
    setIsUploadingAvatar(true)
    setAvatarPreviewUrl(nextPreviewUrl)
    replaceLocalPreview(nextPreviewUrl)
    clearFieldError('avatarUrl')

    try {
      const publicUrl = await uploadAvatar(file)
      setFormValues((current) => ({ ...current, avatarUrl: publicUrl }))
      showToast({ kind: 'success', message: 'Avatar đã được tải lên. Hãy bấm lưu để cập nhật hồ sơ.' })
    } catch {
      setAvatarPreviewUrl(previousAvatarUrl)
      clearLocalPreview()
      showToast({ kind: 'error', message: 'Tải avatar thất bại. Hồ sơ hiện tại chưa bị thay đổi.' })
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  const handleRemoveAvatar = () => {
    clearLocalPreview()
    setAvatarPreviewUrl(null)
    setFormValues((current) => ({ ...current, avatarUrl: null }))
    clearFieldError('avatarUrl')
  }

  const addSkill = (field: 'skillsToTeach' | 'skillsToLearn', draft: string) => {
    const normalized = draft.trim()
    if (!normalized) {
      return
    }

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

    setFormValues((current) => {
      const list = current[field]
      return {
        ...current,
        [field]: [...list, normalized],
      }
    })
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
            <div className="profile-avatar-shell">
              {avatarPreviewUrl ? (
                <img className="profile-avatar" src={avatarPreviewUrl} alt={formValues.displayName} />
              ) : (
                <div className="profile-avatar placeholder">
                  <UserRound size={44} />
                </div>
              )}
              <div className="profile-avatar-actions">
                <input
                  accept="image/jpeg,image/png,image/webp"
                  className="profile-file-input"
                  onChange={handleAvatarChange}
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
                  disabled={!avatarPreviewUrl && !formValues.avatarUrl}
                  onClick={handleRemoveAvatar}
                  type="button"
                >
                  <Trash2 size={18} />
                  Xóa avatar
                </button>
              </div>
              <p className="profile-helper-copy">Hỗ trợ JPG, PNG, WEBP. Kích thước tối đa 5 MB.</p>
              {fieldErrors.avatarUrl ? <p className="profile-field-error">{fieldErrors.avatarUrl}</p> : null}
            </div>

            <div className="profile-meta-card">
              <h2>Vai trò & hoạt động</h2>
              <div className="profile-role-row">
                {profileQuery.data.roles.map((role) => (
                  <span className="profile-role-badge" key={role}>
                    {getRoleBadgeLabel(role)}
                  </span>
                ))}
              </div>
              <dl className="profile-stats">
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

            <div className="profile-form-grid">
              <Field error={fieldErrors.displayName} label="Tên hiển thị" required>
                <input
                  onChange={(event) => handleChange('displayName', event.target.value)}
                  value={formValues.displayName}
                />
              </Field>

              <Field error={fieldErrors.isPublic} label="Chế độ hồ sơ">
                <label className="profile-switch">
                  <input
                    checked={formValues.isPublic}
                    onChange={(event) => handleChange('isPublic', event.target.checked)}
                    type="checkbox"
                  />
                  <span>{formValues.isPublic ? 'Public profile' : 'Private profile'}</span>
                </label>
              </Field>

              <Field className="full" error={fieldErrors.bio} label="Tiểu sử">
                <textarea
                  onChange={(event) => handleChange('bio', event.target.value)}
                  rows={4}
                  value={formValues.bio}
                />
              </Field>

              <Field error={fieldErrors.university} label="Trường">
                <input
                  onChange={(event) => handleChange('university', event.target.value)}
                  value={formValues.university}
                />
              </Field>

              <Field error={fieldErrors.faculty} label="Khoa / ngành">
                <input
                  onChange={(event) => handleChange('faculty', event.target.value)}
                  value={formValues.faculty}
                />
              </Field>

              <Field error={fieldErrors.yearOfStudy} label="Năm học">
                <select
                  onChange={(event) =>
                    handleChange(
                      'yearOfStudy',
                      event.target.value ? Number(event.target.value) : null,
                    )
                  }
                  value={formValues.yearOfStudy ?? ''}
                >
                  <option value="">Chưa cập nhật</option>
                  {[1, 2, 3, 4, 5, 6].map((year) => (
                    <option key={year} value={year}>
                      Năm {year}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="profile-skills-grid">
              <SkillInput
                draft={teachDraft}
                error={fieldErrors.skillsToTeach}
                label="Kỹ năng muốn dạy"
                onAdd={() => {
                  addSkill('skillsToTeach', teachDraft)
                  setTeachDraft('')
                }}
                onChange={setTeachDraft}
                onRemove={(skill) => removeSkill('skillsToTeach', skill)}
                placeholder="Ví dụ: React, SQL, Guitar"
                skills={formValues.skillsToTeach}
              />
              <SkillInput
                draft={learnDraft}
                error={fieldErrors.skillsToLearn}
                label="Kỹ năng muốn học"
                onAdd={() => {
                  addSkill('skillsToLearn', learnDraft)
                  setLearnDraft('')
                }}
                onChange={setLearnDraft}
                onRemove={(skill) => removeSkill('skillsToLearn', skill)}
                placeholder="Ví dụ: Docker, Public speaking"
                skills={formValues.skillsToLearn}
              />
            </div>

            <div className="profile-form-footnote">
              <Eye size={16} />
              <span>
                Chỉ các trường thay đổi mới được gửi lên backend. Danh sách kỹ năng sẽ được thay thế
                toàn bộ nếu bạn chỉnh sửa.
              </span>
            </div>
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
          <p>Trang này chỉ hiển thị dữ liệu public được backend cho phép truy cập.</p>
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

function SkillInput({
  draft,
  error,
  label,
  onAdd,
  onChange,
  onRemove,
  placeholder,
  skills,
}: {
  draft: string
  error?: string
  label: string
  onAdd: () => void
  onChange: (value: string) => void
  onRemove: (skill: string) => void
  placeholder: string
  skills: string[]
}) {
  return (
    <div className="profile-skills-card">
      <div className="profile-skills-head">
        <div>
          <h3>{label}</h3>
          <p>Tối đa 20 kỹ năng, mỗi kỹ năng tối đa 50 ký tự.</p>
        </div>
      </div>
      <div className="profile-skill-entry">
        <input
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              onAdd()
            }
          }}
          placeholder={placeholder}
          value={draft}
        />
        <button className="button secondary" onClick={onAdd} type="button">
          Thêm
        </button>
      </div>
      {error ? <p className="profile-field-error">{error}</p> : null}
      <SkillChips emptyLabel="Chưa có kỹ năng nào." onRemove={onRemove} skills={normalizeSkills(skills)} />
    </div>
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
  label,
  required = false,
}: {
  children: ReactNode
  className?: string
  error?: string
  label: string
  required?: boolean
}) {
  return (
    <div className={`profile-field ${className ?? ''}`.trim()}>
      <span>
        {label}
        {required ? ' *' : ''}
      </span>
      {children}
      {error ? <p className="profile-field-error">{error}</p> : null}
    </div>
  )
}
