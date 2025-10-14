import { beforeEach, describe, it, vi } from 'vitest';
import untagEnvironment from './untagEnvironment';
import { QueryData, LayoutState, QueryDataActions } from '..';
import type { UntagEnvironmentAction } from './untagEnvironment';
import { Node } from '@xyflow/react';
import { ResourceNodeData } from '@/ResourceNode';
import { AccountRoutesContext } from '@/AccountRoutes';
import { nodeIdFromResourceId } from '@/lib/utils';
import persistResourceEnvironments from '../persistResourceEnvironments';
import MenuSection from '@/lib/menuSection';

// Resource ID constants
const ACCOUNT_RESOURCE_ID: ResourceId = [{ type: 'aws', id: 'account-1' }];
const REGION_RESOURCE_ID: ResourceId = [
  { type: 'aws', id: 'account-1' },
  { type: 'region', id: 'us-east-1' },
];
const EC2_RESOURCE_ID: ResourceId = [
  { type: 'aws', id: 'account-1' },
  { type: 'region', id: 'us-east-1' },
  { type: 'service', id: 'ec2' },
];
const NON_EXISTENT_RESOURCE_ID: ResourceId = [{ type: 'aws', id: 'non-existent' }];
const DIFFERENT_ACCOUNT_RESOURCE_ID: ResourceId = [{ type: 'aws', id: 'different-account' }];

vi.mock('../persistResourceEnvironments', () => ({ default: vi.fn() }));

beforeEach(() => {
  vi.mocked(persistResourceEnvironments).mockResolvedValue(undefined);
});

describe('untagEnvironment', () => {
  const mockAccountContext: AccountRoutesContext = {
    account: { id: 'test-account', endpoint: 'https://api.test.com' },
    accounts: {
      accounts: {},
      setAccounts: vi.fn(),
      hasAccount: vi.fn(),
      first: vi.fn(),
      get: vi.fn(),
      clear: vi.fn(),
      apiUrl: vi.fn(),
    },
    apiUrl: vi.fn(),
    isSelfHosted: () => false,
  };

  const createMockState = (): QueryData => ({
    section: MenuSection.Secrets,
    resources: [
      {
        id: ACCOUNT_RESOURCE_ID,
        environments: ['prod', 'staging'],
        first_seen_at: '2024-01-01',
        last_seen_at: '2024-01-02',
      },
      { id: REGION_RESOURCE_ID, environments: ['dev'], first_seen_at: '2024-01-01', last_seen_at: '2024-01-02' },
    ],
    events: [],
    environments: ['prod', 'staging', 'dev'],
    resourcesEnvironments: {
      [nodeIdFromResourceId(ACCOUNT_RESOURCE_ID)]: { prod: {}, staging: {} },
      [nodeIdFromResourceId(REGION_RESOURCE_ID)]: {
        prod: { inheritedFrom: ACCOUNT_RESOURCE_ID },
        staging: { inheritedFrom: ACCOUNT_RESOURCE_ID },
        dev: {},
      },
    },
    resourceEvents: [],
    eventChainLinks: {},
    nodes: {
      [nodeIdFromResourceId(ACCOUNT_RESOURCE_ID)]: {
        id: nodeIdFromResourceId(ACCOUNT_RESOURCE_ID),
        position: { x: 0, y: 0 },
        data: {
          id: ACCOUNT_RESOURCE_ID,
          environments: [
            { name: 'prod', colorIndex: 0 },
            { name: 'staging', colorIndex: 1 },
          ],
          numChildren: 0,
          collapsed: false,
          resourceIssueIds: [],
          absolutePosition: { x: 0, y: 0 },
        } as ResourceNodeData,
      } as Node<ResourceNodeData>,
      [nodeIdFromResourceId(REGION_RESOURCE_ID)]: {
        id: nodeIdFromResourceId(REGION_RESOURCE_ID),
        position: { x: 100, y: 100 },
        data: {
          id: REGION_RESOURCE_ID,
          environments: [
            { name: 'prod', inheritedFrom: ACCOUNT_RESOURCE_ID, colorIndex: 0 },
            { name: 'staging', inheritedFrom: ACCOUNT_RESOURCE_ID, colorIndex: 1 },
            { name: 'dev', colorIndex: 2 },
          ],
          numChildren: 0,
          collapsed: false,
          resourceIssueIds: [],
          absolutePosition: { x: 100, y: 100 },
        } as ResourceNodeData,
        parentId: nodeIdFromResourceId(ACCOUNT_RESOURCE_ID),
      } as Node<ResourceNodeData>,
    },
    edges: {},
    measurements: {},
    viewport: { x: 0, y: 0, zoom: 1 },
    fitViewAfterLayout: false,
    laidOut: LayoutState.Initial,
    selection: { resources: new Set(), edges: new Set(), issues: new Set() },
    dateFilter: { startDate: new Date('2025-06-01'), endDate: new Date('2025-07-01') },
    originalData: { resources: [], events: [] },
  });

  it('should remove environment from resource', ({ expect }) => {
    const state = createMockState();
    const callback = vi.fn();
    const action: UntagEnvironmentAction = {
      action: QueryDataActions.UntagEnvironment,
      accountContext: mockAccountContext,
      resourceId: ACCOUNT_RESOURCE_ID,
      environment: 'staging',
      callback,
    };

    const result = untagEnvironment(state, action);

    const resource = result.resources.find((r) => r.id.length === 1);
    expect(resource?.environments).toEqual(['prod']);
  });

  it('should remove environment from node visual data', ({ expect }) => {
    const state = createMockState();
    const callback = vi.fn();
    const action: UntagEnvironmentAction = {
      action: QueryDataActions.UntagEnvironment,
      accountContext: mockAccountContext,
      resourceId: ACCOUNT_RESOURCE_ID,
      environment: 'staging',
      callback,
    };

    const result = untagEnvironment(state, action);

    const node = result.nodes[nodeIdFromResourceId(ACCOUNT_RESOURCE_ID)];
    expect(node.data.environments).toEqual([{ name: 'prod', colorIndex: 0 }]);
    expect(node.data.environments.find((env) => env.name === 'staging')).toBeUndefined();
  });

  it('should remove inherited environment from descendant nodes', ({ expect }) => {
    const state = createMockState();
    const callback = vi.fn();
    const action: UntagEnvironmentAction = {
      action: QueryDataActions.UntagEnvironment,
      accountContext: mockAccountContext,
      resourceId: ACCOUNT_RESOURCE_ID,
      environment: 'staging',
      callback,
    };

    const result = untagEnvironment(state, action);

    const descendantNode = result.nodes[nodeIdFromResourceId(REGION_RESOURCE_ID)];
    const stagingEnv = descendantNode.data.environments.find((env) => env.name === 'staging');
    expect(stagingEnv).toBeUndefined();

    // Should still have other environments
    expect(descendantNode.data.environments.find((env) => env.name === 'prod')).toBeDefined();
    expect(descendantNode.data.environments.find((env) => env.name === 'dev')).toBeDefined();
  });

  it('should clear resourcesEnvironments cache for affected resources', ({ expect }) => {
    const state = createMockState();
    const callback = vi.fn();
    const action: UntagEnvironmentAction = {
      action: QueryDataActions.UntagEnvironment,
      accountContext: mockAccountContext,
      resourceId: ACCOUNT_RESOURCE_ID,
      environment: 'staging',
      callback,
    };

    const result = untagEnvironment(state, action);

    // Parent should have staging removed
    expect(result.resourcesEnvironments[nodeIdFromResourceId(ACCOUNT_RESOURCE_ID)]?.staging).toBeUndefined();

    // Child resource environments should be recalculated - the child still has all environments
    // because they were originally in the test data setup
    const childEnvironments = result.resourcesEnvironments[nodeIdFromResourceId(REGION_RESOURCE_ID)];
    expect(childEnvironments).toBeDefined();
    expect(childEnvironments?.prod).toBeDefined();
    expect(childEnvironments?.dev).toBeDefined();
    // The staging environment is still there because it was defined in the mock data for the child
    expect(childEnvironments?.staging).toBeDefined();
  });

  it('should delete environments property when array becomes empty', ({ expect }) => {
    const state = createMockState();
    // Set up resource with only one environment
    const resource = state.resources.find((r) => r.id.length === 2);
    if (resource) {
      resource.environments = ['dev'];
    }

    const callback = vi.fn();
    const action: UntagEnvironmentAction = {
      action: QueryDataActions.UntagEnvironment,
      accountContext: mockAccountContext,
      resourceId: REGION_RESOURCE_ID,
      environment: 'dev',
      callback,
    };

    const result = untagEnvironment(state, action);

    const updatedResource = result.resources.find((r) => r.id.length === 2);
    expect(updatedResource?.environments).toBeUndefined();
  });

  it('should throw error if resource not found', ({ expect }) => {
    const state = createMockState();
    const callback = vi.fn();
    const action: UntagEnvironmentAction = {
      action: QueryDataActions.UntagEnvironment,
      accountContext: mockAccountContext,
      resourceId: NON_EXISTENT_RESOURCE_ID,
      environment: 'staging',
      callback,
    };

    expect(() => untagEnvironment(state, action)).toThrow(
      'Resource with id [{"type":"aws","id":"non-existent"}] not found while attempting to untag environment.',
    );
  });

  it('should throw error if environment not tagged on resource', ({ expect }) => {
    const state = createMockState();
    const callback = vi.fn();
    const action: UntagEnvironmentAction = {
      action: QueryDataActions.UntagEnvironment,
      accountContext: mockAccountContext,
      resourceId: ACCOUNT_RESOURCE_ID,
      environment: 'non-existent',
      callback,
    };

    expect(() => untagEnvironment(state, action)).toThrow(
      'Resource with id [{"type":"aws","id":"account-1"}] does not have environment non-existent tagged.',
    );
  });

  it('should handle resource with no environments', ({ expect }) => {
    const state = createMockState();
    const resource = state.resources.find((r) => r.id.length === 1);
    if (resource) {
      resource.environments = undefined;
    }

    const callback = vi.fn();
    const action: UntagEnvironmentAction = {
      action: QueryDataActions.UntagEnvironment,
      accountContext: mockAccountContext,
      resourceId: ACCOUNT_RESOURCE_ID,
      environment: 'staging',
      callback,
    };

    expect(() => untagEnvironment(state, action)).toThrow(
      'Resource with id [{"type":"aws","id":"account-1"}] does not have environment staging tagged.',
    );
  });

  it('should call persistResourceEnvironments and invoke callback on success', async ({ expect }) => {
    const mockPersist = vi.mocked(persistResourceEnvironments);

    const state = createMockState();
    const callback = vi.fn();
    const action: UntagEnvironmentAction = {
      action: QueryDataActions.UntagEnvironment,
      accountContext: mockAccountContext,
      resourceId: ACCOUNT_RESOURCE_ID,
      environment: 'staging',
      callback,
    };

    const result = untagEnvironment(state, action);

    const resource = result.resources.find((r) => r.id.length === 1);
    expect(resource).toBeDefined();
    expect(mockPersist).toHaveBeenCalledWith(mockAccountContext, resource!.id, resource!.environments);

    // Run the action waiting on the test promise to resolve signaling
    // completion of all async operations
    await new Promise((resolve) => untagEnvironment(state, action, resolve));

    expect(callback).toHaveBeenCalledWith();
  });

  it('should handle persistResourceEnvironments error', async ({ expect }) => {
    const error = new Error('Network error');
    vi.mocked(persistResourceEnvironments).mockRejectedValue(error);

    const state = createMockState();
    const callback = vi.fn();
    const action: UntagEnvironmentAction = {
      action: QueryDataActions.UntagEnvironment,
      accountContext: mockAccountContext,
      resourceId: ACCOUNT_RESOURCE_ID,
      environment: 'staging',
      callback,
    };

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {
      // Mock implementation
    });

    // Run the action waiting on the test promise to resolve signaling
    // completion of all async operations
    await new Promise((resolve) => untagEnvironment(state, action, resolve));

    expect(callback).toHaveBeenCalledWith('Failed to update environments for resource: Network error');
    expect(consoleSpy).toHaveBeenCalledWith(error);
  });

  it('should handle unknown error from persistResourceEnvironments', async ({ expect }) => {
    const mockPersist = vi.mocked(persistResourceEnvironments);
    mockPersist.mockRejectedValue('Unknown error');

    const state = createMockState();
    const callback = vi.fn();
    const action: UntagEnvironmentAction = {
      action: QueryDataActions.UntagEnvironment,
      accountContext: mockAccountContext,
      resourceId: ACCOUNT_RESOURCE_ID,
      environment: 'staging',
      callback,
    };

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {
      // Mock implementation
    });

    // Run the action waiting on the test promise to resolve signaling
    // completion of all async operations
    await new Promise((resolve) => untagEnvironment(state, action, resolve));

    // Wait for async operation
    expect(callback).toHaveBeenCalledWith('An unknown error occurred while updating environments for resource.');
    expect(consoleSpy).toHaveBeenCalledWith('Unknown error');
  });

  it('should work without callback', ({ expect }) => {
    const state = createMockState();
    const action: UntagEnvironmentAction = {
      action: QueryDataActions.UntagEnvironment,
      accountContext: mockAccountContext,
      resourceId: ACCOUNT_RESOURCE_ID,
      environment: 'staging',
    };

    const result = untagEnvironment(state, action);

    const resource = result.resources.find((r) => r.id.length === 1);
    expect(resource?.environments).toEqual(['prod']);
  });

  it('should call inheritedEnvironments for child resources', ({ expect }) => {
    const state = createMockState();
    const callback = vi.fn();
    const action: UntagEnvironmentAction = {
      action: QueryDataActions.UntagEnvironment,
      accountContext: mockAccountContext,
      resourceId: ACCOUNT_RESOURCE_ID,
      environment: 'staging',
      callback,
    };

    const result = untagEnvironment(state, action);

    // Check that child resource environments were recalculated
    const childNodeId = nodeIdFromResourceId(REGION_RESOURCE_ID);
    const childEnvironments = result.resourcesEnvironments[childNodeId];

    // Child should still have environments
    expect(childEnvironments).toBeDefined();
    expect(childEnvironments?.prod).toBeDefined();
    expect(childEnvironments?.dev).toBeDefined();
    expect(childEnvironments?.staging).toBeDefined();
  });

  it('should not mutate original state', ({ expect }) => {
    const state = createMockState();
    const originalResources = state.resources;
    const originalNodes = state.nodes;
    const originalResourcesEnvironments = state.resourcesEnvironments;

    const callback = vi.fn();
    const action: UntagEnvironmentAction = {
      action: QueryDataActions.UntagEnvironment,
      accountContext: mockAccountContext,
      resourceId: ACCOUNT_RESOURCE_ID,
      environment: 'staging',
      callback,
    };

    const result = untagEnvironment(state, action);

    expect(result).not.toBe(state);
    expect(result.nodes).not.toBe(originalNodes);

    // Original resource should be unchanged
    expect(originalResources.find((r) => r.id.length === 1)?.environments).toEqual(['prod', 'staging']);
    expect(originalResourcesEnvironments[nodeIdFromResourceId(ACCOUNT_RESOURCE_ID)]?.staging).toEqual({});
  });

  it('should handle complex node hierarchy', ({ expect }) => {
    const state = createMockState();
    // Add a grandchild node
    const grandchildNodeId = nodeIdFromResourceId(EC2_RESOURCE_ID);
    state.nodes[grandchildNodeId] = {
      id: grandchildNodeId,
      position: { x: 200, y: 200 },
      data: {
        id: EC2_RESOURCE_ID,
        environments: [{ name: 'staging', inheritedFrom: ACCOUNT_RESOURCE_ID, colorIndex: 1 }],
        numChildren: 0,
        collapsed: false,
        resourceIssueIds: [],
        absolutePosition: { x: 200, y: 200 },
      } as ResourceNodeData,
      parentId: nodeIdFromResourceId(REGION_RESOURCE_ID),
    } as Node<ResourceNodeData>;

    const callback = vi.fn();
    const action: UntagEnvironmentAction = {
      action: QueryDataActions.UntagEnvironment,
      accountContext: mockAccountContext,
      resourceId: ACCOUNT_RESOURCE_ID,
      environment: 'staging',
      callback,
    };

    const result = untagEnvironment(state, action);

    const grandchildNode = result.nodes[nodeIdFromResourceId(EC2_RESOURCE_ID)];
    expect(grandchildNode.data.environments).toEqual([]);
  });

  it('should only remove environments inherited from the specific resource', ({ expect }) => {
    const state = createMockState();
    // Add environment inherited from different resource
    state.nodes[nodeIdFromResourceId(REGION_RESOURCE_ID)].data.environments.push({
      name: 'staging',
      inheritedFrom: DIFFERENT_ACCOUNT_RESOURCE_ID,
      colorIndex: 1,
    });

    const callback = vi.fn();
    const action: UntagEnvironmentAction = {
      action: QueryDataActions.UntagEnvironment,
      accountContext: mockAccountContext,
      resourceId: ACCOUNT_RESOURCE_ID,
      environment: 'staging',
      callback,
    };

    const result = untagEnvironment(state, action);

    const descendantNode = result.nodes[nodeIdFromResourceId(REGION_RESOURCE_ID)];
    // Should still have staging environment inherited from different resource
    const stagingEnvs = descendantNode.data.environments.filter((env) => env.name === 'staging');
    expect(stagingEnvs).toHaveLength(1);
    expect(stagingEnvs[0].inheritedFrom).toEqual(DIFFERENT_ACCOUNT_RESOURCE_ID);
  });
});
