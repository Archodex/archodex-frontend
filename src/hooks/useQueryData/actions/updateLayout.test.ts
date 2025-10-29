import { beforeEach, describe, it, vi } from 'vitest';
import updateLayout from './updateLayout';
import { QueryData, LayoutState, QueryDataActions } from '..';
import type { UpdateLayoutAction } from './updateLayout';
import { Node, Edge } from '@xyflow/react';
import { ResourceNodeData } from '@/ResourceNode';
import { ELKEdgeData } from '@/ELKEdge';
import { nodeIdFromResourceId, edgeIdFromResourceIds } from '@/lib/utils';
import { fitViewport } from './fitView';
import MenuSection from '@/lib/menuSection';

// Resource ID constants
const OLD_RESOURCE_ID: ResourceId = [{ type: 'test', id: 'old' }];
const NEW_NODE_1_RESOURCE_ID: ResourceId = [{ type: 'test', id: 'new1' }];
const NEW_NODE_2_RESOURCE_ID: ResourceId = [{ type: 'test', id: 'new2' }];
const ROOT_RESOURCE_ID: ResourceId = [{ type: 'test', id: 'root' }];
const CHILD_RESOURCE_ID: ResourceId = [{ type: 'test', id: 'child' }];

// Mock the fitViewport function
vi.mock('./fitView', () => ({ fitViewport: vi.fn() }));

beforeEach(() => {
  const mockFitViewport = vi.mocked(fitViewport);
  mockFitViewport.mockClear();
  mockFitViewport.mockReturnValue({ x: 100, y: 50, zoom: 0.8 });
});

describe('updateLayout', () => {
  const OLD_NODE_ID = nodeIdFromResourceId(OLD_RESOURCE_ID);
  const NEW_NODE_1_ID = nodeIdFromResourceId(NEW_NODE_1_RESOURCE_ID);
  const NEW_NODE_2_ID = nodeIdFromResourceId(NEW_NODE_2_RESOURCE_ID);
  const ROOT_NODE_ID = nodeIdFromResourceId(ROOT_RESOURCE_ID);
  const CHILD_NODE_ID = nodeIdFromResourceId(CHILD_RESOURCE_ID);
  const OLD_EDGE_ID = edgeIdFromResourceIds(OLD_RESOURCE_ID, OLD_RESOURCE_ID);
  const NEW_EDGE_ID = edgeIdFromResourceIds(NEW_NODE_1_RESOURCE_ID, NEW_NODE_2_RESOURCE_ID);
  const SELF_EDGE_ID = edgeIdFromResourceIds(ROOT_RESOURCE_ID, CHILD_RESOURCE_ID);

  const createMockState = (): QueryData => ({
    section: MenuSection.Secrets,
    resources: [],
    events: [],
    environments: [],
    resourcesEnvironments: {},
    resourceEvents: [],
    eventChainLinks: {},
    nodes: {
      OLD_NODE_ID: {
        id: OLD_NODE_ID,
        position: { x: 0, y: 0 },
        data: { id: OLD_RESOURCE_ID } as ResourceNodeData,
      } as Node<ResourceNodeData>,
    },
    edges: {
      OLD_EDGE_ID: {
        id: OLD_EDGE_ID,
        source: OLD_NODE_ID,
        target: OLD_NODE_ID,
        data: {} as ELKEdgeData,
      } as Edge<ELKEdgeData>,
    },
    measurements: {},
    viewport: { x: 0, y: 0, zoom: 1 },
    fitViewAfterLayout: false,
    laidOut: LayoutState.Initial,
    selection: { resources: new Set(), edges: new Set(), issues: new Set() },
    dateFilter: { startDate: new Date('2025-06-01'), endDate: new Date('2025-07-01') },
    originalData: { resources: [], events: [] },
  });

  const createMockLayoutNodes = (): Record<string, Node<ResourceNodeData>> => ({
    [NEW_NODE_1_ID]: {
      id: NEW_NODE_1_ID,
      position: { x: 100, y: 100 },
      data: { id: NEW_NODE_1_RESOURCE_ID } as ResourceNodeData,
      width: 200,
      height: 100,
    } as Node<ResourceNodeData>,
    [NEW_NODE_2_ID]: {
      id: NEW_NODE_2_ID,
      position: { x: 400, y: 200 },
      data: { id: NEW_NODE_2_RESOURCE_ID } as ResourceNodeData,
      width: 150,
      height: 80,
    } as Node<ResourceNodeData>,
  });

  const createMockLayoutEdges = (): Record<string, Edge<ELKEdgeData>> => ({
    [NEW_EDGE_ID]: {
      id: NEW_EDGE_ID,
      source: NEW_NODE_1_ID,
      target: NEW_NODE_2_ID,
      data: {
        section: { startPoint: { x: 200, y: 150 }, endPoint: { x: 400, y: 240 }, bendPoints: [{ x: 300, y: 195 }] },
      } as ELKEdgeData,
    } as Edge<ELKEdgeData>,
  });

  it('should update nodes and edges with layout data', ({ expect }) => {
    const state = createMockState();
    const layoutNodes = createMockLayoutNodes();
    const layoutEdges = createMockLayoutEdges();

    const action: UpdateLayoutAction = {
      action: QueryDataActions.UpdateLayout,
      nodes: layoutNodes,
      edges: layoutEdges,
    };

    const result = updateLayout(state, action);

    expect(result.nodes).toBe(layoutNodes);
    expect(result.edges).toBe(layoutEdges);
  });

  it('should set layout state to LaidOut', ({ expect }) => {
    const state = createMockState();
    const layoutNodes = createMockLayoutNodes();
    const layoutEdges = createMockLayoutEdges();

    const action: UpdateLayoutAction = {
      action: QueryDataActions.UpdateLayout,
      nodes: layoutNodes,
      edges: layoutEdges,
    };

    const result = updateLayout(state, action);

    expect(result.laidOut).toBe(LayoutState.LaidOut);
  });

  it('should reset fitViewAfterLayout to false', ({ expect }) => {
    const state = createMockState();
    state.fitViewAfterLayout = true;

    const layoutNodes = createMockLayoutNodes();
    const layoutEdges = createMockLayoutEdges();

    const action: UpdateLayoutAction = {
      action: QueryDataActions.UpdateLayout,
      nodes: layoutNodes,
      edges: layoutEdges,
    };

    const result = updateLayout(state, action);

    expect(result.fitViewAfterLayout).toBe(false);
  });

  it('should fit viewport when fitViewAfterLayout is true', ({ expect }) => {
    const mockFitViewport = vi.mocked(fitViewport);

    const state = createMockState();
    state.fitViewAfterLayout = true;

    const layoutNodes = createMockLayoutNodes();
    const layoutEdges = createMockLayoutEdges();

    const action: UpdateLayoutAction = {
      action: QueryDataActions.UpdateLayout,
      nodes: layoutNodes,
      edges: layoutEdges,
    };

    const result = updateLayout(state, action);

    expect(mockFitViewport).toHaveBeenCalledWith(layoutNodes, layoutEdges);
    expect(result.viewport).toEqual({ x: 100, y: 50, zoom: 0.8 });
  });

  it('should preserve viewport when fitViewAfterLayout is false', ({ expect }) => {
    const mockFitViewport = vi.mocked(fitViewport);

    const state = createMockState();
    state.fitViewAfterLayout = false;
    state.viewport = { x: 200, y: 150, zoom: 1.5 };

    const layoutNodes = createMockLayoutNodes();
    const layoutEdges = createMockLayoutEdges();

    const action: UpdateLayoutAction = {
      action: QueryDataActions.UpdateLayout,
      nodes: layoutNodes,
      edges: layoutEdges,
    };

    const result = updateLayout(state, action);

    expect(mockFitViewport).not.toHaveBeenCalled();
    expect(result.viewport).toEqual({ x: 200, y: 150, zoom: 1.5 });
  });

  it('should preserve other state properties', ({ expect }) => {
    const state = createMockState();
    state.resources = [{ id: NEW_NODE_1_RESOURCE_ID, environments: [], first_seen_at: '', last_seen_at: '' }];
    state.environments = ['prod', 'staging'];
    state.measurements = { [NEW_NODE_1_ID]: { width: 100, height: 50 } };
    state.selection.resources = new Set([NEW_NODE_1_ID]);

    const layoutNodes = createMockLayoutNodes();
    const layoutEdges = createMockLayoutEdges();

    const action: UpdateLayoutAction = {
      action: QueryDataActions.UpdateLayout,
      nodes: layoutNodes,
      edges: layoutEdges,
    };

    const result = updateLayout(state, action);

    expect(result.resources).toEqual(state.resources);
    expect(result.environments).toEqual(state.environments);
    expect(result.measurements).toEqual(state.measurements);
    expect(result.selection).toEqual(state.selection);
    expect(result.section).toBe(state.section);
  });

  it('should handle empty nodes and edges', ({ expect }) => {
    const state = createMockState();

    const action: UpdateLayoutAction = { action: QueryDataActions.UpdateLayout, nodes: {}, edges: {} };

    const result = updateLayout(state, action);

    expect(result.nodes).toEqual({});
    expect(result.edges).toEqual({});
    expect(result.laidOut).toBe(LayoutState.LaidOut);
  });

  it('should not mutate original state', ({ expect }) => {
    const state = createMockState();
    const originalNodes = state.nodes;
    const originalEdges = state.edges;
    const originalViewport = state.viewport;

    const layoutNodes = createMockLayoutNodes();
    const layoutEdges = createMockLayoutEdges();

    const action: UpdateLayoutAction = {
      action: QueryDataActions.UpdateLayout,
      nodes: layoutNodes,
      edges: layoutEdges,
    };

    const result = updateLayout(state, action);

    expect(result).not.toBe(state);
    expect(result.nodes).not.toBe(originalNodes);
    expect(result.edges).not.toBe(originalEdges);

    // Original state should remain unchanged
    expect(state.nodes).toBe(originalNodes);
    expect(state.edges).toBe(originalEdges);
    expect(state.viewport).toBe(originalViewport);
    expect(state.laidOut).toBe(LayoutState.Initial);
  });

  it('should handle complex node layout with positioning', ({ expect }) => {
    const state = createMockState();

    const complexNodes: Record<string, Node<ResourceNodeData>> = {
      [ROOT_NODE_ID]: {
        id: ROOT_NODE_ID,
        position: { x: 0, y: 0 },
        data: { id: ROOT_RESOURCE_ID, absolutePosition: { x: 0, y: 0 } } as ResourceNodeData,
        width: 300,
        height: 200,
      } as Node<ResourceNodeData>,
      [CHILD_NODE_ID]: {
        id: CHILD_NODE_ID,
        position: { x: 50, y: 50 },
        data: { id: CHILD_RESOURCE_ID, absolutePosition: { x: 50, y: 50 } } as ResourceNodeData,
        width: 200,
        height: 100,
        parentId: ROOT_NODE_ID,
        extent: 'parent' as const,
      } as Node<ResourceNodeData>,
    };

    const complexEdges: Record<string, Edge<ELKEdgeData>> = {
      [SELF_EDGE_ID]: {
        id: SELF_EDGE_ID,
        source: ROOT_NODE_ID,
        target: CHILD_NODE_ID,
        data: {
          section: {
            startPoint: { x: 150, y: 100 },
            endPoint: { x: 150, y: 100 },
            bendPoints: [
              { x: 100, y: 75 },
              { x: 200, y: 75 },
            ],
          },
        } as ELKEdgeData,
      } as Edge<ELKEdgeData>,
    };

    const action: UpdateLayoutAction = {
      action: QueryDataActions.UpdateLayout,
      nodes: complexNodes,
      edges: complexEdges,
    };

    const result = updateLayout(state, action);

    expect(result.nodes[ROOT_NODE_ID].position).toEqual({ x: 0, y: 0 });
    expect(result.nodes[CHILD_NODE_ID].position).toEqual({ x: 50, y: 50 });
    expect(result.nodes[CHILD_NODE_ID].parentId).toBe(ROOT_NODE_ID);
    expect(result.nodes[CHILD_NODE_ID].extent).toBe('parent');
    expect(result.edges[SELF_EDGE_ID].data?.section?.bendPoints).toEqual([
      { x: 100, y: 75 },
      { x: 200, y: 75 },
    ]);
  });

  it('should handle viewport fitting with different layout states', ({ expect }) => {
    const mockFitViewport = vi.mocked(fitViewport);
    mockFitViewport.mockReturnValue({ x: 250, y: 125, zoom: 0.6 });

    const state = createMockState();
    state.fitViewAfterLayout = true;
    state.laidOut = LayoutState.Measured;

    const layoutNodes = createMockLayoutNodes();
    const layoutEdges = createMockLayoutEdges();

    const action: UpdateLayoutAction = {
      action: QueryDataActions.UpdateLayout,
      nodes: layoutNodes,
      edges: layoutEdges,
    };

    const result = updateLayout(state, action);

    expect(result.laidOut).toBe(LayoutState.LaidOut);
    expect(result.viewport).toEqual({ x: 250, y: 125, zoom: 0.6 });
    expect(result.fitViewAfterLayout).toBe(false);
  });

  it('should pass nodes and edges to fitViewport correctly', ({ expect }) => {
    const mockFitViewport = vi.mocked(fitViewport);

    const state = createMockState();
    state.fitViewAfterLayout = true;

    const layoutNodes = createMockLayoutNodes();
    const layoutEdges = createMockLayoutEdges();

    const action: UpdateLayoutAction = {
      action: QueryDataActions.UpdateLayout,
      nodes: layoutNodes,
      edges: layoutEdges,
    };

    updateLayout(state, action);

    expect(mockFitViewport).toHaveBeenCalledWith(layoutNodes, layoutEdges);
    expect(mockFitViewport).toHaveBeenCalledTimes(1);
  });
});
