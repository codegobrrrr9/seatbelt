import { stripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req) {
  const sig = req.headers.get('stripe-signature');
  const raw = await req.text();
  let event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return new Response('Bad signature', { status: 400 });
  }
  if (event.type === 'checkout.session.completed') {
    await supabaseAdmin.from('profiles').update({ plan: 'pro' }).eq('id', event.data.object.client_reference_id);
  }
  return Response.json({ received: true });
}
