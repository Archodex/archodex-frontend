import * as React from 'react';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DateRangePicker } from '@/components/DateRangePicker';
import { type DateFilter, isDateFilterEqual } from '@/lib/dateFilter';
import { formatDateRangeNaturally } from '@/lib/naturalLanguageDates';
import { cn } from '@/lib/utils';
import QueryDataDispatchContext from '@/contexts/QueryDataDispatchContext';
import { QueryDataActions } from '@/hooks/useQueryData';

interface DateRangePickerPopoverProps {
  value: DateFilter;
  className?: string;
  placeholder?: string;
}

export function DateRangePickerPopover({ value, className }: DateRangePickerPopoverProps) {
  const queryDataDispatch = React.useContext(QueryDataDispatchContext);
  const [open, setOpen] = React.useState(false);
  const [currentValue, setCurrentValue] = React.useState<DateFilter>(value);
  const [pendingValue, setPendingValue] = React.useState<DateFilter>(value);

  React.useEffect(() => {
    setCurrentValue(value);
    setPendingValue(value);
  }, [value]);

  const handleApplyAndClose = (newValue: DateFilter) => {
    setCurrentValue(newValue);
    setPendingValue(newValue);
    queryDataDispatch({ action: QueryDataActions.SetDateFilter, dateFilter: newValue });
    setOpen(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !isDateFilterEqual(pendingValue, currentValue)) {
      // User is trying to close with unsaved changes
      const confirmed = window.confirm('You have unsaved changes to your date range. Do you want to discard them?');
      if (!confirmed) {
        return; // Don't close the popover
      }
      setPendingValue(currentValue);
    }
    setOpen(newOpen);
  };

  const handlePendingChange = (newPendingValue: DateFilter) => {
    setPendingValue(newPendingValue);
  };

  const formatDateRange = (filter: DateFilter): string => {
    return formatDateRangeNaturally(filter);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn('justify-start text-left font-normal', className)}>
          <CalendarIcon className="mr-2 h-4 w-4" />
          {formatDateRange(currentValue)}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start" side="bottom" sideOffset={4}>
        <DateRangePicker value={currentValue} onChange={handleApplyAndClose} onPendingChange={handlePendingChange} />
      </PopoverContent>
    </Popover>
  );
}
