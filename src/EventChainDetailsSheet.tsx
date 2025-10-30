import React, { useCallback, useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from './components/ui/sheet';
import { Separator } from './components/ui/separator';
import ResourceIdDetails from './ResourceIdDetails';
import TextSeparator from './components/TextSeparator';
import DetailsSeenAt from './components/DetailsSeenAt';
import EventComboBox from './components/EventComboBox';
import { edgeIdFromResourceIds, labelForResourceType, typeIdFromResourceId } from './lib/utils';
import { QueryData } from './hooks/useQueryData';
import posthog from 'posthog-js';

interface EventChainDetailsSheetProps {
  data: QueryData;
  resourceEvent: ResourceEvent;
  onResourceEventChange: (resourceEventIndex: number) => void;
  onDismiss: () => void;
}

const EventChainDetailsSheet: React.FC<EventChainDetailsSheetProps> = ({
  data,
  resourceEvent,
  onResourceEventChange: onResourceEventChange,
  onDismiss,
}) => {
  const edgeId = useMemo(() => edgeIdFromResourceIds(resourceEvent.principal, resourceEvent.resource), [resourceEvent]);
  const precedingResourceEvents = useMemo(
    () =>
      data.resourceEvents.filter((part) => {
        const otherEdgeId = edgeIdFromResourceIds(part.principal, part.resource);
        return data.eventChainLinks[edgeId].preceding.has(otherEdgeId);
      }),
    [edgeId, data.eventChainLinks, data.resourceEvents],
  );
  const followingResourceEvents = useMemo(
    () =>
      data.resourceEvents.filter((part) => {
        const otherEdgeId = edgeIdFromResourceIds(part.principal, part.resource);
        return data.eventChainLinks[edgeId].following.has(otherEdgeId);
      }),
    [edgeId, data.eventChainLinks, data.resourceEvents],
  );

  const handleResourceEventChange = useCallback(
    (resourceEvent: ResourceEvent) => {
      const resourceEventIndex = data.resourceEvents.indexOf(resourceEvent);

      posthog.capture('event_chain_resource_event_changed', {
        resourceEventIndex,
        to_principal_type: typeIdFromResourceId(resourceEvent.principal),
        to_event_type: resourceEvent.type,
        to_resource_type: typeIdFromResourceId(resourceEvent.resource),
      });

      onResourceEventChange(resourceEventIndex);
    },
    [data, onResourceEventChange],
  );

  return (
    <Sheet
      open={true}
      onOpenChange={(open) => {
        if (open) {
          posthog.capture('event_chain_details_sheet_opened', {
            principal_type: typeIdFromResourceId(resourceEvent.principal),
            event_type: resourceEvent.type,
            resource_type: typeIdFromResourceId(resourceEvent.resource),
          });
        } else {
          posthog.capture('event_chain_details_sheet_closed', {
            principal_type: typeIdFromResourceId(resourceEvent.principal),
            event_type: resourceEvent.type,
            resource_type: typeIdFromResourceId(resourceEvent.resource),
          });
          onDismiss();
        }
      }}
    >
      <SheetContent side="right" className="w-96 overflow-scroll border-none" aria-describedby={undefined}>
        <SheetHeader>
          <SheetTitle className="text-3xl">Event</SheetTitle>
        </SheetHeader>
        <Separator className="h-px w-full my-4 bg-primary" />
        <span className="text-xl">Principal</span>
        <ResourceIdDetails id={resourceEvent.principal} />
        <TextSeparator text={labelForResourceType(resourceEvent.type)} />
        <span className="text-xl">Resource</span>
        <ResourceIdDetails id={resourceEvent.resource} />
        <Separator className="h-px w-full my-4 bg-primary" />
        <span className="text-xl">Observed</span>
        <DetailsSeenAt
          lastSeenAt={new Date(resourceEvent.last_seen_at)}
          firstSeenAt={new Date(resourceEvent.first_seen_at)}
        />
        <Separator className="h-px w-full my-4 bg-primary" />
        <span className="text-xl">Chained Events</span>
        <div className="my-4 flex justify-between gap-2">
          <EventComboBox
            placeholder="Preceding events"
            events={precedingResourceEvents}
            onResourceEventChange={handleResourceEventChange}
          />
          <EventComboBox
            placeholder="Following events"
            events={followingResourceEvents}
            onResourceEventChange={handleResourceEventChange}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default EventChainDetailsSheet;
