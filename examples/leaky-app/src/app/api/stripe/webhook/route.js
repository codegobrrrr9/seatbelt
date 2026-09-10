import { stripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req) {
  const event = await req.json();
  if (event.type === 'checkout.session.completed') {
    await supabaseAdmin.from('profiles').update({ plan: 'pro' }).eq('id', event.data.object.client_reference_id);
  }
  return Response.json({ received: true });
}
