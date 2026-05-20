import { apiDelete, apiGet, apiPatch, apiPost } from '../../api/client'
import { cacheScope } from '../../api/cacheScope'
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
  searchRoot: () => cacheScope.public('skills', 'search'),
  search: (params: SearchSkillsParams) => cacheScope.public('skills', 'search', params),
  adminRoot: () => cacheScope.user(undefined, 'skills', 'admin'),
  adminList: (params: GetAdminSkillsParams) => cacheScope.user(undefined, 'skills', 'admin', params),
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
