import React, { useRef, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

const COLOR_FILL     = '#1A6FFF'
const COLOR_EMISSIVE = '#1A6FFF'

const NUM_ARROWS    = 8
const ARROW_SPACING = 0.90   // 화살표 간격 (m)
const ARROW_SCALE   = 0.85   // 크기 배율 → 실제 폭 ≈ 0.60m

/**
 * 쉐브론(V자) 모양 — scale 1.0 기준
 * 위쪽(+Y)이 진행방향, 가운데 노치로 뚫려있어 한눈에 방향 인식 가능
 */
function createChevronShape() {
  const s = new THREE.Shape()
  s.moveTo( 0,     0.38)   // 앞 꼭짓점
  s.lineTo( 0.40,  0.00)   // 오른쪽 날개
  s.lineTo( 0.13, -0.20)   // 오른쪽 노치 안
  s.lineTo( 0.13, -0.38)   // 오른쪽 뒷면
  s.lineTo(-0.13, -0.38)   // 왼쪽 뒷면
  s.lineTo(-0.13, -0.20)   // 왼쪽 노치 안
  s.lineTo(-0.40,  0.00)   // 왼쪽 날개
  s.closePath()
  return s
}

/**
 * FloorArrows
 *
 * ✅ 핵심 수정:
 *  1. camera.getWorldDirection()으로 XR 카메라의 실제 방향 읽기
 *     → 물리 나침반이 XR 좌표계와 어긋나는 문제 해결
 *  2. 방향 벡터 lerp 스무딩 → compass jitter로 인한 지그재그 방지
 *  3. ShapeGeometry(flat) 사용 → Extrude 옆면이 링처럼 보이는 문제 해결
 *
 * Props:
 *   bearing      목적지 방위각 (degrees, 0=North CW) | null
 *   heading      나침반 heading (degrees, 0=North CW) | null
 *   hitFloorYRef 바닥 Y 좌표 ref
 */
export default function FloorArrows({ bearing, heading, hitFloorYRef }) {
  const { camera } = useThree()
  const timeRef     = useRef(0)
  const meshRefs    = useRef([])
  const matRefs     = useRef([])

  // 스무딩된 목적지 방향 벡터 (jitter 방지)
  const smoothDirRef = useRef(null)

  // 완전히 평면인 ShapeGeometry → 옆면 없음, 링 artifact 없음
  const geometry = useMemo(() => {
    const shape = createChevronShape()
    return new THREE.ShapeGeometry(shape, 6)
  }, [])

  useFrame((_, delta) => {
    timeRef.current += delta

    if (bearing === null || heading === null) return

    // ── 1. XR 카메라의 실제 전방 벡터 ──────────────────────────────────────
    // camera.getWorldDirection()은 XR 세션 좌표계에서의 실제 방향.
    // 물리 나침반 heading과 결합해 목적지 방향을 XR 공간에 올바르게 매핑.
    const camFwd = new THREE.Vector3()
    camera.getWorldDirection(camFwd)
    camFwd.y = 0
    if (camFwd.lengthSq() < 1e-6) return
    camFwd.normalize()

    // ── 2. 카메라 전방 기준 목적지 방향 계산 ────────────────────────────────
    // relAngle: bearing - heading = 카메라 전방에서 목적지까지 시계방향 각도
    // Three.js applyAxisAngle(+Y, θ)은 반시계방향이지만
    // 나침반 시계방향과 일치 → +relAngle 사용
    const relAngle = ((bearing - heading) * Math.PI) / 180
    const rawDir = camFwd.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), relAngle)
    rawDir.y = 0
    rawDir.normalize()

    // ── 3. 방향 벡터 스무딩 (compass jitter → 지그재그 방지) ─────────────────
    if (!smoothDirRef.current) {
      smoothDirRef.current = rawDir.clone()
    } else {
      smoothDirRef.current.lerp(rawDir, Math.min(1, delta * 5))
      smoothDirRef.current.y = 0
      smoothDirRef.current.normalize()
    }

    const destDir = smoothDirRef.current

    // ── 4. 화살표 회전각 계산 ─────────────────────────────────────────────────
    // rotation.set(-PI/2, 0, -arrowAngle) 시 화살표가 destDir 방향을 가리킴
    // (sin(arrowAngle) = destDir.x, -cos(arrowAngle) = destDir.z)
    const arrowAngle = Math.atan2(destDir.x, -destDir.z)

    const floorY = hitFloorYRef?.current ?? (camera.position.y - 1.6)

    for (let i = 0; i < NUM_ARROWS; i++) {
      const mesh = meshRefs.current[i]
      const mat  = matRefs.current[i]
      if (!mesh || !mat) continue

      const dist = (i + 1) * ARROW_SPACING

      // 카메라 위치 기준 destDir 방향으로 배치
      mesh.position.set(
        camera.position.x + destDir.x * dist,
        floorY + 0.008,
        camera.position.z + destDir.z * dist,
      )
      mesh.rotation.set(-Math.PI / 2, 0, -arrowAngle)
      mesh.scale.setScalar(ARROW_SCALE)

      // Wave 애니메이션: 가까운 것(i=0)부터 먼 것(i=N) 순서로 밝아짐
      const phase = timeRef.current * 2.6 - i * 0.68
      const wave  = (Math.sin(phase) + 1) / 2   // 0 ~ 1
      mat.emissiveIntensity = 0.5  + wave * 1.1  // 0.5 ~ 1.6
      mat.opacity           = 0.45 + wave * 0.45 // 0.45 ~ 0.90
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
