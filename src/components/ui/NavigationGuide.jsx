import React from 'react'

// ─── 방향 아이콘 매핑 ─────────────────────────────────────────────────────────
const MANEUVER_ICON = {
  TURN_LEFT:        { symbol: '↰', label: '좌회전' },
  TURN_SLIGHT_LEFT: { symbol: '↰', label: '좌회전' },
  TURN_SHARP_LEFT:  { symbol: '↰', label: '급좌회전' },
  TURN_RIGHT:       { symbol: '↱', label: '우회전' },
  TURN_SLIGHT_RIGHT:{ symbol: '↱', label: '우회전' },
  TURN_SHARP_RIGHT: { symbol: '↱', label: '급우회전' },
  STRAIGHT:         { symbol: '↑', label: '직진' },
  UTURN_LEFT:       { symbol: '↩', label: 'U턴' },
  UTURN_RIGHT:      { symbol: '↪', label: 'U턴' },
  RAMP_LEFT:        { symbol: '↰', label: '진입로 좌측' },
  RAMP_RIGHT:       { symbol: '↱', label: '진입로 우측' },
  MERGE:            { symbol: '↑', label: '합류' },
  ARRIVE:           { symbol: '🏥', label: '도착' },
}
const DEFAULT_ICON = { symbol: '↑', label: '직진' }

function formatDistance(meters) {
  if (meters === null || meters === undefined) return ''
  if (meters < 1000) return `${Math.round(meters / 5) * 5}m`
  return `${(meters / 1000).toFixed(1)}km`
}

// ─── 컴포넌트 ─────────────────────────────────────────────────────────────────
/**
 * NavigationGuide — 화면 하단 턴-바이-턴 안내 HTML 오버레이
 *
 * props:
 *   currentStep     { maneuver, instructions, distanceMeters } | null
 *   distanceToStep  meters | null
 *   hasArrived      boolean
 *   destName        string
 *   loading         boolean
 *   error           string | null
 */
export default function NavigationGuide({
  currentStep,
  distanceToStep,
  hasArrived,
  destName,
  loading,
  error,
}) {
  if (hasArrived) return null

  const icon    = MANEUVER_ICON[currentStep?.maneuver] ?? DEFAULT_ICON
  const distStr = formatDistance(distanceToStep)
  const instr   = currentStep?.instructions ?? (loading ? '경로 계산 중...' : '직진')

  return (
    <div
      style={{
        position:       'fixed',
        bottom:         '24px',
        left:           '50%',
        transform:      'translateX(-50%)',
        zIndex:         998,
        display:        'flex',
        alignItems:     'center',
        gap:            '0',
        borderRadius:   '16px',
        overflow:       'hidden',
        boxShadow:      '0 6px 24px rgba(0,0,0,0.55)',
        minWidth:       '290px',
        maxWidth:       '420px',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        background:     'rgba(0, 14, 36, 0.88)',
        border:         '1px solid rgba(0,127,255,0.4)',
      }}
    >
      {/* 방향 아이콘 패널 */}
      <div
        style={{
          background:   'rgba(0,127,255,0.25)',
          borderRight:  '1px solid rgba(0,127,255,0.3)',
          padding:      '16px 18px',
          display:      'flex',
          flexDirection:'column',
          alignItems:   'center',
          justifyContent:'center',
          minWidth:     '72px',
        }}
      >
        <span
          style={{
            fontSize:   '38px',
            lineHeight: '1',
            color:      '#007FFF',
            textShadow: '0 0 12px #007FFF',
          }}
        >
          {icon.symbol}
        </span>
      </div>

      {/* 안내 텍스트 패널 */}
      <div
        style={{
          padding:       '14px 18px',
          flex:          1,
        }}
      >
        {/* 거리 */}
        <div
          style={{
            fontSize:    '13px',
            fontWeight:  '600',
            color:       '#007FFF',
            letterSpacing:'0.5px',
            marginBottom:'4px',
          }}
        >
          {distStr ? `${distStr} 앞` : '안내 시작'}
          {loading && (
            <span style={{ marginLeft: '8px', opacity: 0.6, fontSize: '11px' }}>
              ⌛
            </span>
          )}
        </div>

        {/* 지시 문구 */}
        <div
          style={{
            fontSize:    '18px',
            fontWeight:  'bold',
            color:       '#ffffff',
            lineHeight:  '1.3',
          }}
        >
          {instr}
        </div>

        {/* 오류 / 목적지명 */}
        <div
          style={{
            fontSize:    '11px',
            color:       error ? '#ff6b6b' : 'rgba(255,255,255,0.45)',
            marginTop:   '4px',
          }}
        >
          {error ? `⚠ ${error}` : `📍 ${destName}`}
        </div>
      </div>
    </div>
  )
}
