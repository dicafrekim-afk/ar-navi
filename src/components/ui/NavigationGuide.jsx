import React from 'react'

// Google Routes API maneuver → 방향 아이콘 매핑
const MANEUVER_ICON = {
  TURN_LEFT:         '↰',
  TURN_RIGHT:        '↱',
  TURN_SLIGHT_LEFT:  '↖',
  TURN_SLIGHT_RIGHT: '↗',
  TURN_SHARP_LEFT:   '↙',
  TURN_SHARP_RIGHT:  '↘',
  STRAIGHT:          '↑',
  UTURN_LEFT:        '↩',
  UTURN_RIGHT:       '↪',
  ROUNDABOUT_LEFT:   '↺',
  ROUNDABOUT_RIGHT:  '↻',
  DEPART:            '📍',
  ARRIVE:            '🏁',
}

function distLabel(meters) {
  if (!meters) return ''
  return meters < 1000 ? `${Math.round(meters)}m` : `${(meters / 1000).toFixed(1)}km`
}

/**
 * NavigationGuide — 하단 고정 TBT(턴-바이-턴) 안내 바 (HTML 오버레이)
 *
 * Props:
 *   currentStep    useDirections의 currentStep 객체
 *   currentStepIdx 현재 스텝 인덱스
 *   totalSteps     전체 스텝 수
 *   destination    { name } | null
 *   loading        boolean
 */
export default function NavigationGuide({
  currentStep,
  currentStepIdx,
  totalSteps,
  destination,
  loading,
}) {
  if (!currentStep && !loading) return null

  const maneuver    = currentStep?.navigationInstruction?.maneuver ?? 'STRAIGHT'
  const icon        = MANEUVER_ICON[maneuver] ?? '↑'
  const instruction = currentStep?.navigationInstruction?.instructions ?? '직진하세요'
  const dist        = distLabel(currentStep?.distanceMeters)

  return (
    <div
      style={{
        position:       'fixed',
        bottom:         '80px',      // NavigationArrow(삭제됨) 공간 없으므로 하단 여백만
        left:           '50%',
        transform:      'translateX(-50%)',
        zIndex:         1000,
        width:          'min(92vw, 440px)',
        background:     'rgba(0, 8, 24, 0.90)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        borderRadius:   '18px',
        border:         '1px solid rgba(26, 111, 255, 0.45)',
        padding:        '14px 16px',
        boxShadow:      '0 4px 28px rgba(0,0,0,0.55), 0 0 14px rgba(26,111,255,0.12)',
        display:        'flex',
        alignItems:     'center',
        gap:            '14px',
        boxSizing:      'border-box',
      }}
    >
      {/* 방향 아이콘 박스 */}
      <div
        style={{
          width:           54,
          height:          54,
          flexShrink:      0,
          background:      'rgba(26, 111, 255, 0.18)',
          border:          '2px solid rgba(26, 111, 255, 0.55)',
          borderRadius:    '13px',
          display:         'flex',
          alignItems:      'center',
          justifyContent:  'center',
          fontSize:        '26px',
          lineHeight:      1,
        }}
      >
        {loading ? '⏳' : icon}
      </div>

      {/* 안내 텍스트 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            color:         '#ffffff',
            fontSize:      '15px',
            fontWeight:    600,
            lineHeight:    1.35,
            marginBottom:  '4px',
            overflow:      'hidden',
            textOverflow:  'ellipsis',
            whiteSpace:    'nowrap',
          }}
        >
          {loading ? '경로 계산 중...' : instruction}
        </div>
        {!loading && (
          <div style={{ color: '#4A8FFF', fontSize: '13px', fontWeight: 500 }}>
            {dist && `${dist} 후`}
            {dist && totalSteps > 0 && ' · '}
            {totalSteps > 0 && `${currentStepIdx + 1} / ${totalSteps} 구간`}
          </div>
        )}
      </div>

      {/* 목적지명 */}
      {destination?.name && (
        <div
          style={{
            flexShrink:    0,
            maxWidth:      72,
            fontSize:      '11px',
            color:         'rgba(255,255,255,0.4)',
            textAlign:     'right',
            overflow:      'hidden',
            textOverflow:  'ellipsis',
            whiteSpace:    'nowrap',
            lineHeight:    1.4,
          }}
        >
          {destination.name}
        </div>
      )}
    </div>
  )
}
