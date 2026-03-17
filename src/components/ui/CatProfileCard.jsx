import React, { useRef, useState } from 'react'
import { Text, Image, RoundedBox } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'

/**
 * CatProfileCard
 * 고양이 마커 탭 시 나타나는 3D 프로필 팝업 카드.
 *
 * 애니메이션: 마운트 시 아래 → 위로 슬라이드(+0.2) + 페이드인 (~350ms, cubic ease-out)
 * 닫기: 카드 배경 클릭 또는 동일 마커 재탭 (onClose 콜백)
 */
export default function CatProfileCard({ cat, onClose }) {
  const progressRef = useRef(0)
  const [t, setT] = useState(0)

  useFrame((_, delta) => {
    if (progressRef.current < 1) {
      progressRef.current = Math.min(1, progressRef.current + delta * 3.2)
      const raw = progressRef.current
      // cubic ease-out: 빠르게 올라왔다가 부드럽게 멈춤
      setT(raw * raw * (3 - 2 * raw))
    }
  })

  const W = 0.84
  const H = 1.1

  // 아래에서 위로 0.2 슬라이드
  const yPos = -0.25 + 0.25 * t

  return (
    <group position={[0, 0.2 + yPos, 0.6]}>

      {/* ── 진 전용: 황금 천사 오라 ───────────────────────── */}
      {cat.isAngel && (
        <>
          {/* 바깥 황금 글로우 링 */}
          <RoundedBox args={[W + 0.16, H + 0.16, 0.01]} radius={0.18} smoothness={8}>
            <meshStandardMaterial
              color="#FFD700"
              emissive="#FFD700"
              emissiveIntensity={0.7 * t}
              transparent
              opacity={0.35 * t}
            />
          </RoundedBox>
          {/* 코너 별 장식 */}
          {[[-1, 1], [1, 1], [-1, -1], [1, -1]].map(([sx, sy], i) => (
            <mesh
              key={i}
              position={[sx * (W / 2 + 0.04), sy * (H / 2 + 0.04), 0.03]}
            >
              <sphereGeometry args={[0.04, 8, 8]} />
              <meshStandardMaterial
                color="#FFD700"
                emissive="#FFD700"
                emissiveIntensity={1.4}
                transparent
                opacity={0.9 * t}
              />
            </mesh>
          ))}
        </>
      )}

      {/* ── 외곽 글로우 보더 ──────────────────────────────── */}
      <RoundedBox args={[W + 0.05, H + 0.05, 0.04]} radius={0.14} smoothness={6}>
        <meshStandardMaterial
          color={cat.color}
          emissive={cat.color}
          emissiveIntensity={0.6 * t}
          transparent
          opacity={0.45 * t}
        />
      </RoundedBox>

      {/* ── 유리 본체 (클릭 시 닫기) ─────────────────────── */}
      <RoundedBox
        args={[W, H, 0.08]}
        radius={0.1}
        smoothness={6}
        onClick={onClose}
      >
        <meshStandardMaterial
          color="#c8dff5"
          emissive="#0a2040"
          emissiveIntensity={0.09 * t}
          metalness={0.12}
          roughness={0.04}
          transparent
          opacity={0.28 * t}
        />
      </RoundedBox>

      {/* ── 상단 엣지 shimmer ────────────────────────────── */}
      <RoundedBox
        args={[W - 0.12, 0.025, 0.1]}
        radius={0.012}
        smoothness={4}
        position={[0, H / 2 - 0.025, 0.025]}
      >
        <meshStandardMaterial
          color="#ffffff"
          emissive="#ffffff"
          emissiveIntensity={0.7 * t}
          transparent
          opacity={0.45 * t}
        />
      </RoundedBox>

      {/* ── 상단 액센트 바 ───────────────────────────────── */}
      <RoundedBox
        args={[W - 0.1, 0.065, 0.1]}
        radius={0.03}
        smoothness={4}
        position={[0, H / 2 - 0.1, 0.025]}
      >
        <meshStandardMaterial
          color={cat.isAngel ? '#FFD700' : cat.color}
          emissive={cat.isAngel ? '#FFD700' : cat.color}
          emissiveIntensity={0.9 * t}
          transparent
          opacity={0.88 * t}
        />
      </RoundedBox>

      {/* ── 고양이 사진 ──────────────────────────────────── */}
      <Image
        url={cat.image}
        position={[0, 0.16, 0.06]}
        scale={[0.68, 0.68]}
        transparent
        opacity={t}
        radius={0.06}
      />

      {/* ── 이름 ─────────────────────────────────────────── */}
      <Text
        position={[0, -0.26, 0.07]}
        fontSize={0.21}
        color={cat.isAngel ? '#FFD700' : '#ffffff'}
        anchorX="center"
        anchorY="middle"
        fillOpacity={t}
        outlineWidth={cat.isAngel ? 0.008 : 0.004}
        outlineColor={cat.isAngel ? '#FFD700' : cat.color}
        outlineOpacity={t * 0.8}
      >
        {cat.name}
      </Text>

      {/* ── 특징 설명 ─────────────────────────────────────── */}
      <Text
        position={[0, -0.41, 0.07]}
        fontSize={0.098}
        color={cat.isAngel ? '#FFE89A' : '#c0dff5'}
        anchorX="center"
        anchorY="middle"
        maxWidth={0.74}
        textAlign="center"
        fillOpacity={t}
        lineHeight={1.45}
      >
        {cat.desc}
      </Text>

      {/* ── 진 전용: 천사 뱃지 ───────────────────────────── */}
      {cat.isAngel && (
        <>
          {/* 뱃지 배경 */}
          <RoundedBox
            args={[0.72, 0.11, 0.05]}
            radius={0.055}
            smoothness={4}
            position={[0, -0.58, 0.06]}
          >
            <meshStandardMaterial
              color="#FFD700"
              emissive="#FFD700"
              emissiveIntensity={0.5 * t}
              transparent
              opacity={0.28 * t}
            />
          </RoundedBox>
          <Text
            position={[0, -0.58, 0.08]}
            fontSize={0.082}
            color="#FFD700"
            anchorX="center"
            anchorY="middle"
            fillOpacity={t}
          >
            ✦ 하늘나라에서 지켜주는 천사 고양이 ✦
          </Text>
        </>
      )}

      {/* ── 닫기 버튼 (우상단) ───────────────────────────── */}
      <mesh
        position={[W / 2 - 0.09, H / 2 - 0.09, 0.07]}
        onClick={onClose}
      >
        <circleGeometry args={[0.06, 16]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive="#ffffff"
          emissiveIntensity={0.3 * t}
          transparent
          opacity={0.25 * t}
        />
      </mesh>
      <Text
        position={[W / 2 - 0.09, H / 2 - 0.09, 0.08]}
        fontSize={0.12}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        fillOpacity={t * 0.75}
      >
        ✕
      </Text>

    </group>
  )
}
