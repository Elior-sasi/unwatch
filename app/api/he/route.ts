import {NextRequest} from 'next/server';
import {z} from 'zod';
import {detail} from '@/lib/tmdb';
import {heInfo,type HeInfo} from '@/lib/justwatch';
import {noKey,H,PUB,parseKey} from '@/lib/http';
// Hebrew dubbing and subtitles per service in Israel, for one title (GET) or the whole library (POST, short answers).
async function one(key:string):Promise<HeInfo>{const k=parseKey(key);if(!k)throw new Error('BAD');const d=await detail(k.media,k.id);
 return heInfo({imdb:d.imdb,title:d.title,orig:d.orig,en:d.en,year:d.year,media:k.media});}
export async function GET(req:NextRequest){const nk=noKey();if(nk)return nk;const key=req.nextUrl.searchParams.get('key')||'';
 try{return Response.json(await one(key),{headers:PUB(12*3600)});}catch(e){return Response.json({found:false,dub:null,subs:null,offers:[],page:null,error:e instanceof Error?e.message:''},{headers:H});}}
const body=z.object({keys:z.array(z.string().max(20)).max(60)});
export async function POST(req:NextRequest){const nk=noKey();if(nk)return nk;let keys:string[]=[];try{keys=body.parse(await req.json()).keys;}catch{return Response.json({error:'בקשה לא תקינה'},{status:400,headers:H});}
 const out:Record<string,{dub:boolean|null;subs:boolean|null;found:boolean;watch:{service:string;url:string|null}|null}>={};let i=0;
 await Promise.all(Array.from({length:4},async()=>{while(i<keys.length){const k=keys[i++];try{const r=await one(k);const w=r.offers.find(o=>o.type==='stream'||o.type==='free');out[k]={dub:r.dub,subs:r.subs,found:r.found,watch:w?{service:w.service,url:w.url}:null};}catch{}}}));
 return Response.json({he:out},{headers:H});}
