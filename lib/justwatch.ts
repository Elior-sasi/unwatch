// JustWatch (the source behind TMDB's "where to watch") also lists, per service in Israel, the audio and subtitle
// languages of each title. Unofficial GraphQL, no key; anything unexpected simply means "unknown".
export type Offer={service:string;icon:string|null;type:'stream'|'free'|'rent'|'buy';url:string|null;audio:string[];subs:string[];dub:boolean;heSubs:boolean};
export type HeInfo={found:boolean;dub:boolean|null;subs:boolean|null;offers:Offer[];page:string|null};
const URL_='https://apis.justwatch.com/graphql';
const Q=`query S($country:Country!,$language:Language!,$q:String!,$first:Int!){popularTitles(country:$country,first:$first,filter:{searchQuery:$q}){edges{node{id objectType
 content(country:$country,language:$language){title originalReleaseYear fullPath externalIds{imdbId}}
 offers(country:$country,platform:WEB){monetizationType standardWebURL package{clearName icon(profile:S100,format:PNG)} audioLanguages subtitleLanguages}}}}}`;
type JwOffer={monetizationType:string;standardWebURL?:string|null;package?:{clearName:string;icon?:string|null};audioLanguages?:string[]|null;subtitleLanguages?:string[]|null};
type JwNode={objectType:string;content:{title:string;originalReleaseYear?:number;fullPath?:string;externalIds?:{imdbId?:string|null}};offers?:JwOffer[]};
const HE=(l:string)=>/^(he|iw)(-|_|$)/i.test(l);
const TYPE:Record<string,Offer['type']>={FLATRATE:'stream',FLATRATE_AND_BUY:'stream',ADS:'free',FREE:'free',RENT:'rent',BUY:'buy'};
// Affiliate redirects and tracking parameters are stripped so the button opens the service itself.
export function cleanLink(u:string|null|undefined):string|null{if(!u)return null;try{let x=new URL(u);
 const inner=x.searchParams.get('u')||x.searchParams.get('r');if(inner&&/^https:\/\//.test(inner)&&!/netflix|disney|apple|amazon|primevideo|yes|hot|partner|cellcom|max/.test(x.hostname))x=new URL(inner);
 for(const k of [...x.searchParams.keys()])if(/^(utm_|at$|ct$|itsc|subId|ai$|aff|ref)/i.test(k))x.searchParams.delete(k);return x.toString();}catch{return null;}}
export function pickNode(nodes:JwNode[],want:{imdb?:string|null;title:string;orig?:string;year?:string;media:'tv'|'movie'}):JwNode|null{
 const type=want.media==='movie'?'MOVIE':'SHOW';const list=nodes.filter(n=>n.objectType===type);
 if(want.imdb){const hit=list.find(n=>n.content.externalIds?.imdbId===want.imdb);if(hit)return hit;}
 const norm=(t:string)=>t.toLowerCase().replace(/[^\p{L}\p{N}]+/gu,'');const names=[want.title,want.orig].filter(Boolean).map(t=>norm(t!));
 const y=+(want.year||0);return list.find(n=>names.includes(norm(n.content.title))&&(!y||!n.content.originalReleaseYear||Math.abs(n.content.originalReleaseYear-y)<=1))||null;}
export function summarize(node:JwNode|null):HeInfo{if(!node)return {found:false,dub:null,subs:null,offers:[],page:null};
 const seen=new Map<string,Offer>();
 for(const o of node.offers||[]){const t=TYPE[o.monetizationType];if(!t||!o.package)continue;const audio=o.audioLanguages||[];const subs=o.subtitleLanguages||[];
  const key=o.package.clearName+'|'+t;const cur=seen.get(key);
  const next:Offer={service:o.package.clearName,icon:o.package.icon?'https://images.justwatch.com'+o.package.icon.replace('{profile}','s100').replace('{format}','png'):null,type:t,url:cleanLink(o.standardWebURL),
   audio:[...new Set([...(cur?.audio||[]),...audio])],subs:[...new Set([...(cur?.subs||[]),...subs])],dub:false,heSubs:false};
  next.dub=next.audio.some(HE);next.heSubs=next.subs.some(HE);seen.set(key,next);}
 const offers=[...seen.values()].sort((a,b)=>['stream','free','rent','buy'].indexOf(a.type)-['stream','free','rent','buy'].indexOf(b.type));
 // Without any language data at all the answer is unknown, not "no".
 const known=offers.some(o=>o.audio.length||o.subs.length);
 return {found:true,dub:known?offers.some(o=>o.dub):null,subs:known?offers.some(o=>o.heSubs):null,offers,page:node.content.fullPath?'https://www.justwatch.com'+node.content.fullPath:null};}
async function query(q:string,language:string){const r=await fetch(URL_,{method:'POST',headers:{'content-type':'application/json','user-agent':'Mozilla/5.0 Unwatch'},
 body:JSON.stringify({query:Q,variables:{country:'IL',language,q,first:8}}),next:{revalidate:24*3600}});if(!r.ok)throw new Error('JW_'+r.status);
 const j=await r.json() as {data?:{popularTitles?:{edges:{node:JwNode}[]}};errors?:unknown};if(!j.data?.popularTitles)throw new Error('JW_SCHEMA');return j.data.popularTitles.edges.map(e=>e.node);}
export async function heInfo(want:{imdb?:string|null;title:string;orig?:string;en?:string;year?:string;media:'tv'|'movie'}):Promise<HeInfo>{
 for(const [q,lang] of [[want.en||want.orig||want.title,'en'],[want.title,'he'],[want.orig||'','en']] as const){if(!q)continue;
  const node=pickNode(await query(q,lang),{...want,orig:want.en||want.orig});if(node)return summarize(node);}
 return summarize(null);}
export {LANG_HE} from "./langs";
