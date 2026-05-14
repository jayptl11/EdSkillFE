import {
  BookOpen,
  Calculator,
  Camera,
  Code,
  Languages,
  Music,
  Paintbrush,
  type LucideIcon,
} from 'lucide-react'
import type { SkillIconKey } from './types'

export const SKILL_ICON_KEY_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
export const FALLBACK_SKILL_ICON: LucideIcon = BookOpen

export const skillIconMap = {
  'book-open': BookOpen,
  calculator: Calculator,
  camera: Camera,
  code: Code,
  languages: Languages,
  music: Music,
  paintbrush: Paintbrush,
} as const satisfies Record<string, LucideIcon>

export function normalizeSkillIconKey(value: string | null | undefined): SkillIconKey {
  const normalizedValue = value?.trim() ?? ''
  return normalizedValue ? normalizedValue : null
}

export function isValidSkillIconKey(value: string): boolean {
  return value.length <= 50 && SKILL_ICON_KEY_PATTERN.test(value)
}

export function resolveSkillIcon(iconKey: SkillIconKey | undefined): LucideIcon | null {
  if (!iconKey) {
    return null
  }

  return skillIconMap[iconKey as keyof typeof skillIconMap] ?? null
}

export function getSkillIcon(iconKey: SkillIconKey | undefined): LucideIcon {
  return resolveSkillIcon(iconKey) ?? FALLBACK_SKILL_ICON
}
