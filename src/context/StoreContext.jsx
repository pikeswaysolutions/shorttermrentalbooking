import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as api from '../lib/api';

const StoreContext = createContext();

export function StoreProvider({ children }) {
  const [eventTypes, setEventTypes] = useState([]);
  const [pricingRules, setPricingRules] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [blockedDates, setBlockedDates] = useState([]);
  const [addOns, setAddOns] = useState([]);
  const [settings, setSettings] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadAllData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [etData, prData, aoData, bdData, sData] = await Promise.all([
        api.fetchEventTypes(),
        api.fetchPricingRules(),
        api.fetchAddOns(),
        api.fetchBlockedDates(),
        api.fetchSettings(),
      ]);

      setEventTypes(etData);
      setPricingRules(prData);
      setAddOns(aoData);
      setBlockedDates(bdData);
      setSettings(sData || { primaryColor: '#1d4ed8', accentColor: '#7c3aed', companyName: 'Event Space' });

      const bData = await api.fetchBookings(etData);
      setBookings(bData);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  useEffect(() => {
    if (!settings) return;
    if (settings.primaryColor) {
      document.documentElement.style.setProperty('--color-primary', settings.primaryColor);
    }
    if (settings.accentColor) {
      document.documentElement.style.setProperty('--color-accent', settings.accentColor);
    }
  }, [settings]);

  const addEventType = async (data) => {
    const created = await api.createEventType(data);
    setEventTypes(prev => [...prev, created]);
    return created;
  };

  const updateEventType = async (data) => {
    const updated = await api.updateEventType(data.id, data);
    setEventTypes(prev => prev.map(et => et.id === data.id ? updated : et));
    return updated;
  };

  const deleteEventType = async (id) => {
    await api.deleteEventType(id);
    setEventTypes(prev => prev.filter(et => et.id !== id));
  };

  const addPricingRule = async (data) => {
    const created = await api.createPricingRule(data);
    setPricingRules(prev => [...prev, created]);
    return created;
  };

  const updatePricingRule = async (id, data) => {
    const updated = await api.updatePricingRule(id, data);
    setPricingRules(prev => prev.map(r => r.id === id ? updated : r));
    return updated;
  };

  const deletePricingRule = async (id) => {
    await api.deletePricingRule(id);
    setPricingRules(prev => prev.filter(r => r.id !== id));
  };

  const addAddOn = async (data) => {
    const created = await api.createAddOn(data);
    setAddOns(prev => [...prev, created]);
    return created;
  };

  const updateAddOn = async (id, data) => {
    const updated = await api.updateAddOn(id, data);
    setAddOns(prev => prev.map(a => a.id === id ? updated : a));
    return updated;
  };

  const deleteAddOn = async (id) => {
    await api.deleteAddOn(id);
    setAddOns(prev => prev.filter(a => a.id !== id));
  };

  const addBooking = async (bookingData) => {
    const created = await api.createBooking(bookingData, pricingRules, addOns, eventTypes);
    setBookings(prev => [created, ...prev]);
    return created;
  };

  const updateBookingStatus = async (id, status, userId) => {
    await api.updateBookingStatus(id, status, userId);
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b));
  };

  const updateBookingDetails = async (updatedBooking, userId) => {
    const result = await api.updateBookingDetails(
      updatedBooking.id,
      updatedBooking,
      updatedBooking.version,
      userId,
      pricingRules,
      addOns,
      eventTypes
    );
    const eventType = eventTypes.find(et => et.id === result.event_type_id);
    const mapped = {
      ...updatedBooking,
      eventType,
      totalPrice: Number(result.total_price),
      version: result.version,
      updatedAt: result.updated_at,
    };
    setBookings(prev => prev.map(b => b.id === updatedBooking.id ? mapped : b));
    return mapped;
  };

  const addBlockedDate = async (date, reason = 'Manually Blocked', startTime = null, endTime = null) => {
    const created = await api.createBlockedDate({
      date,
      reason,
      isFullDay: !startTime && !endTime,
      startTime,
      endTime,
    });
    setBlockedDates(prev => [...prev, created]);
    return created;
  };

  const removeBlockedDate = async (id) => {
    await api.deleteBlockedDate(id);
    setBlockedDates(prev => prev.filter(d => d.id !== id));
  };

  const updateSettings = async (newSettings) => {
    const merged = { ...(settings || {}), ...newSettings };
    const updated = await api.updateSettings(merged);
    setSettings(updated);
    return updated;
  };

  const getAddOnsForEventType = useCallback((eventTypeId) => {
    return addOns.filter(addon => {
      if (!addon.active) return false;
      if (!addon.eventTypeIds || addon.eventTypeIds.length === 0) return true;
      return addon.eventTypeIds.includes(eventTypeId);
    });
  }, [addOns]);

  const getBookingsForDate = useCallback((date) => {
    return bookings.filter(booking => {
      if (booking.status === 'declined' || booking.status === 'cancelled') return false;
      return booking.date === date;
    });
  }, [bookings]);

  const getBlockedTimesForDate = useCallback((date) => {
    return blockedDates.filter(block => block.date === date);
  }, [blockedDates]);

  return (
    <StoreContext.Provider value={{
      eventTypes, setEventTypes,
      addEventType, updateEventType, deleteEventType,
      pricingRules, setPricingRules,
      addPricingRule, updatePricingRule, deletePricingRule,
      bookings, addBooking, updateBookingStatus, updateBookingDetails,
      getBookingsForDate,
      blockedDates, addBlockedDate, removeBlockedDate, getBlockedTimesForDate,
      addOns, setAddOns,
      addAddOn, updateAddOn, deleteAddOn,
      getAddOnsForEventType,
      settings, updateSettings,
      isLoading,
    }}>
      {children}
    </StoreContext.Provider>
  );
}

export const useStore = () => useContext(StoreContext);
