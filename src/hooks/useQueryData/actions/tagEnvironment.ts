import { ResourceNodeData } from '@/ResourceNode';
import { QueryData, QueryDataActions } from '..';
import { Node } from '@xyflow/react';
import { AccountRoutesContext } from '@/AccountRoutes';
import { isDeeplyEqual, nodeIdFromResourceId } from '@/lib/utils';
import inheritedEnvironments from '../inheritedEnvironments';
import persistResourceEnvironments from '../persistResourceEnvironments';
import updateIssues from '../issues';

/**
 * Action to tag a resource with an environment, updating the resource's environments list,
 * persisting the change to the backend, and updating visual representations.
 * Propagates the environment tag to descendant nodes that inherit from this resource.
 *
 * @public
 */
export interface TagEnvironmentAction {
  /** The action type identifier */
  action: typeof QueryDataActions.TagEnvironment;
  /** The account context for backend API calls */
  accountContext: AccountRoutesContext;
  /** The ID of the resource to tag */
  resourceId: ResourceId;
  /** The environment name to tag */
  environment: string;
  /** Optional callback function called with error message or undefined on success */
  callback?(errorMessage?: string): void;
}

/**
 * Tags a resource with an environment, updating the resource's environments list,
 * persisting the change to the backend, and updating visual representations.
 *
 * @param state - Current QueryData state
 * @param action - Action containing the resource ID, environment name, account context, and callback
 * @returns Updated QueryData with the environment tagged on the resource and its descendants
 * @throws Error if the resource with the given ID is not found
 *
 * @remarks
 * This function:
 * - Adds the environment to the resource's environments list
 * - Updates the resourcesEnvironments cache for inheritance
 * - Persists the change to the backend asynchronously
 * - Propagates the environment tag to descendant nodes that inherit from this resource
 */
const tagEnvironment = (
  state: QueryData,
  action: TagEnvironmentAction,
  completionCallbackForTests?: (value?: unknown) => void,
): QueryData => {
  const resourceIndex = state.resources.findIndex((resource) => isDeeplyEqual(resource.id, action.resourceId));
  if (resourceIndex === -1) {
    throw new Error(
      `Resource with id ${JSON.stringify(action.resourceId)} not found while attempting to tag environment.`,
    );
  }

  const resources = [...state.resources];
  const resource = { ...resources[resourceIndex] };
  resources[resourceIndex] = resource;

  resource.environments = [...(resource.environments ?? []), action.environment];

  const nodeId = nodeIdFromResourceId(resource.id);

  const resourcesEnvironments = { ...state.resourcesEnvironments };
  resourcesEnvironments[nodeId] = resourcesEnvironments[nodeId] ? { ...resourcesEnvironments[nodeId] } : {};
  resourcesEnvironments[nodeId][action.environment] = {};

  // Clear resourcesEnvironments cache for all descendants first
  for (const otherResource of state.resources) {
    if (
      otherResource.id.length > resource.id.length &&
      isDeeplyEqual(otherResource.id.slice(0, resource.id.length), resource.id)
    ) {
      const otherNodeId = nodeIdFromResourceId(otherResource.id);
      resourcesEnvironments[otherNodeId] = undefined;
    }
  }

  // Then recalculate inheritance for all descendants
  for (const otherResource of state.resources) {
    if (isDeeplyEqual(otherResource.id.slice(0, resource.id.length), resource.id)) {
      inheritedEnvironments(otherResource.id, state.resources, resourcesEnvironments);
    }
  }

  let environments: string[] | undefined;
  if (!state.environments.includes(action.environment)) {
    environments = [...state.environments, action.environment];
  }

  persistResourceEnvironments(action.accountContext, resource.id, resource.environments)
    .then(() => {
      action.callback?.();

      completionCallbackForTests?.();
    })
    .catch((error: unknown) => {
      if (error instanceof Error) {
        action.callback?.(`Failed to update environments for resource: ${error.message}`);
        console.error(error);
      } else {
        action.callback?.(`An unknown error occurred while updating environments for resource.`);
        console.error(error);
      }

      completionCallbackForTests?.();
    });

  const nodes = { ...state.nodes };
  const node = nodes[nodeIdFromResourceId(action.resourceId)];

  const colorIndex = (environments ?? state.environments).indexOf(action.environment) % 16;

  nodes[node.id] = {
    ...node,
    data: { ...node.data, environments: [...node.data.environments, { name: action.environment, colorIndex }] },
  };

  const inheritsFrom = (node: Node<ResourceNodeData>) => {
    if (isDeeplyEqual(node.data.id, action.resourceId)) {
      return true;
    }

    // Only prevent inheritance if THIS node (not ancestors) already has the environment
    if (node.data.environments.some((env) => env.name === action.environment && !env.inheritedFrom)) {
      return false;
    }

    if (node.parentId) {
      const parentNode = nodes[node.parentId];
      return inheritsFrom(parentNode);
    }

    return false;
  };

  for (const otherNode of Object.values(nodes)) {
    if (otherNode.id !== node.id && inheritsFrom(otherNode)) {
      nodes[otherNode.id] = {
        ...otherNode,
        data: {
          ...otherNode.data,
          environments: [
            ...otherNode.data.environments,
            { name: action.environment, inheritedFrom: action.resourceId, colorIndex },
          ],
        },
      };
    }
  }

  const newState = {
    ...state,
    resources,
    environments: environments ?? state.environments,
    resourcesEnvironments,
    nodes,
  };

  updateIssues(newState);

  return newState;
};

export default tagEnvironment;
