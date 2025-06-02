'use client';

import { ClerkProvider } from '@clerk/nextjs';
import { TaskProvider } from '@/context/TaskContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <TaskProvider>{children}</TaskProvider>
    </ClerkProvider>
  );
} 