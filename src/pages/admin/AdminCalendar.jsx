import React, { useState } from 'react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  eachDayOfInterval,
  set
} from 'date-fns';
import { useStore } from '../../context/StoreContext';
import { Button } from '../../components/ui/Button';
import { formatCurrency, cn } from '../../lib/utils';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';

const generateTimeSlots = () => {
  const slots = [];
  for (let i = 0; i < 24 * 2; i++) {
    const minutes = i * 30;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const timeString = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    const date = set(new Date(), { hours, minutes: mins, seconds: 0 });
    const label = format(date, 'h:mm a');
    slots.push({ value: timeString, label });
  }
  return slots;
};

const TIME_SLOTS = generateTimeSlots();

const AdminCalendar = () => {
  const { bookings, addBlockedDate, removeBlockedDate, getBlockedTimesForDate, updateBookingStatus, updateBookingDetails, eventTypes } = useStore();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockMode, setBlockMode] = useState('full');
  const [blockReason, setBlockReason] = useState('');
  const [blockStartTime, setBlockStartTime] = useState('09:00');
  const [blockEndTime, setBlockEndTime] = useState('17:00');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [isEditingEvent, setIsEditingEvent] = useState(false);
  const [editFormData, setEditFormData] = useState({});

  const renderHeader = () => (
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-xl font-bold text-gray-900">
        {format(currentMonth, 'MMMM yyyy')}
      </h2>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
          <SafeIcon icon={FiIcons.FiChevronLeft} />
        </Button>
        <Button variant="outline" size="sm" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
          <SafeIcon icon={FiIcons.FiChevronRight} />
        </Button>
      </div>
    </div>
  );

  const renderDays = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return (
      <div className="grid grid-cols-7 mb-2">
        {days.map(day => (
          <div key={day} className="text-center text-xs font-bold text-gray-500 uppercase tracking-wider py-2">
            {day}
          </div>
        ))}
      </div>
    );
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

    return (
      <div className="grid grid-cols-7 border-t border-l border-gray-200 rounded-lg overflow-hidden shadow-sm bg-white">
        {calendarDays.map((date, idx) => {
          const dateStr = format(date, 'yyyy-MM-dd');
          const dayBookings = bookings.filter(b => b.date === dateStr);
          const blockedTimes = getBlockedTimesForDate(dateStr);
          const hasFullDayBlock = blockedTimes.some(b => b.isFullDay);
          const hasTimeSlotBlocks = blockedTimes.some(b => !b.isFullDay);
          const isSelected = isSameDay(date, selectedDate);
          const isCurrentMonth = isSameMonth(date, monthStart);

          return (
            <div
              key={idx}
              onClick={() => setSelectedDate(date)}
              className={cn(
                "min-h-[80px] md:min-h-[100px] p-2 border-r border-b border-gray-200 cursor-pointer transition-colors relative",
                !isCurrentMonth ? "bg-gray-50 text-gray-400" : "bg-white text-gray-900",
                isSelected && "ring-2 ring-inset ring-[var(--color-primary)] z-10",
                hasFullDayBlock && "bg-red-50"
              )}
            >
              <span className={cn(
                "text-sm font-medium",
                isSameDay(date, new Date()) && "bg-[var(--color-primary)] text-white w-6 h-6 rounded-full flex items-center justify-center -ml-1 -mt-1 mb-1"
              )}>
                {format(date, 'd')}
              </span>

              <div className="mt-1 space-y-1">
                {hasFullDayBlock && (
                  <div className="w-full h-1 bg-red-500 rounded-full" title="Fully Blocked" />
                )}
                {hasTimeSlotBlocks && (
                  <div className="w-full h-1 bg-orange-500 rounded-full" title="Time Slots Blocked" />
                )}
                {dayBookings.slice(0, 3).map(b => (
                  <div 
                    key={b.id} 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEventClick(b);
                    }}
                    className={cn(
                      "h-1.5 rounded-full cursor-pointer hover:scale-110 transition-transform",
                      b.status === 'confirmed' ? "bg-green-600" : "bg-yellow-500"
                    )}
                    title={`${b.eventType?.name} (${b.status})`}
                  />
                ))}
                {dayBookings.length > 3 && (
                  <div className="text-[9px] text-gray-500 font-bold">+{dayBookings.length - 3}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const handleBlockDate = () => {
    if (blockMode === 'full') {
      addBlockedDate(
        format(selectedDate, 'yyyy-MM-dd'),
        blockReason || 'Manually Blocked',
        null,
        null
      );
    } else {
      if (blockStartTime >= blockEndTime) {
        alert('End time must be after start time');
        return;
      }
      addBlockedDate(
        format(selectedDate, 'yyyy-MM-dd'),
        blockReason || 'Time Slot Blocked',
        blockStartTime,
        blockEndTime
      );
    }
    setShowBlockModal(false);
    setBlockReason('');
    setBlockMode('full');
    setBlockStartTime('09:00');
    setBlockEndTime('17:00');
  };

  const handleEventClick = (event) => {
    setSelectedEvent(event);
    setEditFormData({
      ...event,
      eventType: event.eventType?.id || event.eventType
    });
    setIsEditingEvent(false);
    setShowEventModal(true);
  };

  const handleUpdateStatus = (status) => {
    if (selectedEvent) {
      updateBookingStatus(selectedEvent.id, status);
      setShowEventModal(false);
    }
  };

  const handleSaveEventChanges = () => {
    if (selectedEvent) {
      if (editFormData.startTime >= editFormData.endTime) {
        alert('Error: End time must be after start time.');
        return;
      }

      const eventTypeObj = eventTypes.find(et => et.id === editFormData.eventType) || editFormData.eventType;
      updateBookingDetails({
        ...selectedEvent,
        ...editFormData,
        eventType: eventTypeObj
      });
      setIsEditingEvent(false);
      setShowEventModal(false);
    }
  };

  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const dayBookings = bookings.filter(b => b.date === selectedDateStr);
  const blockedTimes = getBlockedTimesForDate(selectedDateStr);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto pb-24">
      <div className="flex flex-col md:flex-row gap-8">
        <div className="flex-1">
          {renderHeader()}
          {renderDays()}
          {renderCells()}
          
          <div className="mt-4 flex gap-4 text-xs font-bold text-gray-600">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-green-600" /> Confirmed
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-yellow-500" /> Pending
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500" /> Full Day Block
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-orange-500" /> Time Slot Block
            </div>
          </div>
        </div>

        <div className="w-full md:w-80 space-y-6">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-lg">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center justify-between">
              <span>{format(selectedDate, 'MMM do, yyyy')}</span>
              <Button 
                size="sm" 
                variant="outline" 
                className="text-red-700 border-red-200 hover:bg-red-50"
                onClick={() => setShowBlockModal(true)}
              >
                <SafeIcon icon={FiIcons.FiSlash} className="mr-1" />
                Block
              </Button>
            </h3>

            <div className="space-y-4">
              {blockedTimes.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                    Blocked Times ({blockedTimes.length})
                  </h4>
                  {blockedTimes.map(block => (
                    <div key={block.id} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex-1">
                          <p className="text-sm font-bold text-red-900">
                            {block.isFullDay ? 'Full Day' : `${TIME_SLOTS.find(t => t.value === block.startTime)?.label} - ${TIME_SLOTS.find(t => t.value === block.endTime)?.label}`}
                          </p>
                          <p className="text-xs text-red-700 mt-0.5">{block.reason}</p>
                        </div>
                        <button
                          onClick={() => removeBlockedDate(block.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <SafeIcon icon={FiIcons.FiX} className="text-lg" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                Bookings ({dayBookings.length})
              </h4>
              
              {dayBookings.length === 0 && blockedTimes.length === 0 && (
                <p className="text-sm text-gray-500 py-4 text-center font-medium">No events or blocks.</p>
              )}

              {dayBookings.map(b => (
                <div 
                  key={b.id} 
                  onClick={() => handleEventClick(b)}
                  className="p-3 rounded-lg border border-gray-200 hover:border-[var(--color-primary)] transition-colors bg-gray-50 cursor-pointer hover:shadow-md"
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-sm text-gray-900">
                      {TIME_SLOTS.find(t => t.value === b.startTime)?.label || b.startTime} - {TIME_SLOTS.find(t => t.value === b.endTime)?.label || b.endTime}
                    </span>
                    <span className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded font-bold uppercase",
                      b.status === 'confirmed' ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                    )}>
                      {b.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-900 font-bold">{b.eventType?.name}</p>
                  <p className="text-xs text-gray-600">{b.contactName}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showBlockModal && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900">Block Calendar</h3>
              <button 
                onClick={() => {
                  setShowBlockModal(false);
                  setBlockReason('');
                  setBlockMode('full');
                }} 
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <SafeIcon icon={FiIcons.FiX} className="text-xl" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm font-bold text-gray-700 mb-3">
                  Blocking: <span className="text-primary">{format(selectedDate, 'MMMM do, yyyy')}</span>
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Block Type</label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setBlockMode('full')}
                    className={cn(
                      "flex-1 p-3 rounded-lg border-2 font-bold text-sm transition-all",
                      blockMode === 'full'
                        ? "border-primary bg-blue-50 text-primary"
                        : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                    )}
                  >
                    Full Day
                  </button>
                  <button
                    type="button"
                    onClick={() => setBlockMode('time')}
                    className={cn(
                      "flex-1 p-3 rounded-lg border-2 font-bold text-sm transition-all",
                      blockMode === 'time'
                        ? "border-primary bg-blue-50 text-primary"
                        : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                    )}
                  >
                    Time Slot
                  </button>
                </div>
              </div>

              {blockMode === 'time' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Start Time</label>
                    <select
                      value={blockStartTime}
                      onChange={(e) => setBlockStartTime(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900"
                    >
                      {TIME_SLOTS.map(slot => (
                        <option key={`block-start-${slot.value}`} value={slot.value}>
                          {slot.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">End Time</label>
                    <select
                      value={blockEndTime}
                      onChange={(e) => setBlockEndTime(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900"
                    >
                      {TIME_SLOTS.map(slot => (
                        <option key={`block-end-${slot.value}`} value={slot.value}>
                          {slot.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Reason {blockMode === 'full' ? '(Optional)' : ''}
                </label>
                <input
                  type="text"
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  placeholder={blockMode === 'full' ? 'e.g., Venue Maintenance' : 'e.g., Staff Meeting'}
                  className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex gap-3">
              <Button onClick={handleBlockDate} className="flex-1">
                Block {blockMode === 'full' ? 'Full Day' : 'Time Slot'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowBlockModal(false);
                  setBlockReason('');
                  setBlockMode('full');
                }}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {showEventModal && selectedEvent && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10">
              <div>
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  {isEditingEvent ? 'Edit Booking' : 'Booking Details'}
                  <span className="text-gray-400 text-sm font-normal">#{selectedEvent.id.slice(-6)}</span>
                </h3>
              </div>
              <button 
                onClick={() => setShowEventModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <SafeIcon icon={FiIcons.FiX} className="text-2xl" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {!isEditingEvent && (
                <div className={cn(
                  "p-4 rounded-lg flex items-center justify-between",
                  selectedEvent.status === 'confirmed' ? "bg-green-50 text-green-900 border border-green-200" : 
                  selectedEvent.status === 'declined' ? "bg-red-50 text-red-900 border border-red-200" :
                  "bg-yellow-50 text-yellow-900 border border-yellow-200"
                )}>
                  <div className="flex items-center gap-2">
                    <SafeIcon icon={
                      selectedEvent.status === 'confirmed' ? FiIcons.FiCheckCircle :
                      selectedEvent.status === 'declined' ? FiIcons.FiXCircle :
                      FiIcons.FiClock
                    } className="text-xl" />
                    <span className="font-bold uppercase tracking-wide text-sm">{selectedEvent.status}</span>
                  </div>
                  <span className="text-xs opacity-75 font-semibold">
                    Requested on {format(new Date(selectedEvent.createdAt), 'MMM d, yyyy')}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-1 md:col-span-2">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 border-b border-gray-100 pb-1">
                    Customer Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Customer Name</label>
                      {isEditingEvent ? (
                        <input
                          type="text"
                          className="w-full p-2 border border-gray-300 rounded-lg"
                          value={editFormData.contactName}
                          onChange={(e) => setEditFormData({...editFormData, contactName: e.target.value})}
                        />
                      ) : (
                        <p className="text-lg text-gray-900">{selectedEvent.contactName}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Phone Number</label>
                      {isEditingEvent ? (
                        <input
                          type="text"
                          className="w-full p-2 border border-gray-300 rounded-lg"
                          value={editFormData.contactPhone}
                          onChange={(e) => setEditFormData({...editFormData, contactPhone: e.target.value})}
                        />
                      ) : (
                        <p className="text-lg text-gray-900">{selectedEvent.contactPhone}</p>
                      )}
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-gray-700 mb-1">Email Address</label>
                      {isEditingEvent ? (
                        <input
                          type="email"
                          className="w-full p-2 border border-gray-300 rounded-lg"
                          value={editFormData.contactEmail}
                          onChange={(e) => setEditFormData({...editFormData, contactEmail: e.target.value})}
                        />
                      ) : (
                        <p className="text-lg text-gray-900 flex items-center gap-2">
                          {selectedEvent.contactEmail}
                          <a href={`mailto:${selectedEvent.contactEmail}`} className="text-primary hover:text-blue-700">
                            <SafeIcon icon={FiIcons.FiMail} />
                          </a>
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="col-span-1 md:col-span-2">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 border-b border-gray-100 pb-1 pt-2">
                    Event Details
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-gray-700 mb-1">Event Type</label>
                      {isEditingEvent ? (
                        <select
                          className="w-full p-2 border border-gray-300 rounded-lg"
                          value={typeof editFormData.eventType === 'object' ? editFormData.eventType.id : editFormData.eventType}
                          onChange={(e) => setEditFormData({...editFormData, eventType: e.target.value})}
                        >
                          {eventTypes.map(et => (
                            <option key={et.id} value={et.id}>{et.name}</option>
                          ))}
                        </select>
                      ) : (
                        <p className="text-lg font-bold text-primary">{selectedEvent.eventType?.name}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Date</label>
                      {isEditingEvent ? (
                        <input
                          type="date"
                          className="w-full p-2 border border-gray-300 rounded-lg"
                          value={editFormData.date}
                          onChange={(e) => setEditFormData({...editFormData, date: e.target.value})}
                        />
                      ) : (
                        <p className="text-lg text-gray-900">{format(new Date(selectedEvent.date), 'MMMM do, yyyy')}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Guest Count</label>
                      {isEditingEvent ? (
                        <input
                          type="number"
                          className="w-full p-2 border border-gray-300 rounded-lg"
                          value={editFormData.guestCount}
                          onChange={(e) => setEditFormData({...editFormData, guestCount: parseInt(e.target.value)})}
                        />
                      ) : (
                        <p className="text-lg text-gray-900">{selectedEvent.guestCount} guests</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Start Time</label>
                      {isEditingEvent ? (
                        <select
                          className="w-full p-2 border border-gray-300 rounded-lg"
                          value={editFormData.startTime}
                          onChange={(e) => setEditFormData({...editFormData, startTime: e.target.value})}
                        >
                          {TIME_SLOTS.map(slot => (
                            <option key={`start-${slot.value}`} value={slot.value}>{slot.label}</option>
                          ))}
                        </select>
                      ) : (
                        <p className="text-lg text-gray-900">{TIME_SLOTS.find(t => t.value === selectedEvent.startTime)?.label || selectedEvent.startTime}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">End Time</label>
                      {isEditingEvent ? (
                        <div className="flex flex-col">
                          <select
                            className={cn(
                              "w-full p-2 border rounded-lg transition-colors",
                              editFormData.startTime >= editFormData.endTime 
                                ? "border-red-500 bg-red-50 text-red-900" 
                                : "border-gray-300"
                            )}
                            value={editFormData.endTime}
                            onChange={(e) => setEditFormData({...editFormData, endTime: e.target.value})}
                          >
                            {TIME_SLOTS.map(slot => (
                              <option key={`end-${slot.value}`} value={slot.value}>{slot.label}</option>
                            ))}
                          </select>
                          {editFormData.startTime >= editFormData.endTime && (
                            <span className="text-xs text-red-600 mt-1 font-bold">End time must be after start time</span>
                          )}
                        </div>
                      ) : (
                        <p className="text-lg text-gray-900">{TIME_SLOTS.find(t => t.value === selectedEvent.endTime)?.label || selectedEvent.endTime}</p>
                      )}
                    </div>

                    <div className="md:col-span-2">
                       <label className="block text-sm font-bold text-gray-700 mb-1">Description of Use</label>
                       {isEditingEvent ? (
                         <textarea
                           className="w-full p-2 border border-gray-300 rounded-lg h-24"
                           value={editFormData.descriptionOfUse}
                           onChange={(e) => setEditFormData({...editFormData, descriptionOfUse: e.target.value})}
                         />
                       ) : (
                         <p className="text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-100 italic">
                           "{selectedEvent.descriptionOfUse}"
                         </p>
                       )}
                    </div>
                    
                    {!isEditingEvent && (
                      <div className="md:col-span-2 mt-2">
                        <div className="flex justify-between items-center border-t border-gray-200 pt-3">
                           <span className="font-bold text-lg text-gray-900">Total Price</span>
                           <span className="font-bold text-2xl text-primary">{formatCurrency(selectedEvent.totalPrice)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50 flex flex-col md:flex-row gap-3">
              {isEditingEvent ? (
                <>
                  <Button 
                    onClick={handleSaveEventChanges} 
                    className={cn("flex-1", editFormData.startTime >= editFormData.endTime && "opacity-50 cursor-not-allowed")}
                    disabled={editFormData.startTime >= editFormData.endTime}
                  >
                    Save Changes
                  </Button>
                  <Button variant="outline" onClick={() => setIsEditingEvent(false)} className="flex-1">Cancel</Button>
                </>
              ) : (
                <>
                  {selectedEvent.status === 'pending' && (
                    <>
                      <Button 
                        onClick={() => handleUpdateStatus('confirmed')}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                        icon={FiIcons.FiCheck}
                      >
                        Approve
                      </Button>
                      <Button 
                        onClick={() => handleUpdateStatus('declined')}
                        variant="danger"
                        className="flex-1"
                        icon={FiIcons.FiX}
                      >
                        Decline
                      </Button>
                    </>
                  )}
                  <Button 
                    variant="outline" 
                    onClick={() => setIsEditingEvent(true)}
                    className="flex-1"
                    icon={FiIcons.FiEdit2}
                  >
                    Edit
                  </Button>
                  {selectedEvent.status !== 'pending' && (
                    <Button 
                      variant="outline" 
                      onClick={() => setShowEventModal(false)}
                      className="flex-1"
                    >
                      Close
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCalendar;