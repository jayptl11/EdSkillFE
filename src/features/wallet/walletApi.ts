import { apiGet, apiPost } from '../../api/client'
import { toQueryString } from '../../api/query'
import type { PaginatedResponse } from '../../api/types'
import type {
  CreatePointPurchaseRequest,
  CreatePointPurchaseResultDto,
  CreateSubscriptionPurchaseRequest,
  CreateSubscriptionPurchaseResultDto,
  MySubscriptionsDto,
  PaymentTransactionHistoryDto,
  PointPackageListDto,
  PointTransactionDto,
  RetryPaymentResultDto,
  SubscriptionPlanListDto,
  SubscriptionPurchaseReturnResultDto,
  VnPayReturnResultDto,
  WalletPaymentsParams,
  WalletSummaryDto,
  WalletTransactionsParams,
} from './types'

export const walletKeys = {
  all: () => ['wallet'] as const,
  summary: () => ['wallet', 'points', 'summary'] as const,
  transactionsRoot: () => ['wallet', 'points', 'transactions'] as const,
  transactions: (params: WalletTransactionsParams) =>
    ['wallet', 'points', 'transactions', params] as const,
  pointPackages: () => ['wallet', 'points', 'packages'] as const,
  subscriptionPlans: () => ['wallet', 'subscriptions', 'plans'] as const,
  mySubscriptions: () => ['wallet', 'subscriptions', 'me'] as const,
  paymentsRoot: () => ['wallet', 'payments'] as const,
  payments: (params: WalletPaymentsParams) => ['wallet', 'payments', params] as const,
}

export const walletApi = {
  getSummary: () => apiGet<WalletSummaryDto>('/api/wallet/points', { auth: true }),

  getTransactions: (params: WalletTransactionsParams) =>
    apiGet<PaginatedResponse<PointTransactionDto>>(
      `/api/wallet/points/transactions${toQueryString(params)}`,
      { auth: true },
    ),

  getPointPackages: () => apiGet<PointPackageListDto>('/api/wallet/points/packages'),

  createPointPurchase: (payload: CreatePointPurchaseRequest) =>
    apiPost<CreatePointPurchaseResultDto>('/api/wallet/points/purchase', payload, { auth: true }),

  verifyPointPurchaseReturn: (queryString: string) =>
    apiGet<VnPayReturnResultDto>(`/api/wallet/points/purchase/vnpay-return${queryString}`),

  getSubscriptionPlans: () => apiGet<SubscriptionPlanListDto>('/api/wallet/subscriptions/plans'),

  createSubscriptionPurchase: (payload: CreateSubscriptionPurchaseRequest) =>
    apiPost<CreateSubscriptionPurchaseResultDto>('/api/wallet/subscriptions/purchase', payload, { auth: true }),

  getMySubscriptions: () => apiGet<MySubscriptionsDto>('/api/wallet/subscriptions/me', { auth: true }),

  verifySubscriptionPurchaseReturn: (queryString: string) =>
    apiGet<SubscriptionPurchaseReturnResultDto>(`/api/wallet/subscriptions/purchase/vnpay-return${queryString}`),

  getPayments: (params: WalletPaymentsParams) =>
    apiGet<PaymentTransactionHistoryDto>(`/api/wallet/payments${toQueryString(params)}`, { auth: true }),

  retryPayment: (paymentTransactionId: string) =>
    apiPost<RetryPaymentResultDto>(`/api/wallet/payments/${paymentTransactionId}/retry`, undefined, { auth: true }),
}
