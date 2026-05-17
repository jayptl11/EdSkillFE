import type {
  ActiveSubscriptionSummaryDto,
  PaymentStatus,
  PaymentTransactionDto,
  ResolvedSubscriptionEntitlementsDto,
  UserSubscriptionStatus,
} from './types'

export function formatPoints(value: number) {
  return new Intl.NumberFormat('vi-VN').format(value)
}

export function formatCurrencyVnd(value: number) {
  return new Intl.NumberFormat('vi-VN').format(value)
}

export function formatDateTime(value: string | null) {
  if (!value) {
    return 'Chưa có'
  }

  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function formatDate(value: string | null) {
  if (!value) {
    return 'Chưa có'
  }

  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
  }).format(new Date(value))
}

export function getPaymentStatusLabel(status: PaymentStatus) {
  return {
    Pending: 'Đang chờ thanh toán',
    Success: 'Thành công',
    Failed: 'Thất bại',
    Refunded: 'Đã hoàn tiền',
    Cancelled: 'Đã hủy',
  }[status]
}

export function getSubscriptionStatusLabel(status: UserSubscriptionStatus) {
  return {
    Active: 'Đang hoạt động',
    Cancelled: 'Đã hủy',
    Expired: 'Đã hết hạn',
  }[status]
}

export function getPaymentItemLabel(payment: PaymentTransactionDto) {
  if (payment.packageName) {
    return 'Nạp point'
  }

  if (payment.subscriptionPlanName) {
    return 'Mua gói'
  }

  return 'Thanh toán'
}

export function isSubscriptionActive(
  subscriptions: ActiveSubscriptionSummaryDto[],
  planId: string,
) {
  return subscriptions.some((subscription) => subscription.planId === planId && subscription.status === 'Active')
}

export function buildEntitlementList(
  entitlements: ResolvedSubscriptionEntitlementsDto | null | undefined,
) {
  if (!entitlements) {
    return []
  }

  const items: string[] = []

  if (entitlements.companionBadgeText) {
    items.push(`Huy hiệu ${entitlements.companionBadgeText}`)
  }

  if (entitlements.hasPriorityVisibility) {
    items.push('Ưu tiên hiển thị hồ sơ')
  }

  if (entitlements.companionDailySessionLimitOverride != null) {
    items.push(`Tối đa ${formatPoints(entitlements.companionDailySessionLimitOverride)} buổi dạy mỗi ngày`)
  }

  if (entitlements.weeklyLearnerSessionBonusPoints > 0) {
    items.push(`Thưởng ${formatPoints(entitlements.weeklyLearnerSessionBonusPoints)} point học mỗi tuần`)
  }

  if (entitlements.weeklyCompanionSessionBonusPoints > 0) {
    items.push(`Thưởng ${formatPoints(entitlements.weeklyCompanionSessionBonusPoints)} point dạy mỗi tuần`)
  }

  if (entitlements.learnerTokenRewardRatePercent != null) {
    items.push(`Tăng ${entitlements.learnerTokenRewardRatePercent}% token cho learner`)
  }

  if (entitlements.companionTokenRewardRatePercent != null) {
    items.push(`Tăng ${entitlements.companionTokenRewardRatePercent}% token cho companion`)
  }

  return items
}
