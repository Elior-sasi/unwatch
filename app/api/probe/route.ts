// Temporary: shows how each Israeli cinema chain publishes its schedule, so Unwatch can read it.
export const dynamic='force-dynamic';export const maxDuration=30;
const UA={'user-agent':'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1','accept':'text/html,application/json,*/*','accept-language':'he-IL,he;q=0.9'};
const KEYS=['מדובב','מתורגם','dubbed','subbed','showtime','screening','veezi','vista','quickbook','biggerpicture','__NEXT_DATA__','wix-warmup-data','eventDateTime','sessionId','movieId','presentation','tickets.','booking','iframe'];
async function look(url:string){try{const r=await fetch(url,{headers:UA,cache:'no-store',redirect:'follow',signal:AbortSignal.timeout(9000)});const t=await r.text();
  const hits=KEYS.map(k=>[k,t.split(k).length-1] as const).filter(x=>x[1]>0).map(x=>x[0]+'×'+x[1]).join(' ');
  const ctx=['מדובב','eventDateTime','showtime','veezi','iframe'].map(k=>{const i=t.indexOf(k);return i<0?'':k+': '+t.slice(Math.max(0,i-90),i+110).replace(/\s+/g,' ');}).filter(Boolean).slice(0,3);
  const hosts=[...new Set([...t.matchAll(/(?:src|href|action)=["'](https?:\/\/[^"'\/]+)/g)].map(m=>m[1]).filter(h=>!/parastorage|wixstatic|google|facebook|gstatic|fonts|cdn|youtube|instagram|twitter|wix\.com|w3\.org|schema\.org/.test(h)))].slice(0,10);
  const scripts=[...new Set([...t.matchAll(/<script[^>]+src=["']([^"']+)/g)].map(m=>m[1]).filter(s=>!/parastorage|google|facebook|gtm|analytics|hotjar|clarity/.test(s)))].slice(0,8);
  return url+' -> '+r.url+'\n  '+r.status+' '+t.length+'b\n  keys: '+(hits||'-')+'\n  hosts: '+(hosts.join(' ')||'-')+'\n  scripts: '+(scripts.join(' ')||'-')+(ctx.length?'\n  '+ctx.join('\n  '):'');}
 catch(e){return url+'\n  ERR '+(e instanceof Error?e.message:'');}}
export async function GET(){const urls=['https://www.cinema-city.co.il/','https://www.cinema-city.co.il/movies','https://tickets.cinema-city.co.il/','https://www.hotcinema.co.il/','https://www.lev.co.il/','https://www.rav-hen.co.il/'];
 const out=await Promise.all(urls.map(look));return new Response(out.join('\n\n'),{headers:{'content-type':'text/plain; charset=utf-8','cache-control':'no-store'}});}
