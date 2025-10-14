import { Edge, Node } from '@xyflow/react';
import { ResourceNodeData } from '@/ResourceNode';
import { ELKEdgeData } from '@/ELKEdge';
import ELK, { ElkExtendedEdge, ElkNode, ElkLayoutArguments } from 'elkjs/lib/elk.bundled';

export const ISSUE_BADGE_SIZE = 26;

const elk = new ELK();

/**
 * Performs automatic graph layout using the ELK (Eclipse Layout Kernel) library.
 * Arranges nodes hierarchically, handles parent-child relationships, coalesces edges,
 * and calculates absolute positions for all graph elements.
 *
 * @param nodes - Record of all nodes in the graph with their data and initial properties
 * @param edges - Record of all edges connecting nodes in the graph
 * @param measurements - Measured dimensions for each node to inform layout decisions
 * @returns Promise resolving to updated nodes and edges with calculated positions and layout data
 * @throws Error if required node/edge data is missing during layout calculation
 */
const layoutGraph = async (
  nodes: Record<string, Node<ResourceNodeData>>,
  edges: Record<string, Edge<ELKEdgeData>>,
  measurements: Record<string, { width: number; height: number } | undefined>,
): Promise<{ nodes: Record<string, Node<ResourceNodeData>>; edges: Record<string, Edge<ELKEdgeData>> }> => {
  interface ELKFlowEdge extends ElkExtendedEdge {
    data: ELKEdgeData;
    selected?: boolean;
  }

  interface ElkFlowNode extends ElkNode {
    children?: ElkFlowNode[];
    edges?: ELKFlowEdge[];
    measured?: { width?: number; height?: number };
    className: string;
    data: ResourceNodeData;
  }

  const TITLE_HEIGHT = 46;
  const CONTAINER_PADDING = 20;

  const elkLayoutArguments: ElkLayoutArguments = {
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'RIGHT',
      'elk.contentAlignment': 'H_CENTER',
      'elk.portConstraints': 'FIXED_SIDE',
      hierarchyHandling: 'INCLUDE_CHILDREN',
      'nodeSize.constraints': '[MINIMUM_SIZE]',
      // Nodes have space above for env and issue badges, ensure ports start below
      'spacing.portsSurrounding': `[top=${String(ISSUE_BADGE_SIZE / 2)},left=0,bottom=0,right=0]`,
      // Space edges apart enough so labels don't overlap
      'spacing.edgeEdge': '20',
    },
  };

  const elkNodes: Record<string, ElkFlowNode | undefined> = {};

  nodes = structuredClone(nodes);
  edges = structuredClone(edges);

  for (const node of Object.values(nodes)) {
    elkNodes[node.id] = {
      id: node.id,
      className: 'text-lg font-semibold',
      children: [],
      edges: [],
      layoutOptions: {
        'elk.padding': `top=${String(TITLE_HEIGHT + CONTAINER_PADDING)},left=${String(CONTAINER_PADDING)},bottom=${String(CONTAINER_PADDING)},right=${String(CONTAINER_PADDING)}`,
      },
      data: node.data,
    };
  }

  const rootChildren: ElkFlowNode[] = [];

  // Create the tree of ELK nodes. Child nodes are attached to their closest
  // visible ancestor. Hidden nodes are omitted from the tree.
  for (const node of Object.values(nodes)) {
    if (node.hidden) {
      continue;
    }

    const elkNode = elkNodes[node.id];
    if (!elkNode) {
      throw new Error(`Node ${node.id} not found in ELK nodes while processing children`);
    }

    let parentNode;
    if (node.data.originalParentId) {
      parentNode = nodes[node.data.originalParentId];
      while (parentNode.hidden && parentNode.data.originalParentId) {
        parentNode = nodes[parentNode.data.originalParentId];
      }
    }

    if (parentNode && !parentNode.hidden) {
      elkNodes[parentNode.id]?.children?.push(elkNode);
      elkNode.data.parentResourceId = parentNode.data.id;
    } else {
      rootChildren.push(elkNode);
    }
  }

  // A mapping of coalesced node IDs to the visible node they are part of.
  const targetNodesForCoallescedNodeIds: Record<string, Node<ResourceNodeData> | undefined> = {};

  // Calculate targets for coalesced nodes
  for (const node of Object.values(nodes)) {
    if (node.hidden) {
      continue;
    }

    if (node.data.originalParentId) {
      let parentNode: Node<ResourceNodeData> | undefined = nodes[node.data.originalParentId];
      while (parentNode?.hidden) {
        targetNodesForCoallescedNodeIds[parentNode.id] ??= node;

        parentNode = parentNode.data.originalParentId ? nodes[parentNode.data.originalParentId] : undefined;
      }
    }
  }

  const calculateChildrenMinDimensions = (elkNode: ElkFlowNode) => {
    const dimensions = measurements[elkNode.id];

    if (elkNode.layoutOptions) {
      if (dimensions) {
        elkNode.layoutOptions['elk.nodeSize.minimum'] = `(${String(dimensions.width)}, ${String(dimensions.height)})`;
      }
    } else {
      throw new Error(`Node ${elkNode.id} missing layoutOptions`);
    }

    for (const child of elkNode.children ?? []) {
      calculateChildrenMinDimensions(child);
    }
  };

  for (const rootChild of rootChildren) {
    calculateChildrenMinDimensions(rootChild);
  }

  // Create ELK layout edges from React Flow edges
  for (const edge of Object.values(edges)) {
    if (!edge.data) {
      throw new Error(`Edge ${edge.id} missing data`);
    }

    // Reset all edges back to their original state of one event. In previous
    // layouts we may have coalesced events together, so this puts the
    // original event text back in place of '(Multiple)'.
    edge.data.events = [edge.data.events[0]];
    edge.data.label.text = edge.data.events[0].type;

    const originalSourceId = edge.data.originalSourceId;
    const originalTargetId = edge.data.originalTargetId;

    if (!originalSourceId) {
      throw new Error(`Edge ${edge.id} missing data.originalSource`);
    }

    if (!originalTargetId) {
      throw new Error(`Edge ${edge.id} missing data.originalTarget`);
    }

    let sourceNode = targetNodesForCoallescedNodeIds[originalSourceId] ?? nodes[originalSourceId];

    // If source node is in a collapsed parent, use the closest visible ancestor
    while (sourceNode.hidden && sourceNode.parentId) {
      const parentNode: Node<ResourceNodeData> | undefined = nodes[sourceNode.parentId];
      sourceNode = parentNode;
    }

    const sourceElkNode = elkNodes[sourceNode.id];
    if (!sourceElkNode) {
      throw new Error(`Source node ${sourceNode.id} not found in ELK nodes while processing edges`);
    }

    let targetNode = targetNodesForCoallescedNodeIds[originalTargetId] ?? nodes[originalTargetId];

    // If target node is in a collapsed parent, use the closest visible ancestor
    while (targetNode.hidden && targetNode.parentId) {
      const parentNode: Node<ResourceNodeData> | undefined = nodes[targetNode.parentId];
      targetNode = parentNode;
    }

    sourceElkNode.edges = sourceElkNode.edges ?? [];

    // Hide edges if they are between nodes inside a collapsed ancestor
    if (sourceNode.id === targetNode.id && (sourceNode.id !== originalSourceId || targetNode.id !== originalTargetId)) {
      edge.hidden = true;
      continue;
    } else {
      edge.hidden = false;
    }

    // Coallesce edges between the same two nodes
    const existingElkEdgeToTarget = sourceElkNode.edges.find((e) => e.targets[0] === targetNode.id);
    if (existingElkEdgeToTarget) {
      // Swap edges if needed so the selected edge is the one that is shown
      if (edge.selected && !existingElkEdgeToTarget.selected) {
        edges[existingElkEdgeToTarget.id].hidden = true;
        existingElkEdgeToTarget.id = edge.id;
        existingElkEdgeToTarget.data = edge.data;
        existingElkEdgeToTarget.selected = true;
      } else {
        edge.hidden = true;
      }

      if (existingElkEdgeToTarget.labels) {
        existingElkEdgeToTarget.labels[0].text = '(Multiple)';
      }

      existingElkEdgeToTarget.data.label.text = '(Multiple)';
      existingElkEdgeToTarget.data.events = existingElkEdgeToTarget.data.events.concat(edge.data.events);
    } else {
      sourceElkNode.edges.push({
        id: edge.id,
        sources: [sourceNode.id],
        targets: [targetNode.id],
        labels: [{ text: edge.data.label.text }],
        data: edge.data,
      });
    }
  }

  const measuredWidestEdgeLabel = Object.values(edges).reduce((maxWidth, edge) => {
    if (edge.hidden) {
      return maxWidth;
    }

    const width = edge.data?.label.width;
    if (!width) {
      return maxWidth;
    }

    return Math.max(width, maxWidth);
  }, -Infinity);

  const graph = { id: 'root', children: rootChildren };

  // Ensure enough spacing between node layers for edge labels to fit
  if (!elkLayoutArguments.layoutOptions) {
    throw new Error('Missing layoutOptions in elkLayoutArguments');
  }
  elkLayoutArguments.layoutOptions['spacing.nodeNodeBetweenLayers'] = String(measuredWidestEdgeLabel - 20);

  const { children: _children } = await elk.layout(graph, elkLayoutArguments);
  const children = _children as ElkFlowNode[];

  const elkNodesById: Record<string, ElkFlowNode> = {};
  const addChildrenToElkNodesById = (elkNode: ElkFlowNode) => {
    elkNodesById[elkNode.id] = elkNode;
    for (const child of elkNode.children ?? []) {
      addChildrenToElkNodesById(child);
    }
  };
  for (const child of children) {
    addChildrenToElkNodesById(child);
  }

  const visitElkNode = (elkNode: ElkFlowNode, parentId?: string) => {
    nodes[elkNode.id] = {
      ...nodes[elkNode.id],
      parentId,
      extent: parentId ? 'parent' : undefined,
      position: { x: elkNode.x ?? 0, y: elkNode.y ?? 0 },
      width: elkNode.width,
      height: elkNode.height,
    };

    const parent = parentId ? nodes[parentId] : undefined;
    nodes[elkNode.id].data.absolutePosition = {
      x: nodes[elkNode.id].position.x + (parent?.data.absolutePosition.x ?? 0),
      y: nodes[elkNode.id].position.y + (parent?.data.absolutePosition.y ?? 0),
    };

    elkNode.children?.forEach((child) => {
      visitElkNode(child, elkNode.id);
    });

    // Edge coordinates are relative to the top left corner of the closest
    // common ancestor of the source and target node. We have to do a lot of
    // annoying calculations to get absolute edge coordinates.
    for (const elkEdge of elkNode.edges ?? []) {
      const section = elkEdge.sections?.at(0);
      if (!section) {
        continue;
      }

      let commonParentNode;
      if (section.incomingShape && section.incomingShape === section.outgoingShape) {
        commonParentNode = elkNodesById[section.incomingShape];

        // For a loopback edge, skip the node's offset and start with its parent
        commonParentNode = commonParentNode.data.originalParentId
          ? elkNodesById[commonParentNode.data.originalParentId]
          : undefined;
      } else {
        // Find the common parent node ID by comparing the incoming and outgoing
        // shape IDs character by character.
        let commonParentNodeId;
        if (section.incomingShape && section.outgoingShape) {
          for (
            commonParentNodeId = '';
            section.incomingShape.length > commonParentNodeId.length &&
            section.incomingShape[commonParentNodeId.length] === section.outgoingShape[commonParentNodeId.length];
            commonParentNodeId += section.incomingShape[commonParentNodeId.length]
          );
        } else {
          commonParentNodeId = '';
        }

        const commonParentNodeIdParts = commonParentNodeId.split('::');
        if (commonParentNodeIdParts.length % 2 == 0) {
          // We matched through even pairs of ID parts (types and IDs)
          commonParentNodeIdParts.splice(commonParentNodeIdParts.length - 1);
        } else {
          // The last matched part is a type, but the IDs didn't match
          commonParentNodeIdParts.splice(commonParentNodeIdParts.length - 2);
        }

        commonParentNodeId = commonParentNodeIdParts.join('::');

        commonParentNode = commonParentNodeId ? elkNodesById[commonParentNodeId] : undefined;
      }

      const ancestryOffset = { x: 0, y: 0 };

      for (
        let node = commonParentNode;
        node;
        node = node.data.originalParentId ? elkNodesById[node.data.originalParentId] : undefined
      ) {
        ancestryOffset.x += node.x ?? 0;
        ancestryOffset.y += node.y ?? 0;
      }

      if (commonParentNode) {
        section.startPoint.x += ancestryOffset.x;
        section.startPoint.y += ancestryOffset.y;

        for (const bendPoint of section.bendPoints ?? []) {
          bendPoint.x += ancestryOffset.x;
          bendPoint.y += ancestryOffset.y;
        }

        section.endPoint.x += ancestryOffset.x;
        section.endPoint.y += ancestryOffset.y;
      }

      const edge = edges[elkEdge.id];
      edge.source = elkEdge.sources[0];
      edge.target = elkEdge.targets[0];

      if (!edge.data) {
        throw new Error(`Edge ${elkEdge.id} missing data`);
      }
      edge.data.label = {
        ...edge.data.label,
        x: (elkEdge.labels?.[0]?.x ?? 0) + ancestryOffset.x,
        y: (elkEdge.labels?.[0]?.y ?? 0) + ancestryOffset.y,
      };
      edge.data.section = elkEdge.sections?.[0];
    }
  };

  children.forEach((child) => {
    visitElkNode(child);
  });

  return { nodes, edges };
};

export default layoutGraph;
