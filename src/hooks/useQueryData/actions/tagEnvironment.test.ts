import { beforeEach, describe, it, vi } from 'vitest';
import tagEnvironment from './tagEnvironment';
import { QueryData, LayoutState, QueryDataActions } from '..';
import type { TagEnvironmentAction } from './tagEnvironment';
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

vi.mock('../persistResourceEnvironments', () => ({ default: vi.fn() }));

beforeEach(() => {
  vi.mocked(persistResourceEnvironments).mockResolvedValue(undefined);
});

describe('tagEnvironment', () => {
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
      { id: ACCOUNT_RESOURCE_ID, environments: ['prod'], first_seen_at: '2024-01-01', last_seen_at: '2024-01-02' },
      { id: REGION_RESOURCE_ID, environments: [], first_seen_at: '2024-01-01', last_seen_at: '2024-01-02' },
    ],
    events: [],
    environments: ['prod', 'staging'],
    resourcesEnvironments: {
      [nodeIdFromResourceId(ACCOUNT_RESOURCE_ID)]: { prod: {} },
      [nodeIdFromResourceId(REGION_RESOURCE_ID)]: { dev: { inheritedFrom: ACCOUNT_RESOURCE_ID } },
    },
    resourceEvents: [],
    eventChainLinks: {},
    nodes: {
      [nodeIdFromResourceId(ACCOUNT_RESOURCE_ID)]: {
        id: nodeIdFromResourceId(ACCOUNT_RESOURCE_ID),
        position: { x: 0, y: 0 },
        data: { id: ACCOUNT_RESOURCE_ID, environments: [{ name: 'prod', colorIndex: 0 }] } as ResourceNodeData,
      } as Node<ResourceNodeData>,
      [nodeIdFromResourceId(REGION_RESOURCE_ID)]: {
        id: nodeIdFromResourceId(REGION_RESOURCE_ID),
        position: { x: 100, y: 100 },
        data: {
          id: REGION_RESOURCE_ID,
          environments: [{ name: 'prod', inheritedFrom: ACCOUNT_RESOURCE_ID, colorIndex: 0 }],
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

  it('should add environment to resource', ({ expect }) => {
    const state = createMockState();
    const callback = vi.fn();
    const action: TagEnvironmentAction = {
      action: QueryDataActions.TagEnvironment,
      accountContext: mockAccountContext,
      resourceId: ACCOUNT_RESOURCE_ID,
      environment: 'dev',
      callback,
    };

    const result = tagEnvironment(state, action);

    const resource = result.resources.find((r) => r.id.length === 1);
    expect(resource?.environments).toEqual(['prod', 'dev']);
  });

  it('should add environment to global environments list', ({ expect }) => {
    const state = createMockState();
    const callback = vi.fn();
    const action: TagEnvironmentAction = {
      action: QueryDataActions.TagEnvironment,
      accountContext: mockAccountContext,
      resourceId: ACCOUNT_RESOURCE_ID,
      environment: 'dev',
      callback,
    };

    const result = tagEnvironment(state, action);

    expect(result.environments).toContain('dev');
  });

  it('should not duplicate environment in global list', ({ expect }) => {
    const state = createMockState();
    const callback = vi.fn();
    const action: TagEnvironmentAction = {
      action: QueryDataActions.TagEnvironment,
      accountContext: mockAccountContext,
      resourceId: ACCOUNT_RESOURCE_ID,
      environment: 'prod', // Already exists
      callback,
    };

    const result = tagEnvironment(state, action);

    expect(result.environments.filter((env) => env === 'prod')).toHaveLength(1);
  });

  it('should update node with environment visual data', ({ expect }) => {
    const state = createMockState();
    const callback = vi.fn();
    const action: TagEnvironmentAction = {
      action: QueryDataActions.TagEnvironment,
      accountContext: mockAccountContext,
      resourceId: ACCOUNT_RESOURCE_ID,
      environment: 'dev',
      callback,
    };

    const result = tagEnvironment(state, action);

    const node = result.nodes[nodeIdFromResourceId(ACCOUNT_RESOURCE_ID)];
    expect(node.data.environments).toContainEqual({
      name: 'dev',
      colorIndex: 2, // Should be index 2 in ['prod', 'staging', 'dev']
    });
  });

  it('should propagate environment to descendant nodes', ({ expect }) => {
    const state = createMockState();
    const callback = vi.fn();
    const action: TagEnvironmentAction = {
      action: QueryDataActions.TagEnvironment,
      accountContext: mockAccountContext,
      resourceId: ACCOUNT_RESOURCE_ID,
      environment: 'dev',
      callback,
    };

    const result = tagEnvironment(state, action);

    const descendantNode = result.nodes[nodeIdFromResourceId(REGION_RESOURCE_ID)];
    expect(descendantNode.data.environments).toContainEqual({
      name: 'dev',
      inheritedFrom: ACCOUNT_RESOURCE_ID,
      colorIndex: 2,
    });
  });

  it('should not propagate to nodes that already have the environment', ({ expect }) => {
    const state = createMockState();
    // Add 'dev' environment to descendant node
    state.nodes[nodeIdFromResourceId(REGION_RESOURCE_ID)].data.environments.push({ name: 'dev', colorIndex: 2 });

    const callback = vi.fn();
    const action: TagEnvironmentAction = {
      action: QueryDataActions.TagEnvironment,
      accountContext: mockAccountContext,
      resourceId: ACCOUNT_RESOURCE_ID,
      environment: 'dev',
      callback,
    };

    const result = tagEnvironment(state, action);

    const descendantNode = result.nodes[nodeIdFromResourceId(REGION_RESOURCE_ID)];
    const devEnvs = descendantNode.data.environments.filter((env) => env.name === 'dev');
    expect(devEnvs).toHaveLength(1); // Should not duplicate
  });

  it('should throw error if resource not found', ({ expect }) => {
    const state = createMockState();
    const callback = vi.fn();
    const action: TagEnvironmentAction = {
      action: QueryDataActions.TagEnvironment,
      accountContext: mockAccountContext,
      resourceId: NON_EXISTENT_RESOURCE_ID,
      environment: 'dev',
      callback,
    };

    expect(() => tagEnvironment(state, action)).toThrow(
      'Resource with id [{"type":"aws","id":"non-existent"}] not found while attempting to tag environment.',
    );
  });

  it('should handle resource with no existing environments', ({ expect }) => {
    const state = createMockState();
    const callback = vi.fn();
    const action: TagEnvironmentAction = {
      action: QueryDataActions.TagEnvironment,
      accountContext: mockAccountContext,
      resourceId: REGION_RESOURCE_ID,
      environment: 'test',
      callback,
    };

    const result = tagEnvironment(state, action);

    const resource = result.resources.find((r) => r.id.length === 2);
    expect(resource?.environments).toEqual(['test']);
  });

  it('should update resourcesEnvironments cache', ({ expect }) => {
    const state = createMockState();
    const callback = vi.fn();
    const action: TagEnvironmentAction = {
      action: QueryDataActions.TagEnvironment,
      accountContext: mockAccountContext,
      resourceId: ACCOUNT_RESOURCE_ID,
      environment: 'dev',
      callback,
    };

    const result = tagEnvironment(state, action);

    expect(result.resourcesEnvironments[nodeIdFromResourceId(ACCOUNT_RESOURCE_ID)]).toBeDefined();
    expect(result.resourcesEnvironments[nodeIdFromResourceId(ACCOUNT_RESOURCE_ID)]?.dev).toEqual({});
    expect(result.resourcesEnvironments[nodeIdFromResourceId(REGION_RESOURCE_ID)]).toBeDefined();
    expect(result.resourcesEnvironments[nodeIdFromResourceId(REGION_RESOURCE_ID)]?.dev).toEqual({
      inheritedFrom: ACCOUNT_RESOURCE_ID,
    });
  });

  it('should call persistResourceEnvironments and invoke callback on success', async ({ expect }) => {
    const mockPersist = vi.mocked(persistResourceEnvironments);

    const state = createMockState();
    const callback = vi.fn();
    const action: TagEnvironmentAction = {
      action: QueryDataActions.TagEnvironment,
      accountContext: mockAccountContext,
      resourceId: ACCOUNT_RESOURCE_ID,
      environment: 'dev',
      callback,
    };

    let resolver;
    const completionPromise = new Promise((resolve) => (resolver = resolve));
    const result = tagEnvironment(state, action, resolver);

    const resource = result.resources.find((r) => r.id.length === 1);
    expect(resource).toBeDefined();
    expect(mockPersist).toHaveBeenCalledWith(mockAccountContext, resource!.id, resource!.environments);

    // Run the action waiting on the test promise to resolve signaling
    // completion of all async operations
    await completionPromise;

    expect(callback).toHaveBeenCalledWith();
  });

  it('should handle persistResourceEnvironments error', async ({ expect }) => {
    const mockPersist = vi.mocked(persistResourceEnvironments);
    const error = new Error('Network error');
    mockPersist.mockRejectedValue(error);

    const state = createMockState();
    const callback = vi.fn();
    const action: TagEnvironmentAction = {
      action: QueryDataActions.TagEnvironment,
      accountContext: mockAccountContext,
      resourceId: ACCOUNT_RESOURCE_ID,
      environment: 'dev',
      callback,
    };

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {
      // Mock implementation
    });

    // Run the action waiting on the test promise to resolve signaling
    // completion of all async operations
    await new Promise((resolve) => tagEnvironment(state, action, resolve));

    expect(callback).toHaveBeenCalledWith('Failed to update environments for resource: Network error');
    expect(consoleSpy).toHaveBeenCalledWith(error);
  });

  it('should handle unknown error from persistResourceEnvironments', async ({ expect }) => {
    vi.mocked(persistResourceEnvironments).mockRejectedValue('Unknown error');

    const state = createMockState();
    const callback = vi.fn();
    const action: TagEnvironmentAction = {
      action: QueryDataActions.TagEnvironment,
      accountContext: mockAccountContext,
      resourceId: ACCOUNT_RESOURCE_ID,
      environment: 'dev',
      callback,
    };

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {
      // Mock implementation
    });

    // Run the action waiting on the test promise to resolve signaling
    // completion of all async operations
    await new Promise((resolve) => tagEnvironment(state, action, resolve));

    expect(callback).toHaveBeenCalledWith('An unknown error occurred while updating environments for resource.');
    expect(consoleSpy).toHaveBeenCalledWith('Unknown error');

    consoleSpy.mockRestore();
  });

  it('should work without callback', ({ expect }) => {
    const state = createMockState();
    const action: TagEnvironmentAction = {
      action: QueryDataActions.TagEnvironment,
      accountContext: mockAccountContext,
      resourceId: ACCOUNT_RESOURCE_ID,
      environment: 'dev',
    };

    const result = tagEnvironment(state, action);

    expect(result.resources.find((r) => r.id.length === 1)?.environments).toContain('dev');
  });

  it('should calculate correct color index for environment', ({ expect }) => {
    const state = createMockState();
    const callback = vi.fn();
    const action: TagEnvironmentAction = {
      action: QueryDataActions.TagEnvironment,
      accountContext: mockAccountContext,
      resourceId: ACCOUNT_RESOURCE_ID,
      environment: 'dev',
      callback,
    };

    const result = tagEnvironment(state, action);

    const node = result.nodes[nodeIdFromResourceId(ACCOUNT_RESOURCE_ID)];
    const devEnv = node.data.environments.find((env) => env.name === 'dev');
    expect(devEnv?.colorIndex).toBe(2); // Index in ['prod', 'staging', 'dev']
  });

  it('should handle color index overflow (modulo 16)', ({ expect }) => {
    const state = createMockState();
    // Add many environments to trigger modulo
    state.environments = Array.from({ length: 20 }, (_, i) => `env-${i.toString()}`);

    const callback = vi.fn();
    const action: TagEnvironmentAction = {
      action: QueryDataActions.TagEnvironment,
      accountContext: mockAccountContext,
      resourceId: ACCOUNT_RESOURCE_ID,
      environment: 'overflow-env',
      callback,
    };

    const result = tagEnvironment(state, action);

    const node = result.nodes[nodeIdFromResourceId(ACCOUNT_RESOURCE_ID)];
    const newEnv = node.data.environments.find((env) => env.name === 'overflow-env');
    expect(newEnv?.colorIndex).toBe(20 % 16); // Should wrap around
  });

  it('should not mutate original state', ({ expect }) => {
    const state = createMockState();
    const originalResources = state.resources;
    const originalEnvironments = state.environments;
    const originalResourcesEnvironments = state.resourcesEnvironments;
    const originalNodes = state.nodes;

    const callback = vi.fn();
    const action: TagEnvironmentAction = {
      action: QueryDataActions.TagEnvironment,
      accountContext: mockAccountContext,
      resourceId: ACCOUNT_RESOURCE_ID,
      environment: 'dev',
      callback,
    };

    const result = tagEnvironment(state, action);

    expect(result).not.toBe(state);
    expect(result.nodes).not.toBe(originalNodes);
    expect(result.environments).not.toBe(originalEnvironments);
    expect(result.resourcesEnvironments).not.toBe(originalResourcesEnvironments);

    // Original state should be unchanged
    expect(originalResources.find((r) => r.id.length === 1)?.environments).toEqual(['prod']);
    expect(originalEnvironments).toEqual(['prod', 'staging']);
    expect(originalResourcesEnvironments[nodeIdFromResourceId(ACCOUNT_RESOURCE_ID)]).toEqual({ prod: {} });
    expect(originalNodes[nodeIdFromResourceId(ACCOUNT_RESOURCE_ID)].data.environments).toEqual([
      { name: 'prod', colorIndex: 0 },
    ]);
  });

  it('should handle complex node hierarchy', ({ expect }) => {
    const state = createMockState();
    // Add a grandchild resource and node (inherits prod, no direct environments)
    const grandchildResource = {
      id: EC2_RESOURCE_ID,
      environments: [],
      first_seen_at: '2024-01-01',
      last_seen_at: '2024-01-02',
    };
    state.resources.push(grandchildResource);

    const grandchildNodeId = nodeIdFromResourceId(EC2_RESOURCE_ID);
    state.nodes[grandchildNodeId] = {
      id: grandchildNodeId,
      position: { x: 200, y: 200 },
      data: {
        id: EC2_RESOURCE_ID,
        environments: [{ name: 'prod', colorIndex: 0, inheritedFrom: ACCOUNT_RESOURCE_ID }],
        numChildren: 0,
        collapsed: false,
        resourceIssueIds: [],
        absolutePosition: { x: 200, y: 200 },
      } as ResourceNodeData,
      parentId: nodeIdFromResourceId(REGION_RESOURCE_ID),
    } as Node<ResourceNodeData>;

    state.resourcesEnvironments[nodeIdFromResourceId(EC2_RESOURCE_ID)] = {
      prod: { inheritedFrom: ACCOUNT_RESOURCE_ID },
    };

    const callback = vi.fn();
    const action: TagEnvironmentAction = {
      action: QueryDataActions.TagEnvironment,
      accountContext: mockAccountContext,
      resourceId: ACCOUNT_RESOURCE_ID,
      environment: 'dev',
      callback,
    };

    const result = tagEnvironment(state, action);

    const grandchildNode = result.nodes[nodeIdFromResourceId(EC2_RESOURCE_ID)];

    expect(grandchildNode).toBeDefined();
    expect(grandchildNode.data.environments).toEqual([
      { name: 'prod', colorIndex: 0, inheritedFrom: ACCOUNT_RESOURCE_ID },
      { name: 'dev', colorIndex: 2, inheritedFrom: ACCOUNT_RESOURCE_ID },
    ]);
    expect(result.resourcesEnvironments[nodeIdFromResourceId(EC2_RESOURCE_ID)]).toEqual({
      prod: { inheritedFrom: ACCOUNT_RESOURCE_ID },
      dev: { inheritedFrom: ACCOUNT_RESOURCE_ID },
    });
  });
});
