import {NextRequest} from 'next/server';
import {season} from '@/lib/tmdb';
import {noKey,fail,PUB,H} from '@/lib/http';
export async function GET(req:NextRequest){const nk=noKey();if(nk)return nk;const id=Number(req.nextUrl.searchParams.get('id'));const n=Number(req.nextUrl.searchParams.get('n'));
 if(!Number.isInteger(id)||!Number.isInteger(n)||id<1||n<0)return Response.json({error:'בקשה לא תקינה'},{status:400,headers:H});
 try{return Response.json({episodes:await season(id,n)},{headers:PUB(6*3600)});}catch(e){return fail(e);}}
