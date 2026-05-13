import type { ApiError } from '../../api/client'
import type { ProfileDto, ProfileField, ProfileFormValues, UpdateMyProfilePayload } from './types'

const DISPLAY_NAME_REGEX = /^[\p{L}\p{N} ]+$/u
const PHONE_REGEX = /^[\d+\-() ]{8,20}$/
const MAX_SKILLS_PER_LIST = 20
const MAX_SKILL_LENGTH = 50
const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024
const ALLOWED_AVATAR_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_CREDENTIAL_SIZE_BYTES = 10 * 1024 * 1024
const ALLOWED_CREDENTIAL_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])

export type ProfileFieldErrors = Partial<Record<ProfileField, string>>

export function toProfileFormValues(profile: ProfileDto): ProfileFormValues {
  return {
    displayName: profile.displayName ?? '',
    bio: profile.bio ?? '',
    dateOfBirth: profile.dateOfBirth ? profile.dateOfBirth.slice(0, 10) : '',
    phone: profile.phone ?? '',
    credentialUrls: profile.credentialUrls ?? [],
    skillsToTeach: profile.skillsToTeach ?? [],
    skillsToLearn: profile.skillsToLearn ?? [],
    isPublic: profile.isPublic,
    avatarUrl: profile.avatarUrl,
  }
}

/**
 * Partial update – chỉ gửi field có thay đổi so với initial.
 * BE dùng presence để quyết định update hay bỏ qua.
 */
export function buildProfileUpdatePayload(
  current: ProfileFormValues,
  initial: ProfileFormValues,
): UpdateMyProfilePayload {
  const payload: UpdateMyProfilePayload = {}

  const currentDisplayName = current.displayName.trim()
  const initialDisplayName = initial.displayName.trim()
  if (currentDisplayName !== initialDisplayName) {
    payload.displayName = currentDisplayName
  }

  const currentBio = current.bio.trim()
  const initialBio = initial.bio.trim()
  if (currentBio !== initialBio) {
    payload.bio = currentBio || null
  }

  if (current.dateOfBirth !== initial.dateOfBirth) {
    payload.dateOfBirth = current.dateOfBirth || null
  }

  const currentPhone = current.phone.trim()
  const initialPhone = initial.phone.trim()
  if (currentPhone !== initialPhone) {
    payload.phone = currentPhone || null
  }

  if (!areStringArraysEqual(current.credentialUrls, initial.credentialUrls)) {
    payload.credentialUrls = current.credentialUrls.length > 0 ? current.credentialUrls : null
  }

  const currentTeach = normalizeSkills(current.skillsToTeach)
  const initialTeach = normalizeSkills(initial.skillsToTeach)
  if (!areStringArraysEqual(currentTeach, initialTeach)) {
    payload.skillsToTeach = currentTeach
  }

  const currentLearn = normalizeSkills(current.skillsToLearn)
  const initialLearn = normalizeSkills(initial.skillsToLearn)
  if (!areStringArraysEqual(currentLearn, initialLearn)) {
    payload.skillsToLearn = currentLearn
  }

  if (current.isPublic !== initial.isPublic) {
    payload.isPublic = current.isPublic
  }

  if (current.avatarUrl !== initial.avatarUrl) {
    payload.avatarUrl = current.avatarUrl
  }

  return payload
}

export function validateProfileForm(values: ProfileFormValues): ProfileFieldErrors {
  const errors: ProfileFieldErrors = {}
  const displayName = values.displayName.trim()

  if (!displayName) {
    errors.displayName = 'Vui lòng nhập tên hiển thị.'
  } else if (displayName.length < 2 || displayName.length > 50) {
    errors.displayName = 'Tên hiển thị cần có từ 2 đến 50 ký tự.'
  } else if (!DISPLAY_NAME_REGEX.test(displayName)) {
    errors.displayName = 'Tên hiển thị chỉ được chứa chữ, số và dấu cách.'
  }

  if (values.bio.length > 500) {
    errors.bio = 'Tiểu sử tối đa 500 ký tự.'
  }

  if (values.dateOfBirth) {
    const date = new Date(values.dateOfBirth)
    if (Number.isNaN(date.getTime())) {
      errors.dateOfBirth = 'Ngày sinh không hợp lệ.'
    } else {
      const minDate = new Date('1900-01-01')
      const today = new Date()
      today.setHours(23, 59, 59, 999)
      if (date < minDate || date > today) {
        errors.dateOfBirth = 'Ngày sinh phải từ 01/01/1900 đến hôm nay.'
      }
    }
  }

  if (values.phone) {
    const phone = values.phone.trim()
    if (phone.length < 8 || phone.length > 20) {
      errors.phone = 'Số điện thoại phải có từ 8 đến 20 ký tự.'
    } else if (!PHONE_REGEX.test(phone)) {
      errors.phone = 'Số điện thoại chỉ được chứa chữ số, dấu +, -, () và dấu cách.'
    }
  }

  const teachError = validateSkills(values.skillsToTeach, 'dạy')
  if (teachError) {
    errors.skillsToTeach = teachError
  }

  const learnError = validateSkills(values.skillsToLearn, 'học')
  if (learnError) {
    errors.skillsToLearn = learnError
  }

  return errors
}

export function extractProfileFieldErrors(error: ApiError): ProfileFieldErrors {
  const errors: ProfileFieldErrors = {}

  for (const detail of error.details) {
    const field = mapApiPropertyToField(detail.property)
    if (!field || !detail.message) {
      continue
    }

    errors[field] = detail.message
  }

  return errors
}

export function validateAvatarFile(file: File) {
  if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
    return 'Avatar chỉ hỗ trợ định dạng JPG, PNG hoặc WEBP.'
  }

  if (file.size > MAX_AVATAR_SIZE_BYTES) {
    return 'Avatar phải nhỏ hơn hoặc bằng 5 MB.'
  }

  return ''
}

export function validateCredentialFile(file: File) {
  if (!ALLOWED_CREDENTIAL_TYPES.has(file.type)) {
    return 'Chứng chỉ chỉ hỗ trợ định dạng PDF, JPG, PNG hoặc WEBP.'
  }

  if (file.size > MAX_CREDENTIAL_SIZE_BYTES) {
    return 'Tệp chứng chỉ phải nhỏ hơn hoặc bằng 10 MB.'
  }

  return ''
}

/** @deprecated Dùng validateCredentialFile thay thế */
export const validateDegreeFile = validateCredentialFile

export function normalizeSkills(skills: string[]) {
  const uniqueSkills = new Set<string>()
  const normalizedSkills: string[] = []

  for (const skill of skills) {
    const normalized = skill.trim()
    if (!normalized) {
      continue
    }

    const key = normalized.toLowerCase()
    if (uniqueSkills.has(key)) {
      continue
    }

    uniqueSkills.add(key)
    normalizedSkills.push(normalized)
  }

  return normalizedSkills
}

export function getRoleBadgeLabel(role: string) {
  if (role === 'admin') {
    return 'Quản trị'
  }

  if (role === 'companion') {
    return 'Người dạy'
  }

  return 'Người học'
}

export function formatLastActive(value: string | null) {
  if (!value) {
    return 'Chưa có dữ liệu'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return 'Chưa có dữ liệu'
  }

  const diffMs = date.getTime() - Date.now()
  const diffMinutes = Math.round(diffMs / (1000 * 60))
  const rtf = new Intl.RelativeTimeFormat('vi', { numeric: 'auto' })

  if (Math.abs(diffMinutes) < 60) {
    return rtf.format(diffMinutes, 'minute')
  }

  const diffHours = Math.round(diffMinutes / 60)
  if (Math.abs(diffHours) < 24) {
    return rtf.format(diffHours, 'hour')
  }

  const diffDays = Math.round(diffHours / 24)
  if (Math.abs(diffDays) < 7) {
    return rtf.format(diffDays, 'day')
  }

  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function validateSkills(skills: string[], action: 'dạy' | 'học') {
  const normalized = normalizeSkills(skills)

  if (normalized.length > MAX_SKILLS_PER_LIST) {
    return `Tối đa ${MAX_SKILLS_PER_LIST} kỹ năng muốn ${action}.`
  }

  for (const skill of normalized) {
    if (!skill || skill.length > MAX_SKILL_LENGTH) {
      return `Danh sách kỹ năng muốn ${action} không hợp lệ.`
    }
  }

  return ''
}

function mapApiPropertyToField(property?: string): ProfileField | null {
  const mapping: Record<string, ProfileField> = {
    DisplayName: 'displayName',
    Bio: 'bio',
    DateOfBirth: 'dateOfBirth',
    Phone: 'phone',
    CredentialUrls: 'credentialUrls',
    SkillsToTeach: 'skillsToTeach',
    SkillsToLearn: 'skillsToLearn',
    AvatarUrl: 'avatarUrl',
    IsPublic: 'isPublic',
  }

  return property ? (mapping[property] ?? null) : null
}

function areStringArraysEqual(left: string[], right: string[]) {
  return JSON.stringify(left) === JSON.stringify(right)
}
