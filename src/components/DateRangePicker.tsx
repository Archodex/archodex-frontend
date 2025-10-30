import { Calendar } from '@/components/ui/calendar';
import { TimePicker } from '@/components/TimePicker';
import { PresetSelector } from '@/components/PresetSelector';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { type DateFilter } from '@/lib/dateFilter';
import { getOptimalStartMonth, getMiddleRangeDates } from '@/lib/calendarUtils';
import { useDateRangePicker } from '@/hooks/useDateRangePicker';
import validateDateFilter from '@/lib/validateDateFilter';
import { cn } from '@/lib/utils';
import posthog from 'posthog-js';

interface DateRangePickerProps {
  value?: DateFilter;
  onChange?: (value: DateFilter) => void;
  onPendingChange: (value: DateFilter) => void;
  className?: string;
}

export function DateRangePicker({ value, onChange, onPendingChange, className }: DateRangePickerProps) {
  const {
    selectedPreset,
    dateRange,
    startTime,
    endTime,
    handleDateClick,
    handleStartTimeChange,
    handleEndTimeChange,
    handlePresetSelect,
    getCurrentValue,
    isValid,
  } = useDateRangePicker({ value, onPendingChange });

  const handleApply = () => {
    posthog.capture('date_range_picker_applied', { date_range: getCurrentValue() });
    const finalValue = getCurrentValue();
    if (finalValue) {
      try {
        validateDateFilter(finalValue);
        onChange?.(finalValue);
      } catch (error) {
        console.error('Invalid date filter:', error);
      }
    }
  };

  return (
    <div className={cn('flex', className)}>
      {/* Preset Sidebar */}
      <div className="min-w-36 p-4 border-r">
        <PresetSelector selectedPreset={selectedPreset} onPresetSelect={handlePresetSelect} />
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 space-y-4">
        {/* Calendar */}
        <Calendar
          mode="single"
          required={false}
          selected={undefined}
          onSelect={(day) => {
            if (day) handleDateClick(day);
          }}
          numberOfMonths={2}
          defaultMonth={getOptimalStartMonth(dateRange)}
          className="rounded-md border-0"
          modifiers={{
            range_start: dateRange.from ? [dateRange.from] : [],
            range_end: dateRange.to ? [dateRange.to] : [],
            range_middle: getMiddleRangeDates(dateRange.from, dateRange.to),
          }}
          classNames={{
            today: 'italic bg-transparent text-foreground',
            range_middle: 'bg-accent text-accent-foreground italic',
            range_start: 'bg-primary text-primary-foreground italic',
            range_end: 'bg-primary text-primary-foreground italic',
          }}
        />

        <Separator />

        {/* Time Pickers */}
        <div className="flex gap-8 justify-center">
          <TimePicker label="Start Time" value={startTime} onChange={handleStartTimeChange} />
          <TimePicker label="End Time" value={endTime} onChange={handleEndTimeChange} />
        </div>

        {/* Apply Button */}
        <div className="flex justify-center items-center gap-4">
          <div className="text-xs text-muted-foreground text-center flex-1">
            {!dateRange.from && 'Click to select start date'}
            {dateRange.from && !dateRange.to && 'Click another date or Apply for single day'}
            {dateRange.from && dateRange.to && 'Range selected'}
          </div>

          <Button onClick={handleApply} size="sm" disabled={!isValid}>
            Apply
          </Button>
        </div>
      </div>
    </div>
  );
}
