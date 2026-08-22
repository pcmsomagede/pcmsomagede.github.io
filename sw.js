const CACHE='pcm-somagede-v3';
const SHELL=['./','./index.html','./site-overrides.css','./site-overrides.js','./logo-gold.png','./header-bg.jpg'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()).then(()=>self.clients.matchAll()).then(clients=>Promise.all(clients.map(c=>c.navigate(c.url))))));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||e.request.url.includes('/auth/'))return;e.respondWith(fetch(e.request).then(r=>{if(r.ok||r.type==='opaque'){const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy)).catch(()=>{});}return r}).catch(()=>caches.match(e.request).then(hit=>hit||caches.match('./index.html'))));});
