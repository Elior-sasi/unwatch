import {tmdbOn} from './tmdb';
export const H={'Cache-Control':'private, no-store'};
export const PUB=(s:number)=>({'Cache-Control':'public, s-maxage='+s+', stale-while-revalidate='+s*4});
export function noKey(){return tmdbOn()?null:Response.json({error:'חסר מפתח TMDB בשרת',code:'NO_TMDB'},{status:503,headers:H});}
export function fail(e:unknown){const m=e instanceof Error?e.message:'';
 return Response.json({error:m==='TMDB_401'?'מפתח TMDB לא תקין':'לא הצלחתי לטעון כרגע. נסה שוב.',code:m||'ERR'},{status:m==='TMDB_404'?404:502,headers:H});}
export function parseKey(k:string|null){const m=(k||'').match(/^(tv|movie):(\d{1,9})$/);return m?{media:m[1] as 'tv'|'movie',id:+m[2]}:null;}
