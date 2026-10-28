import {cinema} from '@/lib/tmdb';
import {noKey,fail,PUB} from '@/lib/http';
export async function GET(){const nk=noKey();if(nk)return nk;try{return Response.json(await cinema(),{headers:PUB(6*3600)});}catch(e){return fail(e);}}
