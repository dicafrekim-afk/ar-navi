/** Haversine 거리 (km) */
export function haversine(lat1, lon1, lat2, lon2) {
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
export function initialBearing(lat1, lon1, lat2, lon2) {
  const rad = (d) => (d * Math.PI) / 180
  const dLon = rad(lon2 - lon1)
  const y = Math.sin(dLon) * Math.cos(rad(lat2))
  const x =
    Math.cos(rad(lat1)) * Math.sin(rad(lat2)) -
    Math.sin(rad(lat1)) * Math.cos(rad(lat2)) * Math.cos(dLon)
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
}

/** 각도 스무딩: 0/360 경계 wraparound 처리 */
export function smoothAngle(current, next, alpha) {
  if (current === null) return next
  let diff = next - current
  if (diff >  180) diff -= 360
  if (diff < -180) diff += 360
  return current + alpha * diff
}
