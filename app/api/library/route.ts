import {NextRequest} from 'next/server';
import {z} from 'zod';
import {auth} from '@/auth';
import {db,dbOn} from '@/lib/db';
import {merge,mergeRemoved} from '@/lib/library';
import {H} from '@/lib/http';
import type {Item} from '@/lib/types';
export const dynamic='force-dynamic';
const pos=z.object({s:z.number().int().min(0).max(999),e:z.number().int().min(0).max(9999)});
const item=z.object({key:z.string().regex(/^(tv|movie):\d{1,9}$/),media:z.enum(['tv','movie']),tmdb:z.number().int(),kind:z.enum(['anime','tv','movie']),title:z.string().max(300),orig:z.string().max(300),year:z.string().max(8),poster:z.string().max(300).nullable(),
 status:z.enum(['watching','plan','paused','done','dropped']),at:pos.nullable(),mid:pos.extend({min:z.number().int().min(0).max(999)}).nullable(),dub:z.boolean().nullable(),subs:z.boolean().nullable(),he:z.object({dub:z.boolean().nullable(),subs:z.boolean().nullable(),at:z.number()}).optional(),rating:z.number().min(0).max(10).nullable(),note:z.string().max(1000),added:z.number(),updated:z.number(),watchedAt:z.number().optional(),source:z.literal('cinema').optional()});
const body=z.object({items:z.array(item).max(3000),removed:z.record(z.string().max(20),z.number()).optional()});
async function who(){const s=await auth();const id=s?.user?.id;if(!id)throw new Error('UNAUTHORIZED');return id;}
export async function GET(){if(!dbOn())return Response.json({ok:false,code:'NO_DB'},{headers:H});
 try{const uid=await who();const {sql,ready}=db();await ready;const r=(await sql`select items,removed from unwatch_lib where user_id=${uid}`)[0];
  return Response.json({ok:true,items:r?.items||[],removed:r?.removed||{}},{headers:H});}catch{return Response.json({ok:false,code:'UNAUTHORIZED'},{status:401,headers:H});}}
export async function POST(req:NextRequest){if(req.headers.get('origin')!==req.nextUrl.origin)return Response.json({error:'בקשה לא מורשית'},{status:403,headers:H});
 if(!dbOn())return Response.json({ok:false,code:'NO_DB'},{headers:H});
 let uid='';try{uid=await who();}catch{return Response.json({ok:false,code:'UNAUTHORIZED'},{status:401,headers:H});}
 try{const b=body.parse(await req.json());const {sql,ready}=db();await ready;const r=(await sql`select items,removed from unwatch_lib where user_id=${uid}`)[0];
  const removed=mergeRemoved(r?.removed||{},b.removed||{});const items=merge((r?.items||[]) as Item[],b.items as Item[],removed);
  await sql`insert into unwatch_lib(user_id,items,removed) values(${uid},${JSON.stringify(items)},${JSON.stringify(removed)}) on conflict(user_id) do update set items=excluded.items,removed=excluded.removed,updated_at=now()`;
  return Response.json({ok:true,items,removed},{headers:H});}catch{return Response.json({ok:false,error:'השמירה נכשלה'},{status:400,headers:H});}}
