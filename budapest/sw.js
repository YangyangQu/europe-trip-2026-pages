/* Scoped to /budapest/ only; caches encrypted trip, never plaintext. */
const CACHE='budapest-locked-v1-20261118';
const CORE=['./','./index.html','./data.locked.json','./manifest.webmanifest','./icon.svg'];
self.addEventListener('install',event=>event.waitUntil((async()=>{const c=await caches.open(CACHE);await c.addAll(CORE);await self.skipWaiting()})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const k of await caches.keys())if(k.startsWith('budapest-locked-')&&k!==CACHE)await caches.delete(k);await self.clients.claim()})()));
self.addEventListener('fetch',event=>{const req=event.request;if(req.method!=='GET')return;const url=new URL(req.url);if(url.origin!==location.origin||!url.pathname.startsWith(new URL(self.registration.scope).pathname))return;event.respondWith((async()=>{const cache=await caches.open(CACHE);try{const r=await fetch(req);if(r.ok)await cache.put(req,r.clone());return r}catch(e){return (await cache.match(req)) || (req.mode==='navigate'?await cache.match('./index.html'):null) || Response.error()}})())});
