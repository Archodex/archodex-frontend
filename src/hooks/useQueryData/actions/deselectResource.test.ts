import { describe, it } from 'vitest';
import deselectResource from './deselectResource';
import { QueryData, LayoutState, QueryDataActions } from '..';
import type { DeselectResourceAction } from './deselectResource';
import { Node, Edge, MarkerType } from '@xyflow/react';
import { ResourceNodeData } from '@/ResourceNode';
import { ELKEdgeData } from '@/ELKEdge';
import { nodeIdFromResourceId, edgeIdFromResourceIds } from '@/lib/utils';
import MenuSection from '@/lib/menuSection';

describe('deselectResource', () => {
  const RESOURCE_1_ID = [{ type: 'test', id: '1' }];
  const RESOURCE_2_ID = [{ type: 'test', id: '2' }];
  const NODE_1_ID = nodeIdFromResourceId(RESOURCE_1_ID);
  const NODE_2_ID = nodeIdFromResourceId(RESOURCE_2_ID);
  const EDGE_ID = edgeIdFromResourceIds(RESOURCE_1_ID, RESOURCE_2_ID);

  const createMockState = (): QueryData => ({
    section: MenuSection.Secrets,
    resources: [],
    events: [],
    environments: [],
    resourcesEnvironments: {},
    resourceEvents: [
      {
        principal: RESOURCE_1_ID,
        resource: RESOURCE_2_ID,
        type: 'test-event',
        principal_chains: [],
        first_seen_at: '',
        last_seen_at: '',
      },
    ],
    eventChainLinks: {},
    nodes: {
      [NODE_1_ID]: {
        id: NODE_1_ID,
        position: { x: 0, y: 0 },
        data: { id: RESOURCE_1_ID } as ResourceNodeData,
        selected: true,
      } as Node<ResourceNodeData>,
      [NODE_2_ID]: {
        id: NODE_2_ID,
        position: { x: 100, y: 0 },
        data: { id: RESOURCE_2_ID } as ResourceNodeData,
        selected: true,
      } as Node<ResourceNodeData>,
    },
    edges: {
      [EDGE_ID]: {
        id: EDGE_ID,
        source: NODE_1_ID,
        target: NODE_2_ID,
        selected: true,
        markerEnd: { type: MarkerType.ArrowClosed, color: 'selected' },
        data: {} as ELKEdgeData,
      } as Edge<ELKEdgeData>,
    },
    measurements: {},
    viewport: { x: 0, y: 0, zoom: 1 },
    fitViewAfterLayout: false,
    laidOut: LayoutState.LaidOut,
    selection: { resources: new Set([NODE_1_ID, NODE_2_ID]), edges: new Set([EDGE_ID]), issues: new Set() },
    dateFilter: { startDate: new Date('2025-06-01'), endDate: new Date('2025-07-01') },
    originalData: { resources: [], events: [] },
  });

  it('should deselect a resource node', ({ expect }) => {
    const state = createMockState();
    const action: DeselectResourceAction = { action: QueryDataActions.DeselectResource, resourceId: NODE_1_ID };

    const result = deselectResource(state, action);

    expect(result.nodes[NODE_1_ID].selected).toBe(false);
    expect(result.selection.resources.has(NODE_1_ID)).toBe(false);
    expect(result.selection.resources.has(NODE_2_ID)).toBe(true);
    expect(result).not.toBe(state);
  });

  it('should not change state if resource is not selected', ({ expect }) => {
    const state = createMockState();
    state.nodes[NODE_1_ID].selected = false;
    state.selection.resources.delete(NODE_1_ID);

    const action: DeselectResourceAction = { action: QueryDataActions.DeselectResource, resourceId: NODE_1_ID };

    const result = deselectResource(state, action);

    expect(result).toBe(state); // Should return same object
  });

  it('should remove edges when both endpoints are deselected', ({ expect }) => {
    const state = createMockState();
    // First deselect resource-1
    const action1: DeselectResourceAction = { action: QueryDataActions.DeselectResource, resourceId: NODE_1_ID };

    let result = deselectResource(state, action1);

    // Edge should still be selected since resource-2 is still selected
    expect(result.selection.edges.size).toBe(1);
    expect(result.selection.edges.has(EDGE_ID)).toBe(true);
    // Edge object should still be selected in state.edges
    expect(result.edges[EDGE_ID].selected).toBe(true);
    expect(result.edges[EDGE_ID].markerEnd).toBeDefined();

    // Now deselect resource-2
    const action2: DeselectResourceAction = { action: QueryDataActions.DeselectResource, resourceId: NODE_2_ID };

    result = deselectResource(result, action2);

    // Edge should now be deselected from selection set
    expect(result.selection.edges.size).toBe(0);
    expect(result.selection.edges.has(EDGE_ID)).toBe(false);

    // Edge object should also be deselected in state.edges for ReactFlow
    expect(result.edges[EDGE_ID].selected).toBe(false);
    expect(result.edges[EDGE_ID].markerEnd).toBeUndefined();
  });

  it('should keep edges when at least one endpoint is selected', ({ expect }) => {
    const state = createMockState();
    state.selection.resources = new Set([NODE_1_ID, NODE_2_ID]);

    const action: DeselectResourceAction = { action: QueryDataActions.DeselectResource, resourceId: NODE_1_ID };

    const result = deselectResource(state, action);

    // Edge should still be selected since resource-2 is still selected
    expect(result.selection.edges.size).toBe(1);
  });

  it('should remove issues that depend on the deselected resource', ({ expect }) => {
    const state = createMockState();
    state.issues = new Map([
      ['issue-1', { id: 'issue-1', message: 'Test Issue', resourceIds: [NODE_1_ID, NODE_2_ID], edgeIds: [] }],
      ['issue-2', { id: 'issue-2', message: 'Another Issue', resourceIds: [NODE_2_ID], edgeIds: [] }],
    ]);
    state.selection.issues = new Set(['issue-1', 'issue-2']);

    const action: DeselectResourceAction = { action: QueryDataActions.DeselectResource, resourceId: NODE_1_ID };

    const result = deselectResource(state, action);

    expect(result.selection.issues.has('issue-1')).toBe(false); // Removed because it depends on resource-1
    expect(result.selection.issues.has('issue-2')).toBe(true); // Kept because it doesn't depend on resource-1
  });

  it('should remove issues that depend on deselected edges', ({ expect }) => {
    const state = createMockState();
    state.issues = new Map([
      ['issue-1', { id: 'issue-1', message: 'Edge Issue', resourceIds: [], edgeIds: [EDGE_ID] }],
    ]);
    state.selection.issues = new Set(['issue-1']);

    // Deselect resource-1, which will deselect the edge
    const action: DeselectResourceAction = { action: QueryDataActions.DeselectResource, resourceId: NODE_1_ID };

    // First, modify the state so only resource-1 is selected (edge will be deselected)
    state.selection.resources = new Set([NODE_1_ID]);
    state.nodes[NODE_2_ID].selected = false;

    const result = deselectResource(state, action);

    expect(result.selection.edges.size).toBe(0); // Edge should be deselected
    expect(result.selection.issues.has('issue-1')).toBe(false); // Issue should be removed
  });

  it('should handle state without issues', ({ expect }) => {
    const state = createMockState();
    state.issues = undefined;

    const action: DeselectResourceAction = { action: QueryDataActions.DeselectResource, resourceId: NODE_1_ID };

    const result = deselectResource(state, action);

    expect(result.nodes[NODE_1_ID].selected).toBe(false);
    expect(result.selection.resources.has(NODE_1_ID)).toBe(false);
  });

  it('should handle empty resourceEvents', ({ expect }) => {
    const state = createMockState();
    state.resourceEvents = [];
    state.selection.edges = new Set();

    const action: DeselectResourceAction = { action: QueryDataActions.DeselectResource, resourceId: NODE_1_ID };

    const result = deselectResource(state, action);

    expect(result.nodes[NODE_1_ID].selected).toBe(false);
    expect(result.selection.edges.size).toBe(0);
  });

  it('should preserve other state properties', ({ expect }) => {
    const state = createMockState();
    state.resources = [{ id: [{ type: 'test', id: '1' }], environments: [], first_seen_at: '', last_seen_at: '' }];
    state.measurements = { [NODE_1_ID]: { width: 100, height: 50 } };

    const action: DeselectResourceAction = { action: QueryDataActions.DeselectResource, resourceId: NODE_1_ID };

    const result = deselectResource(state, action);

    expect(result.resources).toEqual(state.resources);
    expect(result.measurements).toEqual(state.measurements);
    expect(result.viewport).toEqual(state.viewport);
    expect(result.section).toBe(state.section);
  });
});
