import { apiGet } from '../../api/client'
import { toQueryString } from '../../api/query'
import type { PaginatedResponse } from '../../api/types'
import type { PointTransactionDto, WalletSummaryDto, WalletTransactionsParams } from './types'

export const walletKeys = {
  all: () => ['wallet'] as const,
  summary: () => ['wallet', 'points', 'summary'] as const,
  transactionsRoot: () => ['wallet', 'points', 'transactions'] as const,
  transactions: (params: WalletTransactionsParams) =>
    ['wallet', 'points', 'transactions', params] as const,
}

export const walletApi = {
  getSummary: () => apiGet<WalletSummaryDto>('/api/wallet/points', { auth: true }),

  getTransactions: (params: WalletTransactionsParams) =>
    apiGet<PaginatedResponse<PointTransactionDto>>(
      `/api/wallet/points/transactions${toQueryString(params)}`,
      { auth: true },
    ),
}
