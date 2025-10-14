import { type Node } from '@xyflow/react';
import { ResourceNodeData } from '@/ResourceNode';
import { Measurements } from '.';

/**
 * Ensures a node is visible in the flow by modifying ancestor and sibling nodes as needed.
 *
 * This function performs the following operations:
 * - Makes the target node visible by removing its hidden property
 * - Uncollapses all ancestor nodes in the hierarchy to ensure visibility path
 * - Unhides sibling nodes of ancestors to provide context
 * - Clears measurements cache for all modified nodes
 *
 * @param nodes - Record of nodes indexed by ID.
 * @param measurements - Measurements object that will be modified to clear cached values for affected nodes.
 * @param nodeId - The ID of the node to make visible.
 *
 * @throws {Error} When a child node cannot be found for a hidden sibling node during traversal.
 *
 * @remarks
 * The function modifies the `nodes` and `measurements` objects in place, but individual node
 * objects are cloned to prevent mutation of the original state.
 */
const showNode = (
  nodes: Record<string, Node<ResourceNodeData>>,
  measurements: Measurements,
  nodeId: string,
  options: { coalesceNodes?: boolean } = { coalesceNodes: true },
) => {
  // If this is a coalesced node, descend to the first non-coalesced child
  // node.
  while (options.coalesceNodes && nodes[nodeId].data.numChildren === 1) {
    const childNodeId = Object.values(nodes).find((n) => n.data.originalParentId === nodeId)?.id;
    if (!childNodeId) {
      throw new Error(`Could not find child node for node ${nodeId}`);
    }

    nodeId = childNodeId;
  }

  const node = { ...nodes[nodeId] };
  nodes[nodeId] = node;

  delete node.hidden;

  measurements[nodeId] = undefined;

  // Uncollapse ancestor nodes so we can see the selected node
  for (
    let parentNode = node.parentId ? nodes[node.parentId] : undefined;
    parentNode;
    parentNode = parentNode.parentId ? nodes[parentNode.parentId] : undefined
  ) {
    node.data.parentResourceId = parentNode.data.id;

    parentNode = { ...parentNode };
    nodes[parentNode.id] = parentNode;

    if (parentNode.hidden) {
      delete parentNode.hidden;
    }

    parentNode.data.collapsed = false;
    measurements[parentNode.id] = undefined;

    // Unhide siblings of the parent node, otherwise users may think there
    // are no siblings
    for (let hiddenSiblingNode of Object.values(nodes).filter(
      (n) => n.data.originalParentId === parentNode.id && n.hidden,
    )) {
      while (options.coalesceNodes && hiddenSiblingNode.data.numChildren === 1) {
        const hiddenSiblingChildNode = Object.values(nodes).find(
          (n) => n.data.originalParentId === hiddenSiblingNode.id,
        );
        if (!hiddenSiblingChildNode) {
          throw new Error(`Could not find child node for hidden sibling node ${hiddenSiblingNode.id}`);
        }
        hiddenSiblingNode = hiddenSiblingChildNode;
      }

      nodes[hiddenSiblingNode.id] = {
        ...hiddenSiblingNode,
        hidden: false,
        data: { ...hiddenSiblingNode.data, parentResourceId: parentNode.data.id },
      };
      hiddenSiblingNode = nodes[hiddenSiblingNode.id];

      delete hiddenSiblingNode.width;
      delete hiddenSiblingNode.height;
      delete hiddenSiblingNode.hidden;
      measurements[hiddenSiblingNode.id] = undefined;
    }
  }
};

export default showNode;
