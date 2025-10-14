import { QueryData, QueryDataActions } from '..';

/**
 * Action to deselect an issue and all its referenced resources and edges.
 * This may result in the deselection of other issues if resources and edges
 * they reference are no longer selected.
 *
 * @public
 */
export interface DeselectIssueAction {
  /** The action type identifier */
  action: typeof QueryDataActions.DeselectIssue;
  /** The ID of the issue to deselect */
  issueId: string;
}

/**
 * Deselects an issue and all its referenced resources and edges. This may
 * result in the deselection of other issues if resources and edges they
 * reference are no longer selected.
 *
 * @param state - Current QueryData state
 * @param action - Action containing the issueId to deselect
 * @returns Updated QueryData with deselected issue and updated selections
 * @throws Error if the issue with the given ID is not found
 */
const deselectIssue = (state: QueryData, action: DeselectIssueAction): QueryData => {
  const issue = state.issues?.get(action.issueId);
  if (!issue) {
    throw new Error(`Issue with id ${action.issueId} not found while attempting to select issue.`);
  }

  const nodes = { ...state.nodes };
  for (const resourceId of issue.resourceIds) {
    nodes[resourceId] = { ...nodes[resourceId], selected: false };
  }

  const edges = { ...state.edges };
  for (const edgeId of issue.edgeIds) {
    edges[edgeId] = { ...edges[edgeId], selected: false };
    delete edges[edgeId].markerEnd;
  }

  const selectedResources = new Set(state.selection.resources);
  const selectedEdges = new Set(state.selection.edges);

  for (const resourceId of issue.resourceIds) {
    selectedResources.delete(resourceId);
  }

  for (const edgeId of issue.edgeIds) {
    selectedEdges.delete(edgeId);
  }

  const selectedIssues = new Set(state.selection.issues);
  for (const otherIssueId of state.selection.issues) {
    if (otherIssueId === action.issueId) {
      selectedIssues.delete(otherIssueId);
      continue;
    }

    const otherIssue = state.issues?.get(otherIssueId);
    if (!otherIssue) {
      throw new Error(`Issue with id ${otherIssueId} not found while attempting to deselect issue.`);
    }

    if (
      otherIssue.resourceIds.some((id) => !nodes[id].selected) ||
      otherIssue.edgeIds.some((id) => !edges[id].selected)
    ) {
      selectedIssues.delete(otherIssueId);
    }
  }

  return {
    ...state,
    nodes,
    edges,
    selection: { resources: selectedResources, edges: selectedEdges, issues: selectedIssues },
  };
};

export default deselectIssue;
