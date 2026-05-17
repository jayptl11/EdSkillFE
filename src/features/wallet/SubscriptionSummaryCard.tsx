import { Crown, Sparkles } from 'lucide-react'
import type { ActiveSubscriptionSummaryDto, ResolvedSubscriptionEntitlementsDto } from './types'
import {
  buildEntitlementList,
  formatDate,
  getSubscriptionStatusLabel,
} from './walletUtils'

export function SubscriptionSummaryCard({
  subscriptions,
  entitlements,
  title = 'Gói đang dùng',
  emptyLabel = 'Bạn chưa có gói subscription đang hoạt động.',
  compact = false,
}: {
  subscriptions: ActiveSubscriptionSummaryDto[]
  entitlements: ResolvedSubscriptionEntitlementsDto | null
  title?: string
  emptyLabel?: string
  compact?: boolean
}) {
  const entitlementItems = buildEntitlementList(entitlements)

  return (
    <section className={`wallet-subscription-summary${compact ? ' compact' : ''}`}>
      <div className="wallet-subscription-summary-head">
        <h3>{title}</h3>
        {subscriptions.length > 0 ? <span>Quyền lợi đang được áp dụng từ backend.</span> : null}
      </div>

      {subscriptions.length === 0 ? (
        <p className="wallet-subscription-empty">{emptyLabel}</p>
      ) : (
        <div className="wallet-subscription-active-list">
          {subscriptions.map((subscription) => (
            <article className="wallet-subscription-active-card" key={subscription.userSubscriptionId}>
              <div className="wallet-subscription-active-main">
                <div>
                  <strong>{subscription.name}</strong>
                  <span>{getSubscriptionStatusLabel(subscription.status)}</span>
                </div>
                <span className="wallet-premium-badge subtle">
                  <Crown size={14} />
                  Gói đang hoạt động
                </span>
              </div>

              <dl className="wallet-subscription-active-grid">
                <div>
                  <dt>Kích hoạt</dt>
                  <dd>{formatDate(subscription.startedAt)}</dd>
                </div>
                <div>
                  <dt>Hết hạn</dt>
                  <dd>{formatDate(subscription.expiresAt)}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      )}

      {entitlementItems.length > 0 ? (
        <div className="wallet-subscription-entitlements">
          <span className="wallet-subscription-entitlements-title">
            <Sparkles size={14} />
            Quyền lợi đang áp dụng
          </span>
          <div className="wallet-subscription-entitlement-list">
            {entitlementItems.map((item) => (
              <span className="wallet-entitlement-chip" key={item}>
                {item}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  )
}
