/**
 * Calendar utility functions for date range picker
 */

export interface DateRange {
  from?: Date;
  to?: Date;
}

/**
 * Calculate the optimal starting month for calendar display
 * based on the selected date range and current date
 */
export function getOptimalStartMonth(dateRange?: DateRange): Date {
  const today = new Date();

  // If no date range selected, show current month
  if (!dateRange?.from) {
    return today;
  }

  const startDate = dateRange.from;
  const endDate = dateRange.to ?? dateRange.from;

  // Check if range spans multiple months
  const startMonth = startDate.getMonth();
  const startYear = startDate.getFullYear();
  const endMonth = endDate.getMonth();
  const endYear = endDate.getFullYear();

  const isMultiMonth = startYear !== endYear || startMonth !== endMonth;

  if (isMultiMonth) {
    // Multi-month range: show end date month as rightmost, so leftmost = end month - 1
    const leftmostMonth = new Date(endYear, endMonth - 1, 1);
    return leftmostMonth;
  } else {
    // Single month range
    const isCurrentMonth = startYear === today.getFullYear() && startMonth === today.getMonth();

    if (isCurrentMonth) {
      // Current month range: show current month as rightmost, so leftmost = current month - 1
      const leftmostMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      return leftmostMonth;
    } else {
      // Other month range: show that month as leftmost
      return new Date(startYear, startMonth, 1);
    }
  }
}

/**
 * Generate array of dates between start and end date (exclusive of start/end)
 * for highlighting middle range dates in calendar
 */
export function getMiddleRangeDates(startDate?: Date, endDate?: Date): Date[] {
  if (!startDate || !endDate) {
    return [];
  }

  const dayCount = Math.max(0, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) - 1);

  return Array.from({ length: dayCount }, (_, i) => {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i + 1);
    return date;
  }).filter((date) => {
    const dateStr = date.toDateString();
    const startStr = startDate.toDateString();
    const endStr = endDate.toDateString();
    return dateStr !== startStr && dateStr !== endStr;
  });
}

/**
 * Handle date click logic for controlled date range selection
 */
export function handleDateRangeClick(
  clickedDate: Date,
  currentRange: DateRange | undefined,
  isSelectingSecondDate: boolean,
): { newRange: DateRange; newIsSelectingSecondDate: boolean } {
  if (!isSelectingSecondDate) {
    // Handle first click or reset case
    return { newRange: { from: clickedDate, to: undefined }, newIsSelectingSecondDate: true };
  } else {
    // Second click - set end date
    const currentStart = currentRange?.from;
    if (currentStart) {
      // Ensure end date is not before start date
      const endDate = clickedDate < currentStart ? currentStart : clickedDate;
      const startDate = clickedDate < currentStart ? clickedDate : currentStart;

      return { newRange: { from: startDate, to: endDate }, newIsSelectingSecondDate: false };
    }

    // Fallback - treat as first click
    return { newRange: { from: clickedDate, to: undefined }, newIsSelectingSecondDate: true };
  }
}
