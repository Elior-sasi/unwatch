import {NextRequest} from 'next/server';
import {search} from '@/lib/tmdb';
import {noKey,fail,PUB,H} from '@/lib/http';
export async function GET(req:NextRequest){const nk=noKey();if(nk)return nk;const q=(req.nextUrl.searchParams.get('q')||'').trim().slice(0,100);
 if(q.length<2)return Response.json({results:[]},{headers:H});
 try{return Response.json({results:await search(q)},{headers:PUB(600)});}catch(e){return fail(e);}}
