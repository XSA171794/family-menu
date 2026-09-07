// sw.js — Service Worker for 家庭菜单手账 PWA
// 缓策略：网络优先（network-first），确保在线时总是拿到最新版本

var CACHE_NAME = 'family-menu-v4';
var CACHE_FILES = [
  './family-menu.html',
  './sw.js'
];

// 安装时预缓存核心文件
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(CACHE_FILES).catch(function(err) {
        console.log('预缓存失败:', err);
      });
    })
  );
  self.skipWaiting();
});

// 激活时清理所有旧缓存
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(
        names.map(function(name) {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 请求拦截：网络优先，离线回退缓存
self.addEventListener('fetch', function(event) {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request).then(function(response) {
      // 网络成功，缓存一份再返回
      if (response && response.status === 200 && response.type === 'basic') {
        var responseClone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, responseClone);
        });
      }
      return response;
    }).catch(function() {
      // 网络失败，从缓存读取
      return caches.match(event.request).then(function(cached) {
        if (cached) return cached;
        // 最终回退到主页
        return caches.match('./family-menu.html');
      });
    })
  );
});
