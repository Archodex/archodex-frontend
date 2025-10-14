import { ResourceNodeData } from '@/ResourceNode';
import { LayoutState, QueryData, QueryDataActions } from '..';
import { Node } from '@xyflow/react';
import showNode from '../showNode';
import MenuSection from '@/lib/menuSection';

/**
 * Action to toggle the collapsed state of a node in the graph.
 * When collapsing: hides all descendant nodes that are direct children.
 * When expanding: shows the immediate children and applies coalescing based on
 * the current dashboard section.
 *
 * @public
 */
export interface ToggleNodeCollapsedAction {
  /** The action type identifier */
  action: typeof QueryDataActions.ToggleNodeCollapsed;
  /** The ID of the node to toggle */
  nodeId: string;
}

/**
 * Toggles the collapsed state of a node in the graph.
 * When collapsing: hides all descendant nodes that are direct children.
 * When expanding: shows the immediate children and applies coalescing based on
 * the current dashboard section.
 * Triggers a re-layout.
 *
 * @param state - Current QueryData state
 * @param action - Action containing the nodeId to toggle
 * @returns Updated QueryData with toggled node state and reset layout
 * @throws Error if attempting to expand a node that has no children
 */
const toggleNodeCollapsed = (state: QueryData, action: ToggleNodeCollapsedAction): QueryData => {
  const { nodeId } = action;

  const nodes = { ...state.nodes };
  nodes[nodeId] = { ...state.nodes[nodeId] };

  const curNode = nodes[nodeId];
  curNode.data.collapsed = !curNode.data.collapsed;

  const measurements = { ...state.measurements };
  let parentNode: Node<ResourceNodeData> | undefined = curNode;
  while (parentNode) {
    measurements[parentNode.id] = undefined;

    delete parentNode.width;
    delete parentNode.height;

    if (parentNode.parentId) {
      parentNode = { ...nodes[parentNode.parentId] };
      nodes[parentNode.id] = parentNode;
    } else {
      parentNode = undefined;
    }
  }

  if (!curNode.data.collapsed) {
    const childNode = Object.values(nodes).find((node) => node.data.originalParentId === curNode.id);
    if (!childNode) {
      throw new Error(`Node with id ${curNode.id} has no children, cannot toggle collapsed state.`);
    }

    showNode(nodes, measurements, childNode.id, { coalesceNodes: state.section !== MenuSection.Environments });
  } else {
    for (const otherNodeId of Object.keys(nodes)) {
      const otherNode = nodes[otherNodeId];

      // Iterate upwards through ancestors until we find a direct child of the
      // node we are collapsing, or the root node. If we find a direct child,
      // hide it.
      let parent = otherNode.parentId ? nodes[otherNode.parentId] : undefined;
      while (parent) {
        if (parent.id === curNode.id || parent.data.collapsed) {
          break;
        }

        parent = parent.parentId ? nodes[parent.parentId] : undefined;
      }

      if (parent?.id !== curNode.id) {
        continue;
      }

      // Continue upward past coalesced nodes
      if (otherNode.data.hidden) {
        continue;
      }

      if (!otherNode.hidden) {
        nodes[otherNode.id] = { ...otherNode, hidden: true };
      }
    }
  }

  return { ...state, measurements, nodes, laidOut: LayoutState.Initial };
};

export default toggleNodeCollapsed;
