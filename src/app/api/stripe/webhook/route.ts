import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

import { supabaseAdmin } from '@/lib/supabaseAdmin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

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
        // Fetch subscription details for status, period end, and product
        const subscription = await stripe.subscriptions.retrieve(subscriptionId) as any;
        // Ensure bandId is set on the subscription metadata for future events
        if (!subscription.metadata || subscription.metadata.bandId !== bandId) {
          await stripe.subscriptions.update(subscriptionId, {
            metadata: { ...subscription.metadata, bandId },
          });
          console.log('[Stripe webhook] Set bandId in subscription metadata', { subscriptionId, bandId });
        }
        console.log('[Stripe webhook] Full subscription object:', subscription);
        const status = subscription.status;
        const currentPeriodEnd = subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000).toISOString()
          : null;
        // Get the active product ID from the subscription's first item
        const productId = subscription.items.data[0]?.price?.product || null;
        // Look up the member limit for this tier
        let memberLimit = null;
        if (typeof productId === 'string') {
          const { STRIPE_PRODUCT_TIERS } = await import('@/lib/stripeTiers');
          memberLimit = (STRIPE_PRODUCT_TIERS as Record<string, { memberLimit: number }>)[productId]?.memberLimit ?? null;
        }
        console.log('[Stripe webhook] Updating band', { eventType: 'checkout.session.completed', bandId, status, currentPeriodEnd, productId });
        const { data, error } = await supabaseAdmin
          .from('bands')
          .update({
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            subscription_status: status,
            current_period_end: currentPeriodEnd,
            stripe_product_id: productId,
            ...(memberLimit !== null ? { user_limit: memberLimit } : {}),
          })
          .eq('id', bandId);
        console.log('[Stripe webhook] Supabase update result', { eventType: 'checkout.session.completed', bandId, currentPeriodEnd, productId, data, error });
        if (error) {
          console.error('[Stripe webhook] Supabase update error', error);
        }
      } else {
        console.warn('[Stripe webhook] Missing bandId, customerId, or subscriptionId', { bandId, customerId, subscriptionId });
      }
      break;
    }
    case 'customer.subscription.updated': {
      const subscription = event.data.object as any;
      // Log the full raw subscription object for debugging
      console.log('[Stripe webhook] Raw subscription event:', JSON.stringify(subscription, null, 2));
      const bandId = subscription.metadata?.bandId;
      const customerId = subscription.customer;
      const subscriptionId = subscription.id;
      const status = subscription.status;
      const currentPeriodEnd = subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000).toISOString()
        : null;
      // Get the active product ID from the subscription's first item
      const productId = subscription.items.data[0]?.price?.product || null;
      // Look up the member limit for this tier
      let memberLimit = null;
      if (typeof productId === 'string') {
        const { STRIPE_PRODUCT_TIERS } = await import('@/lib/stripeTiers');
        memberLimit = (STRIPE_PRODUCT_TIERS as Record<string, { memberLimit: number }>)[productId]?.memberLimit ?? null;
      }
      console.log('[Stripe webhook] customer.subscription.updated', { bandId, customerId, subscriptionId, status, currentPeriodEnd, productId });
      if (bandId) {
        // Only include current_period_end if not null
        const updateObj: any = {
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          subscription_status: status,
          stripe_product_id: productId,
          ...(memberLimit !== null ? { user_limit: memberLimit } : {}),
        };
        if (currentPeriodEnd) {
          updateObj.current_period_end = currentPeriodEnd;
        }
        const { data, error } = await supabaseAdmin
          .from('bands')
          .update(updateObj)
          .eq('id', bandId);
        console.log('[Stripe webhook] Supabase update result', { eventType: 'customer.subscription.updated', bandId, currentPeriodEnd, productId, data, error });
        if (error) {
          console.error('[Stripe webhook] Supabase update error (subscription.updated)', error);
        }
      } else {
        console.warn('[Stripe webhook] No bandId in subscription metadata for subscription.updated', { subscriptionId });
      }
      break;
    }
    case 'invoice.upcoming':
      // Handle renewal reminder
      break;
    case 'invoice.payment_failed':
      // Handle failed payment
      break;
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as any;
      const bandId = subscription.metadata?.bandId;
      const customerId = subscription.customer;
      const subscriptionId = subscription.id;
      const status = 'cancelled';
      const currentPeriodEnd = null;
      // Get the active product ID from the subscription's first item
      const productId = subscription.items.data[0]?.price?.product || null;
      // Look up the member limit for this tier
      let memberLimit = null;
      if (typeof productId === 'string') {
        const { STRIPE_PRODUCT_TIERS } = await import('@/lib/stripeTiers');
        memberLimit = (STRIPE_PRODUCT_TIERS as Record<string, { memberLimit: number }>)[productId]?.memberLimit ?? null;
      }
      console.log('[Stripe webhook] customer.subscription.deleted', { bandId, customerId, subscriptionId, productId });
      if (bandId) {
        const { data, error } = await supabaseAdmin
          .from('bands')
          .update({
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            subscription_status: status,
            current_period_end: currentPeriodEnd,
            stripe_product_id: productId,
            ...(memberLimit !== null ? { user_limit: memberLimit } : {}),
          })
          .eq('id', bandId);
        console.log('[Stripe webhook] Supabase update result', { eventType: 'customer.subscription.deleted', bandId, currentPeriodEnd, productId, data, error });
        if (error) {
          console.error('[Stripe webhook] Supabase update error (subscription.deleted)', error);
        }
      } else {
        console.warn('[Stripe webhook] No bandId in subscription metadata for subscription.deleted', { subscriptionId });
      }
      break;
    }
    // Add more cases as needed
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
