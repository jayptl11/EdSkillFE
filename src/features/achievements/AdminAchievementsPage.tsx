import { useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, Award, Eye, EyeOff, LoaderCircle, RefreshCcw, Save, Shield, Upload } from 'lucide-react'
import { Link, Navigate } from 'react-router-dom'
import { getErrorMessage } from '../../api/client'
import { invalidateAchievementAdminQueries } from '../../api/cacheInvalidation'
import { SiteHeader } from '../../components/Brand'
import { MotionPage } from '../../components/MotionPage'
import { showToast } from '../../components/toastEvents'
import { useAppStore } from '../../store/useAppStore'
import { achievementApi, achievementKeys, uploadAchievementIcon } from './achievementApi'
import type { AchievementMetric, AchievementTrack, AdminAchievementDto, CreateAchievementRequest, UpdateAchievementRequest } from './types'

interface AchievementFormValues {
  name: string
  description: string
  iconUrl: string
  track: AchievementTrack
  metric: AchievementMetric
  threshold: string
  sortOrder: string
  isActive: boolean
}

const emptyForm: AchievementFormValues = {
  name: '',
  description: '',
  iconUrl: '',
  track: 'companion',
  metric: 'completed_sessions',
  threshold: '1',
  sortOrder: '10',
  isActive: true,
}

const metricOptions: Array<{ value: AchievementMetric; label: string }> = [
  { value: 'completed_sessions', label: 'Hoàn thành buổi học' },
  { value: 'completed_hours', label: 'Hoàn thành số giờ' },
  { value: 'distinct_completed_learners', label: 'Số learner hoàn thành' },
]

const trackOptions: Array<{ value: AchievementTrack; label: string }> = [
  { value: 'companion', label: 'Companion' },
  { value: 'learner', label: 'Learner' },
]

export function AdminAchievementsPage() {
  const session = useAppStore((state) => state.session)
  const queryClient = useQueryClient()
  const [includeInactive, setIncludeInactive] = useState(true)
  const [selectedAchievementId, setSelectedAchievementId] = useState<string | null>(null)
  const [formValues, setFormValues] = useState<AchievementFormValues>(emptyForm)
  const [isUploadingIcon, setIsUploadingIcon] = useState(false)

  const adminAchievementsQuery = useQuery({
    queryKey: achievementKeys.adminList(includeInactive),
    queryFn: () => achievementApi.getAdminAchievements(includeInactive),
    staleTime: 60 * 1000,
  })

  const selectedAchievement = useMemo(
    () => (adminAchievementsQuery.data ?? []).find((achievement) => achievement.achievementId === selectedAchievementId) ?? null,
    [adminAchievementsQuery.data, selectedAchievementId],
  )

  const createMutation = useMutation({
    mutationFn: (payload: CreateAchievementRequest) => achievementApi.createAchievement(payload),
    onSuccess: async (achievement) => {
      showToast({ kind: 'success', message: 'Thành tích mới đã được tạo.' })
      await refreshAchievements()
      setSelectedAchievementId(achievement.achievementId)
      setFormValues(toFormValues(achievement))
    },
    onError: (error) => showToast({ kind: 'error', message: getErrorMessage(error) }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ achievementId, payload }: { achievementId: string; payload: UpdateAchievementRequest }) =>
      achievementApi.updateAchievement(achievementId, payload),
    onSuccess: async (achievement) => {
      showToast({ kind: 'success', message: 'Thành tích đã được cập nhật.' })
      await refreshAchievements()
      setSelectedAchievementId(achievement.achievementId)
      setFormValues(toFormValues(achievement))
    },
    onError: (error) => showToast({ kind: 'error', message: getErrorMessage(error) }),
  })

  if (!session?.accessToken) {
    return <Navigate replace state={{ message: 'Vui lòng đăng nhập để tiếp tục.' }} to="/login" />
  }

  if (!session.roles.includes('admin')) {
    return <Navigate replace to="/dashboard" />
  }

  const isSaving = createMutation.isPending || updateMutation.isPending

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const name = formValues.name.trim()
    const description = formValues.description.trim()
    const threshold = Number(formValues.threshold)
    const sortOrder = Number(formValues.sortOrder)

    if (!name) {
      showToast({ kind: 'error', message: 'Tên thành tích là bắt buộc.' })
      return
    }

    if (!description) {
      showToast({ kind: 'error', message: 'Mô tả thành tích là bắt buộc.' })
      return
    }

    if (!Number.isInteger(threshold) || threshold <= 0) {
      showToast({ kind: 'error', message: 'Ngưỡng phải là số nguyên lớn hơn 0.' })
      return
    }

    if (!Number.isInteger(sortOrder)) {
      showToast({ kind: 'error', message: 'Thứ tự hiển thị phải là số nguyên.' })
      return
    }

    if (formValues.track === 'learner' && formValues.metric === 'distinct_completed_learners') {
      showToast({ kind: 'error', message: 'Metric này chỉ hợp lệ cho companion.' })
      return
    }

    if (!selectedAchievement) {
      createMutation.mutate({
        name,
        description,
        iconUrl: formValues.iconUrl.trim() || null,
        track: formValues.track,
        metric: formValues.metric,
        threshold,
        sortOrder,
      })
      return
    }

    const payload = buildAchievementPatch(formValues, selectedAchievement)
    if (Object.keys(payload).length === 0) {
      showToast({ kind: 'info', message: 'Chưa có thay đổi nào để lưu.' })
      return
    }

    updateMutation.mutate({ achievementId: selectedAchievement.achievementId, payload })
  }

  const handleIconChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    setIsUploadingIcon(true)
    try {
      const publicUrl = await uploadAchievementIcon(file)
      setFormValues((current) => ({ ...current, iconUrl: publicUrl }))
      showToast({ kind: 'success', message: 'Icon thành tích đã được tải lên.' })
    } catch (error) {
      showToast({ kind: 'error', message: error instanceof Error ? error.message : getErrorMessage(error) })
    } finally {
      setIsUploadingIcon(false)
    }
  }

  const resetForm = () => {
    setSelectedAchievementId(null)
    setFormValues(emptyForm)
  }

  const toggleActive = (achievement: AdminAchievementDto) => {
    updateMutation.mutate({
      achievementId: achievement.achievementId,
      payload: { isActive: !achievement.isActive },
    })
  }

  async function refreshAchievements() {
    await invalidateAchievementAdminQueries(queryClient)
  }

  return (
    <MotionPage className="page dashboard-page profile-page admin-achievements-page">
      <SiteHeader />

      <section className="dashboard-hero profile-hero">
        <div>
          <span className="eyebrow">
            <Shield size={15} />
            Quản lý thành tích
          </span>
          <h1>Thiết lập thành tích cho learner và companion.</h1>
          <p>Quản lý icon, điều kiện đạt và trạng thái hiển thị theo đúng contract backend.</p>
        </div>
        <div className="profile-hero-actions">
          <Link className="button secondary" to="/dashboard">
            Về dashboard
          </Link>
          <button className="button secondary" onClick={() => void refreshAchievements()} type="button">
            <RefreshCcw size={18} />
            Làm mới
          </button>
        </div>
      </section>

      <section className="admin-achievements-layout">
        <aside className="admin-achievements-list-card">
          <div className="admin-achievements-toolbar">
            <label className="admin-toggle-row">
              <input
                checked={includeInactive}
                onChange={(event) => setIncludeInactive(event.target.checked)}
                type="checkbox"
              />
              <span>Hiển thị cả thành tích inactive</span>
            </label>

            <button className="button secondary" onClick={resetForm} type="button">
              <Award size={18} />
              Tạo thành tích mới
            </button>
          </div>

          {adminAchievementsQuery.isLoading ? (
            <div className="profile-state-card">
              <LoaderCircle className="spin" size={20} />
              <p>Đang tải danh sách thành tích...</p>
            </div>
          ) : null}

          {adminAchievementsQuery.isError ? (
            <div className="profile-state-card error">
              <AlertCircle size={20} />
              <p>{getErrorMessage(adminAchievementsQuery.error)}</p>
            </div>
          ) : null}

          {adminAchievementsQuery.data ? (
            <div className="admin-achievement-list">
              {adminAchievementsQuery.data.length === 0 ? (
                <div className="admin-achievement-empty">
                  <p>Chưa có thành tích nào trong hệ thống.</p>
                </div>
              ) : (
                adminAchievementsQuery.data.map((achievement) => (
                  <article
                    className={`admin-achievement-item${achievement.achievementId === selectedAchievementId ? ' selected' : ''}`}
                    key={achievement.achievementId}
                  >
                    <button
                      className="admin-achievement-main"
                      onClick={() => {
                        setSelectedAchievementId(achievement.achievementId)
                        setFormValues(toFormValues(achievement))
                      }}
                      type="button"
                    >
                      {achievement.iconUrl ? (
                        <img alt={achievement.name} className="admin-achievement-main-icon" src={achievement.iconUrl} />
                      ) : (
                        <div className="admin-achievement-main-icon placeholder" aria-hidden="true">
                          <Award size={18} />
                        </div>
                      )}
                      <div className="admin-achievement-copy">
                        <strong>{achievement.name}</strong>
                        <span>{trackLabelMap[achievement.track]}</span>
                        <small>{metricLabelMap[achievement.metric]}</small>
                      </div>
                      <span className={`admin-skill-status ${achievement.isActive ? 'active' : 'inactive'}`}>
                        {achievement.isActive ? 'Active' : 'Hidden'}
                      </span>
                    </button>

                    <div className="admin-achievement-actions">
                      <button className="button secondary ghost" onClick={() => toggleActive(achievement)} type="button">
                        {achievement.isActive ? <EyeOff size={16} /> : <Eye size={16} />}
                        {achievement.isActive ? 'Ẩn' : 'Hiện'}
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          ) : null}
        </aside>

        <form className="profile-form-card admin-achievement-form-card" onSubmit={handleSubmit}>
          <div className="profile-form-heading">
            <div>
              <span className="eyebrow">
                <Award size={15} />
                {selectedAchievement ? 'Cập nhật thành tích' : 'Tạo thành tích'}
              </span>
              <h2>{selectedAchievement ? selectedAchievement.name : 'Thành tích mới'}</h2>
            </div>
            <div className="profile-form-actions">
              <button className="button primary" disabled={isSaving || isUploadingIcon} type="submit">
                {isSaving ? <LoaderCircle className="spin" size={18} /> : <Save size={18} />}
                {selectedAchievement ? 'Lưu thay đổi' : 'Tạo thành tích'}
              </button>
            </div>
          </div>

          <section className="profile-section-card">
            <div className="profile-form-grid">
              <label className="profile-field">
                <span>Tên thành tích *</span>
                <input
                  onChange={(event) => setFormValues((current) => ({ ...current, name: event.target.value }))}
                  value={formValues.name}
                />
              </label>

              <label className="profile-field">
                <span>Loại thành tích *</span>
                <select
                  onChange={(event) =>
                    setFormValues((current) => ({
                      ...current,
                      track: event.target.value as AchievementTrack,
                      metric:
                        event.target.value === 'learner' && current.metric === 'distinct_completed_learners'
                          ? 'completed_sessions'
                          : current.metric,
                    }))
                  }
                  value={formValues.track}
                >
                  {trackOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="profile-field">
                <span>Điều kiện đạt *</span>
                <select
                  onChange={(event) => setFormValues((current) => ({ ...current, metric: event.target.value as AchievementMetric }))}
                  value={formValues.metric}
                >
                  {metricOptions
                    .filter((option) => formValues.track === 'companion' || option.value !== 'distinct_completed_learners')
                    .map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                </select>
              </label>

              <label className="profile-field">
                <span>Ngưỡng *</span>
                <input
                  min={1}
                  onChange={(event) => setFormValues((current) => ({ ...current, threshold: event.target.value }))}
                  type="number"
                  value={formValues.threshold}
                />
              </label>

              <label className="profile-field">
                <span>Thứ tự hiển thị *</span>
                <input
                  onChange={(event) => setFormValues((current) => ({ ...current, sortOrder: event.target.value }))}
                  type="number"
                  value={formValues.sortOrder}
                />
              </label>

              <div className="profile-field admin-field-switch">
                <span>Trạng thái hiển thị</span>
                <label className="profile-switch">
                  <input
                    checked={formValues.isActive}
                    className="profile-switch-input"
                    onChange={(event) =>
                      setFormValues((current) => ({ ...current, isActive: event.target.checked }))
                    }
                    type="checkbox"
                  />
                  <span aria-hidden="true" className="profile-switch-track">
                    <span className="profile-switch-thumb" />
                  </span>
                  <span className="profile-switch-copy">
                    <strong>{formValues.isActive ? 'Active' : 'Hidden'}</strong>
                    <small>Achievement inactive sẽ không được cấp cho các lần grant mới.</small>
                  </span>
                </label>
              </div>

              <label className="profile-field full">
                <span>Mô tả *</span>
                <textarea
                  onChange={(event) => setFormValues((current) => ({ ...current, description: event.target.value }))}
                  rows={4}
                  value={formValues.description}
                />
              </label>

              <div className="profile-field full">
                <span>Icon</span>
                <div className="admin-achievement-icon-field">
                  {formValues.iconUrl ? (
                    <img alt={formValues.name || 'Achievement icon'} className="admin-achievement-preview" src={formValues.iconUrl} />
                  ) : (
                    <div className="admin-achievement-preview placeholder" aria-hidden="true">
                      <Award size={28} />
                    </div>
                  )}
                  <div className="admin-achievement-icon-actions">
                    <label className="button secondary">
                      {isUploadingIcon ? <LoaderCircle className="spin" size={18} /> : <Upload size={18} />}
                      {isUploadingIcon ? 'Đang tải...' : 'Tải icon'}
                      <input
                        accept=".jpg,.jpeg,.png,.webp,image/jpg,image/jpeg,image/png,image/webp"
                        className="profile-file-input"
                        onChange={handleIconChange}
                        type="file"
                      />
                    </label>
                    <button
                      className="button secondary ghost"
                      onClick={() => setFormValues((current) => ({ ...current, iconUrl: '' }))}
                      type="button"
                    >
                      Xóa icon
                    </button>
                  </div>
                </div>
                <small style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem', marginTop: '0.5rem' }}>
                  Hỗ trợ JPG, JPEG, PNG, WEBP. Kích thước tối đa 10 MB.
                </small>
              </div>

              {selectedAchievement ? (
                <label className="profile-field full">
                  <span>Hiệu lực từ</span>
                  <input disabled value={new Date(selectedAchievement.effectiveFromUtc).toLocaleString('vi-VN')} />
                </label>
              ) : null}
            </div>
          </section>
        </form>
      </section>
    </MotionPage>
  )
}

function toFormValues(achievement: AdminAchievementDto): AchievementFormValues {
  return {
    name: achievement.name,
    description: achievement.description,
    iconUrl: achievement.iconUrl ?? '',
    track: achievement.track,
    metric: achievement.metric,
    threshold: String(achievement.threshold),
    sortOrder: String(achievement.sortOrder),
    isActive: achievement.isActive,
  }
}

function buildAchievementPatch(formValues: AchievementFormValues, achievement: AdminAchievementDto): UpdateAchievementRequest {
  const payload: UpdateAchievementRequest = {}
  const name = formValues.name.trim()
  const description = formValues.description.trim()
  const iconUrl = formValues.iconUrl.trim()
  const threshold = Number(formValues.threshold)
  const sortOrder = Number(formValues.sortOrder)

  if (name !== achievement.name) {
    payload.name = name
  }

  if (description !== achievement.description) {
    payload.description = description
  }

  if ((iconUrl || null) !== achievement.iconUrl) {
    payload.iconUrl = iconUrl || null
  }

  if (formValues.track !== achievement.track) {
    payload.track = formValues.track
  }

  if (formValues.metric !== achievement.metric) {
    payload.metric = formValues.metric
  }

  if (!Number.isNaN(threshold) && threshold !== achievement.threshold) {
    payload.threshold = threshold
  }

  if (!Number.isNaN(sortOrder) && sortOrder !== achievement.sortOrder) {
    payload.sortOrder = sortOrder
  }

  if (formValues.isActive !== achievement.isActive) {
    payload.isActive = formValues.isActive
  }

  return payload
}

const trackLabelMap: Record<AchievementTrack, string> = {
  companion: 'Companion',
  learner: 'Learner',
}

const metricLabelMap: Record<AchievementMetric, string> = {
  completed_sessions: 'Hoàn thành buổi học',
  completed_hours: 'Hoàn thành số giờ',
  distinct_completed_learners: 'Số learner hoàn thành',
}
