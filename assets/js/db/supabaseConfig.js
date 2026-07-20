/**
 * supabaseConfig.js
 *
 * ⚠️  FILL IN YOUR VALUES AFTER CREATING YOUR SUPABASE PROJECT ⚠️
 *
 * How to get these:
 *   1. Go to https://supabase.com → sign in → open your project
 *   2. Click "Project Settings" (gear icon, left sidebar)
 *   3. Click "API"
 *   4. Copy "Project URL"  → paste as SUPABASE_URL below
 *   5. Copy "anon public" key → paste as SUPABASE_ANON_KEY below
 *      (The anon key is SAFE to put here — it only allows public reads)
 *
 * The service_role key (for Termux writes) must NEVER go in this file.
 */

export const SUPABASE_URL     = 'https://qkccqidouczjppioteqb.supabase.co';   // e.g. https://abcdefgh.supabase.co
export const SUPABASE_ANON_KEY = '   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrY2NxaWRvdWN6anBwaW90ZXFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxODY2ODYsImV4cCI6MjA5OTc2MjY4Nn0.pyDfMTZqg5QF5N2Za6h_3xwlOkWTAwS2ZHokx1Rf59c'; // eyJhbGciOiJ...
                                                                 
/** Set to false to force SQLite-only mode (for offline/local development). */
export const USE_SUPABASE = SUPABASE_URL !== 'https://qkccqidouczjppioteqb.supabase.co';
