import React, { useMemo } from 'react'

// ─── 방향 아이콘 SVG 경로 ─────────────────────────────────────────────────────
// 실제 내비게이션 앱처럼 굵은 화살표 아이콘 사용
const ICONS = {
  // 직진
  STRAIGHT: (
    <svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M30 52 L30 10" stroke="white" strokeWidth="7" strokeLinecap="round"/>
      <path d="M14 26 L30 10 L46 26" stroke="white" strokeWidth="7"
        strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  ),
  // 우회전
  TURN_RIGHT: (
    <svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M18 50 L18 28 Q18 12 34 12 L46 12" stroke="white" strokeWidth="7" strokeLinecap="round"/>
      <path d="M32 24 L46 12 L34 2" stroke="white" strokeWidth="7"
        strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  ),
  // 좌회전
  TURN_LEFT: (
    <svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M42 50 L42 28 Q42 12 26 12 L14 12" stroke="white" strokeWidth="7" strokeLinecap="round"/>
      <path d="M28 24 L14 12 L26 2" stroke="white" strokeWidth="7"
        strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  ),
  // 우측 차선 변경 / 완만한 우회전
  SLIGHT_RIGHT: (
    <svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M22 50 L22 32 Q24 14 38 12 L48 12" stroke="white" strokeWidth="7" strokeLinecap="round"/>
      <path d="M36 22 L48 12 L38 2" stroke="white" strokeWidth="7"
        strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  ),
  // 좌측 차선 변경 / 완만한 좌회전
  SLIGHT_LEFT: (
    <svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M38 50 L38 32 Q36 14 22 12 L12 12" stroke="white" strokeWidth="7" strokeLinecap="round"/>
      <path d="M24 22 L12 12 L22 2" stroke="white" strokeWidth="7"
        strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  ),
  // U턴
  UTURN: (
    <svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M18 50 L18 24 Q18 8 36 8 Q54 8 54 24 L54 32" stroke="white" strokeWidth="7"
        strokeLinecap="round" fill="none"/>
      <path d="M42 20 L54 32 L44 42" stroke="white" strokeWidth="7"
        strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  ),
  // 도착
  ARRIVE: (
    <svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="30" cy="30" r="22" stroke="white" strokeWidth="6"/>
      <path d="M18 30 L26 38 L42 22" stroke="white" strokeWidth="6"
        strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
}

const MANEUVER_MAP = {
  STRAIGHT:          { icon: ICONS.STRAIGHT,     label: '직진' },
  TURN_RIGHT:        { icon: ICONS.TURN_RIGHT,   label: '우회전' },
  TURN_SLIGHT_RIGHT: { icon: ICONS.SLIGHT_RIGHT, label: '우측으로' },
  TURN_SHARP_RIGHT:  { icon: ICONS.TURN_RIGHT,   label: '급우회전' },
  TURN_LEFT:         { icon: ICONS.TURN_LEFT,    label: '좌회전' },
  TURN_SLIGHT_LEFT:  { icon: ICONS.SLIGHT_LEFT,  label: '좌측으로' },
  TURN_SHARP_LEFT:   { icon: ICONS.TURN_LEFT,    label: '급좌회전' },
  UTURN_LEFT:        { icon: ICONS.UTURN,        label: 'U턴' },
  UTURN_RIGHT:       { icon: ICONS.UTURN,        label: 'U턴' },
  RAMP_LEFT:         { icon: ICONS.SLIGHT_LEFT,  label: '진입로 좌측' },
  RAMP_RIGHT:        { icon: ICONS.SLIGHT_RIGHT, label: '진입로 우측' },
  MERGE:             { icon: ICONS.STRAIGHT,     label: '합류' },
  ARRIVE:            { icon: ICONS.ARRIVE,       label: '목적지 도착' },
}
const DEFAULT_INFO = { icon: ICONS.STRAIGHT, label: '직진' }

// ─── 거리 포맷 ────────────────────────────────────────────────────────────────
function fmtDist(m) {
  if (m === null || m === undefined) return null
  if (m < 50)   return `${Math.round(m)}m`
  if (m < 1000) return `${Math.round(m / 10) * 10}m`
  return `${(m / 1000).toFixed(1)}km`
}

// ─── 컴포넌트 ────────────────────────────────────────────────────────────────
/**
 * NavigationGuide — Tmap 스타일 하단 안내 패널
 */
export default function NavigationGuide({
  currentStep, distanceToStep, hasArrived, destName, loading, error,
}) {
  if (hasArrived) return null

  const info    = MANEUVER_MAP[currentStep?.maneuver] ?? DEFAULT_INFO
  const distStr = fmtDist(distanceToStep)
  const instr   = currentStep?.instructions ?? (loading ? '경로 계산 중...' : '직진')

  return (
    <div style={{
      position:       'fixed',
      bottom:         0,
      left:           0,
      right:          0,
      zIndex:         998,
      background:     'linear-gradient(to bottom, rgba(0,12,30,0.96) 0%, rgba(0,6,18,0.99) 100%)',
      borderTop:      '1px solid rgba(26,111,255,0.35)',
      backdropFilter: 'blur(16px)',
      paddingBottom:  'env(safe-area-inset-bottom, 12px)',
      boxShadow:      '0 -4px 24px rgba(0,0,0,0.6)',
    }}>
      <div style={{
        display:    'flex',
        alignItems: 'center',
        padding:    '14px 20px 10px',
        gap:        '0',
      }}>

        {/* ── 방향 아이콘 박스 ── */}
        <div style={{
          width:           '72px',
          height:          '72px',
          flexShrink:      0,
          background:      'rgba(26,111,255,0.2)',
          border:          '2px solid rgba(26,111,255,0.5)',
          borderRadius:    '14px',
          display:         'flex',
          alignItems:      'center',
          justifyContent:  'center',
          padding:         '10px',
          boxSizing:       'border-box',
          marginRight:     '16px',
        }}>
          <div style={{ width: '100%', height: '100%' }}>
            {info.icon}
          </div>
        </div>

        {/* ── 텍스트 영역 ── */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* 거리 */}
          {distStr && (
            <div style={{
              fontSize:      '13px',
              fontWeight:    '500',
              color:         '#1A6FFF',
              letterSpacing: '0.3px',
              marginBottom:  '4px',
            }}>
              {distStr} 앞
            </div>
          )}

          {/* 지시 문구 */}
          <div style={{
            fontSize:     '22px',
            fontWeight:   '700',
            color:        '#ffffff',
            lineHeight:   '1.25',
            overflow:     'hidden',
            textOverflow: 'ellipsis',
            whiteSpace:   'nowrap',
          }}>
            {instr}
          </div>

          {/* 목적지명 / 오류 */}
          <div style={{
            fontSize:    '12px',
            color:       error ? '#ff6b6b' : 'rgba(255,255,255,0.38)',
            marginTop:   '4px',
            overflow:    'hidden',
            textOverflow:'ellipsis',
            whiteSpace:  'nowrap',
          }}>
            {error
              ? `⚠ ${error}`
              : destName
                ? `📍 ${destName}`
                : null}
          </div>
        </div>

        {/* ── 로딩 인디케이터 ── */}
        {loading && (
          <div style={{
            fontSize:   '22px',
            flexShrink: 0,
            marginLeft: '12px',
            opacity:    0.5,
          }}>
            ⌛
          </div>
        )}

      </div>

      {/* ── 다음 방향 예고 스트립 (다음 스텝이 있을 때) ── */}
      {/* 필요 시 여기에 추가 */}
    </div>
  )
}
