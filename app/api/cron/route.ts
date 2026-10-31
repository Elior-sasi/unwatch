import {dbOn} from '@/lib/db';
import {tables,run} from '@/lib/notify';
export const dynamic='force-dynamic';
export const maxDuration=60;
// Called every 30 minutes by GitHub Actions. It only looks for news and returns counts, so it needs no secret;
// a short cooldown keeps repeated calls cheap.
export async function GET(){if(!dbOn())return Response.json({ok:false,reason:'no-db'});
 const sql=await tables();const last=(await sql`select v from unwatch_meta where k='cron'`)[0]?.v as number|undefined;
 if(last&&Date.now()-last<12*60e3)return Response.json({ok:true,skipped:true});
 await sql`insert into unwatch_meta(k,v) values('cron',${JSON.stringify(Date.now())}) on conflict(k) do update set v=excluded.v`;
 try{return Response.json({ok:true,...await run()},{headers:{'Cache-Control':'no-store'}});}catch(e){return Response.json({ok:false,error:e instanceof Error?e.message.slice(0,120):'error'});}}
