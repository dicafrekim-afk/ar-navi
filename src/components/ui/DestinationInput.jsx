import React, { useState } from 'react'

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

/**
 * DestinationInput — 목적지 주소 검색 UI
 *
 * props:
 *   destination  { lat, lon, name }
 *   onConfirm    (destination) => void
 *   disabled     boolean (내비게이션 활성 중)
 */
export default function DestinationInput({ destination, onConfirm, disabled }) {
  const [query,   setQuery]   = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  const [open,    setOpen]    = useState(false)

  const handleSearch = async () => {
    const q = query.trim()
    if (!q) return
    if (!API_KEY) {
      setError('API 키가 설정되지 않았습니다.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(q)}&language=ko&region=KR&key=${API_KEY}`
      const res  = await fetch(url)
      const data = await res.json()
      if (data.status !== 'OK' || !data.results?.length) {
        setError('주소를 찾을 수 없습니다.')
        return
      }
      const result = data.results[0]
      onConfirm({
        lat:  result.geometry.location.lat,
        lon:  result.geometry.location.lng,
        name: result.formatted_address,
      })
      setQuery('')
      setOpen(false)
      setError(null)
    } catch (e) {
      setError('검색 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch()
    if (e.key === 'Escape') setOpen(false)
  }

  return (
    <div style={{ position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 999, width: '320px' }}>
      {/* 현재 목적지 표시 버튼 */}
      {!open && (
        <button
          onClick={() => !disabled && setOpen(true)}
          title={disabled ? '내비게이션 중에는 목적지를 변경할 수 없습니다' : '목적지 변경'}
          style={{
            width:          '100%',
            display:        'flex',
            alignItems:     'center',
            gap:            '10px',
            padding:        '10px 16px',
            background:     'rgba(0,14,36,0.88)',
            border:         `1px solid ${disabled ? 'rgba(0,127,255,0.25)' : 'rgba(0,127,255,0.55)'}`,
            borderRadius:   '12px',
            color:          disabled ? 'rgba(255,255,255,0.5)' : '#ffffff',
            fontSize:       '14px',
            cursor:         disabled ? 'default' : 'pointer',
            backdropFilter: 'blur(12px)',
            boxShadow:      '0 4px 16px rgba(0,0,0,0.45)',
            textAlign:      'left',
            transition:     'border-color 0.2s',
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

      {/* 검색 입력 패널 */}
      {open && (
        <div style={{
          background:     'rgba(0,14,36,0.96)',
          border:         '1px solid rgba(0,127,255,0.55)',
          borderRadius:   '12px',
          overflow:       'hidden',
          backdropFilter: 'blur(16px)',
          boxShadow:      '0 6px 24px rgba(0,0,0,0.6)',
        }}>
          {/* 헤더 */}
          <div style={{
            padding:      '10px 14px',
            borderBottom: '1px solid rgba(0,127,255,0.2)',
            fontSize:     '12px',
            color:        'rgba(255,255,255,0.5)',
            display:      'flex',
            justifyContent: 'space-between',
            alignItems:   'center',
          }}>
            <span>목적지 검색</span>
            <button
              onClick={() => setOpen(false)}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '16px', padding: '0' }}
            >
              ✕
            </button>
          </div>

          {/* 입력창 + 검색 버튼 */}
          <div style={{ display: 'flex', alignItems: 'center', padding: '10px 12px', gap: '8px' }}>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="주소 또는 장소명 입력"
              autoFocus
              style={{
                flex:         1,
                background:   'rgba(255,255,255,0.08)',
                border:       '1px solid rgba(0,127,255,0.3)',
                borderRadius: '8px',
                padding:      '9px 12px',
                color:        '#ffffff',
                fontSize:     '14px',
                outline:      'none',
              }}
            />
            <button
              onClick={handleSearch}
              disabled={loading || !query.trim()}
              style={{
                padding:      '9px 14px',
                background:   loading ? 'rgba(0,127,255,0.3)' : 'rgba(0,127,255,0.8)',
                border:       'none',
                borderRadius: '8px',
                color:        '#fff',
                fontSize:     '14px',
                cursor:       loading ? 'default' : 'pointer',
                flexShrink:   0,
                transition:   'background 0.2s',
              }}
            >
              {loading ? '⌛' : '🔍'}
            </button>
          </div>

          {/* 오류 메시지 */}
          {error && (
            <div style={{ padding: '6px 14px 12px', fontSize: '12px', color: '#ff6b6b' }}>
              ⚠ {error}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
