import { useState, useEffect, useRef, useCallback } from 'react'
import { haversine, initialBearing, smoothAngle } from '../utils/geoUtils'

const ARRIVAL_KM    = 0.01   // 10m 이내 → 도착 판정
const GPS_ALPHA     = 0.25   // GPS 지수이동평균 스무딩 강도
const HEADING_ALPHA = 0.12   // 나침반 스무딩

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
 *   destination    { lat, lon, name } | null
 *   setDestination (dest) => void  — SearchBar에서 목적지 설정
 *   startNavigation() => void
 */
export function useNavigation() {
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
  const [destination, setDestination] = useState(null)

  const smoothPosRef     = useRef(null)
  const smoothHeadingRef = useRef(null)
  const watchIdRef       = useRef(null)
  const cleanupOrientRef = useRef(null)
  const destinationRef   = useRef(destination)

  useEffect(() => { destinationRef.current = destination }, [destination])

  // 파생값 재계산
  const recompute = useCallback((pos, heading) => {
    if (!pos) return
    const dest = destinationRef.current

    if (!dest) {
      setState((prev) => ({ ...prev, position: pos, heading }))
      return
    }

    const dist     = haversine(pos.lat, pos.lon, dest.lat, dest.lon)
    const bear     = initialBearing(pos.lat, pos.lon, dest.lat, dest.lon)
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
  }, [])

  const startNavigation = useCallback(async () => {
    setState((prev) => {
      if (prev.status === 'active') return prev
      return { ...prev, status: 'requesting' }
    })

    if (!navigator.geolocation) {
      setState((prev) => ({
        ...prev,
        status: 'unsupported',
        error:  'GPS를 지원하지 않는 기기입니다.',
      }))
      return
    }

    // iOS 13+ 나침반 권한 요청
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
            error:  '나침반 권한이 거부되었습니다. 설정에서 허용해주세요.',
          }))
          return
        }
      } catch {
        // 권한 오류 시 계속 진행
      }
    }

    setState((prev) => ({ ...prev, status: 'active' }))

    // GPS 위치 추적
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const raw     = { lat: pos.coords.latitude, lon: pos.coords.longitude }
        const prev    = smoothPosRef.current
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

    // 나침반 방향 추적
    const handleOrientation = (e) => {
      let rawHeading = null
      if (e.webkitCompassHeading != null) {
        // iOS: 0=North, CW
        rawHeading = e.webkitCompassHeading
      } else if (e.alpha != null) {
        // Android: alpha는 CCW 기준 → CW로 변환
        rawHeading = (360 - e.alpha) % 360
      }
      if (rawHeading === null) return
      smoothHeadingRef.current = smoothAngle(smoothHeadingRef.current, rawHeading, HEADING_ALPHA)
      recompute(smoothPosRef.current, smoothHeadingRef.current)
    }

    const absAvail = 'ondeviceorientationabsolute' in window
    if (absAvail) window.addEventListener('deviceorientationabsolute', handleOrientation)
    window.addEventListener('deviceorientation', handleOrientation)

    cleanupOrientRef.current = () => {
      if (absAvail) window.removeEventListener('deviceorientationabsolute', handleOrientation)
      window.removeEventListener('deviceorientation', handleOrientation)
    }
  }, [recompute])

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null)
        navigator.geolocation.clearWatch(watchIdRef.current)
      if (cleanupOrientRef.current)
        cleanupOrientRef.current()
    }
  }, [])

  return { ...state, destination, setDestination, startNavigation }
}
