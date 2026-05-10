export interface SkillOption {
  id: string
  name: string
  slug: string
  category: string | null
}

export interface SearchSkillsParams {
  q?: string
  category?: string
  limit?: number
}

export interface AdminSkill extends SkillOption {
  aliases: string[]
  isActive: boolean
}

export interface GetAdminSkillsParams {
  q?: string
  includeInactive?: boolean
}

export interface CreateAdminSkillPayload {
  name: string
  slug?: string
  category?: string
  aliases?: string[]
}

export interface UpdateAdminSkillPayload {
  name?: string
  slug?: string
  category?: string
  aliases?: string[]
  isActive?: boolean
}
