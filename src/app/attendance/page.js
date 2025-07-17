'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '../../configs/firebaseConfigs';
import { query, where, orderBy, limit, getDocs, collection, doc, getDoc } from 'firebase/firestore';
import ModalAlert from '../components/ModalAlert';
import Navigation from '../components/Navigation';

export default function AttendancePage() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [userName, setUserName] = useState('');
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalDays: 0,
    earlyIn: 0,
    onTime: 0,
    lateIn: 0,
    lateOut: 0,
    missed: 0
  });
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState('error');
  const router = useRouter();

  useEffect(() => {
    // Check authentication
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/');
      return;
    }

    const userInfo = JSON.parse(userData);
    if (!userInfo.isAuthenticated) {
      router.push('/');
      return;
    }

    setUser(userInfo);
    setIsLoading(false);

    // Fetch user's name from Firestore
    (async () => {
      if (!auth.currentUser) {
        router.push('/');
        return;
      }
      const userUid = auth.currentUser.uid;
      const userDocRef = doc(db, 'users', userUid);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        const data = userDocSnap.data();
        setUserName(data.name || '');
      }
    })();
  }, [router]);

  useEffect(() => {
    if (user) {
      fetchAttendanceRecords();
    }
  }, [user]);

  useEffect(() => {
    filterRecords();
  }, [attendanceRecords, selectedMonth, selectedYear, selectedStatus, searchTerm]);

  const fetchAttendanceRecords = async () => {
    try {
      if (!auth.currentUser) return;
      
      const userUid = auth.currentUser.uid;
      const userDocRef = doc(db, 'users', userUid);
      const clocklogRef = collection(userDocRef, 'clocklog');

      // Get all attendance records, ordered by clock in time (newest first)
      const q = query(clocklogRef, orderBy('clockIn', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const records = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.clockIn) {
          let clockInDate;
          try {
            clockInDate = data.clockIn.toDate ? data.clockIn.toDate() : new Date(data.clockIn);
          } catch (error) {
            console.error('Error parsing clock in date:', error);
            clockInDate = new Date(data.clockIn);
          }

          let clockOutDate = null;
          if (data.clockOut) {
            try {
              clockOutDate = data.clockOut.toDate ? data.clockOut.toDate() : new Date(data.clockOut);
            } catch (error) {
              console.error('Error parsing clock out date:', error);
              clockOutDate = new Date(data.clockOut);
            }
          }

          records.push({
            id: doc.id,
            clockIn: clockInDate,
            clockOut: clockOutDate,
            day: data.day,
            INstatus: data.INstatus || 'Unknown',
            OUTstatus: data.OUTstatus || 'Unknown',
            isMissedSchedule: data.isMissedSchedule || false,
            autoLogged: data.autoLogged || false,
            date: clockInDate.toISOString().split('T')[0],
            month: clockInDate.getMonth() + 1,
            year: clockInDate.getFullYear()
          });
        }
      });

      setAttendanceRecords(records);
    } catch (error) {
      console.error('Error fetching attendance records:', error);
      setAlertMessage('Failed to load attendance records');
      setAlertType('error');
      setAlertOpen(true);
    }
  };

  const filterRecords = () => {
    let filtered = [...attendanceRecords];

    // Filter by month
    if (selectedMonth) {
      filtered = filtered.filter(record => record.month === parseInt(selectedMonth));
    }

    // Filter by year
    if (selectedYear) {
      filtered = filtered.filter(record => record.year === parseInt(selectedYear));
    }

    // Filter by status
    if (selectedStatus) {
      filtered = filtered.filter(record => {
        if (selectedStatus === 'Early In') return record.INstatus === 'Early IN';
        if (selectedStatus === 'On Time') return record.INstatus === 'On Time';
        if (selectedStatus === 'Late In') return record.INstatus === 'Late';
        if (selectedStatus === 'Late Out') return record.OUTstatus === 'Late out';
        if (selectedStatus === 'Missed') return record.INstatus === 'Missed' || record.OUTstatus === 'Missed';
        return true;
      });
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(record => 
        record.day.toLowerCase().includes(term) ||
        record.INstatus.toLowerCase().includes(term) ||
        record.OUTstatus.toLowerCase().includes(term) ||
        formatDate(record.clockIn).toLowerCase().includes(term)
      );
    }

    setFilteredRecords(filtered);
    calculateStats(filtered);
  };

  const calculateStats = (records) => {
    const stats = {
      totalDays: records.length,
      earlyIn: records.filter(r => r.INstatus === 'Early IN').length,
      onTime: records.filter(r => r.INstatus === 'On Time').length,
      lateIn: records.filter(r => r.INstatus === 'Late').length,
      lateOut: records.filter(r => r.OUTstatus === 'Late out').length,
      missed: records.filter(r => r.INstatus === 'Missed' || r.OUTstatus === 'Missed').length
    };
    setStats(stats);
  };

  const formatTime = (date) => {
    if (!date) return 'N/A';
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Early IN':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'On Time':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Late':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Late out':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Missed':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Early IN':
        return '🌅';
      case 'On Time':
        return '✅';
      case 'Late':
        return '⏰';
      case 'Late out':
        return '🕐';
      case 'Missed':
        return '❌';
      default:
        return '❓';
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    router.push('/');
  };

  const handleBackToLog = () => {
    router.push('/log');
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchAttendanceRecords();
      setAlertMessage('Attendance records refreshed successfully');
      setAlertType('success');
      setAlertOpen(true);
    } catch (error) {
      console.error('Error refreshing records:', error);
      setAlertMessage('Failed to refresh attendance records');
      setAlertType('error');
      setAlertOpen(true);
    } finally {
      setIsRefreshing(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Day', 'Clock In', 'Clock Out', 'In Status', 'Out Status'];
    const csvContent = [
      headers.join(','),
      ...filteredRecords.map(record => [
        formatDate(record.clockIn),
        record.day,
        formatTime(record.clockIn),
        record.clockOut ? formatTime(record.clockOut) : 'Not clocked out',
        record.INstatus,
        record.OUTstatus
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_history_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white to-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#14206e]"></div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to home
  }

  // Generate month and year options
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
  const months = [
    { value: '', label: 'All Months' },
    { value: '1', label: 'January' },
    { value: '2', label: 'February' },
    { value: '3', label: 'March' },
    { value: '4', label: 'April' },
    { value: '5', label: 'May' },
    { value: '6', label: 'June' },
    { value: '7', label: 'July' },
    { value: '8', label: 'August' },
    { value: '9', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' }
  ];

  const statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'Early In', label: 'Early In' },
    { value: 'On Time', label: 'On Time' },
    { value: 'Late In', label: 'Late In' },
    { value: 'Late Out', label: 'Late Out' },
    { value: 'Missed', label: 'Missed' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-[#e6eaff]">
      {/* Header */}
      <header className="bg-white shadow-lg border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Mobile header layout */}
          <div className="flex items-center justify-between py-4 md:hidden">
            <div className="w-12 h-12 flex-shrink-0">
              <img 
                src="/images/logo.PNG" 
                alt="DCPH Logo" 
                className="w-full h-full object-contain rounded-full border-2 border-[#14206e] shadow-md"
              />
            </div>
            <div className="flex-1 flex flex-col items-center justify-center">
              <h1 className="text-[#14206e] font-bold leading-tight text-lg truncate text-center">
                DCPH: Anime and Manga
              </h1>
              <p className="text-xs text-gray-600 mt-1 text-center">Attendance History</p>
            </div>
            <div className="flex-shrink-0">
              <Navigation
                userName={userName}
                onLogout={handleLogout}
                onBackToLog={handleBackToLog}
                currentPage="attendance"
              />
            </div>
          </div>
          {/* Mobile welcome greeting */}
          <div className="md:hidden text-left text-sm text-gray-600 mb-2 pl-4">
            Welcome, <span className="font-semibold text-[#14206e]">{userName || 'User'}</span>
          </div>
          {/* Desktop header layout */}
          <div className="hidden md:flex flex-col md:flex-row justify-between items-center py-6 gap-4">
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
                <p className="text-sm text-gray-600">Attendance History</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 md:space-x-4 animate-slide-in-right">
              <span className="text-sm text-gray-600 hidden md:block">
                Welcome, <span className="font-semibold text-[#14206e]">{userName || 'User'}</span>
              </span>
              <Navigation
                userName={userName}
                onLogout={handleLogout}
                onBackToLog={handleBackToLog}
                currentPage="attendance"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-2 py-6 sm:px-0">
          {/* Statistics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            <div className="bg-white shadow-lg rounded-xl p-4 hover-lift animate-fade-in">
              <div className="text-center">
                <div className="text-2xl font-bold text-[#14206e]">{stats.totalDays}</div>
                <div className="text-sm text-gray-600">Total Days</div>
              </div>
            </div>
            <div className="bg-white shadow-lg rounded-xl p-4 hover-lift animate-fade-in">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.earlyIn}</div>
                <div className="text-sm text-gray-600">Early In</div>
              </div>
            </div>
            <div className="bg-white shadow-lg rounded-xl p-4 hover-lift animate-fade-in">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.onTime}</div>
                <div className="text-sm text-gray-600">On Time</div>
              </div>
            </div>
            <div className="bg-white shadow-lg rounded-xl p-4 hover-lift animate-fade-in">
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{stats.lateIn}</div>
                <div className="text-sm text-gray-600">Late In</div>
              </div>
            </div>
            <div className="bg-white shadow-lg rounded-xl p-4 hover-lift animate-fade-in">
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{stats.lateOut}</div>
                <div className="text-sm text-gray-600">Late Out</div>
              </div>
            </div>
            <div className="bg-white shadow-lg rounded-xl p-4 hover-lift animate-fade-in">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{stats.missed}</div>
                <div className="text-sm text-gray-600">Missed</div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white shadow-lg rounded-xl p-6 mb-8 animate-fade-in">
            <h2 className="text-lg font-semibold text-[#14206e] mb-4">Filters & Search</h2>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by day, status, or date..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14206e] focus:border-[#14206e]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14206e] focus:border-[#14206e]"
                >
                  {months.map((month) => (
                    <option key={month.value} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14206e] focus:border-[#14206e]"
                >
                  <option value="">All Years</option>
                  {years.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14206e] focus:border-[#14206e]"
                >
                  {statusOptions.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end space-x-2">
                <button
                  onClick={() => {
                    setSelectedMonth('');
                    setSelectedYear('');
                    setSelectedStatus('');
                    setSearchTerm('');
                  }}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 hover-lift"
                >
                  Clear
                </button>
                <button
                  onClick={exportToCSV}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 hover-lift"
                >
                  Export
                </button>
              </div>
            </div>
          </div>

          {/* Attendance Records */}
          <div className="bg-white shadow-lg rounded-xl p-6 animate-fade-in">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-[#14206e]">
                Attendance Records ({filteredRecords.length})
              </h2>
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="bg-[#14206e] hover:bg-[#1a2a8a] text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover-lift disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {isRefreshing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Refreshing...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                    </svg>
                    Refresh
                  </>
                )}
              </button>
            </div>

            {filteredRecords.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📅</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No attendance records found</h3>
                <p className="text-gray-500">Try adjusting your filters or check back later.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Day
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Clock In
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Clock Out
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        In Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Out Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredRecords.map((record) => (
                      <tr key={record.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {formatDate(record.clockIn)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {record.day}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatTime(record.clockIn)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.clockOut ? formatTime(record.clockOut) : 'Not clocked out'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(record.INstatus)}`}>
                            <span className="mr-1">{getStatusIcon(record.INstatus)}</span>
                            {record.INstatus}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(record.OUTstatus)}`}>
                            <span className="mr-1">{getStatusIcon(record.OUTstatus)}</span>
                            {record.OUTstatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      <ModalAlert
        open={alertOpen}
        message={alertMessage}
        type={alertType}
        onClose={() => setAlertOpen(false)}
      />
    </div>
  );
} 