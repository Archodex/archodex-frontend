import { describe, it } from 'vitest';
import toggleNodeCollapsed from './toggleNodeCollapsed';
import { QueryData, LayoutState, QueryDataActions } from '..';
import type { ToggleNodeCollapsedAction } from './toggleNodeCollapsed';
import { Node } from '@xyflow/react';
import { ResourceNodeData } from '@/ResourceNode';
import { nodeIdFromResourceId } from '@/lib/utils';
import MenuSection from '@/lib/menuSection';

// Resource ID constants
const PARENT_RESOURCE_ID: ResourceId = [{ type: 'test', id: 'parent' }];
const CHILD_1_RESOURCE_ID: ResourceId = [{ type: 'test', id: 'child1' }];
const CHILD_2_RESOURCE_ID: ResourceId = [{ type: 'test', id: 'child2' }];
const GRANDCHILD_RESOURCE_ID: ResourceId = [{ type: 'test', id: 'grandchild' }];
const INDEPENDENT_RESOURCE_ID: ResourceId = [{ type: 'test', id: 'independent' }];
const GREAT_GRANDCHILD_RESOURCE_ID: ResourceId = [{ type: 'test', id: 'ggc' }];

describe('toggleNodeCollapsed', () => {
  const PARENT_NODE_ID = nodeIdFromResourceId(PARENT_RESOURCE_ID);
  const CHILD_1_NODE_ID = nodeIdFromResourceId(CHILD_1_RESOURCE_ID);
  const CHILD_2_NODE_ID = nodeIdFromResourceId(CHILD_2_RESOURCE_ID);
  const GRANDCHILD_NODE_ID = nodeIdFromResourceId(GRANDCHILD_RESOURCE_ID);
  const INDEPENDENT_NODE_ID = nodeIdFromResourceId(INDEPENDENT_RESOURCE_ID);
  const GREAT_GRANDCHILD_NODE_ID = nodeIdFromResourceId(GREAT_GRANDCHILD_RESOURCE_ID);

  const createMockState = (): QueryData => ({
    section: MenuSection.Secrets,
    resources: [],
    events: [],
    environments: [],
    resourcesEnvironments: {},
    resourceEvents: [],
    eventChainLinks: {},
    nodes: {
      [PARENT_NODE_ID]: {
        id: PARENT_NODE_ID,
        position: { x: 0, y: 0 },
        data: { id: PARENT_RESOURCE_ID, collapsed: false, numChildren: 2 } as ResourceNodeData,
        hidden: false,
        width: 200,
        height: 100,
      } as Node<ResourceNodeData>,
      [CHILD_1_NODE_ID]: {
        id: CHILD_1_NODE_ID,
        position: { x: 100, y: 0 },
        data: { id: CHILD_1_RESOURCE_ID, collapsed: false, originalParentId: PARENT_NODE_ID } as ResourceNodeData,
        hidden: false,
        parentId: PARENT_NODE_ID,
      } as Node<ResourceNodeData>,
      [CHILD_2_NODE_ID]: {
        id: CHILD_2_NODE_ID,
        position: { x: 200, y: 0 },
        data: { id: CHILD_2_RESOURCE_ID, collapsed: false, originalParentId: PARENT_NODE_ID } as ResourceNodeData,
        hidden: false,
        parentId: PARENT_NODE_ID,
      } as Node<ResourceNodeData>,
      [GRANDCHILD_NODE_ID]: {
        id: GRANDCHILD_NODE_ID,
        position: { x: 300, y: 0 },
        data: { id: GRANDCHILD_RESOURCE_ID, collapsed: false, originalParentId: CHILD_1_NODE_ID } as ResourceNodeData,
        hidden: false,
        parentId: CHILD_1_NODE_ID,
      } as Node<ResourceNodeData>,
      [INDEPENDENT_NODE_ID]: {
        id: INDEPENDENT_NODE_ID,
        position: { x: 400, y: 0 },
        data: { id: INDEPENDENT_RESOURCE_ID, collapsed: false } as ResourceNodeData,
        hidden: false,
      } as Node<ResourceNodeData>,
    },
    edges: {},
    measurements: { [PARENT_NODE_ID]: { width: 200, height: 100 }, [CHILD_1_NODE_ID]: { width: 150, height: 75 } },
    viewport: { x: 0, y: 0, zoom: 1 },
    fitViewAfterLayout: false,
    laidOut: LayoutState.LaidOut,
    selection: { resources: new Set(), edges: new Set(), issues: new Set() },
    dateFilter: { startDate: new Date('2025-06-01'), endDate: new Date('2025-07-01') },
    originalData: { resources: [], events: [] },
  });

  it('should collapse a node and hide its direct children', ({ expect }) => {
    const state = createMockState();
    const action: ToggleNodeCollapsedAction = { action: QueryDataActions.ToggleNodeCollapsed, nodeId: PARENT_NODE_ID };

    const result = toggleNodeCollapsed(state, action);

    expect(result.nodes[PARENT_NODE_ID].data.collapsed).toBe(true);
    expect(result.nodes[CHILD_1_NODE_ID].hidden).toBe(true);
    expect(result.nodes[CHILD_2_NODE_ID].hidden).toBe(true);
    expect(result.nodes[GRANDCHILD_NODE_ID].hidden).toBe(true); // Grandchild also hidden when parent collapsed
    expect(result.nodes[INDEPENDENT_NODE_ID].hidden).toBe(false);
    expect(result).not.toBe(state);
  });

  it('should expand a collapsed node and show its children', ({ expect }) => {
    const state = createMockState();
    state.nodes[PARENT_NODE_ID].data.collapsed = true;
    state.nodes[CHILD_1_NODE_ID].hidden = true;
    state.nodes[CHILD_2_NODE_ID].hidden = true;

    const action: ToggleNodeCollapsedAction = { action: QueryDataActions.ToggleNodeCollapsed, nodeId: PARENT_NODE_ID };

    const result = toggleNodeCollapsed(state, action);

    expect(result.nodes[PARENT_NODE_ID].data.collapsed).toBe(false);
  });

  it('should throw error when expanding node with no children', ({ expect }) => {
    const state = createMockState();
    state.nodes[INDEPENDENT_NODE_ID].data.collapsed = true;

    const action: ToggleNodeCollapsedAction = {
      action: QueryDataActions.ToggleNodeCollapsed,
      nodeId: INDEPENDENT_NODE_ID,
    };

    expect(() => toggleNodeCollapsed(state, action)).toThrow(
      `Node with id ${INDEPENDENT_NODE_ID} has no children, cannot toggle collapsed state.`,
    );
  });

  it('should clear measurements for toggled node and ancestors', ({ expect }) => {
    const state = createMockState();
    const action: ToggleNodeCollapsedAction = { action: QueryDataActions.ToggleNodeCollapsed, nodeId: CHILD_1_NODE_ID };

    const result = toggleNodeCollapsed(state, action);

    expect(result.measurements[CHILD_1_NODE_ID]).toBeUndefined();
    expect(result.measurements[PARENT_NODE_ID]).toBeUndefined();
    expect(result.nodes[CHILD_1_NODE_ID].width).toBeUndefined();
    expect(result.nodes[CHILD_1_NODE_ID].height).toBeUndefined();
    expect(result.nodes[PARENT_NODE_ID].width).toBeUndefined();
    expect(result.nodes[PARENT_NODE_ID].height).toBeUndefined();
  });

  it('should reset layout state', ({ expect }) => {
    const state = createMockState();
    const action: ToggleNodeCollapsedAction = { action: QueryDataActions.ToggleNodeCollapsed, nodeId: PARENT_NODE_ID };

    const result = toggleNodeCollapsed(state, action);

    expect(result.laidOut).toBe(LayoutState.Initial);
  });

  it('should not collapse children of already collapsed nodes', ({ expect }) => {
    const state = createMockState();
    state.nodes[CHILD_1_NODE_ID].data.collapsed = true;
    state.nodes[GRANDCHILD_NODE_ID].hidden = true;

    const action: ToggleNodeCollapsedAction = { action: QueryDataActions.ToggleNodeCollapsed, nodeId: PARENT_NODE_ID };

    const result = toggleNodeCollapsed(state, action);

    expect(result.nodes[PARENT_NODE_ID].data.collapsed).toBe(true);
    expect(result.nodes[GRANDCHILD_NODE_ID].hidden).toBe(true); // Should remain hidden
  });

  it('should skip nodes marked as hidden in data', ({ expect }) => {
    const state = createMockState();
    state.nodes[CHILD_1_NODE_ID].data.hidden = true;

    const action: ToggleNodeCollapsedAction = { action: QueryDataActions.ToggleNodeCollapsed, nodeId: PARENT_NODE_ID };

    const result = toggleNodeCollapsed(state, action);

    expect(result.nodes[CHILD_1_NODE_ID].hidden).toBe(false); // Not changed because data.hidden is true
  });

  it('should handle nodes with nested parent relationships', ({ expect }) => {
    const state = createMockState();
    // Add a deeply nested node
    state.nodes[GREAT_GRANDCHILD_NODE_ID] = {
      id: GREAT_GRANDCHILD_NODE_ID,
      position: { x: 350, y: 0 },
      data: { id: [{ type: 'test', id: 'ggc' }], collapsed: false } as ResourceNodeData,
      hidden: false,
      parentId: GRANDCHILD_NODE_ID,
    } as Node<ResourceNodeData>;

    const action: ToggleNodeCollapsedAction = { action: QueryDataActions.ToggleNodeCollapsed, nodeId: PARENT_NODE_ID };

    const result = toggleNodeCollapsed(state, action);

    expect(result.nodes[CHILD_1_NODE_ID].hidden).toBe(true);
    expect(result.nodes[CHILD_2_NODE_ID].hidden).toBe(true);
    expect(result.nodes[GRANDCHILD_NODE_ID].hidden).toBe(true);
    expect(result.nodes[GREAT_GRANDCHILD_NODE_ID].hidden).toBe(true);
  });

  it('should apply coalescing based on section when expanding', ({ expect }) => {
    const state = createMockState();
    state.nodes[PARENT_NODE_ID].data.collapsed = true;
    state.section = MenuSection.Environments;

    const action: ToggleNodeCollapsedAction = { action: QueryDataActions.ToggleNodeCollapsed, nodeId: PARENT_NODE_ID };

    const result = toggleNodeCollapsed(state, action);

    expect(result.nodes[PARENT_NODE_ID].data.collapsed).toBe(false);
  });

  it('should preserve other state properties', ({ expect }) => {
    const state = createMockState();
    state.resources = [{ id: PARENT_RESOURCE_ID, environments: [], first_seen_at: '', last_seen_at: '' }];
    state.selection.resources = new Set([PARENT_NODE_ID]);

    const action: ToggleNodeCollapsedAction = { action: QueryDataActions.ToggleNodeCollapsed, nodeId: PARENT_NODE_ID };

    const result = toggleNodeCollapsed(state, action);

    expect(result.resources).toEqual(state.resources);
    expect(result.selection).toEqual(state.selection);
    expect(result.viewport).toEqual(state.viewport);
    expect(result.fitViewAfterLayout).toBe(state.fitViewAfterLayout);
  });

  it('should create new objects for modified nodes', ({ expect }) => {
    const state = createMockState();
    const action: ToggleNodeCollapsedAction = { action: QueryDataActions.ToggleNodeCollapsed, nodeId: PARENT_NODE_ID };

    const result = toggleNodeCollapsed(state, action);

    expect(result.nodes).not.toBe(state.nodes);
    expect(result.nodes[PARENT_NODE_ID]).not.toBe(state.nodes[PARENT_NODE_ID]);
    expect(result.nodes[CHILD_1_NODE_ID]).not.toBe(state.nodes[CHILD_1_NODE_ID]);
    expect(result.measurements).not.toBe(state.measurements);
  });

  it('should handle toggling node without parent', ({ expect }) => {
    const state = createMockState();
    const action: ToggleNodeCollapsedAction = { action: QueryDataActions.ToggleNodeCollapsed, nodeId: PARENT_NODE_ID };

    const result = toggleNodeCollapsed(state, action);

    // Should only clear measurements for the node itself
    expect(result.measurements[PARENT_NODE_ID]).toBeUndefined();
    expect(result.nodes[PARENT_NODE_ID].width).toBeUndefined();
    expect(result.nodes[PARENT_NODE_ID].height).toBeUndefined();
  });

  it('should find child by originalParentId when expanding', ({ expect }) => {
    const state = createMockState();
    // Remove regular parentId, keep only originalParentId
    delete state.nodes[CHILD_1_NODE_ID].parentId;
    state.nodes[PARENT_NODE_ID].data.collapsed = true;

    const action: ToggleNodeCollapsedAction = { action: QueryDataActions.ToggleNodeCollapsed, nodeId: PARENT_NODE_ID };

    const result = toggleNodeCollapsed(state, action);

    expect(result.nodes[PARENT_NODE_ID].data.collapsed).toBe(false);
  });

  it('should handle already hidden nodes when collapsing', ({ expect }) => {
    const state = createMockState();
    state.nodes[CHILD_1_NODE_ID].hidden = true;

    const action: ToggleNodeCollapsedAction = { action: QueryDataActions.ToggleNodeCollapsed, nodeId: PARENT_NODE_ID };

    const result = toggleNodeCollapsed(state, action);

    expect(result.nodes[CHILD_1_NODE_ID].hidden).toBe(true);
    expect(result.nodes[CHILD_1_NODE_ID]).toBe(state.nodes[CHILD_1_NODE_ID]); // Should not create new object
  });
});
