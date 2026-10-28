// AniList knows the exact minute a new anime episode airs in Japan; Unwatch shows it in Israel time.
const URL_='https://graphql.anilist.co';
const Q=`query($q:String){Page(perPage:6){media(search:$q,type:ANIME,status:RELEASING,isAdult:false){id title{romaji english native} nextAiringEpisode{airingAt episode}}}}`;
type M={id:number;title:{romaji?:string;english?:string|null;native?:string};nextAiringEpisode?:{airingAt:number;episode:number}|null};
const norm=(t:string)=>t.toLowerCase().replace(/season\s*\d+|part\s*\d+|\d+(st|nd|rd|th)\s*season|[^\p{L}\p{N}]+/gu,'');
// The currently airing entry whose name matches, and whose next episode lands within a day of TMDB's date (time zones).
export function pickAiring(list:M[],names:string[],tmdbDate?:string):{at:number;episode:number}|null{const want=names.filter(Boolean).map(norm);
 const ok=list.filter(m=>m.nextAiringEpisode&&[m.title.english,m.title.romaji,m.title.native].some(t=>t&&want.some(w=>w&&(norm(t).startsWith(w)||w.startsWith(norm(t))))));
 for(const m of ok){const at=m.nextAiringEpisode!.airingAt*1000;if(!tmdbDate||Math.abs(at-new Date(tmdbDate+'T12:00:00Z').getTime())<36*3600e3)return {at,episode:m.nextAiringEpisode!.episode};}
 return null;}
export async function airing(names:string[],tmdbDate?:string){for(const q of names.filter(Boolean).slice(0,2)){
  const r=await fetch(URL_,{method:'POST',headers:{'content-type':'application/json',accept:'application/json'},body:JSON.stringify({query:Q,variables:{q}}),next:{revalidate:3600}});
  if(!r.ok)continue;const j=await r.json() as {data?:{Page?:{media:M[]}}};const hit=pickAiring(j.data?.Page?.media||[],names,tmdbDate);if(hit)return hit;}
 return null;}
