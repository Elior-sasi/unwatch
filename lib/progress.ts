// "Where did I stop" logic: the next episode to watch, whether it is out yet, and how many are waiting.
import type {Ep,Item,Summary} from './types';
const cmp=(a:{s:number;e:number},b:{s:number;e:number})=>a.s-b.s||a.e-b.e;
export function after(at:{s:number;e:number}|null,seasons:{n:number;count:number}[]):{s:number;e:number}|null{
 const list=[...seasons].filter(s=>s.count>0).sort((a,b)=>a.n-b.n);if(!list.length)return null;
 if(!at)return {s:list[0].n,e:1};
 const cur=list.find(s=>s.n===at.s);if(cur&&at.e<cur.count)return {s:at.s,e:at.e+1};
 const nx=list.find(s=>s.n>at.s);return nx?{s:nx.n,e:1}:null;}
export function before(at:{s:number;e:number},seasons:{n:number;count:number}[]):{s:number;e:number}|null{
 if(at.e>1)return {s:at.s,e:at.e-1};const prev=[...seasons].filter(s=>s.n<at.s&&s.count>0).sort((a,b)=>b.n-a.n)[0];return prev?{s:prev.n,e:prev.count}:null;}
// An episode is out when TMDB lists it as aired (last episode to air), or its date has passed.
export function isOut(x:{s:number;e:number},sum:Pick<Summary,'last'|'next'>,today=new Date()):boolean{
 if(sum.last&&cmp(x,sum.last)<=0)return true;
 if(sum.next&&cmp(x,sum.next)===0&&sum.next.air)return new Date(sum.next.air+'T23:59:59')<=today;return false;}
// How many episodes are already out after the last one watched.
export function behind(at:{s:number;e:number}|null,sum:Summary):number{if(!sum.last)return 0;let n=0;let x=after(at,sum.seasons);let guard=0;
 while(x&&cmp(x,sum.last)<=0&&guard++<3000){n++;x=after(x,sum.seasons);}return n;}
export type Up={state:'ready';ep:{s:number;e:number};left:number}|{state:'wait';ep:{s:number;e:number};air?:string}|{state:'caught';air?:string}|{state:'ended'};
export function upNext(item:Pick<Item,'at'>,sum:Summary):Up{const nx=after(item.at,sum.seasons);
 if(nx&&isOut(nx,sum))return {state:'ready',ep:nx,left:behind(item.at,sum)};
 if(nx)return {state:'wait',ep:nx,air:sum.next&&cmp(nx,sum.next)===0?sum.next.air:undefined};
 if(sum.next)return {state:'caught',air:sum.next.air};
 return /הסתיימה|בוטלה/.test(sum.status)?{state:'ended'}:{state:'caught'};}
// "עונה 2 · פרק 5", or just "פרק 5" for a show with one season.
export function epLabel(x:{s:number;e:number},seasons:number){return seasons>1||x.s>1?'עונה '+x.s+' · פרק '+x.e:'פרק '+x.e;}
export function epShort(x:{s:number;e:number}){return 'ע'+x.s+' פ'+x.e;}
// Days until a date (0 = today), in local time.
export function daysTo(date:string,today=new Date()){const d=new Date(date+'T00:00:00');const t=new Date(today.getFullYear(),today.getMonth(),today.getDate());return Math.round((d.getTime()-t.getTime())/864e5);}
export function whenText(date:string,today=new Date()){const n=daysTo(date,today);if(n===0)return 'היום';if(n===1)return 'מחר';if(n===-1)return 'אתמול';
 if(n>1&&n<7)return 'ביום '+['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'][new Date(date+'T00:00:00').getDay()];
 const d=new Date(date+'T00:00:00');return d.toLocaleDateString('he-IL',{day:'numeric',month:'numeric',...(d.getFullYear()!==today.getFullYear()?{year:'numeric'}:{})});}
export function epOf(e:Ep){return {s:e.s,e:e.e};}
