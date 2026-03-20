import React, { useState, useEffect, useRef } from 'react'

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

// ─── 디바운스 훅 ──────────────────────────────────────────────────────────────
function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

// ─── 컴포넌트 ─────────────────────────────────────────────────────────────────
/**
 * DestinationInput — Places Autocomplete 검색 입력창
 *
 * props:
 *   destination  { lat, lon, name }
 *   onConfirm    (destination) => void
 *   disabled     boolean (내비게이션 활성 중)
 */
export default function DestinationInput({ destination, onConfirm, disabled }) {
  const [open,        setOpen]        = useState(false)
  const [query,       setQuery]       = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [fetching,    setFetching]    = useState(false)  // 자동완성 로딩
  const [selecting,   setSelecting]   = useState(false)  // 장소 선택 로딩
  const [error,       setError]       = useState(null)

  const inputRef    = useRef(null)
  const debouncedQ  = useDebounce(query, 300)

  // ── 자동완성 조회 (300ms 디바운스) ─────────────────────────────────────────
  useEffect(() => {
    if (!open || !debouncedQ.trim()) {
      setSuggestions([])
      return
    }
    if (!API_KEY) {
      setError('VITE_GOOGLE_MAPS_API_KEY가 설정되지 않았습니다.')
      return
    }

    let cancelled = false
    setFetching(true)
    setError(null)

    fetch('https://places.googleapis.com/v1/places:autocomplete', {
      method:  'POST',
      headers: {
        'Content-Type':   'application/json',
        'X-Goog-Api-Key': API_KEY,
      },
      body: JSON.stringify({
        input:        debouncedQ,
        languageCode: 'ko',
        regionCode:   'KR',
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setSuggestions(data.suggestions ?? [])
      })
      .catch(() => {
        if (!cancelled) setError('자동완성 오류가 발생했습니다.')
      })
      .finally(() => {
        if (!cancelled) setFetching(false)
      })

    return () => { cancelled = true }
  }, [debouncedQ, open])

  // ── 목록에서 선택 → Place Details로 좌표 취득 ──────────────────────────────
  const handleSelect = async (suggestion) => {
    const { placeId, text, structuredFormat } = suggestion.placePrediction
    const displayName =
      structuredFormat?.mainText?.text ?? text?.text ?? '알 수 없는 장소'

    setSelecting(true)
    setError(null)
    try {
      const res   = await fetch(
        `https://places.googleapis.com/v1/places/${placeId}?fields=location,displayName&key=${API_KEY}`,
      )
      const place = await res.json()

      if (!place.location) throw new Error('좌표를 가져올 수 없습니다.')

      onConfirm({
        lat:  place.location.latitude,
        lon:  place.location.longitude,
        name: place.displayName?.text ?? displayName,
      })
      setQuery('')
      setSuggestions([])
      setOpen(false)
    } catch (e) {
      setError(e.message ?? '장소 정보를 가져오지 못했습니다.')
    } finally {
      setSelecting(false)
    }
  }

  const handleOpen = () => {
    if (disabled) return
    setOpen(true)
    setQuery('')
    setSuggestions([])
    setError(null)
    // 다음 틱에 포커스
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const handleClose = () => {
    setOpen(false)
    setQuery('')
    setSuggestions([])
    setError(null)
  }

  // ── 렌더링 ────────────────────────────────────────────────────────────────
  return (
    <div style={{
      position:  'fixed',
      top:       '20px',
      left:      '50%',
      transform: 'translateX(-50%)',
      zIndex:    999,
      width:     '330px',
    }}>

      {/* ── 현재 목적지 표시 버튼 ── */}
      {!open && (
        <button
          onClick={handleOpen}
          title={disabled ? '내비게이션 중에는 목적지를 변경할 수 없습니다' : '목적지 변경'}
          style={{
            width:          '100%',
            display:        'flex',
            alignItems:     'center',
            gap:            '10px',
            padding:        '10px 16px',
            background:     'rgba(0,14,36,0.88)',
            border:         `1px solid ${disabled ? 'rgba(0,127,255,0.2)' : 'rgba(0,127,255,0.55)'}`,
            borderRadius:   '12px',
            color:          disabled ? 'rgba(255,255,255,0.45)' : '#ffffff',
            fontSize:       '14px',
            cursor:         disabled ? 'default' : 'pointer',
            backdropFilter: 'blur(12px)',
            boxShadow:      '0 4px 16px rgba(0,0,0,0.45)',
            textAlign:      'left',
          }}
        >
          <span style={{ fontSize: '18px' }}>📍</span>
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {destination?.name ?? '목적지를 입력하세요'}
          </span>
          {!disabled && (
            <span style={{ fontSize: '11px', color: 'rgba(0,127,255,0.8)', flexShrink: 0 }}>
              변경
            </span>
          )}
        </button>
      )}

      {/* ── 검색 패널 ── */}
      {open && (
        <div style={{
          background:     'rgba(0,14,36,0.97)',
          border:         '1px solid rgba(0,127,255,0.5)',
          borderRadius:   '14px',
          overflow:       'hidden',
          backdropFilter: 'blur(18px)',
          boxShadow:      '0 8px 32px rgba(0,0,0,0.65)',
        }}>

          {/* 헤더 */}
          <div style={{
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'space-between',
            padding:        '10px 14px',
            borderBottom:   '1px solid rgba(0,127,255,0.15)',
          }}>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>
              목적지 검색
            </span>
            <button
              onClick={handleClose}
              style={{
                background: 'none', border: 'none',
                color: 'rgba(255,255,255,0.35)', cursor: 'pointer',
                fontSize: '17px', padding: '0', lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>

          {/* 입력창 */}
          <div style={{ padding: '10px 12px', position: 'relative' }}>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Escape' && handleClose()}
              placeholder="주소 또는 장소명 입력 (예: 노을3로)"
              style={{
                width:        '100%',
                boxSizing:    'border-box',
                background:   'rgba(255,255,255,0.07)',
                border:       '1px solid rgba(0,127,255,0.35)',
                borderRadius: '9px',
                padding:      '10px 36px 10px 12px',
                color:        '#ffffff',
                fontSize:     '14px',
                outline:      'none',
              }}
            />
            {/* 로딩 인디케이터 */}
            {(fetching || selecting) && (
              <span style={{
                position: 'absolute', right: '22px', top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '14px', opacity: 0.6,
              }}>
                ⌛
              </span>
            )}
          </div>

          {/* 오류 */}
          {error && (
            <div style={{ padding: '0 14px 10px', fontSize: '12px', color: '#ff6b6b' }}>
              ⚠ {error}
            </div>
          )}

          {/* 자동완성 목록 */}
          {suggestions.length > 0 && (
            <ul style={{
              listStyle:    'none',
              margin:       0,
              padding:      '0 0 8px',
              maxHeight:    '280px',
              overflowY:    'auto',
              borderTop:    '1px solid rgba(0,127,255,0.12)',
            }}>
              {suggestions.map((s, i) => {
                const pred      = s.placePrediction
                const mainText  = pred.structuredFormat?.mainText?.text  ?? pred.text?.text ?? ''
                const subText   = pred.structuredFormat?.secondaryText?.text ?? ''

                return (
                  <li
                    key={pred.placeId ?? i}
                    onClick={() => !selecting && handleSelect(s)}
                    style={{
                      display:    'flex',
                      alignItems: 'flex-start',
                      gap:        '10px',
                      padding:    '11px 14px',
                      cursor:     selecting ? 'default' : 'pointer',
                      borderBottom: i < suggestions.length - 1
                        ? '1px solid rgba(255,255,255,0.05)'
                        : 'none',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = 'rgba(0,127,255,0.12)')
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = 'transparent')
                    }
                  >
                    {/* 위치 핀 아이콘 */}
                    <span style={{
                      fontSize:   '16px',
                      marginTop:  '1px',
                      flexShrink: 0,
                      opacity:    0.7,
                    }}>
                      📍
                    </span>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* 장소명 (굵게) */}
                      <div style={{
                        fontSize:     '14px',
                        fontWeight:   '600',
                        color:        '#ffffff',
                        overflow:     'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace:   'nowrap',
                      }}>
                        {mainText}
                      </div>
                      {/* 부가 주소 */}
                      {subText && (
                        <div style={{
                          fontSize:     '12px',
                          color:        'rgba(255,255,255,0.45)',
                          overflow:     'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace:   'nowrap',
                          marginTop:    '2px',
                        }}>
                          {subText}
                        </div>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}

          {/* 입력은 했지만 결과 없음 */}
          {!fetching && query.trim() && suggestions.length === 0 && !error && (
            <div style={{
              padding:   '14px',
              fontSize:  '13px',
              color:     'rgba(255,255,255,0.35)',
              textAlign: 'center',
              borderTop: '1px solid rgba(0,127,255,0.12)',
            }}>
              검색 결과가 없습니다
            </div>
          )}
        </div>
      )}
    </div>
  )
}
