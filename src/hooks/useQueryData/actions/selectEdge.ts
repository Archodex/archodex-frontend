import { LayoutState, QueryData, QueryDataActions } from '..';
import { ELKEdgeData } from '@/ELKEdge';
import { Edge, MarkerType } from '@xyflow/react';
import showNode from '../showNode';

/**
 * Action to select an edge and all edges in its event chain.
 * Automatically shows hidden source/target nodes and selects related issues.
 *
 * @public
 */
export interface SelectEdgeAction {
  /** The action type identifier */
  action: typeof QueryDataActions.SelectEdge;
  /** The ID of the edge to select */
  edgeId: string;
  /** Whether to refit the view after selection (defaults to true) */
  refitView?: boolean;
}

/**
 * Selects an edge and all edges in its event chain (preceding and following).
 * Automatically shows hidden source/target nodes and selects issues when all
 * their referenced nodes and edges are selected.
 *
 * @param state - Current QueryData state
 * @param action - Action containing the edgeId to select and optional refitView flag
 * @returns Updated QueryData with selected edge, chain edges, and potentially updated layout state
 */
const selectEdge = (state: QueryData, action: SelectEdgeAction): QueryData => {
  if (state.edges[action.edgeId].selected) {
    return state; // Edge is already selected, no change needed
  }

  const edges = { ...state.edges };
  const edge: Edge<ELKEdgeData> = {
    ...edges[action.edgeId],
    selected: true,
    markerEnd: { type: MarkerType.ArrowClosed, color: 'selected' },
  };
  edges[action.edgeId] = edge;

  const links = [...state.eventChainLinks[action.edgeId].preceding, ...state.eventChainLinks[action.edgeId].following];
  for (const link of links) {
    edges[link] = { ...edges[link], selected: true, markerEnd: { type: MarkerType.ArrowClosed, color: 'selected' } };
  }

  let measurements = state.measurements;
  let nodes = state.nodes;
  let laidOut = state.laidOut;
  if (nodes[edge.source].hidden || nodes[edge.target].hidden) {
    measurements = { ...state.measurements };
    nodes = { ...state.nodes };
    laidOut = LayoutState.Initial;
    if (nodes[edge.source].hidden) {
      showNode(nodes, measurements, edge.source);
    }
    if (nodes[edge.target].hidden) {
      showNode(nodes, measurements, edge.target);
    }
  }

  const selectedEdges = new Set(state.selection.edges).add(action.edgeId);
  const selectedIssues = new Set(state.selection.issues);

  for (const link of links) {
    selectedEdges.add(link);
  }

  for (const issue of state.issues?.values() ?? []) {
    if (
      !state.selection.issues.has(issue.id) &&
      issue.resourceIds.every((resourceId) => state.selection.resources.has(resourceId)) &&
      issue.edgeIds.every((edgeId) => selectedEdges.has(edgeId))
    ) {
      selectedIssues.add(issue.id);
    }
  }

  return {
    ...state,
    measurements,
    nodes,
    edges,
    laidOut,
    fitViewAfterLayout: state.fitViewAfterLayout || (action.refitView ?? true),
    selection: { ...state.selection, edges: selectedEdges, issues: selectedIssues },
  };
};

export default selectEdge;
