import { describe, it } from 'vitest';
import inheritedEnvironments from './inheritedEnvironments';
import { ResourceEnvironments } from '.';
import { nodeIdFromResourceId } from '@/lib/utils';

describe('inheritedEnvironments', () => {
  const createMockData = (): Resource[] => [
    {
      id: [{ type: 'aws', id: 'account-1' }],
      environments: ['prod', 'staging'],
      first_seen_at: '2024-01-01',
      last_seen_at: '2024-01-02',
    },
    {
      id: [
        { type: 'aws', id: 'account-1' },
        { type: 'region', id: 'us-east-1' },
      ],
      environments: ['dev'],
      first_seen_at: '2024-01-01',
      last_seen_at: '2024-01-02',
    },
    {
      id: [
        { type: 'aws', id: 'account-1' },
        { type: 'region', id: 'us-east-1' },
        { type: 'service', id: 'ec2' },
      ],
      environments: ['test'],
      first_seen_at: '2024-01-01',
      last_seen_at: '2024-01-02',
    },
  ];

  it('should return environments for root resource', ({ expect }) => {
    const resources = createMockData();
    const resourcesEnvironments: Record<string, ResourceEnvironments | undefined> = {};
    const resourceId = [{ type: 'aws', id: 'account-1' }];
    const nodeId = nodeIdFromResourceId(resourceId);

    const result = inheritedEnvironments(resourceId, resources, resourcesEnvironments);

    expect(result).toEqual({ prod: { inheritedFrom: resourceId }, staging: { inheritedFrom: resourceId } });
    expect(resourcesEnvironments[nodeId]).toEqual({ prod: {}, staging: {} });
  });

  it('should inherit environments from parent resource', ({ expect }) => {
    const resources = createMockData();
    const resourcesEnvironments: Record<string, ResourceEnvironments | undefined> = {};
    const resourceId = [
      { type: 'aws', id: 'account-1' },
      { type: 'region', id: 'us-east-1' },
    ];

    const result = inheritedEnvironments(resourceId, resources, resourcesEnvironments);

    expect(result).toEqual({
      prod: { inheritedFrom: [{ type: 'aws', id: 'account-1' }] },
      staging: { inheritedFrom: [{ type: 'aws', id: 'account-1' }] },
      dev: { inheritedFrom: resourceId },
    });
  });

  it('should inherit environments from grandparent and parent', ({ expect }) => {
    const resources = createMockData();
    const resourcesEnvironments: Record<string, ResourceEnvironments | undefined> = {};
    const resourceId = [
      { type: 'aws', id: 'account-1' },
      { type: 'region', id: 'us-east-1' },
      { type: 'service', id: 'ec2' },
    ];

    const result = inheritedEnvironments(resourceId, resources, resourcesEnvironments);

    expect(result).toEqual({
      prod: { inheritedFrom: [{ type: 'aws', id: 'account-1' }] },
      staging: { inheritedFrom: [{ type: 'aws', id: 'account-1' }] },
      dev: {
        inheritedFrom: [
          { type: 'aws', id: 'account-1' },
          { type: 'region', id: 'us-east-1' },
        ],
      },
      test: { inheritedFrom: resourceId },
    });
  });

  it('should use cached environments if available', ({ expect }) => {
    const resources = createMockData();
    const cachedEnvs = { prod: { inheritedFrom: [{ type: 'custom', id: 'source' }] }, qa: {} };
    const resourceId = [{ type: 'aws', id: 'account-1' }];
    const nodeId = nodeIdFromResourceId(resourceId);
    const resourcesEnvironments: Record<string, ResourceEnvironments | undefined> = { [nodeId]: cachedEnvs };

    const result = inheritedEnvironments(resourceId, resources, resourcesEnvironments);

    expect(result).toEqual({
      prod: { inheritedFrom: [{ type: 'custom', id: 'source' }] },
      qa: { inheritedFrom: resourceId },
    });
    // Cache should not be modified
    expect(resourcesEnvironments[nodeId]).toBe(cachedEnvs);
  });

  it('should throw error if resource not found', ({ expect }) => {
    const resources = createMockData();
    const resourcesEnvironments: Record<string, ResourceEnvironments | undefined> = {};
    const resourceId = [{ type: 'aws', id: 'non-existent' }];
    const nodeId = nodeIdFromResourceId(resourceId);

    expect(() => inheritedEnvironments(resourceId, resources, resourcesEnvironments)).toThrow(
      `Resource with id ${nodeId} not found while attempting to get inherited environments.`,
    );
  });

  it('should handle resources with no environments', ({ expect }) => {
    const resources = createMockData();
    resources.push({
      id: [{ type: 'aws', id: 'account-2' }],
      environments: [],
      first_seen_at: '2024-01-01',
      last_seen_at: '2024-01-02',
    });
    const resourcesEnvironments: Record<string, ResourceEnvironments | undefined> = {};
    const resourceId = [{ type: 'aws', id: 'account-2' }];
    const nodeId = nodeIdFromResourceId(resourceId);

    const result = inheritedEnvironments(resourceId, resources, resourcesEnvironments);

    expect(result).toEqual({});
    expect(resourcesEnvironments[nodeId]).toEqual({});
  });

  it('should handle resources with undefined environments', ({ expect }) => {
    const resources = createMockData();
    resources.push({
      id: [{ type: 'aws', id: 'account-3' }],
      environments: undefined,
      first_seen_at: '2024-01-01',
      last_seen_at: '2024-01-02',
    });
    const resourcesEnvironments: Record<string, ResourceEnvironments | undefined> = {};
    const resourceId = [{ type: 'aws', id: 'account-3' }];
    const nodeId = nodeIdFromResourceId(resourceId);

    const result = inheritedEnvironments(resourceId, resources, resourcesEnvironments);

    expect(result).toEqual({});
    expect(resourcesEnvironments[nodeId]).toEqual({});
  });

  it('should populate cache for all ancestors', ({ expect }) => {
    const resources = createMockData();
    const resourcesEnvironments: Record<string, ResourceEnvironments | undefined> = {};
    const resourceId = [
      { type: 'aws', id: 'account-1' },
      { type: 'region', id: 'us-east-1' },
      { type: 'service', id: 'ec2' },
    ];

    const rootId = [{ type: 'aws', id: 'account-1' }];
    const parentId = [
      { type: 'aws', id: 'account-1' },
      { type: 'region', id: 'us-east-1' },
    ];

    const rootNodeId = nodeIdFromResourceId(rootId);
    const parentNodeId = nodeIdFromResourceId(parentId);
    const resourceNodeId = nodeIdFromResourceId(resourceId);

    inheritedEnvironments(resourceId, resources, resourcesEnvironments);

    // Should cache all ancestors
    expect(resourcesEnvironments[rootNodeId]).toEqual({ prod: {}, staging: {} });
    expect(resourcesEnvironments[parentNodeId]).toEqual({
      prod: { inheritedFrom: rootId },
      staging: { inheritedFrom: rootId },
      dev: {},
    });
    expect(resourcesEnvironments[resourceNodeId]).toEqual({
      prod: { inheritedFrom: rootId },
      staging: { inheritedFrom: rootId },
      dev: { inheritedFrom: parentId },
      test: {},
    });
  });

  it('should handle deeply nested resources', ({ expect }) => {
    const resources = createMockData();
    resources.push({
      id: [
        { type: 'aws', id: 'account-1' },
        { type: 'region', id: 'us-east-1' },
        { type: 'service', id: 'ec2' },
        { type: 'instance', id: 'i-12345' },
      ],
      environments: ['sandbox'],
      first_seen_at: '2024-01-01',
      last_seen_at: '2024-01-02',
    });
    const resourcesEnvironments: Record<string, ResourceEnvironments | undefined> = {};
    const resourceId = [
      { type: 'aws', id: 'account-1' },
      { type: 'region', id: 'us-east-1' },
      { type: 'service', id: 'ec2' },
      { type: 'instance', id: 'i-12345' },
    ];

    const result = inheritedEnvironments(resourceId, resources, resourcesEnvironments);

    expect(result).toEqual({
      prod: { inheritedFrom: [{ type: 'aws', id: 'account-1' }] },
      staging: { inheritedFrom: [{ type: 'aws', id: 'account-1' }] },
      dev: {
        inheritedFrom: [
          { type: 'aws', id: 'account-1' },
          { type: 'region', id: 'us-east-1' },
        ],
      },
      test: {
        inheritedFrom: [
          { type: 'aws', id: 'account-1' },
          { type: 'region', id: 'us-east-1' },
          { type: 'service', id: 'ec2' },
        ],
      },
      sandbox: { inheritedFrom: resourceId },
    });
  });

  it('should preserve undefined inheritedFrom in cache', ({ expect }) => {
    const resources = createMockData();
    const resourceId = [{ type: 'aws', id: 'account-1' }];
    const nodeId = nodeIdFromResourceId(resourceId);
    const resourcesEnvironments: Record<string, ResourceEnvironments | undefined> = {
      [nodeId]: { prod: { inheritedFrom: undefined }, staging: {} },
    };

    const result = inheritedEnvironments(resourceId, resources, resourcesEnvironments);

    expect(result).toEqual({
      prod: { inheritedFrom: resourceId }, // undefined becomes resourceId
      staging: { inheritedFrom: resourceId },
    });
  });

  it('should handle complex resource IDs', ({ expect }) => {
    const resources: Resource[] = [
      {
        id: [{ type: 'cloud', id: 'multi-cloud' }],
        environments: ['shared'],
        first_seen_at: '2024-01-01',
        last_seen_at: '2024-01-02',
      },
      {
        id: [
          { type: 'cloud', id: 'multi-cloud' },
          { type: 'provider', id: 'aws-azure' },
        ],
        environments: ['hybrid'],
        first_seen_at: '2024-01-01',
        last_seen_at: '2024-01-02',
      },
    ];
    const resourcesEnvironments: Record<string, ResourceEnvironments | undefined> = {};
    const resourceId = [
      { type: 'cloud', id: 'multi-cloud' },
      { type: 'provider', id: 'aws-azure' },
    ];

    const result = inheritedEnvironments(resourceId, resources, resourcesEnvironments);

    expect(result).toEqual({
      shared: { inheritedFrom: [{ type: 'cloud', id: 'multi-cloud' }] },
      hybrid: { inheritedFrom: resourceId },
    });
  });
});
