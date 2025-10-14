import { describe, it } from 'vitest';
import deselectEdge from './deselectEdge';
import { QueryData, LayoutState, QueryDataActions } from '..';
import type { DeselectEdgeAction } from './deselectEdge';
import { Edge, MarkerType } from '@xyflow/react';
import { ELKEdgeData } from '@/ELKEdge';
import { nodeIdFromResourceId, edgeIdFromResourceIds } from '@/lib/utils';
import MenuSection from '@/lib/menuSection';

// Resource ID constants
const RESOURCE_1_ID: ResourceId = [{ type: 'test', id: '1' }];
const RESOURCE_2_ID: ResourceId = [{ type: 'test', id: '2' }];
const RESOURCE_3_ID: ResourceId = [{ type: 'test', id: '3' }];

// Generated ID constants
const NODE_1_ID = nodeIdFromResourceId(RESOURCE_1_ID);
const NODE_2_ID = nodeIdFromResourceId(RESOURCE_2_ID);
const NODE_3_ID = nodeIdFromResourceId(RESOURCE_3_ID);
const EDGE_1_ID = edgeIdFromResourceIds(RESOURCE_1_ID, RESOURCE_2_ID);
const EDGE_2_ID = edgeIdFromResourceIds(RESOURCE_2_ID, RESOURCE_3_ID);
const RESOURCE_1_SELECTION_ID = NODE_1_ID;

describe('deselectEdge', () => {
  const createMockState = (): QueryData => ({
    section: MenuSection.Secrets,
    resources: [],
    events: [],
    environments: [],
    resourcesEnvironments: {},
    resourceEvents: [],
    eventChainLinks: {},
    nodes: {},
    edges: {
      [EDGE_1_ID]: {
        id: EDGE_1_ID,
        source: NODE_1_ID,
        target: NODE_2_ID,
        selected: true,
        markerEnd: { type: MarkerType.ArrowClosed, color: 'selected' },
        data: { originalSourceId: NODE_1_ID, originalTargetId: NODE_2_ID, label: {}, events: [] },
      } as Edge<ELKEdgeData>,
      [EDGE_2_ID]: {
        id: EDGE_2_ID,
        source: NODE_2_ID,
        target: NODE_3_ID,
        selected: false,
        data: { originalSourceId: NODE_2_ID, originalTargetId: NODE_3_ID, label: {}, events: [] },
      } as Edge<ELKEdgeData>,
    },
    measurements: {},
    viewport: { x: 0, y: 0, zoom: 1 },
    fitViewAfterLayout: false,
    laidOut: LayoutState.LaidOut,
    selection: { resources: new Set(), edges: new Set([EDGE_1_ID]), issues: new Set() },
    dateFilter: { startDate: new Date('2025-06-01'), endDate: new Date('2025-07-01') },
    originalData: { resources: [], events: [] },
  });

  it('should deselect an edge', ({ expect }) => {
    const state = createMockState();
    const action: DeselectEdgeAction = { action: QueryDataActions.DeselectEdge, edgeId: EDGE_1_ID };

    const result = deselectEdge(state, action);

    expect(result.edges[EDGE_1_ID].selected).toBe(false);
    expect(result.edges[EDGE_1_ID].markerEnd).toBeUndefined();
    expect(result.selection.edges.has(EDGE_1_ID)).toBe(false);
    expect(result).not.toBe(state);
  });

  it('should not change state if edge is not selected', ({ expect }) => {
    const state = createMockState();
    state.edges[EDGE_2_ID].selected = false;

    const action: DeselectEdgeAction = { action: QueryDataActions.DeselectEdge, edgeId: EDGE_2_ID };

    const result = deselectEdge(state, action);

    expect(result).toBe(state); // Should return same object
  });

  it('should remove issues that depend on the deselected edge', ({ expect }) => {
    const state = createMockState();
    state.issues = new Map([
      ['issue-1', { id: 'issue-1', message: 'Edge Issue', resourceIds: [], edgeIds: [EDGE_1_ID, EDGE_2_ID] }],
      ['issue-2', { id: 'issue-2', message: 'Another Issue', resourceIds: [], edgeIds: [EDGE_2_ID] }],
    ]);
    state.selection.issues = new Set(['issue-1', 'issue-2']);

    const action: DeselectEdgeAction = { action: QueryDataActions.DeselectEdge, edgeId: EDGE_1_ID };

    const result = deselectEdge(state, action);

    expect(result.selection.issues.has('issue-1')).toBe(false); // Removed because it depends on edge-1
    expect(result.selection.issues.has('issue-2')).toBe(true); // Kept because it doesn't depend on edge-1
  });

  it('should not affect issues that are not selected', ({ expect }) => {
    const state = createMockState();
    state.issues = new Map([
      ['issue-1', { id: 'issue-1', message: 'Edge Issue', resourceIds: [], edgeIds: [EDGE_1_ID] }],
    ]);
    // Issue is not in selection
    state.selection.issues = new Set();

    const action: DeselectEdgeAction = { action: QueryDataActions.DeselectEdge, edgeId: EDGE_1_ID };

    const result = deselectEdge(state, action);

    expect(result.selection.issues.size).toBe(0);
  });

  it('should handle state without issues', ({ expect }) => {
    const state = createMockState();
    state.issues = undefined;

    const action: DeselectEdgeAction = { action: QueryDataActions.DeselectEdge, edgeId: EDGE_1_ID };

    const result = deselectEdge(state, action);

    expect(result.edges[EDGE_1_ID].selected).toBe(false);
    expect(result.selection.edges.has(EDGE_1_ID)).toBe(false);
  });

  it('should preserve other edge properties when deselecting', ({ expect }) => {
    const state = createMockState();
    const originalData = state.edges[EDGE_1_ID].data;
    const originalSource = state.edges[EDGE_1_ID].source;
    const originalTarget = state.edges[EDGE_1_ID].target;

    const action: DeselectEdgeAction = { action: QueryDataActions.DeselectEdge, edgeId: EDGE_1_ID };

    const result = deselectEdge(state, action);

    expect(result.edges[EDGE_1_ID].data).toEqual(originalData);
    expect(result.edges[EDGE_1_ID].source).toBe(originalSource);
    expect(result.edges[EDGE_1_ID].target).toBe(originalTarget);
  });

  it('should not affect other selected edges', ({ expect }) => {
    const state = createMockState();
    state.edges[EDGE_2_ID].selected = true;
    state.selection.edges = new Set([EDGE_1_ID, EDGE_2_ID]);

    const action: DeselectEdgeAction = { action: QueryDataActions.DeselectEdge, edgeId: EDGE_1_ID };

    const result = deselectEdge(state, action);

    expect(result.edges[EDGE_2_ID].selected).toBe(true);
    expect(result.selection.edges.has(EDGE_2_ID)).toBe(true);
    expect(result.selection.edges.has(EDGE_1_ID)).toBe(false);
  });

  it('should preserve other state properties', ({ expect }) => {
    const state = createMockState();
    state.resources = [{ id: RESOURCE_1_ID, environments: [], first_seen_at: '', last_seen_at: '' }];
    state.measurements = { [NODE_1_ID]: { width: 100, height: 50 } };
    state.selection.resources = new Set([RESOURCE_1_SELECTION_ID]);

    const action: DeselectEdgeAction = { action: QueryDataActions.DeselectEdge, edgeId: EDGE_1_ID };

    const result = deselectEdge(state, action);

    expect(result.resources).toEqual(state.resources);
    expect(result.measurements).toEqual(state.measurements);
    expect(result.viewport).toEqual(state.viewport);
    expect(result.section).toBe(state.section);
    expect(result.selection.resources).toEqual(state.selection.resources);
  });
});
