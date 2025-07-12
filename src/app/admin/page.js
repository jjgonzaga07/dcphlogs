'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

// Mock data for demonstration
const mockClockData = [
  {
    email: 'user1@example.com',
    records: [
      { date: '2024-06-01', clockIn: '08:00', clockOut: '17:00' },
      { date: '2024-06-02', clockIn: '08:10', clockOut: '17:05' },
    ],
  },
  {
    email: 'user2@example.com',
    records: [
      { date: '2024-06-01', clockIn: '09:00', clockOut: '18:00' },
      { date: '2024-06-02', clockIn: '09:05', clockOut: '18:10' },
    ],
  },
];

export default function AdminPage() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/');
      return;
    }
    const userInfo = JSON.parse(userData);
    if (!userInfo.isAuthenticated || userInfo.type !== 'admin') {
      router.push('/');
      return;
    }
    setUser(userInfo);
    setIsLoading(false);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    router.push('/');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Admin: User Clock In/Out Records</h1>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">
              Welcome, <span className="font-semibold">{user.email}</span>
            </span>
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg p-6 overflow-x-auto">
          <h2 className="text-xl font-semibold mb-4">Clock In/Out Table</h2>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User Email</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clock In</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clock Out</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {mockClockData.map((user) =>
                user.records.map((rec, idx) => (
                  <tr key={user.email + rec.date}>
                    {idx === 0 ? (
                      <td rowSpan={user.records.length} className="px-4 py-2 align-top font-medium text-gray-900 border-r">{user.email}</td>
                    ) : null}
                    <td className="px-4 py-2">{rec.date}</td>
                    <td className="px-4 py-2">{rec.clockIn}</td>
                    <td className="px-4 py-2">{rec.clockOut}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
