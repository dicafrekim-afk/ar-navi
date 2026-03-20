import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

// ─── 상수 ─────────────────────────────────────────────────────────────────────
const NEON_BLUE      = '#007FFF'
const MAX_ARROWS     = 15          // 한 번에 표시할 최대 화살표 수
const ARROW_INTERVAL = 4           // 화살표 간격 (미터)
const MAX_ROUTE_M    = 80          // 표시할 경로 최대 거리 (미터)
const FLOOR_BELOW    = 1.55        // 카메라 아래 바닥까지의 높이 (미터)
const ARROW_Y_OFFSET = 0.05        // 바닥 위 화살표 높이 (미터)

// ─── 수학 유틸 ────────────────────────────────────────────────────────────────
function haversineMeters(lat1, lon1, lat2, lon2) {
  const R   = 6_371_000
  const r   = (d) => (d * Math.PI) / 180
  const dLat = r(lat2 - lat1)
  const dLon = r(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function initialBearing(lat1, lon1, lat2, lon2) {
  const r    = (d) => (d * Math.PI) / 180
  const dLon = r(lon2 - lon1)
  const y    = Math.sin(dLon) * Math.cos(r(lat2))
  const x    =
    Math.cos(r(lat1)) * Math.sin(r(lat2)) -
    Math.sin(r(lat1)) * Math.cos(r(lat2)) * Math.cos(dLon)
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
}

// ─── GPS → 월드 좌표 변환 ──────────────────────────────────────────────────────
//   camFwd   : 카메라 수평 전방 벡터 (y=0, 정규화)
//   relAngle : 기기 전방 기준 목표 각도 (CW 도)
//   distance : 목표까지 미터 거리
//   origin   : camera.position
function gpsToWorld(camera, camFwd, currentGps, heading, targetGps, floorY) {
  const bearing  = initialBearing(currentGps.lat, currentGps.lon, targetGps.lat, targetGps.lon)
  const distM    = haversineMeters(currentGps.lat, currentGps.lon, targetGps.lat, targetGps.lon)
  const relAngle = ((bearing - heading + 360) % 360) * (Math.PI / 180)

  // +Y 축 기준 relAngle 만큼 CW 회전 (표준 3D 회전 행렬)
  const cosA = Math.cos(relAngle)
  const sinA = Math.sin(relAngle)
  const wx   = cosA * camFwd.x - sinA * camFwd.z
  const wz   = sinA * camFwd.x + cosA * camFwd.z

  return new THREE.Vector3(
    camera.position.x + wx * distM,
    floorY,
    camera.position.z + wz * distM,
  )
}

// ─── 화살표 단일 메시 ─────────────────────────────────────────────────────────
//   그룹의 +Z 방향 = 화살표 진행 방향 (앞부분이 +Z)
//   바닥에 납작하게 놓임 (y ≈ 0)
function ArrowMesh({ color }) {
  return (
    <group>
      {/* 화살표 축 (shaft) */}
      <mesh position={[0, ARROW_Y_OFFSET, -0.06]}>
        <boxGeometry args={[0.13, 0.04, 0.28]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={2.0}
          transparent
          opacity={0.92}
        />
      </mesh>

      {/* 화살표 머리 (head) — 끝 부분이 +Z 방향 */}
      <mesh position={[0, ARROW_Y_OFFSET, 0.17]} rotation={[-Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.19, 0.30, 8]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={2.0}
          transparent
          opacity={0.92}
        />
      </mesh>

      {/* 바닥 발광 디스크 (시인성 향상) */}
      <mesh position={[0, 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.28, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.6}
          transparent
          opacity={0.25}
        />
      </mesh>
    </group>
  )
}

// ─── FloorArrows ─────────────────────────────────────────────────────────────
/**
 * AR 바닥 파란색 화살표 가이드
 *
 * props:
 *   steps           useDirections().steps  (GPS 경로 스텝 배열)
 *   currentPosition { lat, lon }
 *   heading         compass heading (도, CW from North) | null
 *   active          boolean — 내비게이션 활성 여부
 *   floorY          바닥 Y 좌표 (옵션, 없으면 camera.y - FLOOR_BELOW)
 */
export default function FloorArrows({ steps, currentPosition, heading, active, floorY }) {
  const { camera } = useThree()
  const groupRef   = useRef()
  const arrowRefs  = useRef([])

  // 임시 벡터 재사용 (GC 방지)
  const _camFwd = useRef(new THREE.Vector3())
  const _p0     = useRef(new THREE.Vector3())
  const _p1     = useRef(new THREE.Vector3())
  const _segDir = useRef(new THREE.Vector3())

  useFrame((_, delta) => {
    if (!groupRef.current) return

    // 조건 미충족 시 전체 숨기기
    if (!active || !steps?.length || !currentPosition || heading === null) {
      groupRef.current.visible = false
      return
    }
    groupRef.current.visible = true

    const floor = floorY ?? (camera.position.y - FLOOR_BELOW)

    // 카메라 수평 전방 벡터
    camera.getWorldDirection(_camFwd.current)
    _camFwd.current.y = 0
    if (_camFwd.current.lengthSq() < 1e-6) _camFwd.current.set(0, 0, -1)
    _camFwd.current.normalize()

    // 카메라 위치 → 월드 좌표로 변환한 GPS 경유점 목록
    const worldPts = [
      new THREE.Vector3(camera.position.x, floor, camera.position.z),
    ]

    for (let i = 0; i < Math.min(steps.length, 6); i++) {
      const s    = steps[i]
      const dist = haversineMeters(
        currentPosition.lat, currentPosition.lon,
        s.endLocation.lat,   s.endLocation.lon,
      )
      if (dist > MAX_ROUTE_M) break
      worldPts.push(
        gpsToWorld(camera, _camFwd.current, currentPosition, heading, s.endLocation, floor),
      )
    }

    // 폴리라인을 따라 ARROW_INTERVAL 간격으로 화살표 배치
    let arrowIdx  = 0
    let remainder = ARROW_INTERVAL   // 첫 화살표는 카메라 앞 4m부터

    for (let seg = 0; seg < worldPts.length - 1 && arrowIdx < MAX_ARROWS; seg++) {
      _p0.current.copy(worldPts[seg])
      _p1.current.copy(worldPts[seg + 1])
      const segLen = _p0.current.distanceTo(_p1.current)
      if (segLen < 0.01) continue

      _segDir.current.subVectors(_p1.current, _p0.current).normalize()
      const arrowRotY = Math.atan2(_segDir.current.x, _segDir.current.z)

      while (remainder <= segLen && arrowIdx < MAX_ARROWS) {
        const frac = remainder / segLen
        const pos  = _p0.current.clone().lerp(_p1.current, frac)

        const ag = arrowRefs.current[arrowIdx]
        if (ag) {
          ag.position.set(pos.x, floor, pos.z)
          ag.rotation.y = arrowRotY
          ag.visible    = true
        }

        arrowIdx++
        remainder += ARROW_INTERVAL
      }
      remainder -= segLen
    }

    // 남은 화살표 숨기기
    for (let i = arrowIdx; i < MAX_ARROWS; i++) {
      if (arrowRefs.current[i]) arrowRefs.current[i].visible = false
    }
  })

  return (
    <group ref={groupRef}>
      {Array.from({ length: MAX_ARROWS }, (_, i) => (
        <group
          key={i}
          ref={(el) => { arrowRefs.current[i] = el }}
          visible={false}
        >
          <ArrowMesh color={NEON_BLUE} />
        </group>
      ))}
    </group>
  )
}
