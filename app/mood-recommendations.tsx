'use client';
import {useEffect,useRef,useState} from 'react';
import {Sparkles,RefreshCw} from 'lucide-react';
import type {Hit,Item} from '@/lib/types';
const moods=[['happy','😊','משהו משמח'],['excited','🔥','אקשן'],['calm','🌿','רגוע'],['thoughtful','🧩','מחשבה ומסתורין'],['anime','✨','אנימה'],['surprise','🎲','תפתיע אותי'],['sad','😢','עצוב'],['angry','😤','כועס'],['scared','😨','מפחד'],['nostalgic','📼','נוסטלגי'],['tired','😴','בלי כוח'],['dark','🌑','אפל']] as const;
type Suggestion=Hit&{reason:string};
export default function MoodRecommendations({items,open}:{items:Item[];open:(key:string,hit?:Hit)=>void}){
 const scrollRef=useRef<HTMLDivElement>(null);
 useEffect(()=>{const el=scrollRef.current;if(!el)return;el.scrollLeft=0;const frame=requestAnimationFrame(()=>{el.scrollLeft=0;});return ()=>cancelAnimationFrame(frame);},[]);
 const [mood,setMood]=useState<string>('');const [results,setResults]=useState<Suggestion[]>([]);const [loading,setLoading]=useState(false);const [error,setError]=useState('');
 async function load(next:string){setMood(next);setLoading(true);setError('');setResults([]);
  try{const r=await fetch('/api/recommendations',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({mood:next,library:items.map(i=>({key:i.key,rating:i.rating,status:i.status,kind:i.kind}))})});
   const data=await r.json();if(!r.ok)throw new Error(data.error||'שגיאה');setResults(data.results||[]);
  }catch(e){setError(e instanceof Error?e.message:'שגיאה בטעינת המלצות');}finally{setLoading(false);}
 }
 return <section className="set" aria-labelledby="mood-heading" style={{marginTop:20}}>
  <h2 id="mood-heading"><Sparkles size={22} aria-hidden="true"/> מה לראות לפי מצב הרוח?</h2>

  <div ref={scrollRef} className="moodChoices" role="group" dir="rtl" aria-label="בחירת מצב רוח" style={{display:'flex',overflowX:'auto',flexWrap:'nowrap',justifyContent:'flex-start',direction:'rtl',overscrollBehaviorX:'contain',gap:6,margin:'8px 0',paddingBottom:5,scrollbarWidth:'thin'}}>
   {moods.map(([id,emoji,label])=><button key={id} type="button" className={mood===id?'primary':'ghost'} aria-pressed={mood===id} disabled={loading} onClick={()=>load(id)} style={{flex:'0 0 auto',minHeight:40,padding:'7px 12px',whiteSpace:'nowrap',fontSize:14,borderRadius:999}}>{emoji} {label}</button>)}
  </div>

  {loading&&<p role="status" className="setNote">מחפש המלצות שמתאימות לך…</p>}
  {error&&<p role="alert" className="note">{error}</p>}
  {!!results.length&&<><button className="ghost" disabled={loading} onClick={()=>load(mood)} style={{padding:'6px 10px',minHeight:34,fontSize:13}}><RefreshCw size={15}/> רענון</button>
   <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(145px,1fr))',gap:12,marginTop:14}}>
    {results.map(r=><button key={r.key} onClick={()=>open(r.key,r)} className="ghost" style={{display:'flex',flexDirection:'column',alignItems:'stretch',textAlign:'right',padding:8,gap:7}}>
     {r.poster&&<img src={r.poster} alt="" loading="lazy" style={{width:'100%',aspectRatio:'2 / 3',objectFit:'cover',borderRadius:10}}/>}
     <strong dir="auto">{r.title}</strong><small>{r.year} · {r.kind==='anime'?'אנימה':r.media==='movie'?'סרט':'סדרה'}</small><small>{r.reason}</small>
    </button>)}
   </div></>}
 </section>;
}
