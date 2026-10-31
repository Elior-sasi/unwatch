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
const opts=(t:string)=>'options: '+[...t.matchAll(/<option[^>]*value=["']?([^"' >]*)["']?[^>]*>([^<]{0,40})/g)].slice(0,30).map(m=>m[1]+'='+m[2].trim()).join(' | ');
async function hot(url:string){try{const {r,t}=await text(url);const j=JSON.parse(t);const a=Array.isArray(j)?j:[j];const f=a[0]||{};const d=(f.Dates||[])[0]||{};
  const slim=Object.fromEntries(Object.entries(f).filter(([k])=>k!=='Dates'));
  return url+'\n  '+r.status+' items='+a.length+'\n  item keys: '+Object.keys(f).join(',')+'\n  item: '+JSON.stringify(slim).slice(0,700)+'\n  Dates['+(f.Dates||[]).length+'][0]: '+JSON.stringify(d).slice(0,700)
   +'\n  types: '+[...new Set(a.map((x:{ScreeningType?:string;DubbedLanguage?:string;SubtitledLanguage?:string})=>x.ScreeningType+'/'+x.DubbedLanguage+'/'+x.SubtitledLanguage))].join(' | ');}
 catch(e){return url+'\n  ERR '+(e instanceof Error?e.message:'');}}
async function lev(url:string){try{const {r,t}=await text(url);const pc=[...t.matchAll(/pcode=(\d+)&(?:amp;)?loc=(\d+)/g)].slice(0,3).map(m=>m[0]);const i=t.search(/pcode=\d+/);
  return url+'\n  '+r.status+' '+t.length+'b pcodes: '+pc.join(' ')+'\n  around: '+(i<0?'-':t.slice(Math.max(0,i-900),i+300).replace(/\s+/g,' '));}catch(e){return url+'\n  ERR '+(e instanceof Error?e.message:'');}}
export async function GET(){const ymd=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jerusalem'}).format(new Date());const [y,m,dd]=ymd.split('-');const D=dd+'/'+m+'/'+y;
 const out=await Promise.all([
 hot('https://www.hotcinema.co.il/tickets/movieevents?movieid=&date='+D+'&theatreid=&time=&type='),
 hot('https://www.hotcinema.co.il/tickets/TheaterEvents?movieid=&date='+D+'&theatreid=16&site='),
 look('https://www.lev.co.il/',['loc=','locationfilter','סניף'],opts),
 lev('https://events.lev.co.il/wp-content/themes/lev/ajax_data.php?clang=he&action=movie_on_location&loc=1161&date='+D),
 lev('https://events.lev.co.il/wp-content/themes/lev/ajax_data.php?clang=he&action=movie_on_location&loc=1150&date='+D)]);
 return new Response(out.join('\n\n'),{headers:{'content-type':'text/plain; charset=utf-8','cache-control':'no-store'}});}
