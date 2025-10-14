import { Button } from '@/components/ui/button';
import { datePresets, type DatePreset } from '@/lib/dateFilter';
import { cn } from '@/lib/utils';

interface PresetSelectorProps {
  selectedPreset?: string;
  onPresetSelect: (preset: DatePreset) => void;
  className?: string;
}

export function PresetSelector({ selectedPreset, onPresetSelect, className }: PresetSelectorProps) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <div className="text-sm font-medium text-muted-foreground px-1 mb-2">Presets</div>

      {datePresets.map((preset) => (
        <Button
          key={preset.id}
          variant={selectedPreset === preset.id ? undefined : 'ghost'}
          size="sm"
          className="justify-start h-8 px-2 font-normal"
          onClick={() => {
            onPresetSelect(preset);
          }}
        >
          {preset.label}
        </Button>
      ))}
    </div>
  );
}
