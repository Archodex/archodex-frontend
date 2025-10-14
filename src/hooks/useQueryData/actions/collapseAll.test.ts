import { describe, it } from 'vitest';
import collapseAll from './collapseAll';
import { QueryData, LayoutState } from '..';
import { Node } from '@xyflow/react';
import { ResourceNodeData } from '@/ResourceNode';
import { nodeIdFromResourceId } from '@/lib/utils';
import MenuSection from '@/lib/menuSection';

// Resource ID constants
const RESOURCE_1_ID: ResourceId = [{ type: 'test', id: '1' }];
const RESOURCE_2_ID: ResourceId = [{ type: 'test', id: '2' }];
const RESOURCE_3_ID: ResourceId = [{ type: 'test', id: '3' }];
const RESOURCE_4_ID: ResourceId = [{ type: 'test', id: '4' }];

describe('collapseAll', () => {
  const NODE_1_ID = nodeIdFromResourceId(RESOURCE_1_ID);
  const NODE_2_ID = nodeIdFromResourceId(RESOURCE_2_ID);
  const NODE_3_ID = nodeIdFromResourceId(RESOURCE_3_ID);
  const NODE_4_ID = nodeIdFromResourceId(RESOURCE_4_ID);

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
        data: { id: RESOURCE_1_ID, collapsed: false, numChildren: 2 } as ResourceNodeData,
        hidden: false,
        width: 200,
        height: 100,
      } as Node<ResourceNodeData>,
      [NODE_2_ID]: {
        id: NODE_2_ID,
        position: { x: 100, y: 0 },
        data: { id: RESOURCE_2_ID, collapsed: false, numChildren: 0 } as ResourceNodeData,
        hidden: false,
        parentId: NODE_1_ID,
        width: 150,
        height: 75,
      } as Node<ResourceNodeData>,
      [NODE_3_ID]: {
        id: NODE_3_ID,
        position: { x: 200, y: 0 },
        data: { id: RESOURCE_3_ID, collapsed: false, numChildren: 0 } as ResourceNodeData,
        hidden: false,
        parentId: NODE_1_ID,
      } as Node<ResourceNodeData>,
      [NODE_4_ID]: {
        id: NODE_4_ID,
        position: { x: 300, y: 0 },
        data: { id: RESOURCE_4_ID, collapsed: false, numChildren: 0 } as ResourceNodeData,
        hidden: false,
        width: 120,
        height: 60,
        // No parent, no children - should not be affected
      } as Node<ResourceNodeData>,
    },
    edges: {},
    measurements: { [NODE_1_ID]: { width: 200, height: 100 }, [NODE_2_ID]: { width: 150, height: 75 } },
    viewport: { x: 0, y: 0, zoom: 1 },
    fitViewAfterLayout: false,
    laidOut: LayoutState.LaidOut,
    selection: { resources: new Set(), edges: new Set(), issues: new Set() },
    dateFilter: { startDate: new Date('2025-06-01'), endDate: new Date('2025-07-01') },
    originalData: { resources: [], events: [] },
  });

  it('should collapse nodes with children', ({ expect }) => {
    const state = createMockState();
    const result = collapseAll(state);

    expect(result.nodes[NODE_1_ID].data.collapsed).toBe(true); // Has children
    expect(result.nodes[NODE_2_ID].data.collapsed).toBe(false); // No children
    expect(result.nodes[NODE_3_ID].data.collapsed).toBe(false); // No children
    expect(result).not.toBe(state);
  });

  it('should hide nodes with parents', ({ expect }) => {
    const state = createMockState();
    const result = collapseAll(state);

    expect(result.nodes[NODE_1_ID].hidden).toBe(false); // No parent
    expect(result.nodes[NODE_2_ID].hidden).toBe(true); // Has parent
    expect(result.nodes[NODE_3_ID].hidden).toBe(true); // Has parent
  });

  it('should not affect nodes without parents or children', ({ expect }) => {
    const state = createMockState();
    const result = collapseAll(state);

    expect(result.nodes[NODE_4_ID]).toEqual(state.nodes[NODE_4_ID]);
    expect(result.nodes[NODE_4_ID].hidden).toBe(false);
    expect(result.nodes[NODE_4_ID].data.collapsed).toBe(false);
  });

  it('should remove dimensions from affected nodes', ({ expect }) => {
    const state = createMockState();
    const result = collapseAll(state);

    expect(result.nodes[NODE_1_ID].width).toBeUndefined();
    expect(result.nodes[NODE_1_ID].height).toBeUndefined();
    expect(result.nodes[NODE_2_ID].width).toBeUndefined();
    expect(result.nodes[NODE_2_ID].height).toBeUndefined();

    // Node without parent or children should keep dimensions
    expect(result.nodes[NODE_4_ID].width).toBeDefined();
    expect(result.nodes[NODE_4_ID].height).toBeDefined();
  });

  it('should reset layout state and clear measurements', ({ expect }) => {
    const state = createMockState();
    const result = collapseAll(state);

    expect(result.laidOut).toBe(LayoutState.Initial);
    expect(result.measurements).toEqual({});
    expect(result.fitViewAfterLayout).toBe(true);
  });

  it('should handle nodes already collapsed', ({ expect }) => {
    const state = createMockState();
    state.nodes[NODE_1_ID].data.collapsed = true;

    const result = collapseAll(state);

    expect(result.nodes[NODE_1_ID].data.collapsed).toBe(true);
  });

  it('should handle nodes already hidden', ({ expect }) => {
    const state = createMockState();
    state.nodes[NODE_2_ID].hidden = true;

    const result = collapseAll(state);

    expect(result.nodes[NODE_2_ID].hidden).toBe(true);
  });

  it('should preserve node positions', ({ expect }) => {
    const state = createMockState();
    const originalPositions = Object.fromEntries(
      Object.entries(state.nodes).map(([id, node]) => [id, { ...node.position }]),
    );

    const result = collapseAll(state);

    Object.entries(result.nodes).forEach(([id, node]) => {
      expect(node.position).toEqual(originalPositions[id]);
    });
  });

  it('should handle nodes with numChildren = 0', ({ expect }) => {
    const state = createMockState();
    state.nodes[NODE_1_ID].data.numChildren = 0;

    const result = collapseAll(state);

    // Should not collapse since no children
    expect(result.nodes[NODE_1_ID].data.collapsed).toBe(false);
    // Should still keep dimensions since not affected
    expect(result.nodes[NODE_1_ID].width).toBeDefined();
  });

  it('should preserve other state properties', ({ expect }) => {
    const state = createMockState();
    state.resources = [{ id: RESOURCE_1_ID, environments: [], first_seen_at: '', last_seen_at: '' }];
    state.selection.resources = new Set([NODE_1_ID]);

    const result = collapseAll(state);

    expect(result.resources).toEqual(state.resources);
    expect(result.selection).toEqual(state.selection);
    expect(result.viewport).toEqual(state.viewport);
    expect(result.section).toBe(state.section);
  });

  it('should create new node objects for modified nodes', ({ expect }) => {
    const state = createMockState();
    const result = collapseAll(state);

    // Modified nodes should be new objects
    expect(result.nodes[NODE_1_ID]).not.toBe(state.nodes[NODE_1_ID]);
    expect(result.nodes[NODE_2_ID]).not.toBe(state.nodes[NODE_2_ID]);

    // Unmodified node should be the same object
    expect(result.nodes[NODE_4_ID]).toBe(state.nodes[NODE_4_ID]);
  });

  it('should handle empty nodes object', ({ expect }) => {
    const state = createMockState();
    state.nodes = {};

    const result = collapseAll(state);

    expect(result.nodes).toEqual({});
    expect(result.laidOut).toBe(LayoutState.Initial);
  });
});
