import { format, isToday, isYesterday, differenceInDays, startOfToday, endOfToday, isSameDay } from 'date-fns';
import type { DateFilter } from './dateFilter';

export function formatDateRangeNaturally(filter: DateFilter): string {
  const start = filter.startDate;
  const end = filter.endDate;
  const startTime = format(filter.startDate, 'HH:mm:ss');
  const endTime = format(filter.endDate, 'HH:mm:ss');

  // Check if it's a full day range (00:00:00 to 23:59:59)
  const isFullDayRange = startTime === '00:00:00' && endTime === '23:59:59';

  // Same day
  if (isSameDay(start, end)) {
    if (isToday(start)) {
      return isFullDayRange ? 'Today' : `Today ${startTime} - ${endTime}`;
    }
    if (isYesterday(start)) {
      return isFullDayRange ? 'Yesterday' : `Yesterday ${startTime} - ${endTime}`;
    }
    return isFullDayRange ? format(start, 'MMM d, yyyy') : `${format(start, 'MMM d, yyyy')} ${startTime} - ${endTime}`;
  }

  // Check for common patterns
  const daysDiff = differenceInDays(end, start);

  // Today + some range
  if (isSameDay(end, startOfToday())) {
    if (daysDiff === 7) return 'Last 7 days';
    if (daysDiff === 30) return 'Last 30 days';
    if (daysDiff >= 89 && daysDiff <= 91) return 'Last 3 months';
    if (daysDiff >= 179 && daysDiff <= 183) return 'Last 6 months';
  }

  // Month to date
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  if (isSameDay(start, startOfMonth) && isSameDay(end, endOfToday())) {
    return 'Month to date';
  }

  // Year to date
  const startOfYear = new Date(today.getFullYear(), 0, 1);
  if (isSameDay(start, startOfYear) && isSameDay(end, endOfToday())) {
    return 'Year to date';
  }

  // Custom range
  const startStr = format(start, 'MMM d, yyyy');
  const endStr = format(end, 'MMM d, yyyy');

  if (isFullDayRange) {
    return `${startStr} - ${endStr}`;
  }

  return `${startStr} ${startTime} - ${endStr} ${endTime}`;
}
