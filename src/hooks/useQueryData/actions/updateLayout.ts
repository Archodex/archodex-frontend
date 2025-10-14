import { ResourceNodeData } from '@/ResourceNode';
import { LayoutState, QueryData, QueryDataActions } from '..';
import { ELKEdgeData } from '@/ELKEdge';
import { Edge, Node } from '@xyflow/react';
import { fitViewport } from './fitView';

/**
 * Action to update the QueryData state with newly calculated layout information from ELK.
 * Replaces the current nodes and edges with the laid-out versions and optionally
 * fits the viewport.
 *
 * @public
 */
export interface UpdateLayoutAction {
  /** The action type identifier */
  action: typeof QueryDataActions.UpdateLayout;
  /** The updated nodes with layout positions */
  nodes: Record<string, Node<ResourceNodeData>>;
  /** The updated edges with layout positions */
  edges: Record<string, Edge<ELKEdgeData>>;
}

/**
 * Updates the QueryData state with newly calculated layout information from ELK.
 * Replaces the current nodes and edges with the laid-out versions and optionally
 * fits the viewport.
 *
 * @param state - Current QueryData state
 * @param action - Action containing the updated nodes and edges with layout positions
 * @returns Updated QueryData with new layout, updated viewport if needed, and layout state set to LaidOut
 */
const updateLayout = (state: QueryData, action: UpdateLayoutAction): QueryData => {
  return {
    ...state,
    nodes: action.nodes,
    edges: action.edges,
    viewport: state.fitViewAfterLayout ? fitViewport(action.nodes, action.edges) : state.viewport,
    fitViewAfterLayout: false,
    laidOut: LayoutState.LaidOut,
  };
};

export default updateLayout;
