// Shared by the server routes and the app.
export type Media='tv'|'movie';
export type Kind='anime'|'tv'|'movie';
export const KIND_LABEL:Record<Kind,string>={anime:'אנימה',tv:'סדרה',movie:'סרט'};

export type Hit={key:string;media:Media;tmdb:number;kind:Kind;title:string;orig:string;year:string;poster:string|null;overview:string;release?:string};
export type Ep={s:number;e:number;air?:string;name?:string};
export type Provider={name:string;logo:string|null};
export type Providers={stream:Provider[];rent:Provider[];buy:Provider[];link:string|null};
export type Detail=Hit&{backdrop:string|null;genres:string[];runtime:number|null;status:string;
 seasons:{n:number;name:string;count:number;air?:string}[];last:Ep|null;next:Ep|null;providers:Providers;heTitle:boolean;
 imdb:string|null;en:string;trailer:string|null;similar:Hit[];cast:string[]};
export type Summary={key:string;seasons:{n:number;count:number}[];last:Ep|null;next:Ep|null;status:string;stream:string[];release?:string;runtime?:number|null;airAt?:number|null};

export type Status='watching'|'plan'|'paused'|'done'|'dropped';
export const STATUS_LABEL:Record<Status,string>={watching:'צופה',plan:'ברשימה',paused:'בהפסקה',done:'סיימתי',dropped:'ויתרתי'};
// One title in the library. `at` is the last watched episode; `mid` is where an episode or movie was stopped halfway.
export type Item={key:string;media:Media;tmdb:number;kind:Kind;title:string;orig:string;year:string;poster:string|null;
 status:Status;at:{s:number;e:number}|null;mid:{s:number;e:number;min:number}|null;
 skipFiller?:boolean;watchOn?:{service:string;url:string|null};together?:{on:boolean;name:string;at:{s:number;e:number}|null};
 dub:boolean|null;subs:boolean|null;he?:{dub:boolean|null;subs:boolean|null;at:number};rating:number|null;note:string;added:number;updated:number;watchedAt?:number;source?:'cinema'};
