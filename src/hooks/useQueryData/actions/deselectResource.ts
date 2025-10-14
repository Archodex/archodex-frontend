import { QueryData, QueryDataActions } from '..';
import { edgeIdFromResourceIds, nodeIdFromResourceId } from '@/lib/utils';

/**
 * Action to deselect a resource node and remove any edges that no longer have
 * both endpoints selected. Also removes issues that depend on the deselected
 * resource or its edges.
 *
 * @public
 */
export interface DeselectResourceAction {
  /** The action type identifier */
  action: typeof QueryDataActions.DeselectResource;
  /** The ID of the resource to deselect */
  resourceId: string;
}

/**
 * Deselects a resource node and removes any edges that no longer have both endpoints selected.
 * Also removes issues that depend on the deselected resource or its edges.
 *
 * @param state - Current QueryData state
 * @param action - Action containing the resourceId to deselect
 * @returns Updated QueryData with deselected resource and updated edge/issue selections
 */
const deselectResource = (state: QueryData, action: DeselectResourceAction): QueryData => {
  if (!state.nodes[action.resourceId].selected) {
    return state; // Resource is not selected, no change needed
  }

  const nodes = { ...state.nodes };
  nodes[action.resourceId] = { ...state.nodes[action.resourceId], selected: false };

  const selectedResources = new Set(state.selection.resources);
  selectedResources.delete(action.resourceId);

  const selectedEdges = new Set(state.selection.edges);
  const edges = { ...state.edges };

  for (const resourceEvent of state.resourceEvents) {
    const edgeId = edgeIdFromResourceIds(resourceEvent.principal, resourceEvent.resource);
    if (
      !selectedResources.has(nodeIdFromResourceId(resourceEvent.principal)) &&
      !selectedResources.has(nodeIdFromResourceId(resourceEvent.resource))
    ) {
      selectedEdges.delete(edgeId);
      // Update the edge in state.edges to deselect it for ReactFlow
      if (edges[edgeId].selected) {
        edges[edgeId] = { ...edges[edgeId], selected: false };
        delete edges[edgeId].markerEnd;
      }
    }
  }

  const newIssues = new Set(state.selection.issues);
  for (const issue of state.issues?.values() ?? []) {
    if (
      state.selection.issues.has(issue.id) &&
      (issue.resourceIds.includes(action.resourceId) || issue.edgeIds.some((edgeId) => !selectedEdges.has(edgeId)))
    ) {
      newIssues.delete(issue.id);
    }
  }

  return {
    ...state,
    nodes,
    edges,
    selection: { resources: selectedResources, edges: selectedEdges, issues: newIssues },
  };
};

export default deselectResource;
