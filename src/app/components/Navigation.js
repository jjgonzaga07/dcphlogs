'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Navigation({ 
  userName, 
  onLogout, 
  onSauceNAOClick, 
  onQRCodeClick, 
  onBackToLog,
  onShowCharts,
  onViewUsers,
  admin = false,
  showCharts,
  currentPage = 'log' 
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const router = useRouter();
  const menuRef = useRef(null);
  const buttonRef = useRef(null);

  // Detect mobile screen
  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth < 768);
    }
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close menu when clicking outside (desktop only)
  useEffect(() => {
    if (!isMenuOpen || isMobile) return;
    function handleClickOutside(event) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen, isMobile]);

  const getNavigationItems = () => {
    if (admin && currentPage === 'admin-users') {
      return [
        {
          name: 'Back to Dashboard',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
            </svg>
          ),
          action: () => {
            if (onBackToLog) onBackToLog();
            setIsMenuOpen(false);
          },
        },
      ];
    }
    if (admin) {
      return [
        {
          name: showCharts ? 'Hide Charts' : 'Show Charts',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
            </svg>
          ),
          action: () => {
            if (onShowCharts) onShowCharts();
            setIsMenuOpen(false);
          },
        },
        {
          name: 'View Users',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m9-4a4 4 0 11-8 0 4 4 0 018 0z"></path>
            </svg>
          ),
          action: () => {
            if (onViewUsers) onViewUsers();
            setIsMenuOpen(false);
          },
        },
      ];
    }
    if (currentPage === 'attendance') {
      return [
        {
          name: 'Back to Log',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
            </svg>
          ),
          action: () => {
            if (onBackToLog) {
              onBackToLog();
            } else {
              router.push('/log');
            }
            setIsMenuOpen(false);
          },
          isModal: false
        }
      ];
    }
    return [
      {
        name: 'SauceNAO',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
        ),
        action: () => {
          if (onSauceNAOClick) {
            onSauceNAOClick();
          }
          setIsMenuOpen(false);
        },
        isModal: true
      },
      {
        name: 'QR Code',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"></path>
          </svg>
        ),
        action: () => {
          if (onQRCodeClick) {
            onQRCodeClick();
          }
          setIsMenuOpen(false);
        },
        isModal: true
      },
      {
        name: 'Attendance History',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>
          </svg>
        ),
        action: () => {
          router.push('/attendance');
          setIsMenuOpen(false);
        },
        isModal: false
      }
    ];
  };

  const navigationItems = getNavigationItems();

  return (
    <div className="relative inline-block text-left">
      {/* Hamburger Menu Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsMenuOpen((open) => !open)}
        className="bg-[#14206e] hover:bg-[#1a2a8a] text-white p-2 rounded-lg transition-all duration-200 hover-lift flex items-center"
        aria-label="Toggle navigation menu"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
        </svg>
      </button>

      {/* Mobile Modal Menu */}
      {isMenuOpen && isMobile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Blurred background */}
          <div className="absolute inset-0 bg-transparent backdrop-blur-md" onClick={() => setIsMenuOpen(false)} />
          {/* Modal card */}
          <div ref={menuRef} className="relative bg-white rounded-2xl shadow-2xl w-11/12 max-w-xs mx-auto animate-fade-in">
            <button
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
              onClick={() => setIsMenuOpen(false)}
              aria-label="Close menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
            <div className="px-6 pt-6 pb-2 border-b border-gray-100 text-center">
              <span className="text-base text-gray-600">
                Welcome, <span className="font-semibold text-[#14206e]">{userName || 'User'}</span>
              </span>
            </div>
            <div className="py-2">
              {navigationItems.map((item, index) => (
                <button
                  key={index}
                  onClick={item.action}
                  className="w-full flex items-center px-6 py-4 text-base text-gray-800 hover:bg-[#e6eaff] rounded-lg transition-colors duration-150"
                  style={{ minHeight: '48px' }}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.name}
                </button>
              ))}
            </div>
            <div className="border-t border-gray-100">
              <button
                onClick={() => { setIsMenuOpen(false); onLogout && onLogout(); }}
                className="w-full flex items-center px-6 py-4 text-base text-red-600 hover:bg-red-50 rounded-b-2xl transition-colors duration-150"
                style={{ minHeight: '48px' }}
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Pop-out Menu */}
      {isMenuOpen && !isMobile && (
        <div
          ref={menuRef}
          className="absolute right-0 mt-2 w-64 max-w-xs sm:w-56 sm:max-w-sm md:w-56 md:max-w-sm origin-top-right bg-white border border-gray-200 rounded-xl shadow-lg z-50 animate-fade-in"
          style={{ minWidth: '12rem' }}
        >
          {/* Greeting for mobile only */}
          <div className="block md:hidden px-4 pt-4 pb-2 border-b border-gray-100">
            <span className="text-sm text-gray-600">
              Welcome, <span className="font-semibold text-[#14206e]">{userName || 'User'}</span>
            </span>
          </div>
          <div className="py-2">
            {navigationItems.map((item, index) => (
              <button
                key={index}
                onClick={item.action}
                className="w-full flex items-center px-4 py-3 text-base text-gray-800 hover:bg-[#e6eaff] rounded-lg transition-colors duration-150"
                style={{ minHeight: '48px' }}
              >
                <span className="mr-2">{item.icon}</span>
                {item.name}
              </button>
            ))}
          </div>
          <div className="border-t border-gray-100">
            <button
              onClick={() => { setIsMenuOpen(false); onLogout && onLogout(); }}
              className="w-full flex items-center px-4 py-3 text-base text-red-600 hover:bg-red-50 rounded-b-xl transition-colors duration-150"
              style={{ minHeight: '48px' }}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 