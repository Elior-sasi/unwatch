import {test} from 'node:test';
import assert from 'node:assert/strict';
import {after,before,behind,upNext,epLabel,whenText,isOut} from '../lib/progress';
import {kindOf,pickTitle,toHit,providersIL,releaseIL} from '../lib/tmdb';
import {merge} from '../lib/library';
import type {Item,Summary} from '../lib/types';

const seasons=[{n:1,count:12},{n:2,count:10}];
const sum=(last:{s:number;e:number}|null,next:{s:number;e:number;air?:string}|null,status='ממשיכה'):Summary=>({key:'tv:1',seasons,last,next,status,stream:[]});

test('next episode crosses seasons',()=>{
 assert.deepEqual(after(null,seasons),{s:1,e:1});
 assert.deepEqual(after({s:1,e:5},seasons),{s:1,e:6});
 assert.deepEqual(after({s:1,e:12},seasons),{s:2,e:1});
 assert.equal(after({s:2,e:10},seasons),null);
 assert.deepEqual(before({s:2,e:1},seasons),{s:1,e:12});
 assert.equal(before({s:1,e:1},seasons),null);
});
test('behind counts aired episodes only',()=>{
 assert.equal(behind({s:1,e:10},sum({s:2,e:3},{s:2,e:4})),5);
 assert.equal(behind(null,sum({s:1,e:3},null)),3);
 assert.equal(behind({s:2,e:3},sum({s:2,e:3},{s:2,e:4})),0);
});
test('up next states',()=>{
 assert.deepEqual(upNext({at:{s:1,e:2}},sum({s:1,e:5},{s:1,e:6})),{state:'ready',ep:{s:1,e:3},left:3});
 assert.deepEqual(upNext({at:{s:1,e:5}},sum({s:1,e:5},{s:1,e:6,air:'2099-01-01'})),{state:'wait',ep:{s:1,e:6},air:'2099-01-01'});
 assert.deepEqual(upNext({at:{s:2,e:10}},sum({s:2,e:10},null,'הסתיימה')),{state:'ended'});
 assert.deepEqual(upNext({at:{s:2,e:10}},sum({s:2,e:10},{s:3,e:1,air:'2099-02-01'})),{state:'caught',air:'2099-02-01'});
});
test('an episode whose date passed counts as out',()=>{
 assert.equal(isOut({s:1,e:6},{last:{s:1,e:5},next:{s:1,e:6,air:'2026-01-01'}},new Date('2026-01-02')),true);
 assert.equal(isOut({s:1,e:6},{last:{s:1,e:5},next:{s:1,e:6,air:'2026-01-03'}},new Date('2026-01-02')),false);
});
test('labels',()=>{
 assert.equal(epLabel({s:1,e:4},1),'פרק 4');
 assert.equal(epLabel({s:2,e:4},2),'עונה 2 · פרק 4');
 const t=new Date('2026-10-28T10:00:00');
 assert.equal(whenText('2026-10-28',t),'היום');assert.equal(whenText('2026-10-29',t),'מחר');assert.equal(whenText('2026-10-31',t),'ביום שבת');
});
test('anime is Japanese animation',()=>{
 assert.equal(kindOf('tv',[16,10759],'ja',['JP']),'anime');
 assert.equal(kindOf('tv',[16],'en',['US']),'tv');
 assert.equal(kindOf('movie',[16],'ja'),'anime');
 assert.equal(kindOf('movie',[28],'en'),'movie');
});
test('Hebrew title first, else English',()=>{
 assert.equal(pickTitle('וואן פיס','One Piece','ワンピース'),'וואן פיס');
 assert.equal(pickTitle('ワンピース','One Piece','ワンピース'),'One Piece');
 const h=toHit({id:37854,name:'ワンピース',original_name:'ワンピース',first_air_date:'1999-10-20',genre_ids:[16],original_language:'ja',origin_country:['JP'],poster_path:'/a.jpg',overview:''},{id:37854,name:'One Piece',overview:'Pirates'},'tv');
 assert.equal(h.title,'One Piece');assert.equal(h.kind,'anime');assert.equal(h.year,'1999');assert.equal(h.overview,'Pirates');assert.equal(h.key,'tv:37854');
});
test('Israeli providers and release date',()=>{
 const p=providersIL({IL:{link:'x',flatrate:[{provider_name:'Netflix',logo_path:'/n.png'}],rent:[{provider_name:'Apple TV'}]},US:{flatrate:[{provider_name:'Hulu'}]}});
 assert.deepEqual(p.stream.map(x=>x.name),['Netflix']);assert.equal(p.rent[0].name,'Apple TV');
 assert.equal(providersIL({US:{}}).stream.length,0);
 assert.equal(releaseIL({results:[{iso_3166_1:'IL',release_dates:[{type:4,release_date:'2026-12-01T00:00:00.000Z'},{type:3,release_date:'2026-11-05T00:00:00.000Z'}]}]}),'2026-11-05');
});
const item=(k:string,updated:number,extra:Partial<Item>={}):Item=>({key:k,media:'tv',tmdb:1,kind:'tv',title:k,orig:'',year:'',poster:null,status:'watching',at:null,mid:null,dub:null,subs:null,rating:null,note:'',added:1,updated,...extra});
test('library merge keeps the newer edit and removals',()=>{
 const a=[item('tv:1',5,{at:{s:1,e:3}}),item('tv:2',1)];
 const b=[item('tv:1',9,{at:{s:1,e:4}}),item('tv:3',2)];
 const m=merge(a,b,{'tv:2':3});
 assert.deepEqual(m.map(x=>x.key).sort(),['tv:1','tv:3']);assert.deepEqual(m.find(x=>x.key==='tv:1')!.at,{s:1,e:4});
 assert.equal(merge([item('tv:2',4)],[],{'tv:2':3}).length,1);
});
import {pickNode,summarize,cleanLink} from '../lib/justwatch';
import {trailerOf} from '../lib/tmdb';
const node=(t:string,y:number,imdb:string|null,type='MOVIE',offers:unknown[]=[])=>({objectType:type,content:{title:t,originalReleaseYear:y,fullPath:'/il/x',externalIds:{imdbId:imdb}},offers} as never);
test('JustWatch match by IMDb, then by title and year',()=>{
 const list=[node('Frozen',2013,'tt1'),node('Frozen II',2019,'tt2'),node('Frozen',2013,'tt9','SHOW')];
 assert.equal((pickNode(list,{imdb:'tt2',title:'x',media:'movie'}) as never as {content:{title:string}}).content.title,'Frozen II');
 assert.equal((pickNode(list,{imdb:null,title:'פרוזן',orig:'Frozen',year:'2013',media:'movie'}) as never as {content:{externalIds:{imdbId:string}}}).content.externalIds.imdbId,'tt1');
 assert.equal(pickNode(list,{title:'Frozen',year:'2030',media:'movie'}),null);
});
test('Hebrew dub and subtitles per service',()=>{
 const s=summarize(node('Frozen',2013,'tt1','MOVIE',[
  {monetizationType:'FLATRATE',standardWebURL:'https://www.disneyplus.com/movies/x?utm_source=jw',package:{clearName:'Disney Plus',icon:'/icon/1/{profile}/d.{format}'},audioLanguages:['en','he'],subtitleLanguages:['he','en']},
  {monetizationType:'RENT',standardWebURL:'https://tv.apple.com/x',package:{clearName:'Apple TV'},audioLanguages:['en'],subtitleLanguages:['iw']},
  {monetizationType:'CINEMA',package:{clearName:'Cinema'}}]));
 assert.equal(s.dub,true);assert.equal(s.subs,true);assert.equal(s.offers.length,2);
 assert.equal(s.offers[0].service,'Disney Plus');assert.equal(s.offers[0].url,'https://www.disneyplus.com/movies/x');assert.equal(s.offers[1].dub,false);assert.equal(s.offers[1].heSubs,true);
 const none=summarize(node('X',2020,null,'MOVIE',[{monetizationType:'FLATRATE',package:{clearName:'Netflix'},audioLanguages:[],subtitleLanguages:[]}]));
 assert.equal(none.dub,null);assert.equal(none.subs,null);
 assert.equal(summarize(null).found,false);
 assert.equal(cleanLink('https://www.netflix.com/title/123?at=1&ct=2'),'https://www.netflix.com/title/123');
});
test('trailer prefers Hebrew, then official',()=>{
 assert.equal(trailerOf([{site:'YouTube',type:'Trailer',key:'a'},{site:'YouTube',type:'Trailer',key:'b',official:true}]),'https://www.youtube.com/watch?v=b');
 assert.equal(trailerOf([{site:'YouTube',type:'Trailer',key:'a',official:true},{site:'YouTube',type:'Teaser',key:'h',iso_639_1:'he'}]),'https://www.youtube.com/watch?v=h');
 assert.equal(trailerOf([{site:'Vimeo',type:'Trailer',key:'v'}]),null);
});
import {parseFiller,slugOf,ranges} from '../lib/filler';
import {pickAiring} from '../lib/anilist';
test('filler list parsing',()=>{
 assert.equal(slugOf('Naruto Shippūden'),'naruto-shippūden');assert.equal(slugOf('One Piece'),'one-piece');assert.equal(slugOf("JoJo's Bizarre Adventure"),'jojos-bizarre-adventure');
 assert.deepEqual(ranges('54-56, 98'),[54,55,56,98]);
 const html='<div class="manga_canon"><span class="Label">Manga Canon:</span><span class="Episodes"><a>1-53</a></span></div><div class="mixed_canon/filler"><span class="Label">Mixed</span><span class="Episodes"><a>45</a>, <a>47</a></span></div><div class="filler"><span class="Label">Filler Episodes:</span><span class="Episodes"><a href="/x">54-56</a>, <a>98-99</a></span></div>';
 assert.deepEqual(parseFiller(html),{filler:[54,55,56,98,99],mixed:[45,47]});
 assert.deepEqual(parseFiller('<tr class="filler odd"><td class="Number">7</td></tr><tr class="mixed_canon/filler"><td class="Number">9</td></tr>'),{filler:[7],mixed:[9]});
});
test('AniList airing pick',()=>{
 const list=[{id:1,title:{romaji:'Jujutsu Kaisen: Shimetsu Kaiyuu',english:'JUJUTSU KAISEN Season 3'},nextAiringEpisode:{airingAt:Date.parse('2026-10-29T15:00:00Z')/1000,episode:4}},{id:2,title:{romaji:'Other'},nextAiringEpisode:{airingAt:1,episode:1}}];
 assert.equal(pickAiring(list,['Jujutsu Kaisen'],'2026-10-29')?.episode,4);
 assert.equal(pickAiring(list,['Jujutsu Kaisen'],'2026-11-10'),null);
 assert.equal(pickAiring(list,['Bleach']),null);
});
