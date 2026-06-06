import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// POST — verify a license key (called by Chrome extension)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const licenseKey = body?.licenseKey?.trim();

    if (!licenseKey) {
      return NextResponse.json({ valid: false, error: 'License key required' }, { status: 400 });
    }

    const users = await query(
      'SELECT id, plan, subscription_status FROM users WHERE license_key = ?',
      [licenseKey]
    );

    if (users.length === 0) {
      return NextResponse.json({ valid: false, error: 'Invalid license key' });
    }

    const user = users[0];

    // Only valid if user has an active paid plan
    const validPlans = ['growth', 'pro'];
    if (!validPlans.includes(user.plan)) {
      return NextResponse.json({ valid: false, error: 'No active subscription' });
    }

    return NextResponse.json({
      valid: true,
      plan: user.plan,
    });
  } catch (error: any) {
    console.error('Activation error:', error);
    return NextResponse.json({ valid: false, error: 'Verification failed' }, { status: 500 });
  }
}
