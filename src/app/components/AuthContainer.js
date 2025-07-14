'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '../../configs/firebaseConfigs';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

export default function AuthContainer() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const router = useRouter();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;
      
      // Try to get user type from 'admin' collection
      let type = null;
      let userDocSnap = await getDoc(doc(db, 'admin', user.uid));
      let isAdmin = false;
      
      if (userDocSnap.exists()) {
        const data = userDocSnap.data();
        type = data.type || 'admin';
        isAdmin = true;
      } else {
        userDocSnap = await getDoc(doc(db, 'users', user.uid));
        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          type = data.type || 'user';
        }
      }
      
      if (!type) {
        setError('Account type not found. Please contact support.');
        setIsLoading(false);
        return;
      }
      
      // Update last login timestamp
      try {
        const lastLoginTimestamp = serverTimestamp();
        if (isAdmin) {
          await setDoc(doc(db, 'admin', user.uid), {
            lastLogin: lastLoginTimestamp
          }, { merge: true });
        } else {
          await setDoc(doc(db, 'users', user.uid), {
            lastLogin: lastLoginTimestamp
          }, { merge: true });
        }
      } catch (error) {
        console.error('Error updating last login:', error);
      }
      
      // Store user info in localStorage
      localStorage.setItem('user', JSON.stringify({
        email: user.email,
        uid: user.uid,
        type,
        isAuthenticated: true
      }));
      
      setShowSuccessModal(true);
      setTimeout(() => {
        setShowSuccessModal(false);
        if (type === 'admin') {
          router.push('/admin');
        } else {
          router.push('/log');
        }
      }, 2000);
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        setError('No account found with this email address.');
      } else if (err.code === 'auth/wrong-password') {
        setError('Incorrect password.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Invalid email address.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Please try again later.');
      } else {
        setError(`Login failed: ${err.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (!formData.name.trim()) {
      setError('Name is required.');
      return;
    }

    setIsLoading(true);
    try {
      // Create user with Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;
      
      // Create user document in Firestore
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, {
        name: formData.name.trim(),
        email: formData.email,
        type: 'user',
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp()
      });
      
      // Store user info in localStorage
      localStorage.setItem('user', JSON.stringify({
        email: user.email,
        uid: user.uid,
        type: 'user',
        isAuthenticated: true
      }));

      setShowSuccessModal(true);
      setTimeout(() => {
        setShowSuccessModal(false);
        router.push('/log');
      }, 2000);
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Invalid email address.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password is too weak. Please choose a stronger password.');
      } else {
        setError(`Registration failed: ${err.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e) => {
    if (isLogin) {
      handleLogin(e);
    } else {
      handleRegister(e);
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-gradient-to-br from-white to-[#e6eaff] px-4">
      <div className="w-full max-w-md mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden animate-fade-in border border-gray-100 max-h-[95vh]">
        {/* Header with Logo */}
        <div className={`${isLogin ? 'p-8' : 'p-6'} bg-gradient-to-r from-[#14206e] to-[#1a2a8a] text-center relative overflow-hidden`}>
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20"></div>
          <div className="relative z-10">
            <div className={`${isLogin ? 'w-20 h-20 mb-4' : 'w-16 h-16 mb-3'} mx-auto hover-scale`}>
              <img 
                src="/images/logo.PNG" 
                alt="DCPH Logo" 
                className="w-full h-full object-contain rounded-full border-2 border-white shadow-lg"
              />
            </div>
            <h1 className={`${isLogin ? 'text-2xl mb-2' : 'text-xl mb-1'} font-bold text-white`}>DCPH: Anime and Manga</h1>
            <p className={`${isLogin ? 'text-sm' : 'text-xs'} text-blue-100`}>Welcome to your dashboard</p>
          </div>
        </div>

        {/* Form Container */}
        <div className={`${isLogin ? 'p-8' : 'p-6'} bg-white overflow-y-auto`}>
          <div className={`${isLogin ? 'mb-6' : 'mb-4'} flex flex-col items-center`}>
            <h2 className={`${isLogin ? 'text-2xl mb-2' : 'text-xl mb-1'} font-bold text-[#14206e] text-center`}>
              {isLogin ? 'Welcome Back!' : 'Create Account'}
            </h2>
            <p className={`${isLogin ? 'text-sm' : 'text-xs'} text-center text-gray-600`}>
              {isLogin ? 'Sign in to continue to your dashboard' : 'Join DCPH: Anime and Manga'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className={`${isLogin ? 'space-y-5' : 'space-y-4'}`}>
            {/* Name field - only show for registration */}
            {!isLogin && (
              <div className="space-y-1">
                <label htmlFor="name" className="block text-xs font-semibold text-[#14206e] mb-1 flex items-center">
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                  </svg>
                  Full Name
                </label>
                <div className="relative">
                  <input
                    id="name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    required={!isLogin}
                    className="block w-full px-3 py-3 pl-10 border-2 border-gray-200 rounded-lg text-[#14206e] placeholder-gray-400 bg-white focus:outline-none focus:ring-4 focus:ring-[#14206e]/20 focus:border-[#14206e] transition-all duration-300 text-sm shadow-sm hover:border-gray-300"
                    placeholder="Enter your full name"
                    value={formData.name}
                    onChange={handleInputChange}
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                    </svg>
                  </div>
                </div>
              </div>
            )}

            {/* Email field */}
            <div className={`${isLogin ? 'space-y-2' : 'space-y-1'}`}>
              <label htmlFor="email" className={`block ${isLogin ? 'text-sm mb-2' : 'text-xs mb-1'} font-semibold text-[#14206e] flex items-center`}>
                <svg className={`${isLogin ? 'w-4 h-4 mr-2' : 'w-3 h-3 mr-1'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"></path>
                </svg>
                Email address
              </label>
              <div className="relative">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className={`block w-full ${isLogin ? 'px-4 py-4 pl-12 text-base' : 'px-3 py-3 pl-10 text-sm'} border-2 border-gray-200 ${isLogin ? 'rounded-xl' : 'rounded-lg'} text-[#14206e] placeholder-gray-400 bg-white focus:outline-none focus:ring-4 focus:ring-[#14206e]/20 focus:border-[#14206e] transition-all duration-300 shadow-sm hover:border-gray-300`}
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleInputChange}
                />
                <div className={`absolute inset-y-0 left-0 ${isLogin ? 'pl-4' : 'pl-3'} flex items-center pointer-events-none`}>
                  <svg className={`${isLogin ? 'w-5 h-5' : 'w-4 h-4'} text-gray-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"></path>
                  </svg>
                </div>
              </div>
            </div>

            {/* Password field */}
            <div className={`${isLogin ? 'space-y-2' : 'space-y-1'}`}>
              <label htmlFor="password" className={`block ${isLogin ? 'text-sm mb-2' : 'text-xs mb-1'} font-semibold text-[#14206e] flex items-center`}>
                <svg className={`${isLogin ? 'w-4 h-4 mr-2' : 'w-3 h-3 mr-1'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                </svg>
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  required
                  className={`block w-full ${isLogin ? 'px-4 py-4 pl-12 text-base' : 'px-3 py-3 pl-10 text-sm'} border-2 border-gray-200 ${isLogin ? 'rounded-xl' : 'rounded-lg'} text-[#14206e] placeholder-gray-400 bg-white focus:outline-none focus:ring-4 focus:ring-[#14206e]/20 focus:border-[#14206e] transition-all duration-300 shadow-sm hover:border-gray-300`}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleInputChange}
                />
                <div className={`absolute inset-y-0 left-0 ${isLogin ? 'pl-4' : 'pl-3'} flex items-center pointer-events-none`}>
                  <svg className={`${isLogin ? 'w-5 h-5' : 'w-4 h-4'} text-gray-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                  </svg>
                </div>
              </div>
            </div>

            {/* Confirm Password field - only show for registration */}
            {!isLogin && (
              <div className="space-y-1">
                <label htmlFor="confirmPassword" className="block text-xs font-semibold text-[#14206e] mb-1 flex items-center">
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    required={!isLogin}
                    className="block w-full px-3 py-3 pl-10 border-2 border-gray-200 rounded-lg text-[#14206e] placeholder-gray-400 bg-white focus:outline-none focus:ring-4 focus:ring-[#14206e]/20 focus:border-[#14206e] transition-all duration-300 text-sm shadow-sm hover:border-gray-300"
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                  </div>
                </div>
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className={`text-red-600 ${isLogin ? 'text-sm p-4' : 'text-xs p-3'} text-center bg-red-50 ${isLogin ? 'rounded-xl' : 'rounded-lg'} border border-red-200 animate-fade-in flex items-center justify-center`}>
                <svg className={`${isLogin ? 'w-5 h-5 mr-2' : 'w-4 h-4 mr-1'} flex-shrink-0`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                {error}
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full flex justify-center items-center ${isLogin ? 'py-4 px-6 text-base' : 'py-3 px-4 text-sm'} border border-transparent font-semibold ${isLogin ? 'rounded-xl' : 'rounded-lg'} text-white bg-gradient-to-r from-[#14206e] to-[#1a2a8a] hover:from-[#1a2a8a] hover:to-[#14206e] focus:outline-none focus:ring-4 focus:ring-[#14206e]/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover-lift ${isLogin ? 'mt-4' : 'mt-3'} shadow-lg hover:shadow-xl`}
            >
              {isLoading ? (
                <>
                  <svg className={`animate-spin -ml-1 ${isLogin ? 'mr-3 h-5 w-5' : 'mr-2 h-4 w-4'} text-white`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {isLogin ? 'Signing in...' : 'Creating account...'}
                </>
              ) : (
                <>
                  <svg className={`${isLogin ? 'w-5 h-5 mr-2' : 'w-4 h-4 mr-1'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={isLogin ? "M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" : "M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"}></path>
                  </svg>
                  {isLogin ? 'Sign in' : 'Create account'}
                </>
              )}
            </button>

            {/* Toggle between login and register */}
            <div className={`text-center ${isLogin ? 'mt-6' : 'mt-4'}`}>
              <p className={`${isLogin ? 'text-sm' : 'text-xs'} text-gray-600`}>
                {isLogin ? "Don't have an account? " : "Already have an account? "}
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setError('');
                    setFormData({ name: '', email: '', password: '', confirmPassword: '' });
                  }}
                  className="text-[#14206e] hover:text-[#1a2a8a] font-semibold transition-colors duration-200"
                >
                  {isLogin ? 'Register here' : 'Sign in here'}
                </button>
              </p>
            </div>
          </form>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center h-full w-full z-50 animate-fade-in">
          <div className="flex flex-col items-center justify-center bg-white rounded-xl shadow-lg p-10 animate-slide-in-left">
            <div className="w-24 h-24 mb-6">
              <img 
                src="/images/logo.PNG" 
                alt="DCPH Logo" 
                className="w-full h-full object-contain"
              />
            </div>
            <h2 className="text-2xl font-bold text-[#14206e] mb-2 text-center">DCPH: Anime and Manga</h2>
            <p className="text-gray-700 text-center mb-6">
              {isLogin ? 'Please wait for us to redirect you to the dashboard.' : 'Account created successfully! Redirecting to dashboard...'}
            </p>
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14206e]"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 