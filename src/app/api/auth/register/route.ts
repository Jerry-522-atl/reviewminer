import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';
import { execute, query } from '@/lib/db';
import { hashPassword, createToken, setAuthCookie } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    const existing = await query('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
    if (existing.length > 0) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    const userId = uuid();
    const passwordHash = await hashPassword(password);

    await execute('INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)', [
      userId,
      email.toLowerCase(),
      passwordHash,
    ]);

    const token = await createToken(userId);
    await setAuthCookie(token);

    return NextResponse.json({ success: true, user: { id: userId, email: email.toLowerCase() } });
  } catch (error: any) {
    console.error('Register error:', error);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
