'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '../../configs/firebaseConfigs';
import { doc, setDoc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';

export default function LogPage() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState('');
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [currentClockInId, setCurrentClockInId] = useState(null);
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
  }, [router]);

  // Update time every second
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const philippinesTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Manila"}));
      const timeString = philippinesTime.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      setCurrentTime(timeString);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  // Check if user is currently clocked in
  useEffect(() => {
    if (user) {
      checkClockInStatus();
    }
  }, [user]);

  const checkClockInStatus = async () => {
    try {
      // Get the user UID from Firebase Auth or use a fallback
      let userUid = null;
      
      if (auth.currentUser) {
        userUid = auth.currentUser.uid;
      } else {
        // If auth.currentUser is not available, we'll need to get the UID differently
        // For now, let's use the email as a fallback (not ideal but will work for testing)
        userUid = user.email.replace('@', '_at_').replace('.', '_dot_');
      }

      const userDocRef = doc(db, 'users', userUid);
      const clocklogRef = collection(userDocRef, 'clocklog');
      
      // Get today's date in YYYY-MM-DD format
      const today = new Date().toISOString().split('T')[0];
      
      // Check if there's an active clock in (no clock out for today)
      const querySnapshot = await getDoc(userDocRef);
      if (querySnapshot.exists()) {
        // This is a simplified check - in a real app you'd query the clocklog subcollection
        // For now, we'll use localStorage to track clock in status
        const clockStatus = localStorage.getItem(`clockIn_${userUid}_${today}`);
        if (clockStatus) {
          const status = JSON.parse(clockStatus);
          setIsClockedIn(status.isClockedIn);
          setCurrentClockInId(status.clockInId);
        }
      }
    } catch (error) {
      console.error('Error checking clock in status:', error);
    }
  };

  const handleClockIn = async () => {
    console.log('Clock in button clicked');
    
    if (!user) {
      console.error('No user data available');
      return;
    }

    try {
      console.log('Starting clock in process...');
      console.log('User:', user);
      
      // Get the user UID from Firebase Auth or use a fallback
      let userUid = null;
      
      if (auth.currentUser) {
        userUid = auth.currentUser.uid;
        console.log('Using auth.currentUser.uid:', userUid);
      } else {
        userUid = user.email.replace('@', '_at_').replace('.', '_dot_');
        console.log('Using fallback UID:', userUid);
      }
      
      // Create timestamp for clock in
      const clockInTimestamp = serverTimestamp();
      
      // Get the day of the week as a string
      const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const now = new Date();
      const today = daysOfWeek[now.getDay()];

      console.log('Today:', today);
      console.log('Clock in timestamp:', clockInTimestamp);

      // First, ensure the user document exists
      const userDocRef = doc(db, 'users', userUid);
      console.log('User document reference:', userDocRef.path);
      
      const userDocSnap = await getDoc(userDocRef);
      
      if (!userDocSnap.exists()) {
        console.log('User document does not exist, creating it...');
        await setDoc(userDocRef, {
          email: user.email,
          type: 'user',
          createdAt: serverTimestamp()
        });
        console.log('User document created successfully');
      } else {
        console.log('User document already exists');
      }

      // Create clocklog document
      const clocklogRef = collection(userDocRef, 'clocklog');
      console.log('Clocklog collection reference:', clocklogRef.path);
      
      const clockInData = {
        clockIn: clockInTimestamp,
        clockOut: null,
        day: today
      };

      console.log('Creating clocklog document with data:', clockInData);

      const docRef = await addDoc(clocklogRef, clockInData);
      
      console.log('Clocklog document created with ID:', docRef.id);
      console.log('Full path: users/' + userUid + '/clocklog/' + docRef.id);
      
      // Store clock in status in localStorage
      localStorage.setItem(`clockIn_${userUid}_${today}`, JSON.stringify({
        isClockedIn: true,
        clockInId: docRef.id
      }));

      setIsClockedIn(true);
      setCurrentClockInId(docRef.id);
      
      console.log('Clocked in successfully');
    } catch (error) {
      console.error('Error clocking in:', error);
      console.error('Error type:', typeof error);
      console.error('Error message:', error.message);
      console.error('Error code:', error.code);
      console.error('Error stack:', error.stack);
      
      alert(`Clock in failed: ${error.message}`);
    }
  };

  const handleClockOut = async () => {
    if (!user || !currentClockInId) {
      console.error('No user data or clock in ID available');
      return;
    }

    try {
      // Get the user UID from Firebase Auth or use a fallback
      let userUid = null;
      
      if (auth.currentUser) {
        userUid = auth.currentUser.uid;
      } else {
        userUid = user.email.replace('@', '_at_').replace('.', '_dot_');
      }

      // Create timestamp for clock out
      const clockOutTimestamp = serverTimestamp();
      
      // Get today's date as string
      const today = new Date().toISOString().split('T')[0];

      // Update the clocklog document
      const userDocRef = doc(db, 'users', userUid);
      const clocklogDocRef = doc(userDocRef, 'clocklog', currentClockInId);
      
      await setDoc(clocklogDocRef, {
        clockOut: clockOutTimestamp
      }, { merge: true });

      // Remove clock in status from localStorage
      localStorage.removeItem(`clockIn_${userUid}_${today}`);

      setIsClockedIn(false);
      setCurrentClockInId(null);
      
      console.log('Clocked out successfully');
    } catch (error) {
      console.error('Error clocking out:', error);
      alert(`Clock out failed: ${error.message}`);
    }
  };

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

  if (!user) {
    return null; // Will redirect to home
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-3xl font-bold text-gray-900">
                User Dashboard
              </h1>
            </div>
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
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="space-y-6">
            {/* Real-time Clock */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Philippines Time</h2>
              <div className="text-6xl font-mono text-center text-blue-600">
                {currentTime}
              </div>
              <p className="text-center text-gray-500 mt-2">Real-time</p>
            </div>

            {/* Clock In/Out Section */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Time Clock</h2>
              <div className="flex justify-center space-x-4">
                {!isClockedIn ? (
                  <button
                    onClick={handleClockIn}
                    className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg text-lg font-medium transition-colors"
                  >
                    Clock In
                  </button>
                ) : (
                  <button
                    onClick={handleClockOut}
                    className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-lg text-lg font-medium transition-colors"
                  >
                    Clock Out
                  </button>
                )}
              </div>
              <div className="mt-4 text-center">
                <p className={`text-lg font-medium ${isClockedIn ? 'text-green-600' : 'text-gray-500'}`}>
                  {isClockedIn ? 'Currently Clocked In' : 'Not Clocked In'}
                </p>
              </div>
            </div>

            {/* Status Info */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Today's Status</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900">Current Status</h4>
                  <p className="text-blue-700 text-sm mt-1">
                    {isClockedIn ? 'Active - Clocked In' : 'Inactive - Not Clocked In'}
                  </p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-medium text-green-900">Session</h4>
                  <p className="text-green-700 text-sm mt-1">
                    {isClockedIn ? 'Active session in progress' : 'No active session'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
