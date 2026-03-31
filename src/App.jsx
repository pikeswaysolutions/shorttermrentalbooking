import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { StoreProvider, useStore } from './context/StoreContext';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Navbar from './components/layout/Navbar';
import MobileNav from './components/layout/MobileNav';
import Home from './pages/Home';
import BookingWizard from './pages/customer/BookingWizard';
import CalendarWidget from './pages/customer/CalendarWidget';
import AdminLogin from './pages/admin/AdminLogin';
import ResetPassword from './pages/admin/ResetPassword';
import AdminDashboard from './pages/admin/AdminDashboard';
import BookingsList from './pages/admin/BookingsList';
import AdminCalendar from './pages/admin/AdminCalendar';
import PropertiesManager from './pages/admin/PropertiesManager';
import Settings from './pages/admin/Settings';
import UserManagement from './pages/admin/UserManagement';

function AppContent() {
  const { settings } = useStore();

  if (!settings) {
    return <div className="min-h-screen bg-gray-50" />;
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[var(--color-bg-page)] text-[var(--color-text-main)] flex flex-col">
        <Navbar />

        <main className="flex-1 w-full">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/widget" element={<BookingWizard />} />
            <Route path="/booking" element={<BookingWizard />} />
            <Route path="/calendar" element={<CalendarWidget />} />

            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/reset-password" element={<ResetPassword />} />
            <Route path="/admin" element={<Navigate to="/admin/dashboard" />} />
            <Route path="/admin/dashboard" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/bookings" element={<ProtectedRoute><BookingsList /></ProtectedRoute>} />
            <Route path="/admin/calendar" element={<ProtectedRoute><AdminCalendar /></ProtectedRoute>} />
            <Route path="/admin/properties" element={<ProtectedRoute><PropertiesManager /></ProtectedRoute>} />
            <Route path="/admin/event-types" element={<Navigate to="/admin/properties" />} />
            <Route path="/admin/pricing-rules" element={<Navigate to="/admin/properties" />} />
            <Route path="/admin/addons" element={<Navigate to="/admin/properties" />} />
            <Route path="/admin/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute><UserManagement /></ProtectedRoute>} />
          </Routes>
        </main>

        <MobileNav />
      </div>
    </BrowserRouter>
  );
}

function App() {
  return (
    <AuthProvider>
      <StoreProvider>
        <AppContent />
      </StoreProvider>
    </AuthProvider>
  );
}

export default App;
