import { Node, Edge } from '@xyflow/react';
import {
  edgeIdFromResourceIds,
  flowFromQueryResponse,
  InitialCollapseNodesType,
  nodeIdFromResourceId,
} from '@/lib/utils';
import { EventChainLinks, Links, QueryData, ResourceEnvironments } from '.';
import inheritedEnvironments from './inheritedEnvironments';
import updateIssues from './issues';
import { ResourceNodeData } from '@/ResourceNode';
import { ELKEdgeData } from '@/ELKEdge';
import MenuSection from '@/lib/menuSection';
import { isWithinDateRange } from '@/lib/dateFilter';

/**
 * Initializes QueryData by setting up environments, nodes, edges, and issues.
 * Processes resources to determine inherited environments and creates graph visualization data.
 *
 * @param initialData - Initial QueryData to be processed
 * @returns Fully initialized QueryData with computed graph properties
 */
const initializer = (initialData: QueryData): QueryData => {
  const environmentsSet = new Set<string>();
  const resourcesEnvironments: Record<string, ResourceEnvironments> = {};

  // Always generate a full set of environments before filtering by date. This
  // ensures each environment has a stable index for colors across date filters.
  for (const resource of initialData.originalData.resources ?? []) {
    inheritedEnvironments(resource.id, initialData.originalData.resources, resourcesEnvironments);

    for (const env of resource.environments ?? []) {
      environmentsSet.add(env);
    }
  }

  initialData.resources = structuredClone(
    (initialData.originalData.resources ?? []).filter((resource) =>
      isWithinDateRange(initialData.dateFilter, resource.first_seen_at, resource.last_seen_at),
    ),
  );
  initialData.events = structuredClone(
    (initialData.originalData.events ?? []).filter((event) =>
      isWithinDateRange(initialData.dateFilter, event.first_seen_at, event.last_seen_at),
    ),
  );

  const events = flattenResourceEvents(initialData.events);

  initialData.resourcesEnvironments = resourcesEnvironments;
  initialData.environments = Array.from(environmentsSet);
  initialData.resourceEvents = events.resourceEvents;
  initialData.eventChainLinks = events.eventChainLinks;

  const { nodes: nodesArray, edges } = flowFromQueryResponse(
    initialData,
    events.resourceEvents,
    initialCollapseNodesType(initialData.section),
    initialData.section,
  );

  if (initialData.section === MenuSection.Secrets) {
    for (const node of nodesArray) {
      if (node.data.id[0].type === 'Secret Value') {
        node.data.highlighted = true;
      }
    }
  }

  const nodes = nodesArray.reduce<Record<string, Node<ResourceNodeData>>>((acc, node) => {
    acc[node.id] = node;
    return acc;
  }, {});

  initialData.nodes = nodes;
  updateIssues(initialData);

  return {
    ...initialData,
    nodes,
    edges: edges.reduce<Record<string, Edge<ELKEdgeData>>>((acc, edge) => {
      acc[edge.id] = edge;
      return acc;
    }, {}),
    environments: Array.from(environmentsSet),
    resourcesEnvironments,
    fitViewAfterLayout: true,
  };
};

/**
 * Flattens resource events by expanding principal chains into individual events.
 * Creates event chain links to track relationships between events.
 *
 * @param events - Array of resource events to flatten
 * @returns Object containing flattened resource events and their chain links
 */
const flattenResourceEvents = (events: ResourceEvent[] = []) => {
  const resourceEvents: ResourceEvent[] = [];
  const eventChainLinks: Record<string, Links | undefined> = {};

  const seenEvents = new Set<string>();

  for (const event of events) {
    for (const principalChain of event.principal_chains) {
      let precedingEdgeId;

      for (let i = 0; i < principalChain.length; i++) {
        const sourcePrincipal = principalChain[i];

        let targetResourceId;
        let type;

        if (i < principalChain.length - 1) {
          const targetResource = principalChain[i + 1];
          targetResourceId = targetResource.id;
          type = targetResource.event ?? event.type;
        } else {
          targetResourceId = event.resource;
          type = event.type;
        }

        // TODO: Should the API be returning each event that has this edge anywhere in the principal chain?
        const eventKey = `${nodeIdFromResourceId(sourcePrincipal.id)}-${nodeIdFromResourceId(targetResourceId)}-${type}`;
        if (!seenEvents.has(eventKey)) {
          resourceEvents.push({ ...event, principal: sourcePrincipal.id, type, resource: targetResourceId });

          seenEvents.add(eventKey);
        }

        const edgeId = edgeIdFromResourceIds(sourcePrincipal.id, targetResourceId);
        eventChainLinks[edgeId] = eventChainLinks[edgeId] ?? { preceding: new Set(), following: new Set() };

        if (precedingEdgeId) {
          eventChainLinks[precedingEdgeId]?.following.add(edgeId);
          eventChainLinks[edgeId].preceding.add(precedingEdgeId);
        }

        precedingEdgeId = edgeId;
      }
    }
  }

  return { resourceEvents, eventChainLinks: eventChainLinks as EventChainLinks };
};

/**
 * Determines the initial collapse state for nodes based on the menu section.
 *
 * @param section - The current menu section being viewed
 * @returns The initial collapse nodes type:
 *   - Secrets: No nodes collapsed (None)
 *   - Environments: Environment nodes collapsed
 *   - Inventory: All nodes collapsed
 */
const initialCollapseNodesType: (section: MenuSection) => InitialCollapseNodesType = (section) => {
  switch (section) {
    case MenuSection.Secrets:
      return InitialCollapseNodesType.None;
    case MenuSection.Environments:
      return InitialCollapseNodesType.Environments;
    case MenuSection.Inventory:
      return InitialCollapseNodesType.All;
  }
};

export default initializer;
