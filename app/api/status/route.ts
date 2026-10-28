import {tmdbOn} from '@/lib/tmdb';
import {dbOn} from '@/lib/db';
import {H} from '@/lib/http';
export const dynamic='force-dynamic';
export function GET(){return Response.json({tmdb:tmdbOn(),db:dbOn(),login:!!(process.env.AUTH_GOOGLE_SECRET&&process.env.AUTH_SECRET)},{headers:H});}
