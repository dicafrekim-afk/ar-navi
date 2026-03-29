import React, { useState, useEffect, useRef, useCallback } from 'react'

/**
 * Google Maps JS API 스크립트를 동적으로 한 번만 로드한다.
 * CORS 이슈 없이 Places AutocompleteService를 사용하는 방식.
 */
function loadGoogleMapsScript(apiKey) {
  return new Promise((resolve, reject) => {
    if (window.google?.maps?.places) { resolve(); return }

    const existing = document.getElementById('gmap-script')
    if (existing) {
      existing.addEventListener('load', resolve)
      existing.addEventListener('error', reject)
      return
    }

    const script    = document.createElement('script')
    script.id       = 'gmap-script'
    script.src      = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&language=ko`
    script.async    = true
    script.defer    = true
    script.onload   = resolve
    script.onerror  = reject
    document.head.appendChild(script)
  })
}

/**
 * SearchBar — 목적지 검색 HTML 오버레이 (상단 고정)
 *
 * Google Maps JS API의 AutocompleteService + PlacesService를 사용하여
 * CORS 차단 없이 장소를 검색한다.
 *
 * Props:
 *   onSelectDestination ({ lat, lon, name }) => void
 */
export default function SearchBar({ onSelectDestination }) {
  const [query,       setQuery]       = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [searching,   setSearching]   = useState(false)
  const [apiReady,    setApiReady]    = useState(false)

  const autocompleteRef = useRef(null)
  const placesRef       = useRef(null)
  const debounceRef     = useRef(null)

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

  // Google Maps JS API 로드
  useEffect(() => {
    if (!apiKey) return
    loadGoogleMapsScript(apiKey)
      .then(() => {
        autocompleteRef.current = new window.google.maps.places.AutocompleteService()
        placesRef.current       = new window.google.maps.places.PlacesService(
          document.createElement('div'),
        )
        setApiReady(true)
      })
      .catch(() => {})
  }, [apiKey])

  const searchPlaces = useCallback((value) => {
    if (!value.trim() || !autocompleteRef.current) {
      setSuggestions([])
      return
    }
    setSearching(true)
    autocompleteRef.current.getPlacePredictions(
      {
        input:                value,
        language:             'ko',
        componentRestrictions: { country: 'kr' },
      },
      (predictions, status) => {
        setSearching(false)
        if (
          status === window.google.maps.places.PlacesServiceStatus.OK &&
          predictions
        ) {
          setSuggestions(predictions.slice(0, 5))
        } else {
          setSuggestions([])
        }
      },
    )
  }, [])

  const handleInput = (e) => {
    const val = e.target.value
    setQuery(val)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => searchPlaces(val), 350)
  }

  const handleSelect = (placeId, description) => {
    setSuggestions([])
    setQuery(description)
    if (!placesRef.current) return
    placesRef.current.getDetails(
      { placeId, fields: ['geometry', 'name'] },
      (place, status) => {
        if (
          status === window.google.maps.places.PlacesServiceStatus.OK &&
          place?.geometry
        ) {
          onSelectDestination({
            lat:  place.geometry.location.lat(),
            lon:  place.geometry.location.lng(),
            name: place.name,
          })
        }
      },
    )
  }

  const handleClear = () => {
    setQuery('')
    setSuggestions([])
  }

  const hasSuggestions = suggestions.length > 0

  // API 키 없으면 렌더 안 함
  if (!apiKey) return null

  return (
    <div
      style={{
        position:  'fixed',
        top:       '16px',
        left:      '50%',
        transform: 'translateX(-50%)',
        zIndex:    1000,
        width:     'min(92vw, 440px)',
      }}
    >
      {/* 검색 입력창 */}
      <div
        style={{
          display:         'flex',
          alignItems:      'center',
          background:      'rgba(0, 8, 24, 0.90)',
          backdropFilter:  'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          borderRadius:    hasSuggestions ? '14px 14px 0 0' : '14px',
          border:          '1px solid rgba(26, 111, 255, 0.45)',
          borderBottom:    hasSuggestions ? '1px solid rgba(26,111,255,0.15)' : undefined,
          padding:         '11px 14px',
          gap:             '10px',
          boxShadow:       '0 4px 24px rgba(0,0,0,0.45)',
          boxSizing:       'border-box',
        }}
      >
        <span style={{ fontSize: '17px', flexShrink: 0 }}>🔍</span>
        <input
          type="text"
          value={query}
          onChange={handleInput}
          placeholder={apiReady ? '목적지를 검색하세요' : 'Google Maps 로딩 중...'}
          disabled={!apiReady}
          style={{
            flex:        1,
            background:  'transparent',
            border:      'none',
            outline:     'none',
            color:       '#ffffff',
            fontSize:    '15px',
            minWidth:    0,
          }}
        />
        {searching && (
          <span style={{ color: '#4A8FFF', fontSize: '12px', flexShrink: 0 }}>
            검색 중…
          </span>
        )}
        {query && !searching && (
          <button
            onClick={handleClear}
            style={{
              background: 'none',
              border:     'none',
              color:      'rgba(255,255,255,0.45)',
              cursor:     'pointer',
              fontSize:   '16px',
              padding:    0,
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* 자동완성 목록 */}
      {hasSuggestions && (
        <div
          style={{
            background:    'rgba(0, 8, 24, 0.95)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            borderRadius:  '0 0 14px 14px',
            border:        '1px solid rgba(26, 111, 255, 0.45)',
            borderTop:     'none',
            overflow:      'hidden',
            boxShadow:     '0 8px 24px rgba(0,0,0,0.5)',
          }}
        >
          {suggestions.map((s, i) => (
            <button
              key={s.place_id}
              onClick={() => handleSelect(s.place_id, s.description)}
              style={{
                display:     'block',
                width:       '100%',
                padding:     '12px 16px',
                background:  'none',
                border:      'none',
                borderTop:   i > 0 ? '1px solid rgba(255,255,255,0.07)' : 'none',
                textAlign:   'left',
                cursor:      'pointer',
                color:       '#ffffff',
                boxSizing:   'border-box',
              }}
            >
              <div style={{ fontSize: '14px', fontWeight: 500 }}>
                {s.structured_formatting?.main_text ?? s.description}
              </div>
              {s.structured_formatting?.secondary_text && (
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>
                  {s.structured_formatting.secondary_text}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
