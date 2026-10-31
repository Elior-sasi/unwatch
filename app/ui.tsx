'use client';
import {useCallback,useEffect,useId,useMemo,useRef,useState} from 'react';
import {Bell,BellOff,MapPin,Star,ExternalLink,Clapperboard,MonitorPlay as TrailerIcon,Users,Play,CalendarClock,Library,Search,Settings,X,Check,Plus,Minus,Pause,Trash2,Tv,Film,Sparkles,Languages,Captions,Mic,ChevronDown,Ticket,Download,Upload,LogIn,LogOut,RefreshCw,Clock} from 'lucide-react';
import {after,before,upNext,epLabel,whenText,daysTo,type Up} from '@/lib/progress';
import {merge,mergeRemoved,type Removed} from '@/lib/library';
import type {HeInfo,Offer} from '@/lib/justwatch';
import {LANG_HE} from '@/lib/langs';
import {KIND_LABEL,STATUS_LABEL,type Detail,type Hit,type Item,type Kind,type Status,type Summary} from '@/lib/types';

type User={name:string;email:string};
type Tab='up'|'soon'|'cinema'|'lib';
const TABS:[Tab,string,typeof Play][]=[['up','המשך',Play],['soon','בקרוב',CalendarClock],['cinema','קולנוע',Clapperboard],['lib','הספרייה',Library]];
const KIND_ICON:Record<Kind,typeof Tv>={anime:Sparkles,tv:Tv,movie:Film};
const LS={cinemas:'unwatch:cinemas',device:'unwatch:device',notif:'unwatch:notif',filler:'unwatch:filler',spoil:'unwatch:spoil',log:'unwatch:log',lib:'unwatch:lib',removed:'unwatch:removed',shows:'unwatch:shows',tab:'unwatch:tab',size:'unwatch:size'};
const read=<T,>(k:string,d:T):T=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v) as T:d;}catch{return d;}};
const write=(k:string,v:unknown)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch{}};
// Latin runs inside Hebrew text keep their order ("Jujutsu Kaisen 2").
const bidi=(t:string)=>t.replace(/[A-Za-z0-9][A-Za-z0-9 .:\/()+&'"!?-]*[A-Za-z0-9)!?]/g,m=>'⁦'+m+'⁩');
async function api<T>(url:string,init?:RequestInit):Promise<T>{const r=await fetch(url,init);const j=await r.json().catch(()=>({}));if(!r.ok)throw Object.assign(new Error(j.error||'שגיאה'),{code:j.code});return j as T;}
const cmp=(a:{s:number;e:number},b:{s:number;e:number})=>a.s-b.s||a.e-b.e;
type Fill={filler:number[];mixed:number[];source?:string};
// Episode number counted from the start of the show (filler lists use these).
const absOf=(x:{s:number;e:number},seasons:{n:number;count:number}[])=>seasons.filter(z=>z.n>0&&z.n<x.s).reduce((a,z)=>a+z.count,0)+x.e;
// "Last watched" moved past filler episodes, when the user chose to skip them.
function skipAt(it:Item,sum:Summary,fill?:Fill|null){let at=it.at;if(!it.skipFiller||!fill?.filler.length)return at;const f=new Set(fill.filler);let nx=after(at,sum.seasons);let g=0;
 while(nx&&f.has(absOf(nx,sum.seasons))&&g++<3000){at=nx;nx=after(nx,sum.seasons);}return at;}
const timeIL=(ms:number)=>new Date(ms).toLocaleTimeString('he-IL',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Jerusalem'});
const dateIL=(ms:number)=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jerusalem'}).format(ms);
const dur=(m:number)=>{m=Math.round(m);if(m<60)return m+' דק׳';const h=Math.floor(m/60),r=m%60;return (h===1?'שעה':h===2?'שעתיים':h+' שעות')+(r?' ו-'+r+' דק׳':'');};
type Log={k:string;t:number;min:number;kind:Kind;n:number;title:string};
const logWatch=(it:Item,min:number,n=1)=>{const l=read<Log[]>(LS.log,[]);l.push({k:it.key,t:Date.now(),min:Math.round(min),kind:it.kind,n,title:it.title});write(LS.log,l.slice(-6000));};
const deviceId=()=>{let d=read<string>(LS.device,'');if(!d){const a=new Uint8Array(18);crypto.getRandomValues(a);d=btoa(String.fromCharCode(...a)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');write(LS.device,d);}return d;};
const todayISO=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};

// The family mark (like Unbox, Unstage, Unroute): a gradient U, with a purple screen and play button as its lid.
// Opening: the U is drawn like a progress bar, the screen switches on like an old TV (a thin line that opens up),
// then the play button appears. Loading: the U keeps filling like a progress bar. SVG's own animation, which iPhone plays reliably;
// with "reduce motion" the still logo is shown.
// The logo animation follows the app's own setting: always (default, like Unbox), off, or as the iPhone's "Reduce Motion" says.
type AnimPref='on'|'auto'|'off';
const stillLogo=()=>{const p=read<AnimPref>('unwatch:anim','on');return p==='off'||(p==='auto'&&matchMedia('(prefers-reduced-motion: reduce)').matches);};
function useReduced(){const [r,setR]=useState(false);useEffect(()=>{const m=matchMedia('(prefers-reduced-motion: reduce)');const f=()=>setR(stillLogo());f();m.addEventListener('change',f);return ()=>m.removeEventListener('change',f);},[]);return r;}
export function Mark({className,anim,play}:{className?:string;anim?:'open'|'bob';play?:boolean}){const still=useReduced();const a=still?undefined:anim;const ref=useRef<SVGSVGElement>(null);
 useEffect(()=>{if(play&&ref.current){try{ref.current.setCurrentTime(0);ref.current.unpauseAnimations();}catch{}}},[play]);
 return <svg ref={ref} className={className} viewBox="100 76 312 386" aria-hidden="true">
 <defs><linearGradient id="uw-g" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor="#7c4dff"/><stop offset="1" stopColor="#c4a8ff"/></linearGradient></defs>
 <path d="M150 214 V320 a106 106 0 0 0 212 0 V210" fill="none" stroke="url(#uw-g)" strokeWidth="58" strokeLinecap="round" pathLength={100} strokeDasharray={a?'100 100':undefined}>
  {a==='open'&&<animate attributeName="stroke-dashoffset" values="100;0" dur=".8s" calcMode="spline" keySplines=".3 0 .2 1" fill="freeze"/>}
  {a==='bob'&&<animate attributeName="stroke-dashoffset" values="100;0;-100" dur="1.8s" repeatCount="indefinite" calcMode="spline" keySplines=".45 0 .55 1;.45 0 .55 1"/>}</path>
 <g transform="rotate(-10 112 160)"><rect x="112" y="104" width="288" height="64" rx="18" fill="#a78bfa">
   {a==='open'&&<><animate attributeName="height" values="0;0;6;64" keyTimes="0;.5;.62;1" dur="1.25s" fill="freeze"/><animate attributeName="y" values="133;133;133;104" keyTimes="0;.5;.62;1" dur="1.25s" fill="freeze"/>
    <animate attributeName="fill" values="#ffffff;#ffffff;#a78bfa" keyTimes="0;.62;1" dur="1.25s" fill="freeze"/></>}
   {a==='bob'&&<animate attributeName="opacity" values="1;.55;1" dur="1.8s" repeatCount="indefinite"/>}</rect>
  <path d="M238 120 L282 136 L238 152Z" fill="#fff" stroke="#fff" strokeWidth="8" strokeLinejoin="round">{a==='open'&&<animate attributeName="opacity" values="0;0;1" keyTimes="0;.8;1" dur="1.5s" fill="freeze"/>}</path></g></svg>;}
function Loader({text}:{text:string}){return <div className="loader" role="status"><Mark className="lmark" anim="bob"/><p>{text}</p></div>;}
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
 const [fills,setFills]=useState<Record<string,Fill>>({});const [spoil,setSpoil]=useState(true);const [freeMin,setFreeMin]=useState(0);const [stats,setStats]=useState(false);
 const [splash,setSplash]=useState(2);const [go,setGo]=useState(false);const [syncing,setSyncing]=useState(false);
 const synced=useRef(false);const pending=useRef<ReturnType<typeof setTimeout>|null>(null);

 useEffect(()=>{setItems(read(LS.lib,[]));setRemoved(read(LS.removed,{}));setShows(read(LS.shows,{}));setTab(read(LS.tab,'up'));setSize(read(LS.size,''));setFills(read(LS.filler,{}));setSpoil(read(LS.spoil,true));setReady(true);
  // The opening animation starts only once the app is really showing (two frames after it is drawn), then fades out.
  const quick=stillLogo();requestAnimationFrame(()=>requestAnimationFrame(()=>{setGo(true);setTimeout(()=>setSplash(1),quick?400:2700);setTimeout(()=>setSplash(0),quick?800:3150);}));
  api<{tmdb:boolean;db:boolean}>('/api/status').then(setStatus).catch(()=>{});},[]);
 // Notifications: the service worker, and a tapped notification opening its title.
 useEffect(()=>{if('serviceWorker' in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>{});
  const q=new URLSearchParams(location.search).get('k');if(q&&/^(tv|movie):\d+$/.test(q)){setOpenKey(q);history.replaceState(null,'','/');}
  const m=(e:MessageEvent)=>{if(e.data?.type==='open'){const k=new URL(e.data.url,location.origin).searchParams.get('k');if(k){setHit(null);setOpenKey(k);}}};navigator.serviceWorker?.addEventListener('message',m);return ()=>navigator.serviceWorker?.removeEventListener('message',m);},[]);
 // The phone's followed titles go to the server (only when notifications are on), so the scheduled check knows what to look for.
 useEffect(()=>{if(!ready)return;const n=read<{on:boolean;prefs:{ep:boolean;he:boolean;movie:boolean}}>(LS.notif,{on:false,prefs:{ep:true,he:true,movie:true}});if(!n.on)return;
  const t=setTimeout(()=>{fetch('/api/push',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({device:deviceId(),items:items.filter(i=>i.status!=='dropped'&&i.status!=='done'||i.media==='tv'&&i.status==='done').slice(0,400).map(i=>({key:i.key,title:i.title.slice(0,200),status:i.status,media:i.media})),prefs:n.prefs})}).catch(()=>{});},2500);
  return ()=>clearTimeout(t);},[ready,items]);
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
  try{const r=await api<{he:Record<string,{dub:boolean|null;subs:boolean|null;watch:{service:string;url:string|null}|null}>}>('/api/he',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({keys})});const now=Date.now();
   commit(l=>l.map(i=>r.he[i.key]?{...i,he:{dub:r.he[i.key].dub,subs:r.he[i.key].subs,at:now},...(!i.watchOn&&r.he[i.key].watch?{watchOn:r.he[i.key].watch!}:{})}:keys.includes(i.key)?{...i,he:{dub:i.he?.dub??null,subs:i.he?.subs??null,at:now}}:i));}catch{}finally{heBusy.current=false;}},[commit]);
 useEffect(()=>{if(ready&&status?.tmdb)loadHe();},[ready,items.length,status,loadHe]);
 // Pull down at the top of the page to refresh.
 const [pull,setPull]=useState(0);const startY=useRef<number|null>(null);
 const refresh=async()=>{setPull(-1);await Promise.all([loadShows(true),sync()]);setPull(0);setToast({text:'עודכן'});};
 useEffect(()=>{const v=()=>{if(document.visibilityState==='visible')loadShows();};document.addEventListener('visibilitychange',v);return ()=>document.removeEventListener('visibilitychange',v);},[loadShows]);

 const goTab=(t:Tab)=>{setTab(t);write(LS.tab,t);window.scrollTo({top:0});};
 const open=(key:string,h?:Hit|null)=>{setHit(h||null);setOpenKey(key);};
 const markNext=(it:Item,together=false)=>{const sum=shows[it.key];if(!sum)return;const nx=after(skipAt(it,sum,fills[it.key]),sum.seasons);if(!nx)return;logWatch(it,sum.runtime||24);
  if(together&&it.together?.on){const t=it.together;upsert({...it,at:it.at&&cmp(it.at,nx)>=0?it.at:nx,mid:null,together:{...t,at:nx},status:it.status==='plan'?'watching':it.status,watchedAt:Date.now()});
   setToast({text:'צפיתם יחד: '+epLabel(nx,sum.seasons.length),undo:()=>upsert(it)});return;}
  const more=after(nx,sum.seasons);const ended=!more&&/הסתיימה|בוטלה/.test(sum.status);
  upsert({...it,at:nx,mid:null,status:ended?'done':it.status==='plan'?'watching':it.status,watchedAt:Date.now()});
  setToast({text:'סומן: '+epLabel(nx,sum.seasons.length)+(ended?' - סיימת את הסדרה':''),undo:()=>upsert(it)});};

 const byKey=useMemo(()=>new Map(items.map(i=>[i.key,i])),[items]);
 const ups=useMemo(()=>items.filter(i=>i.media==='tv'&&(i.status==='watching')).map(i=>({it:i,up:shows[i.key]?upNext({at:skipAt(i,shows[i.key],fills[i.key])},shows[i.key]):null})),[items,shows,fills]);
 const readyCount=ups.filter(x=>x.up?.state==='ready').length;
 const toWatch=[...ups].sort((a,b)=>{const r=(u:Up|null)=>u?.state==='ready'?0:u?.state==='wait'?1:2;return r(a.up)-r(b.up)||b.it.updated-a.it.updated;});
 const midMovies=items.filter(i=>i.media==='movie'&&i.status==='watching');
 const soon=useMemo(()=>{const t=todayISO();const out:{date:string;it:Item;label:string}[]=[];
  for(const it of items){if(it.status==='dropped')continue;const s=shows[it.key];
   if(it.media==='tv'&&s?.next?.air&&s.next.air>=t){const d=s.airAt?dateIL(s.airAt):s.next.air;out.push({date:d,it,label:epLabel(s.next,s.seasons.length)+(s.next.e===1?' - עונה חדשה':'')+(s.airAt?' · ב-'+timeIL(s.airAt):'')});}
   if(it.media==='movie'&&it.status==='plan'){const d=s?.release;if(d&&d>=t)out.push({date:d,it,label:'יוצא'});}}
  return out.sort((a,b)=>a.date.localeCompare(b.date));},[items,shows]);

 const navRef=useRef<HTMLElement>(null);const [drag,setDrag]=useState<number|null>(null);
 const slide=(x:number,end:boolean)=>{const r=navRef.current?.getBoundingClientRect();if(!r)return;const i=Math.max(0,Math.min(3,Math.floor((r.right-x)/(r.width/4))));if(end){setDrag(null);goTab(TABS[i][0]);}else setDrag(i);};

 const cls='app'+(size?' '+size:'');
 return <main className={cls} onTouchStart={e=>{startY.current=window.scrollY<=0&&!openKey&&!searching&&!settings?e.touches[0].clientY:null;}}
  onTouchMove={e=>{if(startY.current==null||pull<0)return;const d=e.touches[0].clientY-startY.current;setPull(d>0?Math.min(d/2,90):0);}}
  onTouchEnd={()=>{if(pull>=70)refresh();else if(pull>0)setPull(0);startY.current=null;}}>
  {pull!==0&&<div className="ptr" style={{height:pull<0?56:pull}} aria-hidden="true"><RefreshCw className={pull<0?'spin':''} style={{transform:pull>0?'rotate('+pull*3+'deg)':undefined,opacity:pull<0?1:Math.min(1,pull/70)}}/></div>}
  {splash>0&&<div className={'splash'+(go?' go':'')+(splash===1?' out':'')} aria-hidden="true" onAnimationEnd={e=>{if(e.target===e.currentTarget&&e.animationName==='splashOut')setSplash(0);}}><Mark className="smark" anim="open" play={go}/><div className="sname" dir="ltr">Unwatch</div></div>}
  <header className="row">
   <div className="brand" role="img" aria-label="Unwatch"><Mark/><span aria-hidden="true">nwatch</span></div>
   <div className="actions"><button className="ib" aria-label="חיפוש והוספה" onClick={()=>setSearching(true)}><Search/></button><button className="ib" aria-label="הגדרות" onClick={()=>setSettings(true)}><Settings/></button></div>
  </header>
  {status&&!status.tmdb&&<p className="note" role="status">חסר עדיין מפתח TMDB בשרת, אז חיפוש ותאריכי פרקים לא עובדים. ההוראות בהגדרות.</p>}

  {tab==='up'&&<section className="tabIn" aria-labelledby="h-up">
   <h1 id="h-up">ממשיכים לצפות</h1>
   <p className="sub">{readyCount?readyCount===1?'סדרה אחת מחכה לך':readyCount+' סדרות מחכות לך':ups.length?'אין פרקים חדשים כרגע':''}</p>
   {ready&&!ups.length&&!midMovies.length&&<div className="empty"><Play aria-hidden="true"/><p>עוד אין כאן כלום. חפש אנימה, סדרה או סרט וסמן "אני צופה".</p><button className="primary" style={{flex:"none",minWidth:200}} onClick={()=>setSearching(true)}><Search aria-hidden="true"/>חיפוש</button></div>}
   {ups.length+items.filter(i=>i.media==='movie'&&i.status==='plan').length>0&&<div className="chips" role="group" aria-label="כמה זמן יש לך"><span className="chipLbl">יש לי:</span>{[25,45,90,150].map(m=><button key={m} className="chip" aria-pressed={freeMin===m} onClick={()=>setFreeMin(freeMin===m?0:m)}>{dur(m)}</button>)}</div>}
   {freeMin>0&&<FreeTime min={freeMin} ups={toWatch} shows={shows} movies={items.filter(i=>i.media==='movie'&&i.status==='plan')} open={open}/>}
   <ul className="list">{toWatch.map(({it,up},i)=>{const s=shows[it.key];return <li key={it.key} className="card rise" style={{'--i':i} as React.CSSProperties}>
    <button className="open" onClick={()=>open(it.key)} aria-label={it.title+', פרטים'}><Poster src={it.poster} kind={it.kind}/><div className="info"><div className="nm" dir="auto">{bidi(it.title)}</div>
     <div className="meta"><KindPill kind={it.kind}/><HePills it={it}/></div>
     <div className="next" key={up?.state==="ready"||up?.state==="wait"?up.ep.s+"-"+up.ep.e:up?.state||"x"}>{!up?<span className="shim" aria-label="טוען"/>:up.state==='ready'?<>הבא: {epLabel(up.ep,s.seasons.length)}{up.left>1&&<small>{up.left} פרקים מחכים</small>}</>:up.state==='wait'?<>{epLabel(up.ep,s.seasons.length)}<small>{s.airAt?'יוצא '+whenText(dateIL(s.airAt))+' ב-'+timeIL(s.airAt):up.air?'יוצא '+whenText(up.air):'עוד אין תאריך'}</small></>:up.state==='caught'?<>ראית הכל<small>{s.airAt?'הפרק הבא '+whenText(dateIL(s.airAt))+' ב-'+timeIL(s.airAt):up.air?'הפרק הבא '+whenText(up.air):'מחכים לפרקים חדשים'}</small></>:<>ראית הכל<small>הסדרה הסתיימה</small></>}
      {it.mid&&<small><Clock size={14} aria-hidden="true"/> עצרת ב{epLabel(it.mid,s?.seasons.length||1)}, דקה {it.mid.min}</small>}
      {up?.state==='ready'&&up.left>1&&s.runtime?<small>עוד {dur(up.left*s.runtime)} עד שתשלים</small>:null}
      {it.together?.on&&s&&<small><Users size={14} aria-hidden="true"/> עם {it.together.name||'מישהו'}: {(()=>{const t=after(it.together.at,s.seasons);return t?'הבא '+epLabel(t,s.seasons.length):'סיימתם';})()}</small>}</div></div></button>
    {up?.state==='ready'&&<div className="do"><button className="primary press" onClick={e=>{e.currentTarget.classList.remove('pop');void e.currentTarget.offsetWidth;e.currentTarget.classList.add('pop');markNext(it);}}><Check aria-hidden="true"/>צפיתי ב{epLabel(up.ep,s.seasons.length)}</button>
     {it.together?.on&&<button className="ghost press" style={{flex:1}} onClick={()=>markNext(it,true)}><Users aria-hidden="true"/>צפינו יחד</button>}</div>}
    {it.watchOn?.url&&<a className="ghost full watch" href={it.watchOn.url} target="_blank" rel="noopener noreferrer"><Play aria-hidden="true"/>לצפייה ב-{it.watchOn.service}<span className="sr"> (נפתח בשירות)</span></a>}
    {up?.state==='ended'&&<div className="do"><button className="ghost" style={{flex:1}} onClick={()=>upsert({...it,status:'done'})}>להעביר לסיימתי</button></div>}
   </li>;})}
   {midMovies.map(it=><li key={it.key} className="card"><button className="open" onClick={()=>open(it.key)} aria-label={it.title+', פרטים'}><Poster src={it.poster} kind={it.kind}/><div className="info"><div className="nm" dir="auto">{bidi(it.title)}</div>
    <div className="meta"><KindPill kind={it.kind}/></div><div className="next">{it.mid?'עצרת בדקה '+it.mid.min:'באמצע'}</div></div></button>
    <div className="do"><button className="primary" onClick={()=>{logWatch(it,shows[it.key]?.runtime||100);upsert({...it,status:'done',mid:null,watchedAt:Date.now()});setToast({text:'סיימת: '+it.title,undo:()=>upsert(it)});}}><Check aria-hidden="true"/>סיימתי</button></div></li>)}</ul>
   {items.some(i=>i.status==='plan')&&<button className="ghost full" onClick={()=>goTab('lib')}>ברשימה לצפייה: {items.filter(i=>i.status==='plan').length}</button>}
  </section>}

  {tab==='soon'&&<section className="tabIn" aria-labelledby="h-soon"><h1 id="h-soon">בקרוב</h1><p className="sub">פרקים חדשים וסרטים שאתה מחכה להם</p>
   {!soon.length&&<div className="empty"><CalendarClock aria-hidden="true"/><p>אין תאריכים קרובים לכותרים שבספרייה.</p></div>}
   {Object.entries(soon.reduce<Record<string,typeof soon>>((g,x)=>{(g[x.date]||=[]).push(x);return g;},{})).map(([d,l])=><div key={d} className="day"><h2>{whenText(d)}{daysTo(d)>1&&daysTo(d)<7?'':''}<span className="sr"> {d}</span></h2>
    {l.map((x,n)=><button key={x.it.key} className="line rise" style={{'--i':n} as React.CSSProperties} onClick={()=>open(x.it.key)}><Poster src={x.it.poster} kind={x.it.kind}/><span className="info"><span className="nm" dir="auto">{bidi(x.it.title)}</span><span className="meta">{x.label} · {KIND_LABEL[x.it.kind]}</span></span></button>)}</div>)}
  </section>}

  {tab==='cinema'&&<Cinema open={open} byKey={byKey} pick={()=>setSettings(true)}/>}

  {tab==='lib'&&<Lib items={items} shows={shows} open={open} stats={()=>setStats(true)}/>}

  <nav ref={navRef} aria-label="ניווט ראשי" className={drag!==null?'dragging':''} style={{'--tab':drag??TABS.findIndex(t=>t[0]===tab)} as React.CSSProperties}
   onTouchStart={e=>slide(e.touches[0].clientX,false)} onTouchMove={e=>slide(e.touches[0].clientX,false)} onTouchEnd={e=>slide(e.changedTouches[0].clientX,true)} onTouchCancel={()=>setDrag(null)}>
   {TABS.map(([k,label,I])=>{const n=k==='up'?readyCount:0;return <button key={k} className={tab===k?'selected':''} aria-current={tab===k?'page':undefined} aria-label={label+(n?', '+n+' מחכות':'')} onClick={()=>goTab(k)}>
    <span className="ni"><I size={20} aria-hidden="true"/>{n>0&&<b className="nb" aria-hidden="true">{n}</b>}</span><span aria-hidden="true">{label}</span></button>;})}
  </nav>

  {searching&&<SearchSheet close={()=>setSearching(false)} open={open} byKey={byKey}/>}
  {openKey&&<DetailSheet key={openKey} k={openKey} hit={hit} item={byKey.get(openKey)||null} close={()=>setOpenKey(null)} save={upsert} remove={k=>{remove(k);}} onSeen={()=>loadShows(true)} openOther={h=>open(h.key,h)} spoil={spoil} fill={fills[openKey]||null} setFill={f=>{const n={...read<Record<string,Fill>>(LS.filler,{}),[openKey]:f};write(LS.filler,n);setFills(n);}} onLog={(it,min,n)=>logWatch(it,min,n)}/>}
  {stats&&<StatsSheet close={()=>setStats(false)} items={items} shows={shows}/>}
  {settings&&<SettingsSheet spoil={spoil} setSpoil={v=>{setSpoil(v);write(LS.spoil,v);}} close={()=>setSettings(false)} size={size} setSize={v=>{setSize(v);write(LS.size,v);}} user={user} canLogin={canLogin} login={login} logout={logout} status={status} syncing={syncing} sync={sync}
   items={items} restore={list=>{commit(l=>merge(l,list,removed));setToast({text:'השחזור הושלם'});}}/>}
  <div aria-live="polite" key={toast?.text||''} className={toast?'toast':'sr'}>{toast&&<>{toast.text}{toast.undo&&<button onClick={()=>{toast.undo!();setToast(null);}}>ביטול</button>}</>}</div>
 </main>;}

function Cinema({open,byKey,pick}:{open:(k:string,h?:Hit)=>void;byKey:Map<string,Item>;pick:()=>void}){const [d,setD]=useState<{now:Hit[];soon:Hit[]}|null>(null);const [err,setErr]=useState('');
 const load=useCallback(()=>{setErr('');api<{now:Hit[];soon:Hit[]}>('/api/cinema').then(setD).catch(e=>setErr(e.message));},[]);useEffect(load,[load]);
 const seen=[...byKey.values()].filter(i=>i.source==='cinema').sort((a,b)=>(b.watchedAt||0)-(a.watchedAt||0));
 return <section className="tabIn" aria-labelledby="h-cin"><h1 id="h-cin">קולנוע</h1><p className="sub">מה מוקרן עכשיו בישראל</p>
  <Showtimes pick={pick}/>
  <h2 className="sec">מוקרנים עכשיו</h2>
  {err&&<div className="note" role="alert">{err} <button className="ghost full" onClick={load}><RefreshCw aria-hidden="true"/>לנסות שוב</button></div>}
  {!d&&!err&&<Loader text="בודק מה בקולנוע…"/>}
  {d&&<><ul className="grid">{d.now.map((h,n)=><li key={h.key} className="rise" style={{'--i':n} as React.CSSProperties}><button className="tile" onClick={()=>open(h.key,h)}><Poster src={h.poster} kind={h.kind}/><span dir="auto">{bidi(h.title)}</span>{byKey.get(h.key)?.status==='done'&&<small>ראית ✓</small>}</button></li>)}</ul>
   {d.soon.length>0&&<><h2 className="sec">בקרוב לקולנוע</h2><div>{d.soon.slice(0,20).map(h=><button key={h.key} className="line" style={{marginTop:8}} onClick={()=>open(h.key,h)}><Poster src={h.poster} kind={h.kind}/><span className="info"><span className="nm" dir="auto">{bidi(h.title)}</span><span className="meta">{h.release?whenText(h.release):''}</span></span></button>)}</div></>}</>}
  {seen.length>0&&<><h2 className="sec">ראיתי בקולנוע</h2><div>{seen.map(i=><button key={i.key} className="line" style={{marginTop:8}} onClick={()=>open(i.key)}><Poster src={i.poster} kind={i.kind}/><span className="info"><span className="nm" dir="auto">{bidi(i.title)}</span><span className="meta">{i.watchedAt?new Date(i.watchedAt).toLocaleDateString('he-IL'):''}</span></span></button>)}</div></>}
 </section>;}

function Lib({items,shows,open,stats}:{items:Item[];shows:Record<string,Summary>;open:(k:string)=>void;stats:()=>void}){const [kind,setKind]=useState<Kind|''>('');const [st,setSt]=useState<Status|''>('');const [he,setHe]=useState<''|'dub'|'subs'>('');const [q,setQ]=useState('');
 const list=items.filter(i=>(!kind||i.kind===kind)&&(!st||i.status===st)&&(!he||(he==='dub'?dubOf(i):subsOf(i)))&&(!q||(i.title+' '+i.orig).toLowerCase().includes(q.toLowerCase()))).sort((a,b)=>b.updated-a.updated);
 const count=(k:Kind)=>items.filter(i=>i.kind===k).length;
 return <section className="tabIn" aria-labelledby="h-lib"><h1 id="h-lib">הספרייה</h1><p className="sub">{items.length} כותרים</p>{items.length>0&&<button className="ghost full" onClick={stats}><Sparkles aria-hidden="true"/>הסיכום שלי</button>}
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

function DetailSheet({k,hit,item,close,save,remove,onSeen,openOther,spoil,fill,setFill,onLog}:{k:string;hit:Hit|null;item:Item|null;close:()=>void;save:(x:Item)=>void;remove:(k:string)=>void;onSeen:()=>void;openOther:(h:Hit)=>void;spoil:boolean;fill:Fill|null;setFill:(f:Fill)=>void;onLog:(it:Item,min:number,n:number)=>void}){
 const ref=useSheet(close);const [d,setD]=useState<Detail|null>(null);const [err,setErr]=useState('');const [eps,setEps]=useState<Record<number,{e:number;name:string;air?:string;runtime:number|null}[]>>({});
 const [heI,setHeI]=useState<HeInfo|null>(null);
 useEffect(()=>{api<Detail>('/api/title?key='+encodeURIComponent(k)).then(setD).catch(e=>setErr(e.message));api<HeInfo>('/api/he?key='+encodeURIComponent(k)).then(setHeI).catch(()=>setHeI({found:false,dub:null,subs:null,offers:[],page:null}));},[k]);
 const base=d||hit;const kind=(base?.kind||item?.kind||'tv') as Kind;const title=base?.title||item?.title||'';const media=(base?.media||item?.media||'tv');
 const make=(status:Status):Item=>({key:k,media,tmdb:base?.tmdb||item?.tmdb||0,kind,title,orig:base?.orig||'',year:base?.year||'',poster:base?.poster||item?.poster||null,status,at:null,mid:null,dub:null,subs:null,rating:null,note:'',added:Date.now(),updated:Date.now()});
 const set=(p:Partial<Item>)=>{save({...(item||make('plan')),...p});if(!item)onSeen();};
 const seasons=d?.seasons||[];const nSeasons=seasons.length;
 const loadSeason=(n:number)=>{if(eps[n]||!base)return;api<{episodes:{e:number;name:string;air?:string;runtime:number|null}[]}>('/api/season?id='+base.tmdb+'&n='+n).then(r=>setEps(x=>({...x,[n]:r.episodes}))).catch(()=>{});};
 const at=item?.at||null;const nx=after(at,seasons.map(s=>({n:s.n,count:s.count})));
 const [shown,setShown]=useState<Record<number,boolean>>({});const [mate,setMate]=useState(item?.together?.name||'');
 useEffect(()=>{if(kind==='anime'&&media==='tv'&&d&&!fill)api<Fill>('/api/filler?key='+encodeURIComponent(k)).then(f=>{if(f.filler.length||f.mixed.length)setFill(f);}).catch(()=>{});},[kind,media,d,fill,k,setFill]);
 const fSet=new Set(fill?.filler||[]);const mSet=new Set(fill?.mixed||[]);
 const total=seasons.reduce((a,z)=>a+z.count,0);const seen=at?absOf(at,seasons):0;const left=Math.max(0,total-seen-(item?.skipFiller?[...fSet].filter(n=>n>seen).length:0));
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
     <button className="primary" onClick={()=>{if(media==='movie')onLog(make('done'),d?.runtime||100,1);set({status:media==='movie'?'done':'watching',...(media==='movie'?{watchedAt:Date.now()}:{})});}}>{media==='movie'?<><Check aria-hidden="true"/>ראיתי</>:<><Play aria-hidden="true"/>אני צופה</>}</button>
     <button className="ghost" style={{flex:1}} onClick={()=>set({status:'plan'})}><Plus aria-hidden="true"/>לרשימה</button>
     {media==='movie'&&<button className="ghost full" onClick={()=>{onLog(make('done'),d?.runtime||100,1);set({status:'done',watchedAt:Date.now(),source:'cinema'});}}><Ticket aria-hidden="true"/>ראיתי בקולנוע</button>}</div>
   :<section className="set" aria-labelledby="h-st"><h3 id="h-st">מצב</h3><div className="seg" role="group" aria-labelledby="h-st">{(Object.keys(STATUS_LABEL) as Status[]).map(s=><button key={s} aria-pressed={item.status===s} onClick={()=>set({status:s,...(s==='done'&&media==='movie'&&!item.watchedAt?{watchedAt:Date.now()}:{})})}>{STATUS_LABEL[s]}</button>)}</div>
     {(item.status==='done'||item.status==='dropped')&&<div style={{marginTop:12}}><p className="setNote" id="h-rate" style={{margin:'0 0 6px'}}>דירוג</p><div className="stars" role="group" aria-labelledby="h-rate">{[1,2,3,4,5].map(n=><button key={n} aria-label={n+' כוכבים'} aria-pressed={(item.rating||0)>=n*2} onClick={()=>set({rating:item.rating===n*2?null:n*2})}><Star aria-hidden="true"/></button>)}</div></div>}
     {media==='movie'&&item.status==='done'&&<button className="ghost full" aria-pressed={item.source==='cinema'} onClick={()=>set({source:item.source==='cinema'?undefined:'cinema'})}><Ticket aria-hidden="true"/>{item.source==='cinema'?'ראיתי בקולנוע ✓':'ראיתי בקולנוע'}</button>}</section>}

   {item&&media==='tv'&&nSeasons>0&&<section className="set" aria-labelledby="h-at"><h3 id="h-at"><Pause aria-hidden="true"/>איפה עצרתי</h3>
    <div className="step"><button className="ib" aria-label="פרק אחד אחורה" disabled={!at} onClick={()=>set({at:at?before(at,seasons):null,mid:null})}><Minus/></button>
     <b aria-live="polite">{at?'ראיתי עד '+epLabel(at,nSeasons):'עוד לא התחלתי'}</b>
     <button className="ib" aria-label="צפיתי בפרק הבא" disabled={!nx} onClick={()=>{onLog(item,d?.runtime||24,1);set({at:nx,mid:null,status:item.status==='plan'?'watching':item.status,watchedAt:Date.now()});}}><Plus/></button></div>
    {total>0&&<p className="setNote" style={{textAlign:'center'}}>{left?'נשארו '+left+' פרקים'+(d?.runtime?' · בערך '+dur(left*d.runtime):''):'ראית את כל הפרקים'}</p>}
    {fill&&fill.filler.length>0&&<div className="fillBox"><label className="swRow"><span><b>לדלג על פילרים</b><small>{fill.filler.length} פרקי פילר{fill.mixed.length?' ו-'+fill.mixed.length+' חלקיים':''}</small></span><input type="checkbox" role="switch" className="sw" checked={!!item.skipFiller} onChange={e=>set({skipFiller:e.target.checked})}/></label>
     {fill.source&&<a className="setNote" href={fill.source} target="_blank" rel="noopener noreferrer">המקור: Anime Filler List</a>}</div>}
    {nx&&<label className="field">עצרתי באמצע {epLabel(nx,nSeasons)}, בדקה:<input inputMode="numeric" pattern="[0-9]*" value={midMin} onChange={e=>setMidMin(e.target.value.replace(/\D/g,'').slice(0,3))}
     onBlur={()=>set({mid:midMin?{s:nx.s,e:nx.e,min:+midMin}:null})} placeholder="למשל 14"/></label>}
    {seasons.map(s=><details key={s.n} className="fold" onToggle={e=>{if((e.target as HTMLDetailsElement).open)loadSeason(s.n);}}><summary><span>{nSeasons>1?'עונה '+s.n:'פרקים'} <span className="setNote" style={{display:'inline'}}>· {s.count} פרקים</span></span><ChevronDown size={20} aria-hidden="true"/></summary>
     <div>{spoil&&eps[s.n]&&!shown[s.n]&&<button className="ghost full" style={{marginTop:0,marginBottom:8}} onClick={()=>setShown(x=>({...x,[s.n]:true}))}>להציג שמות של פרקים שלא ראיתי</button>}{!eps[s.n]?<p className="setNote" role="status">טוען…</p>:<ul className="eps">{eps[s.n].map(e=>{const pos={s:s.n,e:e.e};const w=!!at&&cmp(pos,at)<=0;const out=!e.air||e.air<=today;
      return <li key={e.e}><button className={w?'on':''} aria-pressed={w} disabled={!out&&!w} onClick={()=>set({at:w&&at&&cmp(pos,at)===0?before(pos,seasons):pos,mid:null,status:item.status==='plan'?'watching':item.status,watchedAt:Date.now()})}
       aria-label={'פרק '+e.e+(e.name&&(w||!spoil||shown[s.n])?', '+e.name:'')+(fSet.has(absOf(pos,seasons))?', פילר':'')+(w?', נצפה':'')+(!out&&e.air?', יוצא '+whenText(e.air):'')}>
       <span className="ck">{w&&<Check aria-hidden="true"/>}</span><span className="t"><span dir="auto">{e.e}. {e.name&&(w||!spoil||shown[s.n])?bidi(e.name):e.name?<span className="hid">שם מוסתר</span>:'פרק '+e.e}{fSet.has(absOf(pos,seasons))?<span className="pill dim"> פילר</span>:mSet.has(absOf(pos,seasons))?<span className="pill dim"> חלקי</span>:null}</span><small>{e.air?(out?new Date(e.air+'T00:00').toLocaleDateString('he-IL'):'יוצא '+whenText(e.air)):''}{e.runtime?' · '+e.runtime+' דק׳':''}</small></span></button></li>;})}</ul>}</div></details>)}
   </section>}
   {item&&media==='movie'&&item.status==='watching'&&<section className="set"><h3><Pause aria-hidden="true"/>איפה עצרתי</h3><label className="field">עצרתי בדקה:<input inputMode="numeric" pattern="[0-9]*" value={midMin} onChange={e=>setMidMin(e.target.value.replace(/\D/g,'').slice(0,3))} onBlur={()=>set({mid:midMin?{s:0,e:0,min:+midMin}:null})} placeholder="למשל 40"/></label></section>}

   {media==='movie'&&<MovieShows k={k}/>}
   {item&&media==='tv'&&<section className="set"><label className="swRow"><span><b><Users size={18} aria-hidden="true"/> צפייה משותפת</b><small>התקדמות נפרדת למה שרואים יחד</small></span><input type="checkbox" role="switch" className="sw" checked={!!item.together?.on} onChange={e=>set({together:{on:e.target.checked,name:item.together?.name||mate,at:item.together?.at||null}})}/></label>
    {item.together?.on&&<><label className="field">עם מי?<input value={mate} onChange={e=>setMate(e.target.value.slice(0,40))} onBlur={()=>set({together:{...item.together!,name:mate.trim()}})} placeholder="למשל אסיף"/></label>
     <div className="step"><button className="ib" aria-label="פרק משותף אחד אחורה" disabled={!item.together.at} onClick={()=>set({together:{...item.together!,at:item.together!.at?before(item.together!.at,seasons):null}})}><Minus/></button>
      <b aria-live="polite">{item.together.at?'יחד עד '+epLabel(item.together.at,nSeasons):'עוד לא התחלתם יחד'}</b>
      <button className="ib" aria-label="צפינו יחד בפרק הבא" disabled={!after(item.together.at,seasons)} onClick={()=>{const t=after(item.together!.at,seasons);if(t){onLog(item,d?.runtime||24,1);set({together:{...item.together!,at:t},at:item.at&&cmp(item.at,t)>=0?item.at:t});}}}><Plus/></button></div></>}
   </section>}
   <section className="set" aria-labelledby="h-he"><h3 id="h-he"><Languages aria-hidden="true"/>בעברית ואיפה לראות</h3>
    {!heI?<p className="setNote" role="status">בודק דיבוב וכתוביות…</p>:<>
     <div className="yn"><div><Mic aria-hidden="true"/><span>דיבוב לעברית</span><b className={heI.dub?'y':''}>{yn(item?.dub??heI.dub)}</b></div><div><Captions aria-hidden="true"/><span>כתוביות בעברית</span><b className={heI.subs?'y':''}>{yn(item?.subs??heI.subs)}</b></div></div>
     {heI.offers.length>0?<ul className="offers">{heI.offers.map(o=><li key={o.service+o.type}><a className="offer" href={o.url||heI.page||'#'} target="_blank" rel="noopener noreferrer" aria-label={o.service+', '+OFFER_TYPE[o.type]+'. דיבוב לעברית: '+(o.audio.length?(o.dub?'יש':'אין'):'לא ידוע')+'. כתוביות בעברית: '+(o.subs.length?(o.heSubs?'יש':'אין'):'לא ידוע')+'. נפתח בשירות'}>
       {o.icon?<img src={o.icon} alt=""/>:<Tv aria-hidden="true"/>}<span className="t"><b>{o.service}</b><small>{OFFER_TYPE[o.type]}{o.audio.length?' · שמע: '+o.audio.map(l=>LANG_HE[l.slice(0,2)]||l).join(', '):''}</small>
       <span className="tags">{o.dub&&<span className="pill ok"><Mic aria-hidden="true"/>דיבוב</span>}{o.heSubs&&<span className="pill ok"><Captions aria-hidden="true"/>כתוביות</span>}{!o.audio.length&&!o.subs.length&&<span className="pill dim">שפות לא ידועות</span>}</span></span><ExternalLink size={18} aria-hidden="true"/></a>{item&&(o.type==='stream'||o.type==='free')&&<button className="mine" aria-pressed={item.watchOn?.service===o.service} onClick={()=>set({watchOn:item.watchOn?.service===o.service?undefined:{service:o.service,url:o.url||heI.page}})}>{item.watchOn?.service===o.service?'✓ כאן אני רואה':'אני רואה כאן'}</button>}</li>)}</ul>
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

function SettingsSheet({spoil,setSpoil,close,size,setSize,user,canLogin,login,logout,status,syncing,sync,items,restore}:{spoil:boolean;setSpoil:(v:boolean)=>void;close:()=>void;size:string;setSize:(v:string)=>void;user:User|null;canLogin:boolean;login:()=>Promise<void>;logout:()=>Promise<void>;
 status:{tmdb:boolean;db:boolean}|null;syncing:boolean;sync:()=>void;items:Item[];restore:(l:Item[])=>void}){const ref=useSheet(close);const file=useRef<HTMLInputElement>(null);const [msg,setMsg]=useState('');
 const backup=()=>{const b=new Blob([JSON.stringify({app:'unwatch',v:1,items},null,1)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='unwatch-'+todayISO()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),3000);};
 return <div className="sheet" role="dialog" aria-modal="true" aria-label="הגדרות"><div className="sheetTop"><h2 style={{margin:0}}>הגדרות</h2><button ref={ref} className="ib" aria-label="סגירה" onClick={close}><X/></button></div>
  <AnimSetting/>
  <section className="set" aria-labelledby="h-size"><h3 id="h-size">גודל טקסט</h3><div className="seg" role="group" aria-labelledby="h-size">{([['','רגיל'],['large','גדול'],['xlarge','גדול מאוד']] as const).map(([v,t])=><button key={t} aria-pressed={size===v} onClick={()=>setSize(v)}>{t}</button>)}</div></section>
  <NotifySettings items={items}/>
  <CinemaPicker/>
  <section className="set"><label className="swRow"><span><b>מגן ספוילרים</b><small>מסתיר שמות של פרקים שעוד לא ראית</small></span><input type="checkbox" role="switch" className="sw" checked={spoil} onChange={e=>setSpoil(e.target.checked)}/></label></section>
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

function FreeTime({min,ups,shows,movies,open}:{min:number;ups:{it:Item;up:Up|null}[];shows:Record<string,Summary>;movies:Item[];open:(k:string)=>void}){
 const eps=ups.filter(x=>x.up?.state==='ready').map(x=>{const rt=shows[x.it.key]?.runtime||24;const left=x.up?.state==='ready'?x.up.left:0;return {it:x.it,n:Math.min(left,Math.floor(min/rt)),rt};}).filter(x=>x.n>0).sort((a,b)=>b.n*b.rt-a.n*a.rt);
 const mv=movies.map(m=>({it:m,rt:shows[m.key]?.runtime||0})).filter(m=>m.rt&&m.rt<=min).sort((a,b)=>b.rt-a.rt);
 return <div className="note" role="status" style={{marginTop:10}}><b>מה נכנס ב{dur(min)}:</b>{!eps.length&&!mv.length&&<p className="setNote" style={{margin:'6px 0 0'}}>אין משהו שנכנס בזמן הזה.</p>}
  <div style={{display:'grid',gap:8,marginTop:8}}>{eps.slice(0,4).map(x=><button key={x.it.key} className="line" onClick={()=>open(x.it.key)}><Poster src={x.it.poster} kind={x.it.kind}/><span className="info"><span className="nm" dir="auto">{bidi(x.it.title)}</span><span className="meta">{x.n===1?'פרק אחד':x.n+' פרקים'} · {dur(x.n*x.rt)}</span></span></button>)}
   {mv.slice(0,3).map(x=><button key={x.it.key} className="line" onClick={()=>open(x.it.key)}><Poster src={x.it.poster} kind={x.it.kind}/><span className="info"><span className="nm" dir="auto">{bidi(x.it.title)}</span><span className="meta">סרט · {dur(x.rt)}</span></span></button>)}</div></div>;}

function StatsSheet({close,items,shows}:{close:()=>void;items:Item[];shows:Record<string,Summary>}){const ref=useSheet(close);const y=new Date().getFullYear();
 const log=read<Log[]>(LS.log,[]).filter(l=>new Date(l.t).getFullYear()===y);const minutes=log.reduce((a,l)=>a+l.min,0);
 const epsN=log.filter(l=>l.kind!=='movie'||items.find(i=>i.key===l.k)?.media==='tv').reduce((a,l)=>a+l.n,0);const movies=log.filter(l=>l.k.startsWith('movie:')).length;
 const cinema=items.filter(i=>i.source==='cinema'&&i.watchedAt&&new Date(i.watchedAt).getFullYear()===y).length;
 const by=new Map<string,{title:string;min:number}>();for(const l of log){const c=by.get(l.k)||{title:l.title,min:0};c.min+=l.min;by.set(l.k,c);}const top=[...by.values()].sort((a,b)=>b.min-a.min).slice(0,5);
 const kinds=(['anime','tv','movie'] as Kind[]).map(k=>({k,min:log.filter(l=>l.kind===k).reduce((a,l)=>a+l.min,0)}));
 // Everything ever watched, estimated from where each show stands.
 const all=items.reduce((a,i)=>{const s=shows[i.key];if(i.media==='tv'&&i.at&&s)return a+absOf(i.at,s.seasons)*(s.runtime||24);if(i.media==='movie'&&i.status==='done')return a+(s?.runtime||100);return a;},0);
 return <div className="sheet" role="dialog" aria-modal="true" aria-label="הסיכום שלי"><div className="sheetTop"><h2 style={{margin:0}}>הסיכום שלי - {y}</h2><button ref={ref} className="ib" aria-label="סגירה" onClick={close}><X/></button></div>
  <div className="statGrid"><div><b>{dur(minutes)}</b><span>זמן צפייה השנה</span></div><div><b>{epsN}</b><span>פרקים</span></div><div><b>{movies}</b><span>סרטים</span></div><div><b>{cinema}</b><span>בקולנוע</span></div></div>
  {minutes>0&&<section className="set"><h3>לפי סוג</h3>{kinds.map(x=><div key={x.k} className="bar"><span>{KIND_LABEL[x.k]}</span><span className="track" aria-hidden="true"><i style={{width:(minutes?x.min/minutes*100:0)+'%'}}/></span><b>{dur(x.min)}</b></div>)}</section>}
  {top.length>0&&<section className="set"><h3>הכי הרבה זמן</h3><ol className="top">{top.map(t=><li key={t.title}><span dir="auto">{bidi(t.title)}</span><b>{dur(t.min)}</b></li>)}</ol></section>}
  {!log.length&&<p className="setNote">הסיכום מתמלא מכל "צפיתי" שתסמן מעכשיו.</p>}
  {all>0&&<p className="setNote" style={{textAlign:'center'}}>בסך הכל, לפי הספרייה: בערך {dur(all)} של צפייה.</p>}
 </div>;}

type CFilm={id:string;name:string;poster:string|null;length:number|null;link:string|null;dub:boolean;sub:boolean;shows:{cinema:string;date:string;time:string;type:'dub'|'sub'|'orig';format:string[];link:string|null;hall:string|null;soldOut:boolean}[]};
const SHOW_TYPE={dub:'מדובב',sub:'כתוביות',orig:'שפת מקור'} as const;
function ShowList({f,only}:{f:CFilm;only:''|'dub'|'sub'}){const list=f.shows.filter(x=>!only||x.type===only);const days=[...new Set(list.map(x=>x.date))];
 return <div className="shows">{days.map(d=><div key={d}><h4>{whenText(d)}</h4><ul>{list.filter(x=>x.date===d).map((x,i)=><li key={i}>
  <a className={'show '+x.type} href={x.link||f.link||'#'} target="_blank" rel="noopener noreferrer" aria-label={x.time+', '+x.cinema+', '+SHOW_TYPE[x.type]+(x.format.length?', '+x.format.join(' '):'')+(x.soldOut?', אזל':', להזמנת כרטיסים')}>
   <b>{x.time}</b><span>{x.cinema}</span><span className="tp">{x.type==='dub'?<Mic aria-hidden="true"/>:x.type==='sub'?<Captions aria-hidden="true"/>:null}{SHOW_TYPE[x.type]}{x.format.length?' · '+x.format.join(' '):''}</span>{x.soldOut&&<span className="pill dim">אזל</span>}</a></li>)}</ul></div>)}</div>;}
// Screenings in the chosen Planet cinemas, filtered by dubbed / subtitled.
function Showtimes({pick}:{pick:()=>void}){const [ids]=useState(()=>read<string[]>(LS.cinemas,[]));const [films,setFilms]=useState<CFilm[]|null>(null);const [err,setErr]=useState('');const [only,setOnly]=useState<''|'dub'|'sub'>('');const [openF,setOpenF]=useState<string|null>(null);
 useEffect(()=>{if(!ids.length)return;api<{films:CFilm[]}>('/api/showtimes?c='+ids.join(',')).then(r=>setFilms(r.films)).catch(e=>setErr(e.message));},[ids]);
 if(!ids.length)return <div className="note"><b><Languages size={18} aria-hidden="true"/> הקרנות מדובבות ועם כתוביות</b><p className="setNote" style={{margin:'6px 0 10px'}}>בחר עד 3 סניפים (פלאנט, רב-חן, HOT), ותראה לכל סרט איפה ומתי יש הקרנה מדובבת או עם כתוביות.</p><button className="primary full" onClick={pick}><MapPin aria-hidden="true"/>בחירת סניפים</button></div>;
 const list=(films||[]).filter(f=>!only||(only==='dub'?f.dub:f.sub));
 return <section aria-labelledby="h-shows"><h2 className="sec" id="h-shows">הקרנות לפי שפה</h2>
  <div className="chips" role="group" aria-label="סוג הקרנה"><button className="chip" aria-pressed={!only} onClick={()=>setOnly('')}>הכל</button><button className="chip" aria-pressed={only==='dub'} onClick={()=>setOnly(only==='dub'?'':'dub')}><Mic size={16} aria-hidden="true"/>מדובב</button><button className="chip" aria-pressed={only==='sub'} onClick={()=>setOnly(only==='sub'?'':'sub')}><Captions size={16} aria-hidden="true"/>כתוביות</button><button className="chip" onClick={pick}><MapPin size={16} aria-hidden="true"/>סניפים</button></div>
  {err&&<p className="note" role="alert">{err}</p>}{!films&&!err&&<Loader text="בודק הקרנות…"/>}
  {films&&!list.length&&<p className="setNote">אין הקרנות {only==='dub'?'מדובבות ':only==='sub'?'עם כתוביות ':''}בסניפים שבחרת בימים הקרובים.</p>}
  <ul className="list">{list.slice(0,40).map((f,n)=><li key={f.id} className="card rise" style={{'--i':n} as React.CSSProperties}>
   <button className="open" aria-expanded={openF===f.id} onClick={()=>setOpenF(openF===f.id?null:f.id)}><span className="poster">{f.poster?<img src={f.poster} alt="" loading="lazy" onLoad={e=>e.currentTarget.classList.add('in')}/>:<Film size={26} aria-hidden="true"/>}</span>
    <span className="info"><span className="nm" dir="auto">{bidi(f.name)}</span><span className="meta">{f.dub&&<span className="pill ok"><Mic aria-hidden="true"/>מדובב</span>}{f.sub&&<span className="pill ok"><Captions aria-hidden="true"/>כתוביות</span>}{!f.dub&&!f.sub&&<span className="pill dim">שפת מקור</span>}</span>
    <span className="meta">{f.shows.filter(x=>!only||x.type===only).length} הקרנות{f.length?' · '+dur(f.length):''}</span></span><ChevronDown size={20} aria-hidden="true" className={openF===f.id?'rot':''}/></button>
   {openF===f.id&&<ShowList f={f} only={only}/>}</li>)}</ul>
 </section>;}
function MovieShows({k}:{k:string}){const [ids]=useState(()=>read<string[]>(LS.cinemas,[]));const [films,setFilms]=useState<CFilm[]|null>(null);const [only,setOnly]=useState<''|'dub'|'sub'>('');
 useEffect(()=>{if(ids.length)api<{films:CFilm[]}>('/api/showtimes?c='+ids.join(',')+'&key='+encodeURIComponent(k)).then(r=>setFilms(r.films)).catch(()=>setFilms([]));},[ids,k]);
 if(!ids.length||!films||!films.length)return null;const f:CFilm={...films[0],dub:films.some(x=>x.dub),sub:films.some(x=>x.sub),shows:films.flatMap(x=>x.shows).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time))};
 return <section className="set" aria-labelledby="h-ms"><h3 id="h-ms"><Ticket aria-hidden="true"/>הקרנות בסניפים שלך</h3>
  <div className="chips" role="group" aria-label="סוג הקרנה" style={{marginTop:0}}><button className="chip" aria-pressed={!only} onClick={()=>setOnly('')}>הכל</button>{f.dub&&<button className="chip" aria-pressed={only==='dub'} onClick={()=>setOnly('dub')}><Mic size={16} aria-hidden="true"/>מדובב</button>}{f.sub&&<button className="chip" aria-pressed={only==='sub'} onClick={()=>setOnly('sub')}><Captions size={16} aria-hidden="true"/>כתוביות</button>}</div>
  <ShowList f={f} only={only}/></section>;}
function CinemaPicker(){const [all,setAll]=useState<{id:string;name:string;city:string;chain:string}[]|null>(null);const [err,setErr]=useState('');const [ids,setIds]=useState<string[]>(()=>read<string[]>(LS.cinemas,[]).map(x=>/^\d+$/.test(x)?'p:'+x:x));
 useEffect(()=>{api<{cinemas:{id:string;name:string;city:string;chain:string}[]}>('/api/cinemas').then(r=>setAll(r.cinemas)).catch(e=>setErr(e.message));},[]);
 const toggle=(id:string)=>{const n=ids.includes(id)?ids.filter(x=>x!==id):[...ids,id].slice(-3);setIds(n);write(LS.cinemas,n);};
 return <section className="set" aria-labelledby="h-cp"><h3 id="h-cp"><MapPin aria-hidden="true"/>סניפי קולנוע</h3><p className="setNote" style={{marginTop:0}}>עד 3 סניפים, להקרנות מדובבות ועם כתוביות.</p>
  {err&&<p className="setNote" role="alert">{err}</p>}{!all&&!err&&<p className="setNote" role="status">טוען סניפים…</p>}
  {all&&[...new Set(all.map(c=>c.chain))].map(ch=><div key={ch}><p className="setNote" style={{margin:'10px 0 6px',fontWeight:600,color:'var(--ink)'}}>{ch}</p><div className="chips wrap" role="group" aria-label={'סניפי '+ch} style={{marginTop:0}}>{all.filter(c=>c.chain===ch).map(c=><button key={c.id} className="chip" aria-pressed={ids.includes(c.id)} onClick={()=>toggle(c.id)}>{c.name}</button>)}</div></div>)}
  {ids.length>0&&<p className="setNote" role="status">נבחרו {ids.length} מתוך 3</p>}</section>;}
function NotifySettings({items}:{items:Item[]}){const [st,setSt]=useState(()=>read<{on:boolean;prefs:{ep:boolean;he:boolean;movie:boolean}}>(LS.notif,{on:false,prefs:{ep:true,he:true,movie:true}}));const [msg,setMsg]=useState('');const [busy,setBusy]=useState(false);
 const supported=typeof window!=='undefined'&&'serviceWorker' in navigator&&'PushManager' in window;const standalone=typeof window!=='undefined'&&(matchMedia('(display-mode: standalone)').matches||(navigator as {standalone?:boolean}).standalone===true);
 const save=(n:typeof st)=>{setSt(n);write(LS.notif,n);};
 const post=(b:object)=>api<{ok:boolean}>('/api/push',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({device:deviceId(),...b})});
 const follows=()=>items.filter(i=>i.status!=='dropped').slice(0,400).map(i=>({key:i.key,title:i.title.slice(0,200),status:i.status,media:i.media}));
 const enable=async()=>{setBusy(true);setMsg('');try{const k=await api<{enabled:boolean;publicKey:string}>('/api/push');if(!k.enabled)throw new Error('ההתראות עוד לא מחוברות בשרת (חסר מסד נתונים).');
   if(await Notification.requestPermission()!=='granted')throw new Error('לא התקבל אישור להתראות. אפשר לאשר בהגדרות האייפון.');
   const reg=await navigator.serviceWorker.register('/sw.js');await navigator.serviceWorker.ready;const key=Uint8Array.from(atob(k.publicKey.replace(/-/g,'+').replace(/_/g,'/')+'=='.slice(0,(4-k.publicKey.length%4)%4)),c=>c.charCodeAt(0));
   const sub=await reg.pushManager.getSubscription()||await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:key});
   await post({subscription:sub.toJSON(),items:follows(),prefs:st.prefs});save({...st,on:true});setMsg('ההתראות פעילות. נשלחה התראת בדיקה.');}catch(e){setMsg(e instanceof Error?e.message:'לא ניתן להפעיל כרגע.');}finally{setBusy(false);}};
 const disable=async()=>{setBusy(true);try{await post({remove:true});const reg=await navigator.serviceWorker.getRegistration();await (await reg?.pushManager.getSubscription())?.unsubscribe();}catch{}save({...st,on:false});setMsg('ההתראות כבויות.');setBusy(false);};
 const pref=(k:'ep'|'he'|'movie',v:boolean)=>{const n={...st,prefs:{...st.prefs,[k]:v}};save(n);if(n.on)post({prefs:n.prefs}).catch(()=>{});};
 return <section className="set" aria-labelledby="h-nt"><h3 id="h-nt"><Bell aria-hidden="true"/>התראות</h3>
  {!supported?<p className="setNote">הדפדפן הזה לא תומך בהתראות.</p>:!standalone&&!st.on?<p className="setNote">באייפון, התראות עובדות רק מהאפליקציה שעל מסך הבית. פתח את Unwatch משם.</p>:null}
  {supported&&(st.on?<button className="ghost full" style={{marginTop:0}} onClick={disable} disabled={busy}><BellOff aria-hidden="true"/>כיבוי התראות</button>:<button className="primary full" style={{marginTop:0}} onClick={enable} disabled={busy}><Bell aria-hidden="true"/>{busy?'מפעיל…':'הפעלת התראות'}</button>)}
  {([['ep','פרק חדש יצא','לסדרות שאתה צופה בהן, ובשעה המדויקת לאנימה'],['he','הגיע דיבוב או כתוביות בעברית','לכותרים ברשימה ובצפייה'],['movie','סרט מהרשימה יצא','בקולנוע בישראל או בשירות צפייה']] as const).map(([k,t,d])=>
   <label key={k} className="swRow"><span><b>{t}</b><small>{d}</small></span><input type="checkbox" role="switch" className="sw" checked={st.prefs[k]} onChange={e=>pref(k,e.target.checked)}/></label>)}
  {st.on&&<button className="ghost full" onClick={()=>post({test:true}).then(()=>setMsg('נשלחה התראת בדיקה.')).catch(e=>setMsg(e.message))}>שליחת התראת בדיקה</button>}
  <p className="setNote">לא נשלחות התראות בין 23:00 ל-9:00 - הן מחכות לבוקר.</p>
  {msg&&<p className="setNote" role="status">{msg}</p>}</section>;}

function AnimSetting(){const [v,setV]=useState<AnimPref>(()=>read<AnimPref>('unwatch:anim','on'));const set=(x:AnimPref)=>{setV(x);write('unwatch:anim',x);};
 return <section className="set" aria-labelledby="h-anim"><h3 id="h-anim">אנימציית פתיחה וטעינה</h3>
  <div className="seg" role="group" aria-labelledby="h-anim">{([['on','תמיד'],['auto','לפי האייפון'],['off','כבויה']] as const).map(([k,t])=><button key={k} aria-pressed={v===k} onClick={()=>set(k)}>{t}</button>)}</div>
  <p className="setNote">"לפי האייפון" מכבה אותה כשמופעלת "הפחתת תנועה" בהגדרות הנגישות.</p></section>;}
