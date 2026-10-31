// Temporary: shows which Israeli cinema chains publish a schedule this server can read, to add them to Unwatch.
export const dynamic='force-dynamic';export const maxDuration=30;
const UA={'user-agent':'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1','accept':'text/html,application/json'};
async function look(url:string){try{const r=await fetch(url,{headers:UA,cache:'no-store',signal:AbortSignal.timeout(8000)});const t=await r.text();
  const apis=[...new Set([...t.matchAll(/["'(]((?:https?:\/\/[^"'()\s]*)?\/(?:api|data-api-service|rest|services?|ajax|wp-json|graphql|tickets?)\/[^"'()\s<>]{2,120})/gi)].map(m=>m[1]))].slice(0,14);
  return url+'\n  '+r.status+' '+(r.headers.get('content-type')||'').split(';')[0]+' '+t.length+'b'+(t.trim().startsWith('{')?' JSON: '+t.slice(0,220).replace(/\s+/g,' '):'')+(apis.length?'\n  '+apis.join('\n  '):'');}
 catch(e){return url+'\n  ERR '+(e instanceof Error?e.message:'');}}
export async function GET(){const d=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jerusalem'}).format(Date.now()+30*864e5);
 const urls=['https://www.cinema-city.co.il/','https://tickets.cinema-city.co.il/','https://www.hotcinema.co.il/','https://hotcinema.co.il/','https://www.lev.co.il/','https://www.rav-hen.co.il/',
  ...['10100','10101','10102','10103','10104','10105'].map(t=>'https://www.rav-hen.co.il/il/data-api-service/v1/quickbook/'+t+'/cinemas/with-event/until/'+d+'?attr=&lang=he_IL')];
 const out=await Promise.all(urls.map(look));return new Response(out.join('\n\n'),{headers:{'content-type':'text/plain; charset=utf-8','cache-control':'no-store'}});}
