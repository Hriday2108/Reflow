import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { UserModel } from '@/models';
import { hashPassword } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }
    if (typeof password !== 'string' || password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    await dbConnect();

    const normalizedEmail = String(email).toLowerCase().trim();
    const existing = await UserModel.findOne({ email: normalizedEmail }).lean();
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
    }

    const user = await UserModel.create({
      email: normalizedEmail,
      name: name || null,
      password_hash: hashPassword(password),
      provider: 'local',
    });

    return NextResponse.json({
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        provider: user.provider,
      },
    });
  } catch (error) {
    console.error('Error registering user:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
