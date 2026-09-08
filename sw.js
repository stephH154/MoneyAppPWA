// 每日任務 PWA 離線快取
//
// 部署新版本時，把 CACHE_NAME 的版號往上加一（v1 -> v2）——瀏覽器靠這個字串判斷
// 「這是不是同一份快取」，版號沒變就永遠讀舊的快取內容，使用者會覺得「怎麼更新了畫面卻沒變」。
var CACHE_NAME = 'daily-task-cache-v58';

var CORE_ASSETS = [
  './',
  './index.html',
  './daily-task-calendar-guide.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(CORE_ASSETS);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (key) {
        return key !== CACHE_NAME;
      }).map(function (key) {
        return caches.delete(key);
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

// 策略：先讀快取（離線時馬上有東西可以顯示），同時背景重新抓一次網路版本更新快取
// （下次開啟就是新的）；只處理 GET，POST/PUT 之類的一律直接放行給網路，不快取。
self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(function (cached) {
      var networkFetch = fetch(event.request).then(function (response) {
        if (response && response.status === 200 && response.type === 'basic') {
          var copy = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(event.request, copy);
          });
        }
        return response;
      }).catch(function () {
        return cached;
      });
      return cached || networkFetch;
    })
  );
});
