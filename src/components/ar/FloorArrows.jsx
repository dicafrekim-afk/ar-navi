import React, { useRef, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

const COLOR_FILL     = '#1A6FFF'
const COLOR_EMISSIVE = '#1A6FFF'

const NUM_ARROWS     = 8      // 동시 표시 개수
const ARROW_SPACING  = 0.80   // 화살표 중심 간격 (m)
const ARROW_SCALE    = 0.62   // 크기 배율 → 실제 높이 ≈ 0.47m, 간격 0.80m이므로 갭 ≈ 0.33m

/**
 * 쉐브론 모양 (scale 1.0 기준)
 *
 *         (0, 0.38)          ← 앞 꼭짓점
 *        /        \
 * (−0.36, 0.0)  (0.36, 0.0) ← 날개 끝
 *        \        /
 *   (−0.12, −0.22) (0.12, −0.22)  ← 안쪽 노치
 *         |      |
 *   (−0.12, −0.38) (0.12, −0.38)  ← 뒷면
 *
 * 전체 높이: 0.38 + 0.38 = 0.76m  → ×0.62 = 0.47m
 * 전체 너비: 0.72m                 → ×0.62 = 0.45m
 */
function createChevronShape() {
  const s = new THREE.Shape()
  s.moveTo( 0,     0.38)
  s.lineTo( 0.36,  0.00)
  s.lineTo( 0.12, -0.22)
  s.lineTo( 0.12, -0.38)
  s.lineTo(-0.12, -0.38)
  s.lineTo(-0.12, -0.22)
  s.lineTo(-0.36,  0.00)
  s.closePath()
  return s
}

/**
 * FloorArrows
 *
 * 티맵 스타일: 바닥에 간격을 두고 배치된 쉐브론(V자) 화살표가
 * 가까운 곳 → 먼 곳으로 물결처럼 흘러감.
 *
 * Props:
 *   bearing      목적지 방위각 (degrees, 0=North CW) | null
 *   heading      나침반 heading (degrees, 0=North CW) | null
 *   hitFloorYRef 바닥 Y 좌표 ref
 */
export default function FloorArrows({ bearing, heading, hitFloorYRef }) {
  const { camera } = useThree()
  const timeRef    = useRef(0)
  const meshRefs   = useRef([])
  const matRefs    = useRef([])

  const geometry = useMemo(() => {
    const shape = createChevronShape()
    return new THREE.ExtrudeGeometry(shape, {
      depth:        0.05,
      bevelEnabled: false,
    })
  }, [])

  useFrame((_, delta) => {
    timeRef.current += delta

    if (bearing === null || heading === null) return

    const xrAngle = ((bearing - heading) * Math.PI) / 180
    const sinA    = Math.sin(xrAngle)
    const cosA    = Math.cos(xrAngle)
    const floorY  = hitFloorYRef?.current ?? (camera.position.y - 1.6)

    for (let i = 0; i < NUM_ARROWS; i++) {
      const mesh = meshRefs.current[i]
      const mat  = matRefs.current[i]
      if (!mesh || !mat) continue

      const dist = (i + 1) * ARROW_SPACING
      mesh.position.set(
        camera.position.x + sinA * dist,
        floorY + 0.01,
        camera.position.z - cosA * dist,
      )
      mesh.rotation.set(-Math.PI / 2, 0, -xrAngle)
      mesh.scale.setScalar(ARROW_SCALE)

      // Wave: 가까운 것(i=0)이 먼저 밝아지며 먼 곳으로 흐름
      const phase = timeRef.current * 2.8 - i * 0.72
      const wave  = (Math.sin(phase) + 1) / 2   // 0 ~ 1
      mat.emissiveIntensity = 0.5  + wave * 1.0  // 0.5 ~ 1.5
      mat.opacity           = 0.40 + wave * 0.50 // 0.40 ~ 0.90
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
            metalness={0.05}
            roughness={0.4}
            transparent
            opacity={0.75}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      ))}
    </>
  )
}
