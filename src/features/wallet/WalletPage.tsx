import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  CheckCircle2,
  Coins,
  Crown,
  LoaderCircle,
  RefreshCcw,
  Wallet,
  XCircle,
} from 'lucide-react'
import { Link, Navigate, useLocation, useSearchParams } from 'react-router-dom'
import { getErrorMessage } from '../../api/client'
import { SiteHeader } from '../../components/Brand'
import { MotionPage } from '../../components/MotionPage'
import { showToast } from '../../components/toastEvents'
import { useAppStore } from '../../store/useAppStore'
import { profileKeys } from '../profile/profileApi'
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
  isSubscriptionActive,
} from './walletUtils'

const SUMMARY_REFRESH_MS = 30_000
const PAYMENT_LIMIT = 20
const walletTabs = [
  { id: 'points', label: 'Nạp point' },
  { id: 'subscriptions', label: 'Subscription' },
  { id: 'payments', label: 'Lịch sử thanh toán' },
] as const

type WalletTabId = (typeof walletTabs)[number]['id']

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
          <h1>Quản lý nạp point, gói subscription và lịch sử thanh toán của bạn.</h1>
          <p>Chỉ hiển thị đúng dữ liệu cần thiết cho người dùng cuối theo contract backend hiện tại.</p>
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
          <p>Đang tải ví điểm...</p>
        </section>
      ) : null}

      {summaryQuery.isError ? (
        <section className="profile-state-card error">
          <AlertCircle size={22} />
          <div>
            <h2>Không thể tải ví điểm</h2>
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
          <p>Thanh toán với VNPay để nạp point vào ví. FE không tự cộng point trước khi backend xác nhận callback.</p>
        </div>
      </div>

      {pointPackagesQuery.isLoading ? (
        <section className="profile-state-card">
          <LoaderCircle className="spin" size={20} />
          <p>Đang tải gói point...</p>
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
          <p>Hiển thị gói cố định 30 ngày, quyền lợi đang áp dụng và điều hướng mua gói qua VNPay.</p>
        </div>
      </div>

      {mySubscriptionsQuery.isLoading ? (
        <section className="profile-state-card">
          <LoaderCircle className="spin" size={20} />
          <p>Đang tải subscription hiện tại...</p>
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

  const payments = paymentsQuery.data?.data ?? []
  const totalPages = Math.max(1, Math.ceil((paymentsQuery.data?.total ?? 0) / PAYMENT_LIMIT))

  return (
    <section className="wallet-tab-panel" role="tabpanel">
      <div className="wallet-section-head">
        <div>
          <h2>Lịch sử thanh toán</h2>
          <p>Render gọn lịch sử nạp point và mua gói. Nếu giao dịch còn pending, người dùng có thể thử lại thanh toán.</p>
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
              <PaymentHistoryCard key={payment.paymentTransactionId} payment={payment} />
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
      backLabel="Về nạp point"
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
      backLabel="Về subscription"
      title="Kết quả mua gói"
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
  variant: 'points' | 'subscriptions'
}) {
  const queryClient = useQueryClient()

  const returnQuery = useQuery({
    queryKey: ['wallet', variant, 'return', queryString],
    queryFn: () => queryFn(queryString),
    enabled: Boolean(queryString),
    retry: false,
  })

  useEffect(() => {
    if (!returnQuery.data) {
      return
    }

    void Promise.all([
      queryClient.invalidateQueries({ queryKey: walletKeys.all() }),
      queryClient.invalidateQueries({ queryKey: profileKeys.me() }),
    ])
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
          <p>Trang này chỉ dùng callback query từ VNPay để gọi lại backend và hiển thị kết quả cuối cùng.</p>
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

      {returnQuery.data ? <ReturnResultCard backHref={backHref} data={returnQuery.data} /> : null}
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
    <article className={`wallet-offer-card${packageItem.isHighlighted ? ' featured' : ''}`}>
      <div className="wallet-offer-head">
        <div>
          <h3>{packageItem.name}</h3>
          {packageItem.badgeText ? <span className="wallet-premium-badge">{packageItem.badgeText}</span> : null}
        </div>
        <strong>{formatCurrencyVnd(packageItem.priceVnd)} {packageItem.currency}</strong>
      </div>

      <p>{packageItem.description || 'Gói point phù hợp để tiếp tục học và đặt buổi học.'}</p>

      <dl className="wallet-offer-grid">
        <div>
          <dt>Nhận được</dt>
          <dd>{formatPoints(packageItem.totalPoints)} point</dd>
        </div>
      </dl>

      <button className="button primary" disabled={isPending} onClick={onPurchase} type="button">
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
  const isActive = isSubscriptionActive(activeSubscriptions, plan.planId)

  return (
    <article className="wallet-offer-card premium">
      <div className="wallet-offer-head">
        <div>
          <h3>{plan.name}</h3>
          {isActive ? (
            <span className="wallet-premium-badge subtle">
              <CheckCircle2 size={14} />
              Gói đang hoạt động
            </span>
          ) : null}
        </div>
        <strong>{formatCurrencyVnd(plan.priceVnd)} {plan.currency} / tháng</strong>
      </div>

      <div className="wallet-benefit-list">
        {plan.displayBenefits.map((benefit) => (
          <span className="wallet-benefit-chip" key={benefit}>
            {benefit}
          </span>
        ))}
      </div>

      <button className="button primary" disabled={isPending} onClick={onPurchase} type="button">
        {isPending ? <LoaderCircle className="spin" size={18} /> : null}
        Mua gói
      </button>
    </article>
  )
}

function PaymentHistoryCard({ payment }: { payment: PaymentTransactionDto }) {
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

      {payment.status === 'Pending' && payment.paymentUrl ? (
        <div className="wallet-payment-actions">
          <button
            className="button secondary"
            onClick={() => window.location.assign(payment.paymentUrl!)}
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
}: {
  data: VnPayReturnResultDto | SubscriptionPurchaseReturnResultDto
  backHref: string
}) {
  const isSuccess = data.status === 'Success'
  const title = isSuccess ? 'Thanh toán thành công' : 'Thanh toán chưa hoàn tất'
  const name =
    'packageName' in data
      ? data.packageName || 'Gói point'
      : data.planName || 'Gói subscription'

  return (
    <section className={`wallet-return-card${isSuccess ? ' success' : ' failed'}`}>
      <div className="wallet-return-state">
        {isSuccess ? <CheckCircle2 size={26} /> : <XCircle size={26} />}
        <div>
          <h2>{title}</h2>
          <p>{name}</p>
        </div>
      </div>

      <dl className="wallet-return-grid">
        <div>
          <dt>Trạng thái</dt>
          <dd>{getPaymentStatusLabel(data.status as PaymentStatus)}</dd>
        </div>
        <div>
          <dt>Point đã cộng</dt>
          <dd>{formatPoints(data.creditedPoints)}</dd>
        </div>
      </dl>

      {data.alreadyProcessed ? (
        <p className="wallet-return-note">Giao dịch này đã được xử lý trước đó. Kết quả hiện tại vẫn là hợp lệ.</p>
      ) : null}

      <div className="wallet-return-actions">
        <Link className="button primary" to={backHref}>
          Về wallet
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

function normalizeWalletTab(value: string | null): WalletTabId {
  if (value === 'subscriptions' || value === 'payments') {
    return value
  }

  return 'points'
}
