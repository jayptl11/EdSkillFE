import type { AdminConfigItemDto, AdminConfigKey } from './types'

export const sessionWalletConfigKeys: AdminConfigKey[] = [
  'point.signup_bonus',
  'point.platform_fee_pct',
  'session.min_duration_minutes',
  'session.cancel_deadline_hours',
  'session.late_cancel_companion_pct',
  'session.late_cancel_platform_pct',
  'session.max_per_day_per_companion',
  'session.buffer_minutes',
]

export function getRelevantAdminConfigs(items: AdminConfigItemDto[]) {
  return items.filter((item) => sessionWalletConfigKeys.includes(item.key as AdminConfigKey))
}

export function getConfigLabel(key: string) {
  return {
    'point.signup_bonus': 'Signup bonus points',
    'point.platform_fee_pct': 'Platform fee %',
    'session.min_duration_minutes': 'Minimum duration minutes',
    'session.cancel_deadline_hours': 'Cancel deadline hours',
    'session.late_cancel_companion_pct': 'Late cancel companion %',
    'session.late_cancel_platform_pct': 'Late cancel platform %',
    'session.max_per_day_per_companion': 'Max sessions per day / companion',
    'session.buffer_minutes': 'Buffer minutes',
  }[key] ?? key
}

export function validateConfigDraft(key: string, value: string, allDrafts: Record<string, string>) {
  if (!value.trim()) {
    return 'Giá trị không được để trống.'
  }

  const numericValue = Number(value)
  if (Number.isNaN(numericValue)) {
    return 'Giá trị phải là số hợp lệ.'
  }

  if (
    key === 'session.late_cancel_companion_pct' ||
    key === 'session.late_cancel_platform_pct'
  ) {
    const companionValue = Number(allDrafts['session.late_cancel_companion_pct'] ?? '0')
    const platformValue = Number(allDrafts['session.late_cancel_platform_pct'] ?? '0')

    if (!Number.isNaN(companionValue) && !Number.isNaN(platformValue) && companionValue + platformValue !== 100) {
      return 'Tổng late cancel companion % và platform % phải bằng 100.'
    }
  }

  return ''
}

export function groupConfigs(items: AdminConfigItemDto[]) {
  return {
    point: items.filter((item) => item.key.startsWith('point.')),
    session: items.filter((item) => item.key.startsWith('session.')),
  }
}
