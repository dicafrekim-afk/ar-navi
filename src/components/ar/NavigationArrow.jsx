import React, { useRef, useState } from 'react'
import { Text, RoundedBox } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { Vector3 } from 'three'

const COLOR_NORMAL  = '#00D9FF'
const COLOR_ARRIVED = '#48bb78'

/**
 * NavigationArrow — 카메라 HUD 방향 화살표
 *
 * 나침반 디자인 없이 순수 화살표만 표시.
 * relativeAngle에 따라 Z축 회전으로 목적지 방향을 가리킴.
 */
export default function NavigationArrow({ relativeAngle, distance, heading, hasArrived }) {
  const groupRef   = useRef()
  const arrowRef   = useRef()
  const pulseRef   = useRef()
  const bobRef     = useRef(0)
  const pulseTimeRef = useRef(0)

  const arrivalProgressRef = useRef(0)
  const [arrivalT, setArrivalT] = useState(0)

  useFrame(({ camera }, delta) => {
    if (!groupRef.current) return

    // 카메라 하단 중앙에 HUD 고정
    const localOffset = new Vector3(0, -0.44, -1.35)
    localOffset.applyQuaternion(camera.quaternion)
    groupRef.current.position.copy(camera.position).add(localOffset)
    groupRef.current.quaternion.copy(camera.quaternion)

    // 화살표 방향 보간 (Z축 회전)
    if (arrowRef.current && relativeAngle !== null) {
      const targetZ = -(relativeAngle * Math.PI) / 180
      const curr    = arrowRef.current.rotation.z
      let diff      = targetZ - curr
      while (diff >  Math.PI) diff -= Math.PI * 2
      while (diff < -Math.PI) diff += Math.PI * 2
      arrowRef.current.rotation.z += diff * Math.min(1, delta * 5)
    }

    // 상하 보빙
    if (!hasArrived) {
      bobRef.current += delta * 2.4
      groupRef.current.position.y += Math.sin(bobRef.current) * 0.005
    }

    // 도착 펄스
    if (hasArrived && pulseRef.current) {
      pulseTimeRef.current += delta * 2.5
      const s = 1 + Math.sin(pulseTimeRef.current) * 0.14
      pulseRef.current.scale.set(s, s, 1)
    }

    // 도착 배너 fade-in
    if (hasArrived && arrivalProgressRef.current < 1) {
      arrivalProgressRef.current = Math.min(1, arrivalProgressRef.current + delta * 2.2)
      const raw = arrivalProgressRef.current
      setArrivalT(raw * raw * (3 - 2 * raw))
    }
  })

  const arrowColor = hasArrived ? COLOR_ARRIVED : COLOR_NORMAL
  const noCompass  = heading === null

  const distLabel =
    distance === null ? '위치 계산 중...' :
    distance < 0.1    ? `약 ${Math.round(distance * 1000)}m` :
                        `약 ${distance.toFixed(1)}km`

  return (
    <group ref={groupRef}>

      {/* ══ 도착 배너 ══════════════════════════════════════════ */}
      {hasArrived && (
        <group position={[0, 0.42, 0]}>
          <RoundedBox args={[0.72, 0.22, 0.02]} radius={0.06} smoothness={6}>
            <meshStandardMaterial
              color={COLOR_ARRIVED}
              emissive={COLOR_ARRIVED}
              emissiveIntensity={0.8 * arrivalT}
              transparent
              opacity={0.45 * arrivalT}
            />
          </RoundedBox>
          <RoundedBox args={[0.68, 0.19, 0.04]} radius={0.05} smoothness={4}>
            <meshStandardMaterial color="#001a0a" transparent opacity={0.82 * arrivalT} />
          </RoundedBox>
          <Text
            position={[0, 0.02, 0.03]}
            fontSize={0.066}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
            fillOpacity={arrivalT}
          >
            목적지에 도착했습니다!
          </Text>
        </group>
      )}

      {/* ══ 도착 펄스 링 ═══════════════════════════════════════ */}
      {hasArrived && (
        <mesh ref={pulseRef}>
          <torusGeometry args={[0.18, 0.012, 8, 40]} />
          <meshStandardMaterial
            color={COLOR_ARRIVED}
            emissive={COLOR_ARRIVED}
            emissiveIntensity={1.0}
            transparent
            opacity={0.55}
          />
        </mesh>
      )}

      {/* ══ 화살표 (나침반 없이 순수 화살표만) ════════════════ */}
      <group ref={arrowRef}>
        {/* 샤프트 */}
        <mesh position={[0, -0.04, 0.003]}>
          <boxGeometry args={[0.038, 0.14, 0.01]} />
          <meshStandardMaterial
            color={arrowColor}
            emissive={arrowColor}
            emissiveIntensity={noCompass ? 0.4 : 1.4}
          />
        </mesh>
        {/* 헤드 */}
        <mesh position={[0, 0.11, 0.003]}>
          <coneGeometry args={[0.075, 0.13, 3]} />
          <meshStandardMaterial
            color={arrowColor}
            emissive={arrowColor}
            emissiveIntensity={noCompass ? 0.4 : 1.4}
          />
        </mesh>
      </group>

      {/* ══ 도착 체크마크 ══════════════════════════════════════ */}
      {hasArrived && (
        <Text
          position={[0, 0, 0.01]}
          fontSize={0.12}
          color={COLOR_ARRIVED}
          anchorX="center"
          anchorY="middle"
        >
          ✓
        </Text>
      )}

      {/* ══ 거리 레이블 ════════════════════════════════════════ */}
      <group position={[0, -0.26, 0]}>
        <RoundedBox args={[0.44, 0.09, 0.005]} radius={0.045} smoothness={4}>
          <meshStandardMaterial
            color={arrowColor}
            emissive={arrowColor}
            emissiveIntensity={0.35}
            transparent
            opacity={0.28}
          />
        </RoundedBox>
        <RoundedBox args={[0.42, 0.088, 0.01]} radius={0.044} smoothness={4}>
          <meshStandardMaterial color="#001428" transparent opacity={0.65} />
        </RoundedBox>
        <Text
          position={[0, 0, 0.012]}
          fontSize={0.055}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          maxWidth={0.4}
          textAlign="center"
        >
          {hasArrived ? '도착!' : distLabel}
        </Text>
      </group>

      {/* ══ GPS 신호 대기 메시지 ═══════════════════════════════ */}
      {noCompass && !hasArrived && (
        <Text
          position={[0, 0.25, 0.01]}
          fontSize={0.048}
          color="#FFCC44"
          anchorX="center"
          anchorY="middle"
        >
          GPS 신호 대기 중...
        </Text>
      )}

    </group>
  )
}
