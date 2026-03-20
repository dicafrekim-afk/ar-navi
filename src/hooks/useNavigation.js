import { useState, useEffect, useRef, useCallback } from 'react'

// ─── 기본 목적지 ──────────────────────────────────────────────────────────────
const DEFAULT_DESTINATION = {
  lat:  36.4868361,
  lon:  127.2509414,
  name: '제일연합내과의원',
}

const ARRIVAL_KM    = 0.05   // 50m 이내 → 도착 판정
const GPS_ALPHA     = 0.25   // GPS 지수이동평균 스무딩 강도 (0=고정, 1=즉각반응)
const HEADING_ALPHA = 0.12   // 나침반 스무딩 (각도 보간)

// ─── 수학 유틸 ────────────────────────────────────────────────────────────────

/** Haversine 거리 (km) */
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371
  const rad = (d) => (d * Math.PI) / 180
  const dLat = rad(lat2 - lat1)
  const dLon = rad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/** 초기 방위각 (degrees, 0=North, CW) – A → B */
function initialBearing(lat1, lon1, lat2, lon2) {
  const rad = (d) => (d * Math.PI) / 180
  const dLon = rad(lon2 - lon1)
  const y = Math.sin(dLon) * Math.cos(rad(lat2))
  const x =
    Math.cos(rad(lat1)) * Math.sin(rad(lat2)) -
    Math.sin(rad(lat1)) * Math.cos(rad(lat2)) * Math.cos(dLon)
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
}

/** 각도 스무딩: 0/360 경계 wraparound 처리 */
function smoothAngle(current, next, alpha) {
  if (current === null) return next
  let diff = next - current
  if (diff >  180) diff -= 360
  if (diff < -180) diff += 360
  return current + alpha * diff
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * useNavigation
 *
 * 반환값:
 *   status         'idle' | 'requesting' | 'active' | 'denied' | 'unsupported'
 *   position       { lat, lon } | null  (스무딩 적용)
 *   heading        degrees (0=North, CW) | null
 *   bearing        목적지 방위각 | null
 *   distance       목적지까지 km | null
 *   relativeAngle  화면 기준 목적지 각도 (forward=0, right=90) | null
 *   hasArrived     boolean
 *   error          string | null
 *   destination    { lat, lon, name }
 *   startNavigation() → void  (button click 핸들러로 사용)
 */
export function useNavigation(destination = DEFAULT_DESTINATION) {
  const [state, setState] = useState({
    status:        'idle',
    position:      null,
    heading:       null,
    bearing:       null,
    distance:      null,
    relativeAngle: null,
    hasArrived:    false,
    error:         null,
  })

  const smoothPosRef     = useRef(null)
  const smoothHeadingRef = useRef(null)
  const watchIdRef       = useRef(null)
  const cleanupOrientRef = useRef(null)

  // 파생값 재계산 (GPS·나침반이 업데이트될 때마다 호출)
  const recompute = useCallback((pos, heading) => {
    if (!pos) return
    const dist    = haversine(pos.lat, pos.lon, destination.lat, destination.lon)
    const bear    = initialBearing(pos.lat, pos.lon, destination.lat, destination.lon)
    const relAngle = heading !== null ? (bear - heading + 360) % 360 : null

    setState((prev) => ({
      ...prev,
      position:      pos,
      heading,
      bearing:       bear,
      distance:      dist,
      relativeAngle: relAngle,
      hasArrived:    dist < ARRIVAL_KM,
    }))
  }, [destination])

  const startNavigation = useCallback(async () => {
    // 이미 실행 중이면 무시
    setState((prev) => {
      if (prev.status === 'active') return prev
      return { ...prev, status: 'requesting' }
    })

    // ── 1. Geolocation 지원 확인 ───────────────────────
    if (!navigator.geolocation) {
      setState((prev) => ({
        ...prev,
        status: 'unsupported',
        error: 'GPS를 지원하지 않는 기기입니다.',
      }))
      return
    }

    // ── 2. iOS 13+ 나침반 권한 요청 ────────────────────
    if (
      window.DeviceOrientationEvent &&
      typeof window.DeviceOrientationEvent.requestPermission === 'function'
    ) {
      try {
        const result = await window.DeviceOrientationEvent.requestPermission()
        if (result !== 'granted') {
          setState((prev) => ({
            ...prev,
            status: 'denied',
            error: '나침반 권한이 거부되었습니다. 설정에서 허용해주세요.',
          }))
          return
        }
      } catch {
        // 권한 오류 시에도 계속 진행
      }
    }

    setState((prev) => ({ ...prev, status: 'active' }))

    // ── 3. GPS 위치 추적 ───────────────────────────────
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const raw = { lat: pos.coords.latitude, lon: pos.coords.longitude }
        const prev = smoothPosRef.current
        // 지수이동평균 스무딩
        const smoothed = prev
          ? {
              lat: prev.lat + GPS_ALPHA * (raw.lat - prev.lat),
              lon: prev.lon + GPS_ALPHA * (raw.lon - prev.lon),
            }
          : raw
        smoothPosRef.current = smoothed
        recompute(smoothed, smoothHeadingRef.current)
      },
      (err) => {
        setState((prev) => ({ ...prev, error: `위치 오류: ${err.message}` }))
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 },
    )

    // ── 4. 나침반 방향 추적 ────────────────────────────
    const handleOrientation = (e) => {
      let rawHeading = null

      if (e.webkitCompassHeading != null) {
        // iOS: webkitCompassHeading은 0=North, CW → 그대로 사용
        rawHeading = e.webkitCompassHeading
      } else if (e.alpha != null) {
        // Android: alpha는 CCW 기준 → CW로 변환
        rawHeading = (360 - e.alpha) % 360
      }

      if (rawHeading === null) return

      smoothHeadingRef.current = smoothAngle(
        smoothHeadingRef.current,
        rawHeading,
        HEADING_ALPHA,
      )
      recompute(smoothPosRef.current, smoothHeadingRef.current)
    }

    // deviceorientationabsolute 우선 시도, 없으면 deviceorientation fallback
    const absAvail = 'ondeviceorientationabsolute' in window
    if (absAvail) window.addEventListener('deviceorientationabsolute', handleOrientation)
    window.addEventListener('deviceorientation', handleOrientation)

    cleanupOrientRef.current = () => {
      if (absAvail) window.removeEventListener('deviceorientationabsolute', handleOrientation)
      window.removeEventListener('deviceorientation', handleOrientation)
    }
  }, [recompute])

  // 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null)
        navigator.geolocation.clearWatch(watchIdRef.current)
      if (cleanupOrientRef.current)
        cleanupOrientRef.current()
    }
  }, [])

  return { ...state, destination, startNavigation }
}
