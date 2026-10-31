import {NextRequest} from 'next/server';
import {schedule,matchFilm} from '@/lib/cinema';
import {detail} from '@/lib/tmdb';
import {H,PUB,parseKey} from '@/lib/http';
export const maxDuration=30;
// ?c=1,2,3 the chosen cinemas; with ?key=movie:123 only that movie's screenings.
export async function GET(req:NextRequest){const ids=(req.nextUrl.searchParams.get('c')||'').split(',').filter(x=>/^((p|rh):)?\d{1,8}$/.test(x)).slice(0,3);
 if(!ids.length)return Response.json({films:[]},{headers:H});
 try{let films=await schedule(ids);const k=parseKey(req.nextUrl.searchParams.get('key'));
  if(k&&k.media==='movie'){const d=await detail('movie',k.id);films=matchFilm(films,[d.title,d.en,d.orig]);}
  return Response.json({films},{headers:PUB(900)});}
 catch(e){return Response.json({films:[],error:'לא הצלחתי להגיע ללוח ההקרנות של פלאנט כרגע.',code:e instanceof Error?e.message:''},{status:502,headers:H});}}
