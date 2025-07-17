'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { db, auth } from '../../../configs/firebaseConfigs';
import { collection, getDocs, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import ModalAlert from '../../components/ModalAlert';
import Navigation from '../../components/Navigation';
import * as XLSX from 'xlsx';

export default function UsersPage() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingData, setIsFetchingData] = useState(false);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [editingUser, setEditingUser] = useState(null); // For schedule modal
  const [showScheduleModal, setShowScheduleModal] = useState(false); // Modal visibility
  const [scheduleDay, setScheduleDay] = useState('');
  const [scheduleStart, setScheduleStart] = useState('');
  const [scheduleEnd, setScheduleEnd] = useState('');
  const router = useRouter();
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState('error');
  const [userTypeFilter, setUserTypeFilter] = useState('all');

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
    fetchAllUsers(userInfo);
  }, [router]);

  const fetchAllUsers = async (userInfo) => {
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
        setAlertMessage('Authentication error: No user ID available');
        setAlertType('error');
        setAlertOpen(true);
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
          setAlertMessage('Access denied: Admin privileges not found');
          setAlertType('error');
          setAlertOpen(true);
          return;
        }
      }

      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersData = [];
      
      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        usersData.push({
          id: userDoc.id,
          name: userData.name || 'N/A',
          email: userData.email || 'N/A',
          type: userData.type || 'user',
          createdAt: userData.createdAt || null,
          lastLogin: userData.lastLogin || null,
          allowedDay: userData.allowedDay || '',
          allowedStartTime: userData.allowedStartTime || '',
          allowedEndTime: userData.allowedEndTime || ''
        });
      }
      // Also fetch admin users to include them in the list
      const adminSnapshot = await getDocs(collection(db, 'admin'));
      for (const adminDoc of adminSnapshot.docs) {
        const adminData = adminDoc.data();
        usersData.push({
          id: adminDoc.id,
          name: adminData.name || adminData.email || 'Admin',
          email: adminData.email || 'N/A',
          type: 'admin',
          createdAt: adminData.createdAt || null,
          lastLogin: adminData.lastLogin || null,
          allowedDay: adminData.allowedDay || '',
          allowedStartTime: adminData.allowedStartTime || '',
          allowedEndTime: adminData.allowedEndTime || ''
        });
      }
      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching users:', error);
      setAlertMessage('Error fetching users: ' + error.message);
      setAlertType('error');
      setAlertOpen(true);
    } finally {
      setIsFetchingData(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    router.push('/');
  };

  const handleBackToDashboard = () => {
    router.push('/admin');
  };

  // Handler for Edit Schedule button
  const handleEditSchedule = (user) => {
    setEditingUser(user);
    setScheduleDay(user.allowedDay || '');
    setScheduleStart(user.allowedStartTime || '');
    setScheduleEnd(user.allowedEndTime || '');
    setShowScheduleModal(true);
  };

  // Save schedule to Firestore
  const handleSaveSchedule = async () => {
    if (!editingUser || !scheduleDay || !scheduleStart || !scheduleEnd) return;
    try {
      const userRef = editingUser.type === 'admin'
        ? doc(db, 'admin', editingUser.id)
        : doc(db, 'users', editingUser.id);
      await setDoc(userRef, {
        allowedDay: scheduleDay,
        allowedStartTime: scheduleStart,
        allowedEndTime: scheduleEnd
      }, { merge: true });
      // Fetch latest users and only then close modal
      await fetchAllUsers(user); // Ensure 'user' is the admin user info
      setShowScheduleModal(false);
      setEditingUser(null);
    } catch (error) {
      setAlertMessage('Failed to save schedule: ' + error.message);
      setAlertType('error');
      setAlertOpen(true);
    }
  };

  // Filtered users based on search and user type
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase());
    const matchesType = userTypeFilter === 'all' || user.type === userTypeFilter;
    return matchesSearch && matchesType;
  });

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
              <p className="text-xs text-gray-600 mt-1 text-center">User Management</p>
            </div>
            <div className="flex-shrink-0">
              <Navigation
                admin={true}
                onBackToLog={handleBackToDashboard}
                onLogout={handleLogout}
                userName="Admin!"
                currentPage="admin-users"
              />
            </div>
          </div>
          {/* Mobile welcome greeting */}
          <div className="md:hidden text-left text-sm text-gray-600 mb-2 pl-4">
            Welcome, <span className="font-semibold text-[#14206e]">Admin!</span>
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
                <p className="text-sm text-gray-600">User Management</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 md:space-x-4 animate-slide-in-right">
              <span className="text-sm text-gray-600 hidden md:block">
                Welcome, <span className="font-semibold text-[#14206e]">Admin!</span>
              </span>
              <Navigation
                admin={true}
                onBackToLog={handleBackToDashboard}
                onLogout={handleLogout}
                userName="Admin!"
                currentPage="admin-users"
              />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="bg-white shadow-lg rounded-2xl p-8 overflow-x-auto animate-fade-in">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 gap-4">
            {/* Search by Name or Email */}
            <div className="relative hover-lift flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search by name or email..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-[#14206e] focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-[#14206e] focus:border-[#14206e] sm:text-sm transition-all duration-200"
                style={{ color: '#14206e' }}
              />
            </div>
            {/* User Type Filter */}
            <div className="flex items-center gap-2">
              <label htmlFor="userTypeFilter" className="text-[#14206e] font-medium text-sm">Type:</label>
              <select
                id="userTypeFilter"
                value={userTypeFilter}
                onChange={e => setUserTypeFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-[#14206e] focus:outline-none focus:ring-2 focus:ring-[#14206e] focus:border-[#14206e] text-sm bg-white"
              >
                <option value="all">All</option>
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            {/* Clear Search Button */}
            <div className="hover-lift flex flex-row gap-2">
              <button
                onClick={() => setSearch('')}
                className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-all duration-200 hover-lift"
              >
                Clear Search
              </button>
              <button
                onClick={() => fetchAllUsers(user)}
                className="px-2 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-all duration-200 hover-lift flex items-center justify-center"
                disabled={isFetchingData}
                title="Reload"
                aria-label="Reload"
              >
                {isFetchingData ? (
                  <svg className="animate-spin h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582M19.418 19A9 9 0 105 5.582" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Loading State for Data Fetching */}
          {isFetchingData && (
            <div className="mb-6 p-6 bg-blue-50 border border-blue-200 rounded-xl animate-fade-in">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14206e] mr-4"></div>
                <div className="text-center">
                  <p className="text-[#14206e] font-medium">Fetching users...</p>
                  <p className="text-sm text-gray-600">Please wait while we load the data</p>
                </div>
              </div>
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
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
                        users.length
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Regular Users</dt>
                    <dd className="text-lg font-medium text-[#14206e]">
                      {isFetchingData ? (
                        <div className="animate-shimmer h-6 bg-gray-200 rounded"></div>
                      ) : (
                        users.filter(user => user.type === 'user').length
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Admins</dt>
                    <dd className="text-lg font-medium text-[#14206e]">
                      {isFetchingData ? (
                        <div className="animate-shimmer h-6 bg-gray-200 rounded"></div>
                      ) : (
                        users.filter(user => user.type === 'admin').length
                      )}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Users Table */}
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-[#14206e] text-white">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Name</th>
                  <th className="px-4 py-3 text-left font-semibold">Email</th>
                  <th className="px-4 py-3 text-left font-semibold">Type</th>
                  <th className="px-4 py-3 text-left font-semibold">Last Login</th>
                  <th className="px-4 py-3 text-left font-semibold">Schedule</th>
                  <th className="px-4 py-3 text-left font-semibold"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-gray-500">No users found.</td>
                  </tr>
                ) : (
                  filteredUsers.map(user => (
                    <tr key={user.id} className="hover:bg-blue-50 transition-all duration-150">
                      <td className="px-4 py-3 text-[#14206e] font-medium whitespace-nowrap">{user.name}</td>
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{user.email}</td>
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          user.type === 'admin' 
                            ? 'bg-purple-100 text-purple-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {user.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                        {user.lastLogin && user.lastLogin.seconds 
                          ? new Date(user.lastLogin.seconds * 1000).toLocaleDateString() + ' ' + new Date(user.lastLogin.seconds * 1000).toLocaleTimeString()
                          : user.createdAt && user.createdAt.seconds
                          ? new Date(user.createdAt.seconds * 1000).toLocaleDateString() + ' (Created)'
                          : 'Never'}
                      </td>
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                        {user.type !== 'admin' && (
                          <button
                            onClick={() => handleEditSchedule(user)}
                            className="px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg text-xs font-medium transition-all duration-200 hover-lift"
                          >
                            Edit Schedule
                          </button>
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

      {/* Schedule Edit Modal */}
      {showScheduleModal && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md animate-fade-in">
            <h2 className="text-xl font-bold text-[#14206e] mb-4 text-center">Edit Schedule for {editingUser.name}</h2>
            <form
              onSubmit={e => {
                e.preventDefault();
                handleSaveSchedule();
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-[#14206e] mb-2">Allowed Day</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[#14206e] focus:outline-none focus:ring-2 focus:ring-[#14206e] focus:border-[#14206e]"
                  value={scheduleDay}
                  onChange={e => setScheduleDay(e.target.value)}
                  required
                >
                  <option value="">Select a day</option>
                  {['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map(day => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-[#14206e] mb-2">Start Time</label>
                  <input
                    type="time"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[#14206e] focus:outline-none focus:ring-2 focus:ring-[#14206e] focus:border-[#14206e]"
                    value={scheduleStart}
                    onChange={e => setScheduleStart(e.target.value)}
                    required
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-[#14206e] mb-2">End Time</label>
                  <input
                    type="time"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[#14206e] focus:outline-none focus:ring-2 focus:ring-[#14206e] focus:border-[#14206e]"
                    value={scheduleEnd}
                    onChange={e => setScheduleEnd(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  className="px-4 py-2 bg-gray-400 hover:bg-gray-500 text-white rounded-lg text-sm font-medium"
                  onClick={() => { setShowScheduleModal(false); setEditingUser(null); }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#14206e] hover:bg-[#0f1a5a] text-white rounded-lg text-sm font-medium"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ModalAlert
        open={alertOpen}
        message={alertMessage}
        type={alertType}
        onClose={() => setAlertOpen(false)}
      />
    </div>
  );
} 