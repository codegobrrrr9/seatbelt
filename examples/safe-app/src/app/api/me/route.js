import { requireUser } from '@/lib/auth';

export async function GET() {
  const { supabase, user } = await requireUser();
  if (!user) return new Response('Unauthorized', { status: 401 });
  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  return Response.json(data);
}
