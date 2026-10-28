import {auth,signIn,signOut} from '@/auth';
import App from './ui';
export const dynamic='force-dynamic';
export default async function Page(){const login=!!(process.env.AUTH_GOOGLE_SECRET&&process.env.AUTH_SECRET&&process.env.AUTH_GOOGLE_ID);
 const s=login?await auth().catch(()=>null):null;
 return <App canLogin={login} user={s?.user?{name:s.user.name||'',email:s.user.email||''}:null}
  login={async()=>{'use server';await signIn('google',{redirectTo:'/'});}} logout={async()=>{'use server';await signOut({redirectTo:'/'});}}/>;}
