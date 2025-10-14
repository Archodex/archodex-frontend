import { describe, it } from 'vitest';
import clearSelection from './clearSelection';
import { QueryData, LayoutState } from '..';
import { nodeIdFromResourceId, edgeIdFromResourceIds } from '@/lib/utils';
import MenuSection from '@/lib/menuSection';
import { Node, Edge } from '@xyflow/react';
import { ResourceNodeData } from '@/ResourceNode';
import { ELKEdgeData } from '@/ELKEdge';

// Resource ID constants
const RESOURCE_1_ID: ResourceId = [{ type: 'test', id: '1' }];
const RESOURCE_2_ID: ResourceId = [{ type: 'test', id: '2' }];

// Generated ID constants
const NODE_1_ID = nodeIdFromResourceId(RESOURCE_1_ID);
const RESOURCE_1_SELECTION_ID = NODE_1_ID;
const RESOURCE_2_SELECTION_ID = nodeIdFromResourceId(RESOURCE_2_ID);
const EDGE_1_ID = edgeIdFromResourceIds(RESOURCE_1_ID, RESOURCE_2_ID);
const EDGE_2_ID = `${NODE_1_ID}-edge-2`;
const EDGE_3_ID = `${NODE_1_ID}-edge-3`;
const ISSUE_1_ID = 'issue-1';

describe('clearSelection', () => {
  const createMockState = (): QueryData => ({
    section: MenuSection.Secrets,
    resources: [],
    events: [],
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
    selection: {
      resources: new Set([RESOURCE_1_SELECTION_ID, RESOURCE_2_SELECTION_ID]),
      edges: new Set([EDGE_1_ID, EDGE_2_ID, EDGE_3_ID]),
      issues: new Set([ISSUE_1_ID]),
    },
    dateFilter: { startDate: new Date('2025-06-01'), endDate: new Date('2025-07-01') },
    originalData: { resources: [], events: [] },
  });

  it('should clear all selections', ({ expect }) => {
    const state = createMockState();
    const result = clearSelection(state);

    expect(result.selection.resources.size).toBe(0);
    expect(result.selection.edges.size).toBe(0);
    expect(result.selection.issues.size).toBe(0);
    expect(result).not.toBe(state); // Should return new object
  });

  it('should create new Set instances', ({ expect }) => {
    const state = createMockState();
    const result = clearSelection(state);

    expect(result.selection.resources).not.toBe(state.selection.resources);
    expect(result.selection.edges).not.toBe(state.selection.edges);
    expect(result.selection.issues).not.toBe(state.selection.issues);
    expect(result.selection.resources).toBeInstanceOf(Set);
    expect(result.selection.edges).toBeInstanceOf(Set);
    expect(result.selection.issues).toBeInstanceOf(Set);
  });

  it('should return original state when all selections are already empty', ({ expect }) => {
    const state = createMockState();
    state.selection = { resources: new Set(), edges: new Set(), issues: new Set() };

    const result = clearSelection(state);

    expect(result.selection.resources.size).toBe(0);
    expect(result.selection.edges.size).toBe(0);
    expect(result.selection.issues.size).toBe(0);
    expect(result).toBe(state); // Should return same object when no changes needed
  });

  it('should preserve all other state properties', ({ expect }) => {
    const state = createMockState();
    state.resources = [{ id: RESOURCE_1_ID, environments: [], first_seen_at: '', last_seen_at: '' }];
    state.laidOut = LayoutState.LaidOut;
    state.measurements = { [NODE_1_ID]: { width: 100, height: 50 } };

    const result = clearSelection(state);

    expect(result.resources).toEqual(state.resources);
    expect(result.laidOut).toBe(state.laidOut);
    expect(result.measurements).toEqual(state.measurements);
    expect(result.viewport).toEqual(state.viewport);
    expect(result.section).toBe(state.section);
  });

  it('should not affect the original state', ({ expect }) => {
    const state = createMockState();
    const originalResourcesSize = state.selection.resources.size;
    const originalEdgesSize = state.selection.edges.size;
    const originalIssuesSize = state.selection.issues.size;

    clearSelection(state);

    expect(state.selection.resources.size).toBe(originalResourcesSize);
    expect(state.selection.edges.size).toBe(originalEdgesSize);
    expect(state.selection.issues.size).toBe(originalIssuesSize);
  });

  it('should set selected: false on all selected nodes', ({ expect }) => {
    const state = createMockState();
    state.nodes = {
      [NODE_1_ID]: {
        id: NODE_1_ID,
        position: { x: 0, y: 0 },
        data: { id: RESOURCE_1_ID } as ResourceNodeData,
        selected: true,
      } as Node<ResourceNodeData>,
      [nodeIdFromResourceId(RESOURCE_2_ID)]: {
        id: nodeIdFromResourceId(RESOURCE_2_ID),
        position: { x: 100, y: 100 },
        data: { id: RESOURCE_2_ID } as ResourceNodeData,
        selected: false,
      } as Node<ResourceNodeData>,
    };

    const result = clearSelection(state);

    expect(result.nodes[NODE_1_ID].selected).toBe(false);
    expect(result.nodes[nodeIdFromResourceId(RESOURCE_2_ID)].selected).toBe(false);
    expect(result.nodes).not.toBe(state.nodes);
    expect(result.nodes[NODE_1_ID]).not.toBe(state.nodes[NODE_1_ID]);
  });

  it('should set selected: false on all selected edges and remove markerEnd', ({ expect }) => {
    const state = createMockState();
    state.edges = {
      [EDGE_1_ID]: {
        id: EDGE_1_ID,
        source: NODE_1_ID,
        target: nodeIdFromResourceId(RESOURCE_2_ID),
        selected: true,
        markerEnd: { type: 'arrow' },
        data: {} as ELKEdgeData,
      } as Edge<ELKEdgeData>,
      [EDGE_2_ID]: {
        id: EDGE_2_ID,
        source: NODE_1_ID,
        target: nodeIdFromResourceId(RESOURCE_2_ID),
        selected: false,
        data: {} as ELKEdgeData,
      } as Edge<ELKEdgeData>,
    };

    const result = clearSelection(state);

    expect(result.edges[EDGE_1_ID].selected).toBe(false);
    expect(result.edges[EDGE_1_ID].markerEnd).toBeUndefined();
    expect(result.edges[EDGE_2_ID].selected).toBe(false);
    expect(result.edges).not.toBe(state.edges);
    expect(result.edges[EDGE_1_ID]).not.toBe(state.edges[EDGE_1_ID]);
  });

  it('should handle nodes and edges with no selected items', ({ expect }) => {
    const state = createMockState();
    state.nodes = {
      [NODE_1_ID]: {
        id: NODE_1_ID,
        position: { x: 0, y: 0 },
        data: { id: RESOURCE_1_ID } as ResourceNodeData,
        selected: false,
      } as Node<ResourceNodeData>,
    };
    state.edges = {
      [EDGE_1_ID]: {
        id: EDGE_1_ID,
        source: NODE_1_ID,
        target: nodeIdFromResourceId(RESOURCE_2_ID),
        selected: false,
        data: {} as ELKEdgeData,
      } as Edge<ELKEdgeData>,
    };

    const result = clearSelection(state);

    expect(result.nodes[NODE_1_ID].selected).toBe(false);
    expect(result.edges[EDGE_1_ID].selected).toBe(false);
    expect(result.nodes).toBe(state.nodes);
    expect(result.edges).toBe(state.edges);
  });

  it('should only create new nodes object if there are selected nodes to update', ({ expect }) => {
    const state = createMockState();
    state.nodes = {
      [NODE_1_ID]: {
        id: NODE_1_ID,
        position: { x: 0, y: 0 },
        data: { id: RESOURCE_1_ID } as ResourceNodeData,
        selected: true,
      } as Node<ResourceNodeData>,
      [nodeIdFromResourceId(RESOURCE_2_ID)]: {
        id: nodeIdFromResourceId(RESOURCE_2_ID),
        position: { x: 100, y: 100 },
        data: { id: RESOURCE_2_ID } as ResourceNodeData,
        selected: false,
      } as Node<ResourceNodeData>,
    };
    state.edges = {
      [EDGE_1_ID]: {
        id: EDGE_1_ID,
        source: NODE_1_ID,
        target: nodeIdFromResourceId(RESOURCE_2_ID),
        selected: false,
        data: {} as ELKEdgeData,
      } as Edge<ELKEdgeData>,
    };

    const result = clearSelection(state);

    // Should create new nodes object because node was selected
    expect(result.nodes).not.toBe(state.nodes);
    expect(result.nodes[NODE_1_ID].selected).toBe(false);
    // Should keep original edges object because no edges were selected
    expect(result.edges).toBe(state.edges);
  });

  it('should only create new edges object if there are selected edges to update', ({ expect }) => {
    const state = createMockState();
    state.nodes = {
      [NODE_1_ID]: {
        id: NODE_1_ID,
        position: { x: 0, y: 0 },
        data: { id: RESOURCE_1_ID } as ResourceNodeData,
        selected: false,
      } as Node<ResourceNodeData>,
    };
    state.edges = {
      [EDGE_1_ID]: {
        id: EDGE_1_ID,
        source: NODE_1_ID,
        target: nodeIdFromResourceId(RESOURCE_2_ID),
        selected: true,
        markerEnd: { type: 'arrow' },
        data: {} as ELKEdgeData,
      } as Edge<ELKEdgeData>,
      [EDGE_2_ID]: {
        id: EDGE_2_ID,
        source: NODE_1_ID,
        target: nodeIdFromResourceId(RESOURCE_2_ID),
        selected: false,
        data: {} as ELKEdgeData,
      } as Edge<ELKEdgeData>,
    };

    const result = clearSelection(state);

    // Should keep original nodes object because no nodes were selected
    expect(result.nodes).toBe(state.nodes);
    // Should create new edges object because edge was selected
    expect(result.edges).not.toBe(state.edges);
    expect(result.edges[EDGE_1_ID].selected).toBe(false);
    expect(result.edges[EDGE_1_ID].markerEnd).toBeUndefined();
  });

  it('should preserve nodes and edges without selected property', ({ expect }) => {
    const state = createMockState();
    state.nodes = {
      [NODE_1_ID]: {
        id: NODE_1_ID,
        position: { x: 0, y: 0 },
        data: { id: RESOURCE_1_ID } as ResourceNodeData,
        // No selected property
      } as Node<ResourceNodeData>,
    };
    state.edges = {
      [EDGE_1_ID]: {
        id: EDGE_1_ID,
        source: NODE_1_ID,
        target: nodeIdFromResourceId(RESOURCE_2_ID),
        data: {} as ELKEdgeData,
        // No selected property
      } as Edge<ELKEdgeData>,
    };

    const result = clearSelection(state);

    expect(result.nodes[NODE_1_ID].selected).toBeUndefined();
    expect(result.edges[EDGE_1_ID].selected).toBeUndefined();
    // Should return original objects when no changes needed
    expect(result.nodes).toBe(state.nodes);
    expect(result.edges).toBe(state.edges);
  });
});
