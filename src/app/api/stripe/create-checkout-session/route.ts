import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
});

export async function POST(req: NextRequest) {
  // TODO: Authenticate user and get band info
  const { priceId, bandId, userEmail } = await req.json();

  // Replace with your actual success/cancel URLs
  const successUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/admin/dashboard?checkout=success&band=${bandId}`;
  const cancelUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/admin/dashboard?checkout=cancel&band=${bandId}`;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId, // Stripe Price ID for your subscription
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: userEmail, // Pre-fill the email field, but allow user to change it
      metadata: {
        bandId, // Store bandId for webhook use
      },
    });
    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
