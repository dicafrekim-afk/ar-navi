import { useState, useEffect } from 'react'

/**
 * Simulated weather data for 세종시 (Sejong, South Korea).
 * Rotates through realistic spring conditions based on time of day.
 * Can be swapped for a real OpenWeatherMap fetch by replacing
 * getSimulatedWeather() with an API call.
 */

const CONDITIONS = [
  { label: '맑음',      color: '#FFD94A', temp: 13, humidity: 42, wind: 2.1 },
  { label: '구름 조금', color: '#B8D4F0', temp: 11, humidity: 58, wind: 3.4 },
  { label: '흐림',      color: '#9AAEC0', temp:  9, humidity: 72, wind: 4.8 },
  { label: '봄비',      color: '#6BA3D6', temp:  8, humidity: 88, wind: 5.3 },
]

function getSimulatedWeather() {
  const now    = new Date()
  const hour   = now.getHours()
  const date   = now.getDate()

  // Pick condition deterministically per day + 6-hour block
  const block  = Math.floor(hour / 6)
  const idx    = (date + block) % CONDITIONS.length
  const base   = CONDITIONS[idx]

  // Temperature peaks 13–17h (+3°C), coldest 3–6h (-3°C)
  const tempDelta =
    hour >= 13 && hour <= 17 ?  3 :
    hour >=  3 && hour <=  6 ? -3 : 0

  return {
    city:      '세종시',
    condition:  base.label,
    color:      base.color,
    temp:       base.temp + tempDelta,
    humidity:   base.humidity,
    wind:       base.wind,
    updatedAt:  now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
  }
}

export function useWeather() {
  const [weather, setWeather] = useState(getSimulatedWeather)

  useEffect(() => {
    // Refresh every 10 minutes
    const id = setInterval(() => setWeather(getSimulatedWeather()), 10 * 60 * 1000)
    return () => clearInterval(id)
  }, [])

  return weather
}
