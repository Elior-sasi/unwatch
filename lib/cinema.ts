// Planet cinemas in Israel (formerly Yes Planet) publish their schedule through the Vista "quickbook" service,
// the same one Cinema City uses abroad. Each screening carries attribute ids such as "dubbed" or "subbed".
export type Show={time:string;date:string;type:'dub'|'sub'|'orig';lang:string|null;format:string[];link:string|null;hall:string|null;soldOut:boolean};
export type CinemaFilm={id:string;name:string;year:string|null;poster:string|null;length:number|null;link:string|null;dub:boolean;sub:boolean;shows:(Show&{cinema:string})[]};
export type Cinema={id:string;name:string;city:string};
// Chains on the same system. Cinema ids are kept as "chain:id" ("p:1072", "rh:1058"); a bare number is a Planet cinema (older saved choices).
export type Chain='p'|'rh';
export const CHAINS:Record<Chain,{name:string;bases:string[];strip:RegExp}>={
 p:{name:'פלאנט',bases:['https://www.planetcinema.co.il/il/data-api-service/v1/quickbook/10100','https://www.yesplanet.co.il/il/data-api-service/v1/quickbook/10100'],strip:/^(יס )?פלאנט\s*/},
 rh:{name:'רב-חן',bases:['https://www.rav-hen.co.il/rh/data-api-service/v1/quickbook/10104'],strip:/^רב[ -]?חן\s*/}};
const base:Partial<Record<Chain,string>>={};
export const splitId=(id:string):{chain:Chain;id:string}=>{const m=id.match(/^(p|rh):(\d{1,8})$/);return m?{chain:m[1] as Chain,id:m[2]}:{chain:'p',id};};
async function get<T>(path:string,revalidate:number,chain:Chain='p'):Promise<T>{let last:unknown=null;const BASES=CHAINS[chain].bases;
 for(const b of base[chain]?[base[chain]!]:BASES){try{const r=await fetch(b+'/'+path,{headers:{accept:'application/json','user-agent':'Mozilla/5.0 Unwatch (personal)'},next:{revalidate}});
   if(!r.ok){last=new Error('CINEMA_'+r.status);continue;}const j=await r.json() as {body?:T};if(!j||!j.body){last=new Error('CINEMA_SHAPE');continue;}base[chain]=b;return j.body;}catch(e){last=e;}}
 throw last instanceof Error?last:new Error('CINEMA_DOWN');}
const iso=(d:Date)=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jerusalem'}).format(d);

// "Dubbed" can come from the screening's attributes or, as Israeli chains often do, from the film's own name.
const DUB_NAME=/מדובב|בדיבוב|דיבוב לעברית|\bdubbed\b|\(עברית\)|- עברית$/i;
const SUB_NAME=/מתורגם|כתוביות|\bsubbed\b|\(אנגלית\)|- אנגלית$/i;
export function classify(attrs:string[],filmName=''):{type:Show['type'];lang:string|null;format:string[]}{
 const a=attrs.map(x=>x.toLowerCase());
 const lang=(a.find(x=>/^(dubbed|original)-lang-/.test(x))||'').replace(/^(dubbed|original)-lang-/,'').slice(0,2)||null;
 const dub=a.some(x=>x==='dubbed'||x.startsWith('dubbed-lang-he')||x==='hebrew-dubbed'||x==='dub')||(!a.some(x=>x==='subbed')&&DUB_NAME.test(filmName));
 const sub=!dub&&(a.some(x=>x==='subbed'||x.startsWith('first-subbed-lang-he')||x.startsWith('subbed-lang-he'))||SUB_NAME.test(filmName));
 const format=a.filter(x=>/^(2d|3d|imax|4dx|screenx|vip|dolby|atmos|70-mm)/.test(x)).map(x=>x.toUpperCase().replace('-MM','mm'));
 return {type:dub?'dub':sub?'sub':'orig',lang,format};}
// Film names carry the language and format ("מואנה 2 מדובב 3D"); the plain name is what matches TMDB.
export function cleanName(n:string){return n.replace(/\(.*?\)/g,' ').replace(/מדובב|מתורגם|בדיבוב|דיבוב|עברית|אנגלית|כתוביות|\b(dubbed|subbed|2d|3d|imax|4dx|screenx|vip|hfr)\b/gi,' ').replace(/[-–:|]+\s*$/,'').replace(/\s+/g,' ').trim();}
export const norm=(t:string)=>cleanName(t).toLowerCase().replace(/[^\p{L}\p{N}]+/gu,'');

export async function cinemas():Promise<(Cinema&{chain:string})[]>{const until=iso(new Date(Date.now()+30*864e5));
 const all=await Promise.all((Object.keys(CHAINS) as Chain[]).map(async ch=>{try{const b=await get<{cinemas:{id:string;displayName:string;addressInfo?:{city?:string}}[]}>('cinemas/with-event/until/'+until+'?attr=&lang=he_IL',24*3600,ch);
   return (b.cinemas||[]).map(c=>({id:ch+':'+c.id,chain:CHAINS[ch].name,name:c.displayName.replace(CHAINS[ch].strip,'').trim()||c.displayName,city:c.addressInfo?.city||''}));}catch{return [];}}));
 const hot=[...await hotCinemas().catch(()=>[]),...await ccCinemas()];
 if(!all.flat().length&&!hot.length)throw new Error('CINEMA_DOWN');
 return [...all.flat(),...hot].sort((a,b)=>a.name.localeCompare(b.name,'he'));}

type VFilm={id:string;name:string;length?:number;posterLink?:string;link?:string;releaseYear?:string;attributeIds?:string[]};
type VEvent={id:string;filmId:string;eventDateTime:string;attributeIds?:string[];bookingLink?:string;bookingRouterLaunchLink?:string;auditorium?:string;soldOut?:boolean};
// Every film with screenings in the chosen cinemas over the next days, with each screening marked dub / sub / original.
export async function schedule(ids:string[],days=6):Promise<CinemaFilm[]>{const list=await cinemas().catch(()=>[] as (Cinema&{chain:string})[]);const names=new Map(list.map(c=>[c.id,c.name]));const chainOf=new Map(list.map(c=>[c.id,c.chain]));
 const dates=Array.from({length:days},(_,i)=>iso(new Date(Date.now()+i*864e5)));const films=new Map<string,CinemaFilm>();
 const jobs=ids.slice(0,3).map(c=>/^\d+$/.test(c)?'p:'+c:c).flatMap(c=>dates.map(d=>({c,d})));let i=0;
 await Promise.all(Array.from({length:6},async()=>{while(i<jobs.length){const {c,d}=jobs[i++];
  if(c.startsWith('hot:')){await hotDay(c,d,names.get(c)||'',films);continue;}
  if(c.startsWith('cc:')){await ccDay(c,d,names.get(c)||'',films);continue;}
  try{const sp=splitId(c);const b=await get<{films:VFilm[];events:VEvent[]}>('film-events/in-cinema/'+sp.id+'/at-date/'+d+'?attr=&lang=he_IL',1800,sp.chain);
   const fm=new Map((b.films||[]).map(f=>[f.id,f]));
   for(const e of b.events||[]){const f=fm.get(e.filmId);if(!f)continue;const cls=classify([...(e.attributeIds||[]),...(f.attributeIds||[])],f.name);
    const key=norm(f.name)||f.id;const cur=films.get(key)||{id:f.id,name:cleanName(f.name)||f.name,year:f.releaseYear||null,poster:f.posterLink||null,length:f.length||null,link:f.link||null,dub:false,sub:false,shows:[]};
    cur.shows.push({cinema:(names.get(c)||c)+(chainOf.get(c)&&chainOf.get(c)!=='פלאנט'?' ('+chainOf.get(c)+')':''),date:e.eventDateTime.slice(0,10),time:e.eventDateTime.slice(11,16),type:cls.type,lang:cls.lang,format:cls.format,link:e.bookingLink||e.bookingRouterLaunchLink||f.link||null,hall:e.auditorium||null,soldOut:!!e.soldOut});
    if(cls.type==='dub')cur.dub=true;if(cls.type==='sub')cur.sub=true;films.set(key,cur);}}catch{}}}));
 for(const f of films.values())f.shows.sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
 return [...films.values()].sort((a,b)=>b.shows.length-a.shows.length);}
// The cinema film that is this TMDB movie: same name (Hebrew or English), ignoring language and format words.
export function matchFilm(list:CinemaFilm[],names:string[]):CinemaFilm[]{const want=names.filter(Boolean).map(norm).filter(n=>n.length>1);
 // A longer name may add a subtitle ("Wicked: For Good"), but never a sequel number ("מואנה" is not "מואנה 2").
 const close=(a:string,b:string)=>{const [s,l]=a.length<=b.length?[a,b]:[b,a];return s.length>4&&l.startsWith(s)&&l.length-s.length<=12&&!/\d/.test(l.slice(s.length));};
 return list.filter(f=>{const n=norm(f.name);return want.some(w=>n===w||close(n,w));});}

// HOT Cinema: its own site answers with every screening of a branch on a date, each marked with its dubbing and subtitle language.
const HOT='https://www.hotcinema.co.il';
type HotDate={Date:string;Hour:string;EventId:string;DubbedLanguage:string|null;SubtitledLanguage:string|null;Is3D:boolean|null;IsAtmos?:boolean|null;IsVIP?:boolean|null};
const dmy=(iso_:string)=>{const [y,m,d]=iso_.split('-');return d+'/'+m+'/'+y;};
async function hotJson<T>(path:string,revalidate:number):Promise<T>{const r=await fetch(HOT+path,{headers:{accept:'application/json','user-agent':'Mozilla/5.0 Unwatch (personal)','x-requested-with':'XMLHttpRequest'},next:{revalidate}});
 if(!r.ok)throw new Error('HOT_'+r.status);return r.json() as Promise<T>;}
export function hotType(d:{DubbedLanguage:string|null;SubtitledLanguage:string|null}):Show['type']{const he=(x:string|null)=>!!x&&/עברית|hebrew/i.test(x);
 return he(d.DubbedLanguage)?'dub':he(d.SubtitledLanguage)?'sub':'orig';}
// Branches are found by asking which ids have screenings (once a day).
async function hotCinemas():Promise<(Cinema&{chain:string})[]>{const today=dmy(iso(new Date()));const ids=Array.from({length:45},(_,i)=>i+1);const out:(Cinema&{chain:string})[]=[];let i=0;
 await Promise.all(Array.from({length:8},async()=>{while(i<ids.length){const id=ids[i++];
  try{const r=await hotJson<{TheaterName:string;TheaterID:number}[]>('/tickets/movieevents?movieid=&date='+today+'&theatreid='+id+'&time=&type=',24*3600);
   const n=r.find(x=>x.TheaterID===id)?.TheaterName;if(n)out.push({id:'hot:'+id,chain:'HOT',name:n.replace(/^HOT CINEMA\s*/i,'').trim(),city:''});}catch{}}}));
 return out;}
async function hotDay(c:string,date:string,name:string,films:Map<string,CinemaFilm>){const id=c.slice(4);
 try{const r=await hotJson<{MovieName:string;MovieId:number;Dates:HotDate[]}[]>('/tickets/TheaterEvents?movieid=&date='+dmy(date)+'&theatreid='+id+'&site=',1800);
  for(const m of r){const key=norm(m.MovieName)||'hot'+m.MovieId;const cur=films.get(key)||{id:'hot'+m.MovieId,name:cleanName(m.MovieName)||m.MovieName,year:null,poster:null,length:null,link:HOT+'/movie/'+m.MovieId,dub:false,sub:false,shows:[]};
   for(const d of m.Dates||[]){if(!d.Date.startsWith(date))continue;const type=hotType(d);
    cur.shows.push({cinema:(name||'HOT')+' (HOT)',date,time:(d.Hour||d.Date.slice(11,16)).slice(0,5),type,lang:null,format:[d.Is3D?'3D':'',d.IsAtmos?'ATMOS':'',d.IsVIP?'VIP':''].filter(Boolean),link:HOT+'/theater/'+id,hall:null,soldOut:false});
    if(type==='dub')cur.dub=true;if(type==='sub')cur.sub=true;}
   if(cur.shows.length)films.set(key,cur);}}catch{}}

// Cinema City: its own ticket site blocks outside requests, so its schedule is read from seret.co.il,
// which lists every Cinema City branch with times and marks dubbed screenings ("מדובב").
const SERET='https://www.seret.co.il/movies/';
export const CC_TIDS:Record<string,string>={'112':'גלילות','154':'ראשון לציון','170':'ירושלים','178':'כפר סבא','209':'נתניה','229':'באר שבע','235':'חדרה','240':'אשדוד'};
const DAY:Record<string,number>={'ראשון':0,'א':0,'שני':1,'ב':1,'שלישי':2,'ג':2,'רביעי':3,'ד':3,'חמישי':4,'ה':4,'שישי':5,'ו':5,'שבת':6,'ש':6};
const text=(h:string)=>h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi,' ').replace(/<br\s*\/?>/gi,' ').replace(/<[^>]+>/g,' | ').replace(/&nbsp;/g,' ').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&amp;/g,'&');
// The date of a weekday name within the coming week (today counts as the first day).
export function dayDate(word:string,today:string):string|null{const w=word.replace(/^יום\s+/,'').replace(/['׳"״]/g,'').trim();if(w==='היום')return today;const d=DAY[w];if(d===undefined)return null;
 const t=new Date(today+'T12:00:00Z');const add=(d-t.getUTCDay()+7)%7;return new Date(t.getTime()+add*864e5).toISOString().slice(0,10);}
// One theatre page: film title links (s_movies.asp?MID=) followed by days, times, "מדובב" and hall numbers.
export function parseSeret(html:string,today:string):{mid:string;name:string;shows:{date:string;time:string;dub:boolean;hall:string|null}[]}[]{
 const parts=[...html.matchAll(/<a[^>]+href=["'][^"']*s_movies\.asp\?MID=(\d+)[^"']*["'][^>]*>([^<]{2,120})<\/a>/gi)];const out:{mid:string;name:string;shows:{date:string;time:string;dub:boolean;hall:string|null}[]}[]=[];
 for(let i=0;i<parts.length;i++){const m=parts[i];const name=m[2].replace(/\s+/g,' ').trim();if(!name||/^\d+$/.test(name))continue;
  const start=(m.index||0)+m[0].length;const end=i+1<parts.length?(parts[i+1].index||html.length):html.length;
  const toks=text(html.slice(start,end)).replace(/צפי\s*סיום:?\s*(?:[01]\d|2[0-3]):[0-5]\d(?:\s*\(\+1\))?/g,' ').split('|').map(x=>x.replace(/\s+/g,' ').trim()).filter(Boolean);let day:string|null=null;const shows:{date:string;time:string;dub:boolean;hall:string|null}[]=[];
  for(const tk of toks){for(const piece of tk.split(/(?=(?:[01]\d|2[0-3]):[0-5]\d)/)){const p=piece.trim();
   const dw=p.match(/^(?:היום|(?:יום\s+)?(?:ראשון|שני|שלישי|רביעי|חמישי|שישי|שבת|[אבגדהוש]['׳]?))(?=\s|$)/);if(dw){const d=dayDate(dw[0],today);if(d)day=d;}
   const tm=p.match(/^((?:[01]\d|2[0-3]):[0-5]\d)(\*)?/);
   if(tm&&day){const date=tm[2]?new Date(new Date(day+'T12:00:00Z').getTime()+864e5).toISOString().slice(0,10):day;shows.push({date,time:tm[1],dub:false,hall:(p.match(/אולם\s*(\d+)/)||[])[1]||null});}
   const last=shows[shows.length-1];if(last&&!tm){if(/מדובב/.test(p))last.dub=true;const h=p.match(/אולם\s*(\d+)/);if(h&&!last.hall)last.hall=h[1];}
   if(tm&&/מדובב/.test(p))shows[shows.length-1].dub=true;}}
  const prev=out.find(f=>f.mid===m[1]);if(prev)prev.shows.push(...shows);else if(shows.length)out.push({mid:m[1],name,shows});}
 return out;}
async function ccCinemas():Promise<(Cinema&{chain:string})[]>{return Object.entries(CC_TIDS).map(([id,n])=>({id:'cc:'+id,chain:'סינמה סיטי',name:n,city:''}));}
const ccPages=new Map<string,Promise<string>>();
async function ccDay(c:string,date:string,name:string,films:Map<string,CinemaFilm>){const tid=c.slice(3);
 try{const url=SERET+'s_theatres.asp?TID='+tid;let p=ccPages.get(url);if(!p){p=fetch(url,{headers:{'user-agent':'Mozilla/5.0 Unwatch (personal)','accept-language':'he-IL'},next:{revalidate:3600}}).then(r=>{if(!r.ok)throw new Error('SERET_'+r.status);return r.text();});ccPages.set(url,p);setTimeout(()=>ccPages.delete(url),60e3);}
  const today=iso(new Date());for(const f of parseSeret(await p,today)){const key=norm(f.name)||'cc'+f.mid;
   const cur=films.get(key)||{id:'cc'+f.mid,name:cleanName(f.name)||f.name,year:null,poster:null,length:null,link:SERET+'s_movies.asp?MID='+f.mid,dub:false,sub:false,shows:[]};let any=false;
   for(const s of f.shows){if(s.date!==date)continue;const type:Show['type']=s.dub||DUB_NAME.test(f.name)?'dub':'orig';any=true;
    cur.shows.push({cinema:(name||'סינמה סיטי')+' (סינמה סיטי)',date,time:s.time,type,lang:null,format:[],link:'https://www.cinema-city.co.il/',hall:s.hall?'אולם '+s.hall:null,soldOut:false});if(type==='dub')cur.dub=true;}
   if(any)films.set(key,cur);}}catch{}}
