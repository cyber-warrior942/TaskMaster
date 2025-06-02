import { NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import connectDB from '@/lib/db';
import { Invite } from '@/models/Invite';

export async function GET(req: Request) {
  try {
    await connectDB();

    const url = new URL(req.url);
    const adminId = url.searchParams.get('adminId');

    if (!adminId) {
      return new NextResponse('Error: adminId is required.', { status: 400 });
    }

    // Find all invites created by this admin that have been used
    const usedInvites = await Invite.find({ adminId: adminId, used: true });

    // Get the user IDs from the used invites
    const invitedUserIds = usedInvites.map(invite => invite.usedBy).filter(id => id);

    if (invitedUserIds.length === 0) {
        return NextResponse.json([]); // No invited users found for this admin
    }

    // Fetch the actual user details from Clerk using the invited user IDs
    // Ensure clerkClient is available and used correctly
    if (!clerkClient || !clerkClient.users || !clerkClient.users.getUserList) {
        console.error('clerkClient or clerkClient.users.getUserList is not available');
        return new NextResponse('Error fetching members: Clerk client not initialized', { status: 500 });
    }
    const users = await clerkClient.users.getUserList({
        userId: invitedUserIds as string[], // clerkClient expects an array of strings
    });

    // Filter and format the users (ensure they are indeed enterprise members, though the invite process should guarantee this)
    const enterpriseMembers = users.filter(user => 
      user.publicMetadata?.plan === 'enterprise' && user.publicMetadata?.role === 'member'
    );

    const formattedMembers = enterpriseMembers.map(user => ({
      id: user.id,
      name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || user.emailAddresses[0]?.emailAddress || 'Unknown User',
    }));

    return NextResponse.json(formattedMembers);

  } catch (error) {
    console.error('Error fetching enterprise members by admin:', error);
    return new NextResponse('Error fetching members', { status: 500 });
  }
} 