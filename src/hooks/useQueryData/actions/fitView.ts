import { ResourceNodeData } from '@/ResourceNode';
import { QueryData, QueryDataActions, ViewportTransition } from '..';
import { ELKEdgeData } from '@/ELKEdge';
import { Edge, Node } from '@xyflow/react';

/**
 * Action to update the viewport to fit the selected elements or the entire graph
 * within the visible area of the QueryGraph component.
 *
 * @public
 */
export interface FitViewAction {
  /** The action type identifier */
  action: typeof QueryDataActions.FitView;
  /** Whether to fit only selected elements (default: true) */
  fitToSelection?: boolean;
  /** Animation duration in milliseconds */
  duration?: number;
}

// Used for viewport updates when not needing to relayout the graph
export const FIT_VIEW_DURATION = 500;

/**
 * Updates the viewport to fit the selected elements or the entire graph,
 * within the visible area of QueryGraph component.
 *
 * @param state - Current QueryData state
 * @param action - Action with optional fitToSelection flag and animation duration
 * @returns Updated QueryData with new viewport and fitViewAfterLayout cleared
 */
const fitView = (state: QueryData, action: FitViewAction): QueryData => {
  return {
    ...state,
    viewport: fitViewport(state.nodes, state.edges, {
      fitToSelection: action.fitToSelection,
      duration: action.duration,
    }),
    fitViewAfterLayout: false,
  };
};

const PADDING = 20;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 1;

/**
 * Calculates the viewport transformation needed to fit nodes and edges within the view.
 *
 * @param nodes - Record of all nodes in the graph
 * @param edges - Record of all edges in the graph
 * @param options - Configuration options
 * @param options.fitToSelection - Whether to fit only selected elements (default: true)
 * @param options.duration - Animation duration in milliseconds
 * @returns ViewportTransition with x, y, zoom, and optional duration
 * @throws Error if React Flow element is not found in the DOM
 */
export const fitViewport = (
  nodes: Record<string, Node<ResourceNodeData>>,
  edges: Record<string, Edge<ELKEdgeData>>,
  { fitToSelection, duration }: { fitToSelection?: boolean; duration?: number } = { fitToSelection: true },
): ViewportTransition => {
  if (Object.keys(nodes).length === 0 && Object.keys(edges).length === 0) {
    return { x: 0, y: 0, zoom: 1 };
  }

  const fitNodes = new Set(Object.values(nodes).filter((node) => (!fitToSelection || node.selected) && !node.hidden));
  const fitEdges = new Set(Object.values(edges).filter((edge) => (!fitToSelection || edge.selected) && !edge.hidden));

  if (fitToSelection) {
    if (fitNodes.size === 0 && fitEdges.size === 0) {
      for (const node of Object.values(nodes).filter((node) => !node.hidden)) {
        fitNodes.add(node);
      }

      for (const edge of Object.values(edges).filter((edge) => !edge.hidden)) {
        fitEdges.add(edge);
      }
    }

    for (const edge of fitEdges) {
      const sourceNode = nodes[edge.source];
      const targetNode = nodes[edge.target];

      fitNodes.add(sourceNode);
      fitNodes.add(targetNode);
    }
  }

  const reactFlowElement = document.querySelector('.react-flow');
  if (!reactFlowElement) {
    throw new Error('React Flow element not found while attempting to fit view.');
  }

  const fitNodesArray = Array.from(fitNodes);
  const fitEdgesArray = Array.from(fitEdges);

  const minX = Math.min(
    ...fitNodesArray.map((node) => node.data.absolutePosition.x),
    ...fitEdgesArray.map((edge) => edge.data?.section?.bendPoints?.map((bp) => bp.x) ?? []).flat(),
  );
  const minY = Math.min(
    ...fitNodesArray.map((node) => node.data.absolutePosition.y),
    ...fitEdgesArray.map((edge) => edge.data?.section?.bendPoints?.map((bp) => bp.y) ?? []).flat(),
  );
  const maxX = Math.max(
    ...fitNodesArray.map((node) => node.data.absolutePosition.x + (node.width ?? 0)),
    ...fitEdgesArray.map((edge) => edge.data?.section?.bendPoints?.map((bp) => bp.x) ?? []).flat(),
  );
  const maxY = Math.max(
    ...fitNodesArray.map((node) => node.data.absolutePosition.y + (node.height ?? 0)),
    ...fitEdgesArray.map((edge) => edge.data?.section?.bendPoints?.map((bp) => bp.y) ?? []).flat(),
  );

  const viewWidth = reactFlowElement.clientWidth - 2 * PADDING;
  const viewHeight = reactFlowElement.clientHeight - 2 * PADDING;

  const fitWidth = maxX - minX;
  const fitHeight = maxY - minY;

  const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.min(viewWidth / fitWidth, viewHeight / fitHeight)));

  const fitCenterX = minX + fitWidth / 2;
  const fitCenterY = minY + fitHeight / 2;

  return {
    x: viewWidth / 2 - fitCenterX * zoom + PADDING,
    y: viewHeight / 2 - fitCenterY * zoom + PADDING,
    zoom,
    duration,
  };
};

export default fitView;
