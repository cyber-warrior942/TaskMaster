import { NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import connectDB from '@/lib/db';
import { Invite } from '@/models/Invite';

export async function POST(req: Request) {
  try {
    await connectDB();

    // Get invite code, userId, and userEmail from the request body
    const { inviteCode, userId, userEmail } = await req.json();

    if (!inviteCode || !userId || !userEmail) {
      return new NextResponse('Error: inviteCode, userId, and userEmail are required.', { status: 400 });
    }

    // Find the invite by code and email
    const invite = await Invite.findOne({ code: inviteCode, email: userEmail });

    if (!invite) {
      return new NextResponse('Error: Invalid invite code or email.', { status: 400 });
    }

    // Check if the invite is already used or expired
    if (invite.used) {
      return new NextResponse('Error: Invite code already used.', { status: 400 });
    }
    if (new Date() > new Date(invite.expiresAt)) {
      return new NextResponse('Error: Invite code expired.', { status: 400 });
    }

    // Get the admin's information to store in the user's metadata
    const admin = await clerkClient.users.getUser(invite.adminId);

    // Update user metadata in Clerk with comprehensive information
    await clerkClient.users.updateUserMetadata(userId, {
      publicMetadata: {
        // Basic role and plan information
        plan: 'enterprise',
        role: 'member',
        
        // Relationship information
        adminId: invite.adminId,
        adminName: `${admin.firstName || ''} ${admin.lastName || ''}`.trim() || admin.username || 'Unknown Admin',
        adminEmail: admin.emailAddresses[0]?.emailAddress,
        
        // Invite information
        invitedAt: invite.createdAt,
        joinedAt: new Date().toISOString(),
        
        // Team/Organization information
        teamId: admin.publicMetadata?.teamId || null,
        organizationName: admin.publicMetadata?.organizationName || null,
        
        // Access control
        permissions: {
          canCreateTasks: true,
          canAssignTasks: false,
          canDeleteTasks: false,
          canManageTeam: false,
        },
        
        // Status information
        status: 'active',
        lastActive: new Date().toISOString(),
      },
    });

    // Mark the invite as used and link it to the user who used it
    invite.used = true;
    invite.usedBy = userId;
    await invite.save();

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error validating invite or updating user metadata:', error);
    return new NextResponse('Error processing invitation', { status: 500 });
  }
} 