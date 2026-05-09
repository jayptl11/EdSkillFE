import {
  BookOpen,
  Brain,
  ChartNoAxesCombined,
  Code2,
  GraduationCap,
  Languages,
  Lightbulb,
  Mic2,
  Network,
  Palette,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'

export interface LearningTrack {
  label: string
  Icon: LucideIcon
  tone: 'blue' | 'gold' | 'ivory'
}

export const learningTracks: LearningTrack[] = [
  { label: 'Ngôn ngữ', Icon: Languages, tone: 'ivory' },
  { label: 'Lập trình', Icon: Code2, tone: 'blue' },
  { label: 'Thiết kế', Icon: Palette, tone: 'gold' },
  { label: 'Kinh doanh', Icon: ChartNoAxesCombined, tone: 'blue' },
  { label: 'Giao tiếp', Icon: Mic2, tone: 'ivory' },
  { label: 'Tư duy phản biện', Icon: Brain, tone: 'gold' },
  { label: 'Sáng tạo', Icon: Sparkles, tone: 'gold' },
  { label: 'Kết nối', Icon: Network, tone: 'blue' },
]

export const dashboardCards = [
  { title: 'Mục tiêu kỹ năng', Icon: GraduationCap },
  { title: 'Lộ trình học', Icon: BookOpen },
  { title: 'Phiên đồng hành', Icon: Network },
  { title: 'Nhắc học hằng ngày', Icon: Lightbulb },
]
