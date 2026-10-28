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
