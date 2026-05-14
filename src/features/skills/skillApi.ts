import { apiDelete, apiGet, apiPatch, apiPost } from '../../api/client'
import { toQueryString } from '../../api/query'
import type {
  AdminSkill,
  CreateAdminSkillPayload,
  GetAdminSkillsParams,
  SearchSkillsParams,
  SkillOption,
  UpdateAdminSkillPayload,
} from './types'

export const skillKeys = {
  search: (params: SearchSkillsParams) => ['skills', 'search', params] as const,
  adminList: (params: GetAdminSkillsParams) => ['skills', 'admin', params] as const,
}

export const skillApi = {
  search: (params: SearchSkillsParams) =>
    apiGet<SkillOption[]>(`/api/skills${toQueryString(params)}`),

  getAdminSkills: (params: GetAdminSkillsParams) =>
    apiGet<AdminSkill[]>(`/api/admin/skills${toQueryString(params)}`, { auth: true }),

  createAdminSkill: (payload: CreateAdminSkillPayload) =>
    apiPost<AdminSkill>('/api/admin/skills', payload, { auth: true }),

  updateAdminSkill: (skillId: string, payload: UpdateAdminSkillPayload) =>
    apiPatch<AdminSkill>(`/api/admin/skills/${skillId}`, payload, { auth: true }),

  deleteAdminSkill: (skillId: string) =>
    apiDelete(`/api/admin/skills/${skillId}`, { auth: true }),
}
