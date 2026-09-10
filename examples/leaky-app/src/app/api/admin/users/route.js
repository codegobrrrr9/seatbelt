import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  const { data } = await supabaseAdmin.from('profiles').select('id, username, email');
  return Response.json(data);
}
