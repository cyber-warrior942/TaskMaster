import { NextResponse } from 'next/server';
import { Invite } from '@/models/Invite';
import connectDB from '@/lib/db';
import { auth } from '@clerk/nextjs';
import { randomBytes } from 'crypto';
import sgMail from '@sendgrid/mail';

// Set SendGrid API Key
if (!process.env.SENDGRID_API_KEY) {
  throw new Error('SENDGRID_API_KEY is not set in environment variables');
}
if (!process.env.SENDGRID_FROM_EMAIL) {
  throw new Error('SENDGRID_FROM_EMAIL is not set in environment variables');
}
if (!process.env.NEXT_PUBLIC_BASE_URL) {
  throw new Error('NEXT_PUBLIC_BASE_URL is not set in environment variables');
}

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export async function POST(req: Request) {
  try {
    await connectDB();

    // Get email and adminId from the request body
    const { email, adminId } = await req.json();

    if (!email || !adminId) {
      return new NextResponse('Error: email and adminId are required.', { status: 400 });
    }

    // Generate a unique invite code
    const code = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Invite expires in 7 days

    // Create and save the invite record
    const newInvite = new Invite({
      code,
      adminId,
      email,
      expiresAt,
      used: false,
    });
    await newInvite.save();

    // Construct the invitation link
    const inviteLink = `${process.env.NEXT_PUBLIC_BASE_URL}/sign-up?invite=${code}`;

    // Send the invitation email using SendGrid
    const fromEmail = process.env.SENDGRID_FROM_EMAIL;
    if (!fromEmail) {
      throw new Error('SENDGRID_FROM_EMAIL is not set');
    }

    const msg = {
      to: email,
      from: {
        email: fromEmail,
        name: 'Your App Name' // You can customize this
      },
      subject: 'You are invited to join our Enterprise Account!',
      text: `Hello,

You have been invited to join our enterprise account. Please use the following link to sign up:

${inviteLink}

Your invite code is: ${code}

This invite expires on ${expiresAt.toLocaleString()}.

Best regards,
The Team`,
      html: `<p>Hello,</p>

<p>You have been invited to join our enterprise account. Please use the following link to sign up:</p>

<p><a href="${inviteLink}">${inviteLink}</a></p>

<p>Your invite code is: <strong>${code}</strong></p>

<p>This invite expires on ${expiresAt.toLocaleString()}.</p>

<p>Best regards,<br/>The Team</p>`,
    };

    try {
      await sgMail.send(msg);
      console.log('Invitation email sent successfully to', email);
    } catch (error: any) {
      console.error('Error sending invitation email:', error);
      if (error.response) {
        console.error('SendGrid Error Details:', error.response.body);
        // If email fails, we should probably delete the invite record
        await newInvite.deleteOne();
        return new NextResponse(
          `Failed to send invitation email: ${error.response.body.errors?.[0]?.message || 'Unknown error'}`,
          { status: 500 }
        );
      }
      // If email fails, we should probably delete the invite record
      await newInvite.deleteOne();
      return new NextResponse('Failed to send invitation email', { status: 500 });
    }

    return NextResponse.json({ code, expiresAt });

  } catch (error) {
    console.error('Error generating or sending invite:', error);
    return new NextResponse('Error generating or sending invite', { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url!);
    const code = url.searchParams.get('code');
    if (!code) return new NextResponse('Code required', { status: 400 });
    await connectDB();
    const invite = await Invite.findOne({ code });
    if (!invite || invite.used || invite.expiresAt < new Date()) {
      return new NextResponse('Invalid or expired invite', { status: 400 });
    }
    return NextResponse.json({ valid: true, adminId: invite.adminId });
  } catch (error) {
    return new NextResponse('Error validating invite', { status: 500 });
  }
} 