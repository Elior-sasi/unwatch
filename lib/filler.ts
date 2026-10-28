// Filler episodes from animefillerlist.com, as absolute episode numbers (episode 1 = first episode of the show).
export function slugOf(title:string){return title.toLowerCase().replace(/&/g,'and').replace(/['’:!?.,()]/g,'').trim().replace(/\s+/g,'-');}
export function ranges(text:string):number[]{const out:number[]=[];for(const m of text.matchAll(/(\d{1,4})(?:\s*-\s*(\d{1,4}))?/g)){const a=+m[1],b=m[2]?+m[2]:a;if(b>=a&&b-a<2000)for(let i=a;i<=b;i++)out.push(i);}return out;}
// The page lists them per type in blocks like <div class="filler"><span class="Episodes"><a>54-61</a>, <a>98-99</a></span></div>.
export function parseFiller(html:string){const block=(cls:string)=>{const m=html.match(new RegExp('<div class="'+cls.replace('/','\\/')+'">[\\s\\S]*?<span class="Episodes">([\\s\\S]*?)</span>'));
  return m?ranges(m[1].replace(/<[^>]+>/g,' ')):[];};
 let filler=block('filler');let mixed=block('mixed_canon/filler');
 // Fallback: the full episode table, rows marked filler / mixed.
 if(!filler.length){for(const m of html.matchAll(/<tr class="(filler|mixed_canon\/filler)[^"]*"[^>]*>[\s\S]*?<td class="Number">(\d+)<\/td>/g))(m[1]==='filler'?filler:mixed).push(+m[2]);}
 filler=[...new Set(filler)].sort((a,b)=>a-b);mixed=[...new Set(mixed)].sort((a,b)=>a-b);return {filler,mixed};}
export async function fillers(titles:string[]){for(const t of titles.filter(Boolean)){const slug=slugOf(t);if(!slug)continue;
  const r=await fetch('https://www.animefillerlist.com/shows/'+slug,{headers:{'user-agent':'Mozilla/5.0 Unwatch'},next:{revalidate:7*24*3600}}).catch(()=>null);
  if(!r||!r.ok)continue;const p=parseFiller(await r.text());if(p.filler.length||p.mixed.length)return {...p,source:'https://www.animefillerlist.com/shows/'+slug};}
 return null;}
