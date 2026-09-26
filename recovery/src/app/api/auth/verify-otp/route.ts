import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { OtpModel, UserModel } from '@/models';
import { verifyPassword } from '@/lib/auth';

const MAX_ATTEMPTS = 5;

export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json();
    if (!email || !code) {
      return NextResponse.json({ error: 'Email and code are required' }, { status: 400 });
    }

    await dbConnect();
    const normalizedEmail = String(email).toLowerCase().trim();

    const otp = await OtpModel.findOne({ email: normalizedEmail });
    if (!otp) {
      return NextResponse.json({ error: 'Code expired or not found. Request a new one.' }, { status: 400 });
    }

    if (new Date(otp.expires_at).getTime() < Date.now()) {
      await OtpModel.deleteOne({ _id: otp._id });
      return NextResponse.json({ error: 'Code expired. Request a new one.' }, { status: 400 });
    }

    if (otp.attempts >= MAX_ATTEMPTS) {
      await OtpModel.deleteOne({ _id: otp._id });
      return NextResponse.json({ error: 'Too many attempts. Request a new code.' }, { status: 429 });
    }

    if (!verifyPassword(String(code), otp.code_hash)) {
      otp.attempts += 1;
      await otp.save();
      return NextResponse.json({ error: 'Incorrect code' }, { status: 401 });
    }

    // Success — consume the OTP and return the user.
    await OtpModel.deleteOne({ _id: otp._id });
    const user = await UserModel.findOne({ email: normalizedEmail }).lean() as any;
    if (!user) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

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
    console.error('Error verifying OTP:', error);
    return NextResponse.json({ error: 'Failed to verify code' }, { status: 500 });
  }
}
