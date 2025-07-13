'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '../../configs/firebaseConfigs';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

export default function LoginForm() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      // Firebase Auth
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
          // Update admin document with last login
          await setDoc(doc(db, 'admin', user.uid), {
            lastLogin: lastLoginTimestamp
          }, { merge: true });
        } else {
          // Update user document with last login
          await setDoc(doc(db, 'users', user.uid), {
            lastLogin: lastLoginTimestamp
          }, { merge: true });
        }
      } catch (error) {
        console.error('Error updating last login:', error);
        // Don't fail the login if last login update fails
      }
      
      // Store user info in localStorage
      localStorage.setItem('user', JSON.stringify({
        email: user.email,
        uid: user.uid,
        type,
        isAuthenticated: true
      }));
      // Show success modal
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white to-[#e6eaff] px-4 py-8">
      <div className="w-full max-w-md mx-auto bg-white rounded-2xl shadow-2xl p-8 md:p-10 animate-fade-in">
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 mb-4 hover-scale">
            <img 
              src="/images/logo.PNG" 
              alt="DCPH Logo" 
              className="w-full h-full object-contain rounded-full border-2 border-[#14206e] shadow-md"
            />
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-[#14206e] text-center mb-2">Sign in to your account</h2>
          <p className="text-center text-base text-gray-600">Welcome back! Please enter your credentials.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-[#14206e] mb-2">Email address</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="block w-full px-4 py-3 border border-gray-300 rounded-lg text-[#14206e] placeholder-[#14206e] bg-white focus:outline-none focus:ring-2 focus:ring-[#14206e] focus:border-[#14206e] transition-all duration-200 text-base"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleInputChange}
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-[#14206e] mb-2">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="block w-full px-4 py-3 border border-gray-300 rounded-lg text-[#14206e] placeholder-[#14206e] bg-white focus:outline-none focus:ring-2 focus:ring-[#14206e] focus:border-[#14206e] transition-all duration-200 text-base"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleInputChange}
            />
          </div>
          {error && (
            <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-lg border border-red-200 animate-fade-in">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center items-center py-3 px-4 border border-transparent text-base font-semibold rounded-lg text-white bg-[#14206e] hover:bg-[#1a2a8a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#14206e] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover-lift mt-2"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Signing in...
              </>
            ) : (
              'Sign in'
            )}
          </button>
        </form>
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
            <p className="text-gray-700 text-center mb-6">Please wait for us to redirect you to the dashboard.</p>
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14206e]"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 