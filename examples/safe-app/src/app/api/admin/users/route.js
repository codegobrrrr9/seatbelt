import { requireUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET() {
  const { user } = await requireUser();
  if (!user || user.app_metadata?.role !== 'admin') return new Response('Forbidden', { status: 403 });
  const { data } = await supabaseAdmin.from('profiles').select('id, username');
  return Response.json(data);
}
