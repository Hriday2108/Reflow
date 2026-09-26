import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { OtpModel, UserModel } from '@/models';
import { hashPassword } from '@/lib/auth';
import { sendOtpEmail, isMailerConfigured } from '@/lib/mailer';

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    await dbConnect();
    const normalizedEmail = String(email).toLowerCase().trim();

    // Only send OTPs to known local accounts.
    const user = await UserModel.findOne({ email: normalizedEmail }).lean();
    if (!user) {
      return NextResponse.json({ error: 'No account found for this email' }, { status: 404 });
    }

    // Generate a 6-digit code.
    const code = String(Math.floor(100000 + Math.random() * 900000));

    // Replace any existing OTP for this email.
    await OtpModel.deleteMany({ email: normalizedEmail });
    await OtpModel.create({
      email: normalizedEmail,
      code_hash: hashPassword(code),
      expires_at: new Date(Date.now() + OTP_TTL_MS),
    });

    if (isMailerConfigured()) {
      await sendOtpEmail(normalizedEmail, code);
      return NextResponse.json({ sent: true });
    }

    // Dev fallback: no mailer configured — log the code so the flow is testable.
    console.log(`[OTP] (email not configured) code for ${normalizedEmail}: ${code}`);
    return NextResponse.json({ sent: false, devCode: code });
  } catch (error) {
    console.error('Error sending OTP:', error);
    return NextResponse.json({ error: 'Failed to send verification code' }, { status: 500 });
  }
}
