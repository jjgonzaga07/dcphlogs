'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '../../configs/firebaseConfigs';
import { query, where, orderBy, limit, getDocs, collection, doc, setDoc, getDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import ModalAlert from '../components/ModalAlert';
import QRCodeModal from '../components/QRCodeModal';
import Navigation from '../components/Navigation';

export default function LogPage() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState('');
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [currentClockInId, setCurrentClockInId] = useState(null);
  const [userName, setUserName] = useState('');
  const [isClockInLoading, setIsClockInLoading] = useState(false);
  const [isClockOutLoading, setIsClockOutLoading] = useState(false);
  const [showSauceNAOModal, setShowSauceNAOModal] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [sauceNAOResults, setSauceNAOResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState('error');
  const [missedSchedulesCount, setMissedSchedulesCount] = useState(0);
  const [showQRCodeModal, setShowQRCodeModal] = useState(false);
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

    // Ensure clocklog subcollection exists
    (async () => {
      if (!auth.currentUser) {
        router.push('/');
        return;
      }
      const userUid = auth.currentUser.uid;
      const userDocRef = doc(db, 'users', userUid);
      const clocklogRef = collection(userDocRef, 'clocklog');
      const snapshot = await getDocs(clocklogRef);
      if (snapshot.empty) {
        await setDoc(doc(clocklogRef, 'init'), { initialized: true });
      }
    })();

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
      checkAndLogMissedSchedules();
    }
  }, [user]);

  const checkClockInStatus = async () => {
    try {
      if (!auth.currentUser) return;
      const userUid = auth.currentUser.uid;
      const userDocRef = doc(db, 'users', userUid);
      const clocklogRef = collection(userDocRef, 'clocklog');

      // Query for the latest clocklog where clockOut is null
      // Use a simpler query to avoid composite index requirements
      const q = query(clocklogRef, where('clockOut', '==', null));
      const querySnapshot = await getDocs(q);
      
      // Sort in JavaScript to get the latest entry
      const sortedDocs = querySnapshot.docs.sort((a, b) => {
        const aData = a.data();
        const bData = b.data();
        
        let aTime, bTime;
        try {
          aTime = aData.clockIn?.toDate ? aData.clockIn.toDate() : new Date(aData.clockIn);
        } catch (error) {
          console.error('Error parsing aData.clockIn:', error);
          aTime = new Date(0);
        }
        
        try {
          bTime = bData.clockIn?.toDate ? bData.clockIn.toDate() : new Date(bData.clockIn);
        } catch (error) {
          console.error('Error parsing bData.clockIn:', error);
          bTime = new Date(0);
        }
        
        return bTime - aTime; // Descending order
      });

      if (sortedDocs.length > 0) {
        // There is an active clock-in session
        const docSnap = sortedDocs[0];
        setIsClockedIn(true);
        setCurrentClockInId(docSnap.id);
      } else {
        setIsClockedIn(false);
        setCurrentClockInId(null);
      }
    } catch (error) {
      console.error('Error checking clock in status:', error);
    }
  };

  const checkAndLogMissedSchedules = async () => {
    try {
      if (!auth.currentUser) return;
      
      const now = new Date(); // Move this to the top
      const userUid = auth.currentUser.uid;
      
      // Check if we've already processed missed schedules for this session
      const sessionKey = `missedSchedulesProcessed_${userUid}`;
      const lastProcessed = localStorage.getItem(sessionKey);
      const today = new Date().toDateString();
      
      if (lastProcessed === today) {
        return; // Already processed today
      }
      
      const userDocRef = doc(db, 'users', userUid);
      
      // Fetch user's schedule from users collection
      const userDocSnap = await getDoc(userDocRef);
      let allowedDay = null, allowedStartTime = null, allowedEndTime = null;
      
      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        allowedDay = userData.allowedDay;
        allowedStartTime = userData.allowedStartTime;
        allowedEndTime = userData.allowedEndTime;
      }
      
      // If not found in users collection, check admin collection
      if ((!allowedDay || !allowedStartTime || !allowedEndTime) && user && user.type === 'admin') {
        const adminDocRef = doc(db, 'admin', userUid);
        const adminDocSnap = await getDoc(adminDocRef);
        if (adminDocSnap.exists()) {
          const adminData = adminDocSnap.data();
          allowedDay = adminData.allowedDay;
          allowedStartTime = adminData.allowedStartTime;
          allowedEndTime = adminData.allowedEndTime;
        }
      }
      
      // If no schedule is set, skip
      if (!allowedDay || !allowedStartTime || !allowedEndTime) return;
      
      // Get user's creation date to avoid logging missed schedules before user existed
      let userCreatedAt = null;
      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        if (userData.createdAt) {
          userCreatedAt = userData.createdAt.toDate ? userData.createdAt.toDate() : new Date(userData.createdAt);
        }
      }
      
      // If we can't determine when user was created, skip to avoid false positives
      if (!userCreatedAt) {
        console.log('User creation date not found, skipping missed schedule check');
        return;
      }
      
      console.log('Checking missed schedules from', userCreatedAt.toDateString(), 'to', now.toDateString());
      
      // If user was created today, no need to check for missed schedules
      const todayDate = new Date();
      todayDate.setHours(0, 0, 0, 0);
      const userCreatedToday = new Date(userCreatedAt);
      userCreatedToday.setHours(0, 0, 0, 0);
      
      if (userCreatedToday.getTime() === todayDate.getTime()) {
        console.log('User was created today, no missed schedules to check');
        return;
      }
      
      const clocklogRef = collection(userDocRef, 'clocklog');
      
      // Get all existing logs for the allowed day to avoid multiple queries
      const existingLogQuery = query(clocklogRef, where('day', '==', allowedDay));
      const existingLogSnapshot = await getDocs(existingLogQuery);
      const existingLogs = existingLogSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id
        };
      });
      
      // Check the last 7 days for missed schedules, but only after user was created
      let missedCount = 0;
      for (let i = 1; i <= 7; i++) {
        const checkDate = new Date(now);
        checkDate.setDate(checkDate.getDate() - i);
        const dayOfWeek = daysOfWeek[checkDate.getDay()];
        
        // Only check if this day matches the allowed schedule, is not in the future, and is after user creation
        if (dayOfWeek === allowedDay && checkDate <= now && checkDate >= userCreatedAt) {
          const dateString = checkDate.toISOString().split('T')[0];
          console.log(`Checking ${allowedDay} ${dateString} for missed schedule`);
          
          // Check if there's already a log for this date using the pre-fetched data
          const hasLogForDate = existingLogs.some(log => {
            if (!log.clockIn) return false;
            
            let logDate;
            try {
              logDate = log.clockIn.toDate ? log.clockIn.toDate() : new Date(log.clockIn);
            } catch (error) {
              console.error('Error parsing log date:', error);
              return false;
            }
            
            const checkDateStart = new Date(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate(), 0, 0, 0);
            const checkDateEnd = new Date(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate() + 1, 0, 0, 0);
            
            return logDate >= checkDateStart && logDate < checkDateEnd;
          });
          
          // If no log exists for this scheduled day, create a missed entry
          if (!hasLogForDate) {
            // Validate time format
            const startTimeParts = allowedStartTime.split(':');
            const endTimeParts = allowedEndTime.split(':');
            
            if (startTimeParts.length !== 2 || endTimeParts.length !== 2) {
              console.error('Invalid time format:', { allowedStartTime, allowedEndTime });
              continue;
            }
            
            const [startHour, startMin] = startTimeParts.map(Number);
            const [endHour, endMin] = endTimeParts.map(Number);
            
            // Validate time values
            if (isNaN(startHour) || isNaN(startMin) || isNaN(endHour) || isNaN(endMin)) {
              console.error('Invalid time values:', { startHour, startMin, endHour, endMin });
              continue;
            }
            
            // Create a timestamp for the scheduled start time
            const scheduledStartTime = new Date(checkDate);
            scheduledStartTime.setHours(startHour, startMin, 0, 0);
            
            // Create a timestamp for the scheduled end time
            const scheduledEndTime = new Date(checkDate);
            scheduledEndTime.setHours(endHour, endMin, 0, 0);
            
            // Create missed log entry
            const missedLogData = {
              clockIn: scheduledStartTime,
              clockOut: scheduledEndTime,
              day: allowedDay,
              INstatus: 'Missed',
              OUTstatus: 'Missed',
              isMissedSchedule: true,
              missedDate: dateString,
              autoLogged: true,
              loggedAt: serverTimestamp()
            };
            
            await addDoc(clocklogRef, missedLogData);
            console.log(`Auto-logged missed schedule for ${dateString} (user created: ${userCreatedAt.toDateString()})`);
            missedCount++;
          }
        }
      }
      
      // Show notification if missed schedules were logged
      if (missedCount > 0) {
        setMissedSchedulesCount(missedCount);
        setAlertMessage(`${missedCount} missed schedule${missedCount > 1 ? 's' : ''} from the past week have been automatically logged.`);
        setAlertType('info');
        setAlertOpen(true);
      }
      
      // Mark as processed for today
      localStorage.setItem(sessionKey, today);
    } catch (error) {
      console.error('Error checking and logging missed schedules:', error);
    }
  };

  const handleClockIn = async () => {
    console.log('Clock in button clicked');
    
    if (!user || !auth.currentUser) {
      console.error('No user data or not authenticated');
      return;
    }

    try {
      setIsClockInLoading(true);
      console.log('Starting clock in process...');
      console.log('User:', user);
      
      // Get the user UID from Firebase Auth or use a fallback
      const userUid = auth.currentUser.uid;
      
      // Fetch allowed schedule from Firestore
      const userDocRefSchedule = doc(db, 'users', userUid);
      const userDocSnapSchedule = await getDoc(userDocRefSchedule);
      let allowedDay = null, allowedStartTime = null, allowedEndTime = null;
      if (userDocSnapSchedule.exists()) {
        const data = userDocSnapSchedule.data();
        allowedDay = data.allowedDay;
        allowedStartTime = data.allowedStartTime;
        allowedEndTime = data.allowedEndTime;
      }
      // If not found in users, check admin collection
      if ((!allowedDay || !allowedStartTime || !allowedEndTime) && user.type === 'admin') {
        const adminDocRef = doc(db, 'admin', userUid);
        const adminDocSnap = await getDoc(adminDocRef);
        if (adminDocSnap.exists()) {
          const data = adminDocSnap.data();
          allowedDay = data.allowedDay;
          allowedStartTime = data.allowedStartTime;
          allowedEndTime = data.allowedEndTime;
        }
      }
      // Require schedule to be set before allowing clock in
      if (!allowedDay || !allowedStartTime || !allowedEndTime) {
        setAlertMessage('You must have a schedule set before you can clock in. Please contact your administrator.');
        setAlertType('error');
        setAlertOpen(true);
        setIsClockInLoading(false);
        return;
      }
      // Enforce allowed schedule if set
      if (allowedDay && allowedStartTime && allowedEndTime) {
        const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const now = new Date();
        const today = daysOfWeek[now.getDay()];
        const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
        // Calculate time boundaries
        const [startHour, startMin] = allowedStartTime.split(':').map(Number);
        const [endHour, endMin] = allowedEndTime.split(':').map(Number);
        const startDate = new Date(now);
        startDate.setHours(startHour, startMin - 5, 0, 0); // 5 min early
        const endDate = new Date(now);
        endDate.setHours(endHour, endMin, 0, 0);
        const nowDate = new Date(now);
        // Only allow clock in from 5 min before start to end time
        if (today !== allowedDay) {
          setAlertMessage(`You are only allowed to clock in on ${allowedDay}.`);
          setAlertType('error');
          setAlertOpen(true);
          setIsClockInLoading(false);
          return;
        }
        if (nowDate < startDate) {
          setAlertMessage(`You can only clock in up to 5 minutes before ${allowedStartTime}. Current time: ${currentTime}`);
          setAlertType('error');
          setAlertOpen(true);
          setIsClockInLoading(false);
          return;
        }
        if (nowDate > endDate) {
          setAlertMessage(`You can only clock in until ${allowedEndTime}. Current time: ${currentTime}`);
          setAlertType('error');
          setAlertOpen(true);
          setIsClockInLoading(false);
          return;
        }
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
          name: user.displayName || userName || 'User', // Always set name
          createdAt: serverTimestamp()
        });
        console.log('User document created successfully');
      } else {
        console.log('User document already exists');
      }

      // Determine INstatus
      let INstatus = '';
      if (allowedDay && allowedStartTime && allowedEndTime) {
        const [startHour, startMin] = allowedStartTime.split(':').map(Number);
        const startDate = new Date(now);
        startDate.setHours(startHour, startMin, 0, 0);
        const onTimeLimit = new Date(startDate.getTime() + 5 * 60000); // 5 min after start
        if (now < startDate) {
          INstatus = 'Early IN';
        } else if (now >= startDate && now <= onTimeLimit) {
          INstatus = 'On Time';
        } else {
          INstatus = 'Late';
        }
      }
      
      // Create clocklog document
      const clocklogRef = collection(userDocRef, 'clocklog');
      console.log('Clocklog collection reference:', clocklogRef.path);
      
      const clockInData = {
        clockIn: clockInTimestamp,
        clockOut: null,
        day: today,
        INstatus // Save INstatus
      };

      console.log('Creating clocklog document with data:', clockInData);

      const docRef = await addDoc(clocklogRef, clockInData);
      
      console.log('Clocklog document created with ID:', docRef.id);
      console.log('Full path: users/' + userUid + '/clocklog/' + docRef.id);
      
      // Store clock in status in localStorage
      // localStorage.setItem(`clockIn_${userUid}_${today}`, JSON.stringify({
      //   isClockedIn: true,
      //   clockInId: docRef.id
      // }));

      setIsClockedIn(true);
      setCurrentClockInId(docRef.id);
      
      console.log('Clocked in successfully');
    } catch (error) {
      console.error('Error clocking in:', error);
      console.error('Error type:', typeof error);
      console.error('Error message:', error.message);
      console.error('Error code:', error.code);
      console.error('Error stack:', error.stack);
      
      setAlertMessage(`Clock in failed: ${error.message}`);
      setAlertType('error');
      setAlertOpen(true);
    } finally {
      setIsClockInLoading(false);
    }
  };

  const handleClockOut = async () => {
    if (!user || !currentClockInId || !auth.currentUser) {
      console.error('No user data, clock in ID, or not authenticated');
      return;
    }

    try {
      setIsClockOutLoading(true);
      // Get the user UID from Firebase Auth or use a fallback
      const userUid = auth.currentUser.uid;
      const now = new Date(); // Ensure now is available throughout the function

      // Fetch allowed schedule from Firestore
      const userDocRefSchedule = doc(db, 'users', userUid);
      const userDocSnapSchedule = await getDoc(userDocRefSchedule);
      let allowedDay = null, allowedStartTime = null, allowedEndTime = null;
      if (userDocSnapSchedule.exists()) {
        const data = userDocSnapSchedule.data();
        allowedDay = data.allowedDay;
        allowedStartTime = data.allowedStartTime;
        allowedEndTime = data.allowedEndTime;
      }
      // If not found in users, check admin collection
      if ((!allowedDay || !allowedStartTime || !allowedEndTime) && user.type === 'admin') {
        const adminDocRef = doc(db, 'admin', userUid);
        const adminDocSnap = await getDoc(adminDocRef);
        if (adminDocSnap.exists()) {
          const data = adminDocSnap.data();
          allowedDay = data.allowedDay;
          allowedStartTime = data.allowedStartTime;
          allowedEndTime = data.allowedEndTime;
        }
      }
      // Enforce allowed schedule if set
      if (allowedDay && allowedStartTime && allowedEndTime) {
        const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const today = daysOfWeek[now.getDay()];
        const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
        // Calculate time boundaries
        const [startHour, startMin] = allowedStartTime.split(':').map(Number);
        const [endHour, endMin] = allowedEndTime.split(':').map(Number);
        const startDate = new Date(now);
        startDate.setHours(startHour, startMin, 0, 0);
        const endDate = new Date(now);
        endDate.setHours(endHour, endMin, 0, 0);
        const endDateWithGrace = new Date(now);
        endDateWithGrace.setHours(endHour, endMin + 5, 0, 0); // 5 min late
        const nowDate = new Date(now);
        if (today !== allowedDay) {
          setAlertMessage(`You are only allowed to clock out on ${allowedDay}.`);
          setAlertType('error');
          setAlertOpen(true);
          setIsClockOutLoading(false);
          return;
        }
        if (nowDate < startDate) {
          setAlertMessage(`You can only clock out after ${allowedStartTime}. Current time: ${currentTime}`);
          setAlertType('error');
          setAlertOpen(true);
          setIsClockOutLoading(false);
          return;
        }
      }
      // Determine OUTstatus
      let OUTstatus = '';
      if (allowedDay && allowedStartTime && allowedEndTime) {
        const [endHour, endMin] = allowedEndTime.split(':').map(Number);
        const endDate = new Date(now);
        endDate.setHours(endHour, endMin, 0, 0);
        const endDateWithGrace = new Date(now);
        endDateWithGrace.setHours(endHour, endMin + 5, 0, 0);
        if (now > endDateWithGrace) {
          OUTstatus = 'Missed';
        } else if (now > endDate) {
          OUTstatus = 'Late out';
        }
      }
      
      // Create timestamp for clock out
      const clockOutTimestamp = serverTimestamp();
      
      // Get today's date as string
      const today = new Date().toISOString().split('T')[0];

      // Update the clocklog document
      const userDocRef = doc(db, 'users', userUid);
      const clocklogDocRef = doc(userDocRef, 'clocklog', currentClockInId);
      
      await setDoc(clocklogDocRef, {
        clockOut: clockOutTimestamp,
        OUTstatus // Save OUTstatus
      }, { merge: true });

      // Remove clock in status from localStorage
      // localStorage.removeItem(`clockIn_${userUid}_${today}`);

      setIsClockedIn(false);
      setCurrentClockInId(null);
      
      console.log('Clocked out successfully');
    } catch (error) {
      console.error('Error clocking out:', error);
      setAlertMessage(`Clock out failed: ${error.message}`);
      setAlertType('error');
      setAlertOpen(true);
    } finally {
      setIsClockOutLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    router.push('/');
  };

  const handleSauceNAOClick = () => {
    setShowSauceNAOModal(true);
    setImageUrl('');
    setSauceNAOResults(null);
  };

  const handleQRCodeClick = () => {
    setShowQRCodeModal(true);
  };

  const handleSauceNAOSearch = async () => {
    if (!imageUrl) return;
    setIsSearching(true);
    try {
      const response = await fetch('/api/saucenao/url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageUrl })
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setSauceNAOResults(data);
    } catch (error) {
      console.error('SauceNAO search error:', error);
      setSauceNAOResults({ error: error.message });
    } finally {
      setIsSearching(false);
    }
  };

  const closeModal = () => {
    setShowSauceNAOModal(false);
    setImageUrl('');
    setSauceNAOResults(null);
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
              <p className="text-xs text-gray-600 mt-1 text-center">User Dashboard</p>
            </div>
            <div className="flex-shrink-0">
              <Navigation
                userName={userName}
                onLogout={handleLogout}
                onSauceNAOClick={handleSauceNAOClick}
                onQRCodeClick={handleQRCodeClick}
                currentPage="log"
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
                <p className="text-sm text-gray-600">User Dashboard</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 md:space-x-4 animate-slide-in-right">
              <span className="text-sm text-gray-600 hidden md:block">
                Welcome, <span className="font-semibold text-[#14206e]">{userName || 'User'}</span>
              </span>
              <Navigation
                userName={userName}
                onLogout={handleLogout}
                onSauceNAOClick={handleSauceNAOClick}
                onQRCodeClick={handleQRCodeClick}
                currentPage="log"
              />
            </div>
          </div>
        </div>
      </header>
      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-2 py-6 sm:px-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Real-time Clock */}
            <div className="bg-white shadow-lg rounded-2xl p-8 hover-lift animate-fade-in flex flex-col items-center">
              <h2 className="text-2xl font-bold text-[#14206e] mb-6 flex items-center">
                <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                Philippines Time
              </h2>
              <div className="text-6xl font-mono text-center text-[#14206e] animate-pulse-custom">
                {currentTime}
              </div>
              <p className="text-center text-gray-500 mt-4">Real-time</p>
            </div>
            {/* Status Info */}
            <div className="bg-white shadow-lg rounded-2xl p-8 hover-lift animate-fade-in">
              <h3 className="text-lg font-medium text-[#14206e] mb-6 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                Today's Status
              </h3>
              <div className="grid grid-cols-1 gap-6">
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200 hover-lift">
                  <h4 className="font-medium text-[#14206e] flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    Current Status
                  </h4>
                  <p className="text-[#14206e] text-sm mt-2">
                    {isClockedIn ? 'Active - Clocked In' : 'Inactive - Not Clocked In'}
                  </p>
                </div>
                <div className="bg-gradient-to-r from-green-50 to-green-100 p-6 rounded-xl border border-green-200 hover-lift">
                  <h4 className="font-medium text-[#14206e] flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    Session
                  </h4>
                  <p className="text-[#14206e] text-sm mt-2">
                    {isClockedIn ? 'Active session in progress' : 'No active session'}
                  </p>
                </div>
                {missedSchedulesCount > 0 && (
                  <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 p-6 rounded-xl border border-yellow-200 hover-lift">
                    <h4 className="font-medium text-[#14206e] flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                      </svg>
                    Missed Schedules
                  </h4>
                  <p className="text-[#14206e] text-sm mt-2">
                    {missedSchedulesCount} missed schedule{missedSchedulesCount > 1 ? 's' : ''} auto-logged
                  </p>
                </div>
                )}
              </div>
            </div>
            {/* Clock In/Out Section */}
            <div className="bg-white shadow-lg rounded-2xl p-8 hover-lift animate-fade-in flex flex-col items-center md:col-span-2">
              <h2 className="text-xl font-semibold text-[#14206e] mb-6 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                Time Clock
              </h2>
              <div className="flex flex-col w-full items-center space-y-4">
                {!isClockedIn ? (
                  <button
                    onClick={handleClockIn}
                    disabled={isClockInLoading}
                    className="bg-[#14206e] hover:bg-[#1a2a8a] text-white w-full max-w-xs py-4 rounded-xl text-lg font-medium transition-all duration-200 hover-lift hover-scale flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isClockInLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Clocking In...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                        </svg>
                        Clock In
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={handleClockOut}
                    disabled={isClockOutLoading}
                    className="bg-red-600 hover:bg-red-700 text-white w-full max-w-xs py-4 rounded-xl text-lg font-medium transition-all duration-200 hover-lift hover-scale flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isClockOutLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Clocking Out...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                        Clock Out
                      </>
                    )}
                  </button>
                )}
                <div className="mt-4 text-center w-full">
                  <p className={`text-lg font-medium flex items-center justify-center ${isClockedIn ? 'text-green-600' : 'text-gray-500'}`}>
                    <span className={`w-3 h-3 rounded-full mr-2 ${isClockedIn ? 'bg-green-500 animate-pulse-custom' : 'bg-gray-400'}`}></span>
                  {isClockInLoading ? 'Clocking In...' : isClockOutLoading ? 'Clocking Out...' : isClockedIn ? 'Currently Clocked In' : 'Not Clocked In'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      {/* SauceNAO Modal */}
      {showSauceNAOModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-8 max-w-full w-full sm:max-w-2xl mx-2 sm:mx-4 max-h-[95vh] overflow-y-auto">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
              <h2 className="text-xl sm:text-2xl font-bold text-[#14206e] flex items-center">
                <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
                SauceNAO Image Search
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 transition-colors self-end sm:self-auto"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Image URL
              </label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14206e] focus:border-[#14206e] transition-all duration-200 text-base"
                style={{ color: '#14206e' }}
              />
            </div>
            {imageUrl && (
              <div className="mb-6">
                <button
                  onClick={handleSauceNAOSearch}
                  disabled={isSearching}
                  className="w-full bg-[#14206e] hover:bg-[#1a2a8a] text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 hover-lift disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-base sm:text-lg"
                >
                  {isSearching ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Searching...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                      </svg>
                      Search SauceNAO
                    </>
                  )}
                </button>
              </div>
            )}
            {sauceNAOResults && (
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-[#14206e] mb-4">Search Results</h3>
                {sauceNAOResults.error ? (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-600">Error: {sauceNAOResults.error}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Summary Section */}
                    {sauceNAOResults.results && sauceNAOResults.results.length > 0 && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                        <h4 className="font-semibold text-[#14206e] mb-2">📺 Episode & Series Summary</h4>
                        {(() => {
                          const bestResult = sauceNAOResults.results[0];
                          const data = bestResult.data;
                          return (
                            <div className="space-y-1">
                              {data.source && (
                                <p className="text-sm font-medium" style={{ color: '#14206e' }}>
                                  <span className="font-bold">Series:</span> {data.source}
                                </p>
                              )}
                              {data.title && (
                                <p className="text-sm font-medium" style={{ color: '#14206e' }}>
                                  <span className="font-bold">Title:</span> {data.title}
                                </p>
                              )}
                              {(data.part || data.episode) && (
                                <p className="text-sm font-medium" style={{ color: '#14206e' }}>
                                  <span className="font-bold">Episode:</span> {data.part || data.episode}
                                </p>
                              )}
                              {data.character && (
                                <p className="text-sm font-medium" style={{ color: '#14206e' }}>
                                  <span className="font-bold">Character:</span> {data.character}
                                </p>
                              )}
                              {data.year && (
                                <p className="text-sm font-medium" style={{ color: '#14206e' }}>
                                  <span className="font-bold">Year:</span> {data.year}
                                </p>
                              )}
                              <p className="text-xs mt-2" style={{ color: '#14206e' }}>
                                Confidence: {bestResult.header.similarity}% | Source: {bestResult.header.index_name}
                              </p>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                    
                    {/* Detailed Results */}
                    {sauceNAOResults.results && sauceNAOResults.results.length > 0 ? (
                      sauceNAOResults.results.slice(0, 8).map((result, index) => (
                        <div key={index} className="bg-gray-50 rounded-lg p-4 hover-lift flex flex-col sm:flex-row items-center gap-4 w-full">
                          {result.header.thumbnail && (
                            <img
                              src={result.header.thumbnail}
                              alt="Result thumbnail"
                              className="w-20 h-20 sm:w-16 sm:h-16 object-cover rounded mb-2 sm:mb-0 flex-shrink-0"
                              style={{ maxWidth: '100%', height: 'auto' }}
                            />
                          )}
                          <div className="flex-1 w-full">
                            <h4 className="font-medium text-[#14206e] text-base sm:text-lg truncate">
                              {result.header.index_name || 'Unknown Source'}
                            </h4>
                            <p className="text-sm text-gray-600 mt-1">
                              Similarity: {result.header.similarity}%
                            </p>
                            {/* Series/Anime Information */}
                            {result.data && result.data.source && (
                              <p className="text-sm text-[#14206e] mt-1 font-semibold truncate">
                                Series: {result.data.source}
                              </p>
                            )}
                            {result.data && result.data.title && (
                              <p className="text-sm text-[#14206e] mt-1 truncate">
                                Title: {result.data.title}
                              </p>
                            )}
                            {/* Episode Information */}
                            {result.data && result.data.part && (
                              <p className="text-sm text-blue-600 font-medium mt-1 truncate">
                                Episode: {result.data.part}
                              </p>
                            )}
                            {result.data && result.data.episode && (
                              <p className="text-sm text-blue-600 font-medium mt-1 truncate">
                                Episode: {result.data.episode}
                              </p>
                            )}
                            {/* Movie Information */}
                            {result.data && result.data.year && (
                              <p className="text-sm text-green-600 font-medium mt-1 truncate">
                                Year: {result.data.year}
                              </p>
                            )}
                            {/* Character Information */}
                            {result.data && result.data.character && (
                              <p className="text-sm text-purple-600 font-medium mt-1 truncate">
                                Character: {result.data.character}
                              </p>
                            )}
                            {/* Artist Information */}
                            {result.data && result.data.author && (
                              <p className="text-sm text-gray-700 truncate">
                                Artist: {result.data.author}
                              </p>
                            )}
                            {result.data && result.data.creator && (
                              <p className="text-sm text-gray-700 truncate">
                                Creator: {result.data.creator}
                              </p>
                            )}
                            {/* Additional Details */}
                            {result.data && result.data.material && (
                              <p className="text-sm text-gray-600 mt-1 truncate">
                                Material: {result.data.material}
                              </p>
                            )}
                            {result.data && result.data.characters && (
                              <p className="text-sm text-gray-600 mt-1 truncate">
                                Characters: {result.data.characters}
                              </p>
                            )}
                            {/* Source Link */}
                            {result.data && result.data.ext_urls && result.data.ext_urls.length > 0 && (
                              <a
                                href={result.data.ext_urls[0]}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-[#14206e] hover:underline mt-2 inline-block break-all"
                              >
                                View Source →
                              </a>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <p className="text-yellow-700">No results found for this image.</p>
                        {sauceNAOResults.status && (
                          <p className="text-sm text-gray-600 mt-2">
                            Status: {sauceNAOResults.status} - {sauceNAOResults.status_message || 'Unknown error'}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      <ModalAlert
        open={alertOpen}
        message={alertMessage}
        type={alertType}
        onClose={() => {
          setAlertOpen(false);
          if (alertType === 'info' && missedSchedulesCount > 0) {
            setMissedSchedulesCount(0);
          }
        }}
      />
      <QRCodeModal
        isOpen={showQRCodeModal}
        onClose={() => setShowQRCodeModal(false)}
      />
    </div>
  );
}
