import 'server-only';
import { createClient } from '@supabase/supabase-js';

// Server only. Never import this from a component or anything marked 'use client'.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);
