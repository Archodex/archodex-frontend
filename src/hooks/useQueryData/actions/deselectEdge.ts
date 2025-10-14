import { QueryData, QueryDataActions } from '..';

/**
 * Action to deselect an edge and any issues that reference it.
 *
 * @public
 */
export interface DeselectEdgeAction {
  /** The action type identifier */
  action: typeof QueryDataActions.DeselectEdge;
  /** The ID of the edge to deselect */
  edgeId: string;
}

/**
 * Deselects an edge and any issues that reference it.
 *
 * @param state - Current QueryData state
 * @param action - Action containing the edgeId to deselect
 * @returns Updated QueryData with deselected edge and updated issue selections
 */
const deselectEdge = (state: QueryData, action: DeselectEdgeAction): QueryData => {
  if (!state.edges[action.edgeId].selected) {
    return state; // Edge is not selected, no change needed
  }

  const edges = { ...state.edges };
  edges[action.edgeId] = { ...edges[action.edgeId], selected: false };
  const edge = edges[action.edgeId];
  delete edge.markerEnd;

  const selectedEdges = new Set(state.selection.edges);
  selectedEdges.delete(action.edgeId);

  const newIssues = new Set(state.selection.issues);
  for (const issue of state.issues?.values() ?? []) {
    if (state.selection.issues.has(issue.id) && issue.edgeIds.includes(action.edgeId)) {
      newIssues.delete(issue.id);
    }
  }

  return { ...state, edges, selection: { ...state.selection, edges: selectedEdges, issues: newIssues } };
};

export default deselectEdge;
