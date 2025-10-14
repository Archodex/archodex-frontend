import { isDeeplyEqual, nodeIdFromResourceId } from '@/lib/utils';
import { ResourceEnvironments } from '.';

/**
 * Recursively calculates inherited environments for a resource by traversing up the resource hierarchy.
 *
 * @param resourceId - The unique identifier for the resource to get inherited environments for
 * @param data - Query loader data containing all resources information
 * @param resourcesEnvironments - Cache object storing environment data for resources by node ID
 *
 * @returns An object mapping environment names to their inheritance information, where each
 *          environment includes metadata about which resource it was inherited from
 *
 * @throws {Error} Throws an error if the specified resource cannot be found in the data
 */
const inheritedEnvironments = (
  resourceId: ResourceId,
  resources: Resource[] = [],
  resourcesEnvironments: Record<string, ResourceEnvironments | undefined>,
): ResourceEnvironments => {
  const nodeId = nodeIdFromResourceId(resourceId);

  const resource = resources.find((r) => isDeeplyEqual(r.id, resourceId));
  if (!resource) {
    throw new Error(`Resource with id ${nodeId} not found while attempting to get inherited environments.`);
  }

  const resourceEnvironments = resourcesEnvironments[nodeId];

  if (resourceEnvironments) {
    const inheritedEnvironments: ResourceEnvironments = {};
    for (const [env, value] of Object.entries(resourceEnvironments)) {
      inheritedEnvironments[env] = { inheritedFrom: value?.inheritedFrom ?? resourceId };
    }
    return inheritedEnvironments;
  }

  const newResourceEnvironments =
    resource.id.length === 1 ? {} : inheritedEnvironments(resource.id.slice(0, -1), resources, resourcesEnvironments);
  for (const env of resource.environments ?? []) {
    newResourceEnvironments[env] = {};
  }

  resourcesEnvironments[nodeId] = newResourceEnvironments;

  const inheritedEnvs: ResourceEnvironments = {};
  for (const [env, value] of Object.entries(resourcesEnvironments[nodeId])) {
    inheritedEnvs[env] = { inheritedFrom: value?.inheritedFrom ?? resourceId };
  }

  return inheritedEnvs;
};

export default inheritedEnvironments;
