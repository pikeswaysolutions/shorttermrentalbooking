import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, isPast, isToday } from 'date-fns';
import { useStore } from '../../context/StoreContext';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';
import { cn } from '../../lib/utils';

const CalendarWidget = () => {
  const navigate = useNavigate();
  const { getBookingsForDate } = useStore();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const handlePrevMonth = () => setCurrentMonth(prev => subMonths(prev, 1));
  const handleNextMonth = () => setCurrentMonth(prev => addMonths(prev, 1));

  const getDateStatus = (date) => {
    const bookings = getBookingsForDate(format(date, 'yyyy-MM-dd'));
    if (bookings.length === 0) return 'available';

    const confirmedBookings = bookings.filter(b => b.status === 'confirmed');
    if (confirmedBookings.length === 0) return 'available';

    const totalBookedHours = confirmedBookings.reduce((sum, b) => {
      const start = new Date(`${b.date}T${b.startTime}`);
      const end = new Date(`${b.date}T${b.endTime}`);
      return sum + (end - start) / (1000 * 60 * 60);
    }, 0);

    if (totalBookedHours >= 12) return 'full';
    return 'partial';
  };

  const handleDateClick = (date) => {
    if (isPast(date) && !isToday(date)) return;
    const status = getDateStatus(date);
    if (status === 'full') return;
    navigate(`/booking?date=${format(date, 'yyyy-MM-dd')}&from=calendar`);
  };

  return (
    <div className="min-h-screen bg-white p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl overflow-hidden">
          <div className="px-2 py-4">
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={handlePrevMonth}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500"
              >
                <SafeIcon icon={FiIcons.FiChevronLeft} className="text-xl" />
              </button>
              <h2 className="text-xl font-bold text-gray-900 tracking-wide">
                {format(currentMonth, 'MMMM yyyy')}
              </h2>
              <button
                onClick={handleNextMonth}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500"
              >
                <SafeIcon icon={FiIcons.FiChevronRight} className="text-xl" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-2 mb-2">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                <div key={i} className="text-center text-base font-semibold text-gray-600 py-2">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map((day, idx) => {
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isDisabled = isPast(day) && !isToday(day);
                const status = !isDisabled && isCurrentMonth ? getDateStatus(day) : null;
                const dateBookings = getBookingsForDate(format(day, 'yyyy-MM-dd'));
                const isFull = status === 'full';

                return (
                  <button
                    key={idx}
                    onClick={() => handleDateClick(day)}
                    disabled={isDisabled || isFull}
                    className={cn(
                      "aspect-square rounded-lg text-base font-semibold transition-all relative",
                      "flex flex-col items-center justify-center",
                      !isCurrentMonth && "text-gray-300",
                      isCurrentMonth && !isDisabled && !isFull && "text-gray-900",
                      isToday(day) && "ring-2 ring-blue-500 ring-offset-1",
                      isDisabled && "text-gray-300 cursor-not-allowed",
                      isFull && "bg-red-50 border border-red-200 text-red-400 cursor-not-allowed",
                      !isDisabled && !isFull && status === 'available' && isCurrentMonth && "bg-green-50 border border-green-200 hover:bg-green-100 cursor-pointer",
                      !isDisabled && !isFull && status === 'partial' && isCurrentMonth && "bg-amber-50 border border-amber-200 hover:bg-amber-100 cursor-pointer"
                    )}
                  >
                    <span>{format(day, 'd')}</span>
                    {!isDisabled && status === 'partial' && dateBookings.length > 0 && (
                      <div className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-amber-500" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-t border-gray-100 px-4 py-3">
            <div className="flex flex-wrap gap-4 justify-center text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-green-50 border border-green-200" />
                <span className="text-gray-500">Available</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="relative w-3 h-3 rounded bg-amber-50 border border-amber-200">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-amber-500" />
                </div>
                <span className="text-gray-500">Some Availability</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-red-50 border border-red-200" />
                <span className="text-gray-500">No Availability</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-gray-100" />
                <span className="text-gray-500">Past Date</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarWidget;
