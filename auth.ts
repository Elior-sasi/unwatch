import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
// Sign-in only identifies the user, so the library follows him between phone and computer. No Gmail access is asked for.
export const {handlers,auth,signIn,signOut}=NextAuth({
 trustHost:true,
 providers:[Google({clientId:process.env.AUTH_GOOGLE_ID,clientSecret:process.env.AUTH_GOOGLE_SECRET})],
 session:{strategy:'jwt',maxAge:180*24*60*60},
 callbacks:{
  async jwt({token,profile}){if(profile?.sub)token.googleId=profile.sub;return token;},
  async session({session,token}){if(session.user)session.user.id=String(token.googleId||token.sub);return session;}
 }
});
