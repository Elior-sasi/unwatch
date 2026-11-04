import {NextRequest,NextResponse} from 'next/server';
import {tmdb,toHit} from '@/lib/tmdb';
import type {Hit,Media} from '@/lib/types';
export const dynamic='force-dynamic';
type Seed={key:string;title?:string;rating?:number|null;status?:string;kind?:string};
type Raw={id:number;title?:string;name?:string;original_title?:string;original_name?:string;release_date?:string;first_air_date?:string;poster_path?:string|null;overview?:string;genre_ids?:number[];original_language?:string;origin_country?:string[];vote_average?:number;vote_count?:number;adult?:boolean};
const moods:Record<string,{genres:string;label:string}>={happy:{genres:'35,10751,16',label:'קליל ומשמח'},excited:{genres:'28,12,878',label:'אקשן והרפתקאות'},calm:{genres:'18,10749',label:'רגוע ומרגש'},thoughtful:{genres:'9648,18,878',label:'מסתורי ומעורר מחשבה'},anime:{genres:'16,12,14',label:'אנימה ופנטזיה'},surprise:{genres:'12,35,16,18',label:'משהו מפתיע'},sad:{genres:'18,10749',label:'עצוב או מרגש'},angry:{genres:'28,53,80',label:'לפרוק עצבים'},scared:{genres:'27,53,9648',label:'פחד ומתח'},nostalgic:{genres:'16,10751,12',label:'נוסטלגיה'},tired:{genres:'35,16,10751',label:'בלי מאמץ'},dark:{genres:'80,9648,53',label:'אפל וכבד'},brainrot:{genres:'16,35,14',label:'הומור אבסורדי וכאוס'},wtf:{genres:'9648,878,14',label:'מוזר ומפתיע'},soBad:{genres:'35,878,27',label:'קאלט מוגזם ומשעשע'},confusing:{genres:'9648,878,53',label:'עלילות מסובכות ומפתיעות'},heartbreak:{genres:'18,10749',label:'דרמה וכאב רגשי'},battles:{genres:'28,12,16',label:'קרבות ואקשן מוגזם'}};
export async function POST(req:NextRequest){
 try{
  const body=await req.json();const mood=typeof body.mood==='string'?body.mood:'happy';
  if(!moods[mood])return NextResponse.json({error:'מצב רוח לא תקין'},{status:400});
  const seeds:Seed[]=Array.isArray(body.library)?body.library.filter((x:unknown)=>x&&typeof x==='object').slice(0,100):[];
  const existing=new Set(seeds.map(s=>s.key));
  const excluded=new Set(Array.isArray(body.exclude)?body.exclude.filter((k:unknown)=>typeof k==='string').slice(0,2000):[]);
  const page=Math.max(1,Math.min(50,Number.isInteger(body.page)?body.page:1));
  const disliked=new Set(Array.isArray(body.disliked)?body.disliked.filter((k:unknown)=>typeof k==='string').slice(0,1000):[]);
  const preferred=seeds.filter(s=>s.rating==null||s.rating>=6).sort((a,b)=>(b.rating||0)-(a.rating||0)).slice(0,8);
  const sources=await Promise.allSettled(preferred.map(async s=>{
   const m=/^(tv|movie):(\d+)$/.exec(s.key||'');if(!m)return [] as Raw[];
   const r=await tmdb<{results:Raw[]}>('/'+m[1]+'/'+m[2]+'/recommendations',{language:'en-US',page:1},3600);
   return r.results.slice(0,12).map(x=>({...x,_media:m[1]}));
  }));
  type Candidate=Raw&{_media:Media;_score:number};
  const pool=new Map<string,Candidate>();
  const add=(r:Raw,media:Media,bonus:number)=>{
   if(!r?.id||r.adult||!r.poster_path)return;
   const key=media+':'+r.id;if(existing.has(key)||disliked.has(key)||excluded.has(key))return;
   const genres=r.genre_ids||[];
   const wanted=moods[mood].genres.split(',').map(Number);
   const match=genres.filter(g=>wanted.includes(g)).length;
   if(!match&&mood!=='surprise')return;
   const score=bonus+match*4+Math.min(r.vote_average||0,10)/2+Math.min(r.vote_count||0,1000)/1000;
   const old=pool.get(key);if(!old||score>old._score)pool.set(key,{...r,_media:media,_score:score});
  };
  sources.forEach((s,i)=>{if(s.status==='fulfilled')s.value.forEach(r=>add(r,(r as Raw&{_media:Media})._media,10+(preferred[i]?.rating||0)));});
  const media:Media[]=mood==='anime'?['tv','movie']:['tv','movie'];
  await Promise.all(media.map(async m=>{
   const params:Record<string,string|number>={sort_by:'popularity.desc',with_genres:moods[mood].genres.replaceAll(',', '|'),include_adult:'false',vote_count_gte:40,page,language:'en-US'};
   if(mood==='anime'){params.with_genres='16';params.with_original_language='ja';}
   const r=await tmdb<{results:Raw[]}>('/discover/'+m,params,3600);
   r.results.forEach(x=>add(x,m,0));
  }));
  const results=[...pool.values()].sort((a,b)=>b._score-a._score).slice(0,18).map(r=>({
   ...toHit(r,undefined,r._media),
   reason:(()=>{const best=preferred.find(s=>{const match=s.key.match(/^(tv|movie):(\\d+)$/);return !!match&&sources[preferred.indexOf(s)]?.status==='fulfilled'&&(sources[preferred.indexOf(s)] as PromiseFulfilledResult<(Raw&{_media:Media})[]>).value.some(x=>x.id===r.id&&x._media===r._media);});return best?.title?'כי אהבת את '+best.title+' — ויש ביניהם דמיון בסגנון ובתוכן':preferred.length?'מבוסס על כותרים שאהבת בספרייה ועל מצב הרוח שבחרת':'מתאים לסגנון ולמצב הרוח שבחרת';})()
  }));
  return NextResponse.json({results,mood:moods[mood].label});
 }catch{return NextResponse.json({error:'לא ניתן לטעון המלצות כרגע'},{status:500});}
}
