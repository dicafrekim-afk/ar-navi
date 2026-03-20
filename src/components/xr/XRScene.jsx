import React, { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Vector3, Quaternion } from 'three'
import { XR, createXRStore } from '@react-three/xr'
import XRNavigation from './XRNavigation'
import HomePanel from '../ui/HomePanel'
import CalendarPanel from '../ui/CalendarPanel'
import NotificationPanel from '../ui/NotificationPanel'
import TaskPanel from '../ui/TaskPanel'
import HitTestReticle from './HitTestReticle'
import NavigationArrow from '../ar/NavigationArrow'
import FloorArrows from '../ar/FloorArrows'
import NavigationGuide from '../ui/NavigationGuide'
import DestinationInput from '../ui/DestinationInput'
import { useNavigation } from '../../hooks/useNavigation'
import { useDirections } from '../../hooks/useDirections'

const DEFAULT_DESTINATION = {
  lat:  36.4868361,
  lon:  127.2509414,
  name: '제일연합내과의원',
}

// ─── XR 스토어 ────────────────────────────────────────────────────────────────
const xrStore = createXRStore({
  sessionInit: {
    requiredFeatures: ['hit-test'],
    optionalFeatures: ['dom-overlay'],
    domOverlay: { root: document.body },
  },
})

// ─── 3D 씬 콘텐츠 ─────────────────────────────────────────────────────────────
function SceneContent({
  placedPosition,
  setPlacedPosition,
  activeZone,
  setActiveZone,
  navigationData,
  directionsData,
}) {
  const navActive = navigationData.status === 'active'
  const floorY    = placedPosition ? placedPosition.y : undefined

  return (
    <>
      {/* 조명 */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 10, 5]} intensity={0.8} />

      {/* AR 바닥 감지 레티클 */}
      <HitTestReticle
        onPlace={(matrix) => {
          const pos = new Vector3()
          matrix.decompose(pos, new Quaternion(), new Vector3())
          setPlacedPosition(pos)
        }}
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
            <HomePanel
              position={placedPosition}
              navigationData={navigationData}
            />
          )}
        </>
      )}

      {/* AR 내비게이션 HUD 화살표 */}
      {navActive && (
        <NavigationArrow
          relativeAngle={navigationData.relativeAngle}
          distance={navigationData.distance}
          heading={navigationData.heading}
          hasArrived={navigationData.hasArrived}
        />
      )}

      {/* 바닥 파란색 화살표 경로 가이드 */}
      <FloorArrows
        steps={directionsData.steps}
        currentPosition={navigationData.position}
        heading={navigationData.heading}
        active={navActive && !navigationData.hasArrived}
        floorY={floorY}
      />
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
  const [activeZone,     setActiveZone]     = useState(null)
  const [destination,    setDestination]    = useState(DEFAULT_DESTINATION)

  // 내비게이션 훅 — Canvas 밖에서 호출 (브라우저 API 사용)
  const navigationData = useNavigation(destination)
  const { status, error, startNavigation, hasArrived, position, heading } = navigationData

  const navActive = status === 'active'

  // Google Directions 훅 — 실제 보행 경로 조회
  const directionsData = useDirections({
    position,
    active:      navActive,
    apiKey:      import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    destination,
  })

  return (
    <>
      {/* ── 목적지 검색 입력창 ───────────────────────── */}
      <DestinationInput
        destination={destination}
        onConfirm={setDestination}
        disabled={navActive}
      />

      {/* ── AR 진입 버튼 ─────────────────────────────── */}
      <button
        onClick={() => xrStore.enterAR()}
        style={{ ...btnBase, bottom: '20px', right: '20px', backgroundColor: '#00cc88' }}
      >
        📱 Enter AR
      </button>

      {/* ── 내비게이션 시작 버튼 (idle 상태) ────────────
           iOS는 사용자 제스처가 있어야 나침반 권한 요청 가능 */}
      {status === 'idle' && (
        <button
          onClick={startNavigation}
          style={{ ...btnBase, bottom: '20px', left: '20px', backgroundColor: '#0077cc' }}
        >
          🧭 내비게이션 시작
        </button>
      )}

      {/* ── 권한 요청 중 ─────────────────────────────── */}
      {status === 'requesting' && (
        <div style={{
          position: 'fixed', bottom: '20px', left: '20px', zIndex: 999,
          padding: '12px 22px', borderRadius: '8px',
          backgroundColor: 'rgba(0,0,0,0.7)', color: '#ffffff', fontSize: '14px',
        }}>
          📡 위치 권한 요청 중...
        </div>
      )}

      {/* ── 하단 턴-바이-턴 안내 가이드 ─────────────────
           내비게이션 활성 & 미도착 시 표시 */}
      {navActive && !hasArrived && (
        <NavigationGuide
          currentStep={directionsData.currentStep}
          distanceToStep={directionsData.distanceToStep}
          hasArrived={hasArrived}
          destName={navigationData.destination.name}
          loading={directionsData.loading}
          error={directionsData.error}
        />
      )}

      {/* ── 도착 알림 배너 ────────────────────────────── */}
      {hasArrived && (
        <div style={{
          position: 'fixed', top: '24px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 999, padding: '14px 28px', borderRadius: '12px',
          backgroundColor: 'rgba(72,187,120,0.92)', color: '#ffffff',
          fontSize: '16px', fontWeight: 'bold', textAlign: 'center',
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        }}>
          🏥 목적지에 도착했습니다!<br />
          <span style={{ fontSize: '13px', fontWeight: 'normal' }}>
            {navigationData.destination.name}
          </span>
        </div>
      )}

      {/* ── 오류 메시지 ──────────────────────────────── */}
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

      {/* ── Canvas ───────────────────────────────────── */}
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
            directionsData={directionsData}
          />
        </XR>
      </Canvas>
    </>
  )
}
