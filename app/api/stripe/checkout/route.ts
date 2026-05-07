import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/app/lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const plan = body.plan === 'annual' ? 'annual' : 'monthly';
  const priceId = plan === 'annual'
    ? (process.env.STRIPE_PRICE_ID_ANNUAL || process.env.STRIPE_PRICE_ID!)
    : process.env.STRIPE_PRICE_ID!;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer_email: session.user.email,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${baseUrl}/dashboard?upgrade=success`,
    cancel_url: `${baseUrl}/dashboard`,
    metadata: { user_id: session.user.id },
    subscription_data: { metadata: { user_id: session.user.id } },
  });

  return NextResponse.json({ url: checkoutSession.url });
}
