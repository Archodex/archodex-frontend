import { ResourceNodeData } from '@/ResourceNode';
import { LayoutState, QueryData, QueryDataActions } from '..';
import { MarkerType, Node } from '@xyflow/react';
import showNode from '../showNode';
import { edgeIdFromResourceIds, nodeIdFromResourceId } from '@/lib/utils';

/**
 * Action to select a resource node and optionally its connected edges.
 * Automatically shows hidden nodes and selects related issues when all their
 * referenced nodes and edges are selected.
 *
 * @public
 */
export interface SelectResourceAction {
  /** The action type identifier */
  action: typeof QueryDataActions.SelectResource;
  /** The ID of the resource to select */
  resourceId: string;
  /** Whether to refit the view after selection (defaults to true) */
  refitView?: boolean;
  /** Whether to select connected edges (defaults to true) */
  selectEdges?: boolean;
}

/**
 * Selects a resource node and optionally its connected edges.
 * Automatically shows hidden nodes and selects related issues when all their
 * referenced nodes and edges are selected.
 *
 * @param state - Current QueryData state
 * @param action - Action containing resourceId and optional flags
 * @returns Updated QueryData with selected resource, edges, and potentially updated layout state
 */
const selectResource = (state: QueryData, action: SelectResourceAction): QueryData => {
  if (state.nodes[action.resourceId].selected) {
    return state;
  }

  const nodes = { ...state.nodes };
  const node: Node<ResourceNodeData> = { ...state.nodes[action.resourceId], selected: true };
  nodes[action.resourceId] = node;

  let measurements = state.measurements;
  let laidOut = state.laidOut;
  if (node.hidden) {
    measurements = { ...state.measurements };
    laidOut = LayoutState.Initial;
    showNode(nodes, measurements, node.id);
  }

  const resources = new Set(state.selection.resources).add(action.resourceId);
  const selectedEdges = new Set(state.selection.edges);
  const newIssues = new Set(state.selection.issues);

  let edges = state.edges;
  if (action.selectEdges === undefined || action.selectEdges) {
    edges = { ...state.edges };
    for (const resourceEvent of state.resourceEvents) {
      if (
        action.resourceId === nodeIdFromResourceId(resourceEvent.principal) ||
        action.resourceId === nodeIdFromResourceId(resourceEvent.resource)
      ) {
        const edgeId = edgeIdFromResourceIds(resourceEvent.principal, resourceEvent.resource);
        selectedEdges.add(edgeId);

        edges[edgeId] = {
          ...edges[edgeId],
          selected: true,
          markerEnd: { type: MarkerType.ArrowClosed, color: 'selected' },
        };
      }
    }
  }

  for (const issue of state.issues?.values() ?? []) {
    if (
      !state.selection.issues.has(issue.id) &&
      issue.resourceIds.every((resourceId) => resources.has(resourceId)) &&
      issue.edgeIds.every((edgeId) => selectedEdges.has(edgeId))
    ) {
      newIssues.add(issue.id);
    }
  }

  return {
    ...state,
    measurements,
    nodes,
    edges,
    laidOut,
    fitViewAfterLayout: state.fitViewAfterLayout || (action.refitView ?? true),
    selection: { resources, edges: selectedEdges, issues: newIssues },
  };
};

export default selectResource;
