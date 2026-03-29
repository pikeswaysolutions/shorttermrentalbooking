import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { Button } from '../../components/ui/Button';
import { formatCurrency, cn } from '../../lib/utils';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';
import { format, differenceInDays, parseISO } from 'date-fns';

const BookingsList = () => {
  const { bookings, updateBookingStatus, updateBookingDetails, properties } = useStore();
  const [filter, setFilter] = useState('all');
  const [editingBooking, setEditingBooking] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [showEditModal, setShowEditModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [actionError, setActionError] = useState('');

  const sortedBookings = [...bookings].sort((a, b) => {
    if (a.status === 'pending' && b.status !== 'pending') return -1;
    if (a.status !== 'pending' && b.status === 'pending') return 1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  const filteredBookings = filter === 'all'
    ? sortedBookings
    : sortedBookings.filter(b => b.status === filter);

  const handleEditClick = (booking) => {
    setEditingBooking(booking);
    setEditFormData({
      ...booking,
      property: booking.property?.id || booking.property,
      check_in_date: typeof booking.checkInDate === 'string' ? booking.checkInDate : format(booking.checkInDate, 'yyyy-MM-dd'),
      check_out_date: typeof booking.checkOutDate === 'string' ? booking.checkOutDate : format(booking.checkOutDate, 'yyyy-MM-dd')
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    const checkIn = new Date(editFormData.check_in_date);
    const checkOut = new Date(editFormData.check_out_date);

    if (checkOut <= checkIn) {
      alert('Error: Check-out date must be after check-in date.');
      return;
    }

    setActionLoading('save');
    setActionError('');
    try {
      const propertyObj = properties.find(p => p.id === editFormData.property) || editFormData.property;
      await updateBookingDetails({
        ...editingBooking,
        contactName: editFormData.contactName,
        contactEmail: editFormData.contactEmail,
        contactPhone: editFormData.contactPhone,
        guestCount: editFormData.guestCount,
        descriptionOfUse: editFormData.descriptionOfUse,
        notes: editFormData.notes,
        checkInDate: editFormData.check_in_date,
        checkOutDate: editFormData.check_out_date,
        propertyId: typeof editFormData.property === 'string' ? editFormData.property : editFormData.property?.id,
        property: propertyObj,
      });
      setShowEditModal(false);
      setEditingBooking(null);
    } catch (err) {
      if (err.message?.includes('VERSION_MISMATCH')) {
        alert('This booking was modified by another user. Please refresh the page and try again.');
      } else {
        setActionError(err.message || 'Failed to save changes.');
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleStatusChange = async (bookingId, status) => {
    setActionLoading(bookingId + status);
    setActionError('');
    try {
      await updateBookingStatus(bookingId, status);
    } catch (err) {
      alert(err.message || 'Failed to update status.');
    } finally {
      setActionLoading(null);
    }
  };

  const StatusBadge = ({ status }) => {
    const styles = {
      pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
      confirmed: "bg-green-100 text-green-800 border-green-200",
      declined: "bg-red-100 text-red-800 border-red-200",
      cancelled: "bg-gray-100 text-gray-800 border-gray-200"
    };

    const icons = {
      pending: FiIcons.FiClock,
      confirmed: FiIcons.FiCheckCircle,
      declined: FiIcons.FiXCircle,
      cancelled: FiIcons.FiSlash
    };

    return (
      <span className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border uppercase tracking-wide", styles[status])}>
        <SafeIcon icon={icons[status]} />
        {status}
      </span>
    );
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Booking Requests</h1>
          <p className="text-gray-500 mt-1">Manage incoming requests and confirmed reservations</p>
        </div>

        <div className="flex gap-2 bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
          {['all', 'pending', 'confirmed', 'declined'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-4 py-2 rounded-md text-sm font-bold capitalize transition-all",
                filter === f
                  ? "bg-gray-900 text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-50"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6">
        {filteredBookings.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <SafeIcon icon={FiIcons.FiInbox} className="text-3xl text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">No bookings found</h3>
            <p className="text-gray-500">There are no booking requests in this category.</p>
          </div>
        ) : (
          filteredBookings.map(booking => {
            const checkInDate = typeof booking.checkInDate === 'string' ? parseISO(booking.checkInDate) : booking.checkInDate;
            const checkOutDate = typeof booking.checkOutDate === 'string' ? parseISO(booking.checkOutDate) : booking.checkOutDate;
            const nights = differenceInDays(checkOutDate, checkInDate);

            return (
              <div key={booking.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex flex-col md:flex-row justify-between gap-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <StatusBadge status={booking.status} />
                        <span className="text-xs font-mono text-gray-400">#{booking.id.slice(-8)}</span>
                      </div>

                      <h3 className="text-xl font-bold text-gray-900 mb-1">{booking.property?.name || 'Unknown Property'}</h3>

                      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600 mt-3">
                        <div className="flex items-center gap-2">
                          <SafeIcon icon={FiIcons.FiCalendar} className="text-gray-400" />
                          <span className="font-semibold">Check-in: {format(checkInDate, 'MMM do, yyyy')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <SafeIcon icon={FiIcons.FiCalendar} className="text-gray-400" />
                          <span className="font-semibold">Check-out: {format(checkOutDate, 'MMM do, yyyy')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <SafeIcon icon={FiIcons.FiMoon} className="text-gray-400" />
                          <span>{nights} {nights === 1 ? 'night' : 'nights'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <SafeIcon icon={FiIcons.FiUsers} className="text-gray-400" />
                          <span>{booking.guestCount} guests</span>
                        </div>
                      </div>

                      <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Details</h4>
                        <div className="grid md:grid-cols-2 gap-4 text-sm">
                           <div>
                             <span className="text-gray-500 block text-xs">Contact</span>
                             <span className="font-semibold text-gray-900">{booking.contactName}</span>
                             <div className="text-gray-600 text-xs">{booking.contactPhone}</div>
                             <div className="text-gray-600 text-xs">{booking.contactEmail}</div>
                           </div>
                           <div>
                             <span className="text-gray-500 block text-xs">Use Description</span>
                             <p className="text-gray-700 italic">"{booking.descriptionOfUse}"</p>
                           </div>
                           {booking.selectedAddOns && booking.selectedAddOns.length > 0 && (
                             <div className="md:col-span-2 border-t border-gray-200 pt-2 mt-1">
                               <span className="text-gray-500 block text-xs mb-1">Add-ons:</span>
                               <div className="flex flex-wrap gap-2">
                                 {booking.selectedAddOns.map(addonId => (
                                   <span key={addonId} className="bg-white border border-gray-200 px-2 py-1 rounded text-xs font-medium text-gray-600">
                                     {addonId}
                                   </span>
                                 ))}
                               </div>
                             </div>
                           )}
                        </div>
                        <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between items-center">
                          <span className="font-bold text-gray-900">Total: {formatCurrency(booking.totalPrice)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 justify-center md:border-l md:border-gray-100 md:pl-6 min-w-[140px]">
                      {booking.status === 'pending' && (
                        <>
                          <Button
                            className="w-full justify-center bg-gray-900 hover:bg-gray-800"
                            onClick={() => handleStatusChange(booking.id, 'confirmed')}
                            isLoading={actionLoading === booking.id + 'confirmed'}
                          >
                            Approve
                          </Button>

                          <Button
                            variant="outline"
                            className="w-full justify-center"
                            onClick={() => handleEditClick(booking)}
                          >
                            <SafeIcon icon={FiIcons.FiEdit2} className="mr-2" />
                            Edit
                          </Button>

                          <Button
                            variant="danger"
                            className="w-full justify-center"
                            onClick={() => handleStatusChange(booking.id, 'declined')}
                            isLoading={actionLoading === booking.id + 'declined'}
                          >
                            Decline
                          </Button>
                        </>
                      )}

                      {booking.status !== 'pending' && (
                        <>
                          <div className="text-center py-2 mb-2">
                             <span className="text-xs font-bold text-gray-400 uppercase">
                               {booking.status === 'confirmed' ? 'Approved' : 'Declined'}
                             </span>
                          </div>
                          <Button
                             variant="outline"
                             className="w-full justify-center text-xs"
                             onClick={() => handleStatusChange(booking.id, 'pending')}
                             isLoading={actionLoading === booking.id + 'pending'}
                          >
                            Reopen Request
                          </Button>
                          <Button
                            variant="outline"
                            className="w-full justify-center"
                            onClick={() => handleEditClick(booking)}
                          >
                            <SafeIcon icon={FiIcons.FiEdit2} className="mr-2" />
                            Edit
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {showEditModal && editingBooking && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10">
              <h3 className="text-xl font-bold text-gray-900">Edit Booking #{editingBooking.id.slice(-6)}</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <SafeIcon icon={FiIcons.FiX} className="text-2xl" />
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Customer Name</label>
                <input
                  type="text"
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  value={editFormData.contactName || ''}
                  onChange={(e) => setEditFormData({...editFormData, contactName: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  value={editFormData.contactPhone || ''}
                  onChange={(e) => setEditFormData({...editFormData, contactPhone: e.target.value})}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-gray-700 mb-1">Customer Email</label>
                <input
                  type="email"
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  value={editFormData.contactEmail || ''}
                  onChange={(e) => setEditFormData({...editFormData, contactEmail: e.target.value})}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-gray-700 mb-1">Number of Guests</label>
                <input
                  type="number"
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  value={editFormData.guestCount || 1}
                  onChange={(e) => setEditFormData({...editFormData, guestCount: parseInt(e.target.value)})}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-gray-700 mb-1">Property</label>
                <select
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  value={editFormData.property}
                  onChange={(e) => setEditFormData({...editFormData, property: e.target.value})}
                >
                  {properties.map(prop => (
                    <option key={prop.id} value={prop.id}>{prop.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Check-in Date</label>
                <input
                  type="date"
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  value={editFormData.check_in_date}
                  onChange={(e) => setEditFormData({...editFormData, check_in_date: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Check-out Date</label>
                <input
                  type="date"
                  className={cn(
                    "w-full p-2 border rounded-lg transition-colors",
                    new Date(editFormData.check_out_date) <= new Date(editFormData.check_in_date)
                      ? "border-red-500 bg-red-50 text-red-900"
                      : "border-gray-300"
                  )}
                  value={editFormData.check_out_date}
                  onChange={(e) => setEditFormData({...editFormData, check_out_date: e.target.value})}
                />
                {new Date(editFormData.check_out_date) <= new Date(editFormData.check_in_date) && (
                  <p className="text-xs text-red-600 mt-1 font-bold">Check-out date must be after check-in date.</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-gray-700 mb-1">Description of Use</label>
                <textarea
                  className="w-full p-2 border border-gray-300 rounded-lg h-24"
                  value={editFormData.descriptionOfUse || ''}
                  onChange={(e) => setEditFormData({...editFormData, descriptionOfUse: e.target.value})}
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3 bg-gray-50">
              <Button variant="outline" onClick={() => setShowEditModal(false)}>Cancel</Button>
              <Button
                onClick={handleSaveEdit}
                disabled={new Date(editFormData.check_out_date) <= new Date(editFormData.check_in_date)}
                className={cn(new Date(editFormData.check_out_date) <= new Date(editFormData.check_in_date) && "opacity-50 cursor-not-allowed")}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingsList;
