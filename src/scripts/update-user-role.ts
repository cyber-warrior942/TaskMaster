import { clerkClient } from '@clerk/nextjs/server';

async function updateUserRole() {
  const userId = 'user_2xss0IZvJcXHdbo6GEZ6PZo0fPG'; // Your user ID

  try {
    await clerkClient.users.updateUserMetadata(userId, {
      publicMetadata: {
        role: 'member',
        plan: 'enterprise',
      },
    });
    console.log('Successfully updated user metadata');
  } catch (error) {
    console.error('Error updating user metadata:', error);
  }
}

updateUserRole(); 