'use client';
import {useCallback,useEffect,useId,useMemo,useRef,useState} from 'react';
import {Star,ExternalLink,Clapperboard,MonitorPlay as TrailerIcon,Users,Play,CalendarClock,Library,Search,Settings,X,Check,Plus,Minus,Pause,Trash2,Tv,Film,Sparkles,Languages,Captions,Mic,ChevronDown,Ticket,Download,Upload,LogIn,LogOut,RefreshCw,Clock} from 'lucide-react';
import {after,before,upNext,epLabel,whenText,daysTo,type Up} from '@/lib/progress';
import {merge,mergeRemoved,type Removed} from '@/lib/library';
import type {HeInfo,Offer} from '@/lib/justwatch';
import {LANG_HE} from '@/lib/langs';
import {KIND_LABEL,STATUS_LABEL,type Detail,type Hit,type Item,type Kind,type Status,type Summary} from '@/lib/types';

type User={name:string;email:string};
type Tab='up'|'soon'|'cinema'|'lib';
const TABS:[Tab,string,typeof Play][]=[['up','המשך',Play],['soon','בקרוב',CalendarClock],['cinema','קולנוע',Clapperboard],['lib','הספרייה',Library]];
const KIND_ICON:Record<Kind,typeof Tv>={anime:Sparkles,tv:Tv,movie:Film};
const LS={lib:'unwatch:lib',removed:'unwatch:removed',shows:'unwatch:shows',tab:'unwatch:tab',size:'unwatch:size'};
const read=<T,>(k:string,d:T):T=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v) as T:d;}catch{return d;}};
const write=(k:string,v:unknown)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch{}};
// Latin runs inside Hebrew text keep their order ("Jujutsu Kaisen 2").
const bidi=(t:string)=>t.replace(/[A-Za-z0-9][A-Za-z0-9 .:\/()+&'"!?-]*[A-Za-z0-9)!?]/g,m=>'⁦'+m+'⁩');
async function api<T>(url:string,init?:RequestInit):Promise<T>{const r=await fetch(url,init);const j=await r.json().catch(()=>({}));if(!r.ok)throw Object.assign(new Error(j.error||'שגיאה'),{code:j.code});return j as T;}
const cmp=(a:{s:number;e:number},b:{s:number;e:number})=>a.s-b.s||a.e-b.e;
const todayISO=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};

export function Mark({className}:{className?:string}){return <svg className={className} viewBox="40 40 100 110" aria-hidden="true">
 <defs><linearGradient id="mk-p" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#c4a8ff"/><stop offset="1" stopColor="#7c4dff"/></linearGradient></defs>
 <g className="lid"><rect x="44" y="44" width="92" height="26" rx="7" fill="url(#mk-p)"/><path d="M83 49.5 L101 57 L83 64.5Z" fill="#fff" stroke="#fff" strokeWidth="3" strokeLinejoin="round"/></g>
 <path className="u" d="M62 84 V112 a28 28 0 0 0 56 0 V84" fill="none" stroke="#fff" strokeWidth="22" strokeLinecap="round"/></svg>;}
function Loader({text}:{text:string}){return <div className="loader" role="status"><Mark className="lmark"/><p>{text}</p></div>;}
function Poster({src,kind}:{src:string|null;kind:Kind}){const I=KIND_ICON[kind];return <span className="poster">{src?<img src={src} alt="" loading="lazy" decoding="async" onLoad={e=>e.currentTarget.classList.add('in')}/>:<I size={26} aria-hidden="true"/>}</span>;}
function KindPill({kind}:{kind:Kind}){const I=KIND_ICON[kind];return <span className="pill"><I aria-hidden="true"/>{KIND_LABEL[kind]}</span>;}
// The user's own mark wins; otherwise what was found automatically for Israeli services.
const dubOf=(i:Item)=>i.dub??i.he?.dub??null;const subsOf=(i:Item)=>i.subs??i.he?.subs??null;
function HePills({it}:{it:Item}){return <>{dubOf(it)&&<span className="pill ok"><Mic aria-hidden="true"/>דיבוב</span>}{subsOf(it)&&<span className="pill ok"><Captions aria-hidden="true"/>כתוביות</span>}</>;}
const yn=(v:boolean|null|undefined)=>v===true?'יש':v===false?'אין':'לא ידוע';
const OFFER_TYPE:Record<Offer['type'],string>={stream:'במנוי',free:'חינם',rent:'השכרה',buy:'קנייה'};

// Focus moves to the close button once, when the sheet opens (not on every change, which scrolled it back to the top).
function useSheet(close:()=>void){const ref=useRef<HTMLButtonElement>(null);const fn=useRef(close);fn.current=close;
 useEffect(()=>{const back=document.activeElement as HTMLElement|null;ref.current?.focus({preventScroll:true});const k=(e:KeyboardEvent)=>{if(e.key==='Escape')fn.current();};window.addEventListener('keydown',k);document.body.style.overflow='hidden';
  return ()=>{window.removeEventListener('keydown',k);document.body.style.overflow='';back?.focus?.({preventScroll:true});};},[]);return ref;}

export default function App({canLogin,user,login,logout}:{canLogin:boolean;user:User|null;login:()=>Promise<void>;logout:()=>Promise<void>}){
 const [items,setItems]=useState<Item[]>([]);const [removed,setRemoved]=useState<Removed>({});const [shows,setShows]=useState<Record<string,Summary&{at?:number}>>({});
 const [ready,setReady]=useState(false);const [tab,setTab]=useState<Tab>('up');const [size,setSize]=useState('');
 const [openKey,setOpenKey]=useState<string|null>(null);const [hit,setHit]=useState<Hit|null>(null);const [searching,setSearching]=useState(false);const [settings,setSettings]=useState(false);
 const [toast,setToast]=useState<{text:string;undo?:()=>void}|null>(null);const [status,setStatus]=useState<{tmdb:boolean;db:boolean}|null>(null);
 const [splash,setSplash]=useState(2);const [syncing,setSyncing]=useState(false);
 const synced=useRef(false);const pending=useRef<ReturnType<typeof setTimeout>|null>(null);

 useEffect(()=>{setItems(read(LS.lib,[]));setRemoved(read(LS.removed,{}));setShows(read(LS.shows,{}));setTab(read(LS.tab,'up'));setSize(read(LS.size,''));setReady(true);
  const quick=matchMedia('(prefers-reduced-motion: reduce)').matches;setTimeout(()=>setSplash(0),quick?500:2500);
  api<{tmdb:boolean;db:boolean}>('/api/status').then(setStatus).catch(()=>{});},[]);
 useEffect(()=>{if(!toast)return;const t=setTimeout(()=>setToast(null),5000);return ()=>clearTimeout(t);},[toast]);

 const push=useCallback((list:Item[],rem:Removed)=>{if(!user||!synced.current)return;if(pending.current)clearTimeout(pending.current);
  pending.current=setTimeout(()=>{api<{ok:boolean;items?:Item[];removed?:Removed}>('/api/library',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({items:list,removed:rem})}).catch(()=>{});},1200);},[user]);
 const commit=useCallback((fn:(l:Item[])=>Item[],rem?:Removed)=>{setItems(prev=>{const next=fn(prev);write(LS.lib,next);const r=rem??read<Removed>(LS.removed,{});if(rem){write(LS.removed,rem);setRemoved(rem);}push(next,r);return next;});},[push]);
 // Signed in: the server copy and this phone's copy are merged once, then every change is sent up.
 const sync=useCallback(async()=>{if(!user)return;setSyncing(true);try{const r=await api<{ok:boolean;items:Item[];removed:Removed}>('/api/library');if(r.ok){const rem=mergeRemoved(read(LS.removed,{}),r.removed);
   const list=merge(read(LS.lib,[]),r.items,rem);write(LS.lib,list);write(LS.removed,rem);setItems(list);setRemoved(rem);synced.current=true;push(list,rem);}}catch{}finally{setSyncing(false);}},[user,push]);
 useEffect(()=>{if(ready)sync();},[ready,sync]);

 const upsert=useCallback((x:Item)=>commit(l=>[{...x,updated:Date.now()},...l.filter(i=>i.key!==x.key)]),[commit]);
 const remove=useCallback((key:string)=>{const it=items.find(i=>i.key===key);const rem={...read<Removed>(LS.removed,{}),[key]:Date.now()};commit(l=>l.filter(i=>i.key!==key),rem);
  if(it)setToast({text:'הוסר: '+it.title,undo:()=>{const r={...read<Removed>(LS.removed,{})};delete r[key];commit(l=>[{...it,updated:Date.now()},...l],r);}});},[items,commit]);

 // Episode counts and next-episode dates, refreshed every few hours.
 const loadShows=useCallback(async(force=false)=>{const cur=read<Record<string,Summary&{at?:number}>>(LS.shows,{});const keys=read<Item[]>(LS.lib,[]).filter(i=>i.media==='tv'||(i.media==='movie'&&i.status==='plan')).map(i=>i.key)
  .filter(k=>force||!cur[k]||Date.now()-(cur[k].at||0)>3*3600e3);if(!keys.length)return;
  try{const r=await api<{shows:Record<string,Summary>}>('/api/shows',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({keys:keys.slice(0,300)})});
   const next={...cur};for(const [k,v] of Object.entries(r.shows))next[k]={...v,at:Date.now()};write(LS.shows,next);setShows(next);}catch{}},[]);
 useEffect(()=>{if(ready)loadShows();},[ready,items.length,loadShows]);
 // Hebrew dubbing / subtitles for the whole library, checked in the background once a week per title.
 const heBusy=useRef(false);
 const loadHe=useCallback(async()=>{if(heBusy.current)return;const keys=read<Item[]>(LS.lib,[]).filter(i=>!i.he||Date.now()-i.he.at>7*864e5).map(i=>i.key).slice(0,40);if(!keys.length)return;heBusy.current=true;
  try{const r=await api<{he:Record<string,{dub:boolean|null;subs:boolean|null}>}>('/api/he',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({keys})});const now=Date.now();
   commit(l=>l.map(i=>r.he[i.key]?{...i,he:{dub:r.he[i.key].dub,subs:r.he[i.key].subs,at:now}}:keys.includes(i.key)?{...i,he:{dub:i.he?.dub??null,subs:i.he?.subs??null,at:now}}:i));}catch{}finally{heBusy.current=false;}},[commit]);
 useEffect(()=>{if(ready&&status?.tmdb)loadHe();},[ready,items.length,status,loadHe]);
 // Pull down at the top of the page to refresh.
 const [pull,setPull]=useState(0);const startY=useRef<number|null>(null);
 const refresh=async()=>{setPull(-1);await Promise.all([loadShows(true),sync()]);setPull(0);setToast({text:'עודכן'});};
 useEffect(()=>{const v=()=>{if(document.visibilityState==='visible')loadShows();};document.addEventListener('visibilitychange',v);return ()=>document.removeEventListener('visibilitychange',v);},[loadShows]);

 const goTab=(t:Tab)=>{setTab(t);write(LS.tab,t);window.scrollTo({top:0});};
 const open=(key:string,h?:Hit|null)=>{setHit(h||null);setOpenKey(key);};
 const markNext=(it:Item)=>{const sum=shows[it.key];if(!sum)return;const nx=after(it.at,sum.seasons);if(!nx)return;
  const more=after(nx,sum.seasons);const ended=!more&&/הסתיימה|בוטלה/.test(sum.status);
  upsert({...it,at:nx,mid:null,status:ended?'done':it.status==='plan'?'watching':it.status,watchedAt:Date.now()});
  setToast({text:'סומן: '+epLabel(nx,sum.seasons.length)+(ended?' - סיימת את הסדרה':''),undo:()=>upsert(it)});};

 const byKey=useMemo(()=>new Map(items.map(i=>[i.key,i])),[items]);
 const ups=useMemo(()=>items.filter(i=>i.media==='tv'&&(i.status==='watching')).map(i=>({it:i,up:shows[i.key]?upNext(i,shows[i.key]):null})),[items,shows]);
 const readyCount=ups.filter(x=>x.up?.state==='ready').length;
 const toWatch=[...ups].sort((a,b)=>{const r=(u:Up|null)=>u?.state==='ready'?0:u?.state==='wait'?1:2;return r(a.up)-r(b.up)||b.it.updated-a.it.updated;});
 const midMovies=items.filter(i=>i.media==='movie'&&i.status==='watching');
 const soon=useMemo(()=>{const t=todayISO();const out:{date:string;it:Item;label:string}[]=[];
  for(const it of items){if(it.status==='dropped')continue;const s=shows[it.key];
   if(it.media==='tv'&&s?.next?.air&&s.next.air>=t)out.push({date:s.next.air,it,label:epLabel(s.next,s.seasons.length)+(s.next.e===1?' - עונה חדשה':'')});
   if(it.media==='movie'&&it.status==='plan'){const d=s?.release;if(d&&d>=t)out.push({date:d,it,label:'יוצא'});}}
  return out.sort((a,b)=>a.date.localeCompare(b.date));},[items,shows]);

 const navRef=useRef<HTMLElement>(null);const [drag,setDrag]=useState<number|null>(null);
 const slide=(x:number,end:boolean)=>{const r=navRef.current?.getBoundingClientRect();if(!r)return;const i=Math.max(0,Math.min(3,Math.floor((r.right-x)/(r.width/4))));if(end){setDrag(null);goTab(TABS[i][0]);}else setDrag(i);};

 const cls='app'+(size?' '+size:'');
 return <main className={cls} onTouchStart={e=>{startY.current=window.scrollY<=0&&!openKey&&!searching&&!settings?e.touches[0].clientY:null;}}
  onTouchMove={e=>{if(startY.current==null||pull<0)return;const d=e.touches[0].clientY-startY.current;setPull(d>0?Math.min(d/2,90):0);}}
  onTouchEnd={()=>{if(pull>=70)refresh();else if(pull>0)setPull(0);startY.current=null;}}>
  {pull!==0&&<div className="ptr" style={{height:pull<0?56:pull}} aria-hidden="true"><RefreshCw className={pull<0?'spin':''} style={{transform:pull>0?'rotate('+pull*3+'deg)':undefined,opacity:pull<0?1:Math.min(1,pull/70)}}/></div>}
  {splash>0&&<div className={'splash'+(splash===1?' out':'')} aria-hidden="true" onAnimationEnd={e=>{if(e.target===e.currentTarget)setSplash(0);}}><Mark className="smark"/><div className="sname" dir="ltr">Unwatch</div></div>}
  <header className="row">
   <div className="brand" role="img" aria-label="Unwatch"><Mark/><span aria-hidden="true">nwatch</span></div>
   <div className="actions"><button className="ib" aria-label="חיפוש והוספה" onClick={()=>setSearching(true)}><Search/></button><button className="ib" aria-label="הגדרות" onClick={()=>setSettings(true)}><Settings/></button></div>
  </header>
  {status&&!status.tmdb&&<p className="note" role="status">חסר עדיין מפתח TMDB בשרת, אז חיפוש ותאריכי פרקים לא עובדים. ההוראות בהגדרות.</p>}

  {tab==='up'&&<section className="tabIn" aria-labelledby="h-up">
   <h1 id="h-up">ממשיכים לצפות</h1>
   <p className="sub">{readyCount?readyCount===1?'סדרה אחת מחכה לך':readyCount+' סדרות מחכות לך':ups.length?'אין פרקים חדשים כרגע':''}</p>
   {ready&&!ups.length&&!midMovies.length&&<div className="empty"><Play aria-hidden="true"/><p>עוד אין כאן כלום. חפש אנימה, סדרה או סרט וסמן "אני צופה".</p><button className="primary" style={{flex:"none",minWidth:200}} onClick={()=>setSearching(true)}><Search aria-hidden="true"/>חיפוש</button></div>}
   <ul className="list">{toWatch.map(({it,up},i)=>{const s=shows[it.key];return <li key={it.key} className="card rise" style={{'--i':i} as React.CSSProperties}>
    <button className="open" onClick={()=>open(it.key)} aria-label={it.title+', פרטים'}><Poster src={it.poster} kind={it.kind}/><div className="info"><div className="nm" dir="auto">{bidi(it.title)}</div>
     <div className="meta"><KindPill kind={it.kind}/><HePills it={it}/></div>
     <div className="next" key={up?.state==="ready"||up?.state==="wait"?up.ep.s+"-"+up.ep.e:up?.state||"x"}>{!up?<span className="shim" aria-label="טוען"/>:up.state==='ready'?<>הבא: {epLabel(up.ep,s.seasons.length)}{up.left>1&&<small>{up.left} פרקים מחכים</small>}</>:up.state==='wait'?<>{epLabel(up.ep,s.seasons.length)}<small>{up.air?'יוצא '+whenText(up.air):'עוד אין תאריך'}</small></>:up.state==='caught'?<>ראית הכל<small>{up.air?'הפרק הבא '+whenText(up.air):'מחכים לפרקים חדשים'}</small></>:<>ראית הכל<small>הסדרה הסתיימה</small></>}
      {it.mid&&<small><Clock size={14} aria-hidden="true"/> עצרת ב{epLabel(it.mid,s?.seasons.length||1)}, דקה {it.mid.min}</small>}</div></div></button>
    {up?.state==='ready'&&<div className="do"><button className="primary press" onClick={e=>{e.currentTarget.classList.remove('pop');void e.currentTarget.offsetWidth;e.currentTarget.classList.add('pop');markNext(it);}}><Check aria-hidden="true"/>צפיתי ב{epLabel(up.ep,s.seasons.length)}</button></div>}
    {up?.state==='ended'&&<div className="do"><button className="ghost" style={{flex:1}} onClick={()=>upsert({...it,status:'done'})}>להעביר לסיימתי</button></div>}
   </li>;})}
   {midMovies.map(it=><li key={it.key} className="card"><button className="open" onClick={()=>open(it.key)} aria-label={it.title+', פרטים'}><Poster src={it.poster} kind={it.kind}/><div className="info"><div className="nm" dir="auto">{bidi(it.title)}</div>
    <div className="meta"><KindPill kind={it.kind}/></div><div className="next">{it.mid?'עצרת בדקה '+it.mid.min:'באמצע'}</div></div></button>
    <div className="do"><button className="primary" onClick={()=>{upsert({...it,status:'done',mid:null,watchedAt:Date.now()});setToast({text:'סיימת: '+it.title,undo:()=>upsert(it)});}}><Check aria-hidden="true"/>סיימתי</button></div></li>)}</ul>
   {items.some(i=>i.status==='plan')&&<button className="ghost full" onClick={()=>goTab('lib')}>ברשימה לצפייה: {items.filter(i=>i.status==='plan').length}</button>}
  </section>}

  {tab==='soon'&&<section className="tabIn" aria-labelledby="h-soon"><h1 id="h-soon">בקרוב</h1><p className="sub">פרקים חדשים וסרטים שאתה מחכה להם</p>
   {!soon.length&&<div className="empty"><CalendarClock aria-hidden="true"/><p>אין תאריכים קרובים לכותרים שבספרייה.</p></div>}
   {Object.entries(soon.reduce<Record<string,typeof soon>>((g,x)=>{(g[x.date]||=[]).push(x);return g;},{})).map(([d,l])=><div key={d} className="day"><h2>{whenText(d)}{daysTo(d)>1&&daysTo(d)<7?'':''}<span className="sr"> {d}</span></h2>
    {l.map((x,n)=><button key={x.it.key} className="line rise" style={{'--i':n} as React.CSSProperties} onClick={()=>open(x.it.key)}><Poster src={x.it.poster} kind={x.it.kind}/><span className="info"><span className="nm" dir="auto">{bidi(x.it.title)}</span><span className="meta">{x.label} · {KIND_LABEL[x.it.kind]}</span></span></button>)}</div>)}
  </section>}

  {tab==='cinema'&&<Cinema open={open} byKey={byKey}/>}

  {tab==='lib'&&<Lib items={items} shows={shows} open={open}/>}

  <nav ref={navRef} aria-label="ניווט ראשי" className={drag!==null?'dragging':''} style={{'--tab':drag??TABS.findIndex(t=>t[0]===tab)} as React.CSSProperties}
   onTouchStart={e=>slide(e.touches[0].clientX,false)} onTouchMove={e=>slide(e.touches[0].clientX,false)} onTouchEnd={e=>slide(e.changedTouches[0].clientX,true)} onTouchCancel={()=>setDrag(null)}>
   {TABS.map(([k,label,I])=>{const n=k==='up'?readyCount:0;return <button key={k} className={tab===k?'selected':''} aria-current={tab===k?'page':undefined} aria-label={label+(n?', '+n+' מחכות':'')} onClick={()=>goTab(k)}>
    <span className="ni"><I size={20} aria-hidden="true"/>{n>0&&<b className="nb" aria-hidden="true">{n}</b>}</span><span aria-hidden="true">{label}</span></button>;})}
  </nav>

  {searching&&<SearchSheet close={()=>setSearching(false)} open={open} byKey={byKey}/>}
  {openKey&&<DetailSheet key={openKey} k={openKey} hit={hit} item={byKey.get(openKey)||null} close={()=>setOpenKey(null)} save={upsert} remove={k=>{remove(k);}} onSeen={()=>loadShows(true)} openOther={h=>open(h.key,h)}/>}
  {settings&&<SettingsSheet close={()=>setSettings(false)} size={size} setSize={v=>{setSize(v);write(LS.size,v);}} user={user} canLogin={canLogin} login={login} logout={logout} status={status} syncing={syncing} sync={sync}
   items={items} restore={list=>{commit(l=>merge(l,list,removed));setToast({text:'השחזור הושלם'});}}/>}
  <div aria-live="polite" key={toast?.text||''} className={toast?'toast':'sr'}>{toast&&<>{toast.text}{toast.undo&&<button onClick={()=>{toast.undo!();setToast(null);}}>ביטול</button>}</>}</div>
 </main>;}

function Cinema({open,byKey}:{open:(k:string,h?:Hit)=>void;byKey:Map<string,Item>}){const [d,setD]=useState<{now:Hit[];soon:Hit[]}|null>(null);const [err,setErr]=useState('');
 const load=useCallback(()=>{setErr('');api<{now:Hit[];soon:Hit[]}>('/api/cinema').then(setD).catch(e=>setErr(e.message));},[]);useEffect(load,[load]);
 const seen=[...byKey.values()].filter(i=>i.source==='cinema').sort((a,b)=>(b.watchedAt||0)-(a.watchedAt||0));
 return <section className="tabIn" aria-labelledby="h-cin"><h1 id="h-cin">קולנוע</h1><p className="sub">מה מוקרן עכשיו בישראל</p>
  {err&&<div className="note" role="alert">{err} <button className="ghost full" onClick={load}><RefreshCw aria-hidden="true"/>לנסות שוב</button></div>}
  {!d&&!err&&<Loader text="בודק מה בקולנוע…"/>}
  {d&&<><ul className="grid">{d.now.map((h,n)=><li key={h.key} className="rise" style={{'--i':n} as React.CSSProperties}><button className="tile" onClick={()=>open(h.key,h)}><Poster src={h.poster} kind={h.kind}/><span dir="auto">{bidi(h.title)}</span>{byKey.get(h.key)?.status==='done'&&<small>ראית ✓</small>}</button></li>)}</ul>
   {d.soon.length>0&&<><h2 className="sec">בקרוב לקולנוע</h2><div>{d.soon.slice(0,20).map(h=><button key={h.key} className="line" style={{marginTop:8}} onClick={()=>open(h.key,h)}><Poster src={h.poster} kind={h.kind}/><span className="info"><span className="nm" dir="auto">{bidi(h.title)}</span><span className="meta">{h.release?whenText(h.release):''}</span></span></button>)}</div></>}</>}
  {seen.length>0&&<><h2 className="sec">ראיתי בקולנוע</h2><div>{seen.map(i=><button key={i.key} className="line" style={{marginTop:8}} onClick={()=>open(i.key)}><Poster src={i.poster} kind={i.kind}/><span className="info"><span className="nm" dir="auto">{bidi(i.title)}</span><span className="meta">{i.watchedAt?new Date(i.watchedAt).toLocaleDateString('he-IL'):''}</span></span></button>)}</div></>}
 </section>;}

function Lib({items,shows,open}:{items:Item[];shows:Record<string,Summary>;open:(k:string)=>void}){const [kind,setKind]=useState<Kind|''>('');const [st,setSt]=useState<Status|''>('');const [he,setHe]=useState<''|'dub'|'subs'>('');const [q,setQ]=useState('');
 const list=items.filter(i=>(!kind||i.kind===kind)&&(!st||i.status===st)&&(!he||(he==='dub'?dubOf(i):subsOf(i)))&&(!q||(i.title+' '+i.orig).toLowerCase().includes(q.toLowerCase()))).sort((a,b)=>b.updated-a.updated);
 const count=(k:Kind)=>items.filter(i=>i.kind===k).length;
 return <section className="tabIn" aria-labelledby="h-lib"><h1 id="h-lib">הספרייה</h1><p className="sub">{items.length} כותרים</p>
  <div className="chips" role="group" aria-label="סוג"><button className="chip" aria-pressed={!kind} onClick={()=>setKind('')}>הכל</button>{(['anime','tv','movie'] as Kind[]).map(k=><button key={k} className="chip" aria-pressed={kind===k} onClick={()=>setKind(kind===k?'':k)}>{k==='anime'?'אנימה':k==='tv'?'סדרות':'סרטים'} <b>{count(k)}</b></button>)}</div>
  <div className="chips" role="group" aria-label="מצב">{(Object.keys(STATUS_LABEL) as Status[]).map(s=><button key={s} className="chip" aria-pressed={st===s} onClick={()=>setSt(st===s?'':s)}>{STATUS_LABEL[s]}</button>)}<button className="chip" aria-pressed={he==='dub'} onClick={()=>setHe(he==='dub'?'':'dub')}><Mic size={16} aria-hidden="true"/>דיבוב</button><button className="chip" aria-pressed={he==='subs'} onClick={()=>setHe(he==='subs'?'':'subs')}><Captions size={16} aria-hidden="true"/>כתוביות</button></div>
  {items.length>6&&<label className="search"><Search size={20} aria-hidden="true"/><span className="sr">חיפוש בספרייה</span><input value={q} onChange={e=>setQ(e.target.value)} placeholder="חיפוש בספרייה" enterKeyHint="search"/></label>}
  {!list.length&&<div className="empty"><Library aria-hidden="true"/><p>{items.length?'אין כותרים שמתאימים לסינון.':'הספרייה ריקה.'}</p></div>}
  <ul className="list">{list.map((i,n)=>{const s=shows[i.key];return <li key={i.key} className="rise" style={{'--i':n} as React.CSSProperties}><button className="card open" onClick={()=>open(i.key)}><Poster src={i.poster} kind={i.kind}/><span className="info"><span className="nm" dir="auto">{bidi(i.title)}</span>
   <span className="meta"><KindPill kind={i.kind}/><span className="pill dim">{STATUS_LABEL[i.status]}</span><HePills it={i}/></span>
   <span className="meta">{i.media==='tv'?(i.at?'ראית עד '+epLabel(i.at,s?.seasons.length||1):'עוד לא התחלת'):i.year}</span></span></button></li>;})}</ul>
 </section>;}

function SearchSheet({close,open,byKey}:{close:()=>void;open:(k:string,h:Hit)=>void;byKey:Map<string,Item>}){const ref=useSheet(close);const [q,setQ]=useState('');const [res,setRes]=useState<Hit[]|null>(null);const [err,setErr]=useState('');const inp=useRef<HTMLInputElement>(null);
 useEffect(()=>{inp.current?.focus();},[]);
 useEffect(()=>{const t=q.trim();if(t.length<2){setRes(null);return;}const h=setTimeout(()=>{setErr('');api<{results:Hit[]}>('/api/search?q='+encodeURIComponent(t)).then(r=>setRes(r.results)).catch(e=>setErr(e.message));},350);return ()=>clearTimeout(h);},[q]);
 return <div className="sheet" role="dialog" aria-modal="true" aria-label="חיפוש"><div className="sheetTop"><h2 style={{margin:0}}>חיפוש</h2><button ref={ref} className="ib" aria-label="סגירה" onClick={close}><X/></button></div>
  <label className="search"><Search size={20} aria-hidden="true"/><span className="sr">שם של אנימה, סדרה או סרט</span><input ref={inp} value={q} onChange={e=>setQ(e.target.value)} placeholder="אנימה, סדרה או סרט" enterKeyHint="search" autoComplete="off"/></label>
  {err&&<p className="note" role="alert">{err}</p>}
  <div role="status" className="sr">{res?res.length+' תוצאות':''}</div>
  {res&&!res.length&&<p className="setNote">לא נמצא. נסה בעברית או באנגלית.</p>}
  <div style={{marginTop:12}}>{res?.map((h,n)=>{const have=byKey.get(h.key);return <button key={h.key} className="line rise" style={{'--i':n,marginTop:8} as React.CSSProperties} onClick={()=>open(h.key,h)}><Poster src={h.poster} kind={h.kind}/><span className="info"><span className="nm" dir="auto">{bidi(h.title)}</span>
   <span className="meta">{KIND_LABEL[h.kind]}{h.year&&' · '+h.year}{have&&' · '+STATUS_LABEL[have.status]}</span></span></button>;})}</div>
 </div>;}

function Tri({label,icon:I,value,set}:{label:string;icon:typeof Mic;value:boolean|null;set:(v:boolean|null)=>void}){const id=useId();return <div style={{marginTop:12}}>
 <div className="setNote" style={{display:'flex',alignItems:'center',gap:6,margin:'0 0 6px'}}><I size={18} aria-hidden="true"/><span id={id}>{label}</span></div>
 <div className="seg" role="group" aria-labelledby={id}>{([[null,'אוטומטי'],[true,'יש'],[false,'אין']] as const).map(([v,t])=><button key={t} aria-pressed={value===v} onClick={()=>set(v)}>{t}</button>)}</div></div>;}

function DetailSheet({k,hit,item,close,save,remove,onSeen,openOther}:{k:string;hit:Hit|null;item:Item|null;close:()=>void;save:(x:Item)=>void;remove:(k:string)=>void;onSeen:()=>void;openOther:(h:Hit)=>void}){
 const ref=useSheet(close);const [d,setD]=useState<Detail|null>(null);const [err,setErr]=useState('');const [eps,setEps]=useState<Record<number,{e:number;name:string;air?:string;runtime:number|null}[]>>({});
 const [heI,setHeI]=useState<HeInfo|null>(null);
 useEffect(()=>{api<Detail>('/api/title?key='+encodeURIComponent(k)).then(setD).catch(e=>setErr(e.message));api<HeInfo>('/api/he?key='+encodeURIComponent(k)).then(setHeI).catch(()=>setHeI({found:false,dub:null,subs:null,offers:[],page:null}));},[k]);
 const base=d||hit;const kind=(base?.kind||item?.kind||'tv') as Kind;const title=base?.title||item?.title||'';const media=(base?.media||item?.media||'tv');
 const make=(status:Status):Item=>({key:k,media,tmdb:base?.tmdb||item?.tmdb||0,kind,title,orig:base?.orig||'',year:base?.year||'',poster:base?.poster||item?.poster||null,status,at:null,mid:null,dub:null,subs:null,rating:null,note:'',added:Date.now(),updated:Date.now()});
 const set=(p:Partial<Item>)=>{save({...(item||make('plan')),...p});if(!item)onSeen();};
 const seasons=d?.seasons||[];const nSeasons=seasons.length;
 const loadSeason=(n:number)=>{if(eps[n]||!base)return;api<{episodes:{e:number;name:string;air?:string;runtime:number|null}[]}>('/api/season?id='+base.tmdb+'&n='+n).then(r=>setEps(x=>({...x,[n]:r.episodes}))).catch(()=>{});};
 const at=item?.at||null;const nx=after(at,seasons.map(s=>({n:s.n,count:s.count})));
 const today=todayISO();const [midMin,setMidMin]=useState(String(item?.mid?.min||''));
 return <div className="sheet" role="dialog" aria-modal="true" aria-label={title||'פרטים'}>
  <div className="sheetTop"><span/><button ref={ref} className="ib" aria-label="סגירה" onClick={close}><X/></button></div>
  {err&&!base&&<p className="note" role="alert">{err}</p>}
  {base&&<>
   <div className="hero">{d?.backdrop&&<img className="bd" src={d.backdrop} alt=""/>}<Poster src={base.poster} kind={kind}/><div><h2 dir="auto">{bidi(title)}</h2>{base.orig&&base.orig!==title&&<div className="orig" dir="auto">{base.orig}</div>}
    <div className="meta"><KindPill kind={kind}/>{base.year&&<span>{base.year}</span>}{d?.status&&media==='tv'&&<span>· {d.status}</span>}{d?.runtime?<span>· {d.runtime} דק׳</span>:null}</div></div></div>
   {d?.genres.length?<p className="setNote">{d.genres.join(' · ')}</p>:null}
   {base.overview&&<p className="over" dir="auto">{base.overview}</p>}
   {d?.cast.length?<p className="setNote"><Users size={16} aria-hidden="true"/> {d.cast.map(bidi).join(' · ')}</p>:null}
   {d?.trailer&&<a className="ghost full" href={d.trailer} target="_blank" rel="noopener noreferrer"><TrailerIcon aria-hidden="true"/>טריילר<span className="sr"> (נפתח ביוטיוב)</span></a>}
   {media==='tv'&&d?.next?.air&&<p className="setNote"><CalendarClock size={16} aria-hidden="true"/> הפרק הבא: {epLabel(d.next,nSeasons)} - {whenText(d.next.air)}</p>}
   {media==='movie'&&base.release&&base.release>=today&&<p className="setNote"><Ticket size={16} aria-hidden="true"/> בקולנוע בישראל: {whenText(base.release)}</p>}

   {!item?<div className="do" style={{flexWrap:'wrap'}}>
     <button className="primary" onClick={()=>set({status:media==='movie'?'done':'watching',...(media==='movie'?{watchedAt:Date.now()}:{})})}>{media==='movie'?<><Check aria-hidden="true"/>ראיתי</>:<><Play aria-hidden="true"/>אני צופה</>}</button>
     <button className="ghost" style={{flex:1}} onClick={()=>set({status:'plan'})}><Plus aria-hidden="true"/>לרשימה</button>
     {media==='movie'&&<button className="ghost full" onClick={()=>set({status:'done',watchedAt:Date.now(),source:'cinema'})}><Ticket aria-hidden="true"/>ראיתי בקולנוע</button>}</div>
   :<section className="set" aria-labelledby="h-st"><h3 id="h-st">מצב</h3><div className="seg" role="group" aria-labelledby="h-st">{(Object.keys(STATUS_LABEL) as Status[]).map(s=><button key={s} aria-pressed={item.status===s} onClick={()=>set({status:s,...(s==='done'&&media==='movie'&&!item.watchedAt?{watchedAt:Date.now()}:{})})}>{STATUS_LABEL[s]}</button>)}</div>
     {(item.status==='done'||item.status==='dropped')&&<div style={{marginTop:12}}><p className="setNote" id="h-rate" style={{margin:'0 0 6px'}}>דירוג</p><div className="stars" role="group" aria-labelledby="h-rate">{[1,2,3,4,5].map(n=><button key={n} aria-label={n+' כוכבים'} aria-pressed={(item.rating||0)>=n*2} onClick={()=>set({rating:item.rating===n*2?null:n*2})}><Star aria-hidden="true"/></button>)}</div></div>}
     {media==='movie'&&item.status==='done'&&<button className="ghost full" aria-pressed={item.source==='cinema'} onClick={()=>set({source:item.source==='cinema'?undefined:'cinema'})}><Ticket aria-hidden="true"/>{item.source==='cinema'?'ראיתי בקולנוע ✓':'ראיתי בקולנוע'}</button>}</section>}

   {item&&media==='tv'&&nSeasons>0&&<section className="set" aria-labelledby="h-at"><h3 id="h-at"><Pause aria-hidden="true"/>איפה עצרתי</h3>
    <div className="step"><button className="ib" aria-label="פרק אחד אחורה" disabled={!at} onClick={()=>set({at:at?before(at,seasons):null,mid:null})}><Minus/></button>
     <b aria-live="polite">{at?'ראיתי עד '+epLabel(at,nSeasons):'עוד לא התחלתי'}</b>
     <button className="ib" aria-label="צפיתי בפרק הבא" disabled={!nx} onClick={()=>set({at:nx,mid:null,status:item.status==='plan'?'watching':item.status,watchedAt:Date.now()})}><Plus/></button></div>
    {nx&&<label className="field">עצרתי באמצע {epLabel(nx,nSeasons)}, בדקה:<input inputMode="numeric" pattern="[0-9]*" value={midMin} onChange={e=>setMidMin(e.target.value.replace(/\D/g,'').slice(0,3))}
     onBlur={()=>set({mid:midMin?{s:nx.s,e:nx.e,min:+midMin}:null})} placeholder="למשל 14"/></label>}
    {seasons.map(s=><details key={s.n} className="fold" onToggle={e=>{if((e.target as HTMLDetailsElement).open)loadSeason(s.n);}}><summary><span>{nSeasons>1?'עונה '+s.n:'פרקים'} <span className="setNote" style={{display:'inline'}}>· {s.count} פרקים</span></span><ChevronDown size={20} aria-hidden="true"/></summary>
     <div>{!eps[s.n]?<p className="setNote" role="status">טוען…</p>:<ul className="eps">{eps[s.n].map(e=>{const pos={s:s.n,e:e.e};const w=!!at&&cmp(pos,at)<=0;const out=!e.air||e.air<=today;
      return <li key={e.e}><button className={w?'on':''} aria-pressed={w} disabled={!out&&!w} onClick={()=>set({at:w&&at&&cmp(pos,at)===0?before(pos,seasons):pos,mid:null,status:item.status==='plan'?'watching':item.status,watchedAt:Date.now()})}
       aria-label={'פרק '+e.e+(e.name?', '+e.name:'')+(w?', נצפה':'')+(!out&&e.air?', יוצא '+whenText(e.air):'')}>
       <span className="ck">{w&&<Check aria-hidden="true"/>}</span><span className="t"><span dir="auto">{e.e}. {e.name?bidi(e.name):'פרק '+e.e}</span><small>{e.air?(out?new Date(e.air+'T00:00').toLocaleDateString('he-IL'):'יוצא '+whenText(e.air)):''}{e.runtime?' · '+e.runtime+' דק׳':''}</small></span></button></li>;})}</ul>}</div></details>)}
   </section>}
   {item&&media==='movie'&&item.status==='watching'&&<section className="set"><h3><Pause aria-hidden="true"/>איפה עצרתי</h3><label className="field">עצרתי בדקה:<input inputMode="numeric" pattern="[0-9]*" value={midMin} onChange={e=>setMidMin(e.target.value.replace(/\D/g,'').slice(0,3))} onBlur={()=>set({mid:midMin?{s:0,e:0,min:+midMin}:null})} placeholder="למשל 40"/></label></section>}

   <section className="set" aria-labelledby="h-he"><h3 id="h-he"><Languages aria-hidden="true"/>בעברית ואיפה לראות</h3>
    {!heI?<p className="setNote" role="status">בודק דיבוב וכתוביות…</p>:<>
     <div className="yn"><div><Mic aria-hidden="true"/><span>דיבוב לעברית</span><b className={heI.dub?'y':''}>{yn(item?.dub??heI.dub)}</b></div><div><Captions aria-hidden="true"/><span>כתוביות בעברית</span><b className={heI.subs?'y':''}>{yn(item?.subs??heI.subs)}</b></div></div>
     {heI.offers.length>0?<ul className="offers">{heI.offers.map(o=><li key={o.service+o.type}><a className="offer" href={o.url||heI.page||'#'} target="_blank" rel="noopener noreferrer" aria-label={o.service+', '+OFFER_TYPE[o.type]+'. דיבוב לעברית: '+(o.audio.length?(o.dub?'יש':'אין'):'לא ידוע')+'. כתוביות בעברית: '+(o.subs.length?(o.heSubs?'יש':'אין'):'לא ידוע')+'. נפתח בשירות'}>
       {o.icon?<img src={o.icon} alt=""/>:<Tv aria-hidden="true"/>}<span className="t"><b>{o.service}</b><small>{OFFER_TYPE[o.type]}{o.audio.length?' · שמע: '+o.audio.map(l=>LANG_HE[l.slice(0,2)]||l).join(', '):''}</small>
       <span className="tags">{o.dub&&<span className="pill ok"><Mic aria-hidden="true"/>דיבוב</span>}{o.heSubs&&<span className="pill ok"><Captions aria-hidden="true"/>כתוביות</span>}{!o.audio.length&&!o.subs.length&&<span className="pill dim">שפות לא ידועות</span>}</span></span><ExternalLink size={18} aria-hidden="true"/></a></li>)}</ul>
     :d&&d.providers.stream.length?<><p className="setNote" style={{margin:'10px 0 4px'}}>בסטרימינג בישראל:</p><div className="prov">{d.providers.stream.map(p=><span key={p.name}>{p.logo&&<img src={p.logo} alt=""/>}{p.name}</span>)}</div></>
     :<p className="setNote">{media==='movie'&&base.release&&daysTo(base.release)>-120?'עכשיו רק בקולנוע - עוד לא זמין בשירותי צפייה בישראל.':'לא נמצא בשירותי צפייה בישראל (נטפליקס, דיסני+, פריים וידאו, Apple TV, yes, HOT ועוד).'}</p>}
     {heI.offers.length>0&&heI.dub===null&&heI.subs===null&&<p className="setNote">השירותים לא פרסמו אילו שפות יש. אפשר לסמן ידנית.</p>}</>}
    {item?<details className="fold" style={{marginTop:12}}><summary><span>תיקון ידני</span><ChevronDown size={20} aria-hidden="true"/></summary><div><Tri label="דיבוב לעברית" icon={Mic} value={item.dub} set={v=>set({dub:v})}/><Tri label="כתוביות בעברית" icon={Captions} value={item.subs} set={v=>set({subs:v})}/></div></details>:null}
   </section>
   {d&&d.similar.length>0&&<section aria-labelledby="h-sim"><h2 className="sec" id="h-sim">אולי תאהב גם</h2><ul className="hscroll">{d.similar.map((h,n)=><li key={h.key} className="rise" style={{'--i':n} as React.CSSProperties}><button className="tile" onClick={()=>openOther(h)}><Poster src={h.poster} kind={h.kind}/><span dir="auto">{bidi(h.title)}</span></button></li>)}</ul></section>}
   {item&&<section className="set"><label className="field" style={{marginTop:0}}>הערה<textarea rows={2} defaultValue={item.note} onBlur={e=>{if(e.target.value!==item.note)set({note:e.target.value.slice(0,1000)});}} placeholder="למשל: רואה עם אסיף"/></label>
    <button className="ghost full bad" onClick={()=>{remove(k);close();}}><Trash2 aria-hidden="true"/>הסרה מהספרייה</button></section>}
  </>}
  {!base&&!err&&<Loader text="טוען…"/>}
 </div>;}

function SettingsSheet({close,size,setSize,user,canLogin,login,logout,status,syncing,sync,items,restore}:{close:()=>void;size:string;setSize:(v:string)=>void;user:User|null;canLogin:boolean;login:()=>Promise<void>;logout:()=>Promise<void>;
 status:{tmdb:boolean;db:boolean}|null;syncing:boolean;sync:()=>void;items:Item[];restore:(l:Item[])=>void}){const ref=useSheet(close);const file=useRef<HTMLInputElement>(null);const [msg,setMsg]=useState('');
 const backup=()=>{const b=new Blob([JSON.stringify({app:'unwatch',v:1,items},null,1)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='unwatch-'+todayISO()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),3000);};
 return <div className="sheet" role="dialog" aria-modal="true" aria-label="הגדרות"><div className="sheetTop"><h2 style={{margin:0}}>הגדרות</h2><button ref={ref} className="ib" aria-label="סגירה" onClick={close}><X/></button></div>
  <section className="set" aria-labelledby="h-size"><h3 id="h-size">גודל טקסט</h3><div className="seg" role="group" aria-labelledby="h-size">{([['','רגיל'],['large','גדול'],['xlarge','גדול מאוד']] as const).map(([v,t])=><button key={t} aria-pressed={size===v} onClick={()=>setSize(v)}>{t}</button>)}</div></section>
  <section className="set" aria-labelledby="h-sync"><h3 id="h-sync">סנכרון</h3>
   {user?<><p className="setNote">מחובר בתור {user.email}. הספרייה נשמרת גם בשרת.</p>{status&&!status.db&&<p className="setNote">השרת עוד לא מחובר למסד הנתונים, אז הסנכרון לא פעיל.</p>}
     <div className="do"><button className="ghost" style={{flex:1}} onClick={sync} disabled={syncing}><RefreshCw aria-hidden="true"/>{syncing?'מסנכרן…':'סנכרון עכשיו'}</button><form action={logout} style={{flex:1,display:'flex'}}><button className="ghost" style={{flex:1}}><LogOut aria-hidden="true"/>התנתקות</button></form></div></>
   :canLogin?<><p className="setNote">כרגע הספרייה שמורה רק בטלפון הזה. התחברות שומרת אותה גם בשרת.</p><form action={login}><button className="primary full"><LogIn aria-hidden="true"/>התחברות עם Google</button></form></>
   :<p className="setNote">הספרייה שמורה בטלפון הזה. התחברות לסנכרון תתווסף בהמשך.</p>}</section>
  <section className="set" aria-labelledby="h-bk"><h3 id="h-bk">גיבוי</h3><div className="do"><button className="ghost" style={{flex:1}} onClick={backup}><Download aria-hidden="true"/>שמירת קובץ</button>
   <button className="ghost" style={{flex:1}} onClick={()=>file.current?.click()}><Upload aria-hidden="true"/>שחזור מקובץ</button></div>
   <input ref={file} type="file" accept="application/json,.json" hidden onChange={async e=>{const f=e.target.files?.[0];if(!f)return;try{const j=JSON.parse(await f.text());if(j.app!=='unwatch'||!Array.isArray(j.items))throw 0;restore(j.items);setMsg('שוחזרו '+j.items.length+' כותרים');}catch{setMsg('הקובץ לא נראה כמו גיבוי של Unwatch');}e.target.value='';}}/>
   {msg&&<p className="setNote" role="status">{msg}</p>}</section>
  {status&&!status.tmdb&&<section className="set"><h3>מפתח TMDB</h3><p className="setNote">החיפוש, הפרקים ותאריכי היציאה מגיעים מ-TMDB. צריך להוסיף ב-Vercel משתנה TMDB_TOKEN.</p></section>}
  <p className="setNote" style={{textAlign:'center',marginTop:20}}>נתונים על סרטים וסדרות: TMDB. המוצר משתמש ב-TMDB API אך אינו מאושר או נתמך על ידה.</p>
 </div>;}
