import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, Coins, LoaderCircle, RefreshCcw, Save, Settings2, Shield } from 'lucide-react'
import { Link, Navigate } from 'react-router-dom'
import { getErrorMessage } from '../../api/client'
import { invalidateAdminSessionWalletQueries } from '../../api/cacheInvalidation'
import { SiteHeader } from '../../components/Brand'
import { MotionPage } from '../../components/MotionPage'
import { showToast } from '../../components/toastEvents'
import { useAppStore } from '../../store/useAppStore'
import { adminSessionWalletApi, adminSessionWalletKeys } from './adminSessionWalletApi'
import {
  getConfigLabel,
  getRelevantAdminConfigs,
  groupConfigs,
  validateConfigDraft,
} from './configUtils'

export function AdminSessionWalletPage() {
  const session = useAppStore((state) => state.session)
  const queryClient = useQueryClient()
  const [userIdsInput, setUserIdsInput] = useState('')
  const [grantAmount, setGrantAmount] = useState('50')
  const [grantNote, setGrantNote] = useState('')
  const [draftOverrides, setDraftOverrides] = useState<Record<string, string>>({})
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const configQuery = useQuery({
    queryKey: adminSessionWalletKeys.config(),
    queryFn: adminSessionWalletApi.getConfig,
    retry: 1,
  })

  const grantMutation = useMutation({
    mutationFn: adminSessionWalletApi.grantPoints,
    onSuccess: async (response) => {
      showToast({ kind: 'success', message: `Đã cấp điểm cho ${response.granted} người dùng.` })
      await invalidateAdminSessionWalletQueries(queryClient)
      setUserIdsInput('')
      setGrantNote('')
    },
    onError: (error) => {
      showToast({ kind: 'error', message: getErrorMessage(error) })
    },
  })

  const patchConfigMutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) =>
      adminSessionWalletApi.patchConfig(key, value),
    onSuccess: async () => {
      showToast({ kind: 'success', message: 'Cấu hình đã được cập nhật.' })
      await invalidateAdminSessionWalletQueries(queryClient)
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

  const relevantConfigs = getRelevantAdminConfigs(configQuery.data ?? [])
  const groupedConfigs = groupConfigs(relevantConfigs)
  const draftValues = Object.fromEntries(
    relevantConfigs.map((item) => [item.key, draftOverrides[item.key] ?? item.value]),
  )
  const configGroups = [
    { title: 'Cấu hình điểm', items: groupedConfigs.point },
    { title: 'Cấu hình buổi học', items: groupedConfigs.session },
  ]

  const handleGrantSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const userIds = userIdsInput
      .split(/[\s,]+/)
      .map((value) => value.trim())
      .filter(Boolean)

    if (userIds.length === 0) {
      showToast({ kind: 'error', message: 'Vui lòng nhập ít nhất 1 ID người dùng.' })
      return
    }

    const amount = Number(grantAmount)
    if (!Number.isFinite(amount) || amount <= 0) {
      showToast({ kind: 'error', message: 'Amount phải lớn hơn 0.' })
      return
    }

    grantMutation.mutate({
      userIds,
      amount,
      note: grantNote.trim() || undefined,
    })
  }

  const handleConfigSave = (key: string) => {
    const draftValue = draftValues[key] ?? ''
    const validationMessage = validateConfigDraft(key, draftValue, draftValues)
    if (validationMessage) {
      setFieldErrors((current) => ({ ...current, [key]: validationMessage }))
      showToast({ kind: 'error', message: validationMessage })
      return
    }

    setFieldErrors((current) => {
      const next = { ...current }
      delete next[key]
      return next
    })
    patchConfigMutation.mutate({ key, value: draftValue.trim() })
  }

  return (
    <MotionPage className="page dashboard-page profile-page session-hub-page">
      <SiteHeader />
      <section className="dashboard-hero profile-hero">
        <div>
          <span className="eyebrow">
            <Shield size={15} />
            Quản trị điểm và buổi học
          </span>
          <h1>Cấp điểm và quản lý cấu hình thanh toán trong một trang.</h1>
          <p>
            Mọi thay đổi cấu hình tại đây sẽ được áp dụng cho toàn bộ hệ thống.
          </p>
        </div>
        <div className="profile-hero-actions">
          <Link className="button secondary" to="/dashboard">
            Về dashboard
          </Link>
          <button
            className="button secondary"
            onClick={() => {
              void configQuery.refetch()
            }}
            type="button"
          >
            <RefreshCcw size={18} />
            Làm mới
          </button>
        </div>
      </section>

      <section className="admin-skills-layout admin-session-wallet-layout">
        <form className="profile-form-card admin-session-panel" onSubmit={handleGrantSubmit}>
          <div className="profile-form-heading">
            <div>
              <span className="eyebrow">
                <Coins size={15} />
                Cấp điểm
              </span>
              <h2>Cấp điểm hàng loạt cho người dùng</h2>
            </div>
          </div>

          <section className="profile-section-card">
            <div className="profile-form-grid">
              <label className="profile-field full">
                <span>ID người dùng</span>
                <textarea
                  onChange={(event) => setUserIdsInput(event.target.value)}
                  placeholder="Nhập ID người dùng, có thể tách bằng dấu phẩy hoặc xuống dòng"
                  rows={7}
                  value={userIdsInput}
                />
              </label>

              <label className="profile-field">
                <span>Amount</span>
                <input
                  min={1}
                  onChange={(event) => setGrantAmount(event.target.value)}
                  type="number"
                  value={grantAmount}
                />
              </label>

              <label className="profile-field">
                <span>Note</span>
                <input
                  onChange={(event) => setGrantNote(event.target.value)}
                  placeholder="Campaign bonus"
                  value={grantNote}
                />
              </label>
            </div>
          </section>

          <div className="profile-form-actions">
            <button className="button primary" disabled={grantMutation.isPending} type="submit">
              {grantMutation.isPending ? <LoaderCircle className="spin" size={18} /> : <Coins size={18} />}
              Cấp điểm
            </button>
          </div>
        </form>

        <section className="profile-form-card admin-session-panel">
          <div className="profile-form-heading">
            <div>
              <span className="eyebrow">
                <Settings2 size={15} />
                Cấu hình hệ thống
              </span>
              <h2>Cấu hình điểm và buổi học</h2>
            </div>
          </div>

          {configQuery.isLoading ? (
            <section className="profile-state-card">
              <LoaderCircle className="spin" size={20} />
              <p>Đang tải cấu hình...</p>
            </section>
          ) : null}

          {configQuery.isError ? (
            <section className="profile-state-card error">
              <AlertCircle size={20} />
              <p>{getErrorMessage(configQuery.error)}</p>
            </section>
          ) : null}

          {configQuery.data ? (
            <div className="admin-config-groups">
              {configGroups.map((group) => (
                <section className="profile-section-card" key={group.title}>
                  <div className="session-action-head">
                    <h3>{group.title}</h3>
                    <p>Các giá trị được kiểm tra tính hợp lệ trước khi lưu.</p>
                  </div>

                  <div className="admin-config-list">
                    {group.items.map((item) => (
                      <article className="admin-config-item" key={item.key}>
                        <div className="admin-config-copy">
                          <strong>{getConfigLabel(item.key)}</strong>
                          <span>{item.key}</span>
                          <small>
                            {item.description || 'Không có description. Updated at: '}
                            {item.updatedAt ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(item.updatedAt)) : 'N/A'}
                          </small>
                        </div>

                        <div className="admin-config-edit">
                          <input
                            onChange={(event) =>
                              setDraftOverrides((current) => ({
                                ...current,
                                [item.key]: event.target.value,
                              }))
                            }
                            value={draftValues[item.key] ?? item.value}
                          />
                          <button
                            className="button secondary"
                            disabled={patchConfigMutation.isPending}
                            onClick={() => handleConfigSave(item.key)}
                            type="button"
                          >
                            {patchConfigMutation.isPending ? <LoaderCircle className="spin" size={18} /> : <Save size={18} />}
                            Lưu
                          </button>
                        </div>

                        {fieldErrors[item.key] ? (
                          <p className="profile-field-error">{fieldErrors[item.key]}</p>
                        ) : null}
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : null}
        </section>
      </section>
    </MotionPage>
  )
}
