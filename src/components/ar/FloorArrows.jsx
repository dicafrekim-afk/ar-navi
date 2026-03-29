import React, { useRef, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

const ARROW_COLOR   = '#1A6FFF'
const NUM_ARROWS    = 7
const ARROW_SPACING = 1.2   // 화살표 간격 (m)
const ARROW_SCALE   = 0.42  // 화살표 크기 배율

/**
 * ExtrudeGeometry용 화살표 모양 (위쪽 = 진행방향)
 *   ▲
 *  ◀ ▶
 *   |
 *   |
 */
function createArrowShape() {
  const s = new THREE.Shape()
  s.moveTo(0,      0.36)   // 위 꼭짓점
  s.lineTo(0.24,   0)      // 오른쪽 날개 끝
  s.lineTo(0.09,   0)      // 오른쪽 홈
  s.lineTo(0.09,  -0.38)   // 오른쪽 샤프트 아래
  s.lineTo(-0.09, -0.38)   // 왼쪽 샤프트 아래
  s.lineTo(-0.09,  0)      // 왼쪽 홈
  s.lineTo(-0.24,  0)      // 왼쪽 날개 끝
  s.closePath()
  return s
}

/**
 * FloorArrows
 *
 * bearing, heading을 기반으로 XR 월드 좌표에서 카메라 앞 바닥에
 * NUM_ARROWS 개의 3D 화살표를 Wave 애니메이션과 함께 표시한다.
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

  // geometry: 한 번만 생성해 모든 화살표가 공유
  const geometry = useMemo(() => {
    const shape = createArrowShape()
    return new THREE.ExtrudeGeometry(shape, {
      depth:         0.08,
      bevelEnabled:  false,
    })
  }, [])

  useFrame((_, delta) => {
    timeRef.current += delta

    if (bearing === null || heading === null) return

    // XR 공간에서의 방향각 (카메라 -Z가 정면)
    const xrAngle = ((bearing - heading) * Math.PI) / 180
    const sinA    = Math.sin(xrAngle)
    const cosA    = Math.cos(xrAngle)

    // 바닥 Y: Hit-test 결과 우선, 없으면 카메라 아래 1.6m 추정
    const floorY = hitFloorYRef?.current ?? (camera.position.y - 1.6)

    for (let i = 0; i < NUM_ARROWS; i++) {
      const mesh = meshRefs.current[i]
      const mat  = matRefs.current[i]
      if (!mesh || !mat) continue

      const dist = (i + 1) * ARROW_SPACING
      mesh.position.set(
        camera.position.x + sinA * dist,
        floorY + 0.015,
        camera.position.z - cosA * dist,
      )
      // 바닥에 눕히고 (+90°X), 진행방향으로 회전
      mesh.rotation.set(-Math.PI / 2, 0, -xrAngle)
      mesh.scale.setScalar(ARROW_SCALE)

      // Wave 애니메이션: 가까운 곳(i=0) → 먼 곳(i=N) 순서로 흐름
      const wave             = Math.sin(timeRef.current * 2.8 - i * 0.85)
      mat.emissiveIntensity  = Math.max(0.15, 0.65 + wave * 0.35)
      mat.opacity            = Math.max(0.25, 0.62 + wave * 0.28)
    }
  })

  // bearing/heading 없으면 렌더 안 함
  if (bearing === null || heading === null) return null

  return (
    <>
      {Array.from({ length: NUM_ARROWS }).map((_, i) => (
        <mesh
          key={i}
          ref={(el) => { meshRefs.current[i] = el }}
          geometry={geometry}
          position={[0, -100, 0]}  // 초기값: 화면 밖 (첫 프레임 전 깜빡임 방지)
        >
          <meshStandardMaterial
            ref={(el) => { matRefs.current[i] = el }}
            color={ARROW_COLOR}
            emissive={ARROW_COLOR}
            emissiveIntensity={0.65}
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
