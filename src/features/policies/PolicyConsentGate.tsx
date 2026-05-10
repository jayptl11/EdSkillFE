import { useState, type ReactNode } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { AlertCircle, ExternalLink, LoaderCircle, RefreshCcw, ShieldAlert } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getErrorMessage, isApiError } from '../../api/client'
import { SiteHeader } from '../../components/Brand'
import { MotionPage } from '../../components/MotionPage'
import { showToast } from '../../components/toastEvents'
import { policyApi, policyKeys } from './policyApi'
import { buildAcceptedPoliciesFromRequirements, getPolicyLabel } from './policyUtils'

export function PolicyConsentGate({ children }: { children: ReactNode }) {
  const consentQuery = useQuery({
    queryKey: policyKeys.consentStatus(),
    queryFn: policyApi.getMyPolicyConsents,
    staleTime: 0,
    retry: 1,
  })

  const acceptMutation = useMutation({
    mutationFn: () => {
      const pendingPolicies = getPendingPolicies(consentQuery.data?.requiredPolicies ?? [])
      const payload = buildAcceptedPoliciesFromRequirements(pendingPolicies)

      if (payload.length === 0) {
        throw new Error('Không có chính sách bắt buộc hợp lệ để gửi xác nhận.')
      }

      return policyApi.acceptMyPolicies(payload)
    },
    onSuccess: async () => {
      await consentQuery.refetch()
      showToast({ kind: 'success', message: 'Bạn đã xác nhận chính sách mới nhất của EdSkill.' })
    },
    onError: async (error) => {
      if (isApiError(error) && error.code === 'UNSUPPORTED_POLICY_TYPE') {
        console.error('Unsupported policy type received during consent refresh.', error)
      }

      if (
        isApiError(error) &&
        (error.code === 'POLICY_VERSION_INVALID' || error.code === 'POLICY_DOCUMENT_NOT_FOUND')
      ) {
        await consentQuery.refetch()
      }

      showToast({ kind: 'error', message: getErrorMessage(error) })
    },
  })

  if (consentQuery.isLoading) {
    return (
      <MotionPage className="page dashboard-page policy-loading-page">
        <SiteHeader />
        <section className="policy-loading-shell">
          <p className="status-message info">Đang kiểm tra trạng thái đồng ý chính sách...</p>
        </section>
      </MotionPage>
    )
  }

  if (consentQuery.isError) {
    return (
      <MotionPage className="page dashboard-page policy-loading-page">
        <SiteHeader />
        <section className="policy-loading-shell">
          <div className="policy-error-card">
            <AlertCircle size={24} />
            <div>
              <h2>Không thể tải trạng thái chính sách</h2>
              <p>{getErrorMessage(consentQuery.error)}</p>
            </div>
            <button className="button secondary" onClick={() => consentQuery.refetch()} type="button">
              <RefreshCcw size={16} />
              Thử lại
            </button>
          </div>
        </section>
      </MotionPage>
    )
  }

  if (consentQuery.data?.isUpToDate) {
    return children
  }

  const pendingPolicies = getPendingPolicies(consentQuery.data?.requiredPolicies ?? [])
  const modalKey = pendingPolicies
    .map((policy) => `${policy.policyType}:${policy.requiredVersion}:${policy.acceptedVersion ?? 'none'}`)
    .join('|')

  return (
    <>
      {children}
      <div className="policy-consent-overlay" role="presentation">
        <PolicyConsentDialog
          acceptPending={acceptMutation.isPending}
          key={modalKey}
          onAccept={() => acceptMutation.mutate()}
          policies={pendingPolicies}
        />
      </div>
    </>
  )
}

function getPendingPolicies(requiredPolicies: Awaited<ReturnType<typeof policyApi.getMyPolicyConsents>>['requiredPolicies']) {
  const pendingPolicies = requiredPolicies.filter((policy) => !policy.isAcceptedLatest)
  return pendingPolicies.length > 0 ? pendingPolicies : requiredPolicies
}

function PolicyConsentDialog({
  policies,
  acceptPending,
  onAccept,
}: {
  policies: Awaited<ReturnType<typeof policyApi.getMyPolicyConsents>>['requiredPolicies']
  acceptPending: boolean
  onAccept: () => void
}) {
  const [hasConfirmed, setHasConfirmed] = useState(false)

  return (
    <div
      aria-labelledby="policy-consent-title"
      aria-modal="true"
      className="policy-consent-modal"
      role="dialog"
    >
      <div className="policy-consent-head">
        <span className="policy-consent-icon">
          <ShieldAlert size={22} />
        </span>
        <div>
          <h2 id="policy-consent-title">EdSkill cập nhật chính sách</h2>
          <p>
            Bạn cần đọc và xác nhận các chính sách bắt buộc mới nhất trước khi tiếp tục dùng khu
            vực đã đăng nhập.
          </p>
        </div>
      </div>

      <div className="policy-consent-list">
        {policies.map((policy) => (
          <article className="policy-consent-item" key={`${policy.policyType}-${policy.requiredVersion}`}>
            <div className="policy-consent-copy">
              <div className="policy-consent-copy-top">
                <h3>{getPolicyLabel(policy.slug, policy.title)}</h3>
                <span className={`policy-badge ${policy.acceptedVersion ? 'required' : 'readonly'}`}>
                  {policy.acceptedVersion ? 'Mới' : 'Chưa đồng ý'}
                </span>
              </div>
              <p>
                Phiên bản cần xác nhận: <strong>{policy.requiredVersion}</strong>
              </p>
              {policy.acceptedVersion ? (
                <p className="policy-consent-previous">Phiên bản trước đó: {policy.acceptedVersion}</p>
              ) : (
                <p className="policy-consent-previous">Bạn chưa đồng ý tài liệu này.</p>
              )}
            </div>
            <Link className="policy-inline-link" rel="noreferrer" target="_blank" to={`/policies/${policy.slug}`}>
              Xem chi tiết
              <ExternalLink size={14} />
            </Link>
          </article>
        ))}
      </div>

      <label className="policy-consent-checkbox">
        <input
          checked={hasConfirmed}
          onChange={(event) => setHasConfirmed(event.target.checked)}
          type="checkbox"
        />
        <span>Tôi đã đọc và đồng ý với các chính sách bắt buộc mới nhất của EdSkill.</span>
      </label>

      <button
        className="button primary full"
        disabled={!hasConfirmed || acceptPending}
        onClick={onAccept}
        type="button"
      >
        {acceptPending ? (
          <>
            <LoaderCircle className="spin" size={18} />
            Đang xác nhận...
          </>
        ) : (
          'Tôi đã đọc và đồng ý'
        )}
      </button>
    </div>
  )
}
