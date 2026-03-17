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
import { useNavigation } from '../../hooks/useNavigation'

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
}) {
  const navActive = navigationData.status === 'active'

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
            <HomePanel position={placedPosition} navigationData={navigationData} />
          )}
        </>
      )}

      {/* AR 내비게이션 화살표 HUD — 내비게이션 활성 시에만 표시 */}
      {navActive && (
        <NavigationArrow
          relativeAngle={navigationData.relativeAngle}
          distance={navigationData.distance}
          heading={navigationData.heading}
          hasArrived={navigationData.hasArrived}
        />
      )}
    </>
  )
}

// ─── 버튼 공통 스타일 ──────────────────────────────────────────────────────────
const btnBase = {
  position: 'fixed',
  zIndex: 999,
  padding: '12px 22px',
  fontSize: '15px',
  fontWeight: 'bold',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  boxShadow: '0 4px 12px rgba(0,0,0,0.35)',
  transition: 'opacity 0.2s',
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────
export default function XRScene() {
  const [placedPosition, setPlacedPosition] = useState(new Vector3(0, 1, -3))
  const [activeZone, setActiveZone]         = useState(null)

  // 내비게이션 훅 — Canvas 밖에서 호출 (브라우저 API 사용)
  const navigationData = useNavigation()
  const { status, error, startNavigation, hasArrived } = navigationData

  return (
    <>
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

      {/* ── 내비게이션 활성 상태 인디케이터 ─────────────── */}
      {status === 'active' && !hasArrived && (
        <div style={{
          position: 'fixed', bottom: '20px', left: '20px', zIndex: 999,
          padding: '10px 18px', borderRadius: '8px',
          backgroundColor: 'rgba(0,119,204,0.85)', color: '#ffffff',
          fontSize: '13px', lineHeight: '1.5',
        }}>
          🧭 내비게이션 중<br />
          <span style={{ fontSize: '11px', opacity: 0.8 }}>제일연합내과의원</span>
        </div>
      )}

      {/* ── 도착 알림 (HTML 오버레이 버전) ───────────────
           3D 팝업과 함께 HTML 배너도 표시 */}
      {hasArrived && (
        <div style={{
          position: 'fixed', top: '24px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 999, padding: '14px 28px', borderRadius: '12px',
          backgroundColor: 'rgba(72,187,120,0.92)', color: '#ffffff',
          fontSize: '16px', fontWeight: 'bold', textAlign: 'center',
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        }}>
          🏥 목적지에 도착했습니다!<br />
          <span style={{ fontSize: '13px', fontWeight: 'normal' }}>제일연합내과의원</span>
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
          />
        </XR>
      </Canvas>
    </>
  )
}
