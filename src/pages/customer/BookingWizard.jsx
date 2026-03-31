import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, differenceInDays, parseISO } from 'date-fns';
import { useStore } from '../../context/StoreContext';
import { Button } from '../../components/ui/Button';
import { calculatePrice } from '../../utils/pricingEngine';
import BookingCalendar from '../../components/BookingCalendar';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';
import { cn, formatCurrency } from '../../lib/utils';
import { useSearchParams } from 'react-router-dom';

const steps = ['Booking Details', 'Your Information'];

const GuestStepper = ({ label, sublabel, value, onChange, min = 0, max }) => (
  <div className="flex items-center justify-between py-3">
    <div>
      <p className="text-sm font-semibold text-gray-900">{label}</p>
      <p className="text-xs text-gray-500">{sublabel}</p>
    </div>
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className="w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center text-gray-600 hover:border-gray-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <SafeIcon icon={FiIcons.FiMinus} className="text-xs" />
      </button>
      <span className="w-6 text-center font-bold text-gray-900 text-sm">{value}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={max !== undefined && value >= max}
        className="w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center text-gray-600 hover:border-gray-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <SafeIcon icon={FiIcons.FiPlus} className="text-xs" />
      </button>
    </div>
  </div>
);

const BookingWizard = () => {
  const [searchParams] = useSearchParams();
  const {
    properties,
    pricingRules,
    getAddOnsForProperty,
    addBooking,
    settings,
    bookings,
    blockedDates,
    isLoading: storeLoading,
  } = useStore();

  const isEmbedMode = !!searchParams.get('propertyId');

  const containerRef = useRef(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [showPolicies, setShowPolicies] = useState(false);
  const [hasViewedPolicies, setHasViewedPolicies] = useState(false);
  const [agreedToPolicies, setAgreedToPolicies] = useState(false);
  const [policiesExpanded, setPoliciesExpanded] = useState(true);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showGuestPanel, setShowGuestPanel] = useState(false);
  const [showAddOnsPanel, setShowAddOnsPanel] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const calendarRef = useRef(null);
  const guestPanelRef = useRef(null);
  const addOnsPanelRef = useRef(null);

  const initialFormData = {
    property: null,
    checkInDate: '',
    checkOutDate: '',
    adults: 1,
    children: 0,
    infants: 0,
    selectedAddOns: [],
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    descriptionOfUse: '',
    notes: '',
  };

  const [formData, setFormData] = useState(initialFormData);
  const [presetPropertyId, setPresetPropertyId] = useState(null);

  const [estimatedPrice, setEstimatedPrice] = useState(0);
  const [availableAddOns, setAvailableAddOns] = useState([]);
  const [dateConflict, setDateConflict] = useState(null);

  const guestCount = formData.adults + formData.children;
  const maxGuests = formData.property?.maxGuests || 0;

  const urlButtonColor = searchParams.get('buttonColor');
  const wizardBtnColor = urlButtonColor || settings?.wizardButtonColor || null;
  const btnStyle = wizardBtnColor
    ? { backgroundColor: wizardBtnColor, borderColor: wizardBtnColor }
    : {};

  useEffect(() => {
    if (storeLoading) return;

    const propertyId = searchParams.get('propertyId');
    const checkInParam = searchParams.get('checkInDate');
    const checkOutParam = searchParams.get('checkOutDate');

    if (propertyId) {
      setPresetPropertyId(propertyId);
      const selectedProperty = properties.find(p => p.id === propertyId);
      if (selectedProperty && selectedProperty.isActive) {
        setFormData(prev => ({ ...prev, property: selectedProperty }));
      }
    }

    if (checkInParam) {
      setFormData(prev => ({ ...prev, checkInDate: checkInParam }));
    }

    if (checkOutParam) {
      setFormData(prev => ({ ...prev, checkOutDate: checkOutParam }));
    }
  }, [searchParams, properties, storeLoading]);

  useEffect(() => {
    if (formData.property) {
      const addons = getAddOnsForProperty(formData.property.id);
      setAvailableAddOns(addons);
      setFormData(prev => ({
        ...prev,
        selectedAddOns: prev.selectedAddOns.filter(id =>
          addons.some(addon => addon.id === id)
        ),
      }));
    } else {
      setAvailableAddOns([]);
    }
  }, [formData.property, getAddOnsForProperty]);

  useEffect(() => {
    if (!formData.property || !formData.checkInDate || !formData.checkOutDate) {
      setEstimatedPrice(0);
      return;
    }
    const total = calculatePrice(
      formData.property,
      formData.checkInDate,
      formData.checkOutDate,
      pricingRules,
      formData.selectedAddOns,
      availableAddOns
    );
    setEstimatedPrice(total);
  }, [
    formData.property,
    formData.checkInDate,
    formData.checkOutDate,
    formData.selectedAddOns,
    pricingRules,
    availableAddOns,
  ]);

  useEffect(() => {
    if (!formData.property || !formData.checkInDate || !formData.checkOutDate) {
      setDateConflict(null);
      return;
    }

    const propertyBookings = bookings.filter(b =>
      (b.status === 'confirmed' || b.status === 'pending') &&
      b.propertyId === formData.property.id
    );

    for (const booking of propertyBookings) {
      if (formData.checkInDate < booking.checkOutDate && formData.checkOutDate > booking.checkInDate) {
        setDateConflict({
          type: 'booking',
          message: `These dates overlap with an existing booking (${format(parseISO(booking.checkInDate), 'MMM d')} – ${format(parseISO(booking.checkOutDate), 'MMM d')})`,
        });
        return;
      }
    }

    const relevantBlockedDates = blockedDates.filter(bd => {
      if (bd.propertyId && bd.propertyId !== formData.property.id) return false;
      return bd.date >= formData.checkInDate && bd.date < formData.checkOutDate;
    });

    if (relevantBlockedDates.length > 0) {
      setDateConflict({
        type: 'blocked',
        message: `One or more dates in this range are blocked: ${relevantBlockedDates.map(bd => format(parseISO(bd.date), 'MMM d')).join(', ')}`,
      });
      return;
    }

    setDateConflict(null);
  }, [formData.checkInDate, formData.checkOutDate, formData.property, bookings, blockedDates]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (calendarRef.current && !calendarRef.current.contains(e.target)) {
        setShowCalendar(false);
      }
      if (guestPanelRef.current && !guestPanelRef.current.contains(e.target)) {
        setShowGuestPanel(false);
      }
      if (addOnsPanelRef.current && !addOnsPanelRef.current.contains(e.target)) {
        setShowAddOnsPanel(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getActualHeight = useCallback(() => {
    const body = document.body;
    const html = document.documentElement;
    return Math.max(
      body.scrollHeight, body.offsetHeight,
      html.clientHeight, html.scrollHeight, html.offsetHeight
    );
  }, []);

  const reportHeight = useCallback(() => {
    window.parent.postMessage({ type: 'BOOKING_WIDGET_RESIZE', height: getActualHeight() + 120 }, '*');
  }, [getActualHeight]);

  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver(() => reportHeight());
    resizeObserver.observe(containerRef.current);

    const mutationObserver = new MutationObserver(() => reportHeight());
    mutationObserver.observe(containerRef.current, { childList: true, subtree: true });

    reportHeight();

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [reportHeight]);

  useEffect(() => {
    reportHeight();
  }, [formData.property, formData.checkInDate, formData.checkOutDate, formData.guestCount, currentStep, agreedToPolicies, policiesExpanded, reportHeight]);

  const getNights = () => {
    if (!formData.checkInDate || !formData.checkOutDate) return 0;
    return differenceInDays(parseISO(formData.checkOutDate), parseISO(formData.checkInDate));
  };

  const isDateRangeValid = () => {
    if (!formData.checkInDate || !formData.checkOutDate) return false;
    if (formData.checkOutDate <= formData.checkInDate) return false;
    if (dateConflict) return false;
    if (formData.property && getNights() < formData.property.minNights) return false;
    return true;
  };

  const isCardValid = () => {
    return (
      formData.property &&
      isDateRangeValid() &&
      guestCount >= 1 &&
      guestCount <= maxGuests
    );
  };

  const isReviewStepValid = () => {
    return (
      formData.contactName.trim() !== '' &&
      formData.contactEmail.trim() !== '' &&
      formData.contactPhone.trim() !== '' &&
      guestCount > 0 &&
      formData.descriptionOfUse.trim() !== '' &&
      hasViewedPolicies &&
      agreedToPolicies
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSubmitError('');
    try {
      await addBooking({
        ...formData,
        guestCount,
        totalPrice: estimatedPrice,
        agreedToPolicies: true,
        policiesViewedAt: new Date().toISOString(),
      });
      setCompleted(true);
    } catch (err) {
      setSubmitError(err.message || 'Failed to submit booking. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBookAnother = () => {
    const presetProp = presetPropertyId
      ? properties.find(p => p.id === presetPropertyId)
      : null;
    setFormData({
      ...initialFormData,
      property: presetProp || null,
    });
    setCurrentStep(0);
    setCompleted(false);
    setHasViewedPolicies(false);
    setAgreedToPolicies(false);
    setSubmitError('');
    setEstimatedPrice(0);
    setShowCalendar(false);
    setShowGuestPanel(false);
    setShowAddOnsPanel(false);
  };

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return null;
    const [y, m, d] = dateStr.split('-').map(Number);
    return format(new Date(y, m - 1, d), 'MMM d, yyyy');
  };

  const buildGuestSummary = () => {
    const parts = [];
    const total = formData.adults + formData.children;
    if (total > 0) parts.push(`${total} guest${total !== 1 ? 's' : ''}`);
    if (formData.infants > 0) parts.push(`${formData.infants} infant${formData.infants !== 1 ? 's' : ''}`);
    return parts.length > 0 ? parts.join(', ') : '0 guests';
  };

  const buildAddOnsSummary = () => {
    const count = formData.selectedAddOns.length;
    return count > 0 ? `${count} add-on${count !== 1 ? 's' : ''} selected` : 'No add-ons selected';
  };

  const activePolicies = (() => {
    const prop = formData.property?.rentalPolicies;
    const hasPropertyPolicies = prop && Object.values(prop).some(v => v && v.trim() !== '');
    return hasPropertyPolicies ? prop : (settings?.rentalPolicies || {});
  })();

  const PoliciesModal = () => (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <h3 className="text-2xl font-bold text-gray-900">Rental Policies</h3>
          <button
            onClick={() => { setShowPolicies(false); setHasViewedPolicies(true); }}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <SafeIcon icon={FiIcons.FiX} className="text-2xl" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          <div>
            <h4 className="font-bold text-lg text-gray-900 mb-2">1. Booking & Payment Terms</h4>
            <p className="text-gray-700 leading-relaxed">
              {activePolicies.payment ||
                'A non-refundable deposit of 50% is required to secure your booking. The remaining balance is due 7 days prior to the check-in date.'}
            </p>
          </div>
          <div>
            <h4 className="font-bold text-lg text-gray-900 mb-2">2. Cancellation Policy</h4>
            <p className="text-gray-700 leading-relaxed">
              {activePolicies.cancellation ||
                'Cancellations made more than 30 days before the check-in date will receive a 50% refund of the deposit. Cancellations made within 30 days of check-in are non-refundable.'}
            </p>
          </div>
          <div>
            <h4 className="font-bold text-lg text-gray-900 mb-2">3. Liability & Insurance</h4>
            <p className="text-gray-700 leading-relaxed">
              {activePolicies.liability ||
                'Renters are responsible for any damage to the venue or equipment during the rental period.'}
            </p>
          </div>
          <div>
            <h4 className="font-bold text-lg text-gray-900 mb-2">4. Setup & Cleanup</h4>
            <p className="text-gray-700 leading-relaxed">
              {activePolicies.cleanup ||
                'The venue must be left in the same condition as received. Additional cleaning fees may apply if the property is not properly cleaned after your stay.'}
            </p>
          </div>
        </div>
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <Button onClick={() => { setShowPolicies(false); setHasViewedPolicies(true); }} className="w-full font-bold">
            I Have Read the Policies
          </Button>
        </div>
      </div>
    </div>
  );

  if (storeLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center max-w-2xl mx-auto py-12">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
          <SafeIcon icon={FiIcons.FiCheck} className="text-4xl text-green-700" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-3">Reservation Confirmed!</h2>
        <p className="text-gray-600 mb-8 max-w-sm">
          We've received your booking request. An admin will review it shortly and you'll receive an email confirmation soon.
        </p>
        <button
          type="button"
          onClick={handleBookAnother}
          className={cn(
            "px-8 py-3 rounded-xl font-bold text-white transition-opacity hover:opacity-90",
            !wizardBtnColor && "bg-primary"
          )}
          style={btnStyle}
        >
          Book Another Stay
        </button>
      </div>
    );
  }

  const nights = getNights();

  return (
    <div ref={containerRef} className="max-w-2xl mx-auto px-4 pt-6 pb-12 mb-12">
      <div className="flex items-center justify-between mb-8">
        {steps.map((step, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <div className={cn(
              "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors",
              idx <= currentStep
                ? "bg-gray-900 text-white border-gray-900"
                : "bg-white text-gray-400 border-gray-300"
            )}>
              {idx < currentStep ? <SafeIcon icon={FiIcons.FiCheck} className="text-xs" /> : idx + 1}
            </div>
            <span className={cn(
              "text-xs font-semibold hidden sm:block",
              idx <= currentStep ? "text-gray-900" : "text-gray-400"
            )}>{step}</span>
            {idx < steps.length - 1 && (
              <div className={cn(
                "h-px w-16 sm:w-32 mx-1 transition-colors",
                idx < currentStep ? "bg-gray-900" : "bg-gray-200"
              )} />
            )}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {currentStep === 0 && (
            <div className="space-y-4">
              {!formData.property && (
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">Choose your property</h2>
                  <p className="text-sm text-gray-500 mb-4">Select a listing to see availability and pricing.</p>
                  <div className="grid gap-3">
                    {properties.filter(p => p.isActive).map(property => (
                      <button
                        key={property.id}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, property }))}
                        className={cn(
                          "flex items-center p-4 rounded-xl border-2 text-left transition-all hover:shadow-md w-full",
                          formData.property?.id === property.id
                            ? "border-gray-900 bg-gray-50"
                            : "border-gray-200 bg-white hover:border-gray-400"
                        )}
                      >
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900">{property.name}</h3>
                          <p className="text-sm text-gray-500">{property.description}</p>
                          <p className="text-xs text-gray-400 mt-0.5">Max {property.maxGuests} guests · Min {property.minNights} night{property.minNights > 1 ? 's' : ''}</p>
                        </div>
                        <div className="text-right pl-4 flex-shrink-0">
                          <span className="block font-bold text-gray-900 text-lg">{formatCurrency(property.baseNightlyRate)}</span>
                          <span className="text-xs text-gray-400">/ night</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {formData.property && (
                <div className="rounded-xl border border-gray-200 shadow-lg overflow-hidden bg-white">
                  <div className="p-5 border-b border-gray-100">
                    <div className="flex items-start justify-between">
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">{formData.property.name}</h2>
                        <p className="text-sm text-gray-500 mt-0.5">{formData.property.description}</p>
                      </div>
                      {!isEmbedMode && (
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({
                            ...prev,
                            property: null,
                            checkInDate: '',
                            checkOutDate: '',
                            selectedAddOns: [],
                          }))}
                          className="text-xs text-gray-400 hover:text-gray-700 underline ml-3 flex-shrink-0 mt-1"
                        >
                          Change
                        </button>
                      )}
                    </div>
                    <div className="mt-3">
                      <span className="text-2xl font-bold text-gray-900">{formatCurrency(formData.property.baseNightlyRate)}</span>
                      <span className="text-gray-500 text-sm ml-1">/ night</span>
                    </div>
                  </div>

                  <div className="p-5 border-b border-gray-100" ref={calendarRef}>
                    <div
                      className={cn(
                        "border rounded-xl overflow-hidden cursor-pointer transition-colors",
                        showCalendar ? "border-gray-900" : "border-gray-200 hover:border-gray-400"
                      )}
                    >
                      <div className="grid grid-cols-2 divide-x divide-gray-200">
                        <button
                          type="button"
                          onClick={() => setShowCalendar(true)}
                          className="p-3 text-left hover:bg-gray-50 transition-colors"
                        >
                          <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-0.5">Check-in</div>
                          <div className={cn(
                            "text-sm font-semibold",
                            formData.checkInDate ? "text-gray-900" : "text-gray-400"
                          )}>
                            {formData.checkInDate ? formatDateDisplay(formData.checkInDate) : 'Add date'}
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowCalendar(true)}
                          className="p-3 text-left hover:bg-gray-50 transition-colors"
                        >
                          <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-0.5">Check-out</div>
                          <div className={cn(
                            "text-sm font-semibold",
                            formData.checkOutDate ? "text-gray-900" : "text-gray-400"
                          )}>
                            {formData.checkOutDate ? formatDateDisplay(formData.checkOutDate) : 'Add date'}
                          </div>
                        </button>
                      </div>

                      {showCalendar && (
                        <div className="border-t border-gray-200 px-4">
                          {formData.checkInDate && !formData.checkOutDate && (
                            <p className="text-xs text-gray-500 text-center pt-3">
                              {formData.property.minNights > 1
                                ? `Select checkout date — minimum ${formData.property.minNights} nights`
                                : 'Now select your check-out date'}
                            </p>
                          )}
                          {!formData.checkInDate && (
                            <p className="text-xs text-gray-500 text-center pt-3">Select your check-in date</p>
                          )}
                          <BookingCalendar
                            propertyId={formData.property.id}
                            bookings={bookings}
                            blockedDates={blockedDates}
                            checkInDate={formData.checkInDate}
                            checkOutDate={formData.checkOutDate}
                            onCheckInSelect={(date) => setFormData(prev => ({ ...prev, checkInDate: date, checkOutDate: '' }))}
                            onCheckOutSelect={(date) => {
                              setFormData(prev => ({ ...prev, checkOutDate: date }));
                              if (date) setShowCalendar(false);
                            }}
                            minNights={formData.property.minNights || 1}
                          />
                        </div>
                      )}
                    </div>

                    {dateConflict && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                        <SafeIcon icon={FiIcons.FiAlertCircle} className="text-red-500 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-red-700 font-medium">{dateConflict.message}</p>
                      </div>
                    )}

                    {formData.checkInDate && formData.checkOutDate && !dateConflict && nights > 0 && nights < formData.property.minNights && (
                      <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                        <SafeIcon icon={FiIcons.FiAlertTriangle} className="text-amber-500 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-700 font-medium">
                          Minimum {formData.property.minNights} night{formData.property.minNights > 1 ? 's' : ''} required.
                        </p>
                      </div>
                    )}

                    {isDateRangeValid() && (
                      <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                        <SafeIcon icon={FiIcons.FiCheck} className="text-green-600 flex-shrink-0" />
                        <p className="text-xs text-green-700 font-medium">
                          {nights} night{nights !== 1 ? 's' : ''} · {formatDateDisplay(formData.checkInDate)} – {formatDateDisplay(formData.checkOutDate)}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Guests dropdown */}
                  <div className="border-b border-gray-100" ref={guestPanelRef}>
                    <button
                      type="button"
                      onClick={() => setShowGuestPanel(p => !p)}
                      className="w-full p-5 flex items-center justify-between hover:bg-gray-50 transition-colors"
                    >
                      <div className="text-left">
                        <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-0.5">Guests</div>
                        <div className="text-sm font-semibold text-gray-900">{buildGuestSummary()}</div>
                      </div>
                      <SafeIcon
                        icon={showGuestPanel ? FiIcons.FiChevronUp : FiIcons.FiChevronDown}
                        className="text-gray-400 text-lg flex-shrink-0"
                      />
                    </button>

                    {showGuestPanel && (
                      <div className="px-5 pb-4 border-t border-gray-100 divide-y divide-gray-100">
                        <GuestStepper
                          label="Adults"
                          sublabel="Age 13+"
                          value={formData.adults}
                          min={1}
                          max={maxGuests - formData.children}
                          onChange={(v) => setFormData(prev => ({ ...prev, adults: v }))}
                        />
                        <GuestStepper
                          label="Children"
                          sublabel="Ages 2–12"
                          value={formData.children}
                          min={0}
                          max={maxGuests - formData.adults}
                          onChange={(v) => setFormData(prev => ({ ...prev, children: v }))}
                        />
                        <GuestStepper
                          label="Infants"
                          sublabel="Under 2"
                          value={formData.infants}
                          min={0}
                          max={99}
                          onChange={(v) => setFormData(prev => ({ ...prev, infants: v }))}
                        />
                        <p className="text-xs text-gray-400 pt-3">
                          Max {maxGuests} guests (adults + children). Infants don't count toward the limit.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Enhance your stay dropdown */}
                  {availableAddOns.length > 0 && (
                    <div className="border-b border-gray-100" ref={addOnsPanelRef}>
                      <button
                        type="button"
                        onClick={() => setShowAddOnsPanel(p => !p)}
                        className="w-full p-5 flex items-center justify-between hover:bg-gray-50 transition-colors"
                      >
                        <div className="text-left">
                          <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-0.5">Enhance your stay</div>
                          <div className="text-sm font-semibold text-gray-900">{buildAddOnsSummary()}</div>
                        </div>
                        <SafeIcon
                          icon={showAddOnsPanel ? FiIcons.FiChevronUp : FiIcons.FiChevronDown}
                          className="text-gray-400 text-lg flex-shrink-0"
                        />
                      </button>

                      {showAddOnsPanel && (
                        <div className="px-5 pb-4 border-t border-gray-100 space-y-2">
                          {availableAddOns.map(addon => {
                            const isSelected = formData.selectedAddOns.includes(addon.id);
                            const addonTotal = addon.type === 'per_night' && nights > 0 ? addon.price * nights : addon.price;

                            return (
                              <div
                                key={addon.id}
                                onClick={() => setFormData(prev => ({
                                  ...prev,
                                  selectedAddOns: isSelected
                                    ? prev.selectedAddOns.filter(id => id !== addon.id)
                                    : [...prev.selectedAddOns, addon.id],
                                }))}
                                className={cn(
                                  "flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all mt-2",
                                  isSelected ? "border-gray-900 bg-gray-50" : "border-gray-200 hover:border-gray-400"
                                )}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={cn(
                                    "w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0",
                                    isSelected ? "bg-gray-900 border-gray-900" : "border-gray-300"
                                  )}>
                                    {isSelected && <SafeIcon icon={FiIcons.FiCheck} className="text-white text-xs" />}
                                  </div>
                                  <div>
                                    <p className="text-sm font-semibold text-gray-900">{addon.name}</p>
                                    {addon.description && (
                                      <p className="text-xs text-gray-500">{addon.description}</p>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right pl-2 flex-shrink-0">
                                  <span className="text-sm font-bold text-gray-900">
                                    {nights > 0 ? formatCurrency(addonTotal) : formatCurrency(addon.price)}
                                  </span>
                                  <span className="text-xs text-gray-400 block">
                                    {addon.type === 'flat' ? 'one-time' : `${formatCurrency(addon.price)} × ${nights || '?'} nights`}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {isDateRangeValid() && (
                    <div className="p-5 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">
                          {formatCurrency(formData.property.baseNightlyRate)} × {nights} night{nights !== 1 ? 's' : ''}
                        </span>
                        <span className="font-semibold text-gray-900">
                          {formatCurrency(formData.property.baseNightlyRate * nights)}
                        </span>
                      </div>

                      {formData.property.cleaningFee > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Cleaning fee</span>
                          <span className="font-semibold text-gray-900">{formatCurrency(formData.property.cleaningFee)}</span>
                        </div>
                      )}

                      {formData.selectedAddOns.map(addonId => {
                        const addon = availableAddOns.find(a => a.id === addonId);
                        if (!addon) return null;
                        const addonTotal = addon.type === 'per_night' ? addon.price * nights : addon.price;
                        return (
                          <div key={addonId} className="flex justify-between text-sm">
                            <span className="text-gray-600">{addon.name}</span>
                            <span className="font-semibold text-gray-900">{formatCurrency(addonTotal)}</span>
                          </div>
                        );
                      })}

                      <div className="border-t border-gray-200 pt-3 flex justify-between items-center">
                        <span className="font-bold text-gray-900">Total</span>
                        <span className="font-bold text-xl text-gray-900">{formatCurrency(estimatedPrice)}</span>
                      </div>
                      <p className="text-xs text-gray-400 text-center">*Final price confirmed upon admin approval.</p>
                    </div>
                  )}
                </div>
              )}

              {formData.property && (
                <div className="bg-gray-50 rounded-lg p-3 flex items-center gap-2 text-xs text-gray-500">
                  <SafeIcon icon={FiIcons.FiInfo} className="flex-shrink-0 text-gray-400" />
                  <span>
                    Check-in: {settings?.standardCheckInTime || '3:00 PM'} · Check-out: {settings?.standardCheckOutTime || '11:00 AM'}
                  </span>
                </div>
              )}
            </div>
          )}

          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Your information</h2>
                <p className="text-sm text-gray-500 mt-1">We'll use this to confirm your booking request.</p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Enter your name"
                      className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none"
                      value={formData.contactName}
                      onChange={e => setFormData(p => ({ ...p, contactName: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      placeholder="(555) 123-4567"
                      className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none"
                      value={formData.contactPhone}
                      onChange={e => setFormData(p => ({ ...p, contactPhone: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    placeholder="your.email@example.com"
                    className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none"
                    value={formData.contactEmail}
                    onChange={e => setFormData(p => ({ ...p, contactEmail: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Description of Use <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    placeholder="Please describe your stay (e.g., family vacation, romantic getaway, group trip...)"
                    className="w-full p-3 border border-gray-300 rounded-lg h-24 bg-white text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none"
                    value={formData.descriptionOfUse}
                    onChange={e => setFormData(p => ({ ...p, descriptionOfUse: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Additional Notes</label>
                  <textarea
                    placeholder="Any other details or special requests..."
                    className="w-full p-3 border border-gray-300 rounded-lg h-20 bg-white text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none"
                    value={formData.notes}
                    onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
                  />
                </div>
              </div>

              <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-5">
                <div className="flex items-start gap-3 mb-4">
                  <SafeIcon icon={FiIcons.FiFileText} className="text-amber-600 text-xl mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <h4 className="font-bold text-gray-900">Rental Policies Agreement</h4>
                      {agreedToPolicies && (
                        <button
                          type="button"
                          onClick={() => setPoliciesExpanded(p => !p)}
                          className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 font-medium transition-colors"
                        >
                          <SafeIcon icon={policiesExpanded ? FiIcons.FiChevronUp : FiIcons.FiChevronDown} className="text-xs" />
                          {policiesExpanded ? 'Collapse' : 'Expand Rental Policies'}
                        </button>
                      )}
                    </div>
                    {policiesExpanded && (
                      <>
                        <p className="text-sm text-gray-700 mb-3 mt-1">You must read and agree to our rental policies before submitting.</p>
                        <button
                          type="button"
                          onClick={() => setShowPolicies(true)}
                          className="inline-flex items-center gap-2 text-primary font-bold text-sm hover:underline"
                        >
                          <SafeIcon icon={FiIcons.FiExternalLink} />
                          Read Rental Policies
                          {hasViewedPolicies && (
                            <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs ml-2">
                              <SafeIcon icon={FiIcons.FiCheck} className="text-xs" /> Viewed
                            </span>
                          )}
                        </button>
                      </>
                    )}
                  </div>
                </div>
                {policiesExpanded && (
                  <>
                    {hasViewedPolicies && (
                      <div
                        onClick={() => {
                          const next = !agreedToPolicies;
                          setAgreedToPolicies(next);
                          if (next) setPoliciesExpanded(false);
                        }}
                        className="flex items-start gap-3 p-4 bg-white rounded-lg border-2 border-gray-200 cursor-pointer hover:border-gray-900 transition-colors"
                      >
                        <div className={cn(
                          "w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5",
                          agreedToPolicies ? "bg-gray-900 border-gray-900" : "border-gray-400 bg-white"
                        )}>
                          {agreedToPolicies && <SafeIcon icon={FiIcons.FiCheck} className="text-white text-xs" />}
                        </div>
                        <label className="text-sm font-medium text-gray-900 cursor-pointer">
                          I have read and agree to the rental policies and terms outlined above.
                        </label>
                      </div>
                    )}
                    {!hasViewedPolicies && (
                      <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-100 p-3 rounded-lg mt-3">
                        <SafeIcon icon={FiIcons.FiAlertCircle} className="flex-shrink-0 mt-0.5" />
                        <span>You must click "Read Rental Policies" above before you can submit your request.</span>
                      </div>
                    )}
                  </>
                )}
                {!policiesExpanded && agreedToPolicies && (
                  <div className="flex items-center gap-2 text-sm text-green-700 font-medium">
                    <div className="w-4 h-4 rounded bg-green-600 flex items-center justify-center flex-shrink-0">
                      <SafeIcon icon={FiIcons.FiCheck} className="text-white text-xs" />
                    </div>
                    Policies agreed to
                  </div>
                )}
              </div>

              {submitError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                  <SafeIcon icon={FiIcons.FiAlertCircle} className="text-red-600 text-xl flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-red-900">Booking Failed</p>
                    <p className="text-sm text-red-700 mt-1">{submitError}</p>
                  </div>
                </div>
              )}

              <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 space-y-2.5">
                <h3 className="font-bold text-gray-900 pb-2 border-b border-gray-200">Booking Summary</h3>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Property</span>
                  <span className="font-semibold text-gray-900">{formData.property?.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Check-in</span>
                  <span className="font-semibold text-gray-900">{formData.checkInDate ? formatDateDisplay(formData.checkInDate) : '–'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Check-out</span>
                  <span className="font-semibold text-gray-900">{formData.checkOutDate ? formatDateDisplay(formData.checkOutDate) : '–'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Nights</span>
                  <span className="font-semibold text-gray-900">{nights} night{nights !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Guests</span>
                  <span className="font-semibold text-gray-900">{buildGuestSummary()}</span>
                </div>
                <div className="border-t border-gray-200 pt-2.5 space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">{formatCurrency(formData.property?.baseNightlyRate)} × {nights} nights</span>
                    <span className="font-semibold text-gray-900">{formatCurrency((formData.property?.baseNightlyRate || 0) * nights)}</span>
                  </div>
                  {(formData.property?.cleaningFee || 0) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Cleaning fee</span>
                      <span className="font-semibold text-gray-900">{formatCurrency(formData.property?.cleaningFee)}</span>
                    </div>
                  )}
                  {formData.selectedAddOns.map(addonId => {
                    const addon = availableAddOns.find(a => a.id === addonId);
                    if (!addon) return null;
                    const addonTotal = addon.type === 'per_night' ? addon.price * nights : addon.price;
                    return (
                      <div key={addonId} className="flex justify-between text-sm">
                        <span className="text-gray-500">{addon.name}</span>
                        <span className="font-semibold text-gray-900">{formatCurrency(addonTotal)}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="border-t border-gray-200 pt-2.5 flex justify-between items-center">
                  <span className="font-bold text-gray-900">Total</span>
                  <span className="font-bold text-xl text-primary">{formatCurrency(estimatedPrice)}</span>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="p-4 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.07)] mt-6 rounded-b-xl">
        <div className="flex gap-3 max-w-2xl mx-auto">
          {currentStep > 0 && (
            <Button
              variant="outline"
              className="flex-1 border-2 border-gray-300 text-gray-700 hover:bg-gray-50 font-bold"
              onClick={() => setCurrentStep(c => c - 1)}
            >
              <SafeIcon icon={FiIcons.FiChevronLeft} className="mr-1" />
              Back
            </Button>
          )}
          {currentStep === 0 ? (
            <button
              type="button"
              className={cn(
                "flex-1 font-bold shadow-lg text-white py-3 px-6 rounded-xl transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1",
                !wizardBtnColor && "bg-primary"
              )}
              style={btnStyle}
              onClick={() => setCurrentStep(1)}
              disabled={!isCardValid()}
            >
              Reserve
              <SafeIcon icon={FiIcons.FiChevronRight} className="ml-1" />
            </button>
          ) : (
            <button
              type="button"
              className={cn(
                "flex-1 font-bold shadow-lg text-white py-3 px-6 rounded-xl transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1",
                !wizardBtnColor && "bg-primary"
              )}
              style={btnStyle}
              onClick={handleSubmit}
              disabled={!isReviewStepValid() || loading}
            >
              {loading ? 'Submitting...' : 'Submit Request'}
            </button>
          )}
        </div>
      </div>

      {showPolicies && <PoliciesModal />}
    </div>
  );
};

export default BookingWizard;
