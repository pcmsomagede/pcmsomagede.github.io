const CACHE='pcm-somagede-v2';
const ORIGIN='/';
const LEGACY='https://raw.githubusercontent.com/pcmsomagede/pcmsomagede.github.io/3b2322635ce06e956de78a411584373ff95b86e8/script.js';
const ASSETS=[ORIGIN,ORIGIN+'index.html',ORIGIN+'style.css',ORIGIN+'script.js',ORIGIN+'pimpinan-1.png',ORIGIN+'pimpinan-2.png',ORIGIN+'pimpinan-3.png',ORIGIN+'pimpinan-4.png',ORIGIN+'pimpinan-5.png',ORIGIN+'pimpinan-6.jpeg',ORIGIN+'pimpinan-7.jpeg',LEGACY];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(async cache=>{
    await Promise.all(ASSETS.map(async url=>{
      try{await cache.add(url);}catch(_){ }
    }));
    await self.skipWaiting();
  }));
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET') return;
  const url=new URL(req.url);
  if(url.origin==='https://api.aladhan.com'){
    event.respondWith((async()=>{
      const cache=await caches.open(CACHE);
      try{
        const res=await fetch(req,{cache:'no-store'});
        if(res.ok) cache.put(req,res.clone());
        return res;
      }catch(_){
        const hit=await cache.match(req);
        return hit||new Response('{}',{headers:{'Content-Type':'application/json'}});
      }
    })());
    return;
  }

  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    const hit=await cache.match(req);
    if(hit) return hit;
    try{
      const res=await fetch(req);
      if(res.ok || res.type==='opaque') cache.put(req,res.clone());
      return res;
    }catch(_){
      const fallback=await cache.match(ORIGIN);
      return fallback||new Response('Offline',{status:503,statusText:'Offline'});
    }
  })());
});