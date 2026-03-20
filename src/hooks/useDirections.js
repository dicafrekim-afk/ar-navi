import { useState, useEffect, useRef, useCallback } from 'react'

const REFETCH_INTERVAL_MS = 30_000  // 30초마다 경로 재조회
const STEP_ADVANCE_M      = 15      // 스텝 끝지점 15m 이내 → 다음 스텝으로

// ─── 수학 유틸 ────────────────────────────────────────────────────────────────
function haversineMeters(lat1, lon1, lat2, lon2) {
  const R   = 6_371_000
  const rad = (d) => (d * Math.PI) / 180
  const dLat = rad(lat2 - lat1)
  const dLon = rad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
/**
 * useDirections
 *
 * Google Routes API v2를 통해 실제 보행 경로를 가져옵니다.
 *
 * 반환값:
 *   steps            Array<{endLocation, distanceMeters, maneuver, instructions}>
 *   loading          boolean
 *   error            string | null
 *   currentStepIndex number
 *   currentStep      step | null
 *   distanceToStep   meters | null
 */
export function useDirections({ position, active, apiKey, destination }) {
  const [steps,            setSteps]            = useState([])
  const [loading,          setLoading]          = useState(false)
  const [error,            setError]            = useState(null)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)

  const positionRef = useRef(null)
  positionRef.current = position

  // ── 경로 조회 함수 ──────────────────────────────────────────────────────────
  const fetchDirections = useCallback(async (pos) => {
    if (!apiKey || !pos || !destination) return
    setLoading(true)
    try {
      const res = await fetch(
        'https://routes.googleapis.com/directions/v2:computeRoutes',
        {
          method: 'POST',
          headers: {
            'Content-Type':   'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': [
              'routes.legs.steps.distanceMeters',
              'routes.legs.steps.endLocation',
              'routes.legs.steps.navigationInstruction',
            ].join(','),
          },
          body: JSON.stringify({
            origin: {
              location: { latLng: { latitude: pos.lat, longitude: pos.lon } },
            },
            destination: {
              location: {
                latLng: { latitude: destination.lat, longitude: destination.lon },
              },
            },
            travelMode:   'WALK',
            languageCode: 'ko',
          }),
        },
      )

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error?.message ?? `Routes API ${res.status}`)
      }

      const data  = await res.json()
      const route = data.routes?.[0]
      if (!route) throw new Error('경로를 찾을 수 없습니다.')

      const parsed = route.legs
        .flatMap((leg) => leg.steps)
        .map((step) => ({
          distanceMeters: step.distanceMeters ?? 0,
          endLocation: {
            lat: step.endLocation.latLng.latitude,
            lon: step.endLocation.latLng.longitude,
          },
          maneuver:     step.navigationInstruction?.maneuver     ?? 'STRAIGHT',
          instructions: step.navigationInstruction?.instructions ?? '직진',
        }))

      setSteps(parsed)
      setCurrentStepIndex(0)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [apiKey, destination])

  // ── 활성화 시 초기 조회 + 30초 재조회 ────────────────────────────────────
  useEffect(() => {
    if (!active) {
      setSteps([])
      setCurrentStepIndex(0)
      setError(null)
      return
    }
    if (!apiKey) {
      setError('VITE_GOOGLE_MAPS_API_KEY가 설정되지 않았습니다.')
      return
    }

    // GPS 안정화를 위해 2초 후 첫 조회
    const initTimer = setTimeout(() => {
      if (positionRef.current) fetchDirections(positionRef.current)
    }, 2000)

    // 30초마다 경로 재조회 (경로 이탈 대응)
    const refetchTimer = setInterval(() => {
      if (positionRef.current) fetchDirections(positionRef.current)
    }, REFETCH_INTERVAL_MS)

    return () => {
      clearTimeout(initTimer)
      clearInterval(refetchTimer)
    }
  }, [active, apiKey, fetchDirections])

  // ── 현재 스텝 추적 ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!position || !steps.length) return
    setCurrentStepIndex((prev) => {
      let idx = prev
      while (idx < steps.length - 1) {
        const { endLocation } = steps[idx]
        const dist = haversineMeters(
          position.lat, position.lon,
          endLocation.lat, endLocation.lon,
        )
        if (dist < STEP_ADVANCE_M) idx++
        else break
      }
      return idx
    })
  }, [position, steps])

  // ── 파생값 ─────────────────────────────────────────────────────────────────
  const currentStep    = steps[currentStepIndex] ?? null
  const distanceToStep = position && currentStep
    ? haversineMeters(
        position.lat, position.lon,
        currentStep.endLocation.lat, currentStep.endLocation.lon,
      )
    : null

  return { steps, loading, error, currentStepIndex, currentStep, distanceToStep }
}
