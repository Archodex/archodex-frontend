import { describe, it } from 'vitest';
import selectResource from './selectResource';
import { QueryData, LayoutState, QueryDataActions } from '..';
import type { SelectResourceAction } from './selectResource';
import { Node } from '@xyflow/react';
import { ResourceNodeData } from '@/ResourceNode';
import { nodeIdFromResourceId, edgeIdFromResourceIds } from '@/lib/utils';
import MenuSection from '@/lib/menuSection';

describe('selectResource', () => {
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
    resourceEvents: [],
    eventChainLinks: {},
    nodes: {
      [NODE_1_ID]: {
        id: NODE_1_ID,
        position: { x: 0, y: 0 },
        data: { id: RESOURCE_1_ID } as ResourceNodeData,
        selected: false,
        hidden: false,
      } as Node<ResourceNodeData>,
      [NODE_2_ID]: {
        id: NODE_2_ID,
        position: { x: 100, y: 0 },
        data: { id: RESOURCE_2_ID } as ResourceNodeData,
        selected: false,
        hidden: true,
      } as Node<ResourceNodeData>,
    },
    edges: {
      [EDGE_ID]: {
        id: EDGE_ID,
        source: NODE_1_ID,
        target: NODE_2_ID,
        selected: false,
        data: { originalSourceId: NODE_1_ID, originalTargetId: NODE_2_ID, label: {}, events: [] },
        type: 'elk',
      },
    },
    measurements: { [NODE_1_ID]: { width: 100, height: 50 } },
    viewport: { x: 0, y: 0, zoom: 1 },
    fitViewAfterLayout: false,
    laidOut: LayoutState.LaidOut,
    selection: { resources: new Set(), edges: new Set(), issues: new Set() },
    dateFilter: { startDate: new Date('2025-06-01'), endDate: new Date('2025-07-01') },
    originalData: { resources: [], events: [] },
  });

  it('should select a resource node', ({ expect }) => {
    const state = createMockState();
    const action: SelectResourceAction = { action: QueryDataActions.SelectResource, resourceId: NODE_1_ID };

    const result = selectResource(state, action);

    expect(result.nodes[NODE_1_ID].selected).toBe(true);
    expect(result.selection.resources.has(NODE_1_ID)).toBe(true);
    expect(result).not.toBe(state);
  });

  it('should not change state if resource is already selected', ({ expect }) => {
    const state = createMockState();
    state.nodes[NODE_1_ID].selected = true;
    state.selection.resources.add(NODE_1_ID);

    const action: SelectResourceAction = { action: QueryDataActions.SelectResource, resourceId: NODE_1_ID };

    const result = selectResource(state, action);

    expect(result).toBe(state); // Should return same object
  });

  it('should show hidden nodes when selected', ({ expect }) => {
    const state = createMockState();
    const action: SelectResourceAction = { action: QueryDataActions.SelectResource, resourceId: NODE_2_ID };

    const result = selectResource(state, action);

    expect(result.nodes[NODE_2_ID].selected).toBe(true);
    expect(result.laidOut).toBe(LayoutState.Initial);
    expect(result.measurements).not.toBe(state.measurements);
  });

  it('should select connected edges by default', ({ expect }) => {
    const state = createMockState();
    state.resourceEvents = [
      {
        principal: [{ type: 'test', id: '1' }],
        resource: [{ type: 'test', id: '2' }],
        type: 'test-event',
        principal_chains: [],
        first_seen_at: '',
        last_seen_at: '',
      },
    ];

    const action: SelectResourceAction = { action: QueryDataActions.SelectResource, resourceId: NODE_1_ID };

    const result = selectResource(state, action);

    expect(result.selection.edges.size).toBeGreaterThan(0);
    expect(result.edges).not.toBe(state.edges);
  });

  it('should not select edges when selectEdges is false', ({ expect }) => {
    const state = createMockState();
    state.resourceEvents = [
      {
        principal: [{ type: 'test', id: '1' }],
        resource: [{ type: 'test', id: '2' }],
        type: 'test-event',
        principal_chains: [],
        first_seen_at: '',
        last_seen_at: '',
      },
    ];

    const action: SelectResourceAction = {
      action: QueryDataActions.SelectResource,
      resourceId: NODE_1_ID,
      selectEdges: false,
    };

    const result = selectResource(state, action);

    expect(result.selection.edges.size).toBe(0);
    expect(result.edges).toBe(state.edges);
  });

  it('should set fitViewAfterLayout when refitView is true', ({ expect }) => {
    const state = createMockState();
    const action: SelectResourceAction = {
      action: QueryDataActions.SelectResource,
      resourceId: NODE_1_ID,
      refitView: true,
    };

    const result = selectResource(state, action);

    expect(result.fitViewAfterLayout).toBe(true);
  });

  it('should default refitView to true', ({ expect }) => {
    const state = createMockState();
    const action: SelectResourceAction = { action: QueryDataActions.SelectResource, resourceId: NODE_1_ID };

    const result = selectResource(state, action);

    expect(result.fitViewAfterLayout).toBe(true);
  });

  it('should preserve fitViewAfterLayout if already true', ({ expect }) => {
    const state = createMockState();
    state.fitViewAfterLayout = true;

    const action: SelectResourceAction = {
      action: QueryDataActions.SelectResource,
      resourceId: NODE_1_ID,
      refitView: false,
    };

    const result = selectResource(state, action);

    expect(result.fitViewAfterLayout).toBe(true);
  });

  it('should select issues when all dependencies are selected', ({ expect }) => {
    const state = createMockState();
    state.issues = new Map([
      ['issue-1', { id: 'issue-1', message: 'Test Issue', resourceIds: [NODE_1_ID], edgeIds: [] }],
    ]);

    const action: SelectResourceAction = { action: QueryDataActions.SelectResource, resourceId: NODE_1_ID };

    const result = selectResource(state, action);

    expect(result.selection.issues.has('issue-1')).toBe(true);
  });

  it('should not select issues if already selected', ({ expect }) => {
    const state = createMockState();
    state.selection.issues.add('issue-1');
    state.issues = new Map([
      ['issue-1', { id: 'issue-1', message: 'Test Issue', resourceIds: [NODE_1_ID], edgeIds: [] }],
    ]);

    const action: SelectResourceAction = { action: QueryDataActions.SelectResource, resourceId: NODE_1_ID };

    const result = selectResource(state, action);

    expect(result.selection.issues.size).toBe(1);
    expect(result.selection.issues.has('issue-1')).toBe(true);
  });
});
