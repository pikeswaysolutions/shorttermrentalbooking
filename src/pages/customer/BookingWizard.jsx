import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, differenceInDays, parseISO } from 'date-fns';
import { useStore } from '../../context/StoreContext';
import { Button } from '../../components/ui/Button';
import { calculatePrice } from '../../utils/pricingEngine';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';
import { cn, formatCurrency } from '../../lib/utils';
import { useSearchParams } from 'react-router-dom';

const steps = ['Property', 'Dates & Guests', 'Add-ons', 'Review'];

const BookingWizard = () => {
  const [searchParams] = useSearchParams();
  const { properties, pricingRules, getAddOnsForProperty, addBooking, settings, bookings, blockedDates } = useStore();
  const isFromCalendar = searchParams.get('from') === 'calendar';
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [showPolicies, setShowPolicies] = useState(false);
  const [hasViewedPolicies, setHasViewedPolicies] = useState(false);
  const [agreedToPolicies, setAgreedToPolicies] = useState(false);
  const [formData, setFormData] = useState({
    property: null,
    checkInDate: '',
    checkOutDate: '',
    guestCount: 1,
    selectedAddOns: [],
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    descriptionOfUse: '',
    notes: ''
  });
  const [estimatedPrice, setEstimatedPrice] = useState(0);
  const [availableAddOns, setAvailableAddOns] = useState([]);
  const [dateConflict, setDateConflict] = useState(null);

  // Handle URL parameters for deep linking
  useEffect(() => {
    const propertyId = searchParams.get('property');
    const checkInParam = searchParams.get('checkInDate');
    const checkOutParam = searchParams.get('checkOutDate');

    // Pre-select property if provided
    if (propertyId) {
      const selectedProperty = properties.find(p => p.id === propertyId);
      if (selectedProperty && selectedProperty.isActive) {
        setFormData(prev => ({ ...prev, property: selectedProperty }));
        setCurrentStep(1);
      }
    }

    // Pre-select check-in date if provided
    if (checkInParam) {
      setFormData(prev => ({ ...prev, checkInDate: checkInParam }));
      if (!propertyId) {
        setCurrentStep(0);
      }
    }

    // Pre-select check-out date if provided
    if (checkOutParam) {
      setFormData(prev => ({ ...prev, checkOutDate: checkOutParam }));
    }
  }, [searchParams, properties]);

  // Load add-ons when property changes
  useEffect(() => {
    if (formData.property) {
      const addons = getAddOnsForProperty(formData.property.id);
      setAvailableAddOns(addons);
      setFormData(prev => ({
        ...prev,
        selectedAddOns: prev.selectedAddOns.filter(id =>
          addons.some(addon => addon.id === id)
        )
      }));
    }
  }, [formData.property, getAddOnsForProperty]);

  // Calculate price for STR booking
  useEffect(() => {
    if (!formData.property || !formData.checkInDate || !formData.checkOutDate) return;

    const total = calculatePrice(
      formData.property,
      formData.checkInDate,
      formData.checkOutDate,
      pricingRules,
      formData.selectedAddOns,
      availableAddOns
    );

    setEstimatedPrice(total);
  }, [formData.property, formData.checkInDate, formData.checkOutDate, formData.selectedAddOns, pricingRules, availableAddOns]);

  // Date range conflict detection with same-day turnover logic
  useEffect(() => {
    if (!formData.property || !formData.checkInDate || !formData.checkOutDate) {
      setDateConflict(null);
      return;
    }

    // Check for booking conflicts
    const confirmedBookings = bookings.filter(b =>
      b.status === 'confirmed' || b.status === 'pending'
    );

    for (const booking of confirmedBookings) {
      // Same-day turnover: checkout date can equal another booking's check-in date
      // Conflict only if ranges truly overlap
      if (formData.checkInDate < booking.checkOutDate && formData.checkOutDate > booking.checkInDate) {
        setDateConflict({
          type: 'booking',
          message: `These dates overlap with an existing booking (${format(parseISO(booking.checkInDate), 'MMM d')} - ${format(parseISO(booking.checkOutDate), 'MMM d')})`
        });
        return;
      }
    }

    // Check for blocked dates
    const relevantBlockedDates = blockedDates.filter(bd => {
      if (bd.propertyId && bd.propertyId !== formData.property.id) return false;
      return bd.date >= formData.checkInDate && bd.date < formData.checkOutDate;
    });

    if (relevantBlockedDates.length > 0) {
      setDateConflict({
        type: 'blocked',
        message: `One or more dates in this range are blocked: ${relevantBlockedDates.map(bd => format(parseISO(bd.date), 'MMM d')).join(', ')}`
      });
      return;
    }

    setDateConflict(null);
  }, [formData.checkInDate, formData.checkOutDate, formData.property, bookings, blockedDates]);

  const isDateRangeValid = () => {
    if (!formData.checkInDate || !formData.checkOutDate) return false;
    if (formData.checkOutDate <= formData.checkInDate) return false;
    if (dateConflict) return false;
    if (formData.property) {
      const nights = getNights();
      if (nights < formData.property.minNights) return false;
    }
    return true;
  };

  const getNights = () => {
    if (!formData.checkInDate || !formData.checkOutDate) return 0;
    return differenceInDays(parseISO(formData.checkOutDate), parseISO(formData.checkInDate));
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) setCurrentStep(c => c + 1);
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(c => c - 1);
  };

  const [submitError, setSubmitError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSubmitError('');

    try {
      await addBooking({
        ...formData,
        totalPrice: estimatedPrice,
        agreedToPolicies: true,
        policiesViewedAt: new Date().toISOString()
      });
      setCompleted(true);
    } catch (err) {
      setSubmitError(err.message || 'Failed to submit booking. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isReviewStepValid = () => {
    return (
      formData.contactName.trim() !== '' &&
      formData.contactEmail.trim() !== '' &&
      formData.contactPhone.trim() !== '' &&
      formData.guestCount > 0 &&
      formData.descriptionOfUse.trim() !== '' &&
      hasViewedPolicies &&
      agreedToPolicies
    );
  };

  const PoliciesModal = () => (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <h3 className="text-2xl font-bold text-gray-900">Rental Policies</h3>
          <button 
            onClick={() => {
              setShowPolicies(false);
              setHasViewedPolicies(true);
            }} 
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <SafeIcon icon={FiIcons.FiX} className="text-2xl" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          <div>
            <h4 className="font-bold text-lg text-gray-900 mb-2">1. Booking & Payment Terms</h4>
            <p className="text-gray-700 leading-relaxed">
              {settings.rentalPolicies?.payment || 
                "A non-refundable deposit of 50% is required to secure your booking. The remaining balance is due 7 days prior to the event date. Accepted payment methods include credit card, bank transfer, and cash."}
            </p>
          </div>
          <div>
            <h4 className="font-bold text-lg text-gray-900 mb-2">2. Cancellation Policy</h4>
            <p className="text-gray-700 leading-relaxed">
              {settings.rentalPolicies?.cancellation || 
                "Cancellations made more than 30 days before the event date will receive a 50% refund of the deposit. Cancellations made within 30 days of the event are non-refundable."}
            </p>
          </div>
          <div>
            <h4 className="font-bold text-lg text-gray-900 mb-2">3. Liability & Insurance</h4>
            <p className="text-gray-700 leading-relaxed">
              {settings.rentalPolicies?.liability || 
                "Renters are responsible for any damage to the venue or equipment during the rental period. Liability insurance is required for events with alcohol service or over 100 guests."}
            </p>
          </div>
          <div>
            <h4 className="font-bold text-lg text-gray-900 mb-2">4. Setup & Cleanup</h4>
            <p className="text-gray-700 leading-relaxed">
              {settings.rentalPolicies?.cleanup || 
                "The venue must be left in the same condition as received. Additional cleaning fees may apply if the venue is not properly cleaned after the event."}
            </p>
          </div>
        </div>
        
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <Button 
            onClick={() => {
              setShowPolicies(false);
              setHasViewedPolicies(true);
            }}
            className="w-full font-bold"
          >
            I Have Read the Policies
          </Button>
        </div>
      </div>
    </div>
  );

  if (completed) {
    const homeUrl = isFromCalendar ? '/calendar' : '/';
    const confirmation = formData.property?.confirmationPage || {
      title: 'Request Received!',
      message: "<p>We've received your booking request. An admin will review it shortly. You'll receive an email update soon.</p>",
      buttons: [{ label: 'Back to Home', url: homeUrl, style: 'primary' }]
    };

    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 text-center max-w-2xl mx-auto">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
          <SafeIcon icon={FiIcons.FiCheck} className="text-4xl text-green-700" />
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-4">{confirmation.title}</h2>

        <div
          className="text-gray-700 mb-8 prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: confirmation.message }}
        />

        <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
          {confirmation.buttons?.map((btn, idx) => {
            const btnUrl = isFromCalendar && (btn.url === '/' || btn.url === '') ? '/calendar' : btn.url;
            return (
              <Button
                key={idx}
                variant={btn.style === 'outline' ? 'outline' : 'primary'}
                onClick={() => window.location.href = btnUrl}
                className="min-w-[140px]"
              >
                {btn.label}
              </Button>
            );
          })}
          {(!confirmation.buttons || confirmation.buttons.length === 0) && (
            <Button onClick={() => window.location.href = homeUrl}>Back to Home</Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-24">
      <div className="flex justify-between mb-8 relative">
        <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-200 -z-10 -translate-y-1/2" />
        {steps.map((step, idx) => (
          <div key={idx} className="flex flex-col items-center gap-2 bg-white px-2">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors border-2",
              idx <= currentStep 
                ? "bg-primary text-white border-primary" 
                : "bg-white text-gray-500 border-gray-300"
            )}>
              {idx + 1}
            </div>
            <span className={cn(
              "text-xs font-bold hidden sm:block",
              idx <= currentStep ? "text-primary" : "text-gray-500"
            )}>{step}</span>
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
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold mb-2 text-gray-900">Choose your property</h2>
                <p className="text-sm text-gray-600">Select a property and enter the number of guests</p>
              </div>

              <div className="grid gap-4">
                {properties.filter(p => p.isActive).map(property => (
                  <button
                    key={property.id}
                    onClick={() => {
                      setFormData(prev => ({ ...prev, property }));
                    }}
                    className={cn(
                      "flex items-center p-4 rounded-xl border-2 text-left transition-all hover:shadow-md w-full",
                      formData.property?.id === property.id
                        ? "border-primary bg-blue-50"
                        : "border-gray-200 bg-white hover:border-blue-300"
                    )}
                  >
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 text-lg">{property.name}</h3>
                      <p className="text-sm text-gray-600 font-medium">{property.description}</p>
                      <p className="text-xs text-gray-500 font-medium mt-1">Max {property.maxGuests} guests</p>
                    </div>
                    <div className="text-right pl-4">
                      <span className="text-xs text-gray-500 font-medium whitespace-nowrap block">Starting at</span>
                      <span className="block font-bold text-primary text-lg">
                        {formatCurrency(property.baseNightlyRate)}/night
                      </span>
                      <span className="text-xs text-gray-500 font-medium whitespace-nowrap">Min {property.minNights} night{property.minNights > 1 ? 's' : ''}</span>
                    </div>
                  </button>
                ))}
              </div>

              {formData.property && (
                <div className="bg-white p-6 rounded-xl border-2 border-gray-200">
                  <label className="block text-sm font-bold text-gray-700 mb-3">
                    Number of Guests <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={formData.property.maxGuests}
                    placeholder="1"
                    className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    value={formData.guestCount}
                    onChange={e => {
                      const value = parseInt(e.target.value) || 0;
                      setFormData(p => ({ ...p, guestCount: value }));
                    }}
                  />
                  {formData.guestCount > formData.property.maxGuests && (
                    <p className="text-sm text-red-600 font-medium mt-2">
                      This property accommodates up to {formData.property.maxGuests} guests.
                    </p>
                  )}
                  {formData.guestCount >= 1 && formData.guestCount <= formData.property.maxGuests && (
                    <p className="text-sm text-green-600 font-medium mt-2 flex items-center gap-1">
                      <SafeIcon icon={FiIcons.FiCheck} className="text-green-600" />
                      Valid guest count
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {currentStep === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Select your dates</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                  <label className="block text-sm font-bold text-gray-700 mb-3">
                    Check-in Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none bg-gray-50 text-gray-900 font-bold text-lg cursor-pointer hover:bg-gray-100 transition-colors"
                    min={format(new Date(), 'yyyy-MM-dd')}
                    value={formData.checkInDate}
                    onChange={(e) => setFormData(p => ({ ...p, checkInDate: e.target.value }))}
                  />
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                  <label className="block text-sm font-bold text-gray-700 mb-3">
                    Check-out Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none bg-gray-50 text-gray-900 font-bold text-lg cursor-pointer hover:bg-gray-100 transition-colors"
                    min={formData.checkInDate || format(new Date(), 'yyyy-MM-dd')}
                    value={formData.checkOutDate}
                    onChange={(e) => setFormData(p => ({ ...p, checkOutDate: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-3">
                {dateConflict && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                    <SafeIcon icon={FiIcons.FiAlertCircle} className="text-red-600 text-xl flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-red-900">Date Conflict</p>
                      <p className="text-xs text-red-700 mt-1 leading-relaxed">
                        {dateConflict.message}
                      </p>
                    </div>
                  </div>
                )}

                {!dateConflict && isDateRangeValid() ? (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3">
                    <SafeIcon icon={FiIcons.FiCheck} className="text-green-600 text-xl flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-green-900">
                        {getNights()} night{getNights() !== 1 ? 's' : ''}
                      </p>
                      <p className="text-xs text-green-700 mt-1">
                        Available from {format(parseISO(formData.checkInDate), 'MMM d, yyyy')} to {format(parseISO(formData.checkOutDate), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    {formData.checkInDate && formData.checkOutDate && formData.checkOutDate <= formData.checkInDate && !dateConflict && (
                      <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700">
                        <SafeIcon icon={FiIcons.FiAlertCircle} className="text-xl flex-shrink-0" />
                        <span className="text-sm font-medium">Check-out date must be after check-in date</span>
                      </div>
                    )}
                    {formData.checkInDate && formData.checkOutDate && getNights() > 0 && getNights() < formData.property?.minNights && !dateConflict && (
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                        <SafeIcon icon={FiIcons.FiAlertTriangle} className="text-amber-600 text-xl flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-bold text-amber-900">
                            Stay too short
                          </p>
                          <p className="text-xs text-amber-700 mt-1">
                            Minimum {formData.property?.minNights} night{formData.property?.minNights > 1 ? 's' : ''} required for this property.
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <SafeIcon icon={FiIcons.FiInfo} className="text-primary flex-shrink-0" />
                  <div>
                    <p className="font-medium text-gray-700">Standard check-in: {settings?.standardCheckInTime || '3:00 PM'}</p>
                    <p className="font-medium text-gray-700">Standard check-out: {settings?.standardCheckOutTime || '11:00 AM'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Enhance your stay</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Add-ons available for <span className="font-bold text-gray-900">{formData.property?.name}</span>
                </p>
              </div>

              {availableAddOns.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                  <SafeIcon icon={FiIcons.FiPackage} className="mx-auto text-4xl text-gray-300 mb-2" />
                  <p className="text-gray-500 font-medium">No add-ons available for this property.</p>
                  <p className="text-xs text-gray-400 mt-1">You can skip this step and continue.</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {availableAddOns.map(addon => {
                    const isSelected = formData.selectedAddOns.includes(addon.id);
                    const nights = getNights();
                    const addonTotal = addon.type === 'per_night' ? addon.price * nights : addon.price;

                    return (
                      <div
                        key={addon.id}
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            selectedAddOns: isSelected
                              ? prev.selectedAddOns.filter(id => id !== addon.id)
                              : [...prev.selectedAddOns, addon.id]
                          }));
                        }}
                        className={cn(
                          "flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all",
                          isSelected ? "border-primary bg-blue-50" : "border-gray-200 bg-white hover:border-blue-300"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-5 h-5 rounded border flex items-center justify-center flex-shrink-0",
                            isSelected ? "bg-primary border-primary" : "border-gray-400 bg-white"
                          )}>
                            {isSelected && <SafeIcon icon={FiIcons.FiCheck} className="text-white text-xs" />}
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-900">{addon.name}</h4>
                            <p className="text-sm text-gray-600 font-medium">{addon.description}</p>
                          </div>
                        </div>
                        <div className="text-right pl-2">
                          {addon.type === 'flat' ? (
                            <>
                              <span className="font-bold block text-gray-900">{formatCurrency(addon.price)}</span>
                              <span className="text-xs text-gray-500 font-medium whitespace-nowrap">one-time fee</span>
                            </>
                          ) : (
                            <>
                              <span className="font-bold block text-gray-900">{formatCurrency(addonTotal)}</span>
                              <span className="text-xs text-gray-500 font-medium whitespace-nowrap">
                                {formatCurrency(addon.price)} × {nights} night{nights !== 1 ? 's' : ''}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-900">Final Details</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text"
                      placeholder="Enter your name"
                      className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
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
                      className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
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
                    className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    value={formData.contactEmail}
                    onChange={e => setFormData(p => ({ ...p, contactEmail: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Number of Guests <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="number"
                    min="1"
                    placeholder="50"
                    className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    value={formData.guestCount}
                    onChange={e => setFormData(p => ({ ...p, guestCount: parseInt(e.target.value) || 0 }))}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Description of Use <span className="text-red-500">*</span>
                  </label>
                  <textarea 
                    placeholder="Please describe how you plan to use the venue (e.g., wedding reception with dinner and dancing, corporate training session, etc.)"
                    className="w-full p-3 border border-gray-300 rounded-lg h-24 bg-white text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    value={formData.descriptionOfUse}
                    onChange={e => setFormData(p => ({ ...p, descriptionOfUse: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Additional Notes</label>
                  <textarea 
                    placeholder="Any other details or special requests..."
                    className="w-full p-3 border border-gray-300 rounded-lg h-20 bg-white text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    value={formData.notes}
                    onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
                  />
                </div>
              </div>

              <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-5">
                <div className="flex items-start gap-3 mb-4">
                  <SafeIcon icon={FiIcons.FiFileText} className="text-amber-600 text-xl mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-900 mb-2">Rental Policies Agreement</h4>
                    <p className="text-sm text-gray-700 mb-3">
                      Before submitting your booking request, you must read and agree to our rental policies.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowPolicies(true)}
                      className="inline-flex items-center gap-2 text-primary font-bold text-sm hover:underline"
                    >
                      <SafeIcon icon={FiIcons.FiExternalLink} />
                      Read Rental Policies
                      {hasViewedPolicies && (
                        <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs ml-2">
                          <SafeIcon icon={FiIcons.FiCheck} className="text-xs" />
                          Viewed
                        </span>
                      )}
                    </button>
                  </div>
                </div>

                {hasViewedPolicies && (
                  <div 
                    onClick={() => setAgreedToPolicies(!agreedToPolicies)}
                    className="flex items-start gap-3 p-4 bg-white rounded-lg border-2 border-gray-200 cursor-pointer hover:border-primary transition-colors"
                  >
                    <div className={cn(
                      "w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5",
                      agreedToPolicies ? "bg-primary border-primary" : "border-gray-400 bg-white"
                    )}>
                      {agreedToPolicies && <SafeIcon icon={FiIcons.FiCheck} className="text-white text-xs" />}
                    </div>
                    <label className="text-sm font-medium text-gray-900 cursor-pointer">
                      I have read and agree to the rental policies and terms outlined above. I understand my responsibilities as the renter.
                    </label>
                  </div>
                )}

                {!hasViewedPolicies && (
                  <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-100 p-3 rounded-lg mt-3">
                    <SafeIcon icon={FiIcons.FiAlertCircle} className="flex-shrink-0 mt-0.5" />
                    <span>You must click "Read Rental Policies" above before you can submit your request.</span>
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

              <div className="bg-gray-50 p-6 rounded-xl space-y-3 border border-gray-200">
                <h3 className="font-bold text-gray-900 border-b border-gray-200 pb-2">Booking Summary</h3>

                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 font-medium">Property</span>
                  <span className="font-bold text-gray-900">{formData.property?.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 font-medium">Check-in</span>
                  <span className="font-bold text-gray-900">{formData.checkInDate ? format(parseISO(formData.checkInDate), 'MMMM d, yyyy') : '-'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 font-medium">Check-out</span>
                  <span className="font-bold text-gray-900">{formData.checkOutDate ? format(parseISO(formData.checkOutDate), 'MMMM d, yyyy') : '-'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 font-medium">Nights</span>
                  <span className="font-bold text-gray-900">{getNights()} night{getNights() !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 font-medium">Guests</span>
                  <span className="font-bold text-gray-900">{formData.guestCount}</span>
                </div>

                <div className="border-t border-gray-200 pt-3 space-y-2">
                  <h4 className="font-bold text-sm text-gray-700 mb-2">Price Breakdown</h4>

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      Base Rate ({getNights()} × {formatCurrency(formData.property?.baseNightlyRate)}/night)
                    </span>
                    <span className="font-bold text-gray-900">
                      {formatCurrency((formData.property?.baseNightlyRate || 0) * getNights())}
                    </span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Cleaning Fee</span>
                    <span className="font-bold text-gray-900">
                      {formatCurrency(formData.property?.cleaningFee || 0)}
                    </span>
                  </div>

                  {formData.selectedAddOns.length > 0 && (
                    <div className="border-t border-gray-200 pt-2 space-y-1.5">
                      <h5 className="font-bold text-xs text-gray-600 uppercase tracking-wide">Add-ons</h5>
                      {formData.selectedAddOns.map(addonId => {
                        const addon = availableAddOns.find(a => a.id === addonId);
                        if (!addon) return null;
                        const nights = getNights();
                        const addonTotal = addon.type === 'per_night' ? addon.price * nights : addon.price;
                        return (
                          <div key={addon.id} className="flex justify-between text-sm">
                            <span className="text-gray-600">
                              {addon.name} {addon.type === 'per_night' ? `(${nights} × ${formatCurrency(addon.price)})` : '(one-time)'}
                            </span>
                            <span className="font-bold text-gray-900">{formatCurrency(addonTotal)}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="border-t border-gray-200 pt-3 flex justify-between items-center">
                  <span className="font-bold text-lg text-gray-900">Total</span>
                  <span className="font-bold text-2xl text-primary">{formatCurrency(estimatedPrice)}</span>
                </div>
                <p className="text-xs text-gray-500 font-medium text-center mt-2">
                  *Final price confirmed upon admin approval.
                </p>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
        <div className="flex gap-3 max-w-2xl mx-auto">
          {currentStep > 0 && (
            <Button 
              variant="outline" 
              className="flex-1 border-2 border-gray-300 text-gray-700 hover:bg-gray-50 font-bold" 
              onClick={handleBack}
            >
              <SafeIcon icon={FiIcons.FiChevronLeft} className="mr-1" />
              Back
            </Button>
          )}
          {currentStep < steps.length - 1 ? (
            <Button
              className="flex-1 font-bold shadow-lg text-white"
              onClick={handleNext}
              disabled={
                (currentStep === 0 && (!formData.property || formData.guestCount < 1 || formData.guestCount > (formData.property?.maxGuests || 0))) ||
                (currentStep === 1 && !isDateRangeValid())
              }
            >
              Next Step
              <SafeIcon icon={FiIcons.FiChevronRight} className="ml-1" />
            </Button>
          ) : (
            <Button 
              className="flex-1 font-bold shadow-lg text-white" 
              onClick={handleSubmit}
              isLoading={loading}
              disabled={!isReviewStepValid()}
            >
              {loading ? 'Submitting...' : 'Submit Request'}
            </Button>
          )}
        </div>
      </div>

      {showPolicies && <PoliciesModal />}
    </div>
  );
};

export default BookingWizard;