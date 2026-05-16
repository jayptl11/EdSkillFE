import {
  Activity,
  Award,
  Atom,
  Bike,
  BookOpen,
  BookMarked,
  Briefcase,
  Brush,
  Calculator,
  Camera,
  ChefHat,
  Code,
  Compass,
  Database,
  Dumbbell,
  Film,
  FlaskConical,
  Flower2,
  Gamepad2,
  Globe,
  GraduationCap,
  Guitar,
  Hammer,
  Headphones,
  Heart,
  Image,
  Languages,
  Laptop,
  Leaf,
  Lightbulb,
  Mic,
  Monitor,
  Mountain,
  Music,
  Palette,
  Pen,
  PenTool,
  Pi,
  Pill,
  Ruler,
  Scissors,
  Smartphone,
  Stethoscope,
  Sun,
  Terminal,
  TestTube,
  Trophy,
  Users,
  Volleyball,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import type { SkillIconKey } from './types'

export const SKILL_ICON_KEY_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
export const FALLBACK_SKILL_ICON: LucideIcon = BookOpen

export const skillIconMap = {
  // Giáo dục
  'book-open': BookOpen,
  'book-marked': BookMarked,
  'graduation-cap': GraduationCap,
  lightbulb: Lightbulb,
  compass: Compass,
  // Khoa học
  atom: Atom,
  flask: FlaskConical,
  'test-tube': TestTube,
  // Toán học
  calculator: Calculator,
  pi: Pi,
  // Nghệ thuật
  paintbrush: Brush,
  palette: Palette,
  pen: Pen,
  'pen-tool': PenTool,
  ruler: Ruler,
  scissors: Scissors,
  // Âm nhạc
  music: Music,
  guitar: Guitar,
  headphones: Headphones,
  mic: Mic,
  // Công nghệ
  code: Code,
  monitor: Monitor,
  laptop: Laptop,
  smartphone: Smartphone,
  terminal: Terminal,
  database: Database,
  // Ngôn ngữ
  languages: Languages,
  globe: Globe,
  // Nhiếp ảnh & Video
  camera: Camera,
  image: Image,
  film: Film,
  // Thể thao
  dumbbell: Dumbbell,
  bike: Bike,
  trophy: Trophy,
  volleyball: Volleyball,
  // Nấu ăn
  chef: ChefHat,
  // Thiên nhiên
  leaf: Leaf,
  flower: Flower2,
  sun: Sun,
  mountain: Mountain,
  // Kinh doanh
  briefcase: Briefcase,
  // Sức khỏe
  heart: Heart,
  stethoscope: Stethoscope,
  pill: Pill,
  activity: Activity,
  // Gaming
  gamepad: Gamepad2,
  // Xã hội
  users: Users,
  award: Award,
  // Thủ công
  hammer: Hammer,
  wrench: Wrench,
  // Năng lượng
  zap: Zap,
} as const satisfies Record<string, LucideIcon>

export const availableSkillIconKeys = Object.keys(skillIconMap) as Array<keyof typeof skillIconMap>

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
