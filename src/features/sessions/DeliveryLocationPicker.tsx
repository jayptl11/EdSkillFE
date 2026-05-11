import { useEffect, useRef, useState } from 'react'
import { MapPin, Video, LoaderCircle } from 'lucide-react'
import { geocoders } from 'leaflet-control-geocoder'
import type { SessionDeliveryMode } from './types'

const nominatim = geocoders.nominatim()

interface Props {
  mode: SessionDeliveryMode | ''
  location: string
  onModeChange: (mode: SessionDeliveryMode | '') => void
  onLocationChange: (loc: string) => void
}

export function DeliveryLocationPicker({ mode, location, onModeChange, onLocationChange }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState(location)
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Sync internal query with external location when it changes externally
  useEffect(() => {
    if (!isOpen) {
      setQuery(location)
    }
  }, [location, isOpen])

  // Handle click outside
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setSuggestions([])
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  // Geocode
  useEffect(() => {
    if (mode !== 'Offline' || !isOpen || query.trim().length < 3) {
      setSuggestions([])
      return
    }

    let isStale = false
    const timer = setTimeout(() => {
      setIsLoading(true)
      nominatim.geocode(query).then((results) => {
        if (isStale) return
        setIsLoading(false)
        setSuggestions(results || [])
      }).catch(() => {
        if (isStale) return
        setIsLoading(false)
        setSuggestions([])
      })
    }, 500)

    return () => {
      isStale = true
      clearTimeout(timer)
      setIsLoading(false)
    }
  }, [query, mode, isOpen])

  const handleSelectMode = (newMode: SessionDeliveryMode) => {
    onModeChange(newMode)
    if (newMode === 'Online') {
      onLocationChange('')
      setQuery('')
      setIsOpen(false)
    } else {
      setIsOpen(true)
    }
  }

  const handleSelectAddress = (address: string) => {
    setQuery(address)
    onLocationChange(address)
    setIsOpen(false)
    setSuggestions([])
  }

  return (
    <div className="delivery-location-picker" ref={containerRef}>
      {mode !== 'Offline' ? (
        <button
          className="delivery-picker-btn"
          onClick={() => setIsOpen((c) => !c)}
          type="button"
        >
          {mode === 'Online' ? <Video size={18} /> : <MapPin size={18} />}
          <span>{mode === 'Online' ? 'Học Online' : 'Chọn hình thức học...'}</span>
        </button>
      ) : (
        <div className="delivery-picker-input-wrap">
          <MapPin size={18} />
          <input
            onChange={(e) => {
              setQuery(e.target.value)
              if (e.target.value === '') {
                onLocationChange('')
              }
            }}
            onClick={() => setIsOpen(true)}
            placeholder="Nhập địa chỉ hoặc khu vực..."
            value={query}
          />
          {isLoading && <LoaderCircle className="spin" size={16} />}
        </div>
      )}

      {isOpen && (
        <div className="delivery-picker-popover">
          {mode !== 'Offline' && (
            <div className="delivery-mode-options">
              <button onClick={() => handleSelectMode('Online')} type="button">
                <Video size={18} />
                <div>
                  <strong>Học Online</strong>
                  <span>Học qua video call tích hợp</span>
                </div>
              </button>
              <button onClick={() => handleSelectMode('Offline')} type="button">
                <MapPin size={18} />
                <div>
                  <strong>Gặp trực tiếp</strong>
                  <span>Học tại quán cafe, thư viện...</span>
                </div>
              </button>
            </div>
          )}

          {mode === 'Offline' && (
            <div className="delivery-address-options">
              {suggestions.length > 0 ? (
                <ul>
                  {suggestions.map((res, i) => (
                    <li key={i}>
                      <button onClick={() => handleSelectAddress(res.name)} type="button">
                        <MapPin size={16} />
                        <span>{res.name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="delivery-address-empty">
                  {query.trim().length < 3
                    ? 'Gõ ít nhất 3 ký tự để tìm địa chỉ...'
                    : isLoading
                      ? 'Đang tìm kiếm...'
                      : 'Không tìm thấy địa chỉ phù hợp.'}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
