import { describe, it } from 'vitest';
import initializer from './initializer';
import { QueryData, LayoutState } from '.';
import { nodeIdFromResourceId } from '@/lib/utils';
import MenuSection from '@/lib/menuSection';

// Resource ID constants
const ACCOUNT_RESOURCE_ID: ResourceId = [{ type: 'aws', id: 'account-1' }];
const REGION_RESOURCE_ID: ResourceId = [
  { type: 'aws', id: 'account-1' },
  { type: 'region', id: 'us-east-1' },
];
const SECRET_RESOURCE_ID: ResourceId = [{ type: 'Secret Value', id: 'secret-1' }];
const PRINCIPAL_RESOURCE_ID: ResourceId = [{ type: 'principal', id: 'principal-1' }];
const TARGET_RESOURCE_ID: ResourceId = [{ type: 'target', id: 'target-1' }];

describe('initializer', () => {
  const ACCOUNT_NODE_ID = nodeIdFromResourceId(ACCOUNT_RESOURCE_ID);
  const REGION_NODE_ID = nodeIdFromResourceId(REGION_RESOURCE_ID);
  const SECRET_NODE_ID = nodeIdFromResourceId(SECRET_RESOURCE_ID);

  const createMockInitialData = (section: MenuSection = MenuSection.Secrets): QueryData => ({
    section,
    resources: [],
    events: [],
    environments: [],
    resourcesEnvironments: {},
    resourceEvents: [],
    eventChainLinks: {},
    nodes: {},
    edges: {},
    measurements: {},
    viewport: { x: 0, y: 0, zoom: 1 },
    fitViewAfterLayout: false,
    laidOut: LayoutState.Initial,
    selection: { resources: new Set(), edges: new Set(), issues: new Set() },
    dateFilter: { startDate: new Date('2025-06-01'), endDate: new Date('2025-07-01') },
    originalData: { resources: [], events: [] },
  });

  describe('main functionality', () => {
    it('should initialize QueryData with empty data', ({ expect }) => {
      const initialData = createMockInitialData();
      const result = initializer(initialData);

      expect(result).toEqual({
        ...initialData,
        nodes: {},
        edges: {},
        environments: [],
        resourcesEnvironments: {},
        resourceEvents: [],
        eventChainLinks: {},
        fitViewAfterLayout: true,
        issues: new Map(),
      });
    });

    it('should process resources and build environments set', ({ expect }) => {
      const initialData = createMockInitialData();
      initialData.originalData.resources = [
        {
          id: ACCOUNT_RESOURCE_ID,
          environments: ['prod', 'staging'],
          first_seen_at: '2025-06-15T00:00:00Z',
          last_seen_at: '2025-06-20T00:00:00Z',
        },
        {
          id: REGION_RESOURCE_ID,
          environments: ['dev'],
          first_seen_at: '2025-06-10T00:00:00Z',
          last_seen_at: '2025-06-25T00:00:00Z',
        },
      ];

      const result = initializer(initialData);

      expect(result.environments).toEqual(['prod', 'staging', 'dev']);
      expect(result.resourcesEnvironments).toBeDefined();
      expect(result.resourcesEnvironments[ACCOUNT_NODE_ID]).toBeDefined();
      expect(result.resourcesEnvironments[REGION_NODE_ID]).toBeDefined();
    });

    it('should filter resources by date range', ({ expect }) => {
      const initialData = createMockInitialData();
      initialData.originalData.resources = [
        {
          id: ACCOUNT_RESOURCE_ID,
          environments: ['prod'],
          first_seen_at: '2025-06-15T00:00:00Z',
          last_seen_at: '2025-06-20T00:00:00Z',
        },
        {
          id: REGION_RESOURCE_ID,
          environments: ['dev'],
          first_seen_at: '2025-05-15T00:00:00Z', // Before date filter
          last_seen_at: '2025-05-20T00:00:00Z',
        },
      ];

      const result = initializer(initialData);

      expect(result.resources).toHaveLength(1);
      expect(result.resources[0]?.id).toEqual(ACCOUNT_RESOURCE_ID);
    });

    it('should filter events by date range', ({ expect }) => {
      const initialData = createMockInitialData();
      initialData.originalData.events = [
        {
          principal: PRINCIPAL_RESOURCE_ID,
          type: 'test-event',
          resource: TARGET_RESOURCE_ID,
          principal_chains: [],
          first_seen_at: '2025-06-16T00:00:00Z',
          last_seen_at: '2025-06-18T00:00:00Z',
        },
        {
          principal: PRINCIPAL_RESOURCE_ID,
          type: 'old-event',
          resource: TARGET_RESOURCE_ID,
          principal_chains: [],
          first_seen_at: '2025-05-16T00:00:00Z', // Before date filter
          last_seen_at: '2025-05-18T00:00:00Z',
        },
      ];

      const result = initializer(initialData);

      expect(result.events).toHaveLength(1);
      expect(result.events[0].type).toBe('test-event');
    });

    it('should handle resources with no environments', ({ expect }) => {
      const initialData = createMockInitialData();
      initialData.originalData.resources = [
        {
          id: ACCOUNT_RESOURCE_ID,
          environments: undefined,
          first_seen_at: '2025-06-15T00:00:00Z',
          last_seen_at: '2025-06-20T00:00:00Z',
        },
      ];

      const result = initializer(initialData);

      expect(result.environments).toEqual([]);
      expect(result.resourcesEnvironments[ACCOUNT_NODE_ID]).toBeDefined();
    });

    it('should set fitViewAfterLayout to true', ({ expect }) => {
      const initialData = createMockInitialData();
      initialData.fitViewAfterLayout = false;

      const result = initializer(initialData);

      expect(result.fitViewAfterLayout).toBe(true);
    });

    it('should convert nodes array to record', ({ expect }) => {
      const initialData = createMockInitialData();
      initialData.originalData.resources = [
        {
          id: ACCOUNT_RESOURCE_ID,
          environments: ['prod'],
          first_seen_at: '2025-06-15T00:00:00Z',
          last_seen_at: '2025-06-20T00:00:00Z',
        },
      ];

      const result = initializer(initialData);

      expect(result.nodes).toBeDefined();
      expect(typeof result.nodes).toBe('object');
      expect(Array.isArray(result.nodes)).toBe(false);
    });

    it('should convert edges array to record', ({ expect }) => {
      const initialData = createMockInitialData();
      initialData.originalData.resources = [
        {
          id: ACCOUNT_RESOURCE_ID,
          environments: ['prod'],
          first_seen_at: '2025-06-15T00:00:00Z',
          last_seen_at: '2025-06-20T00:00:00Z',
        },
        {
          id: REGION_RESOURCE_ID,
          environments: ['dev'],
          first_seen_at: '2025-06-10T00:00:00Z',
          last_seen_at: '2025-06-25T00:00:00Z',
        },
      ];

      const result = initializer(initialData);

      expect(result.edges).toBeDefined();
      expect(typeof result.edges).toBe('object');
      expect(Array.isArray(result.edges)).toBe(false);
    });
  });

  describe('secrets section handling', () => {
    it('should generate issues for secrets section', ({ expect }) => {
      const initialData = createMockInitialData(MenuSection.Secrets);
      initialData.originalData.resources = [
        {
          id: SECRET_RESOURCE_ID,
          environments: ['prod'],
          first_seen_at: '2025-06-15T00:00:00Z',
          last_seen_at: '2025-06-20T00:00:00Z',
        },
      ];

      const result = initializer(initialData);

      expect(result.issues).toBeDefined();
      expect(result.issues instanceof Map).toBe(true);
    });

    it('should highlight secret value nodes in secrets section', ({ expect }) => {
      const initialData = createMockInitialData(MenuSection.Secrets);
      initialData.originalData.resources = [
        {
          id: SECRET_RESOURCE_ID,
          environments: ['prod'],
          first_seen_at: '2025-06-15T00:00:00Z',
          last_seen_at: '2025-06-20T00:00:00Z',
        },
        {
          id: ACCOUNT_RESOURCE_ID,
          environments: ['prod'],
          first_seen_at: '2025-06-15T00:00:00Z',
          last_seen_at: '2025-06-20T00:00:00Z',
        },
      ];

      const result = initializer(initialData);

      const secretNode = result.nodes[SECRET_NODE_ID];
      const accountNode = result.nodes[ACCOUNT_NODE_ID];

      expect(secretNode.data.highlighted).toBe(true);
      expect(accountNode.data.highlighted).toBe(undefined);
    });
  });

  describe('environments section handling', () => {
    it('should generate issues for environments section', ({ expect }) => {
      const initialData = createMockInitialData(MenuSection.Environments);
      initialData.originalData.resources = [
        {
          id: ACCOUNT_RESOURCE_ID,
          environments: ['prod'],
          first_seen_at: '2025-06-15T00:00:00Z',
          last_seen_at: '2025-06-20T00:00:00Z',
        },
      ];

      const result = initializer(initialData);

      expect(result.issues).toBeDefined();
      expect(result.issues instanceof Map).toBe(true);
    });

    it('should not highlight secret value nodes in environments section', ({ expect }) => {
      const initialData = createMockInitialData(MenuSection.Environments);
      initialData.originalData.resources = [
        {
          id: SECRET_RESOURCE_ID,
          environments: ['prod'],
          first_seen_at: '2025-06-15T00:00:00Z',
          last_seen_at: '2025-06-20T00:00:00Z',
        },
      ];

      const result = initializer(initialData);

      const secretNode = result.nodes[SECRET_NODE_ID];
      expect(secretNode.data.highlighted).toBe(undefined);
    });
  });

  describe('inventory section handling', () => {
    it('should not generate issues for inventory section', ({ expect }) => {
      const initialData = createMockInitialData(MenuSection.Inventory);
      initialData.originalData.resources = [
        {
          id: ACCOUNT_RESOURCE_ID,
          environments: ['prod'],
          first_seen_at: '2025-06-15T00:00:00Z',
          last_seen_at: '2025-06-20T00:00:00Z',
        },
      ];

      const result = initializer(initialData);

      expect(result.issues).toBeUndefined();
    });
  });

  describe('flattenResourceEvents', () => {
    it('should flatten resource events from principal chains', ({ expect }) => {
      const initialData = createMockInitialData();
      // Add all resources referenced in events to avoid lookup errors
      initialData.originalData.resources = [
        {
          id: ACCOUNT_RESOURCE_ID,
          environments: ['prod'],
          first_seen_at: '2025-06-15T00:00:00Z',
          last_seen_at: '2025-06-20T00:00:00Z',
        },
        {
          id: REGION_RESOURCE_ID,
          environments: ['prod'],
          first_seen_at: '2025-06-15T00:00:00Z',
          last_seen_at: '2025-06-20T00:00:00Z',
        },
        {
          id: PRINCIPAL_RESOURCE_ID,
          environments: ['prod'],
          first_seen_at: '2025-06-15T00:00:00Z',
          last_seen_at: '2025-06-20T00:00:00Z',
        },
        {
          id: TARGET_RESOURCE_ID,
          environments: ['prod'],
          first_seen_at: '2025-06-15T00:00:00Z',
          last_seen_at: '2025-06-20T00:00:00Z',
        },
      ];
      initialData.originalData.events = [
        {
          principal: ACCOUNT_RESOURCE_ID,
          type: 'original-event',
          resource: TARGET_RESOURCE_ID,
          principal_chains: [
            [
              { id: PRINCIPAL_RESOURCE_ID, event: 'chain-event-1' },
              { id: REGION_RESOURCE_ID, event: 'chain-event-2' },
            ],
          ],
          first_seen_at: '2025-06-16T00:00:00Z',
          last_seen_at: '2025-06-18T00:00:00Z',
        },
      ];

      const result = initializer(initialData);

      expect(result.resourceEvents).toHaveLength(2);
      expect(result.resourceEvents[0]?.principal).toEqual(PRINCIPAL_RESOURCE_ID);
      expect(result.resourceEvents[0]?.type).toBe('chain-event-2');
      expect(result.resourceEvents[0]?.resource).toEqual(REGION_RESOURCE_ID);
      expect(result.resourceEvents[1]?.principal).toEqual(REGION_RESOURCE_ID);
      expect(result.resourceEvents[1]?.type).toBe('original-event');
      expect(result.resourceEvents[1]?.resource).toEqual(TARGET_RESOURCE_ID);
    });

    it('should create event chain links', ({ expect }) => {
      const initialData = createMockInitialData();
      // Add all resources referenced in events to avoid lookup errors
      initialData.originalData.resources = [
        {
          id: ACCOUNT_RESOURCE_ID,
          environments: ['prod'],
          first_seen_at: '2025-06-15T00:00:00Z',
          last_seen_at: '2025-06-20T00:00:00Z',
        },
        {
          id: REGION_RESOURCE_ID,
          environments: ['prod'],
          first_seen_at: '2025-06-15T00:00:00Z',
          last_seen_at: '2025-06-20T00:00:00Z',
        },
        {
          id: PRINCIPAL_RESOURCE_ID,
          environments: ['prod'],
          first_seen_at: '2025-06-15T00:00:00Z',
          last_seen_at: '2025-06-20T00:00:00Z',
        },
        {
          id: TARGET_RESOURCE_ID,
          environments: ['prod'],
          first_seen_at: '2025-06-15T00:00:00Z',
          last_seen_at: '2025-06-20T00:00:00Z',
        },
      ];
      initialData.originalData.events = [
        {
          principal: ACCOUNT_RESOURCE_ID,
          type: 'original-event',
          resource: TARGET_RESOURCE_ID,
          principal_chains: [[{ id: PRINCIPAL_RESOURCE_ID }, { id: REGION_RESOURCE_ID }]],
          first_seen_at: '2025-06-16T00:00:00Z',
          last_seen_at: '2025-06-18T00:00:00Z',
        },
      ];

      const result = initializer(initialData);

      expect(result.eventChainLinks).toBeDefined();
      expect(typeof result.eventChainLinks).toBe('object');

      // Check that chain links are created
      const chainLinks = Object.values(result.eventChainLinks);
      expect(chainLinks.length).toBeGreaterThan(0);
    });

    it('should handle events with no principal chains', ({ expect }) => {
      const initialData = createMockInitialData();
      initialData.originalData.events = [
        {
          principal: PRINCIPAL_RESOURCE_ID,
          type: 'simple-event',
          resource: TARGET_RESOURCE_ID,
          principal_chains: [],
          first_seen_at: '2025-06-16T00:00:00Z',
          last_seen_at: '2025-06-18T00:00:00Z',
        },
      ];

      const result = initializer(initialData);

      expect(result.resourceEvents).toEqual([]);
      expect(result.eventChainLinks).toEqual({});
    });

    it('should handle empty principal chains', ({ expect }) => {
      const initialData = createMockInitialData();
      initialData.originalData.events = [
        {
          principal: PRINCIPAL_RESOURCE_ID,
          type: 'event-type',
          resource: TARGET_RESOURCE_ID,
          principal_chains: [[]],
          first_seen_at: '2025-06-16T00:00:00Z',
          last_seen_at: '2025-06-18T00:00:00Z',
        },
      ];

      const result = initializer(initialData);

      expect(result.resourceEvents).toEqual([]);
      expect(result.eventChainLinks).toEqual({});
    });
  });

  describe('error handling', () => {
    it('should handle missing originalData.resources', ({ expect }) => {
      const initialData = createMockInitialData();
      initialData.originalData.resources = undefined;

      const result = initializer(initialData);

      expect(result.resources).toEqual([]);
      expect(result.environments).toEqual([]);
    });

    it('should handle missing originalData.events', ({ expect }) => {
      const initialData = createMockInitialData();
      initialData.originalData.events = undefined;

      const result = initializer(initialData);

      expect(result.events).toEqual([]);
      expect(result.resourceEvents).toEqual([]);
      expect(result.eventChainLinks).toEqual({});
    });

    it('should handle resources with empty environments array', ({ expect }) => {
      const initialData = createMockInitialData();
      initialData.originalData.resources = [
        {
          id: ACCOUNT_RESOURCE_ID,
          environments: [],
          first_seen_at: '2025-06-15T00:00:00Z',
          last_seen_at: '2025-06-20T00:00:00Z',
        },
      ];

      const result = initializer(initialData);

      expect(result.environments).toEqual([]);
      expect(result.resourcesEnvironments[ACCOUNT_NODE_ID]).toBeDefined();
    });
  });
});
