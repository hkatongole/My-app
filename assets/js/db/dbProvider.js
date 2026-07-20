import { storage } from './storageAdapter.js';
import { supabaseAdapter } from './supabaseAdapter.js';
import { USE_SUPABASE } from './supabaseConfig.js';

export const db = USE_SUPABASE ? supabaseAdapter : storage;
export { USE_SUPABASE };
