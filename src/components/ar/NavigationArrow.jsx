import React, { useRef, useState } from 'react'
import { Text, RoundedBox } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { Vector3 } from 'three'

/**
 * NavigationArrow — 소형 HUD 방향 표시기
 *
 * 나침반 완전 제거. 바닥 FloorArrows 가 주 내비게이션 시각화이고,
 * 이 컴포넌트는 화면 상단에 작게 떠서 방향만 보조로 알려줌.
 */
export default function NavigationArrow({
  relativeAngle,
  distance,
  heading,
  hasArrived,
  destinationName,
}) {
  const groupRef      = useRef()
  const arrowRef      = useRef()
  const pulseRef      = useRef()
  const bobRef        = useRef(0)
  const pulseTimeRef  = useRef(0)
  const arrProgRef    = useRef(0)
  const [arrT, setArrT] = useState(0)

  const BLUE    = '#1A6FFF'
  const GREEN   = '#48bb78'
  const color   = hasArrived ? GREEN : BLUE

  useFrame(({ camera }, delta) => {
    if (!groupRef.current) return

    // 카메라 상단 중앙에 소형 HUD 고정
    const offset = new Vector3(0, 0.26, -1.1)
    offset.applyQuaternion(camera.quaternion)
    groupRef.current.position.copy(camera.position).add(offset)
    groupRef.current.quaternion.copy(camera.quaternion)

    // 방향 보간
    if (arrowRef.current && relativeAngle !== null) {
      const target = -(relativeAngle * Math.PI) / 180
      const curr   = arrowRef.current.rotation.z
      let diff     = target - curr
      while (diff >  Math.PI) diff -= Math.PI * 2
      while (diff < -Math.PI) diff += Math.PI * 2
      arrowRef.current.rotation.z += diff * Math.min(1, delta * 6)
    }

    // 이동 중 보빙
    if (!hasArrived) {
      bobRef.current += delta * 2.0
      groupRef.current.position.y += Math.sin(bobRef.current) * 0.003
    }

    // 도착 펄스
    if (hasArrived && pulseRef.current) {
      pulseTimeRef.current += delta * 2.4
      const s = 1 + Math.sin(pulseTimeRef.current) * 0.18
      pulseRef.current.scale.set(s, s, 1)
    }

    // 도착 배너 fade-in
    if (hasArrived && arrProgRef.current < 1) {
      arrProgRef.current = Math.min(1, arrProgRef.current + delta * 2.0)
      const r = arrProgRef.current
      setArrT(r * r * (3 - 2 * r))
    }
  })

  const distLabel =
    distance === null ? null :
    distance < 0.1    ? `${Math.round(distance * 1000)}m` :
                        `${distance.toFixed(1)}km`

  const destShort = destinationName
    ? (destinationName.length > 10 ? destinationName.slice(0, 10) + '…' : destinationName)
    : ''

  return (
    <group ref={groupRef}>

      {/* ── 도착 배너 ────────────────────────────────────── */}
      {hasArrived && (
        <group position={[0, 0.19, 0]}>
          <RoundedBox args={[0.7, 0.19, 0.02]} radius={0.055} smoothness={4}>
            <meshStandardMaterial
              color={GREEN} emissive={GREEN}
              emissiveIntensity={0.9 * arrT}
              transparent opacity={0.5 * arrT}
            />
          </RoundedBox>
          <RoundedBox args={[0.67, 0.17, 0.03]} radius={0.05} smoothness={4}>
            <meshStandardMaterial color="#001a0a" transparent opacity={0.88 * arrT} />
          </RoundedBox>
          <Text position={[0, 0.015, 0.025]} fontSize={0.062}
            color="#fff" anchorX="center" anchorY="middle" fillOpacity={arrT}>
            목적지에 도착했습니다!
          </Text>
          {destShort && (
            <Text position={[0, -0.055, 0.025]} fontSize={0.046}
              color={GREEN} anchorX="center" anchorY="middle" fillOpacity={arrT}>
              {destShort}
            </Text>
          )}
        </group>
      )}

      {/* ── 도착 펄스 링 ─────────────────────────────────── */}
      {hasArrived && (
        <mesh ref={pulseRef}>
          <torusGeometry args={[0.16, 0.01, 6, 36]} />
          <meshStandardMaterial
            color={GREEN} emissive={GREEN}
            emissiveIntensity={1.2} transparent opacity={0.6}
          />
        </mesh>
      )}

      {/* ── 배경 패널 (반투명, 소형) ─────────────────────── */}
      <mesh>
        <circleGeometry args={[0.155, 40]} />
        <meshStandardMaterial
          color="#000c20" transparent opacity={0.72}
        />
      </mesh>
      <mesh>
        <torusGeometry args={[0.155, 0.006, 6, 40]} />
        <meshStandardMaterial
          color={color} emissive={color}
          emissiveIntensity={0.9} transparent opacity={0.75}
        />
      </mesh>

      {/* ── 방향 화살표 ──────────────────────────────────── */}
      <group ref={arrowRef}>
        {!hasArrived && (
          <>
            {/* 샤프트 */}
            <mesh position={[0, -0.028, 0.003]}>
              <boxGeometry args={[0.044, 0.076, 0.012]} />
              <meshStandardMaterial
                color={color} emissive={color}
                emissiveIntensity={heading === null ? 0.4 : 1.6}
              />
            </mesh>
            {/* 헤드 */}
            <mesh position={[0, 0.066, 0.003]}>
              <coneGeometry args={[0.085, 0.10, 4]} />
              <meshStandardMaterial
                color={color} emissive={color}
                emissiveIntensity={heading === null ? 0.4 : 1.6}
              />
            </mesh>
          </>
        )}
        {hasArrived && (
          <Text position={[0, 0, 0.008]} fontSize={0.10}
            color={GREEN} anchorX="center" anchorY="middle">
            ✓
          </Text>
        )}
      </group>

      {/* ── 거리 레이블 ──────────────────────────────────── */}
      {distLabel && (
        <group position={[0, -0.22, 0]}>
          <RoundedBox args={[0.36, 0.075, 0.006]} radius={0.036} smoothness={4}>
            <meshStandardMaterial
              color={color} emissive={color}
              emissiveIntensity={0.3} transparent opacity={0.2}
            />
          </RoundedBox>
          <RoundedBox args={[0.34, 0.07, 0.01]} radius={0.034} smoothness={4}>
            <meshStandardMaterial color="#000c1e" transparent opacity={0.82} />
          </RoundedBox>
          <Text position={[0, 0, 0.01]} fontSize={0.046}
            color="#fff" anchorX="center" anchorY="middle">
            {hasArrived ? '도착!' : distLabel}
          </Text>
        </group>
      )}

      {/* ── GPS 대기 ─────────────────────────────────────── */}
      {heading === null && !hasArrived && (
        <Text position={[0, -0.22, 0.01]} fontSize={0.038}
          color="#FFCC44" anchorX="center" anchorY="middle">
          GPS 신호 대기 중...
        </Text>
      )}

    </group>
  )
}
