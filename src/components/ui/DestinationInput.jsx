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
export default function DestinationInput({ destination, onConfirm, disabled }) {
  const [open,        setOpen]        = useState(false)
  const [query,       setQuery]       = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [fetching,    setFetching]    = useState(false)
  const [selecting,   setSelecting]   = useState(false)
  const [error,       setError]       = useState(null)

  const inputRef   = useRef(null)
  const debouncedQ = useDebounce(query, 350)

  // ── 자동완성 조회 (legacy Places Autocomplete API) ─────────────────────────
  useEffect(() => {
    if (!open || !debouncedQ.trim()) {
      setSuggestions([])
      setError(null)
      return
    }
    if (!API_KEY) {
      setError('.env.local 에 VITE_GOOGLE_MAPS_API_KEY 를 설정해주세요.')
      return
    }

    let cancelled = false
    setFetching(true)
    setError(null)

    const url =
      `https://maps.googleapis.com/maps/api/place/autocomplete/json` +
      `?input=${encodeURIComponent(debouncedQ)}` +
      `&language=ko&components=country:kr` +
      `&key=${API_KEY}`

    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return

        // API 자체 오류 상태 표시
        if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
          setError(
            data.error_message
              ? `오류: ${data.error_message}`
              : `API 오류 (${data.status}) — Google Cloud Console에서 Places API 활성화를 확인하세요.`,
          )
          setSuggestions([])
          return
        }

        setSuggestions(data.predictions ?? [])
      })
      .catch((e) => {
        if (!cancelled) setError(`네트워크 오류: ${e.message}`)
      })
      .finally(() => {
        if (!cancelled) setFetching(false)
      })

    return () => { cancelled = true }
  }, [debouncedQ, open])

  // ── 목록에서 선택 → Place Details로 좌표 취득 ──────────────────────────────
  const handleSelect = async (prediction) => {
    const { place_id, description, structured_formatting } = prediction
    const displayName = structured_formatting?.main_text ?? description

    setSelecting(true)
    setError(null)
    try {
      const url =
        `https://maps.googleapis.com/maps/api/place/details/json` +
        `?place_id=${place_id}&fields=geometry,name&language=ko` +
        `&key=${API_KEY}`

      const res  = await fetch(url)
      const data = await res.json()

      if (data.status !== 'OK') {
        throw new Error(`장소 상세정보 오류 (${data.status})`)
      }

      onConfirm({
        lat:  data.result.geometry.location.lat,
        lon:  data.result.geometry.location.lng,
        name: data.result.name ?? displayName,
      })
      setQuery('')
      setSuggestions([])
      setOpen(false)
    } catch (e) {
      setError(e.message)
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
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const handleClose = () => {
    setOpen(false)
    setQuery('')
    setSuggestions([])
    setError(null)
  }

  // ─── 렌더링 ───────────────────────────────────────────────────────────────
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
              onChange={(e) => { setQuery(e.target.value); setError(null) }}
              onKeyDown={(e) => e.key === 'Escape' && handleClose()}
              placeholder="주소 또는 장소명 입력"
              style={{
                width:        '100%',
                boxSizing:    'border-box',
                background:   'rgba(255,255,255,0.07)',
                border:       `1px solid ${error ? 'rgba(255,100,100,0.5)' : 'rgba(0,127,255,0.35)'}`,
                borderRadius: '9px',
                padding:      '10px 36px 10px 12px',
                color:        '#ffffff',
                fontSize:     '14px',
                outline:      'none',
              }}
            />
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

          {/* 오류 메시지 */}
          {error && (
            <div style={{
              padding:    '0 14px 10px',
              fontSize:   '12px',
              color:      '#ff8080',
              lineHeight: '1.5',
            }}>
              ⚠ {error}
            </div>
          )}

          {/* 자동완성 목록 */}
          {suggestions.length > 0 && (
            <ul style={{
              listStyle: 'none',
              margin:    0,
              padding:   '0 0 8px',
              maxHeight: '280px',
              overflowY: 'auto',
              borderTop: '1px solid rgba(0,127,255,0.12)',
            }}>
              {suggestions.map((pred, i) => {
                const mainText = pred.structured_formatting?.main_text  ?? pred.description
                const subText  = pred.structured_formatting?.secondary_text ?? ''

                return (
                  <li
                    key={pred.place_id ?? i}
                    onClick={() => !selecting && handleSelect(pred)}
                    style={{
                      display:      'flex',
                      alignItems:   'flex-start',
                      gap:          '10px',
                      padding:      '11px 14px',
                      cursor:       selecting ? 'default' : 'pointer',
                      borderBottom: i < suggestions.length - 1
                        ? '1px solid rgba(255,255,255,0.05)'
                        : 'none',
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = 'rgba(0,127,255,0.12)')
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = 'transparent')
                    }
                  >
                    <span style={{ fontSize: '16px', marginTop: '1px', flexShrink: 0, opacity: 0.7 }}>
                      📍
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
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

          {/* 결과 없음 */}
          {!fetching && !error && query.trim() && suggestions.length === 0 && (
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
