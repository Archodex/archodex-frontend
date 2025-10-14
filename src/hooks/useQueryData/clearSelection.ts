import { Edge, Node } from '@xyflow/react';
import { QueryData } from '.';
import { ResourceNodeData } from '@/ResourceNode';
import { ELKEdgeData } from '@/ELKEdge';

/**
 * Clears all selections (resources, edges, and issues) from the state.
 *
 * @param state - Current QueryData state
 * @returns Updated QueryData with empty selection sets
 */
const clearSelection = (state: QueryData): QueryData => {
  if (state.selection.resources.size === 0 && state.selection.edges.size === 0 && state.selection.issues.size === 0) {
    return state;
  }

  let nodes: Record<string, Node<ResourceNodeData>> | undefined;
  for (const nodeId in state.nodes) {
    if (state.nodes[nodeId].selected) {
      nodes ??= { ...state.nodes };

      nodes[nodeId] = { ...nodes[nodeId], selected: false };
    }
  }

  let edges: Record<string, Edge<ELKEdgeData>> | undefined;
  for (const edgeId in state.edges) {
    if (state.edges[edgeId].selected) {
      edges ??= { ...state.edges };

      edges[edgeId] = { ...edges[edgeId], selected: false };
      delete edges[edgeId].markerEnd;
    }
  }

  return {
    ...state,
    nodes: nodes ?? state.nodes,
    edges: edges ?? state.edges,
    selection: { resources: new Set(), edges: new Set(), issues: new Set() },
  };
};

export default clearSelection;
