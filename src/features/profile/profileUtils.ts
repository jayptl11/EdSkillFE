import type { ApiError } from '../../api/client'
import type { ProfileDto, ProfileField, ProfileFormValues, UpdateMyProfilePayload } from './types'

const DISPLAY_NAME_REGEX = /^[\p{L}\p{N} ]+$/u
const MAX_SKILLS_PER_LIST = 20
const MAX_SKILL_LENGTH = 50
const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024
const ALLOWED_AVATAR_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

export type ProfileFieldErrors = Partial<Record<ProfileField, string>>

export function toProfileFormValues(profile: ProfileDto): ProfileFormValues {
  return {
    displayName: profile.displayName ?? '',
    bio: profile.bio ?? '',
    university: profile.university ?? '',
    faculty: profile.faculty ?? '',
    yearOfStudy: profile.yearOfStudy,
    skillsToTeach: profile.skillsToTeach ?? [],
    skillsToLearn: profile.skillsToLearn ?? [],
    isPublic: profile.isPublic,
    avatarUrl: profile.avatarUrl,
  }
}

export function buildProfilePatch(
  current: ProfileFormValues,
  initial: ProfileFormValues,
): UpdateMyProfilePayload {
  const payload: UpdateMyProfilePayload = {}
  const currentDisplayName = current.displayName.trim()
  const initialDisplayName = initial.displayName.trim()
  const currentBio = current.bio.trim()
  const initialBio = initial.bio.trim()
  const currentUniversity = current.university.trim()
  const initialUniversity = initial.university.trim()
  const currentFaculty = current.faculty.trim()
  const initialFaculty = initial.faculty.trim()
  const currentTeach = normalizeSkills(current.skillsToTeach)
  const initialTeach = normalizeSkills(initial.skillsToTeach)
  const currentLearn = normalizeSkills(current.skillsToLearn)
  const initialLearn = normalizeSkills(initial.skillsToLearn)

  if (currentDisplayName !== initialDisplayName) {
    payload.displayName = currentDisplayName
  }

  if (currentBio !== initialBio) {
    payload.bio = currentBio || null
  }

  if (currentUniversity !== initialUniversity) {
    payload.university = currentUniversity || null
  }

  if (currentFaculty !== initialFaculty) {
    payload.faculty = currentFaculty || null
  }

  if (current.yearOfStudy !== initial.yearOfStudy) {
    payload.yearOfStudy = current.yearOfStudy
  }

  if (!areStringArraysEqual(currentTeach, initialTeach)) {
    payload.skillsToTeach = currentTeach
  }

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

  if (values.university.length > 200) {
    errors.university = 'Tên trường tối đa 200 ký tự.'
  }

  if (values.faculty.length > 200) {
    errors.faculty = 'Tên khoa/ngành tối đa 200 ký tự.'
  }

  if (values.yearOfStudy !== null && (values.yearOfStudy < 1 || values.yearOfStudy > 6)) {
    errors.yearOfStudy = 'Năm học phải nằm trong khoảng 1 đến 6.'
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
    return 'Admin'
  }

  if (role === 'companion') {
    return 'Companion'
  }

  return 'Learner'
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
    University: 'university',
    Faculty: 'faculty',
    YearOfStudy: 'yearOfStudy',
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
