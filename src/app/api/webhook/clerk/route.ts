import { WebhookEvent } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { Webhook } from 'svix';

import connectDB from '@/lib/db';
import { Invite } from '@/models/Invite';
// Import Clerk backend SDK to update user metadata
import { clerkClient } from '@clerk/backend';

const webhookSecret = process.env.CLERK_WEBHOOK_SECRET || '';

export async function POST(req: Request) {
  // Check if webhook secret is set
  if (!webhookSecret) {
    return new NextResponse('Error: Clerk webhook secret not set.', { status: 500 });
  }

  // Get the headers and body
  const headerPayload = headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new NextResponse('Error: Missing Svix headers', { status: 400 });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your secret
  const wh = new Webhook(webhookSecret);

  let evt: WebhookEvent;

  // Verify the payload
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new NextResponse('Error: Invalid signature', { status: 400 });
  }

  // Get the ID and type
  const { id } = evt.data;
  const eventType = evt.type;

  console.log(`Clerk webhook received: ${eventType}`);

  if (eventType === 'user.created') {
    const user = evt.data;
    // Clerk automatically includes custom fields in publicMetadata
    const inviteCode = user.publicMetadata?.invite_code as string | undefined;
    const userId = user.id;

    if (inviteCode) {
      await connectDB();
      // Find the invite code in your database
      const invite = await Invite.findOne({ code: inviteCode });

      // Validate the invite code
      if (invite && !invite.used && invite.expiresAt > new Date()) {
        try {
          // Use Clerk backend SDK to update user metadata
          await clerkClient.users.updateUserMetadata(userId, {
            publicMetadata: {
              plan: 'enterprise',
              // Assuming invite is for a member, not another admin
              role: 'member',
              usedInvite: inviteCode,
            },
          });

          // Mark the invite as used in your database
          invite.used = true;
          invite.usedBy = userId;
          await invite.save();

          console.log(`User ${userId} signed up with valid invite code ${inviteCode}. Metadata updated and invite marked as used.`);

        } catch (metadataError) {
          console.error(`Error updating metadata for user ${userId}:`, metadataError);
          // Consider how to handle this error (e.g., log, alert, potentially un-mark invite)
        }
      } else {
        console.log(`User ${userId} signed up with invalid, used, or expired invite code: ${inviteCode}`);
        // Handle invalid/used/expired invite: e.g., set a default plan or mark user for review
         try {
            await clerkClient.users.updateUserMetadata(userId, {
              publicMetadata: {
                plan: 'personal', // Assign default plan if invite is invalid
                role: 'user', 
              },
            });
             console.log(`User ${userId} assigned personal plan due to invalid/used/expired invite code.`);
          } catch (defaultMetadataError) {
            console.error(`Error setting default metadata for user ${userId}:`, defaultMetadataError);
          }
      }
    } else {
        console.log(`User ${userId} signed up without an invite code. Assigning default personal plan.`);
         // Handle users signing up without an invite code - assign default personal plan
         try {
            await clerkClient.users.updateUserMetadata(userId, {
              publicMetadata: {
                plan: 'personal',
                role: 'user',
              },
            });
             console.log(`User ${userId} assigned personal plan.`);
          } catch (defaultMetadataError) {
            console.error(`Error setting default metadata for user ${userId}:`, defaultMetadataError);
          }
    }
  }

  return new NextResponse('Webhook received', { status: 200 });
} 