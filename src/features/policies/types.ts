export type RequiredConsentPolicyType = 'terms' | 'privacy' | 'points_tokens'

export interface PolicySummary {
  slug: string
  category: string
  audience: string
  policyType: string | null
  version: string
  title: string
  summary: string
  requiresAcceptance: boolean
  effectiveAt: string
}

export interface PolicyDetail extends PolicySummary {
  contentMarkdown: string
}

export interface AcceptedPolicyInput {
  policyType: RequiredConsentPolicyType
  policyVersion: string
}

export interface ConsentRequirement {
  policyType: string
  slug: string
  title: string
  requiredVersion: string
  acceptedVersion: string | null
  acceptedAt: string | null
  isAcceptedLatest: boolean
}

export interface ConsentStatus {
  isUpToDate: boolean
  missingRequiredTypes: string[]
  requiredPolicies: ConsentRequirement[]
}
