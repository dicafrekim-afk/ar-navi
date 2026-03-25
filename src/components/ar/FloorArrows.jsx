import { useRef, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

// ─── 상수 ────────────────────────────────────────────────────────────────────
const TMAP_BLUE     = '#1A6FFF'
const TMAP_EMISSIVE = '#0040CC'
const MAX_ARROWS    = 12
const INTERVAL      = 3.5      // 화살표 간격 (m)
const MAX_DIST      = 65       // 표시 최대 거리 (m)
const DEPTH         = 0.08     // 화살표 두께 (m)
const BEVEL         = 0.018    // 모서리 둥글기

// ─── 수학 유틸 ────────────────────────────────────────────────────────────────
function haversineM(lat1, lon1, lat2, lon2) {
  const R = 6_371_000, r = d => (d * Math.PI) / 180
  const a =
    Math.sin(r(lat2 - lat1) / 2) ** 2 +
    Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(r(lon2 - lon1) / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function bearing(lat1, lon1, lat2, lon2) {
  const r = d => (d * Math.PI) / 180
  const dL = r(lon2 - lon1)
  const y  = Math.sin(dL) * Math.cos(r(lat2))
  const x  = Math.cos(r(lat1)) * Math.sin(r(lat2)) -
              Math.sin(r(lat1)) * Math.cos(r(lat2)) * Math.cos(dL)
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
}

// ─── 3D 화살표 Geometry 생성 (ExtrudeGeometry) ───────────────────────────────
// XY 평면에 화살표 Shape (→ +Y 방향이 진행 방향)
// rotation.x = -PI/2 로 바닥에 눕혀 사용
function makeArrowGeo() {
  const shape = new THREE.Shape()

  // 치수 (m): 전체 높이 ~0.55, 폭 ~0.48
  const sw  = 0.085  // 샤프트 반폭
  const sb  = -0.18  // 샤프트 하단 Y
  const sn  = 0.08   // 샤프트→헤드 경계 Y
  const hw  = 0.21   // 헤드 반폭
  const ht  = 0.37   // 헤드 꼭짓점 Y

  shape.moveTo(-sw, sb)
  shape.lineTo(-sw, sn)
  shape.lineTo(-hw, sn)
  shape.lineTo(0,   ht)   // 화살표 꼭짓점
  shape.lineTo(hw,  sn)
  shape.lineTo(sw,  sn)
  shape.lineTo(sw,  sb)
  shape.closePath()

  return new THREE.ExtrudeGeometry(shape, {
    depth:          DEPTH,
    bevelEnabled:   true,
    bevelThickness: BEVEL,
    bevelSize:      BEVEL,
    bevelSegments:  5,
  })
}

// ─── 컴포넌트 ────────────────────────────────────────────────────────────────
export default function FloorArrows({
  steps, currentPosition, heading, active, floorY, hitFloorYRef, destinationPos,
}) {
  const { camera } = useThree()

  // Geometry 공유 (인스턴스마다 동일)
  const geo = useMemo(() => makeArrowGeo(), [])

  // 화살표마다 개별 Material → 독립 opacity/emissive 애니메이션
  const mats = useMemo(
    () =>
      Array.from({ length: MAX_ARROWS }, () =>
        new THREE.MeshStandardMaterial({
          color:            TMAP_BLUE,
          emissive:         TMAP_EMISSIVE,
          emissiveIntensity: 1.0,
          metalness:        0.15,
          roughness:        0.25,
          transparent:      true,
          opacity:          0.9,
        }),
      ),
    [],
  )

  const groupRef  = useRef()
  const arrowRefs = useRef([])

  // 재사용 벡터 (GC 최소화)
  const _fwd  = useRef(new THREE.Vector3())
  const _p0   = useRef(new THREE.Vector3())
  const _p1   = useRef(new THREE.Vector3())
  const _seg  = useRef(new THREE.Vector3())
  const _dir  = useRef(new THREE.Vector3())

  useFrame(({ clock }) => {
    if (!groupRef.current) return

    // GPS 위치 없거나 내비게이션 비활성이면 숨김
    if (!active || !currentPosition) {
      groupRef.current.visible = false
      return
    }
    groupRef.current.visible = true

    const t      = clock.getElapsedTime()
    // hit-test 감지 바닥 우선, 없으면 배치된 위치, 마지막은 카메라 기반 추정
    const floor  = hitFloorYRef?.current ?? floorY ?? (camera.position.y - 1.55)
    const arrowY = floor + DEPTH   // 바닥 위에 화살표가 올라앉도록

    // ── 카메라 수평 전방 벡터 ────────────────────────────────────────────────
    camera.getWorldDirection(_fwd.current)
    _fwd.current.y = 0
    if (_fwd.current.lengthSq() < 1e-6) _fwd.current.set(0, 0, -1)
    _fwd.current.normalize()
    const fx = _fwd.current.x
    const fz = _fwd.current.z

    // ── 나침반 heading 없으면 카메라 방향으로 추정 ──────────────────────────
    // WebXR에서 world 공간은 geo 정렬: +X=East, -Z=North
    // atan2(fx, -fz)는 North 기준 CW 각도(= bearing) 와 동일한 규칙
    const effectiveHeading =
      heading !== null
        ? heading
        : ((Math.atan2(fx, -fz) * 180) / Math.PI + 360) % 360

    // ── GPS → 월드 좌표 변환 ─────────────────────────────────────────────────
    const gpsToWorld = (gps) => {
      const br   = bearing(currentPosition.lat, currentPosition.lon, gps.lat, gps.lon)
      const dist = haversineM(currentPosition.lat, currentPosition.lon, gps.lat, gps.lon)
      const rad  = ((br - effectiveHeading + 360) % 360) * (Math.PI / 180)
      const cosR = Math.cos(rad), sinR = Math.sin(rad)
      const wx = cosR * fx - sinR * fz
      const wz = sinR * fx + cosR * fz
      return new THREE.Vector3(
        camera.position.x + wx * dist,
        arrowY,
        camera.position.z + wz * dist,
      )
    }

    // ── 경유점 목록 ──────────────────────────────────────────────────────────
    // steps가 있으면 실제 경로 사용, 없으면 목적지 직선 경로로 fallback
    const pts = [
      new THREE.Vector3(camera.position.x, arrowY, camera.position.z),
    ]

    if (steps?.length) {
      for (let i = 0; i < Math.min(steps.length, 5); i++) {
        const s = steps[i]
        const d = haversineM(
          currentPosition.lat, currentPosition.lon,
          s.endLocation.lat,   s.endLocation.lon,
        )
        if (d > MAX_DIST) break
        pts.push(gpsToWorld(s.endLocation))
      }
    } else if (destinationPos?.lat) {
      // Directions API 응답 전: 목적지 방향으로 직선 fallback
      const d = haversineM(
        currentPosition.lat, currentPosition.lon,
        destinationPos.lat, destinationPos.lon,
      )
      if (d <= MAX_DIST) {
        pts.push(gpsToWorld(destinationPos))
      } else {
        // 목적지가 너무 멀면 MAX_DIST m 앞까지만 표시
        const br  = bearing(currentPosition.lat, currentPosition.lon, destinationPos.lat, destinationPos.lon)
        const rad = ((br - effectiveHeading + 360) % 360) * (Math.PI / 180)
        const cosR = Math.cos(rad), sinR = Math.sin(rad)
        const wx = cosR * fx - sinR * fz
        const wz = sinR * fx + cosR * fz
        pts.push(new THREE.Vector3(
          camera.position.x + wx * MAX_DIST,
          arrowY,
          camera.position.z + wz * MAX_DIST,
        ))
      }
    } else {
      // GPS/목적지 정보 없음: 카메라 전방 MAX_DIST m 방향으로 표시
      pts.push(new THREE.Vector3(
        camera.position.x + fx * MAX_DIST,
        arrowY,
        camera.position.z + fz * MAX_DIST,
      ))
    }

    // ── 폴리라인 따라 화살표 배치 ────────────────────────────────────────────
    let idx       = 0
    let remainder = INTERVAL   // 첫 화살표 = 카메라 앞 INTERVAL m

    for (let seg = 0; seg < pts.length - 1 && idx < MAX_ARROWS; seg++) {
      _p0.current.copy(pts[seg])
      _p1.current.copy(pts[seg + 1])
      _seg.current.subVectors(_p1.current, _p0.current)
      const segLen = _seg.current.length()
      if (segLen < 0.01) continue

      _dir.current.copy(_seg.current).divideScalar(segLen)  // normalize
      const rotY = Math.atan2(_dir.current.x, _dir.current.z)

      while (remainder <= segLen && idx < MAX_ARROWS) {
        const ag  = arrowRefs.current[idx]
        const mat = mats[idx]

        if (ag && mat) {
          ag.position.set(
            _p0.current.x + _dir.current.x * remainder,
            arrowY,
            _p0.current.z + _dir.current.z * remainder,
          )
          ag.rotation.y = rotY
          ag.visible    = true

          // ─ Tmap 스타일 Wave 애니메이션 ──────────────────────────────────
          // 가까운 화살표부터 먼 화살표로 빛이 흘러가는 효과
          const phase = ((t * 2.2 - idx * 0.38) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2)
          const wave  = (Math.sin(phase) + 1) / 2   // 0 ~ 1
          mat.emissiveIntensity = 0.6 + wave * 2.2
          mat.opacity           = 0.55 + wave * 0.42
        }

        idx++
        remainder += INTERVAL
      }
      remainder -= segLen
    }

    // 미사용 화살표 숨기기
    for (let i = idx; i < MAX_ARROWS; i++) {
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
          {/*
            rotation.x = -PI/2: XY 평면 형상을 XZ 바닥 평면으로 눕힘
            (Shape의 +Y 방향 = 화살표 진행 방향 → 눕히면 group의 +Z 방향)
            group.rotation.y 가 진행 방향을 결정
          */}
          <mesh
            geometry={geo}
            material={mats[i]}
            rotation-x={-Math.PI / 2}
          />
        </group>
      ))}
    </group>
  )
}
