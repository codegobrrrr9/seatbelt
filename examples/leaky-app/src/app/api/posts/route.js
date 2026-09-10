import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  const { data } = await supabaseAdmin.from('posts').select('*');
  return Response.json(data);
}

export async function DELETE(req) {
  const { id } = await req.json();
  await supabaseAdmin.from('posts').delete().eq('id', id);
  return Response.json({ ok: true });
}
