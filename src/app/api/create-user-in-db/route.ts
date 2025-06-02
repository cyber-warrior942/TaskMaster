import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs';
import connectDB from '@/lib/db';
import { User } from '@/models/User';

export async function POST(req: Request) {
  try {
    console.log('Attempting to create user in MongoDB...');
    await connectDB();
    console.log('Database connected.');

    const { userId } = await req.json();

    if (!userId) {
      console.error('Error: userId is required in request body.');
      return new NextResponse('Error: userId is required.', { status: 400 });
    }

    // Check if user already exists in DB
    const existingUser = await User.findOne({ id: userId });
    if (existingUser) {
      console.log(`User with ID ${userId} already exists in DB. Skipping creation.`);
      return NextResponse.json({ message: 'User already exists' }, { status: 200 });
    }

    // Fetch user details from Clerk
    console.log(`Fetching user details from Clerk for ID: ${userId}`);
    const clerkUser = await clerkClient.users.getUser(userId);
    console.log('Fetched Clerk user:', clerkUser);

    if (!clerkUser) {
      console.error(`Clerk user with ID ${userId} not found.`);
      return new NextResponse('Clerk user not found.', { status: 404 });
    }

    const email = clerkUser.emailAddresses.find(em => em.id === clerkUser.primaryEmailAddressId)?.emailAddress;
    const name = `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || email;
    
    // Determine the role from public metadata, default to 'member' if not set
    const role = (clerkUser.publicMetadata as any)?.role || 'member';
    console.log(`Determined role for user ${userId}: ${role}`);

    // Create new user in MongoDB
    const newUser = new User({
      id: userId,
      email: email || '', // Ensure email is not null
      name: name,
      role: role,
    });

    console.log('New user object for DB:', newUser);
    await newUser.save();
    console.log(`User with ID ${userId} successfully created in MongoDB.`);

    return NextResponse.json({ message: 'User created successfully', user: newUser }, { status: 201 });

  } catch (error) {
    console.error('Error creating user in MongoDB:', error);
    if (error instanceof Error) {
        console.error('Error details:', error.message, error.stack);
    }
    return new NextResponse('Error creating user in MongoDB', { status: 500 });
  }
} 