import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { query } from '@/lib/db';
import { createCheckout, isConfigured, PlanType } from '@/lib/lemonsqueezy';

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Please log in first' }, { status: 401 });
    }

    const users = await query('SELECT email, plan FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!isConfigured()) {
      return NextResponse.json(
        { error: 'Payment system is not configured yet. Please check back soon.' },
        { status: 503 }
      );
    }

    // Parse requested plan from body (defaults to 'growth')
    let plan: PlanType = 'growth';
    try {
      const body = await request.json();
      if (body?.plan === 'pro' || body?.plan === 'growth') {
        plan = body.plan;
      }
    } catch {
      // No body → use default 'growth'
    }

    const user = users[0];
    const checkout = await createCheckout({
      userId,
      userEmail: user.email,
      plan,
    });

    return NextResponse.json({ url: checkout.url });
  } catch (error: any) {
    console.error('Checkout error:', error.message);
    return NextResponse.json(
      { error: 'Failed to create checkout. Please try again.' },
      { status: 500 }
    );
  }
}
