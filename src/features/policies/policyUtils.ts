import type {
  AcceptedPolicyInput,
  ConsentRequirement,
  PolicySummary,
  RequiredConsentPolicyType,
} from './types'

export const requiredSignupPolicyTypes = ['terms', 'privacy', 'points_tokens'] as const

export const policyCategoryOrder = ['legal', 'privacy', 'wallet', 'sessions', 'community'] as const

const policyCategoryLabels: Record<string, string> = {
  legal: 'Legal',
  privacy: 'Privacy',
  wallet: 'Wallet',
  sessions: 'Sessions',
  community: 'Community',
}

const policySlugLabels: Record<string, string> = {
  terms: 'Điều khoản sử dụng',
  privacy: 'Chính sách riêng tư',
  'points-tokens': 'Chính sách Points/Tokens',
  'cancellation-refund': 'Chính sách hủy phiên / hoàn điểm / no-show',
  'community-guidelines-learner': 'Guidelines cho Learner',
  'community-guidelines-companion': 'Guidelines cho Companion',
}

const audienceLabels: Record<string, string> = {
  all: 'Tất cả người dùng',
  learner: 'Learner',
  companion: 'Companion',
}

export function isRequiredConsentPolicyType(value: string | null | undefined): value is RequiredConsentPolicyType {
  return Boolean(value && requiredSignupPolicyTypes.includes(value as RequiredConsentPolicyType))
}

export function getRequiredSignupPolicies(policies: PolicySummary[]): PolicySummary[] {
  return requiredSignupPolicyTypes
    .map((policyType) =>
      policies.find(
        (policy) => policy.requiresAcceptance && policy.policyType === policyType,
      ),
    )
    .filter((policy): policy is PolicySummary => Boolean(policy))
}

export function buildAcceptedPolicies(
  policies: Array<{ policyType: string | null; version: string }>,
): AcceptedPolicyInput[] {
  return policies
    .filter((policy): policy is { policyType: RequiredConsentPolicyType; version: string } =>
      isRequiredConsentPolicyType(policy.policyType),
    )
    .map((policy) => ({
      policyType: policy.policyType,
      policyVersion: policy.version,
    }))
}

export function buildAcceptedPoliciesFromRequirements(
  policies: ConsentRequirement[],
): AcceptedPolicyInput[] {
  return policies
    .filter((policy): policy is ConsentRequirement & { policyType: RequiredConsentPolicyType } =>
      isRequiredConsentPolicyType(policy.policyType),
    )
    .map((policy) => ({
      policyType: policy.policyType,
      policyVersion: policy.requiredVersion,
    }))
}

export function getPolicyCategoryLabel(category: string): string {
  return policyCategoryLabels[category] ?? category
}

export function getPolicyLabel(slug: string, fallback: string): string {
  return policySlugLabels[slug] ?? fallback
}

export function getAudienceLabel(audience: string): string {
  return audienceLabels[audience] ?? audience
}

export function formatPolicyDate(value: string): string {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}
