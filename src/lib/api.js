import { supabase } from './supabase';
import { differenceInDays } from 'date-fns';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const DEFAULT_CONFIRMATION_PAGE = {
  title: 'Request Received!',
  message: "<p>We've received your booking request. An admin will review it shortly. You'll receive an email update soon.</p>",
  buttons: [{ label: 'Back to Home', url: '/', style: 'primary' }]
};

function mapPropertyFromDb(row) {
  const cp = row.confirmation_page;
  const hasConfirmation = cp && (cp.title || cp.message || cp.buttons);
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    baseNightlyRate: Number(row.base_nightly_rate),
    cleaningFee: Number(row.cleaning_fee),
    minNights: row.min_nights,
    maxGuests: row.max_guests,
    imageUrl: row.image_url,
    isActive: row.is_active,
    themeColor: row.theme_color,
    emailTemplates: row.email_templates || {},
    confirmationPage: hasConfirmation
      ? { ...DEFAULT_CONFIRMATION_PAGE, ...cp, buttons: cp.buttons || DEFAULT_CONFIRMATION_PAGE.buttons }
      : { ...DEFAULT_CONFIRMATION_PAGE },
    icalExportToken: row.ical_export_token,
    icalImportUrls: row.ical_import_urls || [],
    icalLastSyncedAt: row.ical_last_synced_at,
    rentalPolicies: row.rental_policies || null,
    webhookUrl: row.webhook_url || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPropertyToDb(data) {
  const dbData = {
    name: data.name,
    description: data.description,
    base_nightly_rate: Number(data.baseNightlyRate),
    cleaning_fee: Number(data.cleaningFee),
    min_nights: Number(data.minNights),
    max_guests: Number(data.maxGuests),
    image_url: data.imageUrl || null,
    is_active: data.isActive,
    theme_color: data.themeColor,
    email_templates: data.emailTemplates || {},
    confirmation_page: data.confirmationPage || {},
    rental_policies: data.rentalPolicies !== undefined ? data.rentalPolicies : undefined,
    webhook_url: data.webhookUrl !== undefined ? (data.webhookUrl || null) : undefined,
    updated_at: new Date().toISOString(),
  };
  if (data.icalImportUrls !== undefined) {
    dbData.ical_import_urls = data.icalImportUrls;
  }
  if (dbData.rental_policies === undefined) {
    delete dbData.rental_policies;
  }
  if (dbData.webhook_url === undefined) {
    delete dbData.webhook_url;
  }
  return dbData;
}

function mapPricingRuleFromDb(row) {
  return {
    id: row.id,
    name: row.name,
    propertyId: row.property_id,
    ruleType: row.rule_type,
    dayOfWeek: row.day_of_week,
    specificDate: row.specific_date,
    startDate: row.start_date,
    endDate: row.end_date,
    days: row.days || [],
    nightlyRate: Number(row.nightly_rate),
    priority: row.priority,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

function mapPricingRuleToDb(data) {
  return {
    name: data.name,
    property_id: data.propertyId || null,
    rule_type: data.ruleType,
    day_of_week: data.dayOfWeek !== undefined ? data.dayOfWeek : null,
    specific_date: data.specificDate || null,
    start_date: data.startDate || null,
    end_date: data.endDate || null,
    days: data.days || [],
    nightly_rate: Number(data.nightlyRate),
    priority: Number(data.priority || 0),
    is_active: data.isActive !== false,
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
    propertyIds: row.property_ids || [],
  };
}

function mapAddOnToDb(data) {
  return {
    name: data.name,
    description: data.description,
    price: Number(data.price),
    type: data.type,
    active: data.active,
    property_ids: data.propertyIds || [],
    updated_at: new Date().toISOString(),
  };
}

function mapBlockedDateFromDb(row) {
  return {
    id: row.id,
    date: row.date,
    propertyId: row.property_id,
    reason: row.reason,
    externalUid: row.external_uid,
    source: row.source || 'manual',
  };
}

function mapBookingFromDb(row, properties) {
  const property = properties?.find(p => p.id === row.property_id) || null;
  return {
    id: row.id,
    property,
    propertyId: row.property_id,
    checkInDate: row.check_in_date,
    checkOutDate: row.check_out_date,
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
    wizardButtonColor: row.wizard_button_color || null,
    standardCheckInTime: row.standard_check_in_time,
    standardCheckOutTime: row.standard_check_out_time,
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

export function calculatePriceServer(property, checkInDate, checkOutDate, rules, selectedAddOns = [], addOns = []) {
  if (!checkInDate || !checkOutDate || !property) return 0;

  const checkIn = new Date(checkInDate);
  const checkOut = new Date(checkOutDate);
  const nights = differenceInDays(checkOut, checkIn);

  if (nights < 1) return 0;

  let total = 0;

  for (let i = 0; i < nights; i++) {
    const currentDate = new Date(checkIn);
    currentDate.setDate(currentDate.getDate() + i);
    const dayOfWeek = currentDate.getDay();
    const dateString = currentDate.toISOString().split('T')[0];

    const matchingRule = rules.find(rule => {
      if (!rule.isActive) return false;
      if (rule.propertyId && rule.propertyId !== property.id) return false;

      if (rule.ruleType === 'date_override') {
        return rule.specificDate === dateString;
      }

      if (rule.ruleType === 'date_range') {
        return dateString >= rule.startDate && dateString <= rule.endDate;
      }

      if (rule.ruleType === 'day_of_week') {
        if (rule.dayOfWeek !== null && rule.dayOfWeek !== undefined) {
          return rule.dayOfWeek === dayOfWeek;
        }
        if (rule.days && rule.days.length > 0) {
          return rule.days.includes(dayOfWeek);
        }
      }

      return false;
    });

    const nightlyRate = matchingRule ? matchingRule.nightlyRate : property.baseNightlyRate;
    total += nightlyRate;
  }

  total += property.cleaningFee || 0;

  selectedAddOns.forEach(addOnId => {
    const addOn = addOns.find(a => a.id === addOnId);
    if (addOn) {
      if (addOn.type === 'flat') {
        total += addOn.price;
      } else if (addOn.type === 'per_night') {
        total += addOn.price * nights;
      }
    }
  });

  return total;
}

// ============ PROPERTIES (formerly EVENT TYPES) ============

export async function fetchProperties() {
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map(mapPropertyFromDb);
}

export async function createProperty(propertyData) {
  const dbData = mapPropertyToDb(propertyData);
  const { data, error } = await supabase
    .from('properties')
    .insert(dbData)
    .select()
    .single();
  if (error) throw error;
  return mapPropertyFromDb(data);
}

export async function updateProperty(id, propertyData) {
  const dbData = mapPropertyToDb(propertyData);
  const { data, error } = await supabase
    .from('properties')
    .update(dbData)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return mapPropertyFromDb(data);
}

export async function deleteProperty(id) {
  const { error } = await supabase
    .from('properties')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export const fetchEventTypes = fetchProperties;
export const createEventType = createProperty;
export const updateEventType = updateProperty;
export const deleteEventType = deleteProperty;

// ============ PRICING RULES ============

export async function fetchPricingRules() {
  const { data, error } = await supabase
    .from('pricing_rules')
    .select('*')
    .order('priority', { ascending: false });
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
      property_id: blockData.propertyId || null,
      reason: blockData.reason || 'Manually Blocked',
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
    wizard_button_color: settingsData.wizardButtonColor || null,
    standard_check_in_time: settingsData.standardCheckInTime || '15:00',
    standard_check_out_time: settingsData.standardCheckOutTime || '11:00',
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

export async function fetchBookings(properties) {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(row => mapBookingFromDb(row, properties));
}

export async function fetchBookingsForCalendar() {
  const { data, error } = await supabase
    .from('bookings')
    .select('id, check_in_date, check_out_date, property_id, status')
    .in('status', ['pending', 'confirmed']);
  if (error) throw error;
  return (data || []).map(row => ({
    id: row.id,
    checkInDate: row.check_in_date,
    checkOutDate: row.check_out_date,
    propertyId: row.property_id,
    status: row.status,
  }));
}

export async function createBooking(bookingData, pricingRules, addOns, properties) {
  if (!bookingData.contactName?.trim()) throw new Error('Full name is required.');
  if (!bookingData.contactEmail?.trim()) throw new Error('Email is required.');
  if (!EMAIL_REGEX.test(bookingData.contactEmail)) throw new Error('Invalid email format.');
  if (!bookingData.contactPhone?.trim()) throw new Error('Phone number is required.');
  if (!bookingData.guestCount || bookingData.guestCount < 1) throw new Error('Guest count must be at least 1.');
  if (!bookingData.descriptionOfUse?.trim()) throw new Error('Description of use is required.');
  if (!bookingData.property?.id) throw new Error('Property is required.');

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkInDate = new Date(bookingData.checkInDate + 'T00:00:00');
  if (checkInDate < today) throw new Error('Cannot book dates in the past.');

  if (bookingData.checkInDate >= bookingData.checkOutDate) {
    throw new Error('Check-out date must be after check-in date.');
  }

  const nights = differenceInDays(new Date(bookingData.checkOutDate), new Date(bookingData.checkInDate));

  if (nights < bookingData.property.minNights) {
    throw new Error(`Minimum stay is ${bookingData.property.minNights} night${bookingData.property.minNights > 1 ? 's' : ''} for this property.`);
  }

  const totalPrice = calculatePriceServer(
    bookingData.property,
    bookingData.checkInDate,
    bookingData.checkOutDate,
    pricingRules,
    bookingData.selectedAddOns || [],
    addOns
  );

  const { data, error } = await supabase.rpc('create_booking_safe', {
    p_property_id: bookingData.property.id,
    p_check_in_date: bookingData.checkInDate,
    p_check_out_date: bookingData.checkOutDate,
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
  });

  if (error) {
    if (error.message?.includes('DATE_CONFLICT')) {
      throw new Error('These dates conflict with an existing booking. Please choose different dates.');
    }
    if (error.message?.includes('BLOCKED_DATE')) {
      throw new Error('One or more dates in this range are blocked and unavailable for booking.');
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

  return mapBookingFromDb(newBooking, properties);
}

export async function updateBookingStatus(id, status, userId) {
  console.log('updateBookingStatus called. New status:', status, '| Booking ID:', id);

  const { data: existing, error: fetchError } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', id)
    .single();
  if (fetchError) throw fetchError;

  const previousStatus = existing.status;
  console.log('updateBookingStatus: previousStatus =', previousStatus, '| newStatus =', status);

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

  logAudit('booking', id, 'status_changed', userId, { status: previousStatus }, { status }).catch(() => {});

  if (status === 'confirmed' && previousStatus !== 'confirmed') {
    console.log('updateBookingStatus: condition met - firing confirmation email and webhook for booking:', id);
    triggerConfirmationEmail(id, userId).catch(() => {});
    triggerPropertyWebhook(id).catch(() => {});
  } else {
    console.log('updateBookingStatus: trigger condition NOT met (status === confirmed:', status === 'confirmed', '| previousStatus !== confirmed:', previousStatus !== 'confirmed', ')');
  }

  return data;
}

export async function updateBookingDetails(id, bookingData, version, userId, pricingRules, addOns, properties) {
  const { data: existing, error: fetchError } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', id)
    .single();
  if (fetchError) throw fetchError;

  if (existing.version !== version) {
    throw new Error('VERSION_MISMATCH: This booking was modified by another user. Please refresh and try again.');
  }

  const property = properties?.find(p => p.id === (bookingData.propertyId || bookingData.property?.id || existing.property_id));

  let totalPrice = existing.total_price;
  const datesChanged = bookingData.checkInDate !== existing.check_in_date || bookingData.checkOutDate !== existing.check_out_date;
  const propertyChanged = (bookingData.propertyId || bookingData.property?.id) !== existing.property_id;

  if ((datesChanged || propertyChanged) && property && pricingRules) {
    totalPrice = calculatePriceServer(
      property,
      bookingData.checkInDate,
      bookingData.checkOutDate,
      pricingRules,
      bookingData.selectedAddOns || existing.selected_add_on_ids || [],
      addOns
    );
  }

  const updateData = {
    contact_name: bookingData.contactName,
    contact_email: bookingData.contactEmail,
    contact_phone: bookingData.contactPhone,
    guest_count: bookingData.guestCount,
    description_of_use: bookingData.descriptionOfUse,
    notes: bookingData.notes || null,
    check_in_date: bookingData.checkInDate,
    check_out_date: bookingData.checkOutDate,
    property_id: bookingData.propertyId || bookingData.property?.id || existing.property_id,
    total_price: totalPrice,
    version: existing.version + 1,
    updated_at: new Date().toISOString(),
  };

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
    { contact_name: existing.contact_name, check_in_date: existing.check_in_date, status: existing.status },
    { contact_name: updateData.contact_name, check_in_date: updateData.check_in_date }
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

async function triggerPropertyWebhook(bookingId) {
  console.log('Webhook Trigger Initiated for booking:', bookingId);
  try {
    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fire-property-webhook`;
    console.log('Webhook Edge Function URL:', apiUrl);
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
    console.log('Webhook Edge Function response:', response.status, result);
  } catch (error) {
    console.error('Webhook Trigger Failed:', error);
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
  }
}

export { logAudit };
