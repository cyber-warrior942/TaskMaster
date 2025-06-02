'use client';

import { useUser } from '@clerk/nextjs';
import TaskList from '@/components/TaskList';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function Dashboard() {
  const { user, isLoaded } = useUser();
  const isEnterprise = user?.publicMetadata.plan === 'enterprise';
  const isAdmin = isEnterprise && user?.publicMetadata?.role === 'admin';
  const [employees, setEmployees] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (isLoaded && isEnterprise && user?.id) {
      const fetchMembers = async () => {
        try {
          const res = await fetch(`/api/enterprise-members?adminId=${user.id}`);
          if (res.ok) {
            const data = await res.json();
            setEmployees(data);
          } else {
            console.error('Failed to fetch enterprise members.', res.status);
            setEmployees([]);
          }
        } catch (error) {
          console.error('Error fetching enterprise members:', error);
          setEmployees([]);
        }
      };
      fetchMembers();
    }
  }, [isLoaded, isEnterprise, user?.id]);

  return (
    <div className="space-y-6">
      {isAdmin && (
        <Link href="/dashboard/enterprise/admin">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
            Go to Admin Panel
          </button>
        </Link>
      )}

      <TaskList isEnterprise={isEnterprise} employees={employees} showAddTaskButton={false} />
    </div>
  );
} 