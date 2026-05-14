export type SkillIconKey = string | null

export interface SkillOption {
  id: string
  name: string
  slug: string
  category: string | null
  iconKey: SkillIconKey
}

export interface SearchSkillsParams {
  q?: string
  category?: string
  limit?: number
}

export interface AdminSkill extends SkillOption {
  basePointCost: number
  aliases: string[]
  isActive: boolean
}

export interface GetAdminSkillsParams {
  q?: string
  includeInactive?: boolean
}

export interface CreateAdminSkillPayload {
  name: string
  slug?: string | null
  category?: string | null
  iconKey?: string | null
  basePointCost: number
  aliases?: string[] | null
}

export interface UpdateAdminSkillPayload {
  name?: string
  slug?: string | null
  category?: string | null
  iconKey?: string | null
  basePointCost?: number
  aliases?: string[] | null
  isActive?: boolean
}
