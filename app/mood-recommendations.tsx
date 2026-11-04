'use client';
import {useEffect,useRef,useState} from 'react';
import {Sparkles,RefreshCw,ThumbsDown,Shuffle,ChevronLeft,ChevronRight} from 'lucide-react';
import type {Hit,Item} from '@/lib/types';
const moods=[['happy','😊','משהו משמח'],['excited','🔥','אקשן'],['calm','🌿','רגוע'],['thoughtful','🧩','מחשבה ומסתורין'],['anime','✨','אנימה'],['sad','😢','עצוב'],['angry','😤','כועס'],['scared','😨','מפחד'],['nostalgic','📼','נוסטלגי'],['tired','😴','בלי כוח'],['dark','🌑','אפל'],['surprise','🎲','תפתיע אותי']] as const;
type Suggestion=Hit&{reason:string};
export default function MoodRecommendations({items,open}:{items:Item[];open:(key:string,hit?:Hit)=>void}){
 const scrollRef=useRef<HTMLDivElement>(null);const cardsRef=useRef<HTMLDivElement>(null);const [cardIndex,setCardIndex]=useState(0);
 const moveCard=(delta:number)=>{const el=cardsRef.current;if(!el)return;const cards=el.querySelectorAll<HTMLElement>('[data-recommendation-card]');const next=Math.max(0,Math.min(cards.length-1,cardIndex+delta));cards[next]?.scrollIntoView({behavior:'smooth',block:'nearest',inline:'start'});setCardIndex(next);};
 useEffect(()=>{const el=scrollRef.current;if(!el)return;el.scrollLeft=0;const frame=requestAnimationFrame(()=>{el.scrollLeft=0;});return ()=>cancelAnimationFrame(frame);},[]);
 const [disliked,setDisliked]=useState<string[]>([]);const [single,setSingle]=useState(false);
 useEffect(()=>{try{const v=JSON.parse(localStorage.getItem('unwatch:disliked')||'[]');if(Array.isArray(v))setDisliked(v.filter((x:unknown)=>typeof x==='string'));}catch{}},[]);
 const dismiss=(key:string)=>{const next=[...new Set([...disliked,key])];setDisliked(next);try{localStorage.setItem('unwatch:disliked',JSON.stringify(next));}catch{}setResults(r=>r.filter(x=>x.key!==key));setCardIndex(0);};
 const seenRef=useRef<Record<string,string[]>>({});const pageRef=useRef<Record<string,number>>({});
 const [mood,setMood]=useState<string>('');const [results,setResults]=useState<Suggestion[]>([]);const [loading,setLoading]=useState(false);const [error,setError]=useState('');
 async function load(next:string,refresh=false){setMood(next);setLoading(true);setError('');setCardIndex(0);
  const exclude=refresh?(seenRef.current[next]||[]):[];const page=refresh?(pageRef.current[next]||1)+1:1;
  try{const r=await fetch('/api/recommendations',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({mood:next,library:items.map(i=>({key:i.key,rating:i.rating,status:i.status,kind:i.kind,title:i.title})),disliked,exclude,page})})});
   const data=await r.json();if(!r.ok)throw new Error(data.error||'שגיאה');const incoming=(data.results||[]) as Suggestion[];
   if(refresh&&!incoming.length){setError('אין כרגע המלצות חדשות נוספות למצב הרוח הזה.');return;}
   setResults(incoming);pageRef.current[next]=page;seenRef.current[next]=[...new Set([...(seenRef.current[next]||[]),...incoming.map(x=>x.key)])].slice(-2000);
  }catch(e){setError(e instanceof Error?e.message:'שגיאה בטעינת המלצות');}finally{setLoading(false);}
 }
 return <section className="set" aria-labelledby="mood-heading" style={{marginTop:20}}>
  <h2 id="mood-heading"><Sparkles size={22} aria-hidden="true"/> מה לראות לפי מצב הרוח?</h2>

  <div ref={scrollRef} className="moodChoices" role="group" dir="rtl" aria-label="בחירת מצב רוח" style={{display:'flex',overflowX:'auto',flexWrap:'nowrap',justifyContent:'flex-start',direction:'rtl',overscrollBehaviorX:'contain',gap:6,margin:'8px 0',paddingBottom:5,scrollbarWidth:'thin'}}>
   {moods.map(([id,emoji,label])=><button key={id} type="button" className={mood===id?'primary':'ghost'} aria-pressed={mood===id} disabled={loading} onClick={()=>load(id)} style={{flex:'0 0 auto',minHeight:40,padding:'7px 12px',whiteSpace:'nowrap',fontSize:14,borderRadius:999}}>{emoji} {label}</button>)}
  </div>

  {loading&&<p role="status" className="setNote">מחפש המלצות שמתאימות לך…</p>}
  {error&&<p role="alert" className="note">{error}</p>}
  {!!results.length&&<><div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}><button className="ghost" onClick={()=>{setSingle(v=>!v);setCardIndex(0);}} style={{padding:'6px 10px',minHeight:34,fontSize:13}}><Shuffle size={15}/>{single?'כל ההמלצות':'תבחר בשבילי'}</button><button className="ghost" disabled={loading} onClick={()=>load(mood,true)} style={{padding:'6px 10px',minHeight:34,fontSize:13}}><RefreshCw size={15}/> רענון</button></div>
   {!single&&<div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:10,gap:8}}>
    <span className="setNote" aria-live="polite">{Math.min(cardIndex+1,results.length)} מתוך {results.length}</span>
    <div style={{display:'flex',gap:6}}><button type="button" className="ghost" aria-label="ההמלצה הקודמת" disabled={cardIndex===0} onClick={()=>moveCard(-1)} style={{padding:6,minHeight:36}}><ChevronRight size={19}/></button><button type="button" className="ghost" aria-label="ההמלצה הבאה" disabled={cardIndex>=results.length-1} onClick={()=>moveCard(1)} style={{padding:6,minHeight:36}}><ChevronLeft size={19}/></button></div>
   </div>}
   <div ref={cardsRef} dir="rtl" onScroll={e=>{if(single)return;const el=e.currentTarget;const first=el.querySelector<HTMLElement>('[data-recommendation-card]');if(first){const step=first.offsetWidth+10;setCardIndex(Math.max(0,Math.min(results.length-1,Math.round(Math.abs(el.scrollLeft)/step))));}}} style={{display:'flex',overflowX:single?'hidden':'auto',scrollSnapType:'x mandatory',gap:10,marginTop:10,paddingBottom:6,overscrollBehaviorX:'contain',scrollbarWidth:'none'}}>
    {(single?results.slice(0,1):results).map(r=><article data-recommendation-card key={r.key} className="ghost" style={{flex:'0 0 100%',minWidth:0,boxSizing:'border-box',scrollSnapAlign:'start',display:'flex',alignItems:'start',textAlign:'right',padding:10,gap:12}}>
     {r.poster&&<button type="button" onClick={()=>open(r.key,r)} style={{background:'none',border:0,padding:0,flex:'0 0 96px',cursor:'pointer'}}><img src={r.poster} alt="" loading="lazy" style={{width:96,aspectRatio:'2 / 3',objectFit:'cover',borderRadius:9,display:'block'}}/></button>}
     <div style={{minWidth:0,display:'flex',flexDirection:'column',alignItems:'start',gap:6}}>
      <button type="button" onClick={()=>open(r.key,r)} style={{background:'none',border:0,color:'inherit',textAlign:'right',padding:0,font:'inherit',cursor:'pointer'}}><strong dir="auto">{r.title}</strong></button>
      <small>{r.year} · {r.kind==='anime'?'אנימה':r.media==='movie'?'סרט':'סדרה'}</small>
      <small>{r.reason}</small>
      <button type="button" onClick={()=>dismiss(r.key)} className="ghost" style={{padding:'5px 8px',minHeight:32,fontSize:12}}><ThumbsDown size={14}/> לא בשבילי</button>
     </div>
    </article>)}
   </div></>}
 </section>;
}
