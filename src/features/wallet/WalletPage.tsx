import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Coins,
  Crown,
  Gift,
  LoaderCircle,
  RefreshCcw,
  Sparkles,
  Wallet,
  XCircle,
  Zap,
} from 'lucide-react'
import { Link, Navigate, useLocation, useSearchParams } from 'react-router-dom'
import { getErrorMessage } from '../../api/client'
import { invalidateWalletAndProfileQueries } from '../../api/cacheInvalidation'
import { SiteHeader } from '../../components/Brand'
import { MotionPage } from '../../components/MotionPage'
import { showToast } from '../../components/toastEvents'
import { useAppStore } from '../../store/useAppStore'
import { SubscriptionSummaryCard } from './SubscriptionSummaryCard'
import { walletApi, walletKeys } from './walletApi'
import type {
  ActiveSubscriptionSummaryDto,
  PaymentStatus,
  PaymentTransactionDto,
  PointPackageDto,
  SubscriptionPlanDto,
  SubscriptionPurchaseReturnResultDto,
  VnPayReturnResultDto,
  WalletPaymentsParams,
} from './types'
import {
  formatCurrencyVnd,
  formatDateTime,
  formatPoints,
  getPaymentItemLabel,
  getPaymentStatusLabel,
} from './walletUtils'

const SUMMARY_REFRESH_MS = 30_000
const PAYMENT_LIMIT = 20
const walletTabs = [
  { id: 'points', label: 'Nạp point' },
  { id: 'subscriptions', label: 'Subscription' },
  { id: 'payments', label: 'Lịch sử thanh toán' },
] as const

type WalletTabId = (typeof walletTabs)[number]['id']
type ReturnVariant = 'points' | 'subscriptions'

const paymentStatusOptions: Array<{ label: string; value: WalletPaymentsParams['status'] }> = [
  { label: 'Tất cả', value: '' },
  { label: 'Đang chờ thanh toán', value: 'pending' },
  { label: 'Thành công', value: 'success' },
  { label: 'Thất bại', value: 'failed' },
  { label: 'Đã hoàn tiền', value: 'refunded' },
  { label: 'Đã hủy', value: 'cancelled' },
]

export function WalletPage() {
  const session = useAppStore((state) => state.session)
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = normalizeWalletTab(searchParams.get('tab'))

  const summaryQuery = useQuery({
    queryKey: walletKeys.summary(),
    queryFn: walletApi.getSummary,
    refetchInterval: SUMMARY_REFRESH_MS,
  })

  if (!session?.accessToken) {
    return <Navigate replace state={{ message: 'Vui lòng đăng nhập để tiếp tục.' }} to="/login" />
  }

  return (
    <MotionPage className="page dashboard-page profile-page session-hub-page">
      <SiteHeader />

      <section className="dashboard-hero profile-hero">
        <div>
          <span className="eyebrow">
            <Wallet size={15} />
            Wallet hub
          </span>
          <h1>Quản lý point, subscription và lịch sử thanh toán của bạn.</h1>
          <p>Hiển thị đúng dữ liệu người dùng cần theo contract backend hiện tại, không thêm flow ngoài scope.</p>
        </div>
        <div className="profile-hero-actions">
          <Link className="button secondary" to="/dashboard">
            Về dashboard
          </Link>
          <button
            className="button secondary"
            onClick={() => {
              void summaryQuery.refetch()
            }}
            type="button"
          >
            <RefreshCcw size={18} />
            Làm mới
          </button>
        </div>
      </section>

      {summaryQuery.isLoading ? (
        <section className="profile-state-card">
          <LoaderCircle className="spin" size={24} />
          <p>Đang tải thông tin ví...</p>
        </section>
      ) : null}

      {summaryQuery.isError ? (
        <section className="profile-state-card error">
          <AlertCircle size={22} />
          <div>
            <h2>Không thể tải thông tin ví</h2>
            <p>{getErrorMessage(summaryQuery.error)}</p>
          </div>
        </section>
      ) : null}

      {summaryQuery.data ? (
        <section className="wallet-summary-grid">
          <SummaryCard label="Số dư khả dụng" value={summaryQuery.data.balance} />
          <SummaryCard label="Điểm đang giữ" value={summaryQuery.data.heldBalance} />
          <SummaryCard label="Tổng đã nhận" value={summaryQuery.data.totalEarned} />
          <SummaryCard label="Tổng đã chi" value={summaryQuery.data.totalSpent} />
        </section>
      ) : null}

      <section className="wallet-hub-card">
        <div className="wallet-tab-bar" role="tablist" aria-label="Wallet tabs">
          {walletTabs.map((tab) => (
            <button
              aria-selected={activeTab === tab.id}
              className={`wallet-tab-button${activeTab === tab.id ? ' active' : ''}`}
              key={tab.id}
              onClick={() => setSearchParams({ tab: tab.id })}
              role="tab"
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'points' ? <PointPackagesTab /> : null}
        {activeTab === 'subscriptions' ? <SubscriptionPlansTab /> : null}
        {activeTab === 'payments' ? <PaymentHistoryTab /> : null}
      </section>
    </MotionPage>
  )
}

function PointPackagesTab() {
  const pointPackagesQuery = useQuery({
    queryKey: walletKeys.pointPackages(),
    queryFn: walletApi.getPointPackages,
    staleTime: 5 * 60 * 1000,
  })

  const purchaseMutation = useMutation({
    mutationFn: (packageId: string) => walletApi.createPointPurchase({ packageId }),
    onSuccess: (result) => {
      window.location.assign(result.paymentUrl)
    },
    onError: (error) => {
      showToast({ kind: 'error', message: getErrorMessage(error) })
    },
  })

  return (
    <section className="wallet-tab-panel" role="tabpanel">
      <div className="wallet-section-head">
        <div>
          <h2>Chọn gói point</h2>
          <p>Nạp point qua VNPay. Point chỉ được cộng sau khi backend xác minh callback thành công.</p>
        </div>
      </div>

      {pointPackagesQuery.isLoading ? (
        <section className="profile-state-card">
          <LoaderCircle className="spin" size={20} />
          <p>Đang tải danh sách gói point...</p>
        </section>
      ) : null}

      {pointPackagesQuery.isError ? (
        <section className="profile-state-card error">
          <AlertCircle size={20} />
          <p>{getErrorMessage(pointPackagesQuery.error)}</p>
        </section>
      ) : null}

      {pointPackagesQuery.data ? (
        pointPackagesQuery.data.data.length === 0 ? (
          <section className="session-empty-state">
            <h3>Chưa có gói point nào.</h3>
            <p>Danh sách gói point hiện chưa khả dụng.</p>
          </section>
        ) : (
          <div className="wallet-card-grid">
            {pointPackagesQuery.data.data.map((item) => (
              <PointPackageCard
                isPending={purchaseMutation.isPending && purchaseMutation.variables === item.packageId}
                key={item.packageId}
                onPurchase={() => purchaseMutation.mutate(item.packageId)}
                packageItem={item}
              />
            ))}
          </div>
        )
      ) : null}
    </section>
  )
}

function SubscriptionPlansTab() {
  const subscriptionsPlanQuery = useQuery({
    queryKey: walletKeys.subscriptionPlans(),
    queryFn: walletApi.getSubscriptionPlans,
    staleTime: 5 * 60 * 1000,
  })

  const mySubscriptionsQuery = useQuery({
    queryKey: walletKeys.mySubscriptions(),
    queryFn: walletApi.getMySubscriptions,
  })

  const purchaseMutation = useMutation({
    mutationFn: (planId: string) => walletApi.createSubscriptionPurchase({ planId }),
    onSuccess: (result) => {
      window.location.assign(result.paymentUrl)
    },
    onError: (error) => {
      showToast({ kind: 'error', message: getErrorMessage(error) })
    },
  })

  return (
    <section className="wallet-tab-panel" role="tabpanel">
      <div className="wallet-section-head">
        <div>
          <h2>Subscription của bạn</h2>
          <p>Xem gói đang hoạt động, quyền lợi hiện tại và mua gói mới qua VNPay.</p>
        </div>
      </div>

      {mySubscriptionsQuery.isLoading ? (
        <section className="profile-state-card">
          <LoaderCircle className="spin" size={20} />
          <p>Đang tải thông tin subscription hiện tại...</p>
        </section>
      ) : null}

      {mySubscriptionsQuery.isError ? (
        <section className="profile-state-card error">
          <AlertCircle size={20} />
          <p>{getErrorMessage(mySubscriptionsQuery.error)}</p>
        </section>
      ) : null}

      {mySubscriptionsQuery.data ? (
        <SubscriptionSummaryCard
          compact
          entitlements={mySubscriptionsQuery.data.entitlements}
          subscriptions={mySubscriptionsQuery.data.activeSubscriptions}
          title="Gói đang hoạt động"
        />
      ) : null}

      {subscriptionsPlanQuery.isLoading ? (
        <section className="profile-state-card">
          <LoaderCircle className="spin" size={20} />
          <p>Đang tải danh sách subscription...</p>
        </section>
      ) : null}

      {subscriptionsPlanQuery.isError ? (
        <section className="profile-state-card error">
          <AlertCircle size={20} />
          <p>{getErrorMessage(subscriptionsPlanQuery.error)}</p>
        </section>
      ) : null}

      {subscriptionsPlanQuery.data ? (
        subscriptionsPlanQuery.data.data.length === 0 ? (
          <section className="session-empty-state">
            <h3>Chưa có gói subscription nào.</h3>
            <p>Danh sách subscription hiện chưa khả dụng.</p>
          </section>
        ) : (
          <div className="wallet-card-grid">
            {subscriptionsPlanQuery.data.data.map((plan) => (
              <SubscriptionPlanCard
                activeSubscriptions={mySubscriptionsQuery.data?.activeSubscriptions ?? []}
                isPending={purchaseMutation.isPending && purchaseMutation.variables === plan.planId}
                key={plan.planId}
                onPurchase={() => purchaseMutation.mutate(plan.planId)}
                plan={plan}
              />
            ))}
          </div>
        )
      ) : null}
    </section>
  )
}

function PaymentHistoryTab() {
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<WalletPaymentsParams['status']>('')

  const paymentsQuery = useQuery({
    queryKey: walletKeys.payments({ status: statusFilter, page, limit: PAYMENT_LIMIT }),
    queryFn: () => walletApi.getPayments({ status: statusFilter, page, limit: PAYMENT_LIMIT }),
  })
  const retryPaymentMutation = useMutation({
    mutationFn: (paymentTransactionId: string) => walletApi.retryPayment(paymentTransactionId),
    onSuccess: (result) => {
      window.location.assign(result.paymentUrl)
    },
    onError: (error) => {
      showToast({ kind: 'error', message: getErrorMessage(error) })
    },
  })

  const payments = paymentsQuery.data?.data ?? []
  const totalPages = Math.max(1, Math.ceil((paymentsQuery.data?.total ?? 0) / PAYMENT_LIMIT))

  return (
    <section className="wallet-tab-panel" role="tabpanel">
      <div className="wallet-section-head">
        <div>
          <h2>Lịch sử thanh toán</h2>
          <p>Theo dõi các giao dịch nạp point và mua subscription. Giao dịch pending có thể thanh toán lại.</p>
        </div>
        <label className="session-filter-field wallet-status-filter">
          <span>Trạng thái</span>
          <select
            onChange={(event) => {
              setStatusFilter(event.target.value as WalletPaymentsParams['status'])
              setPage(1)
            }}
            value={statusFilter}
          >
            {paymentStatusOptions.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {paymentsQuery.isLoading ? (
        <section className="profile-state-card">
          <LoaderCircle className="spin" size={20} />
          <p>Đang tải lịch sử thanh toán...</p>
        </section>
      ) : null}

      {paymentsQuery.isError ? (
        <section className="profile-state-card error">
          <AlertCircle size={20} />
          <p>{getErrorMessage(paymentsQuery.error)}</p>
        </section>
      ) : null}

      {paymentsQuery.data ? (
        payments.length === 0 ? (
          <section className="session-empty-state">
            <h3>Chưa có giao dịch nào.</h3>
            <p>Lịch sử thanh toán chưa có dữ liệu cho bộ lọc hiện tại.</p>
          </section>
        ) : (
          <div className="wallet-payment-list">
            {payments.map((payment) => (
              <PaymentHistoryCard
                isRetrying={retryPaymentMutation.isPending && retryPaymentMutation.variables === payment.paymentTransactionId}
                key={payment.paymentTransactionId}
                onRetry={() => retryPaymentMutation.mutate(payment.paymentTransactionId)}
                payment={payment}
              />
            ))}
          </div>
        )
      ) : null}

      {paymentsQuery.data && totalPages > 1 ? (
        <PaginationControls currentPage={page} onPageChange={setPage} totalPages={totalPages} />
      ) : null}
    </section>
  )
}

export function PointPurchaseReturnPage() {
  const location = useLocation()

  return (
    <WalletReturnPageShell
      backHref="/dashboard/wallet?tab=points"
      backLabel="Về tab nạp point"
      title="Kết quả nạp point"
      queryString={location.search}
      queryFn={walletApi.verifyPointPurchaseReturn}
      variant="points"
    />
  )
}

export function SubscriptionPurchaseReturnPage() {
  const location = useLocation()

  return (
    <WalletReturnPageShell
      backHref="/dashboard/wallet?tab=subscriptions"
      backLabel="Về tab subscription"
      title="Kết quả mua subscription"
      queryString={location.search}
      queryFn={walletApi.verifySubscriptionPurchaseReturn}
      variant="subscriptions"
    />
  )
}

function WalletReturnPageShell({
  title,
  backHref,
  backLabel,
  queryString,
  queryFn,
  variant,
}: {
  title: string
  backHref: string
  backLabel: string
  queryString: string
  queryFn: (queryString: string) => Promise<VnPayReturnResultDto | SubscriptionPurchaseReturnResultDto>
  variant: ReturnVariant
}) {
  const queryClient = useQueryClient()

  const returnQuery = useQuery({
    queryKey: walletKeys.return(variant, queryString),
    queryFn: () => queryFn(queryString),
    enabled: Boolean(queryString),
    retry: false,
  })

  useEffect(() => {
    if (!returnQuery.data) {
      return
    }

    void invalidateWalletAndProfileQueries(queryClient)
  }, [queryClient, returnQuery.data])

  return (
    <MotionPage className="page dashboard-page profile-page session-hub-page">
      <SiteHeader />

      <section className="dashboard-hero profile-hero">
        <div>
          <span className="eyebrow">
            {variant === 'points' ? <Coins size={15} /> : <Crown size={15} />}
            VNPay return
          </span>
          <h1>{title}</h1>
          <p>Trang này dùng query callback từ VNPay để gọi lại backend và hiển thị kết quả cuối cùng.</p>
        </div>
        <div className="profile-hero-actions">
          <Link className="button secondary" to={backHref}>
            {backLabel}
          </Link>
        </div>
      </section>

      {!queryString ? (
        <section className="profile-state-card error">
          <AlertCircle size={22} />
          <div>
            <h2>Thiếu dữ liệu callback</h2>
            <p>Không có query callback để xác minh giao dịch với backend.</p>
          </div>
        </section>
      ) : null}

      {returnQuery.isLoading ? (
        <section className="profile-state-card">
          <LoaderCircle className="spin" size={24} />
          <p>Đang xác minh kết quả thanh toán...</p>
        </section>
      ) : null}

      {returnQuery.isError ? (
        <section className="profile-state-card error">
          <AlertCircle size={22} />
          <div>
            <h2>Không thể xác minh giao dịch</h2>
            <p>{getErrorMessage(returnQuery.error)}</p>
          </div>
        </section>
      ) : null}

      {returnQuery.data ? <ReturnResultCard backHref={backHref} data={returnQuery.data} variant={variant} /> : null}
    </MotionPage>
  )
}

function PointPackageCard({
  packageItem,
  onPurchase,
  isPending,
}: {
  packageItem: PointPackageDto
  onPurchase: () => void
  isPending: boolean
}) {
  return (
    <article className={`wallet-offer-card point-card${packageItem.isHighlighted ? ' featured' : ''}`}>
      <div className="wallet-offer-copy">
        <span className="wallet-offer-kicker">
          <Zap size={13} />
          Nạp nhanh qua VNPay
        </span>
        <h3>{packageItem.name}</h3>
        {packageItem.badgeText ? <span className="wallet-premium-badge">{packageItem.badgeText}</span> : null}
      </div>

      <div className="wallet-offer-price">
        <strong>{formatCurrencyVnd(packageItem.priceVnd)}</strong>
        <span>{packageItem.currency}</span>
      </div>

      <div className="wallet-offer-details">
        <div className="wallet-offer-detail-row">
          <Coins size={16} />
          <span>Nhận được</span>
          <strong>{formatPoints(packageItem.points)} point</strong>
        </div>
        {packageItem.bonusPoints > 0 ? (
          <div className="wallet-offer-detail-row bonus">
            <Gift size={16} />
            <span>Bonus thêm</span>
            <strong>+{formatPoints(packageItem.bonusPoints)} point</strong>
          </div>
        ) : null}
      </div>

      <button className="button primary wallet-offer-cta" disabled={isPending} onClick={onPurchase} type="button">
        {isPending ? <LoaderCircle className="spin" size={18} /> : null}
        Thanh toán với VNPay
      </button>
    </article>
  )
}

function SubscriptionPlanCard({
  plan,
  activeSubscriptions,
  onPurchase,
  isPending,
}: {
  plan: SubscriptionPlanDto
  activeSubscriptions: ActiveSubscriptionSummaryDto[]
  onPurchase: () => void
  isPending: boolean
}) {
  const normalizedPlanName = normalizeComparableText(plan.name)
  const normalizedPlanCode = normalizeComparableText(plan.code)

  const isActive = activeSubscriptions.some((subscription) => {
    if (subscription.status !== 'Active') {
      return false
    }

    const normalizedSubscriptionName = normalizeComparableText(subscription.name)
    const normalizedSubscriptionCode = normalizeComparableText(subscription.code)

    return (
      subscription.planId === plan.planId
      || normalizedSubscriptionCode === normalizedPlanCode
      || normalizedSubscriptionName === normalizedPlanName
      || (
        subscription.targetRole === plan.targetRole
        && normalizedSubscriptionName.includes(normalizedPlanName)
      )
    )
  })

  return (
    <article className={`wallet-offer-card subscription-card${isActive ? ' is-active' : ''}`}>
      <div className="wallet-offer-copy">
        <span className="wallet-offer-kicker premium">
          <Sparkles size={13} />
          Gói premium theo tháng
        </span>
        <h3>{plan.name}</h3>
        {isActive ? (
          <span className="wallet-premium-badge subtle">
            <CheckCircle2 size={14} />
            Gói đang hoạt động
          </span>
        ) : null}
      </div>

      <div className="wallet-offer-price gold">
        <strong>{formatCurrencyVnd(plan.priceVnd)}</strong>
        <span>{plan.currency} / tháng</span>
      </div>

      <div className="wallet-benefit-section">
        <span className="wallet-benefit-title">Quyền lợi bao gồm</span>
        <ul className="wallet-benefit-list">
          {plan.displayBenefits.map((benefit) => (
            <li className="wallet-benefit-item" key={benefit}>
              <Check size={16} />
              <span>{benefit}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="wallet-offer-cta-shell">
        <button
          className={`button wallet-offer-cta${isActive ? ' is-active-cta' : ' primary'}`}
          disabled={isPending || isActive}
          onClick={onPurchase}
          type="button"
        >
          {isPending ? <LoaderCircle className="spin" size={18} /> : null}
          {isActive ? 'Đang sử dụng' : 'Mua gói'}
        </button>
      </div>
    </article>
  )
}

function PaymentHistoryCard({
  isRetrying = false,
  onRetry,
  payment,
}: {
  isRetrying?: boolean
  onRetry: () => void
  payment: PaymentTransactionDto
}) {
  return (
    <article className="wallet-payment-card">
      <div className="wallet-payment-head">
        <div>
          <span className={`session-status-chip status-${payment.status.toLowerCase()}`}>
            {getPaymentStatusLabel(payment.status)}
          </span>
          <h3>{payment.packageName || payment.subscriptionPlanName || 'Giao dịch thanh toán'}</h3>
          <p>{getPaymentItemLabel(payment)}</p>
        </div>
        <strong>{formatCurrencyVnd(payment.amountVnd)} {payment.currency}</strong>
      </div>

      <dl className="wallet-payment-grid">
        <div>
          <dt>Tạo lúc</dt>
          <dd>{formatDateTime(payment.createdAt)}</dd>
        </div>
        <div>
          <dt>Thanh toán lúc</dt>
          <dd>{formatDateTime(payment.paidAt)}</dd>
        </div>
      </dl>

      {payment.status === 'Pending' ? (
        <div className="wallet-payment-actions">
          <button
            className="button secondary"
            disabled={isRetrying}
            onClick={onRetry}
            type="button"
          >
            Thử lại thanh toán
          </button>
        </div>
      ) : null}
    </article>
  )
}

function ReturnResultCard({
  data,
  backHref,
  variant,
}: {
  data: VnPayReturnResultDto | SubscriptionPurchaseReturnResultDto
  backHref: string
  variant: ReturnVariant
}) {
  const isSuccess = data.status === 'Success'
  const name =
    variant === 'points'
      ? 'packageName' in data
        ? data.packageName || 'Gói point'
        : 'Gói point'
      : 'planName' in data
        ? data.planName || 'Gói subscription'
        : data.subscriptionPlanName || 'Gói subscription'

  const wrapperClassName = `wallet-return-card ${variant}-return${isSuccess ? ' success' : ' failed'}`

  return (
    <section className={wrapperClassName}>
      <div className="wallet-return-state">
        <div className={`wallet-return-icon-shell ${variant}`}>
          {isSuccess ? <CheckCircle2 size={28} /> : <XCircle size={28} />}
        </div>
        <div className="wallet-return-copy">
          <span className="wallet-return-kicker">
            {variant === 'points' ? 'Kết quả nạp ví' : 'Kết quả kích hoạt gói'}
          </span>
          <h2>{getReturnTitle(variant, isSuccess)}</h2>
          <p>{name}</p>
        </div>
      </div>

      {variant === 'points' ? (
        <div className="wallet-return-highlight points">
          <span>Point đã cộng</span>
          <strong>{formatPoints(data.creditedPoints)}</strong>
          <small>{isSuccess ? 'Số point đã được backend ghi nhận cho ví của bạn.' : 'Point sẽ chỉ được cộng khi backend xác minh giao dịch thành công.'}</small>
        </div>
      ) : (
        <div className="wallet-return-highlight subscription">
          <span>Subscription</span>
          <strong>{name}</strong>
          <small>
            {isSuccess
              ? 'Giao dịch đã được xác nhận. Trạng thái gói sẽ được đồng bộ từ backend.'
              : 'Giao dịch chưa hoàn tất. Bạn có thể quay lại tab subscription để thử lại.'}
          </small>
        </div>
      )}

      <dl className="wallet-return-grid">
        <div>
          <dt>Trạng thái</dt>
          <dd>{getPaymentStatusLabel(data.status as PaymentStatus)}</dd>
        </div>
        {variant === 'points' || data.creditedPoints > 0 ? (
          <div>
            <dt>{variant === 'points' ? 'Point đã cộng' : 'Point thưởng đã cộng'}</dt>
            <dd>{formatPoints(data.creditedPoints)}</dd>
          </div>
        ) : null}
      </dl>

      {data.alreadyProcessed ? (
        <p className="wallet-return-note">
          Giao dịch này đã được xử lý trước đó. Kết quả hiện tại vẫn là kết quả hợp lệ từ backend.
        </p>
      ) : null}

      <div className="wallet-return-actions">
        <Link className="button primary" to={backHref}>
          {variant === 'points' ? 'Về tab nạp point' : 'Về tab subscription'}
        </Link>
      </div>
    </section>
  )
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="wallet-summary-card">
      <span>{label}</span>
      <strong>{formatPoints(value)}</strong>
    </article>
  )
}

function PaginationControls({
  currentPage,
  onPageChange,
  totalPages,
}: {
  currentPage: number
  onPageChange: (page: number) => void
  totalPages: number
}) {
  return (
    <div className="session-pagination">
      <button
        className="button secondary"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
        type="button"
      >
        Trang trước
      </button>
      <span>
        Trang {currentPage} / {totalPages}
      </span>
      <button
        className="button secondary"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        type="button"
      >
        Trang sau
      </button>
    </div>
  )
}

function getReturnTitle(variant: ReturnVariant, isSuccess: boolean) {
  if (variant === 'points') {
    return isSuccess ? 'Nạp point thành công' : 'Nạp point chưa hoàn tất'
  }

  return isSuccess ? 'Kích hoạt subscription thành công' : 'Mua subscription chưa hoàn tất'
}

function normalizeComparableText(value: string | null | undefined) {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase()
}

function normalizeWalletTab(value: string | null): WalletTabId {
  if (value === 'subscriptions' || value === 'payments') {
    return value
  }

  return 'points'
}
