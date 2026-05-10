import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, Coins, LoaderCircle, RefreshCcw, Save, Settings2, Shield } from 'lucide-react'
import { Link, Navigate } from 'react-router-dom'
import { getErrorMessage } from '../../api/client'
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
    onSuccess: (response) => {
      showToast({ kind: 'success', message: `Da grant points cho ${response.granted} user.` })
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
      showToast({ kind: 'success', message: 'Config da duoc cap nhat.' })
      await queryClient.invalidateQueries({ queryKey: adminSessionWalletKeys.config() })
    },
    onError: (error) => {
      showToast({ kind: 'error', message: getErrorMessage(error) })
    },
  })

  if (!session?.accessToken) {
    return <Navigate replace state={{ message: 'Vui long dang nhap de tiep tuc.' }} to="/login" />
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
    { title: 'Point config', items: groupedConfigs.point },
    { title: 'Session config', items: groupedConfigs.session },
  ]

  const handleGrantSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const userIds = userIdsInput
      .split(/[\s,]+/)
      .map((value) => value.trim())
      .filter(Boolean)

    if (userIds.length === 0) {
      showToast({ kind: 'error', message: 'Vui long nhap it nhat 1 userId.' })
      return
    }

    const amount = Number(grantAmount)
    if (!Number.isFinite(amount) || amount <= 0) {
      showToast({ kind: 'error', message: 'Amount phai lon hon 0.' })
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
            Admin points and sessions
          </span>
          <h1>Grant points va quan ly config payout/session trong mot trang.</h1>
          <p>
            FE khong hardcode 80/20. Moi thay doi config o day se tro thanh source-of-truth cho cac
            luong admin va dashboard admin.
          </p>
        </div>
        <div className="profile-hero-actions">
          <Link className="button secondary" to="/dashboard">
            Ve dashboard
          </Link>
          <button
            className="button secondary"
            onClick={() => {
              void configQuery.refetch()
            }}
            type="button"
          >
            <RefreshCcw size={18} />
            Lam moi
          </button>
        </div>
      </section>

      <section className="admin-skills-layout admin-session-wallet-layout">
        <form className="profile-form-card admin-session-panel" onSubmit={handleGrantSubmit}>
          <div className="profile-form-heading">
            <div>
              <span className="eyebrow">
                <Coins size={15} />
                Grant points
              </span>
              <h2>Cap points hang loat cho user</h2>
            </div>
          </div>

          <section className="profile-section-card">
            <div className="profile-form-grid">
              <label className="profile-field full">
                <span>User IDs</span>
                <textarea
                  onChange={(event) => setUserIdsInput(event.target.value)}
                  placeholder="Nhap userId, co the tach bang dau phay hoac xuong dong"
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
              Grant points
            </button>
          </div>
        </form>

        <section className="profile-form-card admin-session-panel">
          <div className="profile-form-heading">
            <div>
              <span className="eyebrow">
                <Settings2 size={15} />
                Runtime config
              </span>
              <h2>Config points + sessions</h2>
            </div>
          </div>

          {configQuery.isLoading ? (
            <section className="profile-state-card">
              <LoaderCircle className="spin" size={20} />
              <p>Dang tai admin config...</p>
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
                    <p>Cac gia tri deu dang string o backend, nhung FE validate duoc nhung gi chac chan.</p>
                  </div>

                  <div className="admin-config-list">
                    {group.items.map((item) => (
                      <article className="admin-config-item" key={item.key}>
                        <div className="admin-config-copy">
                          <strong>{getConfigLabel(item.key)}</strong>
                          <span>{item.key}</span>
                          <small>
                            {item.description || 'Khong co description. Updated at: '}
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
                            Luu
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
