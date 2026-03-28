import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { useStore } from '../context/StoreContext';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const Home = () => {
  const { settings } = useStore();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="max-w-md w-full space-y-8">
        {settings.logo ? (
          <div className="flex justify-center">
            <img 
              src={settings.logo} 
              alt={settings.companyName || 'Logo'} 
              className="h-24 w-auto object-contain"
            />
          </div>
        ) : (
          <div className="bg-white p-4 rounded-full w-20 h-20 mx-auto flex items-center justify-center shadow-lg text-[var(--color-primary)]">
            <SafeIcon icon={FiIcons.FiCalendar} className="text-4xl" />
          </div>
        )}
        
        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
          {settings.companyName || 'Luxe Events'}
        </h1>
        <p className="text-gray-600 text-lg">
          Book your perfect event space in minutes. Real-time availability and instant quotes.
        </p>

        <div className="grid gap-4 pt-4">
          <Link to="/booking">
            <Button size="lg" className="w-full shadow-xl shadow-blue-200">
              Book an Event
            </Button>
          </Link>
          <Link to="/admin/dashboard">
            <Button variant="outline" className="w-full">
              Admin Login
            </Button>
          </Link>
        </div>
      </div>
      
      <div className="mt-12 grid grid-cols-3 gap-8 text-gray-400">
        <div className="flex flex-col items-center">
          <SafeIcon icon={FiIcons.FiCheckCircle} className="text-2xl mb-2" />
          <span className="text-xs">Instant Quote</span>
        </div>
        <div className="flex flex-col items-center">
          <SafeIcon icon={FiIcons.FiShield} className="text-2xl mb-2" />
          <span className="text-xs">Secure Booking</span>
        </div>
        <div className="flex flex-col items-center">
          <SafeIcon icon={FiIcons.FiClock} className="text-2xl mb-2" />
          <span className="text-xs">Fast Approval</span>
        </div>
      </div>
    </div>
  );
};

export default Home;