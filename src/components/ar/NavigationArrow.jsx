import React, { useRef, useState } from 'react'
import { Text, RoundedBox } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { Vector3 } from 'three'

// 화살표 색상 팔레트
const COLOR_NORMAL  = '#00D9FF'   // 기본 – 밝은 시안
const COLOR_RING    = '#005577'   // 나침반 링
const COLOR_ARRIVED = '#48bb78'   // 도착 – 녹색

/**
 * NavigationArrow
 *
 * 카메라 HUD 요소 – 뷰포트 하단 중앙에 항상 고정.
 * useFrame으로 매 프레임 카메라 위치/방향을 추적하며,
 * relativeAngle에 따라 Z축 회전으로 목적지 방향을 표시.
 *
 * Props:
 *   relativeAngle  화면 기준 목적지 각도 (0=정면, 90=오른쪽) | null
 *   distance       km | null
 *   heading        나침반 heading | null  (null이면 "보정 중" 표시)
 *   hasArrived     boolean
 */
export default function NavigationArrow({ relativeAngle, distance, heading, hasArrived }) {
  const groupRef   = useRef()    // 카메라 부착 그룹
  const arrowRef   = useRef()    // 회전 화살표
  const pulseRef   = useRef()    // 도착 펄스 링
  const bobRef     = useRef(0)
  const pulseTimeRef = useRef(0)

  // 도착 배너 fade-in
  const arrivalProgressRef = useRef(0)
  const [arrivalT, setArrivalT] = useState(0)

  useFrame(({ camera }, delta) => {
    if (!groupRef.current) return

    // ── 1. 카메라 하단 중앙에 HUD 고정 ──────────────────────
    const localOffset = new Vector3(0, -0.44, -1.35)
    localOffset.applyQuaternion(camera.quaternion)
    groupRef.current.position.copy(camera.position).add(localOffset)
    groupRef.current.quaternion.copy(camera.quaternion)

    // ── 2. 화살표 → 목적지 방향 보간 회전 (Z축) ────────────
    if (arrowRef.current && relativeAngle !== null) {
      const targetZ = -(relativeAngle * Math.PI) / 180
      const curr    = arrowRef.current.rotation.z
      let diff      = targetZ - curr
      // -π ~ π 범위로 정규화 (최단 경로)
      while (diff >  Math.PI) diff -= Math.PI * 2
      while (diff < -Math.PI) diff += Math.PI * 2
      arrowRef.current.rotation.z += diff * Math.min(1, delta * 5)
    }

    // ── 3. 상하 보빙 (도착 전) ───────────────────────────────
    if (!hasArrived) {
      bobRef.current += delta * 2.4
      groupRef.current.position.y += Math.sin(bobRef.current) * 0.005
    }

    // ── 4. 도착 펄스 링 ─────────────────────────────────────
    if (hasArrived && pulseRef.current) {
      pulseTimeRef.current += delta * 2.5
      const s = 1 + Math.sin(pulseTimeRef.current) * 0.14
      pulseRef.current.scale.set(s, s, 1)
    }

    // ── 5. 도착 배너 fade-in ─────────────────────────────────
    if (hasArrived && arrivalProgressRef.current < 1) {
      arrivalProgressRef.current = Math.min(1, arrivalProgressRef.current + delta * 2.2)
      const raw = arrivalProgressRef.current
      setArrivalT(raw * raw * (3 - 2 * raw))
    }
  })

  const noCompass   = heading === null
  const arrowColor  = hasArrived ? COLOR_ARRIVED : COLOR_NORMAL
  const ringColor   = hasArrived ? COLOR_ARRIVED : COLOR_RING

  // 거리 포맷
  const distLabel =
    distance === null   ? '위치 계산 중...' :
    distance < 0.1      ? `약 ${Math.round(distance * 1000)}m` :
    distance < 1        ? `약 ${Math.round(distance * 1000)}m` :
                          `약 ${distance.toFixed(1)}km`

  return (
    <group ref={groupRef}>

      {/* ══ 도착 배너 (화면 중앙 위쪽) ══════════════════════ */}
      {hasArrived && (
        <group position={[0, 0.52, 0]}>
          {/* 배너 글로우 보더 */}
          <RoundedBox args={[0.72, 0.22, 0.02]} radius={0.06} smoothness={6}>
            <meshStandardMaterial
              color={COLOR_ARRIVED}
              emissive={COLOR_ARRIVED}
              emissiveIntensity={0.8 * arrivalT}
              transparent
              opacity={0.45 * arrivalT}
            />
          </RoundedBox>
          {/* 배너 배경 */}
          <RoundedBox args={[0.68, 0.19, 0.04]} radius={0.05} smoothness={4}>
            <meshStandardMaterial
              color="#001a0a"
              transparent
              opacity={0.82 * arrivalT}
            />
          </RoundedBox>
          {/* 배너 텍스트 */}
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
          <Text
            position={[0, -0.055, 0.03]}
            fontSize={0.052}
            color={COLOR_ARRIVED}
            anchorX="center"
            anchorY="middle"
            fillOpacity={arrivalT}
          >
            제일연합내과의원
          </Text>
        </group>
      )}

      {/* ══ 도착 펄스 링 ════════════════════════════════════ */}
      {hasArrived && (
        <mesh ref={pulseRef}>
          <torusGeometry args={[0.21, 0.012, 8, 40]} />
          <meshStandardMaterial
            color={COLOR_ARRIVED}
            emissive={COLOR_ARRIVED}
            emissiveIntensity={1.0}
            transparent
            opacity={0.55}
          />
        </mesh>
      )}

      {/* ══ 나침반 외곽 링 ══════════════════════════════════ */}
      <mesh>
        <torusGeometry args={[0.18, 0.014, 8, 48]} />
        <meshStandardMaterial
          color={ringColor}
          emissive={ringColor}
          emissiveIntensity={0.65}
          transparent
          opacity={0.8}
        />
      </mesh>

      {/* ══ 배경 디스크 ═════════════════════════════════════ */}
      <mesh>
        <circleGeometry args={[0.168, 40]} />
        <meshStandardMaterial
          color="#001428"
          transparent
          opacity={0.6}
        />
      </mesh>

      {/* ══ N/E/S/W 눈금 점 ════════════════════════════════ */}
      {[0, 90, 180, 270].map((deg) => {
        const r   = 0.135
        const rad = (deg * Math.PI) / 180
        return (
          <mesh key={deg} position={[Math.sin(rad) * r, Math.cos(rad) * r, 0.002]}>
            <circleGeometry args={[deg % 90 === 0 ? 0.009 : 0.005, 8]} />
            <meshStandardMaterial
              color="#ffffff"
              emissive="#ffffff"
              emissiveIntensity={0.4}
              transparent
              opacity={0.45}
            />
          </mesh>
        )
      })}

      {/* ══ 화살표 (Z축 회전으로 방향 표시) ════════════════ */}
      <group ref={arrowRef}>
        {/* 샤프트 */}
        <mesh position={[0, -0.025, 0.003]}>
          <boxGeometry args={[0.028, 0.1, 0.008]} />
          <meshStandardMaterial
            color={arrowColor}
            emissive={arrowColor}
            emissiveIntensity={noCompass ? 0.3 : 1.1}
          />
        </mesh>
        {/* 헤드 (삼각형 콘) */}
        <mesh position={[0, 0.09, 0.003]}>
          <coneGeometry args={[0.058, 0.1, 3]} />
          <meshStandardMaterial
            color={arrowColor}
            emissive={arrowColor}
            emissiveIntensity={noCompass ? 0.3 : 1.1}
          />
        </mesh>
      </group>

      {/* ══ 도착 체크마크 ════════════════════════════════════ */}
      {hasArrived && (
        <Text
          position={[0, 0, 0.01]}
          fontSize={0.1}
          color={COLOR_ARRIVED}
          anchorX="center"
          anchorY="middle"
        >
          ✓
        </Text>
      )}

      {/* ══ 거리 레이블 (나침반 아래) ═══════════════════════ */}
      <group position={[0, -0.275, 0]}>
        <RoundedBox args={[0.44, 0.09, 0.005]} radius={0.045} smoothness={4}>
          <meshStandardMaterial
            color={hasArrived ? COLOR_ARRIVED : COLOR_NORMAL}
            emissive={hasArrived ? COLOR_ARRIVED : COLOR_NORMAL}
            emissiveIntensity={0.35}
            transparent
            opacity={0.28}
          />
        </RoundedBox>
        <RoundedBox args={[0.42, 0.088, 0.01]} radius={0.044} smoothness={4}>
          <meshStandardMaterial
            color="#001428"
            transparent
            opacity={0.65}
          />
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

      {/* ══ 나침반 보정 중 메시지 ════════════════════════════ */}
      {noCompass && !hasArrived && (
        <Text
          position={[0, 0.27, 0.01]}
          fontSize={0.048}
          color="#FFCC44"
          anchorX="center"
          anchorY="middle"
        >
          나침반 보정 중...
        </Text>
      )}

    </group>
  )
}
