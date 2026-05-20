import { apiGet, apiPost } from '../../api/client'
import { cacheScope } from '../../api/cacheScope'
import type { AcceptedPolicyInput, ConsentStatus, PolicyDetail, PolicySummary } from './types'

export const policyKeys = {
  catalog: () => cacheScope.public('policies', 'catalog'),
  details: () => cacheScope.public('policies', 'detail'),
  detail: (slug: string) => cacheScope.public('policies', 'detail', slug),
  consentStatus: () => cacheScope.user(undefined, 'policies', 'consents', 'me'),
}

export const policyApi = {
  getPolicies: () => apiGet<PolicySummary[]>('/api/policies'),

  getPolicyBySlug: (slug: string) => apiGet<PolicyDetail>(`/api/policies/${slug}`),

  getMyPolicyConsents: () => apiGet<ConsentStatus>('/api/policies/consents/me', { auth: true }),

  acceptMyPolicies: (acceptedPolicies: AcceptedPolicyInput[]) =>
    apiPost<void>('/api/policies/consents/me', { acceptedPolicies }, { auth: true }),
}
