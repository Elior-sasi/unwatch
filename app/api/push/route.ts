import {NextRequest} from 'next/server';
import {z} from 'zod';
import {dbOn} from '@/lib/db';
import {tables,vapid,send,type Sub} from '@/lib/notify';
import {H} from '@/lib/http';
export const dynamic='force-dynamic';
export async function GET(){if(!dbOn())return Response.json({enabled:false,publicKey:''},{headers:H});
 try{return Response.json({enabled:true,publicKey:(await vapid()).publicKey},{headers:H});}catch{return Response.json({enabled:false,publicKey:''},{headers:H});}}
const sub=z.object({endpoint:z.string().url().max(1000),keys:z.object({p256dh:z.string().max(200),auth:z.string().max(100)})});
const body=z.object({device:z.string().regex(/^[A-Za-z0-9_-]{16,64}$/),subscription:sub.optional(),remove:z.boolean().optional(),test:z.boolean().optional(),
 items:z.array(z.object({key:z.string().regex(/^(tv|movie):\d{1,9}$/),title:z.string().max(200),status:z.string().max(20),media:z.enum(['tv','movie'])})).max(400).optional(),
 prefs:z.object({ep:z.boolean(),he:z.boolean(),movie:z.boolean()}).optional()});
export async function POST(req:NextRequest){if(req.headers.get('origin')!==req.nextUrl.origin)return Response.json({error:'בקשה לא מורשית'},{status:403,headers:H});
 if(!dbOn())return Response.json({error:'ההתראות עוד לא הוגדרו בשרת',code:'NO_DB'},{status:503,headers:H});
 let b:z.infer<typeof body>;try{b=body.parse(await req.json());}catch{return Response.json({error:'בקשה לא תקינה'},{status:400,headers:H});}
 const sql=await tables();const row=(await sql`select subs from unwatch_push where device=${b.device}`)[0];
 if(b.remove){await sql`update unwatch_push set subs='[]' where device=${b.device}`;return Response.json({ok:true},{headers:H});}
 let subs=(row?.subs||[]) as Sub[];if(b.subscription)subs=[b.subscription as Sub,...subs.filter(s=>s.endpoint!==b.subscription!.endpoint)].slice(0,3);
 if(!row&&!b.subscription)return Response.json({ok:false},{headers:H});
 await sql`insert into unwatch_push(device,subs,items,prefs) values(${b.device},${JSON.stringify(subs)},${JSON.stringify(b.items||[])},${JSON.stringify(b.prefs||{ep:true,he:true,movie:true})})
  on conflict(device) do update set subs=excluded.subs,items=case when ${!!b.items} then excluded.items else unwatch_push.items end,prefs=case when ${!!b.prefs} then excluded.prefs else unwatch_push.prefs end,updated_at=now()`;
 if(b.subscription||b.test){let ok=0;for(const s of b.subscription?[b.subscription as Sub]:subs)if(await send(s,{title:'Unwatch',body:b.subscription?'ההתראות פעילות ✓':'התראת בדיקה ✓',url:'/',tag:'test'}))ok++;
  if(!ok)return Response.json({error:'ההתראה לא נשלחה. נסה לכבות ולהפעיל שוב.'},{status:502,headers:H});}
 return Response.json({ok:true,devices:subs.length},{headers:H});}
