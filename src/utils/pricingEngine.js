import { addDays, differenceInDays, getDay, parseISO } from 'date-fns';

export function calculatePrice(property, checkInDate, checkOutDate, pricingRules, selectedAddOns = [], addOns = []) {
  if (!checkInDate || !checkOutDate || !property) return 0;

  const checkIn = typeof checkInDate === 'string' ? parseISO(checkInDate) : checkInDate;
  const checkOut = typeof checkOutDate === 'string' ? parseISO(checkOutDate) : checkOutDate;

  const nights = differenceInDays(checkOut, checkIn);

  if (nights < 1) return 0;

  let total = 0;

  for (let i = 0; i < nights; i++) {
    const currentDate = addDays(checkIn, i);
    const nightlyRate = calculateNightlyRate(currentDate, property, pricingRules);
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

function calculateNightlyRate(date, property, pricingRules) {
  if (!pricingRules || pricingRules.length === 0) {
    return property.baseNightlyRate || 0;
  }

  const matchingRule = findMatchingRuleForDate(date, property.id, pricingRules);

  if (matchingRule) {
    return matchingRule.nightlyRate;
  }

  return property.baseNightlyRate || 0;
}

function findMatchingRuleForDate(date, propertyId, rules) {
  const dayOfWeek = getDay(date);
  const dateString = date.toISOString().split('T')[0];

  const applicableRules = rules.filter(rule => {
    if (!rule.isActive) return false;

    if (rule.propertyId && rule.propertyId !== propertyId) return false;

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

  if (applicableRules.length === 0) {
    return null;
  }

  applicableRules.sort((a, b) => {
    if (b.priority !== a.priority) {
      return b.priority - a.priority;
    }

    const typeOrder = { date_override: 3, date_range: 2, day_of_week: 1 };
    const aOrder = typeOrder[a.ruleType] || 0;
    const bOrder = typeOrder[b.ruleType] || 0;

    if (bOrder !== aOrder) {
      return bOrder - aOrder;
    }

    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  return applicableRules[0];
}
