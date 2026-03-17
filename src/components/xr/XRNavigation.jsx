import React, { useState } from 'react'
import { Text } from '@react-three/drei'
import { useXR } from '@react-three/xr'

/**
 * XRNavigation Component
 * Renders interactive navigation zone markers.
 * Uses useXR to detect XR session state and enhance interaction feedback.
 * Clicking a marker triggers onZoneChange; clicking again deselects.
 */
export default function XRNavigation({ position, onZoneChange, activeZone }) {
  const [hoveredZone, setHoveredZone] = useState(null)
  const { isPresenting } = useXR()

  const zones = [
    {
      id: 'workspace',
      label: 'Workspace',
      color: '#FF6B6B',
      accentColor: '#ffaaaa',
      offset: [0, 0, -2],
    },
    {
      id: 'meeting',
      label: 'Meeting',
      color: '#4ECDC4',
      accentColor: '#88e8e2',
      offset: [1.5, 0, -2],
    },
    {
      id: 'info',
      label: 'Info',
      color: '#95E1D3',
      accentColor: '#c2f0e8',
      offset: [-1.5, 0, -2],
    },
  ]

  // Toggle: clicking the active zone deselects it
  const handleSelect = (zoneId) => {
    onZoneChange(zoneId === activeZone ? null : zoneId)
  }

  // In XR, make the hit area larger for easier touch selection
  const hitRadius = isPresenting ? 0.45 : 0.3

  return (
    <group position={[position.x, position.y, position.z]}>
      {zones.map((zone) => {
        const isActive = activeZone === zone.id
        const isHovered = hoveredZone === zone.id

        return (
          <group key={zone.id} position={zone.offset}>
            {/* Active selection ring — visible when zone is selected */}
            {isActive && (
              <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.38, 0.56, 40]} />
                <meshStandardMaterial
                  color={zone.color}
                  emissive={zone.color}
                  emissiveIntensity={1.4}
                  transparent
                  opacity={0.75}
                />
              </mesh>
            )}

            {/* Interactive base disc — main touch/click target */}
            <mesh
              position={[0, 0.05, 0]}
              onClick={() => handleSelect(zone.id)}
              onPointerEnter={() => setHoveredZone(zone.id)}
              onPointerLeave={() => setHoveredZone(null)}
            >
              <cylinderGeometry args={[hitRadius, hitRadius + 0.05, 0.12, 32]} />
              <meshStandardMaterial
                color={isActive ? '#ffffff' : isHovered ? zone.accentColor : zone.color}
                emissive={zone.color}
                emissiveIntensity={isActive ? 1.2 : isHovered ? 0.8 : 0.4}
                metalness={0.4}
                roughness={0.2}
              />
            </mesh>

            {/* Vertical pillar */}
            <mesh position={[0, 0.65, 0]}>
              <cylinderGeometry args={[0.05, 0.1, 1.1, 16]} />
              <meshStandardMaterial
                color={zone.color}
                emissive={zone.color}
                emissiveIntensity={isActive ? 0.9 : 0.3}
                transparent
                opacity={isActive ? 0.95 : 0.6}
              />
            </mesh>

            {/* Top sphere */}
            <mesh position={[0, 1.3, 0]}>
              <sphereGeometry args={[0.13, 20, 20]} />
              <meshStandardMaterial
                color={isActive ? '#ffffff' : zone.color}
                emissive={zone.color}
                emissiveIntensity={isActive ? 1.2 : 0.6}
              />
            </mesh>

            {/* Zone label */}
            <Text
              position={[0, 1.62, 0]}
              fontSize={isActive ? 0.24 : 0.19}
              color={isActive ? '#ffffff' : zone.color}
              anchorX="center"
              anchorY="middle"
              outlineWidth={isActive ? 0.008 : 0}
              outlineColor={zone.color}
            >
              {zone.label}
            </Text>

            {/* "ACTIVE" tag shown in XR session when zone is selected */}
            {isActive && isPresenting && (
              <Text
                position={[0, 1.9, 0]}
                fontSize={0.14}
                color="#ffffff"
                anchorX="center"
                anchorY="middle"
              >
                ● ACTIVE
              </Text>
            )}
          </group>
        )
      })}
    </group>
  )
}
