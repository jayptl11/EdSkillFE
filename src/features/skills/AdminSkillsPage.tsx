import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  Eye,
  EyeOff,
  LoaderCircle,
  Plus,
  RefreshCcw,
  Save,
  Search,
  Shield,
  Trash2,
} from 'lucide-react'
import { Link, Navigate } from 'react-router-dom'
import { getErrorMessage } from '../../api/client'
import { SiteHeader } from '../../components/Brand'
import { MotionPage } from '../../components/MotionPage'
import { showToast } from '../../components/toastEvents'
import { useAppStore } from '../../store/useAppStore'
import { skillApi, skillKeys } from './skillApi'
import type { AdminSkill, CreateAdminSkillPayload, UpdateAdminSkillPayload } from './types'

const SEARCH_DEBOUNCE_MS = 250

interface SkillFormValues {
  name: string
  slug: string
  category: string
  aliases: string[]
  isActive: boolean
}

const emptyForm: SkillFormValues = {
  name: '',
  slug: '',
  category: '',
  aliases: [],
  isActive: true,
}

export function AdminSkillsPage() {
  const session = useAppStore((state) => state.session)
  const queryClient = useQueryClient()
  const [searchDraft, setSearchDraft] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [includeInactive, setIncludeInactive] = useState(true)
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null)
  const [formValues, setFormValues] = useState<SkillFormValues>(emptyForm)
  const [aliasDraft, setAliasDraft] = useState('')

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSearchQuery(searchDraft.trim())
    }, SEARCH_DEBOUNCE_MS)

    return () => window.clearTimeout(timeoutId)
  }, [searchDraft])

  const adminSkillsQuery = useQuery({
    queryKey: skillKeys.adminList({ q: searchQuery, includeInactive }),
    queryFn: () => skillApi.getAdminSkills({ q: searchQuery, includeInactive }),
    staleTime: 60 * 1000,
  })

  const selectedSkill = useMemo(
    () => (adminSkillsQuery.data ?? []).find((skill) => skill.id === selectedSkillId) ?? null,
    [adminSkillsQuery.data, selectedSkillId],
  )

  const createSkillMutation = useMutation({
    mutationFn: (payload: CreateAdminSkillPayload) => skillApi.createAdminSkill(payload),
    onSuccess: (skill) => {
      showToast({ kind: 'success', message: 'Kỹ năng mới đã được tạo.' })
      void refreshSkills().then(() => {
        setSelectedSkillId(skill.id)
        setFormValues(toFormValues(skill))
        setAliasDraft('')
      })
    },
    onError: (error) => {
      showToast({ kind: 'error', message: getErrorMessage(error) })
    },
  })

  const updateSkillMutation = useMutation({
    mutationFn: ({ skillId, payload }: { skillId: string; payload: UpdateAdminSkillPayload }) =>
      skillApi.updateAdminSkill(skillId, payload),
    onSuccess: (skill) => {
      showToast({ kind: 'success', message: 'Thông tin kỹ năng đã được cập nhật.' })
      void refreshSkills().then(() => {
        setSelectedSkillId(skill.id)
        setFormValues(toFormValues(skill))
        setAliasDraft('')
      })
    },
    onError: (error) => {
      showToast({ kind: 'error', message: getErrorMessage(error) })
    },
  })

  const deleteSkillMutation = useMutation({
    mutationFn: (skillId: string) => skillApi.deleteAdminSkill(skillId),
    onSuccess: () => {
      showToast({ kind: 'success', message: 'Kỹ năng đã được xóa.' })
      void refreshSkills()
      resetForm()
    },
    onError: (error) => {
      showToast({ kind: 'error', message: getErrorMessage(error) })
    },
  })

  if (!session?.accessToken) {
    return <Navigate replace state={{ message: 'Vui lòng đăng nhập để tiếp tục.' }} to="/login" />
  }

  if (!session.roles.includes('admin')) {
    return <Navigate replace to="/dashboard" />
  }

  const isSaving = createSkillMutation.isPending || updateSkillMutation.isPending

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const trimmedName = formValues.name.trim()
    if (!trimmedName) {
      showToast({ kind: 'error', message: 'Tên kỹ năng là bắt buộc.' })
      return
    }

    if (!selectedSkill) {
      createSkillMutation.mutate({
        name: trimmedName,
        slug: formValues.slug.trim() || undefined,
        category: formValues.category.trim() || undefined,
        aliases: normalizeTags(formValues.aliases),
      })
      return
    }

    const payload = buildSkillPatch(formValues, selectedSkill)
    if (Object.keys(payload).length === 0) {
      showToast({ kind: 'info', message: 'Chưa có thay đổi nào để lưu.' })
      return
    }

    updateSkillMutation.mutate({ skillId: selectedSkill.id, payload })
  }

  const handleToggleActive = (skill: AdminSkill) => {
    updateSkillMutation.mutate({
      skillId: skill.id,
      payload: { isActive: !skill.isActive },
    })
  }

  const handleSelectSkill = (skill: AdminSkill) => {
    setSelectedSkillId(skill.id)
    setFormValues(toFormValues(skill))
    setAliasDraft('')
  }

  const handleDelete = (skill: AdminSkill) => {
    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn xóa kỹ năng "${skill.name}"? Người dùng sẽ không thể chọn kỹ năng này nữa.`,
    )
    if (confirmed) {
      deleteSkillMutation.mutate(skill.id)
    }
  }

  const handleAddAlias = () => {
    const normalized = aliasDraft.trim()
    if (!normalized) {
      return
    }

    const alreadyExists = formValues.aliases.some(
      (alias) => alias.trim().toLowerCase() === normalized.toLowerCase(),
    )

    if (alreadyExists) {
      showToast({ kind: 'info', message: 'Alias này đã có trong danh sách.' })
      return
    }

    setFormValues((current) => ({
      ...current,
      aliases: [...current.aliases, normalized],
    }))
    setAliasDraft('')
  }

  const resetForm = () => {
    setSelectedSkillId(null)
    setFormValues(emptyForm)
    setAliasDraft('')
  }

  async function refreshSkills() {
    await queryClient.invalidateQueries({ queryKey: ['skills'] })
  }

  return (
    <MotionPage className="page dashboard-page profile-page admin-skills-page">
      <SiteHeader />
      <section className="dashboard-hero profile-hero">
        <div>
          <span className="eyebrow">
            <Shield size={15} />
            Skill catalog quản trị
          </span>
          <h1>Quản lý taxonomy kỹ năng EdSkill.</h1>
          <p>
            Theo dõi toàn bộ skill catalog, cập nhật metadata và ẩn/hiện kỹ năng đang được dùng cho
            profile picker.
          </p>
        </div>
        <div className="profile-hero-actions">
          <Link className="button secondary" to="/dashboard">
            Về dashboard
          </Link>
          <button
            className="button secondary"
            onClick={() => {
              void refreshSkills()
            }}
            type="button"
          >
            <RefreshCcw size={18} />
            Làm mới
          </button>
        </div>
      </section>

      <section className="admin-skills-layout">
        <aside className="admin-skills-list-card">
          <div className="admin-skills-toolbar">
            <div className="admin-search-shell">
              <Search size={16} />
              <input
                onChange={(event) => setSearchDraft(event.target.value)}
                placeholder="Tìm theo tên, slug hoặc category"
                value={searchDraft}
              />
            </div>
            <label className="admin-toggle-row">
              <input
                checked={includeInactive}
                onChange={(event) => setIncludeInactive(event.target.checked)}
                type="checkbox"
              />
              <span>Hiển thị cả skill inactive</span>
            </label>
          </div>

          <div className="admin-skills-list-head">
            <h2>Danh sách kỹ năng</h2>
            <button className="button secondary" onClick={resetForm} type="button">
              <Plus size={18} />
              Tạo skill mới
            </button>
          </div>

          {adminSkillsQuery.isLoading ? (
            <div className="profile-state-card">
              <LoaderCircle className="spin" size={20} />
              <p>Đang tải skill catalog...</p>
            </div>
          ) : null}

          {adminSkillsQuery.isError ? (
            <div className="profile-state-card error">
              <AlertCircle size={20} />
              <p>{getErrorMessage(adminSkillsQuery.error)}</p>
            </div>
          ) : null}

          {adminSkillsQuery.data ? (
            <div className="admin-skill-list">
              {adminSkillsQuery.data.length === 0 ? (
                <div className="admin-skill-empty">
                  <p>Không có kỹ năng nào khớp bộ lọc hiện tại.</p>
                </div>
              ) : (
                adminSkillsQuery.data.map((skill) => {
                  const isSelected = skill.id === selectedSkillId

                  return (
                    <article
                      className={`admin-skill-item ${isSelected ? 'selected' : ''}`}
                      key={skill.id}
                    >
                      <button
                        className="admin-skill-main"
                        onClick={() => handleSelectSkill(skill)}
                        type="button"
                      >
                        <div className="admin-skill-copy">
                          <strong>{skill.name}</strong>
                          <span>{skill.slug}</span>
                          <small>{skill.category || 'Uncategorized'}</small>
                        </div>
                        <span className={`admin-skill-status ${skill.isActive ? 'active' : 'inactive'}`}>
                          {skill.isActive ? 'Active' : 'Hidden'}
                        </span>
                      </button>

                      <div className="admin-skill-actions">
                        <button
                          className="button secondary ghost"
                          onClick={() => handleToggleActive(skill)}
                          type="button"
                        >
                          {skill.isActive ? <EyeOff size={16} /> : <Eye size={16} />}
                          {skill.isActive ? 'Ẩn' : 'Hiện'}
                        </button>
                        <button
                          className="button danger ghost"
                          onClick={() => handleDelete(skill)}
                          type="button"
                        >
                          <Trash2 size={16} />
                          Xóa
                        </button>
                      </div>
                    </article>
                  )
                })
              )}
            </div>
          ) : null}
        </aside>

        <form className="profile-form-card admin-skill-form-card" onSubmit={handleSubmit}>
          <div className="profile-form-heading">
            <div>
              <span className="eyebrow">
                <Shield size={15} />
                {selectedSkill ? 'Cập nhật skill' : 'Tạo skill'}
              </span>
              <h2>{selectedSkill ? selectedSkill.name : 'Skill mới'}</h2>
            </div>
            <div className="profile-form-actions">
              <button className="button primary" disabled={isSaving} type="submit">
                {isSaving ? <LoaderCircle className="spin" size={18} /> : <Save size={18} />}
                {selectedSkill ? 'Lưu thay đổi' : 'Tạo skill'}
              </button>
            </div>
          </div>

          <section className="profile-section-card">
            <div className="profile-form-grid">
              <label className="profile-field">
                <span>Tên kỹ năng *</span>
                <input
                  onChange={(event) => setFormValues((current) => ({ ...current, name: event.target.value }))}
                  value={formValues.name}
                />
              </label>

              <label className="profile-field">
                <span>Slug</span>
                <input
                  onChange={(event) => setFormValues((current) => ({ ...current, slug: event.target.value }))}
                  placeholder="Để trống để BE tự generate"
                  value={formValues.slug}
                />
              </label>

              <label className="profile-field">
                <span>Category</span>
                <input
                  onChange={(event) =>
                    setFormValues((current) => ({ ...current, category: event.target.value }))
                  }
                  value={formValues.category}
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
                    <small>
                      Skill inactive sẽ không xuất hiện trong public search và không gắn mới vào
                      profile được.
                    </small>
                  </span>
                </label>
              </div>
            </div>
          </section>

          <section className="profile-section-card">
            <div className="profile-section-heading">
              <div>
                <h3>Aliases</h3>
                <p>Dùng cho tìm kiếm và resolve canonical skill từ BE.</p>
              </div>
            </div>

            <div className="profile-skill-entry">
              <input
                onChange={(event) => setAliasDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    handleAddAlias()
                  }
                }}
                placeholder="Ví dụ: English Speaking"
                value={aliasDraft}
              />
              <button className="button secondary profile-add-skill-button" onClick={handleAddAlias} type="button">
                Thêm alias
              </button>
            </div>

            {formValues.aliases.length === 0 ? (
              <p className="profile-empty-copy">Chưa có alias nào.</p>
            ) : (
              <div className="profile-chip-wrap">
                {formValues.aliases.map((alias) => (
                  <span className="profile-chip" key={alias}>
                    {alias}
                    <button
                      aria-label={`Xóa ${alias}`}
                      onClick={() =>
                        setFormValues((current) => ({
                          ...current,
                          aliases: current.aliases.filter((item) => item !== alias),
                        }))
                      }
                      type="button"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </section>
        </form>
      </section>
    </MotionPage>
  )
}

function toFormValues(skill: AdminSkill): SkillFormValues {
  return {
    name: skill.name,
    slug: skill.slug,
    category: skill.category ?? '',
    aliases: skill.aliases ?? [],
    isActive: skill.isActive,
  }
}

function buildSkillPatch(formValues: SkillFormValues, skill: AdminSkill): UpdateAdminSkillPayload {
  const payload: UpdateAdminSkillPayload = {}
  const normalizedAliases = normalizeTags(formValues.aliases)
  const currentAliases = normalizeTags(skill.aliases ?? [])

  if (formValues.name.trim() !== skill.name) {
    payload.name = formValues.name.trim()
  }

  if (formValues.slug.trim() !== skill.slug) {
    payload.slug = formValues.slug.trim()
  }

  if ((formValues.category.trim() || '') !== (skill.category ?? '')) {
    payload.category = formValues.category.trim()
  }

  if (JSON.stringify(normalizedAliases) !== JSON.stringify(currentAliases)) {
    payload.aliases = normalizedAliases
  }

  if (formValues.isActive !== skill.isActive) {
    payload.isActive = formValues.isActive
  }

  return payload
}

function normalizeTags(values: string[]) {
  const deduped = new Set<string>()
  const normalizedValues: string[] = []

  for (const value of values) {
    const normalized = value.trim()
    if (!normalized) {
      continue
    }

    const key = normalized.toLowerCase()
    if (deduped.has(key)) {
      continue
    }

    deduped.add(key)
    normalizedValues.push(normalized)
  }

  return normalizedValues
}
