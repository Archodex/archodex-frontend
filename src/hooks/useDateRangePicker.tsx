import * as React from 'react';
import { type DateFilter, constructDateFilter } from '@/lib/dateFilter';
import { type DateRange, handleDateRangeClick } from '@/lib/calendarUtils';
import { format } from 'date-fns';

interface UseDateRangePickerProps {
  value?: DateFilter;
  onPendingChange: (value: DateFilter) => void;
}

export function useDateRangePicker({ value, onPendingChange }: UseDateRangePickerProps) {
  // Internal state for the form - doesn't apply until user clicks Apply
  const [selectedPreset, setSelectedPreset] = React.useState<string>('');
  const [dateRange, setDateRange] = React.useState<DateRange>({ from: value?.startDate, to: value?.endDate });
  const [startTime, setStartTime] = React.useState(value?.startDate ? format(value.startDate, 'HH:mm:ss') : '00:00:00');
  const [endTime, setEndTime] = React.useState(value?.endDate ? format(value.endDate, 'HH:mm:ss') : '23:59:59');
  const [isSelectingSecondDate, setIsSelectingSecondDate] = React.useState(false);

  const updatePendingValue = React.useCallback(
    (newDateRange?: DateRange, newStartTime?: string, newEndTime?: string) => {
      const newValue = constructDateFilter(newDateRange ?? dateRange, newStartTime ?? startTime, newEndTime ?? endTime);
      if (newValue) {
        onPendingChange(newValue);
      }
    },
    [dateRange, startTime, endTime, onPendingChange],
  );

  // Update internal state when initial value changes
  React.useEffect(() => {
    if (value) {
      setDateRange({ from: value.startDate, to: value.endDate });
      setSelectedPreset(''); // Reset preset selection when external value changes
      setIsSelectingSecondDate(false); // Reset selection state
    }
  }, [value]);

  const handleDateClick = React.useCallback(
    (day: Date) => {
      const { newRange, newIsSelectingSecondDate } = handleDateRangeClick(day, dateRange, isSelectingSecondDate);

      setDateRange(newRange);
      setIsSelectingSecondDate(newIsSelectingSecondDate);
      setSelectedPreset('');
      updatePendingValue(newRange);
    },
    [dateRange, isSelectingSecondDate, updatePendingValue],
  );

  const handleStartTimeChange = React.useCallback(
    (time: string) => {
      setStartTime(time);
      setSelectedPreset(''); // Clear preset when user manually changes time
      updatePendingValue(undefined, time); // Notify that changes were made
    },
    [updatePendingValue],
  );

  const handleEndTimeChange = React.useCallback(
    (time: string) => {
      setEndTime(time);
      setSelectedPreset(''); // Clear preset when user manually changes time
      updatePendingValue(undefined, undefined, time); // Notify that changes were made
    },
    [updatePendingValue],
  );

  const handlePresetSelect = React.useCallback(
    (preset: { id: string; getValue: () => DateFilter }) => {
      const presetValue = preset.getValue();
      setSelectedPreset(preset.id);
      const newDateRange = { from: presetValue.startDate, to: presetValue.endDate };
      setDateRange(newDateRange);
      updatePendingValue(newDateRange);
    },
    [updatePendingValue],
  );

  const getCurrentValue = React.useCallback((): DateFilter | null => {
    return constructDateFilter(dateRange, startTime, endTime);
  }, [dateRange, startTime, endTime]);

  return {
    // State
    selectedPreset,
    dateRange,
    startTime,
    endTime,
    isSelectingSecondDate,

    // Actions
    handleDateClick,
    handleStartTimeChange,
    handleEndTimeChange,
    handlePresetSelect,
    getCurrentValue,

    // Utilities
    isValid: !!dateRange.from,
  };
}
