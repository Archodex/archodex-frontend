import { describe, it } from 'vitest';
import selectEdge from './selectEdge';
import { QueryData, LayoutState, QueryDataActions } from '..';
import type { SelectEdgeAction } from './selectEdge';
import { Node, Edge } from '@xyflow/react';
import { ResourceNodeData } from '@/ResourceNode';
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
const EDGE_0_ID = `${NODE_1_ID}-edge-0`;
const EDGE_1_ID = edgeIdFromResourceIds(RESOURCE_1_ID, RESOURCE_2_ID);
const EDGE_2_ID = edgeIdFromResourceIds(RESOURCE_2_ID, RESOURCE_3_ID);
const RESOURCE_1_SELECTION_ID = NODE_1_ID;

describe('selectEdge', () => {
  const createMockState = (): QueryData => ({
    section: MenuSection.Secrets,
    resources: [],
    events: [],
    environments: [],
    resourcesEnvironments: {},
    resourceEvents: [],
    eventChainLinks: {
      [EDGE_1_ID]: { preceding: new Set([EDGE_0_ID]), following: new Set([EDGE_2_ID]) },
      [EDGE_0_ID]: { preceding: new Set(), following: new Set([EDGE_1_ID]) },
      [EDGE_2_ID]: { preceding: new Set([EDGE_1_ID]), following: new Set() },
    },
    nodes: {
      [NODE_1_ID]: {
        id: NODE_1_ID,
        position: { x: 0, y: 0 },
        data: {
          id: RESOURCE_1_ID,
          numChildren: 0,
          collapsed: false,
          originalParentId: undefined,
          parentResourceId: undefined,
        } as ResourceNodeData,
        selected: false,
        hidden: false,
      } as Node<ResourceNodeData>,
      [NODE_2_ID]: {
        id: NODE_2_ID,
        position: { x: 100, y: 0 },
        data: {
          id: RESOURCE_2_ID,
          numChildren: 0,
          collapsed: false,
          originalParentId: undefined,
          parentResourceId: undefined,
        } as ResourceNodeData,
        selected: false,
        hidden: false,
      } as Node<ResourceNodeData>,
      [NODE_3_ID]: {
        id: NODE_3_ID,
        position: { x: 200, y: 0 },
        data: {
          id: RESOURCE_3_ID,
          numChildren: 0,
          collapsed: false,
          originalParentId: undefined,
          parentResourceId: undefined,
        } as ResourceNodeData,
        selected: false,
        hidden: true,
      } as Node<ResourceNodeData>,
    },
    edges: {
      [EDGE_0_ID]: {
        id: EDGE_0_ID,
        source: NODE_1_ID,
        target: NODE_2_ID,
        selected: false,
        data: { originalSourceId: NODE_1_ID, originalTargetId: NODE_2_ID, label: {}, events: [] },
      } as Edge<ELKEdgeData>,
      [EDGE_1_ID]: {
        id: EDGE_1_ID,
        source: NODE_1_ID,
        target: NODE_2_ID,
        selected: false,
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
    selection: { resources: new Set(), edges: new Set(), issues: new Set() },
    dateFilter: { startDate: new Date('2025-06-01'), endDate: new Date('2025-07-01') },
    originalData: { resources: [], events: [] },
  });

  it('should select an edge', ({ expect }) => {
    const state = createMockState();
    const action: SelectEdgeAction = { action: QueryDataActions.SelectEdge, edgeId: EDGE_1_ID };

    const result = selectEdge(state, action);

    expect(result.edges[EDGE_1_ID].selected).toBe(true);
    expect(result.edges[EDGE_1_ID].markerEnd).toBeDefined();
    expect(result.selection.edges.has(EDGE_1_ID)).toBe(true);
    expect(result).not.toBe(state);
  });

  it('should not change state if edge is already selected', ({ expect }) => {
    const state = createMockState();
    state.edges[EDGE_1_ID].selected = true;
    state.selection.edges.add(EDGE_1_ID);

    const action: SelectEdgeAction = { action: QueryDataActions.SelectEdge, edgeId: EDGE_1_ID };

    const result = selectEdge(state, action);

    expect(result).toBe(state); // Should return same object
  });

  it('should select all edges in the event chain', ({ expect }) => {
    const state = createMockState();
    const action: SelectEdgeAction = { action: QueryDataActions.SelectEdge, edgeId: EDGE_1_ID };

    const result = selectEdge(state, action);

    expect(result.edges[EDGE_0_ID].selected).toBe(true); // Preceding edge
    expect(result.edges[EDGE_1_ID].selected).toBe(true); // Selected edge
    expect(result.edges[EDGE_2_ID].selected).toBe(true); // Following edge
    expect(result.selection.edges.has(EDGE_0_ID)).toBe(true);
    expect(result.selection.edges.has(EDGE_1_ID)).toBe(true);
    expect(result.selection.edges.has(EDGE_2_ID)).toBe(true);
  });

  it('should show hidden source and target nodes', ({ expect }) => {
    const state = createMockState();
    // Hide the target node of edge-2
    state.nodes[NODE_3_ID].hidden = true;

    const action: SelectEdgeAction = { action: QueryDataActions.SelectEdge, edgeId: EDGE_2_ID };

    const result = selectEdge(state, action);

    // showNode removes the hidden property entirely
    expect(result.nodes[NODE_3_ID].hidden).toBeUndefined();
    expect(result.laidOut).toBe(LayoutState.Initial);
    expect(result.measurements).not.toBe(state.measurements);
    expect(result.measurements[NODE_3_ID]).toBeUndefined(); // showNode clears measurements
  });

  it('should set fitViewAfterLayout when refitView is true', ({ expect }) => {
    const state = createMockState();
    const action: SelectEdgeAction = { action: QueryDataActions.SelectEdge, edgeId: EDGE_1_ID, refitView: true };

    const result = selectEdge(state, action);

    expect(result.fitViewAfterLayout).toBe(true);
  });

  it('should default refitView to true', ({ expect }) => {
    const state = createMockState();
    const action: SelectEdgeAction = { action: QueryDataActions.SelectEdge, edgeId: EDGE_1_ID };

    const result = selectEdge(state, action);

    expect(result.fitViewAfterLayout).toBe(true);
  });

  it('should preserve fitViewAfterLayout if already true', ({ expect }) => {
    const state = createMockState();
    state.fitViewAfterLayout = true;

    const action: SelectEdgeAction = { action: QueryDataActions.SelectEdge, edgeId: EDGE_1_ID, refitView: false };

    const result = selectEdge(state, action);

    expect(result.fitViewAfterLayout).toBe(true);
  });

  it('should select issues when all dependencies are selected', ({ expect }) => {
    const state = createMockState();
    state.selection.resources = new Set([RESOURCE_1_SELECTION_ID]);
    state.issues = new Map([
      [
        'issue-1',
        { id: 'issue-1', message: 'Test Issue', resourceIds: [RESOURCE_1_SELECTION_ID], edgeIds: [EDGE_1_ID] },
      ],
    ]);

    const action: SelectEdgeAction = { action: QueryDataActions.SelectEdge, edgeId: EDGE_1_ID };

    const result = selectEdge(state, action);

    expect(result.selection.issues.has('issue-1')).toBe(true);
  });

  it('should not select issues if already selected', ({ expect }) => {
    const state = createMockState();
    state.selection.resources = new Set([RESOURCE_1_SELECTION_ID]);
    state.selection.issues.add('issue-1');
    state.issues = new Map([
      [
        'issue-1',
        { id: 'issue-1', message: 'Test Issue', resourceIds: [RESOURCE_1_SELECTION_ID], edgeIds: [EDGE_1_ID] },
      ],
    ]);

    const action: SelectEdgeAction = { action: QueryDataActions.SelectEdge, edgeId: EDGE_1_ID };

    const result = selectEdge(state, action);

    expect(result.selection.issues.size).toBe(1);
    expect(result.selection.issues.has('issue-1')).toBe(true);
  });

  it('should handle edges with no event chain links', ({ expect }) => {
    const state = createMockState();
    state.eventChainLinks[EDGE_1_ID] = { preceding: new Set(), following: new Set() };

    const action: SelectEdgeAction = { action: QueryDataActions.SelectEdge, edgeId: EDGE_1_ID };

    const result = selectEdge(state, action);

    expect(result.edges[EDGE_1_ID].selected).toBe(true);
    expect(result.selection.edges.size).toBe(1); // Only the selected edge
  });

  it('should handle state without issues', ({ expect }) => {
    const state = createMockState();
    state.issues = undefined;

    const action: SelectEdgeAction = { action: QueryDataActions.SelectEdge, edgeId: EDGE_1_ID };

    const result = selectEdge(state, action);

    expect(result.edges[EDGE_1_ID].selected).toBe(true);
    expect(result.selection.issues.size).toBe(0);
  });

  it('should preserve other state properties', ({ expect }) => {
    const state = createMockState();
    state.resources = [{ id: RESOURCE_1_ID, environments: [], first_seen_at: '', last_seen_at: '' }];
    state.measurements = { [NODE_1_ID]: { width: 100, height: 50 } };

    const action: SelectEdgeAction = { action: QueryDataActions.SelectEdge, edgeId: EDGE_1_ID };

    const result = selectEdge(state, action);

    expect(result.resources).toEqual(state.resources);
    expect(result.viewport).toEqual(state.viewport);
    expect(result.section).toBe(state.section);
  });
});
