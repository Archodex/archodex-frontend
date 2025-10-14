'use client';

import * as React from 'react';
import { ChevronsUpDown } from 'lucide-react';

import { labelForResource } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import ResourceIcons from './ResourceIcons';

type EventComboBoxProps = { events: ResourceEvent[]; onResourceEventChange: (resourceEvent: ResourceEvent) => void } & (
  | { placeholder: string; eventIndex?: never }
  | { placeholder?: never; eventIndex: number }
  | { placeholder: string; eventIndex: number }
);

const labelForEvent = (event: ResourceEvent) => {
  return (
    <div className="text-center w-full truncate">
      <div className="h-full flex justify-between items-center">
        <div className="flex items-center">
          <ResourceIcons id={event.principal} heightInPixels={30} />
          <div className="flex items-center">{labelForResource(event.principal)}</div>
        </div>
        &emsp;
        <div>
          <span className="text-primary">–</span>
          {event.type}
          <span className="text-primary">→</span>
        </div>
        &emsp;
        <div className="flex items-center">
          <ResourceIcons id={event.resource} heightInPixels={30} />
          <div className="flex items-center">{labelForResource(event.resource)}</div>
        </div>
      </div>
    </div>
  );
};

const keywordsForEvent = (event: ResourceEvent) => {
  const keywords = new Set<string>();

  for (const resourceIdPart of event.principal) {
    keywords.add(resourceIdPart.type.toLowerCase());
    keywords.add(resourceIdPart.id.toLowerCase());
  }

  for (const resourceIdPart of event.resource) {
    keywords.add(resourceIdPart.type.toLowerCase());
    keywords.add(resourceIdPart.id.toLowerCase());
  }

  keywords.add(event.type.toLowerCase());

  return Array.from(keywords);
};

// Provide simpler filter that matches when all tokens are found in any keyword.
// The built-in filter function does a fuzzy match that often returns results
// that are close but not actual matches.
let lastSearch: string | undefined;
let lastTokens: string[] = [];
const filterEvents = (_value: string, search: string, keywords?: string[]) => {
  let tokens;
  if (search === lastSearch) {
    tokens = lastTokens;
  } else {
    lastSearch = search;
    tokens = search.toLowerCase().split(/\s+/);
    lastTokens = tokens;
  }

  if (tokens.every((token) => keywords?.some((keyword) => keyword.includes(token)))) {
    return 1;
  }

  return 0;
};

const EventComboBox: React.FC<EventComboBoxProps> = ({ events, placeholder, eventIndex, onResourceEventChange }) => {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="justify-between overflow-hidden"
          disabled={events.length === 0}
        >
          {eventIndex !== undefined ? labelForEvent(events[eventIndex]) : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent container={document.getElementById('event-combo-box-portal-container')} className="w-auto p-0">
        <Command filter={filterEvents}>
          <CommandInput placeholder="Search events..." />
          <CommandList>
            <CommandEmpty>No event found.</CommandEmpty>
            <CommandGroup>
              {events.map((event, i) => (
                <CommandItem
                  key={i}
                  keywords={keywordsForEvent(event)}
                  onSelect={() => {
                    setOpen(false);
                    onResourceEventChange(events[i]);
                  }}
                >
                  {labelForEvent(event)}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default EventComboBox;
