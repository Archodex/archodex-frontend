import { QueryData, QueryDataActions } from '..';
import { AccountRoutesContext } from '@/AccountRoutes';
import { isDeeplyEqual, nodeIdFromResourceId } from '@/lib/utils';
import inheritedEnvironments from '../inheritedEnvironments';
import persistResourceEnvironments from '../persistResourceEnvironments';
import updateIssues from '../issues';

/**
 * Action to remove an environment tag from a resource, updating the resource's environments list,
 * persisting the change to the backend, and updating visual representations.
 * Removes inherited environment tags from descendant nodes.
 *
 * @public
 */
export interface UntagEnvironmentAction {
  /** The action type identifier */
  action: typeof QueryDataActions.UntagEnvironment;
  /** The account context for backend API calls */
  accountContext: AccountRoutesContext;
  /** The ID of the resource to untag */
  resourceId: ResourceId;
  /** The environment name to remove */
  environment: string;
  /** Optional callback function called with error message or undefined on success */
  callback?(errorMessage?: string): void;
}

/**
 * Removes an environment tag from a resource, updating the resource's environments list,
 * persisting the change to the backend, and updating visual representations.
 *
 * @param state - Current QueryData state
 * @param action - Action containing the resource ID, environment name, account context, and callback
 * @returns Updated QueryData with the environment untagged from the resource and its descendants
 * @throws Error if the resource is not found or doesn't have the specified environment
 *
 * @remarks
 * This function:
 * - Removes the environment from the resource's environments list
 * - Removes inherited environment tags from descendant nodes
 * - Persists the change to the backend asynchronously
 */
const untagEnvironment = (
  state: QueryData,
  action: UntagEnvironmentAction,
  completionCallbackForTests?: (value?: unknown) => void,
): QueryData => {
  const resourceIndex = state.resources.findIndex((resource) => isDeeplyEqual(resource.id, action.resourceId));
  if (resourceIndex === -1) {
    throw new Error(
      `Resource with id ${JSON.stringify(action.resourceId)} not found while attempting to untag environment.`,
    );
  }

  const resources = [...state.resources];
  const resource = { ...resources[resourceIndex] };
  resources[resourceIndex] = resource;

  if (!resource.environments?.includes(action.environment)) {
    throw new Error(
      `Resource with id ${JSON.stringify(action.resourceId)} does not have environment ${action.environment} tagged.`,
    );
  }

  resource.environments = resource.environments.filter((env) => env !== action.environment);
  if (resource.environments.length === 0) {
    delete resource.environments;
  }

  const nodeId = nodeIdFromResourceId(resource.id);

  const resourcesEnvironments = { ...state.resourcesEnvironments };
  resourcesEnvironments[nodeId] = resourcesEnvironments[nodeId] ? { ...resourcesEnvironments[nodeId] } : {};
  resourcesEnvironments[nodeId][action.environment] = undefined;

  // Clear environment info for child resources
  for (const otherResource of state.resources) {
    if (resource.id !== otherResource.id && isDeeplyEqual(otherResource.id.slice(0, resource.id.length), resource.id)) {
      resourcesEnvironments[nodeIdFromResourceId(otherResource.id)] = undefined;
    }
  }

  // Recalculate inherited environments for child resources
  for (const otherResource of state.resources) {
    if (resource.id !== otherResource.id && isDeeplyEqual(otherResource.id.slice(0, resource.id.length), resource.id)) {
      inheritedEnvironments(otherResource.id, state.resources, resourcesEnvironments);
    }
  }

  const nodes = { ...state.nodes };
  const node = nodes[nodeIdFromResourceId(action.resourceId)];
  nodes[node.id] = {
    ...node,
    data: { ...node.data, environments: node.data.environments.filter((env) => env.name !== action.environment) },
  };

  for (const node of Object.values(nodes)) {
    const envIndex = node.data.environments.findIndex(
      (env) => env.name === action.environment && isDeeplyEqual(env.inheritedFrom, action.resourceId),
    );

    if (envIndex !== -1) {
      nodes[node.id] = {
        ...node,
        data: { ...node.data, environments: node.data.environments.filter((_, index) => index !== envIndex) },
      };
    }
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

  const newState = { ...state, resources, nodes, resourcesEnvironments };

  updateIssues(newState);

  return newState;
};

export default untagEnvironment;
