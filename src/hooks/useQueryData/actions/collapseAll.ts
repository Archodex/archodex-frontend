import { LayoutState, QueryData, QueryDataActions } from '..';

/**
 * Action to collapse all nodes that have children and trigger a re-layout.
 *
 * @public
 */
export interface CollapseAllAction {
  /** The action type identifier */
  action: typeof QueryDataActions.CollapseAll;
}

/**
 * Collapses all nodes that have children and triggers a re-layout.
 *
 * @param state - Current QueryData state
 * @returns Updated QueryData with collapsed parent nodes and hidden child nodes
 */
const collapseAll = (state: QueryData): QueryData => {
  const nodes = { ...state.nodes };

  for (const node of Object.values(nodes)) {
    if (node.parentId || node.data.numChildren > 0) {
      nodes[node.id] = { ...nodes[node.id] };

      if (node.parentId) {
        nodes[node.id].hidden = true;
      }

      if (node.data.numChildren > 0) {
        nodes[node.id].data.collapsed = true;
      }

      delete nodes[node.id].width;
      delete nodes[node.id].height;
    }
  }

  return { ...state, nodes, measurements: {}, fitViewAfterLayout: true, laidOut: LayoutState.Initial };
};

export default collapseAll;
