import MenuSection from '@/lib/menuSection';
import { LayoutState, QueryData, QueryDataActions } from '..';
import { coalesceNodes } from '@/lib/utils';

/**
 * Action to expand all collapsed nodes in the graph, showing their children and
 * coalescing nodes for dashboards other than the 'Environments' dashboard.
 * Triggers a re-layout of the graph.
 *
 * @public
 */
export interface ExpandAllAction {
  /** The action type identifier */
  action: typeof QueryDataActions.ExpandAll;
}

/**
 * Expands all collapsed nodes in the graph, showing their children and
 * coalescing nodes for dashboards other than the 'Environments' dashboard.
 * Triggers a re-layout of the graph.
 *
 * @param state - Current QueryData state
 * @returns Updated QueryData with all nodes expanded and layout reset
 */
const expandAll = (state: QueryData): QueryData => {
  const nodes = { ...state.nodes };

  for (let node of Object.values(nodes)) {
    node = { ...nodes[node.id] };
    nodes[node.id] = node;

    node.hidden = false;
    node.data.collapsed = false;

    node.parentId = node.data.originalParentId;
    node.data.parentResourceId = node.data.originalParentResourceId;

    delete node.width;
    delete node.height;
  }

  if (state.section !== MenuSection.Environments) {
    coalesceNodes(nodes);
  }

  for (const node of Object.values(nodes)) {
    const prevNode = state.nodes[node.id];

    if (node.hidden && !prevNode.hidden) {
      node.hidden = true;
    } else if (!node.hidden && prevNode.hidden) {
      delete node.hidden;
    }

    if (!node.data.collapsed && prevNode.data.collapsed) {
      node.data.collapsed = false;
    }
  }

  return { ...state, nodes, measurements: {}, fitViewAfterLayout: true, laidOut: LayoutState.Initial };
};

export default expandAll;
