import {NextRequest} from 'next/server';
import {detail} from '@/lib/tmdb';
import {noKey,fail,PUB,parseKey,H} from '@/lib/http';
export async function GET(req:NextRequest){const nk=noKey();if(nk)return nk;const k=parseKey(req.nextUrl.searchParams.get('key'));
 if(!k)return Response.json({error:'מזהה לא תקין'},{status:400,headers:H});
 try{return Response.json(await detail(k.media,k.id),{headers:PUB(3*3600)});}catch(e){return fail(e);}}
