import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { clerkClient } from '@clerk/nextjs/server';

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    const { metadata } = body;

    if (!metadata) {
      return new NextResponse('Metadata is required', { status: 400 });
    }

    await clerkClient.users.updateUserMetadata(userId, {
      publicMetadata: metadata,
    });

    return new NextResponse('Metadata updated successfully', { status: 200 });
  } catch (error) {
    console.error('Error updating user metadata:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 