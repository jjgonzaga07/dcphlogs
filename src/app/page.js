'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import LoginForm from './components/LoginForm';

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check if user is already authenticated
    const user = localStorage.getItem('user');
    if (user) {
      const userData = JSON.parse(user);
      if (userData.isAuthenticated) {
        setIsAuthenticated(true);
        if (userData.type === 'admin') {
          router.push('/admin');
        } else {
          router.push('/log');
        }
      }
    }
    setIsLoading(false);
  }, [router]);

  if (isLoading) {
  return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white to-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#14206e]"></div>
    </div>
  );
  }

  if (isAuthenticated) {
    return null; // Will redirect to /log
  }

  return <LoginForm />;
}
