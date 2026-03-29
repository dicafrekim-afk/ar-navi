import React, { useRef, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

// ── 티맵 스타일 팔레트 ─────────────────────────────────────────────────────────
const COLOR_FILL    = '#1A6FFF'
const COLOR_EMISSIVE = '#1A6FFF'

const NUM_ARROWS    = 9      // 동시에 표시할 화살표 수
const ARROW_SPACING = 0.72   // 화살표 간격 (m) — 촘촘하게
const ARROW_SCALE   = 1.0    // 크기 배율

/**
 * 티맵 스타일 쉐브론(V자) 형태 — 위쪽이 진행방향
 *
 * 넓고 납작한 V 형태로 바닥에 깔려있는 느낌을 줌
 *
 *          ★ (0, 0.52)  ← 앞 꼭짓점
 *         / \
 *        /   \
 * (−0.5, 0.0) (0.5, 0.0)  ← 좌우 날개 끝
 *       \     /
 *        \   /
 *    (−0.18, −0.25) (0.18, −0.25)  ← 안쪽 노치
 *         | |
 *    (−0.18, −0.42) (0.18, −0.42)  ← 뒷면
 */
function createChevronShape() {
  const s = new THREE.Shape()
  s.moveTo(0,      0.52)   // 앞 꼭짓점 (진행방향)
  s.lineTo(0.50,   0.00)   // 오른쪽 날개 끝
  s.lineTo(0.18,  -0.25)   // 오른쪽 안쪽 노치
  s.lineTo(0.18,  -0.42)   // 오른쪽 뒷면
  s.lineTo(-0.18, -0.42)   // 왼쪽 뒷면
  s.lineTo(-0.18, -0.25)   // 왼쪽 안쪽 노치
  s.lineTo(-0.50,  0.00)   // 왼쪽 날개 끝
  s.closePath()
  return s
}

/**
 * FloorArrows
 *
 * 티맵 스타일 — 바닥에 깔린 넓은 쉐브론(V자) 화살표가
 * 가까운 곳 → 먼 곳 순서로 물결처럼 흐르는 애니메이션.
 *
 * Props:
 *   bearing      목적지 방위각 (degrees, 0=North CW) | null
 *   heading      나침반 heading (degrees, 0=North CW) | null
 *   hitFloorYRef 바닥 Y 좌표 ref — HitTestReticle이 갱신
 */
export default function FloorArrows({ bearing, heading, hitFloorYRef }) {
  const { camera } = useThree()
  const timeRef    = useRef(0)
  const meshRefs   = useRef([])
  const matRefs    = useRef([])

  // 쉐브론 geometry — 두께 0.06m, 한 번만 생성해 공유
  const geometry = useMemo(() => {
    const shape = createChevronShape()
    return new THREE.ExtrudeGeometry(shape, {
      depth:        0.06,
      bevelEnabled: true,
      bevelThickness: 0.012,
      bevelSize:    0.012,
      bevelSegments: 2,
    })
  }, [])

  useFrame((_, delta) => {
    timeRef.current += delta

    if (bearing === null || heading === null) return

    // XR 공간에서의 방향각
    const xrAngle = ((bearing - heading) * Math.PI) / 180
    const sinA    = Math.sin(xrAngle)
    const cosA    = Math.cos(xrAngle)

    // 바닥 Y: Hit-test 결과 우선, 없으면 카메라 아래 1.6m
    const floorY  = hitFloorYRef?.current ?? (camera.position.y - 1.6)

    for (let i = 0; i < NUM_ARROWS; i++) {
      const mesh = meshRefs.current[i]
      const mat  = matRefs.current[i]
      if (!mesh || !mat) continue

      const dist = (i + 1.2) * ARROW_SPACING
      mesh.position.set(
        camera.position.x + sinA * dist,
        floorY + 0.018,
        camera.position.z - cosA * dist,
      )
      mesh.rotation.set(-Math.PI / 2, 0, -xrAngle)
      mesh.scale.setScalar(ARROW_SCALE)

      // Wave 애니메이션: 가까운 곳(i=0)에서 먼 곳(i=N)으로 흐름
      // 각 화살표는 위상이 달라 연속적으로 이어지는 느낌
      const phase            = timeRef.current * 3.0 - i * 0.75
      const wave             = (Math.sin(phase) + 1) / 2  // 0 ~ 1 범위
      mat.emissiveIntensity  = 0.4 + wave * 1.1            // 0.4 ~ 1.5
      mat.opacity            = 0.35 + wave * 0.55          // 0.35 ~ 0.90
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
            metalness={0.1}
            roughness={0.3}
            transparent
            opacity={0.8}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      ))}
    </>
  )
}
