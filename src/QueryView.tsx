import React, { useContext, useEffect, useState } from 'react';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from './components/ui/resizable';
import QueryTable from './QueryTable';
import { QueryLoaderData } from './lib/queryLoader';
import { useLoaderData, useMatches, useNavigate, useParams } from 'react-router';
import TutorialCallbacksContext from './components/Tutorial/CallbacksContext';
import EventChainDetailsSheet from './EventChainDetailsSheet';
import useQueryData from './hooks/useQueryData';
import QueryDataDispatchContext from './contexts/QueryDataDispatchContext';
import QueryDataContext from './contexts/QueryDataContext';
import QueryGraph from './QueryGraph';
import { DateRangePickerPopover } from './components/DateRangePickerPopover';
import { type DateFilter } from './lib/dateFilter';
import MenuSection from './lib/menuSection';
import GettingStartedDialog from './components/GettingStartedDialog';
import posthog from 'posthog-js';

export interface QueryViewProps {
  section: MenuSection;
}

export interface DateFilterProps {
  dateFilter: DateFilter;
  setDateFilter: (filter: DateFilter) => void;
}

const QueryView: React.FC<QueryViewProps> = ({ section }) => {
  const navigate = useNavigate();
  const routeMatches = useMatches();
  const loaderData = useLoaderData<QueryLoaderData>();
  const [data, queryDataDispatch] = useQueryData(loaderData, section);
  const { queryDataDispatchRef } = useContext(TutorialCallbacksContext).refs;
  const { elementRef } = useContext(TutorialCallbacksContext).refs;
  const params = useParams<{ tableTab: string }>();

  const [showGettingStartedDialog, setShowGettingStartedDialog] = useState((loaderData.resources ?? []).length === 0);

  const [event, showEvent] = useState<ResourceEvent | undefined>();

  useEffect(() => {
    if ((loaderData.resources ?? []).length === 0) {
      setShowGettingStartedDialog(true);
    }
  }, [loaderData.resources]);

  useEffect(() => {
    queryDataDispatchRef(queryDataDispatch);

    return () => {
      queryDataDispatchRef(null);
    };
  }, [queryDataDispatch, queryDataDispatchRef]);

  const isMd = matchMedia('(min-width: 768px)').matches;
  const graphHeightPercent = isMd ? 70 : 50;

  return (
    <QueryDataContext.Provider value={data}>
      <QueryDataDispatchContext.Provider value={queryDataDispatch}>
        <ResizablePanelGroup direction="vertical">
          <ResizablePanel defaultSize={graphHeightPercent}>
            <div className="size-full relative" ref={elementRef('graphView')}>
              <QueryGraph
                nodes={data.nodes}
                edges={data.edges}
                eventChainLinks={data.eventChainLinks}
                laidOut={data.laidOut}
                viewport={data.viewport}
              />
              {/* Date Range Picker positioned to the left of zoom controls */}
              <div className="absolute top-4 right-20 z-10">
                <DateRangePickerPopover className="bg-background shadow-md" value={data.dateFilter} />
              </div>
            </div>
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel defaultSize={100 - graphHeightPercent}>
            <div className="size-full pt-2" ref={elementRef('listView')}>
              <QueryTable
                section={section}
                environments={data.environments}
                resources={data.resources}
                selectedResources={data.selection.resources}
                selectedEdges={data.selection.edges}
                resourceEvents={data.resourceEvents}
                tab={params.tableTab}
                setTab={(tab) => {
                  let to;

                  posthog.capture('query_view_table_tab_changed', { tab });

                  if (routeMatches.at(-1)?.params.tableTab) {
                    to = tab ? `../${tab}` : '..';
                  } else {
                    to = tab;
                  }

                  void navigate(to, { replace: true, relative: 'path' });
                }}
                showEvent={showEvent}
                issues={data.issues}
                selectedIssues={data.selection.issues}
              />
            </div>
          </ResizablePanel>
          {event && (
            <EventChainDetailsSheet
              data={data}
              resourceEvent={event}
              onResourceEventChange={(resourceEventIndex) => {
                showEvent(data.resourceEvents[resourceEventIndex]);
              }}
              onDismiss={() => {
                showEvent(undefined);
              }}
            />
          )}
        </ResizablePanelGroup>
        <GettingStartedDialog open={showGettingStartedDialog} onOpenChange={setShowGettingStartedDialog} />
      </QueryDataDispatchContext.Provider>
    </QueryDataContext.Provider>
  );
};

export default QueryView;
