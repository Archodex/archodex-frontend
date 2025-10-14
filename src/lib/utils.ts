import { ELKEdgeData } from '@/ELKEdge';
import { QueryData } from '@/hooks/useQueryData';
import { ResourceNodeData } from '@/ResourceNode';
import { Edge, Node } from '@xyflow/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import MenuSection from './menuSection';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function nodeIdFromResourceId(resourceId: ResourceId) {
  return '::' + resourceId.map((part) => `${part.type}::${part.id}`).join('::');
}

export function edgeIdFromResourceIds(source: ResourceId, target: ResourceId) {
  return `${nodeIdFromResourceId(source)}-${nodeIdFromResourceId(target)}`;
}

const addNodeAndParents = (id: ResourceId, nodes: Record<string, Node<ResourceNodeData>>) => {
  const nodeId = nodeIdFromResourceId(id);

  if (nodeId in nodes) {
    return nodes[nodeId];
  }

  const parentId = id.length > 1 ? id.slice(0, -1) : undefined;
  const parentNodeId = parentId ? nodeIdFromResourceId(parentId) : undefined;

  nodes[nodeId] = {
    type: 'resource',
    id: nodeId,
    parentId: parentNodeId,
    extent: parentId ? 'parent' : undefined,
    position: { x: 0, y: 0 },
    data: {
      id,
      originalParentId: parentNodeId,
      originalParentResourceId: parentId,
      parentResourceId: parentId,
      absolutePosition: { x: 0, y: 0 },
      environments: [],
      resourceIssueIds: [],
      numIssues: 0,
      numChildren: 0,
      collapsed: true,
    },
  };

  if (parentId) {
    addNodeAndParents(parentId, nodes);
  }

  return nodes[nodeId];
};

export const labelForResourceType = (type: string | undefined) => {
  if (!type) {
    return '';
  }

  switch (type) {
    case 'Secret Value':
      return 'Secret Value Hash';
    default:
      return type;
  }
};

export const labelForResource = (id: ResourceId | undefined, parentId: ResourceId | undefined = undefined) => {
  if (!id || id.length === 0) {
    return '';
  }

  // If the resource is a Kubernetes container, render the namespace and
  // deployment name. Otherwise, you might just see a bunch of resource labels
  // with generic container names like 'server'.
  if (
    id.length >= 4 &&
    id[0].type === 'Kubernetes Cluster' &&
    id[1].type === 'Namespace' &&
    id[3].type === 'Container'
  ) {
    // If this is shown inside a parent resource on the graph, omit the parent
    // parts of the label.
    switch (parentId?.length) {
      case 2:
        return `${id[2].id} › ${id[3].id}`;

      case 3:
        return id[3].id;

      default:
        return `${id[1].id} › ${id[2].id} › ${id[3].id}`;
    }
  }

  const primaryId = id.at(-1);
  if (!primaryId) {
    return '';
  }

  switch (primaryId.type) {
    case 'Secret Value':
      return primaryId.id.slice(0, 7);
    case 'Kubernetes Cluster':
      return primaryId.id.split('-')[0];
    default:
      return primaryId.id;
  }
};

export enum InitialCollapseNodesType {
  None = 'none',
  All = 'all',
  Environments = 'environments',
}

export function flowFromQueryResponse(
  data: QueryData,
  resourceEvents: ResourceEvent[],
  collapseNodes: InitialCollapseNodesType,
  section: MenuSection,
): { nodes: Node<ResourceNodeData>[]; edges: Edge<ELKEdgeData>[]; environments: string[] } {
  const nodes: Record<string, Node<ResourceNodeData>> = {};

  for (const resource of data.resources) {
    const node = addNodeAndParents(resource.id, nodes);

    node.data.environments = Object.entries(data.resourcesEnvironments[node.id] ?? {})
      .map(([env, value]) => {
        if (value) {
          return { name: env, colorIndex: data.environments.indexOf(env), inheritedFrom: value.inheritedFrom };
        }
      })
      .filter((env) => env !== undefined)
      .sort((a, b) => a.colorIndex - b.colorIndex);

    node.data.firstSeenAt = new Date(resource.first_seen_at);
    node.data.lastSeenAt = new Date(resource.last_seen_at);
  }

  for (const { principal, resource } of resourceEvents) {
    addNodeAndParents(principal, nodes);
    addNodeAndParents(resource, nodes);
  }

  for (const { id } of data.global_containers ?? []) {
    addNodeAndParents(id, nodes);
  }

  const expandParents = (node: Node<ResourceNodeData>) => {
    if (node.parentId) {
      const parentNode = nodes[node.parentId];
      parentNode.data.collapsed = false;
      expandParents(parentNode);
    }
  };

  switch (collapseNodes) {
    case InitialCollapseNodesType.None:
      for (const node of Object.values(nodes)) {
        node.data.collapsed = false;
      }
      break;
    case InitialCollapseNodesType.All:
      break;
    case InitialCollapseNodesType.Environments:
      // Only nodes with non-inherited environments are collapsed
      for (const node of Object.values(nodes)) {
        if (node.data.environments.some((env) => !env.inheritedFrom)) {
          expandParents(node);
        }
      }
      break;
  }

  for (const container of data.global_containers ?? []) {
    const containsNodeId = nodeIdFromResourceId(container.contains);
    const containsNode = nodes[containsNodeId];
    containsNode.parentId = nodeIdFromResourceId(container.id);
    containsNode.extent = 'parent';
  }

  for (const node of Object.values(nodes)) {
    if (node.parentId) {
      const parentNode = nodes[node.parentId];
      parentNode.data.numChildren += 1;
      if (parentNode.data.collapsed) {
        node.hidden = true;
      }
    }
  }

  // Initial node coalescing. Coalescing also occurs after interactions in the
  // Flow component.
  if (section !== MenuSection.Environments) {
    coalesceNodes(nodes);
  }

  const edges: Edge<ELKEdgeData>[] = [];
  const edgesById: Record<string, Edge<ELKEdgeData> | undefined> = {};

  for (const event of resourceEvents) {
    const source = nodeIdFromResourceId(event.principal);
    const target = nodeIdFromResourceId(event.resource);
    const id = `${source}-${target}`;

    const existingEdge = edgesById[id];
    if (existingEdge && existingEdge.data?.label.text) {
      existingEdge.data.label.text = '(Multiple)';
      existingEdge.data.events.push(event);
    } else {
      const edge: Edge<ELKEdgeData> = {
        type: 'elk',
        id,
        source,
        target,
        className: 'group',
        zIndex: 1,
        data: { originalSourceId: source, originalTargetId: target, label: { text: event.type }, events: [event] },
      };

      let sourceNode = nodes[source];
      while (sourceNode.hidden && sourceNode.parentId) {
        sourceNode = nodes[sourceNode.parentId];
      }

      let targetNode = nodes[target];
      while (targetNode.hidden && targetNode.parentId) {
        targetNode = nodes[targetNode.parentId];
      }

      if (sourceNode.id === targetNode.id && (sourceNode.id !== source || targetNode.id !== target)) {
        edge.hidden = true;
      }

      edges.push(edge);
      edgesById[id] = edge;
    }
  }

  const span = document.createElement('span');
  span.className = 'react-flow__edge-text';
  span.style.position = 'absolute';
  document.body.appendChild(span);

  const labelWidths: Record<string, number> = {};

  for (const edge of edges) {
    if (!edge.data) {
      throw new Error(`Edge data is undefined for edge ${edge.id} when calculating label width`);
    }

    const text = edge.data.label.text;
    if (!text) {
      continue;
    }

    if (!(text in labelWidths)) {
      span.innerText = text;
      labelWidths[text] = span.clientWidth;
    }

    edge.data.label.width = labelWidths[text];
  }

  document.body.removeChild(span);

  return {
    // We re-sort again in the Flow component, making this seem unnecessary, but
    // React Flow doesn't work right if it's not also sorted here.
    nodes: Object.values(nodes).sort((a, b) => a.id.localeCompare(b.id)),
    edges,
    environments: data.environments,
  };
}

// If a node has only one child, merge the two nodes together. This
// simplifies the visualization.
export function coalesceNodes(nodesById: Record<string, Node<ResourceNodeData>>) {
  for (const node of Object.values(nodesById)) {
    if (node.data.numChildren > 0) {
      continue;
    }

    let curNode = node;
    let parentId = node.parentId;
    let coalescedToRoot = true;
    while (parentId) {
      const parentNode = nodesById[parentId];
      if (parentNode.data.numChildren === 1) {
        parentNode.hidden = true;
        curNode.parentId = parentNode.parentId;
        curNode.data.parentResourceId = parentNode.data.parentResourceId;
      } else {
        coalescedToRoot = false;
        curNode = parentNode;
      }

      parentId = parentNode.parentId;
    }

    if (coalescedToRoot) {
      node.hidden = false;
    }
  }
}

export const envColorByIndex = (index: number) => `palette-${String((index % 4) * 4 + Math.floor(index / 4))}`;

export function accountsUrl({
  region,
  endpoint,
  accountId,
}: { region?: string; endpoint?: string; accountId?: string } = {}) {
  const path = accountId ? `/account/${accountId}` : '/accounts';

  if (endpoint) {
    return `${endpoint}${path}`;
  }

  region ??= 'us-west-2';

  if (location.hostname === 'localhost') {
    const archodexDomain = (import.meta.env.VITE_ARCHODEX_DOMAIN as string | undefined) ?? 'archodex.com';
    const globalEndpoint =
      (import.meta.env.VITE_ARCHODEX_ACCOUNTS_BACKEND_ENDPOINT as string | undefined) ??
      `https://api.us-west-2.${archodexDomain}`;
    const regionalEndpoint = globalEndpoint.replace('https://api.us-west-2.', `https://api.${region}.`);

    return regionalEndpoint + path;
  } else {
    const apiDomain = location.hostname.replace(/^app./, `api.${region}.`);
    return `https://${apiDomain}${path}`;
  }
}

export const isPlayground =
  location.hostname.startsWith('play.') || import.meta.env.VITE_ARCHODEX_PLAYGROUND === 'true';

export const locale = new Intl.NumberFormat().resolvedOptions().locale;

export const mergeRefs = <T>(...refs: (React.Ref<T> | undefined)[]): React.RefCallback<T> => {
  return (value: T) => {
    for (const ref of refs) {
      if (typeof ref === 'function') {
        ref(value);
      } else if (ref != null && typeof ref === 'object') {
        (ref as React.MutableRefObject<T | null>).current = value;
      }
    }
  };
};

export function isDeeplyEqual<T>(a: T, b: T): boolean {
  if (a === b) {
    return true;
  }

  if (a && b && typeof a === 'object' && typeof b === 'object') {
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) {
        return false;
      }

      for (let i = 0; i < a.length; i++) {
        if (!isDeeplyEqual(a[i], b[i])) {
          return false;
        }
      }

      return true;
    } else if (Array.isArray(a) !== Array.isArray(b)) {
      return false;
    }

    const dateA = a instanceof Date;
    const dateB = b instanceof Date;
    if (dateA !== dateB) {
      return false;
    }
    if (dateA && dateB) {
      return a.getTime() === b.getTime();
    }

    const regexpA = a instanceof RegExp;
    const regexpB = b instanceof RegExp;
    if (regexpA !== regexpB) {
      return false;
    }
    if (regexpA && regexpB) {
      return a.toString() === b.toString();
    }

    const keys = Object.keys(a) as (keyof T)[];
    const length = keys.length;

    if (length !== Object.keys(b).length) {
      return false;
    }

    for (let i = length; i-- !== 0; ) {
      if (!Object.prototype.hasOwnProperty.call(b, keys[i])) {
        return false;
      }
    }

    for (let i = length; i-- !== 0; ) {
      const key = keys[i];
      if (!isDeeplyEqual(a[key], b[key])) {
        return false;
      }
    }

    return true;
  }

  return a !== a && b !== b;
}

export const TZ_OFFSET = (() => {
  const offset = new Date().getTimezoneOffset();
  const sign = offset > 0 ? '-' : '+';
  const hours = Math.abs(offset / 60)
    .toString()
    .padStart(2, '0');
  const minutes = Math.abs(offset % 60)
    .toString()
    .padStart(2, '0');
  return `UTC${sign}${hours}:${minutes}`;
})();

export const awsIconUrl = (type: string, name: string) =>
  `https://cdn.jsdelivr.net/npm/aws-svg-icons@3.0.0-2021-07-30/lib/Resource-Icons_07302021/${type}/Res_48_Light/${name}_48_Light.svg`;

export const lucideIconUrl = (name: string) => `https://cdn.jsdelivr.net/npm/lucide-static@0.471.0/icons/${name}.svg`;

export const simpleIconUrl = (name: string) => `https://cdn.jsdelivr.net/npm/simple-icons@v14/icons/${name}.svg`;
