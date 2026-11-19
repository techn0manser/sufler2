// Страница работает без интернета: модель — из кэша, остальное — сначала из сети (не дольше 3 с), при неудаче из кэша
const C='sufler-v1';
self.addEventListener('install',e=>e.waitUntil(caches.open(C).then(c=>c.addAll(['./','index.html','voice/timings.json'])).catch(()=>{}).then(()=>self.skipWaiting())));   // сразу кладём страницу и разметку в кэш
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('fetch',e=>{const q=e.request;if(q.method!='GET'||!q.url.startsWith(self.location.origin))return;
 const big=q.url.includes('/vosk/');
 e.respondWith((async()=>{const c=await caches.open(C);
  if(big){const m=await c.match(q);if(m)return m;const r=await fetch(q);if(r.ok)c.put(q,r.clone());return r}
  try{const r=await Promise.race([fetch(q),new Promise((_,no)=>setTimeout(()=>no(new Error('timeout')),3000))]);if(r.ok)c.put(q,r.clone());return r}
  catch(x){const m=await c.match(q,{ignoreSearch:true});if(m)return m;throw x}})())});
