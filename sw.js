const CACHE='pcm-somagede-v7';
const ASSETS=['/','/index.html','/style.css','/script.js','/fast-ui.js','/arsip-ui.js','/hero.jpg','/pimpinan-1.png','/pimpinan-2.png','/pimpinan-3.png','/pimpinan-4.png','/pimpinan-5.png','/pimpinan-6.jpeg','/pimpinan-7.jpeg'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS).catch(()=>{})).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
async function readBase(req,cache){const hit=await cache.match(req);if(hit)return hit;const res=await fetch(req,{cache:'no-store'});if(res.ok)cache.put(req,res.clone());return res}
self.addEventListener('fetch',event=>{if(event.request.method!=='GET')return;const url=new URL(event.request.url);
if(url.origin===location.origin){
 if(url.pathname==='/script.js'){
  event.respondWith((async()=>{const cache=await caches.open(CACHE);try{const [base,fast,arsip]=await Promise.all([readBase(event.request,cache),readBase(new Request('/fast-ui.js'),cache),readBase(new Request('/arsip-ui.js'),cache)]);const [bt,ft,at]=await Promise.all([base.text(),fast.text(),arsip.text()]);return new Response(bt+'\n/* FAST_UI_RUNTIME */\n'+ft+'\n/* ARSIP_UI_RUNTIME */\n'+at,{headers:{'Content-Type':'application/javascript; charset=utf-8','Cache-Control':'no-store'}})}catch(_){return cache.match('/script.js')||new Response('',{status:503})}})());
  return;
 }
 event.respondWith(caches.match(event.request).then(hit=>hit||fetch(event.request).then(res=>{if(res.ok)caches.open(CACHE).then(c=>c.put(event.request,res.clone()));return res}).catch(()=>caches.match('/'))));
 return;
}
if(url.origin==='https://api.aladhan.com'){event.respondWith(fetch(event.request,{cache:'no-store'}).then(res=>{caches.open(CACHE).then(c=>c.put(event.request,res.clone()));return res}).catch(()=>caches.match(event.request)||new Response('{}',{headers:{'Content-Type':'application/json'}})))}}
});