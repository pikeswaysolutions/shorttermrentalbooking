import { supabase } from './supabase';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const DEFAULT_CONFIRMATION_PAGE = {
  title: 'Request Received!',
  message: "<p>We've received your booking request. An admin will review it shortly. You'll receive an email update soon.</p>",
  buttons: [{ label: 'Back to Home', url: '/', style: 'primary' }]
};

function mapEventTypeFromDb(row) {
  const cp = row.confirmation_page;
  const hasConfirmation = cp && (cp.title || cp.message || cp.buttons);
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    baseRate: Number(row.base_rate),
    minDuration: row.min_duration,
    cooldownHours: row.cooldown_hours,
    active: row.active,
    color: row.color,
    emailTemplates: row.email_templates || {},
    confirmationPage: hasConfirmation
      ? { ...DEFAULT_CONFIRMATION_PAGE, ...cp, buttons: cp.buttons || DEFAULT_CONFIRMATION_PAGE.buttons }
      : { ...DEFAULT_CONFIRMATION_PAGE },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapEventTypeToDb(data) {
  return {
    name: data.name,
    description: data.description,
    base_rate: Number(data.baseRate),
    min_duration: Number(data.minDuration),
    cooldown_hours: Number(data.cooldownHours),
    active: data.active,
    color: data.color,
    email_templates: data.emailTemplates || {},
    confirmation_page: data.confirmationPage || {},
    updated_at: new Date().toISOString(),
  };
}

function mapPricingRuleFromDb(row) {
  return {
    id: row.id,
    name: row.name,
    eventTypeId: row.event_type_id,
    days: row.days || [],
    startTime: row.start_time?.slice(0, 5),
    endTime: row.end_time?.slice(0, 5),
    hourlyRate: Number(row.hourly_rate),
  };
}

function mapPricingRuleToDb(data) {
  return {
    name: data.name,
    event_type_id: data.eventTypeId || null,
    days: data.days,
    start_time: data.startTime,
    end_time: data.endTime,
    hourly_rate: Number(data.hourlyRate),
    updated_at: new Date().toISOString(),
  };
}

function mapAddOnFromDb(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    price: Number(row.price),
    type: row.type,
    active: row.active,
    eventTypeIds: row.event_type_ids || [],
  };
}

function mapAddOnToDb(data) {
  return {
    name: data.name,
    description: data.description,
    price: Number(data.price),
    type: data.type,
    active: data.active,
    event_type_ids: data.eventTypeIds || [],
    updated_at: new Date().toISOString(),
  };
}

function mapBlockedDateFromDb(row) {
  return {
    id: row.id,
    date: row.date,
    reason: row.reason,
    isFullDay: row.is_full_day,
    startTime: row.start_time?.slice(0, 5) || null,
    endTime: row.end_time?.slice(0, 5) || null,
  };
}

function mapBookingFromDb(row, eventTypes) {
  const eventType = eventTypes?.find(et => et.id === row.event_type_id) || null;
  return {
    id: row.id,
    eventType,
    eventTypeId: row.event_type_id,
    date: row.date,
    startTime: row.start_time?.slice(0, 5),
    endTime: row.end_time?.slice(0, 5),
    startDate: row.start_date,
    endDate: row.end_date,
    contactName: row.contact_name,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    guestCount: row.guest_count,
    descriptionOfUse: row.description_of_use,
    notes: row.notes,
    selectedAddOns: row.selected_add_on_ids || [],
    totalPrice: Number(row.total_price),
    status: row.status,
    agreedToPolicies: row.agreed_to_policies,
    policiesViewedAt: row.policies_viewed_at,
    emailStatus: row.email_status,
    followupEmailSent: row.followup_email_sent,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSettingsFromDb(row) {
  return {
    primaryColor: row.primary_color,
    accentColor: row.accent_color,
    companyName: row.company_name,
    logo: row.logo,
    rentalPolicies: row.rental_policies || {},
    apiKeys: {
      resendApiKey: row.api_keys_encrypted
        ? maskApiKey(row.api_keys_encrypted)
        : '',
    },
    _rawApiKeysEncrypted: row.api_keys_encrypted,
  };
}

function maskApiKey(key) {
  if (!key || key.length < 8) return '****';
  return key.slice(0, 3) + '****' + key.slice(-4);
}

export function calculatePriceServer(eventType, startDateStr, endDateStr, rules) {
  if (!startDateStr || !endDateStr) return 0;

  let totalPrice = 0;
  let current = new Date(startDateStr);
  const end = new Date(endDateStr);

  while (current < end) {
    const dayOfWeek = current.getDay();
    const hours = current.getHours().toString().padStart(2, '0');
    const mins = current.getMinutes().toString().padStart(2, '0');
    const timeString = `${hours}:${mins}`;

    const matchingRule = rules.find(rule => {
      if (rule.eventTypeId && rule.eventTypeId !== eventType.id) return false;
      if (rule.days && !rule.days.includes(dayOfWeek)) return false;
      if (rule.startTime && rule.endTime) {
        return timeString >= rule.startTime && timeString < rule.endTime;
      }
      return true;
    });

    const hourlyRate = matchingRule ? matchingRule.hourlyRate : (eventType.baseRate || 0);
    totalPrice += hourlyRate / 2;
    current = new Date(current.getTime() + 30 * 60 * 1000);
  }

  return totalPrice;
}

// ============ EVENT TYPES ============

export async function fetchEventTypes() {
  const { data, error } = await supabase
    .from('event_types')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map(mapEventTypeFromDb);
}

export async function createEventType(eventTypeData) {
  const dbData = mapEventTypeToDb(eventTypeData);
  const { data, error } = await supabase
    .from('event_types')
    .insert(dbData)
    .select()
    .single();
  if (error) throw error;
  return mapEventTypeFromDb(data);
}

export async function updateEventType(id, eventTypeData) {
  const dbData = mapEventTypeToDb(eventTypeData);
  const { data, error } = await supabase
    .from('event_types')
    .update(dbData)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return mapEventTypeFromDb(data);
}

export async function deleteEventType(id) {
  const { error } = await supabase
    .from('event_types')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ============ PRICING RULES ============

export async function fetchPricingRules() {
  const { data, error } = await supabase
    .from('pricing_rules')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map(mapPricingRuleFromDb);
}

export async function createPricingRule(ruleData) {
  const dbData = mapPricingRuleToDb(ruleData);
  const { data, error } = await supabase
    .from('pricing_rules')
    .insert(dbData)
    .select()
    .single();
  if (error) throw error;
  return mapPricingRuleFromDb(data);
}

export async function updatePricingRule(id, ruleData) {
  const dbData = mapPricingRuleToDb(ruleData);
  const { data, error } = await supabase
    .from('pricing_rules')
    .update(dbData)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return mapPricingRuleFromDb(data);
}

export async function deletePricingRule(id) {
  const { error } = await supabase
    .from('pricing_rules')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ============ ADD-ONS ============

export async function fetchAddOns() {
  const { data, error } = await supabase
    .from('add_ons')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map(mapAddOnFromDb);
}

export async function createAddOn(addOnData) {
  const dbData = mapAddOnToDb(addOnData);
  const { data, error } = await supabase
    .from('add_ons')
    .insert(dbData)
    .select()
    .single();
  if (error) throw error;
  return mapAddOnFromDb(data);
}

export async function updateAddOn(id, addOnData) {
  const dbData = mapAddOnToDb(addOnData);
  const { data, error } = await supabase
    .from('add_ons')
    .update(dbData)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return mapAddOnFromDb(data);
}

export async function deleteAddOn(id) {
  const { error } = await supabase
    .from('add_ons')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ============ BLOCKED DATES ============

export async function fetchBlockedDates() {
  const { data, error } = await supabase
    .from('blocked_dates')
    .select('*')
    .order('date', { ascending: true });
  if (error) throw error;
  return (data || []).map(mapBlockedDateFromDb);
}

export async function createBlockedDate(blockData) {
  const { data, error } = await supabase
    .from('blocked_dates')
    .insert({
      date: blockData.date,
      reason: blockData.reason || 'Manually Blocked',
      is_full_day: blockData.isFullDay !== false,
      start_time: blockData.startTime || null,
      end_time: blockData.endTime || null,
    })
    .select()
    .single();
  if (error) throw error;
  return mapBlockedDateFromDb(data);
}

export async function deleteBlockedDate(id) {
  const { error } = await supabase
    .from('blocked_dates')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ============ SETTINGS ============

export async function fetchSettings() {
  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapSettingsFromDb(data);
}

export async function updateSettings(settingsData) {
  const dbData = {
    primary_color: settingsData.primaryColor,
    accent_color: settingsData.accentColor,
    company_name: settingsData.companyName,
    logo: settingsData.logo || null,
    rental_policies: settingsData.rentalPolicies || {},
    updated_at: new Date().toISOString(),
  };

  if (settingsData.apiKeys?.resendApiKey &&
      !settingsData.apiKeys.resendApiKey.includes('****')) {
    dbData.api_keys_encrypted = settingsData.apiKeys.resendApiKey;
  }

  const { data, error } = await supabase
    .from('settings')
    .upsert({ id: 1, ...dbData })
    .select()
    .single();
  if (error) throw error;

  await logAudit('settings', '1', 'updated', null);

  return mapSettingsFromDb(data);
}

// ============ BOOKINGS ============

export async function fetchBookings(eventTypes) {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(row => mapBookingFromDb(row, eventTypes));
}

export async function fetchBookingsForCalendar() {
  const { data, error } = await supabase
    .from('bookings')
    .select('id, date, start_time, end_time, event_type_id, status')
    .in('status', ['pending', 'confirmed']);
  if (error) throw error;
  return (data || []).map(row => ({
    id: row.id,
    date: row.date,
    startTime: row.start_time?.slice(0, 5),
    endTime: row.end_time?.slice(0, 5),
    eventTypeId: row.event_type_id,
    status: row.status,
  }));
}

export async function createBooking(bookingData, pricingRules, addOns, eventTypes) {
  if (!bookingData.contactName?.trim()) throw new Error('Full name is required.');
  if (!bookingData.contactEmail?.trim()) throw new Error('Email is required.');
  if (!EMAIL_REGEX.test(bookingData.contactEmail)) throw new Error('Invalid email format.');
  if (!bookingData.contactPhone?.trim()) throw new Error('Phone number is required.');
  if (!bookingData.guestCount || bookingData.guestCount < 1) throw new Error('Guest count must be at least 1.');
  if (!bookingData.descriptionOfUse?.trim()) throw new Error('Description of use is required.');
  if (!bookingData.eventType?.id) throw new Error('Event type is required.');

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const bookingDate = new Date(bookingData.date + 'T00:00:00');
  if (bookingDate < today) throw new Error('Cannot book dates in the past.');

  if (bookingData.startTime >= bookingData.endTime) throw new Error('End time must be after start time.');

  const startDate = new Date(`${bookingData.date}T${bookingData.startTime}`);
  const endDate = new Date(`${bookingData.date}T${bookingData.endTime}`);
  const durationHours = (endDate - startDate) / (1000 * 60 * 60);

  if (durationHours < bookingData.eventType.minDuration) {
    throw new Error(`Minimum duration is ${bookingData.eventType.minDuration} hours for this event type.`);
  }

  let totalPrice = calculatePriceServer(bookingData.eventType, startDate.toISOString(), endDate.toISOString(), pricingRules);

  (bookingData.selectedAddOns || []).forEach(addOnId => {
    const addon = addOns.find(a => a.id === addOnId);
    if (addon) {
      if (addon.type === 'flat') totalPrice += addon.price;
      if (addon.type === 'hourly') totalPrice += addon.price * durationHours;
    }
  });

  const { data, error } = await supabase.rpc('create_booking_safe', {
    p_event_type_id: bookingData.eventType.id,
    p_date: bookingData.date,
    p_start_time: bookingData.startTime,
    p_end_time: bookingData.endTime,
    p_start_date: startDate.toISOString(),
    p_end_date: endDate.toISOString(),
    p_contact_name: bookingData.contactName.trim(),
    p_contact_email: bookingData.contactEmail.trim().toLowerCase(),
    p_contact_phone: bookingData.contactPhone.trim(),
    p_guest_count: bookingData.guestCount,
    p_description_of_use: bookingData.descriptionOfUse.trim(),
    p_notes: bookingData.notes?.trim() || null,
    p_selected_add_on_ids: bookingData.selectedAddOns || [],
    p_total_price: totalPrice,
    p_agreed_to_policies: true,
    p_policies_viewed_at: new Date().toISOString(),
    p_cooldown_hours: bookingData.eventType.cooldownHours || 1,
  });

  if (error) {
    if (error.message?.includes('TIME_CONFLICT')) {
      throw new Error('This time slot conflicts with an existing booking. Please choose a different time.');
    }
    if (error.message?.includes('BLOCKED_DATE')) {
      throw new Error('This date/time is blocked and unavailable for booking.');
    }
    if (error.message?.includes('bookings_no_duplicate')) {
      throw new Error('A booking with these details already exists.');
    }
    throw error;
  }

  const bookingId = data;

  const { data: newBooking } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .single();

  return mapBookingFromDb(newBooking, eventTypes);
}

export async function updateBookingStatus(id, status, userId) {
  const { data: existing, error: fetchError } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', id)
    .single();
  if (fetchError) throw fetchError;

  const previousStatus = existing.status;

  const { data, error } = await supabase
    .from('bookings')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;

  await logAudit('booking', id, 'status_changed', userId, { status: previousStatus }, { status });

  if (status === 'confirmed' && previousStatus !== 'confirmed') {
    triggerConfirmationEmail(id, userId).catch(() => {});
  }

  return data;
}

export async function updateBookingDetails(id, bookingData, version, userId, pricingRules, addOns, eventTypes) {
  const { data: existing, error: fetchError } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', id)
    .single();
  if (fetchError) throw fetchError;

  if (existing.version !== version) {
    throw new Error('VERSION_MISMATCH: This booking was modified by another user. Please refresh and try again.');
  }

  const eventType = eventTypes?.find(et => et.id === (bookingData.eventTypeId || bookingData.eventType?.id || existing.event_type_id));

  let totalPrice = existing.total_price;
  const dateChanged = bookingData.date !== existing.date;
  const timeChanged = bookingData.startTime !== existing.start_time?.slice(0, 5) || bookingData.endTime !== existing.end_time?.slice(0, 5);
  const typeChanged = (bookingData.eventTypeId || bookingData.eventType?.id) !== existing.event_type_id;

  if ((dateChanged || timeChanged || typeChanged) && eventType && pricingRules) {
    const startDate = new Date(`${bookingData.date}T${bookingData.startTime}`);
    const endDate = new Date(`${bookingData.date}T${bookingData.endTime}`);
    const durationHours = (endDate - startDate) / (1000 * 60 * 60);

    totalPrice = calculatePriceServer(eventType, startDate.toISOString(), endDate.toISOString(), pricingRules);

    const addOnIds = bookingData.selectedAddOns || existing.selected_add_on_ids || [];
    addOnIds.forEach(addOnId => {
      const addon = addOns?.find(a => a.id === addOnId);
      if (addon) {
        if (addon.type === 'flat') totalPrice += addon.price;
        if (addon.type === 'hourly') totalPrice += addon.price * durationHours;
      }
    });
  }

  const updateData = {
    contact_name: bookingData.contactName,
    contact_email: bookingData.contactEmail,
    contact_phone: bookingData.contactPhone,
    guest_count: bookingData.guestCount,
    description_of_use: bookingData.descriptionOfUse,
    notes: bookingData.notes || null,
    date: bookingData.date,
    start_time: bookingData.startTime,
    end_time: bookingData.endTime,
    event_type_id: bookingData.eventTypeId || bookingData.eventType?.id || existing.event_type_id,
    total_price: totalPrice,
    version: existing.version + 1,
    updated_at: new Date().toISOString(),
  };

  if (dateChanged || timeChanged) {
    updateData.start_date = new Date(`${bookingData.date}T${bookingData.startTime}`).toISOString();
    updateData.end_date = new Date(`${bookingData.date}T${bookingData.endTime}`).toISOString();
  }

  const { data, error } = await supabase
    .from('bookings')
    .update(updateData)
    .eq('id', id)
    .eq('version', version)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw new Error('VERSION_MISMATCH: This booking was modified by another user. Please refresh and try again.');
    }
    throw error;
  }

  await logAudit('booking', id, 'updated', userId,
    { contact_name: existing.contact_name, date: existing.date, status: existing.status },
    { contact_name: updateData.contact_name, date: updateData.date }
  );

  return data;
}

// ============ EMAIL ============

async function triggerConfirmationEmail(bookingId, userId) {
  try {
    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-confirmation-email`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ bookingId }),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      await supabase.from('bookings').update({ email_status: 'failed' }).eq('id', bookingId);
      await supabase.from('email_logs').insert({
        booking_id: bookingId,
        type: 'confirmation',
        status: 'failed',
        error_message: result.error || `Edge function returned ${response.status}`,
      });
    }

    await logAudit('email', bookingId, 'confirmation_attempted', userId);
  } catch (err) {
    await supabase.from('bookings').update({ email_status: 'failed' }).eq('id', bookingId);
    await supabase.from('email_logs').insert({
      booking_id: bookingId,
      type: 'confirmation',
      status: 'failed',
      error_message: `Client error: ${err.message}`,
    });
  }
}

// ============ AUDIT LOG ============

async function logAudit(entityType, entityId, action, performedBy, previousValue, newValue) {
  try {
    await supabase.from('audit_logs').insert({
      entity_type: entityType,
      entity_id: entityId,
      action,
      performed_by: performedBy || null,
      previous_value: previousValue || null,
      new_value: newValue || null,
    });
  } catch {
    // audit logging should never block operations
  }
}

export { logAudit };
