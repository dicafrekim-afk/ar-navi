import React, { useRef, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

const COLOR_FILL     = '#1A6FFF'
const COLOR_EMISSIVE = '#1A6FFF'
const Y_AXIS         = new THREE.Vector3(0, 1, 0)

const NUM_ARROWS    = 8
const ARROW_SPACING = 0.90   // 화살표 간격 (m)
const ARROW_SCALE   = 0.85   // 실제 높이 ≈ 0.65m, 갭 ≈ 0.25m

/**
 * 쉐브론(V자) 모양 — scale 1.0 기준, 위쪽(+Y)이 진행방향
 */
function createChevronShape() {
  const s = new THREE.Shape()
  s.moveTo( 0,     0.38)
  s.lineTo( 0.40,  0.00)
  s.lineTo( 0.13, -0.20)
  s.lineTo( 0.13, -0.38)
  s.lineTo(-0.13, -0.38)
  s.lineTo(-0.13, -0.20)
  s.lineTo(-0.40,  0.00)
  s.closePath()
  return s
}

/**
 * FloorArrows
 *
 * 핵심 수정:
 *  ✅ applyAxisAngle(Y, -relAngle) — 부호 수정
 *     Three.js는 CCW 기준, 나침반은 CW 기준이므로 부호 반전 필수.
 *     +relAngle이면 목적지 반대 방향(180°)을 가리켜 항상 정면처럼 보였음.
 *  ✅ camera.getWorldDirection() 기반 → 사용자가 돌아도 목적지 방향 유지
 *  ✅ 방향 벡터 lerp 스무딩 → compass jitter 억제
 *
 * Props:
 *   bearing      목적지 방위각 (degrees, 0=North CW) | null
 *   heading      나침반 heading (degrees, 0=North CW) | null
 *   hitFloorYRef 바닥 Y 좌표 ref
 */
export default function FloorArrows({ bearing, heading, hitFloorYRef }) {
  const { camera }   = useThree()
  const timeRef      = useRef(0)
  const meshRefs     = useRef([])
  const matRefs      = useRef([])
  const smoothDirRef = useRef(null)

  const geometry = useMemo(() => {
    return new THREE.ShapeGeometry(createChevronShape(), 6)
  }, [])

  useFrame((_, delta) => {
    timeRef.current += delta

    if (bearing === null || heading === null) return

    // ── XR 카메라의 현재 전방 벡터 ─────────────────────────────────────────
    const camFwd = new THREE.Vector3()
    camera.getWorldDirection(camFwd)
    camFwd.y = 0
    if (camFwd.lengthSq() < 1e-6) return
    camFwd.normalize()

    // ── 목적지 방향 계산 ────────────────────────────────────────────────────
    // relAngle: 카메라 전방 기준 목적지까지의 각도 (CW 시계방향, radians)
    // ✅ Three.js applyAxisAngle은 CCW 기준이므로 반드시 -relAngle 사용
    //    +relAngle로 하면 목적지 반대 방향을 가리켜 항상 정면처럼 보임
    const relAngle = ((bearing - heading) * Math.PI) / 180
    const rawDir = camFwd.clone().applyAxisAngle(Y_AXIS, -relAngle)
    rawDir.y = 0
    rawDir.normalize()

    // ── 방향 벡터 스무딩 (compass jitter → 지그재그 방지) ──────────────────
    if (!smoothDirRef.current) {
      smoothDirRef.current = rawDir.clone()
    } else {
      smoothDirRef.current.lerp(rawDir, Math.min(1, delta * 7))
      smoothDirRef.current.y = 0
      smoothDirRef.current.normalize()
    }

    const destDir    = smoothDirRef.current
    const arrowAngle = Math.atan2(destDir.x, -destDir.z)
    const floorY     = hitFloorYRef?.current ?? (camera.position.y - 1.6)

    for (let i = 0; i < NUM_ARROWS; i++) {
      const mesh = meshRefs.current[i]
      const mat  = matRefs.current[i]
      if (!mesh || !mat) continue

      const dist = (i + 1) * ARROW_SPACING
      mesh.position.set(
        camera.position.x + destDir.x * dist,
        floorY + 0.008,
        camera.position.z + destDir.z * dist,
      )
      // rotation.set(-PI/2, 0, -arrowAngle) → 화살표 tip이 destDir 방향을 가리킴
      mesh.rotation.set(-Math.PI / 2, 0, -arrowAngle)
      mesh.scale.setScalar(ARROW_SCALE)

      // Wave: 가까운 것(i=0) → 먼 것(i=N) 순서로 흘러가는 느낌
      const wave            = (Math.sin(timeRef.current * 2.6 - i * 0.68) + 1) / 2
      mat.emissiveIntensity = 0.5  + wave * 1.1
      mat.opacity           = 0.45 + wave * 0.45
    }
  })

  if (bearing === null || heading === null) return null

  return (
    <>
      {Array.from({ length: NUM_ARROWS }).map((_, i) => (
        <mesh
          key={i}
          ref={(el) => { meshRefs.current[i] = el }}
          geometry={geometry}
          position={[0, -200, 0]}
        >
          <meshStandardMaterial
            ref={(el) => { matRefs.current[i] = el }}
            color={COLOR_FILL}
            emissive={COLOR_EMISSIVE}
            emissiveIntensity={0.8}
            transparent
            opacity={0.80}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      ))}
    </>
  )
}
