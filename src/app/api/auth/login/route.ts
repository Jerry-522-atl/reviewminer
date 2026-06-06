import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyPassword, createToken, setAuthCookie } from '@/lib/auth';
import { checkRateLimit } from '@/lib/ratelimit';

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

    // Rate limit: 10 attempts per IP per minute
    const rate = checkRateLimit(`login:${ip}`, 10, 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please wait a minute.' },
        { status: 429 }
      );
    }

    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    const users = await query('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
    if (users.length === 0) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const user = users[0];
    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const token = await createToken(user.id);
    await setAuthCookie(token);

    return NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, plan: user.plan, analysesUsed: user.analyses_used, analysesLimit: user.analyses_limit },
    });
  } catch (error: any) {
    console.error('Login error:', error.message);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
