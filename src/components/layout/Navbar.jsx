import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';
import { cn } from '../../lib/utils';
import { useStore } from '../../context/StoreContext';
import { useAuth } from '../../context/AuthContext';

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { settings } = useStore();
  const { isAdmin, logout } = useAuth();
  const isAdminRoute = location.pathname.startsWith('/admin');

  const isEmbedRoute = location.pathname === '/widget' || location.pathname === '/calendar' || location.pathname === '/booking';
  if (isEmbedRoute) return null;

  const userLinks = [
    { path: '/', label: 'Home' },
    { path: '/booking', label: 'Book Event' },
  ];

  const adminLinks = [
    { path: '/admin/dashboard', icon: FiIcons.FiGrid, label: 'Dashboard' },
    { path: '/admin/bookings', icon: FiIcons.FiInbox, label: 'Requests' },
    { path: '/admin/calendar', icon: FiIcons.FiCalendar, label: 'Calendar' },
    { path: '/admin/event-types', icon: FiIcons.FiTag, label: 'Event Types' },
    { path: '/admin/pricing-rules', icon: FiIcons.FiDollarSign, label: 'Pricing' },
    { path: '/admin/addons', icon: FiIcons.FiPackage, label: 'Add-ons' },
    { path: '/admin/settings', icon: FiIcons.FiSettings, label: 'Settings' },
    { path: '/admin/users', icon: FiIcons.FiUsers, label: 'Team' },
  ];

  const links = isAdminRoute ? adminLinks : userLinks;

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 hidden md:block shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0 flex items-center gap-3">
              {settings.logo ? (
                <img
                  src={settings.logo}
                  alt={settings.companyName || 'Logo'}
                  className="h-10 w-auto object-contain"
                />
              ) : (
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white">
                  <SafeIcon icon={FiIcons.FiCalendar} className="text-lg" />
                </div>
              )}
              <span className="font-bold text-xl tracking-tight text-gray-900">
                {settings.companyName || 'Luxe Events'}
              </span>
            </Link>

            <div className="hidden md:ml-10 md:flex md:space-x-1">
              {links.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={cn(
                    "inline-flex items-center px-3 py-2 border-b-2 text-sm font-medium transition-colors duration-200 rounded-t-lg",
                    location.pathname === link.path
                      ? "border-primary text-gray-900 bg-blue-50"
                      : "border-transparent text-gray-600 hover:border-gray-300 hover:text-gray-900 hover:bg-gray-50"
                  )}
                >
                  {link.icon && <SafeIcon icon={link.icon} className="mr-2 text-base" />}
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isAdminRoute && !isAdmin && (
              <Link to="/admin/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-50">
                Admin Login
              </Link>
            )}
            {!isAdminRoute && isAdmin && (
              <Link to="/admin/dashboard" className="text-sm font-medium text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-50">
                Admin Panel
              </Link>
            )}
            {isAdminRoute && (
              <>
                <Link to="/" className="text-sm font-medium text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-50">
                  Exit Admin
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-sm font-medium text-red-600 hover:text-red-800 px-3 py-2 rounded-lg hover:bg-red-50 flex items-center gap-1"
                >
                  <SafeIcon icon={FiIcons.FiLogOut} className="text-sm" />
                  Logout
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
