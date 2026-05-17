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

export type PaymentStatus =
  | 'Pending'
  | 'Success'
  | 'Failed'
  | 'Refunded'
  | 'Cancelled'

export type PaymentProvider = 'VnPay'
export type SubscriptionTargetRole = 'Learner' | 'Companion' | 'MultiRole'
export type SubscriptionBillingCycle = 'Monthly'
export type UserSubscriptionStatus = 'Active' | 'Cancelled' | 'Expired'

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

export interface PointPackageDto {
  packageId: string
  code: string
  name: string
  description: string | null
  points: number
  bonusPoints: number
  totalPoints: number
  priceVnd: number
  currency: string
  badgeText: string | null
  isHighlighted: boolean
}

export interface PointPackageListDto {
  data: PointPackageDto[]
}

export interface CreatePointPurchaseRequest {
  packageId: string
}

export interface CreatePointPurchaseResultDto {
  paymentTransactionId: string
  paymentUrl: string
  expiresAt: string
}

export interface SubscriptionPlanEntitlementsDto {
  immediateBonusPoints: number
  weeklyLearnerSessionBonusPoints: number
  weeklyCompanionSessionBonusPoints: number
  learnerTokenRewardRatePercent: number | null
  companionTokenRewardRatePercent: number | null
  companionDailySessionLimitOverride: number | null
  companionBadgeText: string | null
  hasPriorityVisibility: boolean
}

export interface SubscriptionPlanDto {
  planId: string
  code: string
  name: string
  targetRole: SubscriptionTargetRole
  priceVnd: number
  currency: string
  billingCycle: SubscriptionBillingCycle
  displayBenefits: string[]
  entitlements: SubscriptionPlanEntitlementsDto
}

export interface SubscriptionPlanListDto {
  data: SubscriptionPlanDto[]
}

export interface CreateSubscriptionPurchaseRequest {
  planId: string
}

export interface CreateSubscriptionPurchaseResultDto {
  paymentTransactionId: string
  paymentUrl: string
  expiresAt: string
}

export interface ActiveSubscriptionSummaryDto {
  userSubscriptionId: string
  planId: string
  code: string
  name: string
  targetRole: SubscriptionTargetRole
  status: UserSubscriptionStatus
  startedAt: string
  expiresAt: string
}

export interface ResolvedSubscriptionEntitlementsDto {
  hasLearnerCoverage: boolean
  hasCompanionCoverage: boolean
  companionBadgeText: string | null
  hasPriorityVisibility: boolean
  companionDailySessionLimitOverride: number | null
  learnerTokenRewardRatePercent: number | null
  companionTokenRewardRatePercent: number | null
  weeklyLearnerSessionBonusPoints: number
  weeklyCompanionSessionBonusPoints: number
}

export interface MySubscriptionsDto {
  activeSubscriptions: ActiveSubscriptionSummaryDto[]
  entitlements: ResolvedSubscriptionEntitlementsDto
}

export interface PaymentTransactionDto {
  paymentTransactionId: string
  packageId: string | null
  packageName: string | null
  subscriptionPlanId: string | null
  subscriptionPlanName: string | null
  provider: PaymentProvider
  amountVnd: number
  currency: string
  status: PaymentStatus
  paymentUrl: string | null
  paidAt: string | null
  createdAt: string
}

export interface PaymentTransactionHistoryDto {
  data: PaymentTransactionDto[]
  total: number
  page: number
  limit: number
}

export interface WalletPaymentsParams {
  status?: Lowercase<PaymentStatus> | ''
  page?: number
  limit?: number
}

export interface VnPayReturnResultDto {
  paymentTransactionId: string
  packageId: string | null
  packageName: string | null
  subscriptionPlanId: string | null
  subscriptionPlanName: string | null
  status: PaymentStatus
  creditedPoints: number
  alreadyProcessed: boolean
}

export interface SubscriptionPurchaseReturnResultDto {
  paymentTransactionId: string
  planId: string | null
  planName: string | null
  status: PaymentStatus
  creditedPoints: number
  alreadyProcessed: boolean
}
