// TMDB (themoviedb.org): titles, Hebrew names, seasons, episode dates, Israeli release dates and where to watch in Israel.
import type {Detail,Ep,Hit,Kind,Media,Provider,Providers,Summary} from './types';
const BASE='https://api.themoviedb.org/3';
const IMG='https://image.tmdb.org/t/p/';
export const tmdbOn=()=>!!(process.env.TMDB_TOKEN||process.env.TMDB_KEY);
type Q=Record<string,string|number|undefined>;
export async function tmdb<T=Record<string,unknown>>(path:string,params:Q={},revalidate=3600):Promise<T>{
 const key=(process.env.TMDB_KEY||'').trim();const token=(process.env.TMDB_TOKEN||'').trim()||(key.length>40?key:'');
 const u=new URL(BASE+path);if(!token&&key)u.searchParams.set('api_key',key);
 for(const [k,v] of Object.entries({language:'he-IL',...params}))if(v!==undefined&&v!=='')u.searchParams.set(k,String(v));
 const r=await fetch(u,{headers:token?{Authorization:'Bearer '+token,accept:'application/json'}:{accept:'application/json'},next:{revalidate}});
 if(!r.ok)throw new Error('TMDB_'+r.status);return r.json() as Promise<T>;}

export const img=(p:unknown,size='w342')=>typeof p==='string'&&p?IMG+size+p:null;
const HE=/[א-ת]/;
// Hebrew name when TMDB has one, otherwise the English name (an anime's Japanese original is not readable for most).
export function pickTitle(he:string|undefined,en:string|undefined,orig:string|undefined){if(he&&HE.test(he))return he;return en||he||orig||'';}
// Anime = animation that comes from Japan.
export function kindOf(media:Media,genres:number[],lang:string|undefined,countries:string[]=[]):Kind{
 if(genres.includes(16)&&(lang==='ja'||countries.includes('JP')))return 'anime';return media==='movie'?'movie':'tv';}
type Raw={id:number;media_type?:string;title?:string;name?:string;original_title?:string;original_name?:string;release_date?:string;first_air_date?:string;
 poster_path?:string|null;overview?:string;genre_ids?:number[];genres?:{id:number;name:string}[];original_language?:string;origin_country?:string[];popularity?:number};
export function toHit(he:Raw,en:Raw|undefined,media:Media):Hit{
 const genres=he.genre_ids||he.genres?.map(g=>g.id)||[];
 const title=pickTitle(he.title||he.name,en?.title||en?.name,he.original_title||he.original_name);
 const date=he.release_date||he.first_air_date||'';
 return {key:media+':'+he.id,media,tmdb:he.id,kind:kindOf(media,genres,he.original_language,he.origin_country),title,orig:he.original_title||he.original_name||'',
  year:date.slice(0,4),poster:img(he.poster_path||en?.poster_path),overview:(he.overview&&he.overview.trim())||en?.overview||'',release:media==='movie'&&date?date:undefined};}

export async function search(q:string):Promise<Hit[]>{
 const [he,en]=await Promise.all([tmdb<{results:Raw[]}>('/search/multi',{query:q,include_adult:'false'},600),tmdb<{results:Raw[]}>('/search/multi',{query:q,include_adult:'false',language:'en-US'},600)]);
 const enBy=new Map(en.results.map(r=>[r.media_type+':'+r.id,r]));
 return he.results.filter(r=>r.media_type==='tv'||r.media_type==='movie').map(r=>toHit(r,enBy.get(r.media_type+':'+r.id),r.media_type as Media)).slice(0,20);}

const ep=(x:{season_number?:number;episode_number?:number;air_date?:string;name?:string}|null|undefined):Ep|null=>x&&x.season_number!=null&&x.episode_number!=null?{s:x.season_number,e:x.episode_number,air:x.air_date||undefined,name:x.name||undefined}:null;
type WP={link?:string;flatrate?:{provider_name:string;logo_path?:string}[];rent?:{provider_name:string;logo_path?:string}[];buy?:{provider_name:string;logo_path?:string}[];ads?:{provider_name:string;logo_path?:string}[];free?:{provider_name:string;logo_path?:string}[]};
export function providersIL(all:Record<string,WP>|undefined):Providers{const p=all?.IL;const m=(l?:{provider_name:string;logo_path?:string}[]):Provider[]=>(l||[]).map(x=>({name:x.provider_name,logo:img(x.logo_path,'w92')}));
 return {stream:[...m(p?.flatrate),...m(p?.free),...m(p?.ads)],rent:m(p?.rent),buy:m(p?.buy),link:p?.link||null};}
// The cinema release date in Israel (type 3 theatrical, else limited 2), when TMDB knows it.
export function releaseIL(rd:{results?:{iso_3166_1:string;release_dates:{type:number;release_date:string}[]}[]}|undefined){
 const il=rd?.results?.find(r=>r.iso_3166_1==='IL');const d=il?.release_dates.find(x=>x.type===3)||il?.release_dates.find(x=>x.type===2);return d?d.release_date.slice(0,10):undefined;}

type DRaw=Raw&{backdrop_path?:string|null;runtime?:number;episode_run_time?:number[];status?:string;seasons?:{season_number:number;name:string;episode_count:number;air_date?:string}[];
 last_episode_to_air?:Parameters<typeof ep>[0];next_episode_to_air?:Parameters<typeof ep>[0];'watch/providers'?:{results:Record<string,WP>};release_dates?:Parameters<typeof releaseIL>[0];
 translations?:{translations:{iso_639_1:string}[]}};
export const STATUS_HE:Record<string,string>={'Returning Series':'ממשיכה','Ended':'הסתיימה','Canceled':'בוטלה','In Production':'בהפקה','Planned':'מתוכננת','Released':'יצא','Post Production':'בעריכה','Rumored':'שמועה'};
export async function detail(media:Media,id:number):Promise<Detail>{
 const extra=media==='movie'?'watch/providers,release_dates,translations':'watch/providers,translations';
 const [he,en]=await Promise.all([tmdb<DRaw>('/'+media+'/'+id,{append_to_response:extra},3*3600),tmdb<DRaw>('/'+media+'/'+id,{language:'en-US'},24*3600)]);
 const h=toHit(he,en,media);const rel=media==='movie'?releaseIL(he.release_dates)||h.release:undefined;
 return {...h,release:rel,backdrop:img(he.backdrop_path||en.backdrop_path,'w780'),genres:(he.genres||[]).map(g=>g.name),runtime:he.runtime||he.episode_run_time?.[0]||null,
  status:STATUS_HE[he.status||'']||he.status||'',seasons:(he.seasons||[]).filter(s=>s.season_number>0&&s.episode_count>0).map(s=>({n:s.season_number,name:s.name,count:s.episode_count,air:s.air_date||undefined})),
  last:ep(he.last_episode_to_air),next:ep(he.next_episode_to_air),providers:providersIL(he['watch/providers']?.results),
  heTitle:!!he.translations?.translations.some(t=>t.iso_639_1==='he')};}
export async function summary(media:Media,id:number):Promise<Summary>{const d=await detail(media,id);
 return {key:d.key,seasons:d.seasons.map(s=>({n:s.n,count:s.count})),last:d.last,next:d.next,status:d.status,stream:d.providers.stream.map(p=>p.name),release:d.release};}
export async function season(id:number,n:number){const s=await tmdb<{episodes:{episode_number:number;name:string;air_date?:string;runtime?:number;overview?:string}[]}>('/tv/'+id+'/season/'+n,{},6*3600);
 return s.episodes.map(e=>({e:e.episode_number,name:e.name&&!/^פרק \d+$|^Episode \d+$/.test(e.name)?e.name:'',air:e.air_date||undefined,runtime:e.runtime||null}));}
export async function cinema(){const [now,soon]=await Promise.all([tmdb<{results:Raw[]}>('/movie/now_playing',{region:'IL'},6*3600),tmdb<{results:Raw[]}>('/movie/upcoming',{region:'IL'},6*3600)]);
 const t=Date.now();const map=(l:Raw[])=>l.map(r=>toHit(r,undefined,'movie'));
 const nowIds=new Set(now.results.map(r=>r.id));
 return {now:map(now.results),soon:map(soon.results.filter(r=>!nowIds.has(r.id)&&r.release_date&&new Date(r.release_date).getTime()>t-864e5)).sort((a,b)=>(a.release||'').localeCompare(b.release||''))};}
