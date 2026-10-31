import {cinemas} from '@/lib/cinema';
import {H,PUB} from '@/lib/http';
export async function GET(){try{return Response.json({cinemas:await cinemas()},{headers:PUB(12*3600)});}
 catch(e){return Response.json({cinemas:[],error:'לא הצלחתי להגיע ללוח ההקרנות של פלאנט כרגע.',code:e instanceof Error?e.message:''},{status:502,headers:H});}}
