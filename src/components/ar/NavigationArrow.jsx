import React, { useRef, useState } from 'react'
import { Text, RoundedBox } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { Vector3 } from 'three'

const COLOR_ARROW   = '#00BFFF'   // 내비게이션 블루
const COLOR_ARRIVED = '#48bb78'   // 도착 그린
const COLOR_GLOW    = '#0080FF'

/**
 * NavigationArrow — 실제 내비게이션 앱 스타일 방향 화살표 HUD
 *
 * 굵고 뚜렷한 화살표 + 반투명 배경 패널 + 거리 레이블
 */
export default function NavigationArrow({
  relativeAngle,
  distance,
  heading,
  hasArrived,
  destinationName,
}) {
  const groupRef     = useRef()
  const arrowRef     = useRef()
  const pulseRef     = useRef()
  const bobRef       = useRef(0)
  const pulseTimeRef = useRef(0)
  const arrivalProgRef = useRef(0)
  const [arrivalT, setArrivalT] = useState(0)

  useFrame(({ camera }, delta) => {
    if (!groupRef.current) return

    // 카메라 하단 중앙에 HUD 고정
    const offset = new Vector3(0, -0.38, -1.2)
    offset.applyQuaternion(camera.quaternion)
    groupRef.current.position.copy(camera.position).add(offset)
    groupRef.current.quaternion.copy(camera.quaternion)

    // 화살표 방향 보간 (Z축 회전, 최단경로)
    if (arrowRef.current && relativeAngle !== null) {
      const target = -(relativeAngle * Math.PI) / 180
      const curr   = arrowRef.current.rotation.z
      let diff     = target - curr
      while (diff >  Math.PI) diff -= Math.PI * 2
      while (diff < -Math.PI) diff += Math.PI * 2
      arrowRef.current.rotation.z += diff * Math.min(1, delta * 6)
    }

    // 상하 보빙 (이동 중)
    if (!hasArrived) {
      bobRef.current += delta * 2.2
      groupRef.current.position.y += Math.sin(bobRef.current) * 0.004
    }

    // 도착 펄스 링
    if (hasArrived && pulseRef.current) {
      pulseTimeRef.current += delta * 2.5
      const s = 1 + Math.sin(pulseTimeRef.current) * 0.15
      pulseRef.current.scale.set(s, s, 1)
    }

    // 도착 배너 fade-in
    if (hasArrived && arrivalProgRef.current < 1) {
      arrivalProgRef.current = Math.min(1, arrivalProgRef.current + delta * 2.0)
      const r = arrivalProgRef.current
      setArrivalT(r * r * (3 - 2 * r))
    }
  })

  const arrowColor = hasArrived ? COLOR_ARRIVED : COLOR_ARROW
  const noGps      = heading === null

  const distLabel =
    distance === null ? '위치 확인 중...' :
    distance < 0.1    ? `약 ${Math.round(distance * 1000)}m` :
                        `약 ${distance.toFixed(1)}km`

  const destShort = destinationName
    ? (destinationName.length > 12 ? destinationName.slice(0, 12) + '…' : destinationName)
    : ''

  return (
    <group ref={groupRef}>

      {/* ══ 도착 배너 ══════════════════════════════════════════ */}
      {hasArrived && (
        <group position={[0, 0.56, 0]}>
          <RoundedBox args={[0.82, 0.24, 0.02]} radius={0.07} smoothness={6}>
            <meshStandardMaterial
              color={COLOR_ARRIVED} emissive={COLOR_ARRIVED}
              emissiveIntensity={0.9 * arrivalT}
              transparent opacity={0.5 * arrivalT}
            />
          </RoundedBox>
          <RoundedBox args={[0.78, 0.21, 0.04]} radius={0.065} smoothness={4}>
            <meshStandardMaterial color="#001a0a" transparent opacity={0.88 * arrivalT} />
          </RoundedBox>
          <Text position={[0, 0.025, 0.03]} fontSize={0.072}
            color="#ffffff" anchorX="center" anchorY="middle" fillOpacity={arrivalT}>
            목적지에 도착했습니다!
          </Text>
          {destShort && (
            <Text position={[0, -0.065, 0.03]} fontSize={0.054}
              color={COLOR_ARRIVED} anchorX="center" anchorY="middle" fillOpacity={arrivalT}>
              {destShort}
            </Text>
          )}
        </group>
      )}

      {/* ══ 도착 펄스 링 ═══════════════════════════════════════ */}
      {hasArrived && (
        <mesh ref={pulseRef}>
          <torusGeometry args={[0.26, 0.014, 8, 40]} />
          <meshStandardMaterial
            color={COLOR_ARRIVED} emissive={COLOR_ARRIVED}
            emissiveIntensity={1.0} transparent opacity={0.6}
          />
        </mesh>
      )}

      {/* ══ 배경 패널 (반투명 글래스) ═════════════════════════ */}
      {!hasArrived && (
        <>
          {/* 외곽 글로우 */}
          <mesh>
            <circleGeometry args={[0.28, 48]} />
            <meshStandardMaterial
              color={arrowColor} emissive={arrowColor}
              emissiveIntensity={0.4} transparent opacity={0.18}
            />
          </mesh>
          {/* 배경 디스크 */}
          <mesh>
            <circleGeometry args={[0.24, 48]} />
            <meshStandardMaterial
              color="#001020" transparent opacity={0.72}
            />
          </mesh>
          {/* 테두리 링 */}
          <mesh>
            <torusGeometry args={[0.24, 0.008, 8, 48]} />
            <meshStandardMaterial
              color={arrowColor} emissive={arrowColor}
              emissiveIntensity={0.8} transparent opacity={0.7}
            />
          </mesh>
        </>
      )}

      {/* ══ 메인 화살표 ════════════════════════════════════════
          실제 내비게이션 앱 스타일: 굵은 샤프트 + 넓은 헤드
      ════════════════════════════════════════════════════════ */}
      <group ref={arrowRef}>
        {!hasArrived && (
          <>
            {/* 샤프트 (굵고 짧게) */}
            <mesh position={[0, -0.055, 0.005]}>
              <boxGeometry args={[0.072, 0.13, 0.022]} />
              <meshStandardMaterial
                color={arrowColor} emissive={arrowColor}
                emissiveIntensity={noGps ? 0.5 : 1.8}
              />
            </mesh>

            {/* 헤드 (넓고 뚜렷하게) */}
            <mesh position={[0, 0.105, 0.005]}>
              <coneGeometry args={[0.14, 0.165, 4]} />
              <meshStandardMaterial
                color={arrowColor} emissive={arrowColor}
                emissiveIntensity={noGps ? 0.5 : 1.8}
              />
            </mesh>

            {/* 헤드 뒤 글로우 (부드러운 빛) */}
            <mesh position={[0, 0.06, 0]}>
              <circleGeometry args={[0.18, 24]} />
              <meshStandardMaterial
                color={arrowColor} emissive={arrowColor}
                emissiveIntensity={0.6} transparent opacity={0.22}
              />
            </mesh>
          </>
        )}

        {/* 도착 체크마크 */}
        {hasArrived && (
          <Text position={[0, 0, 0.01]} fontSize={0.16}
            color={COLOR_ARRIVED} anchorX="center" anchorY="middle">
            ✓
          </Text>
        )}
      </group>

      {/* ══ 거리 + 목적지 레이블 ══════════════════════════════ */}
      <group position={[0, -0.34, 0]}>
        {/* 배경 */}
        <RoundedBox args={[0.52, 0.1, 0.006]} radius={0.05} smoothness={4}>
          <meshStandardMaterial
            color={arrowColor} emissive={arrowColor}
            emissiveIntensity={0.3} transparent opacity={0.22}
          />
        </RoundedBox>
        <RoundedBox args={[0.50, 0.095, 0.012]} radius={0.048} smoothness={4}>
          <meshStandardMaterial color="#000c1e" transparent opacity={0.78} />
        </RoundedBox>
        {/* 거리 텍스트 */}
        <Text position={[0, 0.008, 0.014]} fontSize={0.058}
          color="#ffffff" anchorX="center" anchorY="middle"
          maxWidth={0.46} textAlign="center">
          {hasArrived ? '도착!' : distLabel}
        </Text>
      </group>

      {/* ══ GPS 대기 메시지 ════════════════════════════════════ */}
      {noGps && !hasArrived && (
        <Text position={[0, 0.34, 0.01]} fontSize={0.048}
          color="#FFCC44" anchorX="center" anchorY="middle">
          GPS 신호 대기 중...
        </Text>
      )}

    </group>
  )
}
