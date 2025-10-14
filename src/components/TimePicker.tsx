import * as React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { validateAndFormatTime } from '@/lib/timeUtils';
import { cn } from '@/lib/utils';

interface TimePickerProps {
  value?: string; // "HH:mm:ss" format
  onChange?: (value: string) => void;
  label?: string;
  className?: string;
}

export function TimePicker({ value = '00:00:00', onChange, label, className }: TimePickerProps) {
  const [internalValue, setInternalValue] = React.useState(value);

  React.useEffect(() => {
    setInternalValue(value);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInternalValue(newValue);
  };

  const handleBlur = () => {
    const formattedTime = validateAndFormatTime(internalValue);
    setInternalValue(formattedTime);
    onChange?.(formattedTime);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select(); // Select all text on focus for easy replacement
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const formattedTime = validateAndFormatTime(internalValue);
      setInternalValue(formattedTime);
      onChange?.(formattedTime);
    }
  };

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {label && <Label className="text-xs font-medium text-muted-foreground whitespace-nowrap">{label}</Label>}
      <Input
        type="text"
        value={internalValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder="HH:mm:ss"
        className="w-24 h-8 text-sm text-center flex-shrink-0"
        maxLength={8}
      />
    </div>
  );
}
