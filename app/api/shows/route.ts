import {NextRequest} from 'next/server';
import {z} from 'zod';
import {summary} from '@/lib/tmdb';
import {noKey,H,parseKey} from '@/lib/http';
import type {Summary} from '@/lib/types';
// Episode counts and next-episode dates for every title in the library, a few at a time.
const body=z.object({keys:z.array(z.string().max(20)).max(300)});
export async function POST(req:NextRequest){const nk=noKey();if(nk)return nk;
 let keys:string[]=[];try{keys=body.parse(await req.json()).keys;}catch{return Response.json({error:'בקשה לא תקינה'},{status:400,headers:H});}
 const out:Record<string,Summary>={};const list=[...new Set(keys)].map(parseKey).filter(Boolean) as {media:'tv'|'movie';id:number}[];let i=0;
 await Promise.all(Array.from({length:8},async()=>{while(i<list.length){const k=list[i++];try{const s=await summary(k.media,k.id);out[s.key]=s;}catch{}}}));
 return Response.json({shows:out},{headers:H});}
