const CACHE="trip-github-v33-live-geneva";
const FILES=["./","./index.html","./styles.css","./app.js","./data.json","./manifest.webmanifest","./trip-icon.svg"];

self.addEventListener("install",event=>{
  event.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)));
  self.skipWaiting();
});
self.addEventListener("activate",event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener("fetch",event=>{
  const r=event.request;
  if(r.method!=="GET")return;
  const u=new URL(r.url);
  if(u.origin!==location.origin)return;
  event.respondWith((async()=>{
    const cached=await caches.match(r);
    if(cached){
      fetch(r).then(async net=>{
        if(net.ok){
          const c=await caches.open(CACHE);
          c.put(r,net.clone());
        }
      }).catch(()=>{});
      return cached;
    }
    try{
      const net=await fetch(r);
      if(net.ok){
        const c=await caches.open(CACHE);
        c.put(r,net.clone());
      }
      return net;
    }catch{
      if(r.mode==="navigate")return caches.match("./index.html");
      throw new Error("offline");
    }
  })());
});
