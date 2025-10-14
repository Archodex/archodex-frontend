import { describe, it } from 'vitest';
import showNode from './showNode';
import { Measurements } from '.';
import { Node } from '@xyflow/react';
import { ResourceNodeData } from '@/ResourceNode';
import { nodeIdFromResourceId } from '@/lib/utils';

describe('showNode', () => {
  // Resource ID constants
  const ROOT_RESOURCE_ID: ResourceId = [{ type: 'test', id: 'root' }];
  const PARENT_RESOURCE_ID: ResourceId = [{ type: 'test', id: 'parent' }];
  const TARGET_RESOURCE_ID: ResourceId = [{ type: 'test', id: 'target' }];
  const SIBLING_RESOURCE_ID: ResourceId = [{ type: 'test', id: 'sibling' }];
  const STANDALONE_RESOURCE_ID: ResourceId = [{ type: 'test', id: 'standalone' }];
  const COALESCED_RESOURCE_ID: ResourceId = [{ type: 'test', id: 'coalesced' }];
  const CHILD_RESOURCE_ID: ResourceId = [{ type: 'test', id: 'child' }];
  const COALESCED1_RESOURCE_ID: ResourceId = [{ type: 'test', id: 'coalesced1' }];
  const COALESCED2_RESOURCE_ID: ResourceId = [{ type: 'test', id: 'coalesced2' }];
  const FINAL_RESOURCE_ID: ResourceId = [{ type: 'test', id: 'final' }];
  const COALESCED_SIBLING_RESOURCE_ID: ResourceId = [{ type: 'test', id: 'coalesced-sibling' }];
  const SIBLING_CHILD_RESOURCE_ID: ResourceId = [{ type: 'test', id: 'sibling-child' }];
  const LEVEL1_RESOURCE_ID: ResourceId = [{ type: 'test', id: 'level1' }];
  const LEVEL2_RESOURCE_ID: ResourceId = [{ type: 'test', id: 'level2' }];
  const LEVEL3_RESOURCE_ID: ResourceId = [{ type: 'test', id: 'level3' }];

  const createMockNodes = (): Record<string, Node<ResourceNodeData>> => {
    const rootNodeId = nodeIdFromResourceId(ROOT_RESOURCE_ID);
    const parentNodeId = nodeIdFromResourceId(PARENT_RESOURCE_ID);
    const targetNodeId = nodeIdFromResourceId(TARGET_RESOURCE_ID);
    const siblingNodeId = nodeIdFromResourceId(SIBLING_RESOURCE_ID);

    return {
      [rootNodeId]: {
        id: rootNodeId,
        position: { x: 0, y: 0 },
        data: { id: ROOT_RESOURCE_ID, collapsed: true, numChildren: 2 } as ResourceNodeData,
        hidden: false,
        width: 300,
        height: 200,
      } as Node<ResourceNodeData>,
      [parentNodeId]: {
        id: parentNodeId,
        position: { x: 100, y: 100 },
        data: {
          id: PARENT_RESOURCE_ID,
          originalParentId: rootNodeId,
          collapsed: true,
          numChildren: 1,
        } as ResourceNodeData,
        hidden: false,
        parentId: rootNodeId,
        width: 200,
        height: 100,
      } as Node<ResourceNodeData>,
      [targetNodeId]: {
        id: targetNodeId,
        position: { x: 200, y: 200 },
        data: {
          id: TARGET_RESOURCE_ID,
          originalParentId: parentNodeId,
          collapsed: false,
          numChildren: 0,
        } as ResourceNodeData,
        hidden: true,
        parentId: parentNodeId,
        width: 100,
        height: 50,
      } as Node<ResourceNodeData>,
      [siblingNodeId]: {
        id: siblingNodeId,
        position: { x: 150, y: 150 },
        data: {
          id: SIBLING_RESOURCE_ID,
          originalParentId: parentNodeId,
          collapsed: false,
          numChildren: 0,
        } as ResourceNodeData,
        hidden: true,
        parentId: parentNodeId,
        width: 100,
        height: 50,
      } as Node<ResourceNodeData>,
    };
  };

  const createMockMeasurements = (): Measurements => {
    const rootNodeId = nodeIdFromResourceId(ROOT_RESOURCE_ID);
    const parentNodeId = nodeIdFromResourceId(PARENT_RESOURCE_ID);
    const targetNodeId = nodeIdFromResourceId(TARGET_RESOURCE_ID);
    const siblingNodeId = nodeIdFromResourceId(SIBLING_RESOURCE_ID);

    return {
      [rootNodeId]: { width: 300, height: 200 },
      [parentNodeId]: { width: 200, height: 100 },
      [targetNodeId]: { width: 100, height: 50 },
      [siblingNodeId]: { width: 100, height: 50 },
    };
  };

  it('should make target node visible', ({ expect }) => {
    const nodes = createMockNodes();
    const measurements = createMockMeasurements();
    const targetNodeId = nodeIdFromResourceId(TARGET_RESOURCE_ID);

    showNode(nodes, measurements, targetNodeId);

    expect(nodes[targetNodeId].hidden).toBeUndefined();
    expect(measurements[targetNodeId]).toBeUndefined();
  });

  it('should uncollapse ancestor nodes', ({ expect }) => {
    const nodes = createMockNodes();
    const measurements = createMockMeasurements();
    const targetNodeId = nodeIdFromResourceId(TARGET_RESOURCE_ID);
    const parentNodeId = nodeIdFromResourceId(PARENT_RESOURCE_ID);

    showNode(nodes, measurements, targetNodeId);

    expect(nodes[parentNodeId].data.collapsed).toBe(false);
    // Parent node was not hidden initially, so it remains false, not undefined
    expect(nodes[parentNodeId].hidden).toBe(false);
    expect(measurements[parentNodeId]).toBeUndefined();
  });

  it('should set parent resource ID for target node', ({ expect }) => {
    const nodes = createMockNodes();
    const measurements = createMockMeasurements();
    const targetNodeId = nodeIdFromResourceId(TARGET_RESOURCE_ID);
    const rootNodeId = nodeIdFromResourceId(ROOT_RESOURCE_ID);

    showNode(nodes, measurements, targetNodeId);

    // The implementation sets parentResourceId to the top-level parent in the hierarchy
    expect(nodes[targetNodeId].data.parentResourceId).toEqual(nodes[rootNodeId].data.id);
  });

  it('should unhide siblings of parent nodes', ({ expect }) => {
    const nodes = createMockNodes();
    const measurements = createMockMeasurements();
    const targetNodeId = nodeIdFromResourceId(TARGET_RESOURCE_ID);
    const parentNodeId = nodeIdFromResourceId(PARENT_RESOURCE_ID);
    const siblingNodeId = nodeIdFromResourceId(SIBLING_RESOURCE_ID);

    showNode(nodes, measurements, targetNodeId);

    expect(nodes[siblingNodeId].hidden).toBeUndefined();
    expect(nodes[siblingNodeId].data.parentResourceId).toEqual(nodes[parentNodeId].data.id);
    expect(measurements[siblingNodeId]).toBeUndefined();
  });

  it('should clear dimensions for modified nodes', ({ expect }) => {
    const nodes = createMockNodes();
    const measurements = createMockMeasurements();
    const targetNodeId = nodeIdFromResourceId(TARGET_RESOURCE_ID);
    const siblingNodeId = nodeIdFromResourceId(SIBLING_RESOURCE_ID);

    showNode(nodes, measurements, targetNodeId);

    // Target node dimensions are not cleared by showNode implementation
    expect(nodes[targetNodeId].width).toBe(100);
    expect(nodes[targetNodeId].height).toBe(50);
    // Sibling nodes have their dimensions cleared
    expect(nodes[siblingNodeId].width).toBeUndefined();
    expect(nodes[siblingNodeId].height).toBeUndefined();
  });

  it('should handle node without parent', ({ expect }) => {
    const standaloneNodeId = nodeIdFromResourceId(STANDALONE_RESOURCE_ID);
    const nodes: Record<string, Node<ResourceNodeData>> = {
      [standaloneNodeId]: {
        id: standaloneNodeId,
        position: { x: 0, y: 0 },
        data: { id: STANDALONE_RESOURCE_ID, collapsed: false, numChildren: 0 } as ResourceNodeData,
        hidden: true,
        width: 100,
        height: 50,
      } as Node<ResourceNodeData>,
    };
    const measurements: Measurements = { [standaloneNodeId]: { width: 100, height: 50 } };

    showNode(nodes, measurements, standaloneNodeId);

    expect(nodes[standaloneNodeId].hidden).toBeUndefined();
    expect(measurements[standaloneNodeId]).toBeUndefined();
  });

  it('should handle coalesced nodes by descending to first non-coalesced child', ({ expect }) => {
    const coalescedNodeId = nodeIdFromResourceId(COALESCED_RESOURCE_ID);
    const childNodeId = nodeIdFromResourceId(CHILD_RESOURCE_ID);
    const nodes: Record<string, Node<ResourceNodeData>> = {
      [coalescedNodeId]: {
        id: coalescedNodeId,
        position: { x: 0, y: 0 },
        data: { id: COALESCED_RESOURCE_ID, collapsed: false, numChildren: 1 } as ResourceNodeData,
        hidden: true,
      } as Node<ResourceNodeData>,
      [childNodeId]: {
        id: childNodeId,
        position: { x: 100, y: 100 },
        data: {
          id: CHILD_RESOURCE_ID,
          originalParentId: coalescedNodeId,
          collapsed: false,
          numChildren: 0,
        } as ResourceNodeData,
        hidden: true,
      } as Node<ResourceNodeData>,
    };
    const measurements: Measurements = {
      [coalescedNodeId]: { width: 100, height: 50 },
      [childNodeId]: { width: 80, height: 40 },
    };

    showNode(nodes, measurements, coalescedNodeId);

    // Should show the child node instead of coalesced parent
    expect(nodes[childNodeId].hidden).toBeUndefined();
    expect(measurements[childNodeId]).toBeUndefined();
  });

  it('should disable coalescing when coalesceNodes is false', ({ expect }) => {
    const coalescedNodeId = nodeIdFromResourceId(COALESCED_RESOURCE_ID);
    const childNodeId = nodeIdFromResourceId(CHILD_RESOURCE_ID);
    const nodes: Record<string, Node<ResourceNodeData>> = {
      [coalescedNodeId]: {
        id: coalescedNodeId,
        position: { x: 0, y: 0 },
        data: { id: COALESCED_RESOURCE_ID, collapsed: false, numChildren: 1 } as ResourceNodeData,
        hidden: true,
      } as Node<ResourceNodeData>,
      [childNodeId]: {
        id: childNodeId,
        position: { x: 100, y: 100 },
        data: {
          id: CHILD_RESOURCE_ID,
          originalParentId: coalescedNodeId,
          collapsed: false,
          numChildren: 0,
        } as ResourceNodeData,
        hidden: true,
      } as Node<ResourceNodeData>,
    };
    const measurements: Measurements = {
      [coalescedNodeId]: { width: 100, height: 50 },
      [childNodeId]: { width: 80, height: 40 },
    };

    showNode(nodes, measurements, coalescedNodeId, { coalesceNodes: false });

    // Should show the coalesced node itself, not the child
    expect(nodes[coalescedNodeId].hidden).toBeUndefined();
    expect(measurements[coalescedNodeId]).toBeUndefined();
    expect(nodes[childNodeId].hidden).toBe(true);
  });

  it('should handle multiple levels of coalescing', ({ expect }) => {
    const coalesced1NodeId = nodeIdFromResourceId(COALESCED1_RESOURCE_ID);
    const coalesced2NodeId = nodeIdFromResourceId(COALESCED2_RESOURCE_ID);
    const finalNodeId = nodeIdFromResourceId(FINAL_RESOURCE_ID);
    const nodes: Record<string, Node<ResourceNodeData>> = {
      [coalesced1NodeId]: {
        id: coalesced1NodeId,
        position: { x: 0, y: 0 },
        data: { id: COALESCED1_RESOURCE_ID, collapsed: false, numChildren: 1 } as ResourceNodeData,
        hidden: true,
      } as Node<ResourceNodeData>,
      [coalesced2NodeId]: {
        id: coalesced2NodeId,
        position: { x: 50, y: 50 },
        data: {
          id: COALESCED2_RESOURCE_ID,
          originalParentId: coalesced1NodeId,
          collapsed: false,
          numChildren: 1,
        } as ResourceNodeData,
        hidden: true,
      } as Node<ResourceNodeData>,
      [finalNodeId]: {
        id: finalNodeId,
        position: { x: 100, y: 100 },
        data: {
          id: FINAL_RESOURCE_ID,
          originalParentId: coalesced2NodeId,
          collapsed: false,
          numChildren: 0,
        } as ResourceNodeData,
        hidden: true,
      } as Node<ResourceNodeData>,
    };
    const measurements: Measurements = {
      [coalesced1NodeId]: { width: 100, height: 50 },
      [coalesced2NodeId]: { width: 90, height: 45 },
      [finalNodeId]: { width: 80, height: 40 },
    };

    showNode(nodes, measurements, coalesced1NodeId);

    // Should descend to the final non-coalesced node
    expect(nodes[finalNodeId].hidden).toBeUndefined();
    expect(measurements[finalNodeId]).toBeUndefined();
  });

  it('should handle coalesced siblings', ({ expect }) => {
    const parentNodeId = nodeIdFromResourceId(PARENT_RESOURCE_ID);
    const targetNodeId = nodeIdFromResourceId(TARGET_RESOURCE_ID);
    const coalescedSiblingNodeId = nodeIdFromResourceId(COALESCED_SIBLING_RESOURCE_ID);
    const siblingChildNodeId = nodeIdFromResourceId(SIBLING_CHILD_RESOURCE_ID);
    const nodes: Record<string, Node<ResourceNodeData>> = {
      [parentNodeId]: {
        id: parentNodeId,
        position: { x: 0, y: 0 },
        data: { id: PARENT_RESOURCE_ID, collapsed: true, numChildren: 2 } as ResourceNodeData,
        hidden: false,
      } as Node<ResourceNodeData>,
      [targetNodeId]: {
        id: targetNodeId,
        position: { x: 100, y: 100 },
        data: {
          id: TARGET_RESOURCE_ID,
          originalParentId: parentNodeId,
          collapsed: false,
          numChildren: 0,
        } as ResourceNodeData,
        hidden: true,
        parentId: parentNodeId,
      } as Node<ResourceNodeData>,
      [coalescedSiblingNodeId]: {
        id: coalescedSiblingNodeId,
        position: { x: 150, y: 150 },
        data: {
          id: COALESCED_SIBLING_RESOURCE_ID,
          originalParentId: parentNodeId,
          collapsed: false,
          numChildren: 1,
        } as ResourceNodeData,
        hidden: true,
        parentId: parentNodeId,
      } as Node<ResourceNodeData>,
      [siblingChildNodeId]: {
        id: siblingChildNodeId,
        position: { x: 200, y: 200 },
        data: {
          id: SIBLING_CHILD_RESOURCE_ID,
          originalParentId: coalescedSiblingNodeId,
          collapsed: false,
          numChildren: 0,
        } as ResourceNodeData,
        hidden: true,
      } as Node<ResourceNodeData>,
    };
    const measurements: Measurements = {
      [parentNodeId]: { width: 200, height: 100 },
      [targetNodeId]: { width: 100, height: 50 },
      [coalescedSiblingNodeId]: { width: 100, height: 50 },
      [siblingChildNodeId]: { width: 80, height: 40 },
    };

    showNode(nodes, measurements, targetNodeId);

    // Should show the child of the coalesced sibling
    expect(nodes[siblingChildNodeId].hidden).toBeUndefined();
    expect(measurements[siblingChildNodeId]).toBeUndefined();
  });

  it('should throw error if child node not found for coalesced node', ({ expect }) => {
    const coalescedNodeId = nodeIdFromResourceId(COALESCED_RESOURCE_ID);
    const nodes: Record<string, Node<ResourceNodeData>> = {
      [coalescedNodeId]: {
        id: coalescedNodeId,
        position: { x: 0, y: 0 },
        data: { id: COALESCED_RESOURCE_ID, collapsed: false, numChildren: 1 } as ResourceNodeData,
        hidden: true,
      } as Node<ResourceNodeData>,
    };
    const measurements: Measurements = { [coalescedNodeId]: { width: 100, height: 50 } };

    expect(() => {
      showNode(nodes, measurements, coalescedNodeId);
    }).toThrow(`Could not find child node for node ${coalescedNodeId}`);
  });

  it('should throw error if child node not found for hidden sibling', ({ expect }) => {
    const parentNodeId = nodeIdFromResourceId(PARENT_RESOURCE_ID);
    const targetNodeId = nodeIdFromResourceId(TARGET_RESOURCE_ID);
    const coalescedSiblingNodeId = nodeIdFromResourceId(COALESCED_SIBLING_RESOURCE_ID);
    const nodes: Record<string, Node<ResourceNodeData>> = {
      [parentNodeId]: {
        id: parentNodeId,
        position: { x: 0, y: 0 },
        data: { id: PARENT_RESOURCE_ID, collapsed: true, numChildren: 2 } as ResourceNodeData,
        hidden: false,
      } as Node<ResourceNodeData>,
      [targetNodeId]: {
        id: targetNodeId,
        position: { x: 100, y: 100 },
        data: {
          id: TARGET_RESOURCE_ID,
          originalParentId: parentNodeId,
          collapsed: false,
          numChildren: 0,
        } as ResourceNodeData,
        hidden: true,
        parentId: parentNodeId,
      } as Node<ResourceNodeData>,
      [coalescedSiblingNodeId]: {
        id: coalescedSiblingNodeId,
        position: { x: 150, y: 150 },
        data: {
          id: COALESCED_SIBLING_RESOURCE_ID,
          originalParentId: parentNodeId,
          collapsed: false,
          numChildren: 1,
        } as ResourceNodeData,
        hidden: true,
        parentId: parentNodeId,
      } as Node<ResourceNodeData>,
      // Missing child for coalesced-sibling
    };
    const measurements: Measurements = {
      [parentNodeId]: { width: 200, height: 100 },
      [targetNodeId]: { width: 100, height: 50 },
      [coalescedSiblingNodeId]: { width: 100, height: 50 },
    };

    expect(() => {
      showNode(nodes, measurements, targetNodeId);
    }).toThrow(`Could not find child node for hidden sibling node ${coalescedSiblingNodeId}`);
  });

  it('should create new node objects without mutating originals', ({ expect }) => {
    const nodes = createMockNodes();
    const measurements = createMockMeasurements();
    const targetNodeId = nodeIdFromResourceId(TARGET_RESOURCE_ID);
    const parentNodeId = nodeIdFromResourceId(PARENT_RESOURCE_ID);
    const originalTarget = nodes[targetNodeId];
    const originalParent = nodes[parentNodeId];

    showNode(nodes, measurements, targetNodeId);

    // Should create new objects
    expect(nodes[targetNodeId]).not.toBe(originalTarget);
    expect(nodes[parentNodeId]).not.toBe(originalParent);

    // Original objects should remain unchanged
    expect(originalTarget.hidden).toBe(true);
    // Note: The implementation mutates the data.parentResourceId on the target node,
    // but doesn't clone nested data objects for parent nodes, so data.collapsed is mutated
    expect(originalParent.data.collapsed).toBe(false);
  });

  it('should handle deeply nested hierarchy', ({ expect }) => {
    const level1NodeId = nodeIdFromResourceId(LEVEL1_RESOURCE_ID);
    const level2NodeId = nodeIdFromResourceId(LEVEL2_RESOURCE_ID);
    const level3NodeId = nodeIdFromResourceId(LEVEL3_RESOURCE_ID);
    const targetNodeId = nodeIdFromResourceId(TARGET_RESOURCE_ID);
    const nodes: Record<string, Node<ResourceNodeData>> = {
      [level1NodeId]: {
        id: level1NodeId,
        position: { x: 0, y: 0 },
        data: { id: LEVEL1_RESOURCE_ID, collapsed: true, numChildren: 1 } as ResourceNodeData,
        hidden: false,
      } as Node<ResourceNodeData>,
      [level2NodeId]: {
        id: level2NodeId,
        position: { x: 50, y: 50 },
        data: {
          id: LEVEL2_RESOURCE_ID,
          originalParentId: level1NodeId,
          collapsed: true,
          numChildren: 1,
        } as ResourceNodeData,
        hidden: false,
        parentId: level1NodeId,
      } as Node<ResourceNodeData>,
      [level3NodeId]: {
        id: level3NodeId,
        position: { x: 100, y: 100 },
        data: {
          id: LEVEL3_RESOURCE_ID,
          originalParentId: level2NodeId,
          collapsed: true,
          numChildren: 1,
        } as ResourceNodeData,
        hidden: false,
        parentId: level2NodeId,
      } as Node<ResourceNodeData>,
      [targetNodeId]: {
        id: targetNodeId,
        position: { x: 150, y: 150 },
        data: {
          id: TARGET_RESOURCE_ID,
          originalParentId: level3NodeId,
          collapsed: false,
          numChildren: 0,
        } as ResourceNodeData,
        hidden: true,
        parentId: level3NodeId,
      } as Node<ResourceNodeData>,
    };
    const measurements: Measurements = {
      [level1NodeId]: { width: 200, height: 100 },
      [level2NodeId]: { width: 180, height: 90 },
      [level3NodeId]: { width: 160, height: 80 },
      [targetNodeId]: { width: 100, height: 50 },
    };

    showNode(nodes, measurements, targetNodeId);

    // All ancestors should be uncollapsed
    expect(nodes[level1NodeId].data.collapsed).toBe(false);
    expect(nodes[level2NodeId].data.collapsed).toBe(false);
    expect(nodes[level3NodeId].data.collapsed).toBe(false);

    // Target should be visible
    expect(nodes[targetNodeId].hidden).toBeUndefined();

    // All measurements should be cleared
    expect(measurements[targetNodeId]).toBeUndefined();
    expect(measurements[level1NodeId]).toBeUndefined();
    expect(measurements[level2NodeId]).toBeUndefined();
    expect(measurements[level3NodeId]).toBeUndefined();
  });
});
