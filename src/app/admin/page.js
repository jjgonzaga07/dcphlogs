'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { db, auth } from '../../configs/firebaseConfigs';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import * as XLSX from 'xlsx';

export default function AdminPage() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingData, setIsFetchingData] = useState(false);
  const [clocklogs, setClocklogs] = useState([]);
  const [search, setSearch] = useState('');
  const [dayFilter, setDayFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
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
    fetchAllClocklogs(userInfo);
  }, [router]);

  const fetchAllClocklogs = async (userInfo) => {
    try {
      setIsFetchingData(true);
      let adminUid = null;
      
      // First try to get UID from Firebase Auth
      if (auth && auth.currentUser) {
        adminUid = auth.currentUser.uid;
        console.log('Using Firebase Auth UID:', adminUid);
      } else if (userInfo && userInfo.uid) {
        adminUid = userInfo.uid;
        console.log('Using localStorage UID:', adminUid);
      } else {
        console.error('No UID available');
        alert('Authentication error: No user ID available');
        return;
      }
      
      console.log('Admin UID:', adminUid);
      console.log('userInfo:', userInfo);
      
      // Verify admin access
      if (adminUid) {
        const adminDocRef = doc(db, 'admin', adminUid);
        const adminDocSnap = await getDoc(adminDocRef);
        console.log('Admin doc exists:', adminDocSnap.exists());
        if (adminDocSnap.exists()) {
          console.log('Admin doc data:', adminDocSnap.data());
        } else {
          console.error('Admin document not found');
          alert('Access denied: Admin privileges not found');
          return;
        }
      }
      const usersSnapshot = await getDocs(collection(db, 'users'));
      let allLogs = [];
      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        const userName = userData.name || userData.email || userDoc.id;
        const clocklogSnapshot = await getDocs(collection(doc(db, 'users', userDoc.id), 'clocklog'));
        for (const logDoc of clocklogSnapshot.docs) {
          const logData = logDoc.data();
          allLogs.push({
            id: logDoc.id,
            userId: userDoc.id,
            name: userName,
            ...logData
          });
        }
      }
      console.log('Fetched clocklogs:', allLogs);
      setClocklogs(allLogs);
    } catch (error) {
      console.error('Error fetching clocklogs:', error);
      alert('Error fetching clocklogs: ' + error.message);
    } finally {
      setIsFetchingData(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    router.push('/');
  };

  // Helper function to check if a log entry matches the selected date
  const isLogOnDate = (log, selectedDate) => {
    if (!selectedDate || !log.clockIn) return true;
    
    const logDate = new Date(log.clockIn.seconds * 1000);
    const filterDate = new Date(selectedDate);
    
    return logDate.toDateString() === filterDate.toDateString();
  };

  // Filtered and searched logs
  const filteredLogs = clocklogs
    .filter(log => log.id !== 'init')
    .filter(log => {
      const matchesName = log.name.toLowerCase().includes(search.toLowerCase());
      const matchesDay = dayFilter ? log.day === dayFilter : true;
      const matchesDate = isLogOnDate(log, dateFilter);
      return matchesName && matchesDay && matchesDate;
    });

  const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  const handleExportToExcel = () => {
    // Group logs by day
    const logsByDay = {};
    filteredLogs.forEach(log => {
      const day = log.day || 'Unknown';
      if (!logsByDay[day]) logsByDay[day] = [];
      logsByDay[day].push(log);
    });
    const workbook = XLSX.utils.book_new();
    Object.entries(logsByDay).forEach(([day, logs]) => {
      const exportData = logs.map(log => ({
        Name: log.name,
        'Clock In': log.clockIn && log.clockIn.seconds ? new Date(log.clockIn.seconds * 1000).toLocaleString() : '',
        'IN Remarks': log.INstatus || '',
        'Clock Out': log.clockOut && log.clockOut.seconds ? new Date(log.clockOut.seconds * 1000).toLocaleString() : '',
        'OUT Remarks': log.OUTstatus || '',
        Day: log.day || '',
        Date: log.clockIn && log.clockIn.seconds ? new Date(log.clockIn.seconds * 1000).toLocaleDateString() : ''
      }));
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      XLSX.utils.book_append_sheet(workbook, worksheet, day);
    });
    XLSX.writeFile(workbook, 'Log History.xlsx');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white to-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#14206e]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-[#e6eaff]">
      {/* Header */}
      <header className="bg-white shadow-lg border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center animate-slide-in-left">
            <div className="w-16 h-16 mr-4">
              <img 
                src="/images/logo.PNG" 
                alt="DCPH Logo" 
                className="w-full h-full object-contain rounded-full border-2 border-[#14206e] shadow-md"
              />
            </div>
            <div>
              <h1 className="whitespace-nowrap truncate text-[#14206e] font-bold leading-tight" style={{ fontSize: 'clamp(1.25rem, 4vw, 2.25rem)' }}>
                DCPH: Anime and Manga
              </h1>
              <p className="text-sm text-gray-600">Admin Dashboard</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 md:space-x-4 animate-slide-in-right">
            <span className="text-sm text-gray-600">
              Welcome, <span className="font-semibold text-[#14206e]">Admin!</span>
            </span>
            <button
              onClick={() => router.push('/admin/users')}
              className="bg-[#14206e] hover:bg-[#0f1a5a] text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover-lift"
            >
              View Users
            </button>
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover-lift"
            >
              Logout
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="bg-white shadow-lg rounded-2xl p-8 overflow-x-auto animate-fade-in">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 gap-4">
            {/* Search by Name */}
            <div className="relative hover-lift flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search by name..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-[#14206e] focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-[#14206e] focus:border-[#14206e] sm:text-sm transition-all duration-200"
                style={{ color: '#14206e' }}
              />
            </div>
            {/* Date Filter */}
            <div className="hover-lift">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-[#14206e]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                  </svg>
                </div>
                <input
                  type="date"
                  value={dateFilter}
                  onChange={e => setDateFilter(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-[#14206e] focus:outline-none focus:ring-2 focus:ring-[#14206e] focus:border-[#14206e] sm:text-sm transition-all duration-200"
                  style={{ color: '#14206e' }}
                />
              </div>
            </div>
            {/* Day Filter */}
            <div className="hover-lift">
              <select
                value={dayFilter}
                onChange={e => setDayFilter(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white text-[#14206e] focus:outline-none focus:ring-2 focus:ring-[#14206e] focus:border-[#14206e] sm:text-sm transition-all duration-200"
              >
                <option value="" className="text-[#14206e]">All Days</option>
                {daysOfWeek.map(day => (
                  <option key={day} value={day} className="text-[#14206e]">{day}</option>
                ))}
              </select>
            </div>
            {/* Clear Filters and Export Buttons */}
            <div className="flex gap-2 hover-lift">
              <button
                onClick={() => {
                  setSearch('');
                  setDayFilter('');
                  setDateFilter('');
                }}
                className="w-full px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-all duration-200 hover-lift"
              >
                Clear Filters
              </button>
              <button
                onClick={handleExportToExcel}
                className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-all duration-200 hover-lift"
              >
                Export
              </button>
            </div>
          </div>
          {/* Loading State for Data Fetching */}
          {isFetchingData && (
            <div className="mb-6 p-6 bg-blue-50 border border-blue-200 rounded-xl animate-fade-in">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14206e] mr-4"></div>
                <div className="text-center">
                  <p className="text-[#14206e] font-medium">Fetching clock logs...</p>
                  <p className="text-sm text-gray-600">Please wait while we load the data</p>
                </div>
              </div>
            </div>
          )}
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200 hover-lift">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-8 w-8 text-[#14206e]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"></path>
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Users</dt>
                    <dd className="text-lg font-medium text-[#14206e]">
                      {isFetchingData ? (
                        <div className="h-4 w-16 bg-blue-100 animate-pulse rounded" />
                      ) : (
                        [...new Set(clocklogs.map(log => log.userId))].length
                      )}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-green-50 to-green-100 p-6 rounded-xl border border-green-200 hover-lift">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-8 w-8 text-[#14206e]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Logs</dt>
                    <dd className="text-lg font-medium text-[#14206e]">
                      {isFetchingData ? (
                        <div className="animate-shimmer h-6 bg-gray-200 rounded"></div>
                      ) : (
                        filteredLogs.length
                      )}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-6 rounded-xl border border-purple-200 hover-lift">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-8 w-8 text-[#14206e]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Active Today</dt>
                    <dd className="text-lg font-medium text-[#14206e]">
                      {isFetchingData ? (
                        <div className="animate-shimmer h-6 bg-gray-200 rounded"></div>
                      ) : (
                        filteredLogs.filter(log => log.clockOut === null).length
                      )}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-6 rounded-xl border border-orange-200 hover-lift">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-8 w-8 text-[#14206e]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"></path>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z"></path>
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Filtered Results</dt>
                    <dd className="text-lg font-medium text-[#14206e]">
                      {isFetchingData ? (
                        <div className="animate-shimmer h-6 bg-gray-200 rounded"></div>
                      ) : (
                        filteredLogs.length
                      )}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Logs Table */}
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-[#14206e] text-white">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Name</th>
                  <th className="px-4 py-3 text-left font-semibold">Day</th>
                  <th className="px-4 py-3 text-left font-semibold">Clock In</th>
                  <th className="px-4 py-3 text-left font-semibold">Remarks</th>
                  <th className="px-4 py-3 text-left font-semibold">Clock Out</th>
                  <th className="px-4 py-3 text-left font-semibold">Remarks</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-gray-500">No logs found.</td>
                  </tr>
                ) : (
                  filteredLogs.map(log => (
                    <tr key={log.id} className="hover:bg-blue-50 transition-all duration-150">
                      <td className="px-4 py-3 text-[#14206e] font-medium whitespace-nowrap">{log.name}</td>
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{log.day}</td>
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                        {log.clockIn && log.clockIn.seconds ? new Date(log.clockIn.seconds * 1000).toLocaleString() : '-'}
                      </td>
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                        {log.INstatus ? (
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold
                            ${log.INstatus === 'Early IN' || log.INstatus === 'On Time' ? 'bg-green-100 text-green-800' : ''}
                            ${log.INstatus === 'Late' ? 'bg-red-100 text-red-800' : ''}
                            ${!['Early IN','On Time','Late'].includes(log.INstatus) ? 'bg-gray-100 text-gray-600' : ''}
                          `}>
                            {log.INstatus}
                          </span>
                        ) : (
                          <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs font-semibold">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                        {log.clockOut && log.clockOut.seconds ? new Date(log.clockOut.seconds * 1000).toLocaleString() : '-'}
                      </td>
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                        {log.OUTstatus ? (
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold
                            ${log.OUTstatus === 'Missed' ? 'bg-red-600 text-white' : ''}
                            ${log.OUTstatus === 'Late out' ? 'bg-red-100 text-red-800' : ''}
                            ${log.OUTstatus === '' ? 'bg-gray-100 text-gray-600' : ''}
                            ${log.OUTstatus !== 'Late out' && log.OUTstatus !== '' && log.OUTstatus !== 'Missed' ? 'bg-green-100 text-green-800' : ''}
                          `}>
                            {log.OUTstatus}
                          </span>
                        ) : (
                          <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs font-semibold">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
