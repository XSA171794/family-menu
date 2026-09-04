// sw.js — Service Worker for 家庭菜单手账 PWA
// 缓策略：缓存优先（cache-first），离线时直接从缓存读取

var CACHE_NAME = 'family-menu-v1';
var CACHE_FILES = [
  './family-menu.html',
  './sw.js'
];

// 安装时缓存核心文件
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(CACHE_FILES).catch(function(err) {
        // 即使缓存失败也继续，不阻塞安装
        console.log('缓存文件失败:', err);
      });
    })
  );
  self.skipWaiting();
});

// 激活时清理旧缓存
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

// 请求拦截：缓存优先，回退网络
self.addEventListener('fetch', function(event) {
  // 只处理GET请求
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(function(cached) {
      if (cached) {
        // 有缓存就用缓存，同时后台更新
        fetch(event.request).then(function(response) {
          if (response && response.status === 200) {
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(event.request, response.clone());
            });
          }
        }).catch(function() {});
        return cached;
      }
      // 没缓存就走网络
      return fetch(event.request).then(function(response) {
        // 成功的响应缓存起来
        if (response && response.status === 200 && response.type === 'basic') {
          var responseClone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      }).catch(function() {
        // 离线且无缓存，返回主页
        return caches.match('./family-menu.html');
      });
    })
  );
});
