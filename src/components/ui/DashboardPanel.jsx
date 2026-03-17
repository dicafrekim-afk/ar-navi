import React, { useState, useRef } from 'react'
import { RoundedBox, Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { Vector3 } from 'three'

/**
 * DashboardPanel — Glassmorphism Base Panel with Fade-in
 *
 * Visual layers (back → front):
 *   1. Outer glow border  (accent color, low opacity)
 *   2. Frosted glass body (dark-tinted, highly transparent)
 *   3. Inner highlight    (thin bright strip at top edge)
 *   4. Top accent bar     (solid accent color)
 *   5. Title text
 *   6. Children content
 *
 * Fade-in: on mount, all layer opacities lerp from 0 → target over ~400ms.
 */
export default function DashboardPanel({
  position,
  title,
  width = 2,
  height = 1.5,
  accentColor = '#88d3ff',
  children,
}) {
  const [isHovered, setIsHovered] = useState(false)

  // Fade-in state: 0 → 1 over ~400ms after component mounts
  const fadeRef   = useRef(0)
  const [fade, setFade] = useState(0)

  useFrame((_, delta) => {
    if (fadeRef.current < 1) {
      fadeRef.current = Math.min(1, fadeRef.current + delta * 2.8)
      setFade(fadeRef.current)
    }
  })

  const panelPosition =
    position instanceof Vector3
      ? [position.x, position.y + 1, position.z]
      : [position[0], position[1] + 1, position[2]]

  // Eased opacity scale — cubic ease-out
  const f = fade * fade * (3 - 2 * fade)

  return (
    <group position={panelPosition}>
      {/* Layer 1 — Outer glow border */}
      <RoundedBox
        args={[width + 0.04, height + 0.04, 0.06]}
        radius={0.13}
        smoothness={6}
      >
        <meshStandardMaterial
          color={accentColor}
          emissive={accentColor}
          emissiveIntensity={(isHovered ? 0.55 : 0.22) * f}
          transparent
          opacity={0.38 * f}
        />
      </RoundedBox>

      {/* Layer 2 — Frosted glass body */}
      <RoundedBox
        args={[width, height, 0.1]}
        radius={0.1}
        smoothness={6}
        onPointerEnter={() => setIsHovered(true)}
        onPointerLeave={() => setIsHovered(false)}
      >
        <meshStandardMaterial
          color="#c0d8f0"
          emissive="#1a3a5c"
          emissiveIntensity={(isHovered ? 0.18 : 0.08) * f}
          metalness={0.15}
          roughness={0.05}
          transparent
          opacity={(isHovered ? 0.28 : 0.2) * f}
        />
      </RoundedBox>

      {/* Layer 3 — Inner highlight strip (top edge shimmer) */}
      <RoundedBox
        args={[width - 0.12, 0.03, 0.12]}
        radius={0.015}
        smoothness={4}
        position={[0, height / 2 - 0.04, 0.01]}
      >
        <meshStandardMaterial
          color="#ffffff"
          emissive="#ffffff"
          emissiveIntensity={0.6 * f}
          transparent
          opacity={0.45 * f}
        />
      </RoundedBox>

      {/* Layer 4 — Top accent bar */}
      <RoundedBox
        args={[width - 0.1, 0.07, 0.14]}
        radius={0.03}
        smoothness={4}
        position={[0, height / 2 - 0.13, 0.02]}
      >
        <meshStandardMaterial
          color={accentColor}
          emissive={accentColor}
          emissiveIntensity={0.9 * f}
          transparent
          opacity={0.88 * f}
        />
      </RoundedBox>

      {/* Layer 5 — Title */}
      {title && (
        <Text
          position={[0, height / 2 - 0.25, 0.1]}
          fontSize={0.18}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.006}
          outlineColor={accentColor}
          fillOpacity={f}
          outlineOpacity={f * 0.9}
        >
          {title}
        </Text>
      )}

      {/* Layer 6 — Children content */}
      <group position={[0, 0, 0.07]}>
        {/* Wrap children in a group whose opacity tracks fade.
            Individual mesh materials in children use their own opacity,
            but the fade group scales world-space visibility. */}
        <group
          // Use scale to simulate visibility during early fade
          // (children manage their own opacity; this just shifts them in)
          position={[0, (1 - f) * -0.12, 0]}
        >
          {children}
        </group>
      </group>
    </group>
  )
}
