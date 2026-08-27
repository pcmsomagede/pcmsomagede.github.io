const CACHE='pcm-somagede-v22';
const SHELL=['/','/index.html','/style.css','/script.js','/fast-ui.js','/repair-v11.js','/quran-modern.js','/hadits-ui.js','/hadits-ui-v7.js','/hadits-ui-v7-fix.js','/pustaka-modern.js','/pustaka-modern-v11.js','/visual-upgrade-v10.css','/site-v6.js','/arsip-ui.js','/arsip-preview.js','/media-config.js','/media-manifest.js','/manifest.webmanifest','/ornamen-muhammadiyah.svg','/motif-sudut-somagede.svg','/hero.jpg','/data/arsip-somagede.json','/data/quran-offline.json','/data/pustaka-books.json','/data/pustaka-catalog.json'];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(c=>Promise.allSettled(SHELL.map(u=>c.add(u+'?v=22').catch(()=>null)))).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('pcm-somagede-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});

const sameOrigin=req=>new URL(req.url).origin===self.location.origin;
const networkFirst=async req=>{
  const c=await caches.open(CACHE);
  try{
    const r=await fetch(req,{cache:'no-store'});
    if(r.ok){c.put(req,r.clone()).catch(()=>{});return r;}
    throw new Error('network '+r.status);
  }catch(e){
    return await c.match(req)||new Response('Offline',{status:503,headers:{'Content-Type':'text/plain;charset=utf-8'}});
  }
};
self.addEventListener('fetch',event=>{if(!sameOrigin(event.request)||event.request.method!=='GET')return;event.respondWith(networkFirst(event.request))});
