import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CalendarDays, ChevronRight, FileText, ShieldCheck } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { getErrorMessage, isApiError } from '../../api/client'
import { SiteHeader } from '../../components/Brand'
import { MotionPage } from '../../components/MotionPage'
import { policyApi, policyKeys } from './policyApi'
import {
  formatPolicyDate,
  getAudienceLabel,
  getPolicyCategoryLabel,
  getPolicyLabel,
  policyCategoryOrder,
} from './policyUtils'
import type { PolicySummary } from './types'

export function PoliciesPage() {
  const policiesQuery = useQuery({
    queryKey: policyKeys.catalog(),
    queryFn: policyApi.getPolicies,
    staleTime: 5 * 60 * 1000,
  })

  const groupedPolicies = useMemo(() => {
    const groups = new Map<string, PolicySummary[]>()

    for (const policy of policiesQuery.data ?? []) {
      const current = groups.get(policy.category) ?? []
      groups.set(policy.category, [...current, policy])
    }

    return [
      ...policyCategoryOrder
        .filter((category) => groups.has(category))
        .map((category) => ({
          category,
          label: getPolicyCategoryLabel(category),
          policies: groups.get(category) ?? [],
        })),
      ...[...groups.entries()]
        .filter(([category]) => !policyCategoryOrder.includes(category as (typeof policyCategoryOrder)[number]))
        .map(([category, policies]) => ({
          category,
          label: getPolicyCategoryLabel(category),
          policies: policies ?? [],
        })),
    ]
  }, [policiesQuery.data])

  return (
    <MotionPage className="page landing-page policy-page">
      <SiteHeader />
      <section className="policy-hero">
        <span className="eyebrow">
          <ShieldCheck size={15} />
          Policy Center
        </span>
        <h1>Chính sách và quy tắc nền tảng EdSkill.</h1>
        <p>
          Xem các điều khoản, chính sách riêng tư, quy định điểm và những tài liệu nền tảng khác
          đang có hiệu lực trên EdSkill.
        </p>
      </section>

      {policiesQuery.isLoading ? (
        <section className="policy-state-card">
          <p className="status-message info">Đang tải danh sách chính sách...</p>
        </section>
      ) : null}

      {policiesQuery.isError ? (
        <section className="policy-state-card">
          <p className="status-message error">{getErrorMessage(policiesQuery.error)}</p>
        </section>
      ) : null}

      {!policiesQuery.isLoading && !policiesQuery.isError ? (
        <div className="policy-groups">
          {groupedPolicies.length === 0 ? (
            <section className="policy-group">
              <p className="status-message info">Hiện chưa có chính sách nào được công bố.</p>
            </section>
          ) : null}
          {groupedPolicies.map((group) => (
            <section className="policy-group" key={group.category}>
              <div className="policy-group-head">
                <h2>{group.label}</h2>
                <span>{group.policies.length} tài liệu</span>
              </div>
              <div className="policy-card-grid">
                {group.policies.map((policy) => (
                  <article className="policy-card" key={policy.slug}>
                    <div className="policy-card-top">
                      <span className={`policy-badge ${policy.requiresAcceptance ? 'required' : 'readonly'}`}>
                        {policy.requiresAcceptance ? 'Cần đồng ý' : 'Read only'}
                      </span>
                      <span className="policy-version">{policy.version}</span>
                    </div>
                    <h3>{getPolicyLabel(policy.slug, policy.title)}</h3>
                    <p>{policy.summary}</p>
                    <dl className="policy-meta">
                      <div>
                        <dt>Đối tượng</dt>
                        <dd>{getAudienceLabel(policy.audience)}</dd>
                      </div>
                      <div>
                        <dt>Hiệu lực</dt>
                        <dd>
                          <CalendarDays size={14} />
                          {formatPolicyDate(policy.effectiveAt)}
                        </dd>
                      </div>
                    </dl>
                    <Link className="policy-link" to={`/policies/${policy.slug}`}>
                      Xem chi tiết
                      <ChevronRight size={16} />
                    </Link>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : null}
    </MotionPage>
  )
}

export function PolicyDetailPage() {
  const { slug = '' } = useParams()
  const detailQuery = useQuery({
    queryKey: policyKeys.detail(slug),
    queryFn: () => policyApi.getPolicyBySlug(slug),
    enabled: Boolean(slug),
  })

  const isNotFound = isApiError(detailQuery.error) && detailQuery.error.code === 'POLICY_DOCUMENT_NOT_FOUND'

  return (
    <MotionPage className="page landing-page policy-page">
      <SiteHeader />
      <section className="policy-detail-shell">
        <div className="policy-detail-head">
          <Link className="policy-back-link" to="/policies">
            <ChevronRight size={16} />
            Quay lại Policy Center
          </Link>
          <span className="eyebrow">
            <FileText size={15} />
            Policy Detail
          </span>
        </div>

        {detailQuery.isLoading ? <p className="status-message info">Đang tải nội dung chính sách...</p> : null}

        {detailQuery.isError ? (
          <p className="status-message error">
            {isNotFound
              ? 'Không tìm thấy tài liệu chính sách bạn yêu cầu.'
              : getErrorMessage(detailQuery.error)}
          </p>
        ) : null}

        {detailQuery.data ? (
          <article className="policy-detail-card">
            <div className="policy-detail-meta">
              <span className={`policy-badge ${detailQuery.data.requiresAcceptance ? 'required' : 'readonly'}`}>
                {detailQuery.data.requiresAcceptance ? 'Cần đồng ý' : 'Read only'}
              </span>
              <span className="policy-version">{detailQuery.data.version}</span>
              <span className="policy-audience">{getAudienceLabel(detailQuery.data.audience)}</span>
            </div>
            <h1>{getPolicyLabel(detailQuery.data.slug, detailQuery.data.title)}</h1>
            <p className="policy-detail-summary">{detailQuery.data.summary}</p>
            <div className="policy-detail-info">
              <span>{getPolicyCategoryLabel(detailQuery.data.category)}</span>
              <span>Hiệu lực từ {formatPolicyDate(detailQuery.data.effectiveAt)}</span>
            </div>
            <div className="policy-markdown">
              <ReactMarkdown>{detailQuery.data.contentMarkdown}</ReactMarkdown>
            </div>
          </article>
        ) : null}
      </section>
    </MotionPage>
  )
}
