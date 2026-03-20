import React, { useState, useEffect, useRef } from 'react'

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

// ─── Google Maps JS API 동적 로드 (CORS 우회) ────────────────────────────────
// 레거시 Places REST API는 브라우저에서 CORS 차단됨.
// Maps JavaScript API는 브라우저 클라이언트 전용으로 설계되어 CORS 없이 동작.
let _loadPromise = null
function loadGoogleMapsAPI(key) {
  if (_loadPromise) return _loadPromise
  _loadPromise = new Promise((resolve, reject) => {
    // 이미 로드된 경우
    if (window.google?.maps?.places) {
      resolve(window.google.maps)
      return
    }
    const script    = document.createElement('script')
    script.src      = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places&language=ko`
    script.async    = true
    script.defer    = true
    script.onload   = () => resolve(window.google.maps)
    script.onerror  = () => {
      _loadPromise = null
      reject(new Error('Google Maps 스크립트를 불러오지 못했습니다.\nAPI 키와 네트워크 연결을 확인해주세요.'))
    }
    document.head.appendChild(script)
  })
  return _loadPromise
}

// ─── 에러 토스트 ──────────────────────────────────────────────────────────────
function ErrorToast({ message, onDismiss }) {
  return (
    <div style={{
      position:       'fixed',
      top:            '84px',
      left:           '50%',
      transform:      'translateX(-50%)',
      zIndex:         1000,
      width:          '330px',
      background:     'rgba(160, 20, 20, 0.97)',
      border:         '1px solid rgba(255,80,80,0.6)',
      borderRadius:   '12px',
      padding:        '14px 16px',
      boxShadow:      '0 6px 28px rgba(0,0,0,0.75)',
      backdropFilter: 'blur(14px)',
    }}>
      <div style={{
        display:        'flex',
        justifyContent: 'space-between',
        alignItems:     'flex-start',
        marginBottom:   '8px',
      }}>
        <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#fff' }}>
          ⚠️ 오류 발생
        </span>
        <button
          onClick={onDismiss}
          style={{
            background: 'none', border: 'none',
            color: 'rgba(255,255,255,0.55)', cursor: 'pointer',
            fontSize: '18px', padding: '0', lineHeight: 1, flexShrink: 0,
          }}
        >✕</button>
      </div>
      <div style={{
        fontSize:   '13px',
        color:      'rgba(255,255,255,0.9)',
        lineHeight: '1.65',
        whiteSpace: 'pre-line',
      }}>
        {message}
      </div>
    </div>
  )
}

// ─── 디바운스 훅 ──────────────────────────────────────────────────────────────
function useDebounce(value, delay) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return v
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────
export default function DestinationInput({ destination, onConfirm, disabled }) {
  const [open,        setOpen]        = useState(false)
  const [query,       setQuery]       = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [fetching,    setFetching]    = useState(false)
  const [selecting,   setSelecting]   = useState(false)
  const [toastError,  setToastError]  = useState(null)

  const inputRef     = useRef(null)
  const acServiceRef = useRef(null)   // AutocompleteService 인스턴스
  const debouncedQ   = useDebounce(query, 350)

  // ── Maps JS API 초기화 ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!API_KEY) {
      setToastError(
        '.env.local 파일에 VITE_GOOGLE_MAPS_API_KEY가 설정되지 않았습니다.\n' +
        'Google Cloud Console에서 API 키를 발급받아 설정해주세요.',
      )
      return
    }
    loadGoogleMapsAPI(API_KEY)
      .then((maps) => {
        acServiceRef.current = new maps.places.AutocompleteService()
      })
      .catch((e) => setToastError(e.message))
  }, [])

  // ── 자동완성 조회 ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open || !debouncedQ.trim()) {
      setSuggestions([])
      return
    }
    if (!acServiceRef.current) return

    setFetching(true)
    acServiceRef.current.getPlacePredictions(
      {
        input:                debouncedQ,
        componentRestrictions: { country: 'kr' },
      },
      (predictions, status) => {
        setFetching(false)
        const S = window.google.maps.places.PlacesServiceStatus
        if (status === S.OK) {
          setSuggestions(predictions)
        } else if (status === S.ZERO_RESULTS) {
          setSuggestions([])
        } else if (status === S.REQUEST_DENIED) {
          setSuggestions([])
          setToastError(
            'API 키가 거부되었습니다.\n' +
            'Google Cloud Console → Maps JavaScript API 및 Places API 활성화를 확인해주세요.',
          )
        } else if (status === S.OVER_QUERY_LIMIT) {
          setSuggestions([])
          setToastError('API 쿼리 한도를 초과했습니다. 잠시 후 다시 시도해주세요.')
        } else {
          setSuggestions([])
          setToastError(`자동완성 오류가 발생했습니다. (${status})`)
        }
      },
    )
  }, [debouncedQ, open])

  // ── 장소 선택 → 좌표 취득 ──────────────────────────────────────────────────
  const handleSelect = (prediction) => {
    setSelecting(true)
    const maps          = window.google.maps
    const dummy         = document.createElement('div')
    const placesService = new maps.places.PlacesService(dummy)

    placesService.getDetails(
      { placeId: prediction.place_id, fields: ['geometry', 'name'] },
      (place, status) => {
        setSelecting(false)
        if (status === maps.places.PlacesServiceStatus.OK) {
          onConfirm({
            lat:  place.geometry.location.lat(),
            lon:  place.geometry.location.lng(),
            name: place.name ?? prediction.description,
          })
          setQuery('')
          setSuggestions([])
          setOpen(false)
        } else {
          setToastError(`장소 상세정보를 가져오지 못했습니다. (${status})`)
        }
      },
    )
  }

  const handleOpen = () => {
    if (disabled) return
    setOpen(true)
    setQuery('')
    setSuggestions([])
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const handleClose = () => {
    setOpen(false)
    setQuery('')
    setSuggestions([])
  }

  // ─── 렌더링 ─────────────────────────────────────────────────────────────────
  return (
    <>
      {toastError && (
        <ErrorToast message={toastError} onDismiss={() => setToastError(null)} />
      )}

      <div style={{
        position:  'fixed',
        top:       '20px',
        left:      '50%',
        transform: 'translateX(-50%)',
        zIndex:    999,
        width:     '330px',
      }}>

        {/* ── 현재 목적지 버튼 ── */}
        {!open && (
          <button
            onClick={handleOpen}
            title={disabled ? '내비게이션 중에는 변경할 수 없습니다' : '목적지 변경'}
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
              <span style={{ fontSize: '11px', color: 'rgba(0,127,255,0.8)', flexShrink: 0 }}>변경</span>
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
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>목적지 검색</span>
              <button
                onClick={handleClose}
                style={{
                  background: 'none', border: 'none',
                  color: 'rgba(255,255,255,0.35)', cursor: 'pointer',
                  fontSize: '17px', padding: '0', lineHeight: 1,
                }}
              >✕</button>
            </div>

            {/* 입력창 */}
            <div style={{ padding: '10px 12px', position: 'relative' }}>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Escape' && handleClose()}
                placeholder="주소 또는 장소명 입력"
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
              {(fetching || selecting) && (
                <span style={{
                  position: 'absolute', right: '22px', top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '15px', opacity: 0.6,
                }}>⌛</span>
              )}
            </div>

            {/* 자동완성 목록 */}
            {suggestions.length > 0 && (
              <ul style={{
                listStyle: 'none', margin: 0, padding: '0 0 8px',
                maxHeight: '280px', overflowY: 'auto',
                borderTop: '1px solid rgba(0,127,255,0.12)',
              }}>
                {suggestions.map((pred, i) => {
                  const main = pred.structured_formatting?.main_text        ?? pred.description
                  const sub  = pred.structured_formatting?.secondary_text   ?? ''
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
                          ? '1px solid rgba(255,255,255,0.05)' : 'none',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0,127,255,0.12)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <span style={{ fontSize: '16px', marginTop: '1px', flexShrink: 0, opacity: 0.7 }}>📍</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: '14px', fontWeight: '600', color: '#ffffff',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>{main}</div>
                        {sub && (
                          <div style={{
                            fontSize: '12px', color: 'rgba(255,255,255,0.45)',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            marginTop: '2px',
                          }}>{sub}</div>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}

            {/* 결과 없음 */}
            {!fetching && query.trim() && suggestions.length === 0 && (
              <div style={{
                padding: '14px', fontSize: '13px',
                color: 'rgba(255,255,255,0.35)', textAlign: 'center',
                borderTop: '1px solid rgba(0,127,255,0.12)',
              }}>
                검색 결과가 없습니다
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
