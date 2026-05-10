import { apiGet, apiPost } from '../../api/client'
import type { AcceptedPolicyInput, ConsentStatus, PolicyDetail, PolicySummary } from './types'

export const policyKeys = {
  catalog: () => ['policies', 'catalog'] as const,
  detail: (slug: string) => ['policies', 'detail', slug] as const,
  consentStatus: () => ['policies', 'consents', 'me'] as const,
}

export const policyApi = {
  getPolicies: () => apiGet<PolicySummary[]>('/api/policies'),

  getPolicyBySlug: (slug: string) => apiGet<PolicyDetail>(`/api/policies/${slug}`),

  getMyPolicyConsents: () => apiGet<ConsentStatus>('/api/policies/consents/me', { auth: true }),

  acceptMyPolicies: (acceptedPolicies: AcceptedPolicyInput[]) =>
    apiPost<void>('/api/policies/consents/me', { acceptedPolicies }, { auth: true }),
}
