import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, set } from 'date-fns';
import { useStore } from '../../context/StoreContext';
import { Button } from '../../components/ui/Button';
import { calculatePrice } from '../../utils/pricingEngine';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';
import { cn, formatCurrency } from '../../lib/utils';
import { useSearchParams } from 'react-router-dom';

const steps = ['Event Type', 'Date & Time', 'Add-ons', 'Review'];

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

const BookingWizard = () => {
  const [searchParams] = useSearchParams();
  const { eventTypes, pricingRules, getAddOnsForEventType, addBooking, settings, getBookingsForDate } = useStore();
  const isFromCalendar = searchParams.get('from') === 'calendar';
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [showPolicies, setShowPolicies] = useState(false);
  const [hasViewedPolicies, setHasViewedPolicies] = useState(false);
  const [agreedToPolicies, setAgreedToPolicies] = useState(false);
  const [formData, setFormData] = useState({
    eventType: null,
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: '10:00',
    endTime: '14:00',
    selectedAddOns: [],
    guestCount: 50,
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    descriptionOfUse: '',
    notes: ''
  });
  const [estimatedPrice, setEstimatedPrice] = useState(0);
  const [availableAddOns, setAvailableAddOns] = useState([]);
  const [timeConflict, setTimeConflict] = useState(null);

  // Handle URL parameters for deep linking
  useEffect(() => {
    const eventTypeId = searchParams.get('eventType');
    const dateParam = searchParams.get('date');
    
    // Pre-select event type if provided
    if (eventTypeId) {
      const selectedType = eventTypes.find(et => et.id === eventTypeId);
      if (selectedType && selectedType.active) {
        setFormData(prev => ({ ...prev, eventType: selectedType }));
        setCurrentStep(1); // Skip to date/time step
      }
    }
    
    // Pre-select date if provided
    if (dateParam) {
      try {
        const parsedDate = new Date(dateParam);
        if (!isNaN(parsedDate.getTime())) {
          setFormData(prev => ({ ...prev, date: format(parsedDate, 'yyyy-MM-dd') }));
          if (!eventTypeId) {
            // If only date is provided, stay on event type selection
            setCurrentStep(0);
          }
        }
      } catch (e) {
        console.error('Invalid date parameter');
      }
    }
  }, [searchParams, eventTypes]);

  const unavailableTimes = useMemo(() => {
    if (!formData.date) return [];
    const bookings = getBookingsForDate(formData.date);
    return bookings.map(b => {
      const start = new Date(`${b.date}T${b.startTime}`);
      const end = new Date(`${b.date}T${b.endTime}`);
      return {
        start,
        end,
        display: `${format(start, 'h:mm a')} - ${format(end, 'h:mm a')}`
      };
    });
  }, [formData.date, getBookingsForDate]);

  useEffect(() => {
    if (formData.eventType) {
      const addons = getAddOnsForEventType(formData.eventType.id);
      setAvailableAddOns(addons);
      setFormData(prev => ({
        ...prev,
        selectedAddOns: prev.selectedAddOns.filter(id => 
          addons.some(addon => addon.id === id)
        )
      }));
    }
  }, [formData.eventType, getAddOnsForEventType]);

  useEffect(() => {
    if (!formData.eventType || !formData.date || !formData.startTime || !formData.endTime) return;
    const start = new Date(`${formData.date}T${formData.startTime}`);
    const end = new Date(`${formData.date}T${formData.endTime}`);
    if (end <= start) return;

    let total = calculatePrice(formData.eventType, start, end, pricingRules);
    formData.selectedAddOns.forEach(id => {
      const addon = availableAddOns.find(a => a.id === id);
      if (addon) {
        if (addon.type === 'flat') total += addon.price;
        if (addon.type === 'hourly') {
          const hours = (end - start) / (1000 * 60 * 60);
          total += addon.price * hours;
        }
      }
    });
    setEstimatedPrice(total);
  }, [formData, pricingRules, availableAddOns]);

  useEffect(() => {
    if (!formData.eventType || !formData.date || !formData.startTime || !formData.endTime) {
      setTimeConflict(null);
      return;
    }

    const existingBookings = getBookingsForDate(formData.date);
    const requestedStart = new Date(`${formData.date}T${formData.startTime}`);
    const requestedEnd = new Date(`${formData.date}T${formData.endTime}`);
    const cooldownHours = formData.eventType.cooldownHours ?? 1;

    for (const booking of existingBookings) {
      const bookingStart = new Date(`${booking.date}T${booking.startTime}`);
      const bookingEnd = new Date(`${booking.date}T${booking.endTime}`);
      const bookingEndWithCooldown = new Date(bookingEnd.getTime() + cooldownHours * 60 * 60 * 1000);

      const hasConflict = 
        (requestedStart >= bookingStart && requestedStart < bookingEndWithCooldown) ||
        (requestedEnd > bookingStart && requestedEnd <= bookingEndWithCooldown) ||
        (requestedStart <= bookingStart && requestedEnd >= bookingEndWithCooldown) ||
        (requestedStart < bookingStart && requestedEnd > bookingEndWithCooldown);

      if (hasConflict) {
        setTimeConflict({
          bookingEnd: format(bookingEnd, 'h:mm a'),
          cooldownHours,
          earliestStart: format(bookingEndWithCooldown, 'h:mm a'),
          eventName: booking.eventType?.name || 'Another event'
        });
        return;
      }
    }
    setTimeConflict(null);
  }, [formData.date, formData.startTime, formData.endTime, formData.eventType, getBookingsForDate]);

  const isDateTimeValid = () => {
    if (!formData.date || !formData.startTime || !formData.endTime) return false;
    const start = new Date(`${formData.date}T${formData.startTime}`);
    const end = new Date(`${formData.date}T${formData.endTime}`);
    if (end <= start) return false;
    if (timeConflict) return false;
    if (formData.eventType) {
      const durationHours = (end - start) / (1000 * 60 * 60);
      if (durationHours < formData.eventType.minDuration) return false;
    }
    return true;
  };

  const getDurationHours = () => {
    if (!formData.startTime || !formData.endTime) return 0;
    const start = new Date(`${formData.date}T${formData.startTime}`);
    const end = new Date(`${formData.date}T${formData.endTime}`);
    return (end - start) / (1000 * 60 * 60);
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
    const confirmation = formData.eventType?.confirmationPage || {
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
            <div className="space-y-4">
              <h2 className="text-xl font-bold mb-4 text-gray-900">What kind of event is it?</h2>
              <div className="grid gap-4">
                {eventTypes.filter(et => et.active).map(type => (
                  <button
                    key={type.id}
                    onClick={() => {
                      setFormData(prev => ({ ...prev, eventType: type }));
                      handleNext();
                    }}
                    className={cn(
                      "flex items-center p-4 rounded-xl border-2 text-left transition-all hover:shadow-md w-full",
                      formData.eventType?.id === type.id 
                        ? "border-primary bg-blue-50" 
                        : "border-gray-200 bg-white hover:border-blue-300"
                    )}
                  >
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 text-lg">{type.name}</h3>
                      <p className="text-sm text-gray-600 font-medium">{type.description}</p>
                    </div>
                    <div className="text-right pl-4">
                      <span className="text-xs text-gray-500 font-medium whitespace-nowrap block">Starting at</span>
                      <span className="block font-bold text-primary text-lg">
                        {formatCurrency(type.baseRate)}/hr
                      </span>
                      <span className="text-xs text-gray-500 font-medium whitespace-nowrap">Min {type.minDuration} hrs</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {currentStep === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Select date & time</h2>
              
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <label className="text-lg font-bold text-gray-900">Date</label>
                  <div className="text-sm text-gray-500 font-medium">
                    {format(new Date(formData.date), 'MMMM yyyy')}
                  </div>
                </div>
                <input 
                  type="date" 
                  className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none bg-gray-50 text-gray-900 font-bold text-lg cursor-pointer hover:bg-gray-100 transition-colors"
                  min={format(new Date(), 'yyyy-MM-dd')}
                  value={formData.date}
                  onChange={(e) => setFormData(p => ({ ...p, date: e.target.value }))}
                />

                {unavailableTimes.length > 0 && (
                  <div className="mt-6 text-center">
                    <p className="text-sm text-gray-400 font-medium mb-2">Space is unavailable:</p>
                    <div className="space-y-1">
                      {unavailableTimes.map((time, idx) => (
                        <p key={idx} className="text-sm font-medium text-gray-500">
                          {time.display}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <label className="block text-center text-sm font-bold text-gray-400 mb-2 uppercase tracking-wider">Start</label>
                  <div className="relative">
                    <select
                      value={formData.startTime}
                      onChange={(e) => setFormData(p => ({ ...p, startTime: e.target.value }))}
                      className="w-full p-4 bg-gray-50 border-2 border-transparent hover:border-gray-200 rounded-xl text-center font-bold text-xl text-gray-900 focus:ring-2 focus:ring-primary focus:bg-white outline-none appearance-none cursor-pointer transition-all"
                    >
                      {TIME_SLOTS.map(slot => (
                        <option key={`start-${slot.value}`} value={slot.value}>
                          {slot.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="text-gray-400 font-medium pt-6">to</div>

                <div className="flex-1">
                  <label className="block text-center text-sm font-bold text-gray-400 mb-2 uppercase tracking-wider">End</label>
                  <div className="relative">
                    <select
                      value={formData.endTime}
                      onChange={(e) => setFormData(p => ({ ...p, endTime: e.target.value }))}
                      className="w-full p-4 bg-gray-50 border-2 border-transparent hover:border-gray-200 rounded-xl text-center font-bold text-xl text-gray-900 focus:ring-2 focus:ring-primary focus:bg-white outline-none appearance-none cursor-pointer transition-all"
                    >
                      {TIME_SLOTS.map(slot => (
                        <option key={`end-${slot.value}`} value={slot.value}>
                          {slot.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {timeConflict && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                    <SafeIcon icon={FiIcons.FiAlertCircle} className="text-red-600 text-xl flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-red-900">Time Conflict</p>
                      <p className="text-xs text-red-700 mt-1 leading-relaxed">
                        {timeConflict.eventName} ends at {timeConflict.bookingEnd}.<br/>
                        With the {timeConflict.cooldownHours}-hour cooldown, earliest start is <strong>{timeConflict.earliestStart}</strong>.
                      </p>
                    </div>
                  </div>
                )}
                
                {!timeConflict && isDateTimeValid() ? (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3">
                    <SafeIcon icon={FiIcons.FiCheck} className="text-green-600 text-xl flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-green-900">
                        {getDurationHours().toFixed(1)} hours
                      </p>
                      <p className="text-xs text-green-700 mt-1">
                        Valid duration for {formData.eventType?.name}
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    {getDurationHours() <= 0 && !timeConflict && (
                      <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700">
                        <SafeIcon icon={FiIcons.FiAlertCircle} className="text-xl flex-shrink-0" />
                        <span className="text-sm font-medium">End time must be after start time</span>
                      </div>
                    )}
                    {getDurationHours() > 0 && getDurationHours() < formData.eventType?.minDuration && !timeConflict && (
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                        <SafeIcon icon={FiIcons.FiAlertTriangle} className="text-amber-600 text-xl flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-bold text-amber-900">
                            Duration too short
                          </p>
                          <p className="text-xs text-amber-700 mt-1">
                            Minimum {formData.eventType?.minDuration} hours required.
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="flex items-center justify-center gap-2">
                <p className="text-xs text-gray-500 text-center">
                  * Ensure the times you select include the time required for set up and tear down
                </p>
                <button
                  type="button"
                  onClick={() => setShowPolicies(true)}
                  className="text-primary hover:text-blue-700 transition-colors"
                  title="View rental policies for details"
                >
                  <SafeIcon icon={FiIcons.FiInfo} className="text-base" />
                </button>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Enhance your event</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Add-ons available for <span className="font-bold text-gray-900">{formData.eventType?.name}</span>
                </p>
              </div>
              
              {availableAddOns.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                  <SafeIcon icon={FiIcons.FiPackage} className="mx-auto text-4xl text-gray-300 mb-2" />
                  <p className="text-gray-500 font-medium">No add-ons available for this event type.</p>
                  <p className="text-xs text-gray-400 mt-1">You can skip this step and continue.</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {availableAddOns.map(addon => {
                    const isSelected = formData.selectedAddOns.includes(addon.id);
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
                          <span className="font-bold block text-gray-900">{formatCurrency(addon.price)}</span>
                          <span className="text-xs text-gray-500 font-medium whitespace-nowrap">{addon.type === 'hourly' ? '/hr' : 'flat'}</span>
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
                  <span className="text-gray-600 font-medium">Event Type</span>
                  <span className="font-bold text-gray-900">{formData.eventType?.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 font-medium">Date</span>
                  <span className="font-bold text-gray-900">{format(new Date(formData.date), 'MMMM do, yyyy')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 font-medium">Time</span>
                  <span className="font-bold text-gray-900">
                    {TIME_SLOTS.find(t => t.value === formData.startTime)?.label} - {TIME_SLOTS.find(t => t.value === formData.endTime)?.label}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 font-medium">Duration</span>
                  <span className="font-bold text-gray-900">{getDurationHours().toFixed(1)} hours</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 font-medium">Number of Guests</span>
                  <span className="font-bold text-gray-900">{formData.guestCount}</span>
                </div>
                {formData.selectedAddOns.length > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 font-medium">Add-ons</span>
                    <span className="font-bold text-gray-900">{formData.selectedAddOns.length} selected</span>
                  </div>
                )}
                <div className="border-t border-gray-200 pt-3 flex justify-between items-center">
                  <span className="font-bold text-lg text-gray-900">Estimated Total</span>
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
                (currentStep === 0 && !formData.eventType) ||
                (currentStep === 1 && !isDateTimeValid())
              }
            >
              {currentStep === 1 ? 'Select Time' : 'Next Step'}
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