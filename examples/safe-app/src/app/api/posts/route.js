import { requireUser } from '@/lib/auth';

export async function GET() {
  const { supabase, user } = await requireUser();
  if (!user) return new Response('Unauthorized', { status: 401 });
  const { data } = await supabase.from('posts').select('*');
  return Response.json(data);
}

export async function DELETE(req) {
  const { supabase, user } = await requireUser();
  if (!user) return new Response('Unauthorized', { status: 401 });
  const { id } = await req.json();
  await supabase.from('posts').delete().eq('id', id).eq('user_id', user.id);
  return Response.json({ ok: true });
}
