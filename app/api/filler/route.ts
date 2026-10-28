import {NextRequest} from 'next/server';
import {detail} from '@/lib/tmdb';
import {fillers} from '@/lib/filler';
import {noKey,H,PUB,parseKey} from '@/lib/http';
export async function GET(req:NextRequest){const nk=noKey();if(nk)return nk;const k=parseKey(req.nextUrl.searchParams.get('key'));if(!k||k.media!=='tv')return Response.json({filler:[],mixed:[]},{headers:H});
 try{const d=await detail(k.media,k.id);if(d.kind!=='anime')return Response.json({filler:[],mixed:[]},{headers:PUB(86400)});const r=await fillers([d.en,d.orig.match(/[A-Za-z]/)?d.orig:'']);
  return Response.json(r||{filler:[],mixed:[]},{headers:PUB(86400)});}catch{return Response.json({filler:[],mixed:[]},{headers:H});}}
