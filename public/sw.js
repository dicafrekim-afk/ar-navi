const CACHE_NAME = 'ar-navi-v1'

// 앱 셸 파일 — 오프라인에서도 실행 가능하도록 캐시
const SHELL_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
]

// ── 설치: 앱 셸 캐시 ────────────────────────────────────────────────────────
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_URLS)),
  )
  self.skipWaiting()
})

// ── 활성화: 이전 버전 캐시 정리 ─────────────────────────────────────────────
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)),
      ),
    ),
  )
  self.clients.claim()
})

// ── fetch: 캐시 우선, 없으면 네트워크 ───────────────────────────────────────
self.addEventListener('fetch', (e) => {
  // 외부 API(Google Maps 등)는 캐시하지 않음
  if (!e.request.url.startsWith(self.location.origin)) return

  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached
      return fetch(e.request).then((res) => {
        // 성공 응답만 캐시 (opaque response 제외)
        if (res && res.status === 200 && res.type === 'basic') {
          const clone = res.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone))
        }
        return res
      })
    }),
  )
})
