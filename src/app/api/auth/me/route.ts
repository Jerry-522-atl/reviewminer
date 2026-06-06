import { NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const users = await query(
      'SELECT id, email, plan, analyses_used, analyses_limit, subscription_status, license_key, created_at FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    return NextResponse.json({ user: users[0] });
  } catch {
    return NextResponse.json({ user: null }, { status: 401 });
  }
}
