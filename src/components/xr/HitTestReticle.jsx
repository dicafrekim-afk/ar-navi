import React, { useRef, useState } from 'react'
import { useXRHitTest } from '@react-three/xr'
import { Matrix4, Quaternion, Vector3 } from 'three'

/**
 * HitTestReticle
 *
 * Hit-test로 인식된 바닥 면에 링 레티클을 표시한다.
 * 탭 시 onPlace 콜백으로 Matrix4 전달.
 * hitFloorYRef가 전달되면 매 프레임 바닥 Y 좌표를 기록한다.
 *
 * Props:
 *   onPlace       (Matrix4) => void  — 탭 시 배치 위치 콜백
 *   hitFloorYRef  React ref — FloorArrows가 바닥 Y 좌표를 읽기 위해 사용
 */
export default function HitTestReticle({ onPlace, hitFloorYRef }) {
  const reticleRef = useRef()
  const [hitMatrix, setHitMatrix] = useState(null)

  useXRHitTest(
    (results, getWorldMatrix) => {
      if (results.length > 0) {
        const matrix = new Matrix4()
        getWorldMatrix(matrix, results[0])
        const elements = matrix.elements
        setHitMatrix(elements)

        // 바닥 Y 좌표를 ref에 지속 기록 (FloorArrows에서 사용)
        if (hitFloorYRef) {
          const pos = new Vector3()
          new Matrix4().fromArray(elements).decompose(pos, new Quaternion(), new Vector3())
          hitFloorYRef.current = pos.y
        }
      } else {
        setHitMatrix(null)
      }
    },
    'viewer',
    'plane',
  )

  // 레티클 위치/가시성 갱신
  React.useEffect(() => {
    if (!reticleRef.current) return
    if (hitMatrix) {
      const pos  = new Vector3()
      const quat = new Quaternion()
      const scl  = new Vector3()
      new Matrix4().fromArray(hitMatrix).decompose(pos, quat, scl)
      reticleRef.current.position.copy(pos)
      reticleRef.current.quaternion.copy(quat)
      reticleRef.current.visible = true
    } else {
      reticleRef.current.visible = false
    }
  }, [hitMatrix])

  const handleClick = () => {
    if (hitMatrix && onPlace) {
      onPlace(new Matrix4().fromArray(hitMatrix))
    }
  }

  return (
    <group ref={reticleRef} onClick={handleClick}>
      {/* 바닥 인식 링 — 네온 블루 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.28, 0.04, 16, 40]} />
        <meshStandardMaterial
          color="#1A6FFF"
          emissive="#1A6FFF"
          emissiveIntensity={0.7}
          transparent
          opacity={0.85}
        />
      </mesh>
      {/* 중심 점 */}
      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.06, 20]} />
        <meshStandardMaterial
          color="#1A6FFF"
          emissive="#1A6FFF"
          emissiveIntensity={1.0}
          transparent
          opacity={0.75}
        />
      </mesh>
    </group>
  )
}
