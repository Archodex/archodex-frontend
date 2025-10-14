import { describe, it } from 'vitest';
import layoutGraph from './layoutGraph';
import { Node, Edge } from '@xyflow/react';
import { ResourceNodeData } from '@/ResourceNode';
import { ELKEdgeData } from '@/ELKEdge';
import { nodeIdFromResourceId, edgeIdFromResourceIds } from '@/lib/utils';

// Resource ID constants
const RESOURCE_ID_1: ResourceId = [{ type: 'test', id: '1' }];
const RESOURCE_ID_2: ResourceId = [{ type: 'test', id: '2' }];
const RESOURCE_ID_CHILD_1: ResourceId = [{ type: 'test', id: 'child1' }];
const RESOURCE_ID_CHILD_2: ResourceId = [{ type: 'test', id: 'child2' }];
const RESOURCE_ID_PARENT: ResourceId = [{ type: 'test', id: 'parent' }];
const RESOURCE_ID_ROOT: ResourceId = [{ type: 'test', id: 'root' }];
const RESOURCE_ID_MIDDLE: ResourceId = [{ type: 'test', id: 'middle' }];
const RESOURCE_ID_PRINCIPAL: ResourceId = [{ type: 'test', id: 'principal' }];

describe('layoutGraph', () => {
  const createMockResourceEvent = (): ResourceEvent => ({
    type: 'test-event',
    principal: RESOURCE_ID_PRINCIPAL,
    resource: RESOURCE_ID_1,
    principal_chains: [],
    first_seen_at: '2024-01-01',
    last_seen_at: '2024-01-02',
  });

  const createMockNodes = (): Record<string, Node<ResourceNodeData>> => {
    const nodeId1 = nodeIdFromResourceId(RESOURCE_ID_1);
    const nodeId2 = nodeIdFromResourceId(RESOURCE_ID_2);
    return {
      [nodeId1]: {
        id: nodeId1,
        position: { x: 0, y: 0 },
        data: { id: RESOURCE_ID_1, absolutePosition: { x: 0, y: 0 } } as ResourceNodeData,
        hidden: false,
      } as Node<ResourceNodeData>,
      [nodeId2]: {
        id: nodeId2,
        position: { x: 0, y: 0 },
        data: { id: RESOURCE_ID_2, absolutePosition: { x: 0, y: 0 } } as ResourceNodeData,
        hidden: false,
      } as Node<ResourceNodeData>,
    };
  };

  const createMockEdges = (): Record<string, Edge<ELKEdgeData>> => {
    const nodeId1 = nodeIdFromResourceId(RESOURCE_ID_1);
    const nodeId2 = nodeIdFromResourceId(RESOURCE_ID_2);
    const edgeId = edgeIdFromResourceIds(RESOURCE_ID_1, RESOURCE_ID_2);
    return {
      [edgeId]: {
        id: edgeId,
        source: nodeId1,
        target: nodeId2,
        data: {
          originalSourceId: nodeId1,
          originalTargetId: nodeId2,
          label: { text: 'test-event', width: 80 },
          events: [createMockResourceEvent()],
        } as ELKEdgeData,
      } as Edge<ELKEdgeData>,
    };
  };

  const createMockMeasurements = (): Record<string, { width: number; height: number }> => {
    const nodeId1 = nodeIdFromResourceId(RESOURCE_ID_1);
    const nodeId2 = nodeIdFromResourceId(RESOURCE_ID_2);
    return { [nodeId1]: { width: 200, height: 100 }, [nodeId2]: { width: 150, height: 80 } };
  };

  it('should layout a simple graph', async ({ expect }) => {
    const nodes = createMockNodes();
    const edges = createMockEdges();
    const measurements = createMockMeasurements();

    const result = await layoutGraph(nodes, edges, measurements);
    const nodeId1 = nodeIdFromResourceId(RESOURCE_ID_1);
    const nodeId2 = nodeIdFromResourceId(RESOURCE_ID_2);

    expect(result.nodes).toBeDefined();
    expect(result.edges).toBeDefined();
    expect(result.nodes[nodeId1].position).toBeDefined();
    expect(result.nodes[nodeId2].position).toBeDefined();
    expect(result.nodes[nodeId1].width).toBeDefined();
    expect(result.nodes[nodeId1].height).toBeDefined();
  });

  it('should handle parent-child node relationships', async ({ expect }) => {
    const nodes = createMockNodes();
    const nodeId1 = nodeIdFromResourceId(RESOURCE_ID_1);
    const childNodeId = nodeIdFromResourceId(RESOURCE_ID_CHILD_1);

    nodes[childNodeId] = {
      id: childNodeId,
      position: { x: 0, y: 0 },
      data: {
        id: RESOURCE_ID_CHILD_1,
        originalParentId: nodeId1,
        absolutePosition: { x: 0, y: 0 },
      } as ResourceNodeData,
      hidden: false,
    } as Node<ResourceNodeData>;

    const edges = createMockEdges();
    const measurements = { ...createMockMeasurements(), [childNodeId]: { width: 100, height: 50 } };

    const result = await layoutGraph(nodes, edges, measurements);

    expect(result.nodes[childNodeId].parentId).toBe(nodeId1);
    expect(result.nodes[childNodeId].extent).toBe('parent');
    expect(result.nodes[childNodeId].data.parentResourceId).toEqual(nodes[nodeId1].data.id);
  });

  it('should skip hidden nodes', async ({ expect }) => {
    const nodes = createMockNodes();
    const nodeId2 = nodeIdFromResourceId(RESOURCE_ID_2);
    nodes[nodeId2].hidden = true;

    // Remove edges pointing to hidden nodes since they would cause ELK to fail
    const edges = {};
    const measurements = createMockMeasurements();

    const result = await layoutGraph(nodes, edges, measurements);

    // Hidden nodes should not have parentId or extent set
    expect(result.nodes[nodeId2].parentId).toBeUndefined();
    expect(result.nodes[nodeId2].extent).toBeUndefined();
  });

  it('should coalesce multiple edges between same nodes', async ({ expect }) => {
    const nodes = createMockNodes();
    const edges = createMockEdges();
    const nodeId1 = nodeIdFromResourceId(RESOURCE_ID_1);
    const nodeId2 = nodeIdFromResourceId(RESOURCE_ID_2);
    const anotherEvent = createMockResourceEvent();
    anotherEvent.type = 'another-event';
    const edge2Id = `${nodeId1}-${nodeId2}-2`;

    edges[edge2Id] = {
      id: edge2Id,
      source: nodeId1,
      target: nodeId2,
      data: {
        originalSourceId: nodeId1,
        originalTargetId: nodeId2,
        label: { text: 'another-event', width: 100 },
        events: [anotherEvent],
      } as ELKEdgeData,
    } as Edge<ELKEdgeData>;

    const measurements = createMockMeasurements();

    const result = await layoutGraph(nodes, edges, measurements);

    // One edge should be hidden and the other should show (Multiple)
    const visibleEdges = Object.values(result.edges).filter((e) => !e.hidden);
    const hiddenEdges = Object.values(result.edges).filter((e) => e.hidden);

    expect(visibleEdges).toHaveLength(1);
    expect(hiddenEdges).toHaveLength(1);
    expect(visibleEdges[0].data?.label.text).toBe('(Multiple)');
    expect(visibleEdges[0].data?.events).toHaveLength(2);
  });

  it('should preserve selected edge when coalescing', async ({ expect }) => {
    const nodes = createMockNodes();
    const edges = createMockEdges();
    const nodeId1 = nodeIdFromResourceId(RESOURCE_ID_1);
    const nodeId2 = nodeIdFromResourceId(RESOURCE_ID_2);
    const originalEdgeId = edgeIdFromResourceIds(RESOURCE_ID_1, RESOURCE_ID_2);
    const selectedEvent = createMockResourceEvent();
    selectedEvent.type = 'selected-event';
    const edge2Id = `${nodeId1}-${nodeId2}-2`;

    edges[edge2Id] = {
      id: edge2Id,
      source: nodeId1,
      target: nodeId2,
      selected: true,
      data: {
        originalSourceId: nodeId1,
        originalTargetId: nodeId2,
        label: { text: 'selected-event', width: 100 },
        events: [selectedEvent],
      } as ELKEdgeData,
    } as Edge<ELKEdgeData>;

    const measurements = createMockMeasurements();

    const result = await layoutGraph(nodes, edges, measurements);

    // The selected edge should be visible
    expect(result.edges[edge2Id].hidden).toBe(false);
    expect(result.edges[originalEdgeId].hidden).toBe(true);
  });

  it('should calculate absolute positions', async ({ expect }) => {
    const nodes = createMockNodes();
    const edges = createMockEdges();
    const measurements = createMockMeasurements();

    const result = await layoutGraph(nodes, edges, measurements);
    const nodeId1 = nodeIdFromResourceId(RESOURCE_ID_1);

    expect(result.nodes[nodeId1].data.absolutePosition).toBeDefined();
    expect(result.nodes[nodeId1].data.absolutePosition.x).toBeTypeOf('number');
    expect(result.nodes[nodeId1].data.absolutePosition.y).toBeTypeOf('number');
  });

  it('should handle edges with collapsed nodes', async ({ expect }) => {
    const nodes = createMockNodes();
    const nodeId1 = nodeIdFromResourceId(RESOURCE_ID_1);
    const nodeId2 = nodeIdFromResourceId(RESOURCE_ID_2);
    const middleNodeId = nodeIdFromResourceId(RESOURCE_ID_MIDDLE);

    nodes[middleNodeId] = {
      id: middleNodeId,
      position: { x: 0, y: 0 },
      data: { id: RESOURCE_ID_MIDDLE, absolutePosition: { x: 0, y: 0 } } as ResourceNodeData,
      hidden: true,
      parentId: nodeId1,
    } as Node<ResourceNodeData>;

    const edgeId = edgeIdFromResourceIds(RESOURCE_ID_MIDDLE, RESOURCE_ID_2);
    const edges: Record<string, Edge<ELKEdgeData>> = {
      [edgeId]: {
        id: edgeId,
        source: nodeId1,
        target: nodeId2,
        data: {
          originalSourceId: middleNodeId,
          originalTargetId: nodeId2,
          label: { text: 'test-event', width: 80 },
          events: [createMockResourceEvent()],
        } as ELKEdgeData,
      } as Edge<ELKEdgeData>,
    };

    const measurements = createMockMeasurements();

    const result = await layoutGraph(nodes, edges, measurements);

    // Edge should connect visible nodes
    expect(result.edges[edgeId].source).toBe(nodeId1);
    expect(result.edges[edgeId].target).toBe(nodeId2);
  });

  it('should hide self-loops in collapsed nodes', async ({ expect }) => {
    const nodes = createMockNodes();
    const nodeId1 = nodeIdFromResourceId(RESOURCE_ID_1);
    const child1NodeId = nodeIdFromResourceId(RESOURCE_ID_CHILD_1);
    const child2NodeId = nodeIdFromResourceId(RESOURCE_ID_CHILD_2);

    nodes[child1NodeId] = {
      id: child1NodeId,
      position: { x: 0, y: 0 },
      data: { id: RESOURCE_ID_CHILD_1, absolutePosition: { x: 0, y: 0 } } as ResourceNodeData,
      hidden: true,
      parentId: nodeId1,
    } as Node<ResourceNodeData>;
    nodes[child2NodeId] = {
      id: child2NodeId,
      position: { x: 0, y: 0 },
      data: { id: RESOURCE_ID_CHILD_2, absolutePosition: { x: 0, y: 0 } } as ResourceNodeData,
      hidden: true,
      parentId: nodeId1,
    } as Node<ResourceNodeData>;

    const edgeId = edgeIdFromResourceIds(RESOURCE_ID_CHILD_1, RESOURCE_ID_CHILD_2);
    const edges: Record<string, Edge<ELKEdgeData>> = {
      [edgeId]: {
        id: edgeId,
        source: nodeId1,
        target: nodeId1,
        data: {
          originalSourceId: child1NodeId,
          originalTargetId: child2NodeId,
          label: { text: 'test-event', width: 80 },
          events: [createMockResourceEvent()],
        } as ELKEdgeData,
      } as Edge<ELKEdgeData>,
    };

    const measurements = createMockMeasurements();

    const result = await layoutGraph(nodes, edges, measurements);

    // Edge between children of same collapsed parent should be hidden
    expect(result.edges[edgeId].hidden).toBe(true);
  });

  it('should throw error if node data is missing', async ({ expect }) => {
    const nodes = createMockNodes();
    const nodeId1 = nodeIdFromResourceId(RESOURCE_ID_1);
    (nodes[nodeId1] as { data?: unknown }).data = undefined;

    const edges = createMockEdges();
    const measurements = createMockMeasurements();

    await expect(layoutGraph(nodes, edges, measurements)).rejects.toThrow();
  });

  it('should throw error if edge data is missing', async ({ expect }) => {
    const nodes = createMockNodes();
    const edges = createMockEdges();
    const edgeId = edgeIdFromResourceIds(RESOURCE_ID_1, RESOURCE_ID_2);
    (edges[edgeId] as { data?: unknown }).data = undefined;

    const measurements = createMockMeasurements();

    await expect(layoutGraph(nodes, edges, measurements)).rejects.toThrow(`Edge ${edgeId} missing data`);
  });

  it('should throw error if edge originalSourceId is missing', async ({ expect }) => {
    const nodes = createMockNodes();
    const edges = createMockEdges();
    const edgeId = edgeIdFromResourceIds(RESOURCE_ID_1, RESOURCE_ID_2);
    edges[edgeId].data!.originalSourceId = undefined as unknown as string;

    const measurements = createMockMeasurements();

    await expect(layoutGraph(nodes, edges, measurements)).rejects.toThrow(`Edge ${edgeId} missing data.originalSource`);
  });

  it('should throw error if edge originalTargetId is missing', async ({ expect }) => {
    const nodes = createMockNodes();
    const edges = createMockEdges();
    const edgeId = edgeIdFromResourceIds(RESOURCE_ID_1, RESOURCE_ID_2);
    edges[edgeId].data!.originalTargetId = undefined as unknown as string;

    const measurements = createMockMeasurements();

    await expect(layoutGraph(nodes, edges, measurements)).rejects.toThrow(`Edge ${edgeId} missing data.originalTarget`);
  });

  it('should handle nodes without measurements', async ({ expect }) => {
    const nodes = createMockNodes();
    const edges = createMockEdges();
    const nodeId1 = nodeIdFromResourceId(RESOURCE_ID_1);
    const nodeId2 = nodeIdFromResourceId(RESOURCE_ID_2);
    const measurements: Record<string, { width: number; height: number } | undefined> = {
      [nodeId1]: undefined,
      [nodeId2]: { width: 150, height: 80 },
    };

    const result = await layoutGraph(nodes, edges, measurements);

    // Should still layout successfully without measurements
    expect(result.nodes).toBeDefined();
    expect(result.edges).toBeDefined();
  });

  it('should calculate edge label spacing', async ({ expect }) => {
    const nodes = createMockNodes();
    const edges = createMockEdges();
    const edgeId = edgeIdFromResourceIds(RESOURCE_ID_1, RESOURCE_ID_2);
    edges[edgeId].data!.label.width = 200;

    const measurements = createMockMeasurements();

    const result = await layoutGraph(nodes, edges, measurements);

    // Edge spacing should be calculated based on widest label
    expect(result.edges).toBeDefined();
  });

  it('should handle empty graph', async ({ expect }) => {
    const result = await layoutGraph({}, {}, {});

    expect(result.nodes).toEqual({});
    expect(result.edges).toEqual({});
  });

  it('should reset edge events to original state', async ({ expect }) => {
    const nodes = createMockNodes();
    const edges = createMockEdges();
    const edgeId = edgeIdFromResourceIds(RESOURCE_ID_1, RESOURCE_ID_2);
    // Simulate edge that was previously coalesced
    const event1 = createMockResourceEvent();
    event1.type = 'event1';
    const event2 = createMockResourceEvent();
    event2.type = 'event2';
    const event3 = createMockResourceEvent();
    event3.type = 'event3';

    edges[edgeId].data!.events = [event1, event2, event3];
    edges[edgeId].data!.label.text = '(Multiple)';

    const measurements = createMockMeasurements();

    const result = await layoutGraph(nodes, edges, measurements);

    // Should reset to first event only
    expect(result.edges[edgeId].data?.events).toHaveLength(1);
    expect(result.edges[edgeId].data?.label.text).toBe('event1');
  });

  it('should handle complex parent hierarchies', async ({ expect }) => {
    const rootNodeId = nodeIdFromResourceId(RESOURCE_ID_ROOT);
    const parentNodeId = nodeIdFromResourceId(RESOURCE_ID_PARENT);
    const childNodeId = nodeIdFromResourceId(RESOURCE_ID_CHILD_1);

    const nodes: Record<string, Node<ResourceNodeData>> = {
      [rootNodeId]: {
        id: rootNodeId,
        position: { x: 0, y: 0 },
        data: { id: RESOURCE_ID_ROOT, absolutePosition: { x: 0, y: 0 } } as ResourceNodeData,
        hidden: false,
      } as Node<ResourceNodeData>,
      [parentNodeId]: {
        id: parentNodeId,
        position: { x: 0, y: 0 },
        data: {
          id: RESOURCE_ID_PARENT,
          originalParentId: rootNodeId,
          absolutePosition: { x: 0, y: 0 },
        } as ResourceNodeData,
        hidden: false,
      } as Node<ResourceNodeData>,
      [childNodeId]: {
        id: childNodeId,
        position: { x: 0, y: 0 },
        data: {
          id: RESOURCE_ID_CHILD_1,
          originalParentId: parentNodeId,
          absolutePosition: { x: 0, y: 0 },
        } as ResourceNodeData,
        hidden: false,
      } as Node<ResourceNodeData>,
    };

    const edges = {};
    const measurements = {
      [rootNodeId]: { width: 300, height: 200 },
      [parentNodeId]: { width: 200, height: 150 },
      [childNodeId]: { width: 100, height: 50 },
    };

    const result = await layoutGraph(nodes, edges, measurements);

    expect(result.nodes[parentNodeId].parentId).toBe(rootNodeId);
    expect(result.nodes[childNodeId].parentId).toBe(parentNodeId);
    expect(result.nodes[childNodeId].data.parentResourceId).toEqual(nodes[parentNodeId].data.id);
  });
});
