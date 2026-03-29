import { useState, useEffect, useRef } from 'react'
import { haversine } from '../utils/geoUtils'

const STEP_ADVANCE_M = 15   // 다음 스텝 전환 거리 (m)
const REFRESH_MS     = 30000 // 30초마다 경로 재조회

/**
 * useDirections
 *
 * Google Routes API v2를 사용해 도보 경로를 조회하고 스텝을 관리한다.
 *
 * @param {object|null} position  { lat, lon } — useNavigation에서 전달
 * @param {object|null} destination { lat, lon, name }
 *
 * 반환값:
 *   steps          전체 스텝 배열
 *   currentStep    현재 안내 스텝 객체
 *   currentStepIdx 현재 스텝 인덱스
 *   totalSteps     전체 스텝 수
 *   loading        boolean
 *   error          string | null
 */
export function useDirections(position, destination) {
  const [steps, setSteps]               = useState([])
  const [currentStepIdx, setCurrentStepIdx] = useState(0)
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState(null)

  const positionRef    = useRef(position)
  const abortCtrlRef   = useRef(null)

  useEffect(() => { positionRef.current = position }, [position])

  // ── 경로 조회 (destination 변경 시 즉시 + 30초 타이머) ──────────
  useEffect(() => {
    if (!destination) return

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
    if (!apiKey) {
      setError('VITE_GOOGLE_MAPS_API_KEY가 설정되지 않았습니다.')
      return
    }

    let cancelled = false

    const fetchRoute = async () => {
      const pos = positionRef.current
      if (!pos) return

      abortCtrlRef.current?.abort()
      const ctrl = new AbortController()
      abortCtrlRef.current = ctrl

      setLoading(true)
      try {
        const res = await fetch(
          'https://routes.googleapis.com/directions/v2:computeRoutes',
          {
            method: 'POST',
            signal: ctrl.signal,
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': apiKey,
              'X-Goog-FieldMask': [
                'routes.legs.steps.startLocation',
                'routes.legs.steps.endLocation',
                'routes.legs.steps.distanceMeters',
                'routes.legs.steps.navigationInstruction',
              ].join(','),
            },
            body: JSON.stringify({
              origin: {
                location: { latLng: { latitude: pos.lat, longitude: pos.lon } },
              },
              destination: {
                location: {
                  latLng: {
                    latitude:  destination.lat,
                    longitude: destination.lon,
                  },
                },
              },
              travelMode:   'WALK',
              languageCode: 'ko',
            }),
          },
        )
        const data = await res.json()
        if (!cancelled) {
          const newSteps = data?.routes?.[0]?.legs?.[0]?.steps ?? []
          setSteps(newSteps)
          setCurrentStepIdx(0)
          setError(null)
        }
      } catch (e) {
        if (!cancelled && e.name !== 'AbortError') {
          setError(e.message)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchRoute()
    const timer = setInterval(fetchRoute, REFRESH_MS)

    return () => {
      cancelled = true
      clearInterval(timer)
      abortCtrlRef.current?.abort()
    }
  }, [destination?.lat, destination?.lon]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── 스텝 진행 판정 (다음 경유점까지 15m 이내 → 자동 전환) ───────
  useEffect(() => {
    if (!position || steps.length === 0) return
    const step = steps[currentStepIdx]
    if (!step) return

    const endLat = step.endLocation?.latLng?.latitude
    const endLon = step.endLocation?.latLng?.longitude
    if (endLat == null || endLon == null) return

    const distM = haversine(position.lat, position.lon, endLat, endLon) * 1000
    if (distM <= STEP_ADVANCE_M && currentStepIdx < steps.length - 1) {
      setCurrentStepIdx((i) => i + 1)
    }
  }, [position?.lat, position?.lon, steps, currentStepIdx]) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    steps,
    currentStep:    steps[currentStepIdx] ?? null,
    currentStepIdx,
    totalSteps:     steps.length,
    loading,
    error,
  }
}
