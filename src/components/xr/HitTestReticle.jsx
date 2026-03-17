import React, { useRef, useState } from 'react'
import { useXRHitTest } from '@react-three/xr'
import { Matrix4, Quaternion, Vector3 } from 'three'

/**
 * HitTestReticle Component
 * Displays a ring that follows the hit-test surface in AR mode
 * Allows users to tap to place the dashboard at that location
 */
export default function HitTestReticle({ onPlace }) {
  const reticleRef = useRef()
  const [hitMatrix, setHitMatrix] = useState(null)

  // Setup hit-test for floor/surface detection using 'viewer' space
  useXRHitTest(
    (results, getWorldMatrix) => {
      if (results.length > 0) {
        // Get the first hit result's world matrix
        const matrix = new Matrix4()
        getWorldMatrix(matrix, results[0])
        setHitMatrix(matrix.elements)
      } else {
        setHitMatrix(null)
      }
    },
    'viewer',
    'plane'
  )

  // Update reticle position and visibility based on hit test result
  React.useEffect(() => {
    if (reticleRef.current && hitMatrix) {
      const position = new Vector3()
      const quaternion = new Quaternion()
      const scale = new Vector3()

      const matrix = new Matrix4().fromArray(hitMatrix)
      matrix.decompose(position, quaternion, scale)

      reticleRef.current.position.copy(position)
      reticleRef.current.quaternion.copy(quaternion)
      reticleRef.current.visible = true
    } else if (reticleRef.current) {
      reticleRef.current.visible = false
    }
  }, [hitMatrix])

  // Handle tap/click to place dashboard
  const handleReticleClick = () => {
    if (hitMatrix && onPlace) {
      onPlace(new Matrix4().fromArray(hitMatrix))
    }
  }

  return (
    <group ref={reticleRef} onClick={handleReticleClick}>
      {/* Reticle ring mesh */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.3, 0.05, 16, 8]} />
        <meshStandardMaterial
          color="#00ff88"
          emissive="#00ff88"
          emissiveIntensity={0.5}
          transparent
          opacity={0.8}
        />
      </mesh>

      {/* Center dot */}
      <mesh position={[0, 0.01, 0]}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial
          color="#00ffaa"
          emissive="#00ffaa"
          emissiveIntensity={0.7}
        />
      </mesh>
    </group>
  )
}
