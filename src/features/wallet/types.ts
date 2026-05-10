export type PointTransactionType =
  | 'SignupBonus'
  | 'Purchase'
  | 'SessionPayment'
  | 'SessionEarning'
  | 'PlatformFee'
  | 'Refund'
  | 'AdminGrant'
  | 'Held'
  | 'HoldRelease'

export interface WalletSummaryDto {
  balance: number
  heldBalance: number
  totalEarned: number
  totalSpent: number
}

export interface PointTransactionDto {
  pointTransactionId: string
  type: PointTransactionType
  amount: number
  balanceBefore: number
  balanceAfter: number
  heldBalanceBefore: number
  heldBalanceAfter: number
  sessionId: string | null
  note: string | null
  createdAt: string
}

export interface WalletTransactionsParams {
  type?: PointTransactionType | ''
  page?: number
  limit?: number
}
