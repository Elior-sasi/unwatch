// Temporary: does Cinema City's own site (not the blocked ticket site) show screenings?
export const dynamic='force-dynamic';export const maxDuration=30;
const UA={'user-agent':'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1','accept-language':'he-IL,he;q=0.9'};
async function get(u:string){const r=await fetch(u,{headers:UA,cache:'no-store',signal:AbortSignal.timeout(9000)});return {s:r.status,t:await r.text()};}
export async function GET(){const out:string[]=[];
 try{const a=await get('https://www.cinema-city.co.il/movie-categories/now-playing');
  const links=[...new Set([...a.t.matchAll(/href="(https:\/\/www\.cinema-city\.co\.il\/[^"#?]+)"/g)].map(m=>m[1]).filter(h=>!/category|categories|about|contact|privacy|terms|accessib|blank|cinemas?$/.test(h)))].slice(0,25);
  out.push('now-playing '+a.s+'\n  links: '+links.join('\n  '));
  const apis=[...new Set([...a.t.matchAll(/["'](\/?_api\/[^"']{2,100}|https:\/\/[^"']*cinema-city[^"']*(?:api|json|event|show|present)[^"']{0,80})["']/gi)].map(m=>m[1]))].slice(0,15);out.push('apis: '+apis.join('\n  '));
  const movie=links.find(l=>/movie|film|seret|%D7/.test(l))||links[0];
  if(movie){const b=await get(movie);const times=[...b.t.matchAll(/(?<!\d)([01]\d|2[0-3]):[0-5]\d(?!\d)/g)].length;const i=b.t.search(/מדובב|כתוביות/);
   out.push(movie+' '+b.s+' '+b.t.length+'b times='+times+'\n  ticket links: '+[...new Set([...b.t.matchAll(/https:\/\/tickets\.cinema-city\.co\.il[^"'\s<]*/g)].map(m=>m[0]))].slice(0,6).join(' ')
    +'\n  around: '+(i<0?'-':b.t.slice(Math.max(0,i-250),i+350).replace(/\s+/g,' ')));}}catch(e){out.push('ERR '+(e instanceof Error?e.message:''));}
 return new Response(out.join('\n\n'),{headers:{'content-type':'text/plain; charset=utf-8','cache-control':'no-store'}});}
