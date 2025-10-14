import { describe, it } from 'vitest';
import reinitialize from './reinitialize';
import { QueryData, LayoutState, QueryDataActions } from '..';
import type { ReinitializeAction } from './reinitialize';
import { Node, Edge } from '@xyflow/react';
import { ResourceNodeData } from '@/ResourceNode';
import { ELKEdgeData } from '@/ELKEdge';
import { nodeIdFromResourceId, edgeIdFromResourceIds } from '@/lib/utils';
import MenuSection from '@/lib/menuSection';

// Resource ID constants
const RESOURCE_1_ID: ResourceId = [{ type: 'test', id: '1' }];
const RESOURCE_2_ID: ResourceId = [{ type: 'test', id: '2' }];
const NEW_RESOURCE_ID: ResourceId = [{ type: 'new', id: 'resource' }];
const AWS_ACCOUNT_REGION_ID: ResourceId = [
  { type: 'aws', id: 'account' },
  { type: 'region', id: 'us-east-1' },
];
const ANOTHER_RESOURCE_ID: ResourceId = [{ type: 'test', id: 'another' }];

// Generated ID constants
const NODE_1_ID = nodeIdFromResourceId(RESOURCE_1_ID);
const NODE_2_ID = nodeIdFromResourceId(RESOURCE_2_ID);
const NEW_NODE_ID = nodeIdFromResourceId(NEW_RESOURCE_ID);
const COMPLEX_NODE_ID = nodeIdFromResourceId(AWS_ACCOUNT_REGION_ID);
const ANOTHER_NODE_ID = nodeIdFromResourceId(ANOTHER_RESOURCE_ID);
const EDGE_1_ID = edgeIdFromResourceIds(RESOURCE_1_ID, RESOURCE_2_ID);
const COMPLEX_EDGE_ID = edgeIdFromResourceIds(AWS_ACCOUNT_REGION_ID, ANOTHER_RESOURCE_ID);
const EVENT_1_ID = 'event-1';
const EVENT_2_ID = 'event-2';
const EVENT_3_ID = 'event-3';
const EVENT_0_ID = 'event-0';
const ISSUE_1_ID = 'issue-1';
const COMPLEX_ISSUE_ID = 'complex-issue';
const TEST_ISSUE_ID = 'test-issue';
const TEST_RESOURCE_ID = 'test-resource';
const TEST_EDGE_ID = 'test-edge';

describe('reinitialize', () => {
  const createMockState = (): QueryData => ({
    section: MenuSection.Secrets,
    resources: [{ id: RESOURCE_1_ID, environments: ['prod'], first_seen_at: '2024-01-01', last_seen_at: '2024-01-02' }],
    events: [],
    environments: ['prod', 'staging'],
    resourcesEnvironments: { 'test:1': { prod: {} } },
    resourceEvents: [],
    eventChainLinks: { [EVENT_1_ID]: { preceding: new Set([EVENT_0_ID]), following: new Set([EVENT_2_ID]) } },
    nodes: {
      [NODE_1_ID]: {
        id: NODE_1_ID,
        position: { x: 100, y: 100 },
        data: { id: RESOURCE_1_ID } as ResourceNodeData,
        selected: true,
      } as Node<ResourceNodeData>,
    },
    edges: {
      [EDGE_1_ID]: {
        id: EDGE_1_ID,
        source: NODE_1_ID,
        target: NODE_2_ID,
        selected: false,
        data: {} as ELKEdgeData,
      } as Edge<ELKEdgeData>,
    },
    measurements: { [NODE_1_ID]: { width: 200, height: 100 } },
    viewport: { x: 50, y: 75, zoom: 1.2 },
    fitViewAfterLayout: true,
    laidOut: LayoutState.LaidOut,
    selection: { resources: new Set([NODE_1_ID]), edges: new Set([EDGE_1_ID]), issues: new Set([ISSUE_1_ID]) },
    issues: new Map([
      [ISSUE_1_ID, { id: ISSUE_1_ID, message: 'Test issue', resourceIds: [NODE_1_ID], edgeIds: [EDGE_1_ID] }],
    ]),
    dateFilter: { startDate: new Date('2025-06-01'), endDate: new Date('2025-07-01') },
    originalData: { resources: [], events: [] },
  });

  it('should return the new state from the action', ({ expect }) => {
    const oldState = createMockState();
    const newState = createMockState();

    // Modify the new state to be different
    newState.section = MenuSection.Environments;
    newState.resources = [];
    newState.viewport = { x: 0, y: 0, zoom: 1 };
    newState.laidOut = LayoutState.Initial;
    newState.selection = { resources: new Set(), edges: new Set(), issues: new Set() };

    const action: ReinitializeAction = { action: QueryDataActions.Reinitialize, state: newState };

    const result = reinitialize(action);

    expect(result).toEqual(newState);
    expect(result).not.toBe(oldState);
    expect(result.section).toBe(MenuSection.Environments);
    expect(result.resources).toEqual([]);
    expect(result.viewport).toEqual({ x: 0, y: 0, zoom: 1 });
    expect(result.laidOut).toBe(LayoutState.Initial);
    expect(result.selection.resources.size).toBe(0);
  });

  it('should completely replace all state properties', ({ expect }) => {
    const oldState = createMockState();
    const newState: QueryData = {
      section: MenuSection.Environments,
      resources: [
        { id: NEW_RESOURCE_ID, environments: ['dev'], first_seen_at: '2024-02-01', last_seen_at: '2024-02-02' },
      ],
      events: [],
      environments: ['dev'],
      resourcesEnvironments: { 'new:resource': { dev: {} } },
      resourceEvents: [],
      eventChainLinks: {},
      nodes: {
        [NEW_NODE_ID]: {
          id: NEW_NODE_ID,
          position: { x: 0, y: 0 },
          data: { id: NEW_RESOURCE_ID } as ResourceNodeData,
          selected: false,
        } as Node<ResourceNodeData>,
      },
      edges: {},
      measurements: {},
      viewport: { x: 0, y: 0, zoom: 0.8 },
      fitViewAfterLayout: false,
      laidOut: LayoutState.Measured,
      selection: { resources: new Set([NEW_NODE_ID]), edges: new Set(), issues: new Set() },
      issues: new Map(),
      dateFilter: { startDate: new Date('2025-06-01'), endDate: new Date('2025-07-01') },
      originalData: { resources: [], events: [] },
    };

    const action: ReinitializeAction = { action: QueryDataActions.Reinitialize, state: newState };

    const result = reinitialize(action);

    // Should match new state exactly
    expect(result).toEqual(newState);
    expect(result).not.toEqual(oldState);

    // Verify all properties are replaced
    expect(result.section).toBe(MenuSection.Environments);
    expect(result.resources).toHaveLength(1);
    expect(result.resources[0].id).toEqual(NEW_RESOURCE_ID);
    expect(result.environments).toEqual(['dev']);
    expect(result.resourcesEnvironments).toEqual({ 'new:resource': { dev: {} } });
    expect(result.nodes).toEqual(newState.nodes);
    expect(result.edges).toEqual({});
    expect(result.measurements).toEqual({});
    expect(result.viewport).toEqual({ x: 0, y: 0, zoom: 0.8 });
    expect(result.fitViewAfterLayout).toBe(false);
    expect(result.laidOut).toBe(LayoutState.Measured);
    expect(result.selection.resources).toEqual(new Set([NEW_NODE_ID]));
    expect(result.issues).toEqual(new Map());
  });

  it('should handle empty state', ({ expect }) => {
    const emptyState: QueryData = {
      section: MenuSection.Secrets,
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
    };

    const action: ReinitializeAction = { action: QueryDataActions.Reinitialize, state: emptyState };

    const result = reinitialize(action);

    expect(result).toEqual(emptyState);
    expect(result.resources).toEqual([]);
    expect(result.nodes).toEqual({});
    expect(result.edges).toEqual({});
    expect(result.selection.resources.size).toBe(0);
    expect(result.selection.edges.size).toBe(0);
    expect(result.selection.issues.size).toBe(0);
  });

  it('should preserve Set and Map instances', ({ expect }) => {
    const newState = createMockState();
    const resourcesSet = new Set([TEST_RESOURCE_ID]);
    const edgesSet = new Set([TEST_EDGE_ID]);
    const issuesSet = new Set([TEST_ISSUE_ID]);
    const issuesMap = new Map([[TEST_ISSUE_ID, { id: TEST_ISSUE_ID, message: 'Test', resourceIds: [], edgeIds: [] }]]);

    newState.selection = { resources: resourcesSet, edges: edgesSet, issues: issuesSet };
    newState.issues = issuesMap;

    const action: ReinitializeAction = { action: QueryDataActions.Reinitialize, state: newState };

    const result = reinitialize(action);

    expect(result.selection.resources).toBe(resourcesSet);
    expect(result.selection.edges).toBe(edgesSet);
    expect(result.selection.issues).toBe(issuesSet);
    expect(result.issues).toBe(issuesMap);
  });

  it('should handle state with undefined issues', ({ expect }) => {
    const newState = createMockState();
    newState.issues = undefined;

    const action: ReinitializeAction = { action: QueryDataActions.Reinitialize, state: newState };

    const result = reinitialize(action);

    expect(result.issues).toBeUndefined();
  });

  it('should not modify the input action', ({ expect }) => {
    const originalState = createMockState();
    const stateCopy: QueryData = {
      ...originalState,
      selection: {
        resources: new Set(originalState.selection.resources),
        edges: new Set(originalState.selection.edges),
        issues: new Set(originalState.selection.issues),
      },
    };

    const action: ReinitializeAction = { action: QueryDataActions.Reinitialize, state: stateCopy };

    const originalAction = { ...action };
    const result = reinitialize(action);

    // Action should be unchanged
    expect(action).toEqual(originalAction);

    // Result should be equal to the state but not the same object
    expect(result).toEqual(stateCopy);
    expect(result).not.toBe(action.state);
  });

  it('should handle complex nested state', ({ expect }) => {
    const complexState: QueryData = {
      section: MenuSection.Environments,
      resources: [
        {
          id: AWS_ACCOUNT_REGION_ID,
          environments: ['prod', 'staging'],
          first_seen_at: '2024-01-01T00:00:00Z',
          last_seen_at: '2024-01-02T00:00:00Z',
        },
      ],
      events: [],
      environments: ['prod', 'staging', 'dev'],
      resourcesEnvironments: {
        'aws:account|region:us-east-1': { prod: { inheritedFrom: [{ type: 'aws', id: 'account' }] }, staging: {} },
      },
      resourceEvents: [],
      eventChainLinks: {
        [EVENT_1_ID]: { preceding: new Set([EVENT_0_ID]), following: new Set([EVENT_2_ID, EVENT_3_ID]) },
        [EVENT_2_ID]: { preceding: new Set([EVENT_1_ID]), following: new Set() },
      },
      nodes: {
        [COMPLEX_NODE_ID]: {
          id: COMPLEX_NODE_ID,
          position: { x: 250, y: 150 },
          data: {
            id: AWS_ACCOUNT_REGION_ID,
            absolutePosition: { x: 250, y: 150 },
            collapsed: false,
          } as ResourceNodeData,
          selected: true,
          width: 300,
          height: 200,
        } as Node<ResourceNodeData>,
      },
      edges: {
        [COMPLEX_EDGE_ID]: {
          id: COMPLEX_EDGE_ID,
          source: COMPLEX_NODE_ID,
          target: ANOTHER_NODE_ID,
          selected: true,
          data: {
            originalSourceId: COMPLEX_NODE_ID,
            originalTargetId: ANOTHER_NODE_ID,
            label: { text: 'Complex Edge' },
            events: [],
          } as ELKEdgeData,
        } as Edge<ELKEdgeData>,
      },
      measurements: { [COMPLEX_NODE_ID]: { width: 300, height: 200 } },
      viewport: { x: -100, y: -50, zoom: 1.5 },
      fitViewAfterLayout: true,
      laidOut: LayoutState.LaidOut,
      selection: {
        resources: new Set([COMPLEX_NODE_ID]),
        edges: new Set([COMPLEX_EDGE_ID]),
        issues: new Set([COMPLEX_ISSUE_ID]),
      },
      issues: new Map([
        [
          COMPLEX_ISSUE_ID,
          {
            id: COMPLEX_ISSUE_ID,
            message: 'Complex security issue',
            resourceIds: [COMPLEX_NODE_ID],
            edgeIds: [COMPLEX_EDGE_ID],
          },
        ],
      ]),
      dateFilter: { startDate: new Date('2025-06-01'), endDate: new Date('2025-07-01') },
      originalData: { resources: [], events: [] },
    };

    const action: ReinitializeAction = { action: QueryDataActions.Reinitialize, state: complexState };

    const result = reinitialize(action);

    expect(result).toEqual(complexState);
    expect(result.resources[0].id).toEqual(AWS_ACCOUNT_REGION_ID);
    expect(result.eventChainLinks[EVENT_1_ID].following).toEqual(new Set([EVENT_2_ID, EVENT_3_ID]));
    expect(result.nodes[COMPLEX_NODE_ID].data.absolutePosition).toEqual({ x: 250, y: 150 });
    expect(result.selection.resources).toEqual(new Set([COMPLEX_NODE_ID]));
    expect(result.issues?.get(COMPLEX_ISSUE_ID)?.message).toBe('Complex security issue');
  });
});
