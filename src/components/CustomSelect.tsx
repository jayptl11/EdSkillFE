import { useId, useRef, useState } from 'react'
import { ChevronDown, Check } from 'lucide-react'

export interface SelectOption {
  label: string
  value: string | number
}

export function CustomSelect({
  options,
  placeholder = 'Chọn...',
  value,
  onChange,
}: {
  options: SelectOption[]
  placeholder?: string
  value: string | number | null
  onChange: (value: string | number | null) => void
}) {
  const listboxId = useId()
  const blurTimeoutRef = useRef<number | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  const selectedOption = options.find((opt) => opt.value === value) ?? null

  const handleSelect = (option: SelectOption) => {
    onChange(option.value)
    setIsOpen(false)
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

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!isOpen && (event.key === 'ArrowDown' || event.key === 'Enter')) {
      setIsOpen(true)
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((current) => (current + 1) % options.length)
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((current) => (current - 1 + options.length) % options.length)
      return
    }

    if (event.key === 'Escape') {
      setIsOpen(false)
      return
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      handleSelect(options[activeIndex])
    }
  }

  return (
    <div className="custom-select" onBlur={handleBlur} onFocus={handleFocus}>
      <button
        aria-controls={listboxId}
        aria-expanded={isOpen}
        className="custom-select-trigger"
        onClick={() => setIsOpen((current) => !current)}
        onKeyDown={handleKeyDown}
        type="button"
      >
        <span className={selectedOption ? '' : 'custom-select-placeholder'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className={`custom-select-arrow ${isOpen ? 'open' : ''}`} size={18} />
      </button>

      {isOpen ? (
        <div className="custom-select-popover" role="presentation">
          <div className="custom-select-list" id={listboxId} role="listbox">
            {options.map((option, index) => (
              <button
                aria-selected={option.value === value}
                className={`custom-select-option ${index === activeIndex ? 'active' : ''} ${option.value === value ? 'selected' : ''}`}
                key={option.value}
                onMouseDown={(event) => {
                  event.preventDefault()
                  handleSelect(option)
                }}
                role="option"
                type="button"
              >
                <span>{option.label}</span>
                {option.value === value ? <Check size={16} /> : null}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
