import { Edge, MarkerType, Node } from '@xyflow/react';
import { LayoutState, Measurements, QueryData, QueryDataActions } from '..';
import showNode from '../showNode';
import { ResourceNodeData } from '@/ResourceNode';
import { ELKEdgeData } from '@/ELKEdge';

/**
 * Action to select an issue and all its associated resources and edges.
 * Shows any hidden nodes referenced by the issue and selects any other issues
 * whose dependencies become fully selected as a result.
 *
 * @public
 */
export interface SelectIssueAction {
  /** The action type identifier */
  action: typeof QueryDataActions.SelectIssue;
  /** The ID of the issue to select */
  issueId: string;
  /** Whether to refit the view after selection (defaults to true) */
  refitView?: boolean;
}

/**
 * Selects an issue and all its associated resources and edges.
 * Shows any hidden nodes referenced by the issue and selects any other issues
 * whose dependencies become fully selected as a result.
 *
 * @param state - Current QueryData state
 * @param action - Action containing the issueId to select and optional refitView flag
 * @returns Updated QueryData with selected issue and its dependencies
 * @throws Error if the issue with the given ID is not found
 */
const selectIssue = (state: QueryData, action: SelectIssueAction): QueryData => {
  const issue = state.issues?.get(action.issueId);
  if (!issue) {
    throw new Error(`Issue with id ${action.issueId} not found while attempting to select issue.`);
  }

  let nodes: Record<string, Node<ResourceNodeData>> | undefined;
  let measurements: Measurements | undefined;
  let laidOut: LayoutState | undefined;
  for (const resourceId of issue.resourceIds) {
    if (state.nodes[resourceId].selected) {
      continue;
    }

    nodes ??= { ...state.nodes };

    const node = { ...nodes[resourceId], selected: true };
    nodes[resourceId] = node;

    if (node.hidden) {
      measurements ??= { ...state.measurements };
      showNode(nodes, measurements, node.id);
      laidOut = LayoutState.Initial;
    }
  }

  let edges: Record<string, Edge<ELKEdgeData>> | undefined;
  for (const edgeId of issue.edgeIds) {
    if (state.edges[edgeId].selected) {
      continue;
    }

    edges ??= { ...state.edges };

    const edge = { ...edges[edgeId], selected: true, markerEnd: { type: MarkerType.ArrowClosed, color: 'selected' } };
    edges[edgeId] = edge;
  }

  const selectedResources = new Set(state.selection.resources);
  const selectedEdges = new Set(state.selection.edges);

  for (const resourceId of issue.resourceIds) {
    selectedResources.add(resourceId);
  }

  for (const edgeId of issue.edgeIds) {
    selectedEdges.add(edgeId);
  }

  const selectedIssues = new Set(state.selection.issues).add(action.issueId);
  for (const issue of state.issues?.values() ?? []) {
    if (
      !selectedIssues.has(issue.id) &&
      issue.resourceIds.every((resourceId) => selectedResources.has(resourceId)) &&
      issue.edgeIds.every((edgeId) => selectedEdges.has(edgeId))
    ) {
      selectedIssues.add(issue.id);
    }
  }

  return {
    ...state,
    nodes: nodes ?? state.nodes,
    edges: edges ?? state.edges,
    measurements: measurements ?? state.measurements,
    laidOut: laidOut ?? state.laidOut,
    fitViewAfterLayout: state.fitViewAfterLayout || (action.refitView ?? true),
    selection: { resources: selectedResources, edges: selectedEdges, issues: selectedIssues },
  };
};

export default selectIssue;
