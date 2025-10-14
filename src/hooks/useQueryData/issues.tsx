import { ReactNode } from 'react';

import { edgeIdFromResourceIds, isDeeplyEqual, labelForResource, nodeIdFromResourceId } from '@/lib/utils';
import ResourceLink from '@/components/ResourceLink';
import { QueryData } from '.';
import ResourceIcons from '@/components/ResourceIcons';
import MenuSection from '@/lib/menuSection';

/**
 * Represents an issue caused by the values of Resources and Events.
 */
export interface Issue {
  /**
   * Unique identifier for the issue.
   *
   * @remarks
   * This ID uniquely identifies the issue. This means two issues differing only
   * in the set of resourceIds will have different Issue IDs.
   */
  id: string;
  /** The message content describing the issue */
  message: ReactNode;
  /** Array of resource identifiers that are referenced by this issue */
  resourceIds: string[];
  /** Array of edge identifiers that are referenced by this issue */
  edgeIds: string[];
}

const SECRET_HELD_EVENT_TYPE = 'Held';
const SECRET_HARDCODED_EVENT_TYPE = 'Hardcoded';

/**
 * Calculates and returns a map of issues based on the provided query data and section type.
 *
 * @param state - The query data containing section type, events, and existing issues
 *
 * @remarks
 * - For Secrets section: Calculates issues from both secrets and environment validation
 * - For Environments section: Calculates only environment-related issues
 * - For other sections: Does not calculate issues
 * - Updates `state` and `state.nodes` in place
 */
const updateIssues = (state: QueryData) => {
  let newIssues: Map<string, Issue> | undefined;

  switch (state.section) {
    case MenuSection.Secrets: {
      const secretIssues = secretsIssues(state.resourceEvents);
      const envIssues = environmentIssues(state);

      // Merge the two maps
      newIssues = new Map([...secretIssues, ...envIssues]);
      break;
    }

    case MenuSection.Environments:
      newIssues = environmentIssues(state);
      break;
  }

  if (
    state.issues === newIssues ||
    (state.issues &&
      state.issues.size === newIssues?.size &&
      [...state.issues.keys()].every((issueId) => newIssues.has(issueId)))
  ) {
    return;
  }

  state.issues = newIssues;

  // Clear out existing resourceIssueIds.
  for (const node of Object.values(state.nodes)) {
    state.nodes[node.id] = { ...node, data: { ...node.data, resourceIssueIds: [] } };
  }

  for (const issue of newIssues?.values() ?? []) {
    for (const resourceId of issue.resourceIds) {
      state.nodes[resourceId].data.resourceIssueIds.push(issue.id);
    }
  }
};

const secretsIssues = (events: ResourceEvent[]) => {
  const issues: Issue[] = [];

  const secretsHeldBy = new Map<string, ResourceEvent[]>();

  for (const event of events) {
    if (event.type !== SECRET_HELD_EVENT_TYPE && event.type !== SECRET_HARDCODED_EVENT_TYPE) {
      continue;
    }

    const resourceId = event.resource;
    if (resourceId[0].type !== 'Secret Value') {
      continue;
    }

    const nodeId = nodeIdFromResourceId(resourceId);

    if (!secretsHeldBy.has(nodeId)) {
      secretsHeldBy.set(nodeId, [event]);
    } else {
      secretsHeldBy.get(nodeId)?.push(event);
    }
  }

  for (const [resourceId, events] of secretsHeldBy.entries()) {
    if (events.length >= 2) {
      issues.push({
        id: `multiple-helds-${resourceId}`,
        message: (
          <div className="flex whitespace-pre items-center">
            Secret Value&ensp;
            <ResourceIcons id={events[0].resource} /> <b>{labelForResource(events[0].resource)}</b>&ensp;is held in
            multiple locations
          </div>
        ),
        resourceIds: [resourceId].concat(events.map((event) => nodeIdFromResourceId(event.principal))),
        edgeIds: events.map((event) => edgeIdFromResourceIds(event.principal, event.resource)),
      });
    }

    for (const event of events) {
      if (event.type === SECRET_HARDCODED_EVENT_TYPE && event.principal.at(-1)?.type === 'Blob') {
        const edgeId = edgeIdFromResourceIds(event.principal, event.resource);

        const linkText = `GitHub Repo ${event.principal[1].id}/${event.principal[2].id} /${event.principal[3]?.id}`;

        issues.push({
          id: `hardcoded-secret-value-${edgeId}`,
          message: (
            <div className="flex whitespace-pre items-center">
              Secret Value&ensp;
              <ResourceIcons id={event.resource} /> <b>{labelForResource(event.resource)}</b>&ensp;is hardcoded in&ensp;
              <ResourceIcons id={event.principal} />{' '}
              <ResourceLink id={event.principal} text={linkText} className="font-semibold" />
            </div>
          ),
          resourceIds: [resourceId, nodeIdFromResourceId(event.principal)],
          edgeIds: [edgeId],
        });
      }
    }
  }

  return issues.reduce<Map<string, Issue>>((map, issue) => {
    map.set(issue.id, issue);
    return map;
  }, new Map());
};

const environmentIssues = (data: QueryData) => {
  const issues = new Map<string, Issue>();

  for (const event of data.resourceEvents) {
    const resource = data.resources.find((resource) => isDeeplyEqual(resource.id, event.resource));
    if (!resource) {
      throw new Error(
        `Resource with id ${nodeIdFromResourceId(event.resource)} not found while checking for environment issues`,
      );
    }

    const resourceEnvironments = Object.keys(data.resourcesEnvironments[nodeIdFromResourceId(resource.id)] ?? {});
    if (resourceEnvironments.length === 0) {
      continue;
    }

    const principal = data.resources.find((r) => isDeeplyEqual(r.id, event.principal));
    if (!principal) {
      throw new Error(
        `Principal resource with id ${nodeIdFromResourceId(event.principal)} not found while checking for environment issues`,
      );
    }

    const principalEnvironments = Object.keys(data.resourcesEnvironments[nodeIdFromResourceId(principal.id)] ?? {});
    if (principalEnvironments.length === 0) {
      continue;
    }

    if (principalEnvironments.some((env) => resourceEnvironments.includes(env))) {
      continue;
    }

    const issueId = `across-environments-${nodeIdFromResourceId(event.principal)}-${nodeIdFromResourceId(event.resource)}`;

    issues.set(issueId, {
      id: issueId,
      message: (
        <div className="flex whitespace-pre items-center">
          Principal&ensp;
          <ResourceIcons id={event.principal} /> <b>{labelForResource(event.principal)}</b>&ensp;performed action{' '}
          <b>{event.type}</b> on resource&ensp;
          <ResourceIcons id={event.resource} /> <b>{labelForResource(event.resource)}</b>&ensp;across environments
        </div>
      ),
      resourceIds: [nodeIdFromResourceId(event.resource), nodeIdFromResourceId(event.principal)],
      edgeIds: [edgeIdFromResourceIds(event.principal, event.resource)],
    });
  }

  return issues;
};

export default updateIssues;
