import React, { useState, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { Vector3, Quaternion } from 'three'
import { XR, createXRStore } from '@react-three/xr'

import XRNavigation      from './XRNavigation'
import HitTestReticle    from './HitTestReticle'
import FloorArrows       from '../ar/FloorArrows'
import HomePanel         from '../ui/HomePanel'
import CalendarPanel     from '../ui/CalendarPanel'
import NotificationPanel from '../ui/NotificationPanel'
import TaskPanel         from '../ui/TaskPanel'
import NavigationGuide   from '../ui/NavigationGuide'
import SearchBar         from '../ui/SearchBar'

import { useNavigation } from '../../hooks/useNavigation'
import { useDirections } from '../../hooks/useDirections'

// ─── XR 스토어 ────────────────────────────────────────────────────────────────
const xrStore = createXRStore({
  sessionInit: {
    requiredFeatures: ['hit-test'],
    optionalFeatures: ['dom-overlay'],
    domOverlay: { root: document.body },
  },
})

// ─── 인앱 브라우저 감지 ───────────────────────────────────────────────────────
function isInAppBrowser() {
  const ua = navigator.userAgent || ''
  return /KAKAOTALK|Line\/|Instagram|FBAN|FBAV|Twitter\/|Snapchat/i.test(ua)
}

// ─── 3D 씬 콘텐츠 ─────────────────────────────────────────────────────────────
function SceneContent({
  placedPosition,
  setPlacedPosition,
  activeZone,
  setActiveZone,
  navigationData,
  hitFloorYRef,
}) {
  const navActive          = navigationData.status === 'active'
  const { bearing, heading } = navigationData

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 10, 5]} intensity={0.8} />

      {/* 바닥 인식 레티클 — hitFloorYRef에 매 프레임 Y 좌표 기록 */}
      <HitTestReticle
        onPlace={(matrix) => {
          const pos = new Vector3()
          matrix.decompose(pos, new Quaternion(), new Vector3())
          setPlacedPosition(pos)
        }}
        hitFloorYRef={hitFloorYRef}
      />

      {/* 내비게이션 존 마커 */}
      <XRNavigation
        position={placedPosition || new Vector3(0, 0, 0)}
        onZoneChange={setActiveZone}
        activeZone={activeZone}
      />

      {/* 대시보드 패널 */}
      {placedPosition && (
        <>
          {activeZone === 'workspace' && (
            <CalendarPanel position={placedPosition} accentColor="#FF8E8E" />
          )}
          {activeZone === 'meeting' && (
            <NotificationPanel position={placedPosition} accentColor="#4ECDC4" />
          )}
          {activeZone === 'info' && (
            <TaskPanel position={placedPosition} accentColor="#95E1D3" />
          )}
          {!activeZone && (
            <HomePanel position={placedPosition} navigationData={navigationData} />
          )}
        </>
      )}

      {/* 핵심: 바닥에 깔리는 3D 화살표 — 내비게이션 활성 + 방향 데이터 있을 때만 */}
      {navActive && bearing !== null && heading !== null && (
        <FloorArrows
          bearing={bearing}
          heading={heading}
          hitFloorYRef={hitFloorYRef}
        />
      )}
    </>
  )
}

// ─── 버튼 공통 스타일 ──────────────────────────────────────────────────────────
const btnBase = {
  position:     'fixed',
  zIndex:       999,
  padding:      '12px 22px',
  fontSize:     '15px',
  fontWeight:   'bold',
  color:        'white',
  border:       'none',
  borderRadius: '8px',
  cursor:       'pointer',
  boxShadow:    '0 4px 12px rgba(0,0,0,0.35)',
  transition:   'opacity 0.2s',
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────
export default function XRScene() {
  const [placedPosition, setPlacedPosition] = useState(new Vector3(0, 1, -3))
  const [activeZone, setActiveZone]         = useState(null)

  // 바닥 Y 좌표 ref — HitTestReticle이 쓰고, FloorArrows가 읽는다
  const hitFloorYRef = useRef(null)

  // 내비게이션 훅 (Canvas 밖 — 브라우저 API 사용)
  const navigationData = useNavigation()
  const {
    status,
    error,
    position,
    distance,
    destination,
    setDestination,
    startNavigation,
    hasArrived,
  } = navigationData

  // 경로 안내 훅 (목적지 설정 후 활성화)
  const directionsData = useDirections(
    status === 'active' ? position : null,
    destination,
  )

  // ── 인앱 브라우저 경고 ────────────────────────────────────────────────────
  if (isInAppBrowser()) {
    return (
      <div style={{
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        height:         '100%',
        padding:        '32px',
        background:     '#000a18',
        color:          '#ffffff',
        textAlign:      'center',
        gap:            '16px',
      }}>
        <div style={{ fontSize: '52px' }}>⚠️</div>
        <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
          인앱 브라우저에서는 AR을 사용할 수 없습니다
        </div>
        <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.7 }}>
          카카오톡, Instagram 등 앱 내 브라우저는 WebXR을 지원하지 않습니다.
          <br />
          <strong>Safari</strong> 또는 <strong>Chrome</strong> 브라우저로 직접 열어주세요.
        </div>
      </div>
    )
  }

  // 거리 포맷
  const distLabel =
    distance === null ? null :
    distance < 0.1    ? `약 ${Math.round(distance * 1000)}m` :
                        `약 ${distance.toFixed(2)}km`

  return (
    <>
      {/* ── 장소 검색 바 (상단 고정) ─────────────────────────── */}
      <SearchBar onSelectDestination={setDestination} />

      {/* ── AR 진입 버튼 ─────────────────────────────────────── */}
      <button
        onClick={() => xrStore.enterAR()}
        style={{ ...btnBase, bottom: '20px', right: '20px', backgroundColor: '#00cc88' }}
      >
        📱 Enter AR
      </button>

      {/* ── 내비게이션 시작 버튼 (idle) ──────────────────────── */}
      {status === 'idle' && (
        <button
          onClick={startNavigation}
          style={{ ...btnBase, bottom: '20px', left: '20px', backgroundColor: '#1A6FFF' }}
        >
          🧭 내비게이션 시작
        </button>
      )}

      {/* ── 권한 요청 중 ─────────────────────────────────────── */}
      {status === 'requesting' && (
        <div style={{
          position: 'fixed', bottom: '20px', left: '20px', zIndex: 999,
          padding: '12px 22px', borderRadius: '8px',
          backgroundColor: 'rgba(0,0,0,0.7)', color: '#ffffff', fontSize: '14px',
        }}>
          📡 위치 권한 요청 중...
        </div>
      )}

      {/* ── 내비게이션 활성 인디케이터 ────────────────────────── */}
      {status === 'active' && !hasArrived && destination && (
        <div style={{
          position: 'fixed', bottom: '20px', left: '20px', zIndex: 999,
          padding: '10px 18px', borderRadius: '8px',
          backgroundColor: 'rgba(26,111,255,0.85)', color: '#ffffff',
          fontSize: '13px', lineHeight: '1.5',
        }}>
          🧭 내비게이션 중<br />
          <span style={{ fontSize: '11px', opacity: 0.85 }}>
            {destination.name}{distLabel ? ` · ${distLabel}` : ''}
          </span>
        </div>
      )}

      {/* ── 목적지 미설정 안내 ────────────────────────────────── */}
      {status === 'active' && !destination && (
        <div style={{
          position: 'fixed', bottom: '20px', left: '20px', zIndex: 999,
          padding: '10px 18px', borderRadius: '8px',
          backgroundColor: 'rgba(26,111,255,0.65)', color: '#ffffff',
          fontSize: '13px',
        }}>
          위 검색창에서 목적지를 설정하세요
        </div>
      )}

      {/* ── 도착 알림 배너 ────────────────────────────────────── */}
      {hasArrived && (
        <div style={{
          position: 'fixed', top: '80px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 999, padding: '14px 28px', borderRadius: '12px',
          backgroundColor: 'rgba(72,187,120,0.92)', color: '#ffffff',
          fontSize: '16px', fontWeight: 'bold', textAlign: 'center',
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        }}>
          🏁 목적지에 도착했습니다!<br />
          <span style={{ fontSize: '13px', fontWeight: 'normal' }}>{destination?.name}</span>
        </div>
      )}

      {/* ── 오류 메시지 ──────────────────────────────────────── */}
      {(status === 'denied' || status === 'unsupported') && (
        <div style={{
          position: 'fixed', bottom: '20px', left: '20px', zIndex: 999,
          padding: '12px 18px', borderRadius: '8px',
          backgroundColor: 'rgba(180,40,40,0.85)', color: '#ffffff',
          fontSize: '13px', maxWidth: '260px',
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* ── TBT 안내 바 (하단 고정) ───────────────────────────── */}
      {status === 'active' && !hasArrived && destination && (
        <NavigationGuide
          currentStep={directionsData.currentStep}
          currentStepIdx={directionsData.currentStepIdx}
          totalSteps={directionsData.totalSteps}
          destination={destination}
          loading={directionsData.loading}
        />
      )}

      {/* ── Three.js Canvas ──────────────────────────────────── */}
      <Canvas
        gl={{ alpha: true, antialias: true, xrCompatible: true }}
        style={{ background: '#f0f0f0', width: '100%', height: '100%' }}
        camera={{ position: [0, 0, 5], fov: 75, near: 0.1, far: 1000 }}
      >
        <XR store={xrStore}>
          <SceneContent
            placedPosition={placedPosition}
            setPlacedPosition={setPlacedPosition}
            activeZone={activeZone}
            setActiveZone={setActiveZone}
            navigationData={navigationData}
            hitFloorYRef={hitFloorYRef}
          />
        </XR>
      </Canvas>
    </>
  )
}
