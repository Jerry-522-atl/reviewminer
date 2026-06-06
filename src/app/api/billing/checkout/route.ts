import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { query } from '@/lib/db';
import { createCheckout, isConfigured } from '@/lib/lemonsqueezy';

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

    const user = users[0];

    if (!isConfigured()) {
      return NextResponse.json(
        { error: 'Payment system is not configured yet. Please check back soon.' },
        { status: 503 }
      );
    }

    const checkout = await createCheckout({
      userId,
      userEmail: user.email,
    });

    return NextResponse.json({ url: checkout.url });
  } catch (error: any) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout' },
      { status: 500 }
    );
  }
}
