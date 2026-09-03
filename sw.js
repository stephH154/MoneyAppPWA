// 小帳本 service worker -- 只做「離線也能開起 app 外殼」這件事，資料本身一直都在
// localStorage，跟這份快取無關。**每次改完 daily-ledger.html 真的要上版時，把下面
// APP_VERSION 的號碼加一**（跟 daily-ledger.html 裡同名常數的用途一樣，兩邊各自維護、
// 不用完全同步，但建議一起bump比較好記）——不改號碼的話舊裝置會一直吃到舊的快取內容，
// 感覺不出其實已經更新過。
const APP_VERSION = 'v1.2.1';
const CACHE_NAME = 'm-ledger-' + APP_VERSION;
const APP_SHELL = [
  './daily-ledger.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) { return cache.addAll(APP_SHELL); })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE_NAME; }).map(function (k) { return caches.delete(k); }));
    })
  );
  self.clients.claim();
});

// cache-first for same-origin GET requests (the app shell itself); cross-origin requests
// (Google Fonts) are just passed straight through -- if they fail offline the page already
// falls back to its system-font stack, no need for this worker to also cache/manage those.
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  var url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    caches.match(e.request).then(function (cached) {
      if (cached) return cached;
      return fetch(e.request).then(function (resp) {
        var copy = resp.clone();
        caches.open(CACHE_NAME).then(function (cache) { cache.put(e.request, copy); });
        return resp;
      }).catch(function () {
        if (e.request.mode === 'navigate') return caches.match('./daily-ledger.html');
      });
    })
  );
});
