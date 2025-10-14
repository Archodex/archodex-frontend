import { ELKEdgeData } from '@/ELKEdge';
import { QueryLoaderData } from '@/lib/queryLoader';
import { ResourceNodeData } from '@/ResourceNode';
import { Edge, Node, Viewport } from '@xyflow/react';
import { useEffect, useMemo, useReducer, useRef } from 'react';
import { Issue } from './issues';
import initialRenderCompleted, { InitialRenderCompletedAction } from './actions/initialRenderCompleted';
import updateMeasurements, { UpdateMeasurementsAction } from './actions/updateMeasurements';
import updateLayout, { UpdateLayoutAction } from './actions/updateLayout';
import toggleNodeCollapsed, { ToggleNodeCollapsedAction } from './actions/toggleNodeCollapsed';
import expandAll, { ExpandAllAction } from './actions/expandAll';
import collapseAll, { CollapseAllAction } from './actions/collapseAll';
import selectResource, { SelectResourceAction } from './actions/selectResource';
import deselectResource, { DeselectResourceAction } from './actions/deselectResource';
import selectEdge, { SelectEdgeAction } from './actions/selectEdge';
import deselectEdge, { DeselectEdgeAction } from './actions/deselectEdge';
import selectIssue, { SelectIssueAction } from './actions/selectIssue';
import deselectIssue, { DeselectIssueAction } from './actions/deselectIssue';
import clearSelection, { ClearSelectionAction } from './actions/clearSelection';
import tagEnvironment, { TagEnvironmentAction } from './actions/tagEnvironment';
import untagEnvironment, { UntagEnvironmentAction } from './actions/untagEnvironment';
import reinitialize, { ReinitializeAction } from './actions/reinitialize';
import layoutGraph from './layoutGraph';
import fitView, { FIT_VIEW_DURATION, FitViewAction } from './actions/fitView';
import { DateFilter, getDefaultDateFilter } from '@/lib/dateFilter';
import setDateFilter, { SetDateFilterAction } from './actions/setDateFilter';
import initializer from './initializer';
import MenuSection from '@/lib/menuSection';

export type ResourceEnvironments = Record<string, { inheritedFrom?: ResourceId } | undefined>;

export enum LayoutState {
  Initial = 'initial',
  InitialRenderCompleted = 'initialRenderCompleted',
  Measured = 'measured',
  LaidOut = 'laidOut',
}

interface Measurement {
  width: number;
  height: number;
}

export type Measurements = Record<string, Measurement | undefined>;

export interface Links {
  preceding: Set<string>;
  following: Set<string>;
}

export type EventChainLinks = Record<string, Links>;

export type ViewportTransition = Viewport & { duration?: number };

export type QueryData = QueryLoaderData & {
  section: MenuSection;
  resources: Resource[];
  events: ResourceEvent[];
  environments: string[];
  resourcesEnvironments: Record<string, ResourceEnvironments | undefined>;
  resourceEvents: ResourceEvent[];
  eventChainLinks: EventChainLinks;

  nodes: Record<string, Node<ResourceNodeData>>;
  edges: Record<string, Edge<ELKEdgeData>>;
  measurements: Measurements;
  viewport: ViewportTransition;
  fitViewAfterLayout: boolean;
  laidOut: LayoutState;

  selection: { resources: Set<string>; edges: Set<string>; issues: Set<string> };

  issues?: Map<string, Issue>;

  dateFilter: DateFilter;

  originalData: QueryLoaderData; // Keep reference to original unfiltered data
};

export const QueryDataActions = {
  InitialRenderCompleted: 'InitialRenderCompleted' as const,
  UpdateMeasurements: 'UpdateMeasurements' as const,
  UpdateLayout: 'UpdateLayout' as const,
  SetDateFilter: 'SetDateFilter' as const,
  ToggleNodeCollapsed: 'ToggleNodeCollapsed' as const,
  FitView: 'FitView' as const,
  ExpandAll: 'ExpandAll' as const,
  CollapseAll: 'CollapseAll' as const,
  SelectResource: 'SelectResource' as const,
  DeselectResource: 'DeselectResource' as const,
  SelectEdge: 'SelectEdge' as const,
  DeselectEdge: 'DeselectEdge' as const,
  SelectIssue: 'SelectIssue' as const,
  DeselectIssue: 'DeselectIssue' as const,
  ClearSelection: 'ClearSelection' as const,
  TagEnvironment: 'TagEnvironment' as const,
  UntagEnvironment: 'UntagEnvironment' as const,
  Reinitialize: 'Reinitialize' as const,
};

export type QueryDataEvent =
  | InitialRenderCompletedAction
  | UpdateMeasurementsAction
  | UpdateLayoutAction
  | SetDateFilterAction
  | ToggleNodeCollapsedAction
  | FitViewAction
  | ExpandAllAction
  | CollapseAllAction
  | SelectResourceAction
  | DeselectResourceAction
  | SelectEdgeAction
  | DeselectEdgeAction
  | SelectIssueAction
  | DeselectIssueAction
  | ClearSelectionAction
  | TagEnvironmentAction
  | UntagEnvironmentAction
  | ReinitializeAction;

/**
 * Main reducer function for managing QueryData state.
 * Handles all state transitions for the graph visualization.
 *
 * @param state - Current QueryData state
 * @param action - Action to be processed
 * @returns Updated QueryData state
 */
const reducer: React.Reducer<QueryData, QueryDataEvent> = (state, action) => {
  switch (action.action) {
    case QueryDataActions.InitialRenderCompleted:
      return initialRenderCompleted(state);

    case QueryDataActions.UpdateMeasurements:
      return updateMeasurements(state, action);

    case QueryDataActions.UpdateLayout:
      return updateLayout(state, action);

    case QueryDataActions.SetDateFilter:
      return setDateFilter(state, action);

    case QueryDataActions.ToggleNodeCollapsed:
      return toggleNodeCollapsed(state, action);

    case QueryDataActions.FitView:
      return fitView(state, action);

    case QueryDataActions.ExpandAll:
      return expandAll(state);

    case QueryDataActions.CollapseAll:
      return collapseAll(state);

    case QueryDataActions.SelectResource:
      return selectResource(state, action);

    case QueryDataActions.DeselectResource:
      return deselectResource(state, action);

    case QueryDataActions.SelectEdge:
      return selectEdge(state, action);

    case QueryDataActions.DeselectEdge:
      return deselectEdge(state, action);

    case QueryDataActions.SelectIssue:
      return selectIssue(state, action);

    case QueryDataActions.DeselectIssue:
      return deselectIssue(state, action);

    case QueryDataActions.ClearSelection:
      return clearSelection(state);

    case QueryDataActions.TagEnvironment:
      return tagEnvironment(state, action);

    case QueryDataActions.UntagEnvironment:
      return untagEnvironment(state, action);

    case QueryDataActions.Reinitialize:
      return reinitialize(action);

    default:
      throw new Error(`Unknown QueryData reducer action type: ${(action as { action: string }).action}`);
  }
};

/**
 * Measures the dimensions of DOM nodes by their IDs.
 *
 * @param nodeIds - Array of node IDs to measure
 * @returns Record mapping node IDs to their width and height measurements
 */
const measureNodes = (nodeIds: string[]): Record<string, { width: number; height: number }> => {
  return nodeIds.reduce<Record<string, { width: number; height: number }>>((acc, nodeId) => {
    const element = document.querySelector(`[data-id="${nodeId}"]`);

    if (!element) {
      return acc;
    }

    acc[nodeId] = { width: element.clientWidth, height: element.clientHeight };

    return acc;
  }, {});
};

/**
 * React hook for managing graph visualization data and state.
 * Initializes and manages the complete state for rendering cloud infrastructure graphs.
 *
 * @param queryLoaderData - Data loaded from the query loader
 * @param section - Current menu section determining visualization mode
 * @returns Tuple of [state, dispatch] for accessing and updating query data
 */
const useQueryData = (
  queryLoaderData: QueryLoaderData,
  section: MenuSection,
): [QueryData, React.Dispatch<QueryDataEvent>] => {
  const initialized = useRef(false);
  const initialQueryData = useMemo<QueryData>(
    () => ({
      ...queryLoaderData,
      section,
      resources: queryLoaderData.resources ?? [],
      events: queryLoaderData.events ?? [],
      environments: [],
      resourcesEnvironments: {},
      resourceEvents: [],
      eventChainLinks: {},
      nodes: {},
      edges: {},
      measurements: {},
      viewport: { x: 0, y: 0, zoom: 1 },
      fitViewAfterLayout: true,
      laidOut: LayoutState.Initial,
      selection: { resources: new Set(), edges: new Set(), issues: new Set(), fitView: false },
      dateFilter: getDefaultDateFilter(),
      originalData: structuredClone(queryLoaderData),
    }),
    [queryLoaderData, section],
  );

  const [state, dispatch] = useReducer<React.Reducer<QueryData, QueryDataEvent>, QueryData>(
    reducer,
    initialQueryData,
    initializer,
  );

  // If the queryLoaderData or section changes, reinitialize the state
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      return;
    }

    dispatch({ action: QueryDataActions.Reinitialize, state: initializer(initialQueryData) });
  }, [initialQueryData]);

  useEffect(() => {
    switch (state.laidOut) {
      case LayoutState.InitialRenderCompleted:
        dispatch({ action: QueryDataActions.UpdateMeasurements, measurements: measureNodes(Object.keys(state.nodes)) });
        break;

      case LayoutState.Measured:
        layoutGraph(state.nodes, state.edges, state.measurements)
          .then((newStateValues) => {
            dispatch({ action: QueryDataActions.UpdateLayout, ...newStateValues });
          })
          .catch((error: unknown) => {
            throw error;
          });
        break;

      case LayoutState.LaidOut:
        if (state.fitViewAfterLayout) {
          dispatch({ action: QueryDataActions.FitView, fitToSelection: true, duration: FIT_VIEW_DURATION });
        }
        break;
    }
  }, [state.edges, state.fitViewAfterLayout, state.laidOut, state.measurements, state.nodes]);

  return [state, dispatch];
};

export default useQueryData;
