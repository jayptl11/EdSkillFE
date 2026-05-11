import { useEffect, useId, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, LoaderCircle, Search, X } from 'lucide-react'
import { skillApi, skillKeys } from './skillApi'
import type { SkillOption } from './types'

const SEARCH_LIMIT = 20
const SEARCH_DEBOUNCE_MS = 300

export function SkillAutocomplete({
  error,
  helperText = 'Chọn kỹ năng từ danh sách gợi ý để tránh trùng hoặc sai taxonomy.',
  label,
  mode = 'multiple',
  onRemove,
  onSelect,
  onSelectWithId,
  placeholder,
  selectedSkills,
}: {
  error?: string
  helperText?: string
  label?: string
  mode?: 'single' | 'multiple'
  onRemove: (skill: string) => void
  onSelect: (skill: string) => void
  onSelectWithId?: (id: string, name: string) => void
  placeholder: string
  selectedSkills: string[]
}) {
  const listboxId = useId()
  const blurTimeoutRef = useRef<number | null>(null)
  const [draft, setDraft] = useState('')
  const [debouncedDraft, setDebouncedDraft] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedDraft(draft.trim())
    }, SEARCH_DEBOUNCE_MS)

    return () => window.clearTimeout(timeoutId)
  }, [draft])

  useEffect(() => {
    if (mode === 'single' && !isOpen && selectedSkills[0] && draft !== selectedSkills[0]) {
      setDraft(selectedSkills[0])
    }
    if (mode === 'single' && !isOpen && !selectedSkills[0] && draft) {
      setDraft('')
    }
  }, [mode, isOpen, selectedSkills, draft])

  const searchQuery = useQuery({
    queryKey: skillKeys.search({ q: debouncedDraft, limit: SEARCH_LIMIT }),
    queryFn: () => skillApi.search({ q: debouncedDraft, limit: SEARCH_LIMIT }),
    staleTime: 5 * 60 * 1000,
  })

  const selectedSet = new Set(selectedSkills.map((skill) => skill.trim().toLowerCase()))
  const options = (searchQuery.data ?? []).filter((option) => !selectedSet.has(option.name.toLowerCase()))
  const hasInteractiveOptions = options.length > 0
  const currentActiveIndex = activeIndex < options.length ? activeIndex : 0

  const addOption = (option: SkillOption) => {
    onSelect(option.name)
    onSelectWithId?.(option.id, option.name)
    if (mode === 'single') {
      setDraft(option.name)
    } else {
      setDraft('')
    }
    setDebouncedDraft('')
    setIsOpen(false)
    setActiveIndex(0)
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && (event.key === 'ArrowDown' || event.key === 'Enter')) {
      setIsOpen(true)
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (!hasInteractiveOptions) {
        return
      }

      setActiveIndex((current) => (current + 1) % options.length)
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      if (!hasInteractiveOptions) {
        return
      }

      setActiveIndex((current) => (current - 1 + options.length) % options.length)
      return
    }

    if (event.key === 'Escape') {
      setIsOpen(false)
      return
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      const option = options[currentActiveIndex] ?? options[0]
      if (option) {
        addOption(option)
      }
    }
  }

  const handleBlur = () => {
    blurTimeoutRef.current = window.setTimeout(() => {
      setIsOpen(false)
    }, 120)
  }

  const handleFocus = () => {
    if (blurTimeoutRef.current !== null) {
      window.clearTimeout(blurTimeoutRef.current)
      blurTimeoutRef.current = null
    }

    setIsOpen(true)
  }

  const showEmptyState = !searchQuery.isLoading && options.length === 0

  return (
    <div className={`profile-skills-card ${mode === 'single' ? 'mode-single' : ''}`}>
      {label || helperText ? (
        <div className="profile-skills-head">
          <div>
            {label ? <h3>{label}</h3> : null}
            {helperText ? <p>{helperText}</p> : null}
          </div>
        </div>
      ) : null}

      <div className="skill-autocomplete">
        <div className="skill-autocomplete-input-shell">
          <Search size={17} />
          <input
            aria-autocomplete="list"
            aria-controls={listboxId}
            aria-expanded={isOpen}
            onBlur={handleBlur}
            onChange={(event) => {
              const val = event.target.value
              setDraft(val)
              setIsOpen(true)
              setActiveIndex(0)
              if (mode === 'single' && val === '' && selectedSkills.length > 0) {
                onRemove(selectedSkills[0])
              }
            }}
            onFocus={handleFocus}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            role="combobox"
            value={draft}
          />
          <button
            aria-label="Hiển thị gợi ý kỹ năng"
            className="skill-autocomplete-toggle"
            onMouseDown={(event) => {
              event.preventDefault()
              setIsOpen((current) => !current)
            }}
            type="button"
          >
            <ChevronDown size={18} />
          </button>
        </div>

        {isOpen ? (
          <div className="skill-autocomplete-popover" role="presentation">
            {searchQuery.isLoading ? (
              <div className="skill-autocomplete-state">
                <LoaderCircle className="spin" size={16} />
                <span>Đang tải kỹ năng...</span>
              </div>
            ) : null}

            {!searchQuery.isLoading ? (
              <div className="skill-autocomplete-list" id={listboxId} role="listbox">
                {options.map((option, index) => (
                  <button
                    aria-selected={index === currentActiveIndex}
                    className={`skill-autocomplete-option ${index === currentActiveIndex ? 'active' : ''}`}
                    key={option.id}
                    onMouseDown={(event) => {
                      event.preventDefault()
                      addOption(option)
                    }}
                    role="option"
                    type="button"
                  >
                    <span>{option.name}</span>
                    <small>{option.category || 'Uncategorized'}</small>
                  </button>
                ))}

                {showEmptyState ? (
                  <div className="skill-autocomplete-state empty">
                    <span>
                      {selectedSkills.length > 0 && draft.trim().length === 0
                        ? 'Tất cả kỹ năng gợi ý đã được chọn.'
                        : 'Không tìm thấy kỹ năng phù hợp.'}
                    </span>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {error ? <p className="profile-field-error">{error}</p> : null}

      {mode === 'multiple' ? (
        selectedSkills.length === 0 ? (
          <p className="profile-empty-copy">Chưa có kỹ năng nào.</p>
        ) : (
          <div className="profile-chip-wrap">
            {selectedSkills.map((skill) => (
              <span className="profile-chip" key={skill}>
                {skill}
                <button aria-label={`Xóa ${skill}`} onClick={() => onRemove(skill)} type="button">
                  <X size={14} />
                </button>
              </span>
            ))}
          </div>
        )
      ) : null}
    </div>
  )
}
