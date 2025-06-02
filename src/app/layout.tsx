import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Navbar from '@/components/Navbar';
import { ClerkProvider } from '@clerk/nextjs';
import { TaskProvider } from '@/context/TaskContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Todo List App',
  description: 'A simple todo list application',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
      <html lang="en">
        <body className={inter.className}>
        <ClerkProvider>
          <TaskProvider>
            <Navbar />
          <main className="min-h-screen bg-gray-50">
            {children}
          </main>
          </TaskProvider>
        </ClerkProvider>
        </body>
      </html>
  );
}
