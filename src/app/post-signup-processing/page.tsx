'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';

export default function PostSignupProcessingPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [processing, setProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const processInvite = async () => {
      const inviteCode = searchParams.get('invite');

      if (!inviteCode) {
        // If no invite code, something is wrong with the redirect or the link
        setError('No invite code found.');
        setProcessing(false);
        // Optionally redirect to a generic dashboard or error page
        router.push('/dashboard');
        return;
      }

      // Wait for user data to be loaded by Clerk
      if (!isLoaded) {
          // Keep processing state true while user data loads
          return;
      }

      // Ensure user is available after isLoaded is true
      if (!user) {
          setError('User data not loaded after signup.');
          setProcessing(false);
           router.push('/dashboard'); // Redirect if user is unexpectedly not found
          return;
      }

      // Check if the user's metadata already indicates they are an enterprise member
      // This could happen if the webhook processed the invite or they were already a member
      // if (user.publicMetadata?.plan === 'enterprise' && user.publicMetadata?.role === 'member') {
      //     console.log('User is already an enterprise member, skipping invite validation.');
      //     setProcessing(false);
      //      router.push('/dashboard/enterprise/admin');
      //     return;
      // }

      try {
        // Call the API endpoint to validate the invite and update metadata
        console.log('Calling /api/validate-invite...', { inviteCode, userId: user.id, userEmail: user.emailAddresses[0]?.emailAddress });
        const res = await fetch('/api/validate-invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            inviteCode: inviteCode,
            userId: user.id,
            userEmail: user.emailAddresses[0]?.emailAddress, // Use the primary email
          }),
        });

        if (res.ok) {
          console.log('Invite validated and user metadata updated successfully.');

          // Now call the API to create/update the user in our MongoDB database
          console.log('Calling /api/create-user-in-db to sync user...', { userId: user.id });
          const createUserRes = await fetch('/api/create-user-in-db', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id }),
          });

          if (createUserRes.ok) {
            console.log('User successfully created/synced in MongoDB.');
            // Redirect to the enterprise admin dashboard after both steps are successful
            router.push('/dashboard/enterprise/admin');
          } else {
            const createUserData = await createUserRes.json();
            console.error('Failed to create/sync user in MongoDB:', createUserData.error);
            setError(createUserData.error || 'Failed to sync user data.');
            setProcessing(false);
             router.push('/dashboard'); // Redirect to a safe page on error
          }

        } else {
          const errorData = await res.json();
          console.error('Invite validation failed:', errorData.error);
          setError(errorData.error || 'Failed to process invite.');
          setProcessing(false);
          // Optionally redirect to an error page or the general dashboard
           router.push('/dashboard'); // Redirect to a safe page on error
        }
      } catch (err) {
        console.error('Error during invite processing or user syncing:', err);
        setError('An unexpected error occurred.');
        setProcessing(false);
         router.push('/dashboard'); // Redirect on unexpected error
      }
    };

    // Only run the processing logic when the user and inviteCode are available
    // isLoaded check inside processInvite handles waiting for user data
    processInvite();

  }, [searchParams, user, isLoaded, router]); // Depend on searchParams, user, isLoaded, and router

  if (processing) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Processing your invitation...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center text-red-500">
        <p>Error: {error}</p>
        {/* You might add a link to go back to the dashboard or try again */}
      </div>
    );
  }

  // Should not reach here if redirects are handled correctly
  return null;
} 