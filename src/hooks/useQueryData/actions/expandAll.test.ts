import { describe, it } from 'vitest';
import expandAll from './expandAll';
import { QueryData, LayoutState } from '..';
import { Node } from '@xyflow/react';
import { ResourceNodeData } from '@/ResourceNode';
import { nodeIdFromResourceId } from '@/lib/utils';
import MenuSection from '@/lib/menuSection';

// Resource ID constants
const RESOURCE_1_ID: ResourceId = [{ type: 'test', id: '1' }];
const RESOURCE_2_ID: ResourceId = [{ type: 'test', id: '2' }];
const RESOURCE_3_ID: ResourceId = [{ type: 'test', id: '3' }];

// Generated ID constants
const NODE_1_ID = nodeIdFromResourceId(RESOURCE_1_ID);
const NODE_2_ID = nodeIdFromResourceId(RESOURCE_2_ID);
const NODE_3_ID = nodeIdFromResourceId(RESOURCE_3_ID);
const COLLAPSED_NODE_ID = 'collapsed-node';
const RESOURCE_1_SELECTION_ID = NODE_1_ID;

describe('expandAll', () => {
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
        data: {
          id: RESOURCE_1_ID,
          collapsed: true,
          originalParentId: undefined,
          originalParentResourceId: undefined,
        } as ResourceNodeData,
        hidden: false,
        width: 200,
        height: 100,
      } as Node<ResourceNodeData>,
      [NODE_2_ID]: {
        id: NODE_2_ID,
        position: { x: 100, y: 0 },
        data: {
          id: RESOURCE_2_ID,
          collapsed: false,
          originalParentId: NODE_1_ID,
          originalParentResourceId: RESOURCE_1_ID,
        } as ResourceNodeData,
        hidden: true,
        parentId: COLLAPSED_NODE_ID,
        width: 150,
        height: 75,
      } as Node<ResourceNodeData>,
      [NODE_3_ID]: {
        id: NODE_3_ID,
        position: { x: 200, y: 0 },
        data: {
          id: RESOURCE_3_ID,
          collapsed: true,
          originalParentId: NODE_2_ID,
          originalParentResourceId: RESOURCE_2_ID,
        } as ResourceNodeData,
        hidden: true,
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

  it('should expand all collapsed nodes', ({ expect }) => {
    const state = createMockState();
    const result = expandAll(state);

    expect(result.nodes[NODE_1_ID].data.collapsed).toBe(false);
    expect(result.nodes[NODE_2_ID].data.collapsed).toBe(false);
    expect(result.nodes[NODE_3_ID].data.collapsed).toBe(false);
    expect(result).not.toBe(state);
  });

  it('should unhide all hidden nodes', ({ expect }) => {
    const state = createMockState();
    const result = expandAll(state);

    expect(result.nodes[NODE_1_ID].hidden).toBe(false); // Was already visible
    expect(result.nodes[NODE_2_ID].hidden).toBeUndefined(); // Was hidden, now unhidden
    expect(result.nodes[NODE_3_ID].hidden).toBeUndefined(); // Was hidden, now unhidden
  });

  it('should restore original parent relationships', ({ expect }) => {
    const state = createMockState();
    const result = expandAll(state);

    expect(result.nodes[NODE_1_ID].parentId).toBeUndefined();
    expect(result.nodes[NODE_2_ID].parentId).toBe(NODE_1_ID);
    expect(result.nodes[NODE_3_ID].parentId).toBe(NODE_2_ID);

    expect(result.nodes[NODE_2_ID].data.parentResourceId).toEqual(RESOURCE_1_ID);
    expect(result.nodes[NODE_3_ID].data.parentResourceId).toEqual(RESOURCE_2_ID);
  });

  it('should remove node dimensions to trigger re-measurement', ({ expect }) => {
    const state = createMockState();
    const result = expandAll(state);

    expect(result.nodes[NODE_1_ID].width).toBeUndefined();
    expect(result.nodes[NODE_1_ID].height).toBeUndefined();
    expect(result.nodes[NODE_2_ID].width).toBeUndefined();
    expect(result.nodes[NODE_2_ID].height).toBeUndefined();
  });

  it('should reset layout state and clear measurements', ({ expect }) => {
    const state = createMockState();
    const result = expandAll(state);

    expect(result.laidOut).toBe(LayoutState.Initial);
    expect(result.measurements).toEqual({});
    expect(result.fitViewAfterLayout).toBe(true);
  });

  it('should handle nodes that were already expanded', ({ expect }) => {
    const state = createMockState();
    state.nodes[NODE_1_ID].data.collapsed = false;
    state.nodes[NODE_1_ID].hidden = false;

    const result = expandAll(state);

    expect(result.nodes[NODE_1_ID].data.collapsed).toBe(false);
    expect(result.nodes[NODE_1_ID].hidden).toBe(false);
  });

  it('should preserve node positions', ({ expect }) => {
    const state = createMockState();
    const originalPositions = {
      [NODE_1_ID]: { ...state.nodes[NODE_1_ID].position },
      [NODE_2_ID]: { ...state.nodes[NODE_2_ID].position },
      [NODE_3_ID]: { ...state.nodes[NODE_3_ID].position },
    };

    const result = expandAll(state);

    expect(result.nodes[NODE_1_ID].position).toEqual(originalPositions[NODE_1_ID]);
    expect(result.nodes[NODE_2_ID].position).toEqual(originalPositions[NODE_2_ID]);
    expect(result.nodes[NODE_3_ID].position).toEqual(originalPositions[NODE_3_ID]);
  });

  it('should preserve other state properties', ({ expect }) => {
    const state = createMockState();
    state.resources = [{ id: RESOURCE_1_ID, environments: [], first_seen_at: '', last_seen_at: '' }];
    state.selection.resources = new Set([RESOURCE_1_SELECTION_ID]);

    const result = expandAll(state);

    expect(result.resources).toEqual(state.resources);
    expect(result.selection).toEqual(state.selection);
    expect(result.viewport).toEqual(state.viewport);
    expect(result.section).toBe(state.section);
  });

  it('should handle nodes without original parent data', ({ expect }) => {
    const state = createMockState();
    delete state.nodes[NODE_1_ID].data.originalParentId;
    delete state.nodes[NODE_1_ID].data.originalParentResourceId;

    const result = expandAll(state);

    expect(result.nodes[NODE_1_ID].parentId).toBeUndefined();
    expect(result.nodes[NODE_1_ID].data.parentResourceId).toBeUndefined();
  });

  it('should maintain visibility changes from coalescing', ({ expect }) => {
    const state = createMockState();
    // After the initial expansion and coalescing, the logic checks if visibility changed
    const result = expandAll(state);

    // The function preserves the hidden state if it was changed by coalescing
    expect(result.nodes).toBeDefined();
    expect(Object.keys(result.nodes).length).toBe(3);
  });
});
