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
 if(!all.flat().length)throw new Error('CINEMA_DOWN');
 return all.flat().sort((a,b)=>a.name.localeCompare(b.name,'he'));}

type VFilm={id:string;name:string;length?:number;posterLink?:string;link?:string;releaseYear?:string;attributeIds?:string[]};
type VEvent={id:string;filmId:string;eventDateTime:string;attributeIds?:string[];bookingLink?:string;bookingRouterLaunchLink?:string;auditorium?:string;soldOut?:boolean};
// Every film with screenings in the chosen cinemas over the next days, with each screening marked dub / sub / original.
export async function schedule(ids:string[],days=6):Promise<CinemaFilm[]>{const list=await cinemas().catch(()=>[] as (Cinema&{chain:string})[]);const names=new Map(list.map(c=>[c.id,c.name]));const chainOf=new Map(list.map(c=>[c.id,c.chain]));
 const dates=Array.from({length:days},(_,i)=>iso(new Date(Date.now()+i*864e5)));const films=new Map<string,CinemaFilm>();
 const jobs=ids.slice(0,3).map(c=>/^\d+$/.test(c)?'p:'+c:c).flatMap(c=>dates.map(d=>({c,d})));let i=0;
 await Promise.all(Array.from({length:6},async()=>{while(i<jobs.length){const {c,d}=jobs[i++];
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
