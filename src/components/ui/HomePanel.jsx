import React, { useState, useEffect, useRef } from 'react'
import { Text, RoundedBox } from '@react-three/drei'
import DashboardPanel from './DashboardPanel'
import CatProfileCard from './CatProfileCard'
import { useWeather } from '../../hooks/useWeather'

/**
 * 고양이 데이터
 * isAngel: true → 진 전용 황금 천사 디자인 적용
 */
const CATS = [
  {
    name: '쿤',
    image: '/image/kun.jpg',
    color: '#FFB347',
    desc: '밝고 쾌활한\n노란 개냥이',
    isAngel: false,
  },
  {
    name: '민',
    image: '/image/min.jpg',
    color: '#87CEEB',
    desc: '멍청미 뿜뿜\n흰둥이 귀염둥이',
    isAngel: false,
  },
  {
    name: '현',
    image: '/image/hyun.jpg',
    color: '#DDA0DD',
    desc: '카리스마 대장\n우리집 어른냥이',
    isAngel: false,
  },
  {
    name: '진',
    image: '/image/jin.jpg',
    color: '#FFD700',
    desc: '언제나 곁에서\n함께해준 소중한 가족',
    isAngel: true,
  },
]

/**
 * HomePanel — 기본 대시보드 (zone 미선택 시)
 *
 * 레이아웃:
 *   ┌──────────────────────────────────────────────┐
 *   │  구현 팀장님의 스마트 오피스   [title bar]    │
 *   ├──────────────────────────────────────────────┤
 *   │  ◉ 세종시      조건명        [온도 크게]      │
 *   │                습도  /  풍속                  │
 *   │                업데이트 시각                  │
 *   ├── 구분선 ─────────────────────────────────── ┤
 *   │  나의 고양이들                                │
 *   │  [쿤]  [민]  [현]  [진★]                    │
 *   └──────────────────────────────────────────────┘
 *
 * 고양이 마커 탭 → CatProfileCard 팝업 (토글)
 */
export default function HomePanel({ position, navigationData }) {
  const weather = useWeather()
  const [selectedCatName, setSelectedCatName] = useState(null)
  const arrivedRef = useRef(false)

  // 도착 시 고양이 랜덤 팝업 (최초 1회)
  useEffect(() => {
    const hasArrived = navigationData?.hasArrived ?? false
    if (hasArrived && !arrivedRef.current) {
      arrivedRef.current = true
      const random = CATS[Math.floor(Math.random() * CATS.length)]
      setSelectedCatName(random.name)
    }
    if (!hasArrived) arrivedRef.current = false
  }, [navigationData?.hasArrived])

  // 내비게이션 거리 포맷
  const navActive  = navigationData?.status === 'active'
  const dist       = navigationData?.distance ?? null
  const distLabel  =
    dist === null   ? '위치 계산 중...' :
    dist < 0.1      ? `${Math.round(dist * 1000)}m` :
                      `${dist.toFixed(2)}km`
  const hasArrived = navigationData?.hasArrived ?? false

  const selectedCat = CATS.find((c) => c.name === selectedCatName) ?? null

  const handleCatSelect = (name) => {
    // 같은 고양이 재탭 시 카드 닫기
    setSelectedCatName((prev) => (prev === name ? null : name))
  }

  // 4마리 균등 배치: x = -1.08, -0.36, +0.36, +1.08
  const catSpacing = 0.72

  return (
    <DashboardPanel
      position={position}
      title="구현 팀장님의 스마트 오피스"
      width={2.6}
      height={2.0}
      accentColor="#88d3ff"
    >
      {/* ════════════════════════════════════════════
          날씨 섹션
      ════════════════════════════════════════════ */}

      {/* 날씨 조건 컬러 닷 */}
      <mesh position={[-1.0, 0.48, 0]}>
        <sphereGeometry args={[0.1, 20, 20]} />
        <meshStandardMaterial
          color={weather.color}
          emissive={weather.color}
          emissiveIntensity={1.0}
        />
      </mesh>

      {/* 도시명 */}
      <Text
        position={[-0.78, 0.55, 0]}
        fontSize={0.14}
        color="#a8d8ff"
        anchorX="left"
        anchorY="middle"
      >
        {weather.city}
      </Text>

      {/* 날씨 조건 */}
      <Text
        position={[-0.78, 0.38, 0]}
        fontSize={0.16}
        color={weather.color}
        anchorX="left"
        anchorY="middle"
      >
        {weather.condition}
      </Text>

      {/* 온도 (크게) */}
      <Text
        position={[0.55, 0.45, 0]}
        fontSize={0.58}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        {`${weather.temp}°`}
      </Text>

      {/* 습도 */}
      <Text
        position={[-0.78, 0.18, 0]}
        fontSize={0.13}
        color="#8ab4cc"
        anchorX="left"
        anchorY="middle"
      >
        {`습도  ${weather.humidity}%`}
      </Text>

      {/* 풍속 */}
      <Text
        position={[0.1, 0.18, 0]}
        fontSize={0.13}
        color="#8ab4cc"
        anchorX="left"
        anchorY="middle"
      >
        {`바람  ${weather.wind}m/s`}
      </Text>

      {/* 업데이트 시각 */}
      <Text
        position={[0, 0.02, 0]}
        fontSize={0.11}
        color="#4a6a80"
        anchorX="center"
        anchorY="middle"
      >
        {`업데이트  ${weather.updatedAt}`}
      </Text>

      {/* ════════════════════════════════════════════
          내비게이션 거리 스트립
      ════════════════════════════════════════════ */}
      {navActive && (
        <group position={[0, -0.1, 0]}>
          {/* 스트립 배경 */}
          <RoundedBox args={[2.28, 0.14, 0.03]} radius={0.04} smoothness={4}>
            <meshStandardMaterial
              color={hasArrived ? '#1a4a2a' : '#001a30'}
              transparent
              opacity={0.55}
            />
          </RoundedBox>
          {/* 스트립 보더 */}
          <RoundedBox args={[2.30, 0.145, 0.015]} radius={0.045} smoothness={4}>
            <meshStandardMaterial
              color={hasArrived ? '#48bb78' : '#00D9FF'}
              emissive={hasArrived ? '#48bb78' : '#00D9FF'}
              emissiveIntensity={0.5}
              transparent
              opacity={0.3}
            />
          </RoundedBox>

          {/* 병원 아이콘 닷 */}
          <mesh position={[-0.98, 0, 0.02]}>
            <circleGeometry args={[0.04, 16]} />
            <meshStandardMaterial
              color={hasArrived ? '#48bb78' : '#ff5555'}
              emissive={hasArrived ? '#48bb78' : '#ff5555'}
              emissiveIntensity={1.0}
            />
          </mesh>

          {/* 병원명 */}
          <Text
            position={[-0.82, 0.01, 0.02]}
            fontSize={0.115}
            color="#ffffff"
            anchorX="left"
            anchorY="middle"
          >
            제일연합내과의원
          </Text>

          {/* 거리 / 도착 표시 */}
          <Text
            position={[0.7, 0.01, 0.02]}
            fontSize={0.12}
            color={hasArrived ? '#48bb78' : '#00D9FF'}
            anchorX="center"
            anchorY="middle"
          >
            {hasArrived ? '도착!' : distLabel}
          </Text>
        </group>
      )}

      {/* 내비게이션 비활성 시 안내 문구 */}
      {!navActive && (
        <Text
          position={[0, -0.1, 0]}
          fontSize={0.105}
          color="#2a4a60"
          anchorX="center"
          anchorY="middle"
        >
          하단 버튼으로 내비게이션을 시작하세요
        </Text>
      )}

      {/* ════════════════════════════════════════════
          구분선
      ════════════════════════════════════════════ */}
      <RoundedBox
        args={[2.3, 0.02, 0.04]}
        radius={0.01}
        smoothness={2}
        position={[0, -0.24, 0]}
      >
        <meshStandardMaterial
          color="#88d3ff"
          emissive="#88d3ff"
          emissiveIntensity={0.5}
          transparent
          opacity={0.4}
        />
      </RoundedBox>

      {/* ════════════════════════════════════════════
          고양이 섹션
      ════════════════════════════════════════════ */}

      {/* 섹션 레이블 */}
      <Text
        position={[0, -0.37, 0]}
        fontSize={0.14}
        color="#a8d8ff"
        anchorX="center"
        anchorY="middle"
      >
        나의 고양이들
      </Text>

      {/* 고양이 마커 버튼들 */}
      {CATS.map((cat, i) => {
        const x = (i - 1.5) * catSpacing
        const isSelected = selectedCatName === cat.name

        return (
          <group key={cat.name} position={[x, -0.62, 0]}>

            {/* 선택 중일 때 외곽 하이라이트 링 */}
            {isSelected && (
              <RoundedBox args={[0.52, 0.32, 0.02]} radius={0.1} smoothness={4}>
                <meshStandardMaterial
                  color={cat.color}
                  emissive={cat.color}
                  emissiveIntensity={1.0}
                  transparent
                  opacity={0.55}
                />
              </RoundedBox>
            )}

            {/* 버블 배경 */}
            <RoundedBox
              args={[0.48, 0.28, 0.04]}
              radius={0.08}
              smoothness={4}
              onClick={() => handleCatSelect(cat.name)}
            >
              <meshStandardMaterial
                color={cat.color}
                emissive={cat.color}
                emissiveIntensity={isSelected ? 0.55 : 0.2}
                transparent
                opacity={isSelected ? 0.38 : 0.22}
              />
            </RoundedBox>

            {/* 진: 황금 별 닷 / 일반: 컬러 닷 */}
            {cat.isAngel ? (
              <Text
                position={[-0.14, 0, 0.05]}
                fontSize={0.14}
                color="#FFD700"
                anchorX="center"
                anchorY="middle"
                fillOpacity={1}
              >
                ★
              </Text>
            ) : (
              <mesh position={[-0.14, 0, 0.05]}>
                <circleGeometry args={[0.055, 16]} />
                <meshStandardMaterial
                  color={cat.color}
                  emissive={cat.color}
                  emissiveIntensity={isSelected ? 1.2 : 0.8}
                />
              </mesh>
            )}

            {/* 이름 */}
            <Text
              position={[0.06, 0, 0.05]}
              fontSize={0.16}
              color={cat.isAngel ? '#FFD700' : '#ffffff'}
              anchorX="center"
              anchorY="middle"
              outlineWidth={cat.isAngel ? 0.005 : 0}
              outlineColor="#FFD700"
            >
              {cat.name}
            </Text>

          </group>
        )
      })}

      {/* ════════════════════════════════════════════
          고양이 프로필 카드 팝업
          선택된 고양이가 바뀔 때마다 재마운트 → 자동 fade-in
      ════════════════════════════════════════════ */}
      {selectedCat && (
        <CatProfileCard
          key={selectedCat.name}
          cat={selectedCat}
          onClose={() => setSelectedCatName(null)}
        />
      )}

    </DashboardPanel>
  )
}
