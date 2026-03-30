import React, { useState, useMemo } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  addMonths,
  startOfWeek,
  endOfWeek,
  isPast,
  isToday,
  isBefore,
  isAfter,
  isSameDay,
  differenceInDays,
} from 'date-fns';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { cn } from '../lib/utils';

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const BookingCalendar = ({
  propertyId,
  bookings = [],
  blockedDates = [],
  checkInDate,
  checkOutDate,
  onCheckInSelect,
  onCheckOutSelect,
  minNights = 1,
}) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [baseMonth, setBaseMonth] = useState(startOfMonth(today));
  const secondMonth = addMonths(baseMonth, 1);

  const propertyBookings = useMemo(() => {
    return bookings.filter(b => {
      if (b.status === 'declined' || b.status === 'cancelled') return false;
      if (b.propertyId && b.propertyId !== propertyId) return false;
      return true;
    });
  }, [bookings, propertyId]);

  const propertyBlockedDates = useMemo(() => {
    return blockedDates.filter(bd => {
      if (bd.propertyId && bd.propertyId !== propertyId) return false;
      return true;
    });
  }, [blockedDates, propertyId]);

  const parsedCheckIn = useMemo(() => {
    if (!checkInDate) return null;
    const [y, m, d] = checkInDate.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setHours(0, 0, 0, 0);
    return dt;
  }, [checkInDate]);

  const parsedCheckOut = useMemo(() => {
    if (!checkOutDate) return null;
    const [y, m, d] = checkOutDate.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setHours(0, 0, 0, 0);
    return dt;
  }, [checkOutDate]);

  const getDayStatus = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');

    const isOccupied = propertyBookings.some(b =>
      dateStr >= b.checkInDate && dateStr < b.checkOutDate
    );
    const isCheckoutDate = propertyBookings.some(b => dateStr === b.checkOutDate);
    const isBlocked = propertyBlockedDates.some(bd => bd.date === dateStr);

    if (isOccupied) return 'occupied';
    if (isBlocked) return 'blocked';
    if (isCheckoutDate) return 'checkout';
    return 'available';
  };

  const isTooCloseToCheckIn = (date) => {
    if (!parsedCheckIn || checkOutDate) return false;
    if (isBefore(date, parsedCheckIn) || isSameDay(date, parsedCheckIn)) return false;
    return differenceInDays(date, parsedCheckIn) < minNights;
  };

  const isInRange = (date) => {
    if (!parsedCheckIn || !parsedCheckOut) return false;
    return isAfter(date, parsedCheckIn) && isBefore(date, parsedCheckOut);
  };

  const handleDayClick = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const status = getDayStatus(date);

    if (status === 'occupied' || status === 'blocked') return;

    if (!checkInDate || (checkInDate && checkOutDate)) {
      onCheckInSelect(dateStr);
      onCheckOutSelect('');
      return;
    }

    if (checkInDate && !checkOutDate) {
      const [y, m, d] = checkInDate.split('-').map(Number);
      const ci = new Date(y, m - 1, d);
      ci.setHours(0, 0, 0, 0);

      if (isBefore(date, ci) || isSameDay(date, ci)) {
        onCheckInSelect(dateStr);
        onCheckOutSelect('');
        return;
      }

      if (differenceInDays(date, ci) < minNights) return;

      const hasConflict = propertyBookings.some(b => {
        return checkInDate < b.checkOutDate && dateStr > b.checkInDate &&
          !(dateStr === b.checkOutDate);
      });

      const hasBlockedConflict = propertyBlockedDates.some(bd => {
        return bd.date > checkInDate && bd.date < dateStr;
      });

      if (hasConflict || hasBlockedConflict) return;

      onCheckOutSelect(dateStr);
    }
  };

  const renderMonth = (monthDate) => {
    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthDate);
    const gridStart = startOfWeek(monthStart);
    const gridEnd = endOfWeek(monthEnd);
    const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

    return (
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-bold text-center text-gray-900 mb-3">
          {format(monthDate, 'MMMM yyyy')}
        </h3>
        <div className="grid grid-cols-7 mb-1">
          {DAYS.map(d => (
            <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day, idx) => {
            const inThisMonth = isSameMonth(day, monthDate);
            const isPastDay = isBefore(day, today) && !isToday(day);
            const status = !isPastDay && inThisMonth ? getDayStatus(day) : null;
            const isOccupiedOrBlocked = status === 'occupied' || status === 'blocked';
            const tooClose = !isPastDay && inThisMonth && isTooCloseToCheckIn(day);
            const isCheckIn = parsedCheckIn && isSameDay(day, parsedCheckIn);
            const isCheckOut = parsedCheckOut && isSameDay(day, parsedCheckOut);
            const inRange = inThisMonth && isInRange(day);
            const isCheckoutOnly = status === 'checkout';
            const isClickable = inThisMonth && !isPastDay && !isOccupiedOrBlocked && !tooClose;

            return (
              <div
                key={idx}
                className={cn(
                  "relative",
                  inRange && "bg-blue-50",
                  isCheckIn && parsedCheckOut && "bg-blue-50 rounded-l-full",
                  isCheckOut && parsedCheckIn && "bg-blue-50 rounded-r-full",
                )}
              >
                <button
                  type="button"
                  disabled={!isClickable}
                  onClick={() => isClickable && handleDayClick(day)}
                  className={cn(
                    "w-full aspect-square flex items-center justify-center text-sm font-medium transition-all relative",
                    !inThisMonth && "invisible",
                    inThisMonth && isPastDay && "text-gray-300 cursor-not-allowed",
                    inThisMonth && !isPastDay && !isOccupiedOrBlocked && !tooClose && !isCheckIn && !isCheckOut && "hover:bg-gray-100 rounded-full cursor-pointer",
                    inThisMonth && !isPastDay && !isOccupiedOrBlocked && !tooClose && !isCheckIn && !isCheckOut && "text-gray-900",
                    isOccupiedOrBlocked && "cursor-not-allowed",
                    tooClose && "text-gray-300 cursor-not-allowed",
                    isCheckIn && "bg-gray-900 text-white rounded-full z-10 relative",
                    isCheckOut && "bg-gray-900 text-white rounded-full z-10 relative",
                    isToday(day) && !isCheckIn && !isCheckOut && "font-bold",
                  )}
                >
                  {inThisMonth && (
                    <>
                      {isOccupiedOrBlocked ? (
                        <span className="relative text-gray-300">
                          <span className="relative z-10">{format(day, 'd')}</span>
                          <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <span className="w-full h-px bg-gray-300 rotate-45 absolute" />
                          </span>
                        </span>
                      ) : (
                        <span className="relative z-10">{format(day, 'd')}</span>
                      )}
                      {isCheckoutOnly && !isCheckIn && !isCheckOut && !isPastDay && (
                        <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-400" />
                      )}
                      {isToday(day) && !isCheckIn && !isCheckOut && (
                        <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-gray-900" />
                      )}
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="pt-2 pb-4">
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={() => setBaseMonth(prev => addMonths(prev, -1))}
          disabled={isBefore(addMonths(baseMonth, -1), startOfMonth(today))}
          className="p-2 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <SafeIcon icon={FiIcons.FiChevronLeft} className="text-gray-700" />
        </button>
        <button
          type="button"
          onClick={() => setBaseMonth(prev => addMonths(prev, 1))}
          className="p-2 rounded-full hover:bg-gray-100 transition-colors"
        >
          <SafeIcon icon={FiIcons.FiChevronRight} className="text-gray-700" />
        </button>
      </div>

      <div className="flex gap-6">
        {renderMonth(baseMonth)}
        <div className="hidden md:block w-px bg-gray-200 flex-shrink-0" />
        <div className="hidden md:flex flex-1 min-w-0">
          {renderMonth(secondMonth)}
        </div>
      </div>

      <div className="flex flex-wrap gap-4 mt-4 pt-3 border-t border-gray-100">
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <div className="w-4 h-4 rounded-full bg-gray-900" />
          <span>Selected</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <div className="w-4 h-4 rounded-sm bg-blue-50 border border-blue-100" />
          <span>In range</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <div className="relative w-4 h-4 rounded-sm bg-gray-50 border border-gray-200 overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-full h-px bg-gray-300 rotate-45" />
            </div>
          </div>
          <span>Unavailable</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <div className="relative w-4 h-4 rounded-sm bg-white border border-gray-200">
            <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-400" />
          </div>
          <span>Checkout (available)</span>
        </div>
      </div>
    </div>
  );
};

export default BookingCalendar;
