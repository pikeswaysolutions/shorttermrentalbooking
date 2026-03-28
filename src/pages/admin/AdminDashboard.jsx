import React from 'react';
import { useStore } from '../../context/StoreContext';
import { Link } from 'react-router-dom';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';
import { formatCurrency } from '../../lib/utils';
import { format } from 'date-fns';

const StatCard = ({ title, value, icon, color }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
    <div className={`p-3 rounded-lg ${color} bg-opacity-10`}>
      <SafeIcon icon={icon} className={`text-2xl ${color.replace('bg-', 'text-')}`} />
    </div>
    <div>
      <p className="text-sm text-gray-500 font-medium">{title}</p>
      <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
    </div>
  </div>
);

const AdminDashboard = () => {
  const { bookings } = useStore();
  
  const pendingCount = bookings.filter(b => b.status === 'pending').length;
  const confirmedCount = bookings.filter(b => b.status === 'confirmed').length;
  const totalRevenue = bookings
    .filter(b => b.status === 'confirmed')
    .reduce((acc, curr) => acc + (curr.totalPrice || 0), 0);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 pb-24">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <span className="text-sm text-gray-500">{format(new Date(), 'EEEE, MMMM do')}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          title="Pending Requests" 
          value={pendingCount} 
          icon={FiIcons.FiInbox} 
          color="bg-yellow-500" 
        />
        <StatCard 
          title="Upcoming Events" 
          value={confirmedCount} 
          icon={FiIcons.FiCalendar} 
          color="bg-blue-500" 
        />
        <StatCard 
          title="Projected Revenue" 
          value={formatCurrency(totalRevenue)} 
          icon={FiIcons.FiDollarSign} 
          color="bg-green-500" 
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h2 className="font-bold text-lg">Recent Requests</h2>
          <Link to="/admin/bookings" className="text-sm text-[var(--color-primary)] font-medium">View All</Link>
        </div>
        <div className="divide-y divide-gray-100">
          {bookings.slice().reverse().slice(0, 5).map(booking => (
            <div key={booking.id} className="p-4 hover:bg-gray-50 transition-colors flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className={`w-2 h-2 rounded-full ${
                  booking.status === 'pending' ? 'bg-yellow-500' :
                  booking.status === 'confirmed' ? 'bg-green-500' : 'bg-red-500'
                }`} />
                <div>
                  <h4 className="font-medium text-gray-900">{booking.eventType?.name}</h4>
                  <p className="text-sm text-gray-500">
                    {format(new Date(booking.date), 'MMM d')} • {booking.contactName}
                  </p>
                </div>
              </div>
              <span className="text-sm font-medium text-gray-900">{formatCurrency(booking.totalPrice)}</span>
            </div>
          ))}
          {bookings.length === 0 && (
            <div className="p-8 text-center text-gray-400">No bookings yet.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;