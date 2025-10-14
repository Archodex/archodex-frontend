import React from 'react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';

import ResourcesTable from './ResourcesTable';
import EventsTable from './EventsTable';
import IssuesTable from './IssuesTable';
import { Issue } from './hooks/useQueryData/issues';
import EnvironmentsTable from './EnvironmentsTable';
import { QueryData } from './hooks/useQueryData';
import MenuSection from './lib/menuSection';

export interface QueryTableProps {
  section: MenuSection;
  environments: string[];
  resources: QueryData['resources'];
  selectedResources: Set<string>;
  selectedEdges: Set<string>;
  resourceEvents: ResourceEvent[];
  tab?: string;
  setTab: (tab: string) => void;
  showEvent: (resourceEvent: ResourceEvent) => void;
  issues?: Map<string, Issue>;
  selectedIssues: Set<string>;
}

const QueryTable: React.FC<QueryTableProps> = ({
  section,
  environments,
  resources,
  selectedResources,
  selectedEdges,
  resourceEvents,
  tab,
  setTab,
  showEvent,
  issues,
  selectedIssues,
}) => {
  return (
    <Tabs value={tab ?? ''} onValueChange={setTab} activationMode="manual" className="h-full">
      <TabsList className="self-center">
        {section === MenuSection.Environments && <TabsTrigger value="">Environments</TabsTrigger>}
        <TabsTrigger value={section === MenuSection.Environments ? 'resources' : ''}>Resources</TabsTrigger>
        <TabsTrigger value="events">Events</TabsTrigger>
        {issues && <TabsTrigger value="issues">Issues</TabsTrigger>}
      </TabsList>

      {section === MenuSection.Environments && (
        <ScrollableTabsContent value="" className="h-full">
          <EnvironmentsTable environments={environments} resources={resources} selectedResources={selectedResources} />
        </ScrollableTabsContent>
      )}
      <ScrollableTabsContent value={section === MenuSection.Environments ? 'resources' : ''}>
        <ResourcesTable resources={resources} selectedResources={selectedResources} />
      </ScrollableTabsContent>
      <ScrollableTabsContent value="events">
        <EventsTable resourceEvents={resourceEvents} selectedEdges={selectedEdges} showEvent={showEvent} />
      </ScrollableTabsContent>
      {issues && (
        <ScrollableTabsContent value="issues">
          <IssuesTable issues={issues} selectedIssues={selectedIssues} />
        </ScrollableTabsContent>
      )}
    </Tabs>
  );
};

// To make the tables scrollable, we need the TabsContent outer div to be
// initially 0 height but flex to fill the available space. We also need the
// TabsContent inner div to be the full height of the scrollable content.
const ScrollableTabsContent: React.FC<React.ComponentProps<typeof TabsContent> & { className?: string }> = ({
  className,
  ...props
}) => {
  return <TabsContent {...props} className={`h-0 *:h-full ${className ?? ''}`} />;
};

export default QueryTable;
