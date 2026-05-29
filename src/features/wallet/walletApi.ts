import { apiGet, apiPost } from '../../api/client'
import { cacheScope } from '../../api/cacheScope'
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
  all: () => cacheScope.user(undefined, 'wallet'),
  summary: () => cacheScope.user(undefined, 'wallet', 'points', 'summary'),
  transactionsRoot: () => cacheScope.user(undefined, 'wallet', 'points', 'transactions'),
  transactions: (params: WalletTransactionsParams) =>
    cacheScope.user(undefined, 'wallet', 'points', 'transactions', params),
  pointPackages: () => cacheScope.public('wallet', 'points', 'packages'),
  subscriptionPlans: () => cacheScope.public('wallet', 'subscriptions', 'plans'),
  mySubscriptions: () => cacheScope.user(undefined, 'wallet', 'subscriptions', 'me'),
  paymentsRoot: () => cacheScope.user(undefined, 'wallet', 'payments'),
  payments: (params: WalletPaymentsParams) => cacheScope.user(undefined, 'wallet', 'payments', params),
  return: (variant: 'points' | 'subscriptions', queryString: string) =>
    cacheScope.user(undefined, 'wallet', variant, 'return', queryString),
}

export const liveWalletSummaryQueryOptions = {
  gcTime: 0,
  refetchOnMount: 'always' as const,
  refetchOnReconnect: 'always' as const,
  refetchOnWindowFocus: 'always' as const,
  staleTime: 0,
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
