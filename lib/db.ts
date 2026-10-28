import {neon} from '@neondatabase/serverless';
// Same Neon database as Unbox, Unstage and Unroute; Unwatch keeps to its own table.
const URL_=()=>process.env.DATABASE_URL||process.env.STORAGE_URL||process.env.POSTGRES_URL||'';
export const dbOn=()=>!!URL_();
let ready:Promise<unknown>|null=null;
export function db(){const sql=neon(URL_());
 ready??=sql`create table if not exists unwatch_lib(user_id text primary key,items jsonb not null default '[]',removed jsonb not null default '{}',updated_at timestamptz not null default now())`;
 return {sql,ready};}
