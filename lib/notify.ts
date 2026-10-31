// Phone notifications. Each phone is a "device" with its own push subscription and the list of titles it follows;
// a scheduled check (every 30 minutes) looks for news and sends each piece of news once.
import webpush from 'web-push';
import {db} from './db';
import {summary,detail} from './tmdb';
import {heInfo} from './justwatch';
import type {Summary} from './types';

export type Sub={endpoint:string;keys:{p256dh:string;auth:string}};
export type Prefs={ep:boolean;he:boolean;movie:boolean};
export type Follow={key:string;title:string;status:string;media:'tv'|'movie'};
export type TitleState={sum?:Summary|null;he?:{dub:boolean|null;subs:boolean|null;where:string|null;stream:string[]}|null;heAt?:number};
export type Note={id:string;title:string;body:string;url:string};

export async function tables(){const {sql,ready}=db();await ready;
 await sql`create table if not exists unwatch_meta(k text primary key,v jsonb not null)`;
 await sql`create table if not exists unwatch_push(device text primary key,subs jsonb not null default '[]',items jsonb not null default '[]',prefs jsonb not null default '{"ep":true,"he":true,"movie":true}',sent jsonb not null default '[]',updated_at timestamptz not null default now())`;
 await sql`create table if not exists unwatch_titles(key text primary key,state jsonb not null default '{}',checked_at timestamptz)`;
 return sql;}
// Keys are made once and kept in the database, so nothing extra has to be configured in Vercel.
export async function vapid(){const sql=await tables();const row=(await sql`select v from unwatch_meta where k='vapid'`)[0];if(row)return row.v as {publicKey:string;privateKey:string};
 const k=webpush.generateVAPIDKeys();await sql`insert into unwatch_meta(k,v) values('vapid',${JSON.stringify(k)}) on conflict(k) do nothing`;
 return ((await sql`select v from unwatch_meta where k='vapid'`)[0].v) as {publicKey:string;privateKey:string};}
export async function send(sub:Sub,n:Omit<Note,'id'>&{tag?:string}){const k=await vapid();
 try{await webpush.sendNotification(sub,JSON.stringify(n),{vapidDetails:{subject:'https://unwatch-one.vercel.app',publicKey:k.publicKey,privateKey:k.privateKey},TTL:86400,urgency:'normal'});return true;}
 catch(e){const c=(e as {statusCode?:number}).statusCode;if(c===404||c===410)return false;return true;}}

const ep=(e:{s:number;e:number})=>e.s+'-'+e.e;
const epText=(e:{s:number;e:number},seasons:number)=>seasons>1||e.s>1?'עונה '+e.s+' פרק '+e.e:'פרק '+e.e;
const hourIL=(t=Date.now())=>+new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Jerusalem',hour:'2-digit',hourCycle:'h23'}).format(t);
export const dayIL=(t=Date.now())=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jerusalem'}).format(t);
// What is new for one followed title, comparing the old and new state. Pure, so it is tested without a network.
export function news(f:Follow,prev:TitleState,cur:TitleState,prefs:Prefs,today=dayIL()):Note[]{const out:Note[]=[];const url='/?k='+encodeURIComponent(f.key);
 const s=cur.sum;
 if(prefs.ep&&f.media==='tv'&&(f.status==='watching'||f.status==='paused')&&s?.last){const was=prev.sum?.last;
  if(was&&(s.last.s>was.s||(s.last.s===was.s&&s.last.e>was.e)))out.push({id:'ep:'+f.key+':'+ep(s.last),title:f.title,body:'יצא '+epText(s.last,s.seasons.length)+(s.last.e===1?' - עונה חדשה!':''),url});}
 if(prefs.ep&&f.media==='tv'&&f.status==='plan'&&s?.last&&prev.sum&&!prev.sum.last)out.push({id:'start:'+f.key,title:f.title,body:'הסדרה מהרשימה שלך התחילה לשדר',url});
 if(prefs.he&&f.status!=='dropped'&&f.status!=='done'&&cur.he&&prev.he){const w=cur.he.where?' ב-'+cur.he.where:'';
  if(cur.he.dub&&!prev.he.dub)out.push({id:'dub:'+f.key,title:f.title,body:'הגיע דיבוב לעברית'+w,url});
  if(cur.he.subs&&!prev.he.subs)out.push({id:'subs:'+f.key,title:f.title,body:'הגיעו כתוביות בעברית'+w,url});}
 if(prefs.movie&&f.media==='movie'&&f.status==='plan'){
  if(s?.release&&s.release===today)out.push({id:'cinema:'+f.key,title:f.title,body:'יוצא היום בקולנוע בישראל',url});
  if(cur.he&&prev.he&&cur.he.stream.length&&!prev.he.stream.length)out.push({id:'stream:'+f.key,title:f.title,body:'זמין עכשיו לצפייה ב-'+cur.he.stream.slice(0,2).join(' ו-'),url});}
 return out;}

async function fresh(key:string,old:TitleState):Promise<TitleState>{const [media,id]=key.split(':');const out:TitleState={...old};
 try{out.sum=await summary(media as 'tv'|'movie',+id);}catch{}
 // Languages change slowly, so they are checked twice a day.
 if(!old.heAt||Date.now()-old.heAt>12*3600e3){try{const d=await detail(media as 'tv'|'movie',+id);const h=await heInfo({imdb:d.imdb,title:d.title,orig:d.orig,en:d.en,year:d.year,media:media as 'tv'|'movie'});
   const st=h.offers.filter(o=>o.type==='stream'||o.type==='free');const where=(st.find(o=>o.dub||o.heSubs)||st[0])?.service||null;
   out.he={dub:h.dub,subs:h.subs,where,stream:[...new Set(st.map(o=>o.service))]};out.heAt=Date.now();}catch{}}
 return out;}

export async function run(){const sql=await tables();
 const devices=await sql`select device,subs,items,prefs,sent from unwatch_push where jsonb_array_length(subs)>0`;
 const keys=[...new Set(devices.flatMap(d=>(d.items as Follow[]).map(f=>f.key)))].filter(k=>/^(tv|movie):\d+$/.test(k));
 const rows=keys.length?await sql`select key,state from unwatch_titles where key = any(${keys})`:[];const before=new Map(rows.map(r=>[r.key as string,r.state as TitleState]));
 // Titles checked longest ago first, up to a time budget.
 const order=keys.sort((a,b)=>((before.get(a)?.heAt||0)-(before.get(b)?.heAt||0))).slice(0,120);const after=new Map<string,TitleState>();let i=0;const stop=Date.now()+40e3;
 await Promise.all(Array.from({length:6},async()=>{while(i<order.length&&Date.now()<stop){const k=order[i++];after.set(k,await fresh(k,before.get(k)||{}));}}));
 const quiet=hourIL()<9||hourIL()>=23;let sent=0;
 for(const d of devices){const prefs={ep:true,he:true,movie:true,...(d.prefs as Partial<Prefs>)};const done=new Set(d.sent as string[]);let subs=d.subs as Sub[];const fresh_:string[]=[];
  for(const f of d.items as Follow[]){const cur=after.get(f.key);if(!cur)continue;const prev=before.get(f.key);if(!prev)continue;
   for(const n of news(f,prev,cur,prefs)){if(done.has(n.id))continue;if(quiet){continue;}
    const alive:Sub[]=[];for(const s of subs)if(await send(s,{title:n.title,body:n.body,url:n.url,tag:n.id}))alive.push(s);subs=alive;done.add(n.id);fresh_.push(n.id);sent++;}}
  if(fresh_.length||subs.length!==(d.subs as Sub[]).length)await sql`update unwatch_push set sent=${JSON.stringify([...done].slice(-800))},subs=${JSON.stringify(subs)} where device=${d.device}`;}
 // During quiet hours the old state is kept, so the news is still "new" in the morning.
 if(!quiet)for(const [k,v] of after)await sql`insert into unwatch_titles(key,state,checked_at) values(${k},${JSON.stringify(v)},now()) on conflict(key) do update set state=excluded.state,checked_at=now()`;
 else for(const [k,v] of after)if(!before.has(k))await sql`insert into unwatch_titles(key,state,checked_at) values(${k},${JSON.stringify(v)},now()) on conflict(key) do nothing`;
 return {devices:devices.length,titles:after.size,sent,quiet};}
