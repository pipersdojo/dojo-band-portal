import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

import { supabaseAdmin } from '@/lib/supabaseAdmin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
});

export async function POST(req: NextRequest) {
  const sig = req.headers.get('stripe-signature');
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig!,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // TODO: Handle events (checkout.session.completed, invoice.upcoming, etc.)
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const bandId = session.metadata?.bandId;
      const customerId = session.customer as string;
      const subscriptionId = session.subscription as string;
      console.log('[Stripe webhook] checkout.session.completed', { bandId, customerId, subscriptionId });
      if (bandId && customerId && subscriptionId) {
        // Fetch subscription details for status and period end
        const subscription = await stripe.subscriptions.retrieve(subscriptionId) as any;
        const status = subscription.status;
        const currentPeriodEnd = subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000).toISOString()
          : null;
        console.log('[Stripe webhook] Updating band', { bandId, status, currentPeriodEnd });
        const { error } = await supabaseAdmin
          .from('bands')
          .update({
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            subscription_status: status,
            current_period_end: currentPeriodEnd,
          })
          .eq('id', bandId);
        if (error) {
          console.error('[Stripe webhook] Supabase update error', error);
        }
      } else {
        console.warn('[Stripe webhook] Missing bandId, customerId, or subscriptionId', { bandId, customerId, subscriptionId });
      }
      break;
    }
    case 'invoice.upcoming':
      // Handle renewal reminder
      break;
    case 'invoice.payment_failed':
      // Handle failed payment
      break;
    case 'customer.subscription.deleted':
      // Handle subscription cancellation
      break;
    // Add more cases as needed
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
