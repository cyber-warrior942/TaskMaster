"use client";

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSignUp } from '@clerk/nextjs';
import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isLoaded, signUp, setActive } = useSignUp();
  const inviteCode = searchParams.get('invite');
  const [afterSignUpRedirectUrl, setAfterSignUpRedirectUrl] = useState('/dashboard');

  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [pendingVerification, setPendingVerification] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (inviteCode) {
      // Construct the redirect URL to our processing page, including the invite code
      setAfterSignUpRedirectUrl(`/post-signup-processing?invite=${inviteCode}`);
    } else {
        // Default redirect if no invite code
        setAfterSignUpRedirectUrl('/dashboard');
    }
  }, [inviteCode]);

  // Show a loading state or null while the redirect URL is being determined
  if (!afterSignUpRedirectUrl) {
      return <div>Loading...</div>;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailAddress || !password || !inviteCode) {
        setError('Please fill in all fields.');
        return;
    }
    setError('');

    if (!isLoaded) {
      return;
    }

    try {
      await signUp.create({
        emailAddress,
        password,
        unsafeMetadata: { invite_code: inviteCode },
      });

      setPendingVerification(true);

    } catch (err: any) {
      console.error('Error signing up:', err);
      setError(err.errors?.[0]?.longMessage || 'An error occurred during signup.');
    }
  };

  if (pendingVerification) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Verification email sent. Please check your inbox.</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignUp
        afterSignUpUrl={afterSignUpRedirectUrl}
        afterSignInUrl="/dashboard" // Existing sign-in redirect
      />
    </div>
  );
} 