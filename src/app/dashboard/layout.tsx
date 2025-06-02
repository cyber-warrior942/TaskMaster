'use client';

import { useUser } from '@clerk/nextjs';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoaded && !user) {
      router.push('/');
    }
  }, [isLoaded, user, router]);

  if (!isLoaded || !user) {
    return null;
  }

  const isEnterprise = user.publicMetadata.plan === 'enterprise';
  const isAdmin = user.publicMetadata.isAdmin === true;

  // Redirect if trying to access enterprise features without enterprise plan
  if (pathname.includes('/enterprise') && !isEnterprise) {
    router.push('/dashboard/personal');
    return null;
  }

  // Redirect if trying to access personal features with enterprise plan
  if (pathname.includes('/personal') && isEnterprise) {
    router.push('/dashboard/enterprise');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-gray-900">
                {isEnterprise ? 'Enterprise Dashboard' : 'Personal Dashboard'}
              </h1>
              {isEnterprise && isAdmin && (
                <button
                  onClick={() => router.push('/dashboard/enterprise/admin')}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Admin Panel
                </button>
              )}
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
} 