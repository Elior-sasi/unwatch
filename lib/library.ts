// The library lives on the phone and, when signed in, is synced to the server; the newer edit of each title wins.
import type {Item} from './types';
export type Removed=Record<string,number>;
export function merge(a:Item[],b:Item[],removed:Removed={}):Item[]{const m=new Map<string,Item>();
 for(const x of [...a,...b]){if(!x||!x.key)continue;const cur=m.get(x.key);if(!cur||x.updated>cur.updated)m.set(x.key,x);}
 return [...m.values()].filter(x=>!(removed[x.key]&&removed[x.key]>=x.updated));}
export function mergeRemoved(a:Removed,b:Removed):Removed{const out={...a};for(const [k,v] of Object.entries(b))if(!out[k]||v>out[k])out[k]=v;
 const old=Date.now()-400*864e5;for(const k of Object.keys(out))if(out[k]<old)delete out[k];return out;}
