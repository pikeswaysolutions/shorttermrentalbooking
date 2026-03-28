import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as api from '../lib/api';

const StoreContext = createContext();

export function StoreProvider({ children }) {
  const [properties, setProperties] = useState([]);
  const [pricingRules, setPricingRules] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [blockedDates, setBlockedDates] = useState([]);
  const [addOns, setAddOns] = useState([]);
  const [settings, setSettings] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadAllData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [propData, prData, aoData, bdData, sData] = await Promise.all([
        api.fetchProperties(),
        api.fetchPricingRules(),
        api.fetchAddOns(),
        api.fetchBlockedDates(),
        api.fetchSettings(),
      ]);

      setProperties(propData);
      setPricingRules(prData);
      setAddOns(aoData);
      setBlockedDates(bdData);
      setSettings(sData || { primaryColor: '#1d4ed8', accentColor: '#7c3aed', companyName: 'Luxe Rentals' });

      const bData = await api.fetchBookings(propData);
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

  const addProperty = async (data) => {
    const created = await api.createProperty(data);
    setProperties(prev => [...prev, created]);
    return created;
  };

  const updateProperty = async (data) => {
    const updated = await api.updateProperty(data.id, data);
    setProperties(prev => prev.map(p => p.id === data.id ? updated : p));
    return updated;
  };

  const deleteProperty = async (id) => {
    await api.deleteProperty(id);
    setProperties(prev => prev.filter(p => p.id !== id));
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
    const created = await api.createBooking(bookingData, pricingRules, addOns, properties);
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
      properties
    );
    const property = properties.find(p => p.id === result.property_id);
    const mapped = {
      ...updatedBooking,
      property,
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

  const getAddOnsForProperty = useCallback((propertyId) => {
    return addOns.filter(addon => {
      if (!addon.active) return false;
      if (!addon.propertyIds || addon.propertyIds.length === 0) return true;
      return addon.propertyIds.includes(propertyId);
    });
  }, [addOns]);

  const getBookingsForDate = useCallback((date) => {
    return bookings.filter(booking => {
      if (booking.status === 'declined' || booking.status === 'cancelled') return false;
      return date >= booking.checkInDate && date < booking.checkOutDate;
    });
  }, [bookings]);

  const getBlockedDatesForRange = useCallback((startDate, endDate) => {
    return blockedDates.filter(block => {
      const blockDate = block.date;
      return blockDate >= startDate && blockDate <= endDate;
    });
  }, [blockedDates]);

  return (
    <StoreContext.Provider value={{
      properties, setProperties,
      addProperty, updateProperty, deleteProperty,
      pricingRules, setPricingRules,
      addPricingRule, updatePricingRule, deletePricingRule,
      bookings, addBooking, updateBookingStatus, updateBookingDetails,
      getBookingsForDate,
      blockedDates, addBlockedDate, removeBlockedDate, getBlockedDatesForRange,
      addOns, setAddOns,
      addAddOn, updateAddOn, deleteAddOn,
      getAddOnsForProperty,
      settings, updateSettings,
      isLoading,
    }}>
      {children}
    </StoreContext.Provider>
  );
}

export const useStore = () => useContext(StoreContext);
