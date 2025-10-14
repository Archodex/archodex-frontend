import { startOfDay, endOfDay, subDays, subMonths, startOfMonth, startOfYear, isEqual, set } from 'date-fns';
import { type DateRange } from './calendarUtils';
import validateDateFilter from './validateDateFilter';
import { isPlayground } from './utils';

export interface DateFilter {
  startDate: Date;
  endDate: Date;
}

export interface DatePreset {
  id: string;
  label: string;
  getValue: () => DateFilter;
}

export const datePresets: DatePreset[] = [
  {
    id: 'today',
    label: 'Today',
    getValue: () => {
      const today = new Date();
      return { startDate: startOfDay(today), endDate: endOfDay(today) };
    },
  },
  {
    id: 'last7days',
    label: 'Last 7 days',
    getValue: () => {
      const today = new Date();
      return { startDate: startOfDay(subDays(today, 7)), endDate: endOfDay(today) };
    },
  },
  {
    id: 'last30days',
    label: 'Last 30 days',
    getValue: () => {
      const today = new Date();
      return { startDate: startOfDay(subDays(today, 30)), endDate: endOfDay(today) };
    },
  },
  {
    id: 'last3months',
    label: 'Last 3 months',
    getValue: () => {
      const today = new Date();
      return { startDate: startOfDay(subMonths(today, 3)), endDate: endOfDay(today) };
    },
  },
  {
    id: 'last6months',
    label: 'Last 6 months',
    getValue: () => {
      const today = new Date();
      return { startDate: startOfDay(subMonths(today, 6)), endDate: endOfDay(today) };
    },
  },
  {
    id: 'monthtodate',
    label: 'Month to date',
    getValue: () => {
      const today = new Date();
      return { startDate: startOfMonth(today), endDate: endOfDay(today) };
    },
  },
  {
    id: 'yeartodate',
    label: 'Year to date',
    getValue: () => {
      const today = new Date();
      return { startDate: startOfYear(today), endDate: endOfDay(today) };
    },
  },
];

export const getDefaultDateFilter = (): DateFilter => {
  const sessionDateFilter = isPlayground ? null : sessionStorage.getItem('dateFilter');
  if (sessionDateFilter) {
    try {
      const storedMaybeFilter = JSON.parse(sessionDateFilter) as unknown;
      if (
        typeof storedMaybeFilter === 'object' &&
        typeof (storedMaybeFilter as { startDate: string; endDate: string }).startDate === 'string' &&
        typeof (storedMaybeFilter as { startDate: string; endDate: string }).endDate === 'string'
      ) {
        const storedFilter = storedMaybeFilter as { startDate: string; endDate: string };

        const dateFilter: DateFilter = {
          startDate: new Date(storedFilter.startDate),
          endDate: new Date(storedFilter.endDate),
        };

        try {
          validateDateFilter(dateFilter);
          return dateFilter;
        } catch (error) {
          console.warn('Invalid dateFilter in sessionStorage, falling back to default: ', error);
        }
      } else {
        console.warn('Invalid dateFilter format in sessionStorage, falling back to default.');
      }
    } catch {
      console.warn('Error parsing dateFilter from sessionStorage, falling back to default.');
    }
  }

  return (
    datePresets.find((p) => p.id === 'last30days')?.getValue() ?? {
      startDate: startOfDay(subDays(new Date(), 30)),
      endDate: endOfDay(new Date()),
    }
  );
};

export const isDateFilterEqual = (a: DateFilter, b: DateFilter): boolean => {
  return isEqual(a.startDate, b.startDate) && isEqual(a.endDate, b.endDate);
};

function setTimeFromString(date: Date, timeString: string): Date {
  const [hours, minutes, seconds] = timeString.split(':').map(Number);
  return set(date, { hours, minutes, seconds });
}

/**
 * Determines if a date range overlaps with a filter's date range.
 *
 * @param dateFilter - The date filter containing start and end dates to check against
 * @param firstSeenAt - ISO string representing the start of the date range to check
 * @param lastSeenAt - ISO string representing the end of the date range to check
 * @returns True if the date ranges overlap, false otherwise
 */
export const isWithinDateRange = (dateFilter: DateFilter, firstSeenAt: string, lastSeenAt: string): boolean => {
  const firstSeen = new Date(firstSeenAt);
  const lastSeen = new Date(lastSeenAt);

  const filterStartDateTime = dateFilter.startDate;
  const filterEndDateTime = dateFilter.endDate;

  // Check if item overlaps with the filter date range
  if (lastSeen < filterStartDateTime) {
    return false; // Item ended before filter start
  }
  if (firstSeen > filterEndDateTime) {
    return false; // Item started after filter end
  }

  return true;
};

export const constructDateFilter = (dateRange: DateRange, startTime: string, endTime: string): DateFilter | null => {
  if (!dateRange.from) return null;

  return {
    startDate: setTimeFromString(dateRange.from, startTime),
    endDate: dateRange.to ? setTimeFromString(dateRange.to, endTime) : setTimeFromString(dateRange.from, endTime),
  };
};
