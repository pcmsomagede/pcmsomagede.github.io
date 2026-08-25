const CACHE='pcm-somagede-v20';
const SHELL=['/','/index.html','/style.css','/script.js','/fast-ui.js','/repair-v11.js','/quran-modern.js','/hadits-ui.js','/pustaka-modern.js','/visual-upgrade-v10.css','/site-v6.js','/arsip-ui.js','/arsip-preview.js','/media-config.js','/media-manifest.js','/manifest.webmanifest','/ornamen-muhammadiyah.svg','/motif-sudut-somagede.svg','/hero.jpg','/data/arsip-somagede.json','/data/quran-offline.json','/data/pustaka-books.json'];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(c=>Promise.allSettled(SHELL.map(u=>c.add(u+'?v=20').catch(()=>null)))).then(()=>self.skipWaiting()));
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

self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET'||!sameOrigin(req))return;
  const p=new URL(req.url).pathname;
  if(req.mode==='navigate'){
    event.respondWith(networkFirst(new Request('/index.html',{method:'GET',headers:req.headers,credentials:'same-origin',cache:'no-store'})));
    return;
  }
  if(/\.(js|css|json|png|jpe?g|webp|svg|webmanifest|pdf|html)$/.test(p))event.respondWith(networkFirst(req));
});