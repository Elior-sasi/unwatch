// Temporary: shows how each Israeli cinema chain publishes its schedule, so Unwatch can read it.
export const dynamic='force-dynamic';export const maxDuration=30;
const UA={'user-agent':'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1','accept':'text/html,application/json,*/*','accept-language':'he-IL,he;q=0.9'};
async function text(url:string){const r=await fetch(url,{headers:UA,cache:'no-store',redirect:'follow',signal:AbortSignal.timeout(9000)});return {r,t:await r.text()};}
// Up to n short snippets around each word.
function around(t:string,words:string[],n=2,w=150){const out:string[]=[];for(const k of words){let i=-1;for(let c=0;c<n;c++){i=t.indexOf(k,i+1);if(i<0)break;out.push(k+': '+t.slice(Math.max(0,i-w/2),i+w).replace(/\s+/g,' '));}}return out;}
async function look(url:string,words:string[],extra?:(t:string)=>string){try{const {r,t}=await text(url);return url+'\n  '+r.status+' '+t.length+'b'+(t.trim().startsWith('{')||t.trim().startsWith('[')?'\n  JSON: '+t.slice(0,400):'')+'\n  '+around(t,words).join('\n  ')+(extra?'\n  '+extra(t):'');}
 catch(e){return url+'\n  ERR '+(e instanceof Error?e.message:'');}}
const scripts=(t:string)=>'scripts: '+[...new Set([...t.matchAll(/<script[^>]+src=["']([^"']+)/g)].map(m=>m[1]).filter(s=>!/google|facebook|gtm|analytics|hotjar|clarity|jquery|bootstrap|popper|polyfill|modernizr/.test(s)))].join(' ');
const urls=(t:string)=>'urls: '+[...new Set([...t.matchAll(/["'`]((?:https?:)?\/[^"'`\s]{0,40}(?:api|ajax|Order|order|Theater|theater|Movie|movie|Event|event|Show|show|Session|session|Schedule|schedule|Present|present)[^"'`\s]{0,80})["'`]/g)].map(m=>m[1]))].slice(0,40).join('\n    ');
export async function GET(){const out=await Promise.all([
 look('https://www.hotcinema.co.il/js/movie-order.js',['url','ajax','axios','fetch('],urls),
 look('https://www.hotcinema.co.il/js/theater-order.js',['url','ajax','axios','fetch('],urls),
 look('https://events.lev.co.il/wp-content/themes/lev/ajax_data.php?clang=he',['מדובב','date','time']),
 look('https://events.lev.co.il/wp-content/themes/lev/js/script.js',['ajax_data_url','ajax','action'],urls),
 look('https://ticket.lev.co.il/_nuxt/f5be03c.js',['baseURL','api'],urls)]);
 return new Response(out.join('\n\n'),{headers:{'content-type':'text/plain; charset=utf-8','cache-control':'no-store'}});}
