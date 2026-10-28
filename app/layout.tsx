import type {Metadata,Viewport} from 'next';
import './globals.css';
export const metadata:Metadata={title:'Unwatch',description:'כל מה שאתה רואה, במקום אחד',applicationName:'Unwatch',manifest:'/manifest.webmanifest',
 appleWebApp:{capable:true,title:'Unwatch',statusBarStyle:'black-translucent'},icons:{apple:[{url:'/apple-touch-icon.png',sizes:'180x180'}],icon:[{url:'/icon-192.png',sizes:'192x192'}]}};
export const viewport:Viewport={width:'device-width',initialScale:1,viewportFit:'cover',themeColor:'#0b0a12'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="he" dir="rtl"><body>{children}</body></html>}
