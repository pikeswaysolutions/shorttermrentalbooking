import { addMinutes, getDay, format } from 'date-fns';

export function calculatePrice(eventType, startDate, endDate, rules, baseRate = 50) {
  if (!startDate || !endDate) return 0;
  
  let totalPrice = 0;
  let current = new Date(startDate);
  const end = new Date(endDate);
  
  while (current < end) {
    const chunkEnd = addMinutes(current, 30);
    const dayOfWeek = getDay(current);
    const timeString = format(current, 'HH:mm');
    
    const matchingRule = rules.find(rule => {
      if (rule.eventTypeId && rule.eventTypeId !== eventType.id) return false;
      if (rule.days && !rule.days.includes(dayOfWeek)) return false;
      if (rule.startTime && rule.endTime) {
        return timeString >= rule.startTime && timeString < rule.endTime;
      }
      return true;
    });

    const hourlyRate = matchingRule ? matchingRule.hourlyRate : (eventType.baseRate || baseRate);
    totalPrice += (hourlyRate / 2);
    current = chunkEnd;
  }

  return totalPrice;
}