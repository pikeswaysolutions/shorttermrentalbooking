import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import * as FiIcons from 'react-icons/fi';
import { AnimatePresence, motion } from 'framer-motion';
import SafeIcon from '../../common/SafeIcon';
import { cn } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';

const morePaths = [
  '/admin/properties',
  '/admin/users',
];

const MobileNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin: isAuthenticated, logout } = useAuth();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const [moreOpen, setMoreOpen] = useState(false);

  const closeMore = useCallback(() => setMoreOpen(false), []);

  useEffect(() => {
    closeMore();
  }, [location.pathname, closeMore]);

  useEffect(() => {
    if (moreOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [moreOpen]);

  const isEmbedRoute = location.pathname === '/widget' || location.pathname === '/calendar' || location.pathname === '/booking';
  if (isEmbedRoute) return null;

  const userLinks = [
    { path: '/', icon: FiIcons.FiHome, label: 'Home' },
    { path: '/booking', icon: FiIcons.FiCalendar, label: 'Book' },
    { path: isAuthenticated ? '/admin/dashboard' : '/admin/login', icon: FiIcons.FiUser, label: 'Admin' },
  ];

  const adminLinks = [
    { path: '/admin/dashboard', icon: FiIcons.FiGrid, label: 'Dashboard' },
    { path: '/admin/bookings', icon: FiIcons.FiInbox, label: 'Requests' },
    { path: '/admin/calendar', icon: FiIcons.FiCalendar, label: 'Calendar' },
    { path: '/admin/settings', icon: FiIcons.FiSettings, label: 'Settings' },
  ];

  const moreLinks = [
    { path: '/admin/properties', icon: FiIcons.FiTag, label: 'Properties' },
    { path: '/admin/users', icon: FiIcons.FiUsers, label: 'Team' },
  ];

  const links = isAdminRoute ? adminLinks : userLinks;
  const isMoreActive = isAdminRoute && morePaths.includes(location.pathname);

  const handleLogout = async () => {
    closeMore();
    await logout();
    navigate('/');
  };

  return (
    <>
      <AnimatePresence>
        {moreOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden fixed inset-0 bg-black/50 z-[60]"
              onClick={closeMore}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 400 }}
              className="md:hidden fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-[70] shadow-2xl"
              style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 80px)' }}
            >
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 bg-gray-300 rounded-full" />
              </div>

              <div className="px-4 pb-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-2">
                  More Options
                </p>
                <div className="space-y-1">
                  {moreLinks.map((link) => (
                    <Link
                      key={link.path}
                      to={link.path}
                      className={cn(
                        'flex items-center gap-4 px-3 py-3.5 rounded-xl text-sm font-medium transition-colors',
                        location.pathname === link.path
                          ? 'bg-blue-50 text-primary'
                          : 'text-gray-700 active:bg-gray-100'
                      )}
                    >
                      <SafeIcon icon={link.icon} className="text-lg" />
                      <span>{link.label}</span>
                    </Link>
                  ))}
                </div>

                <div className="border-t border-gray-200 my-3" />

                <div className="space-y-1">
                  <Link
                    to="/"
                    className="flex items-center gap-4 px-3 py-3.5 rounded-xl text-sm font-medium text-gray-700 active:bg-gray-100 transition-colors"
                  >
                    <SafeIcon icon={FiIcons.FiArrowLeft} className="text-lg" />
                    <span>Exit Admin</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-4 px-3 py-3.5 rounded-xl text-sm font-medium text-red-600 active:bg-red-50 transition-colors w-full"
                  >
                    <SafeIcon icon={FiIcons.FiLogOut} className="text-lg" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-[80] shadow-lg"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex justify-around items-center h-16">
          {links.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full text-xs font-medium transition-colors',
                location.pathname === link.path
                  ? 'text-primary bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              )}
            >
              <SafeIcon icon={link.icon} className="text-xl mb-1" />
              <span>{link.label}</span>
            </Link>
          ))}
          {isAdminRoute && (
            <button
              onClick={() => setMoreOpen((prev) => !prev)}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full text-xs font-medium transition-colors',
                isMoreActive || moreOpen
                  ? 'text-primary bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              )}
            >
              <SafeIcon icon={FiIcons.FiMoreHorizontal} className="text-xl mb-1" />
              <span>More</span>
            </button>
          )}
        </div>
      </nav>
    </>
  );
};

export default MobileNav;
