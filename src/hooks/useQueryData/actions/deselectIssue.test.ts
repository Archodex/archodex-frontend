import { describe, it } from 'vitest';
import deselectIssue from './deselectIssue';
import { QueryData, LayoutState, QueryDataActions } from '..';
import type { DeselectIssueAction } from './deselectIssue';
import { Node, Edge, MarkerType } from '@xyflow/react';
import { ResourceNodeData } from '@/ResourceNode';
import { ELKEdgeData } from '@/ELKEdge';
import { nodeIdFromResourceId, edgeIdFromResourceIds } from '@/lib/utils';
import MenuSection from '@/lib/menuSection';

// Resource ID constants
const RESOURCE_1_ID: ResourceId = [{ type: 'test', id: '1' }];
const RESOURCE_2_ID: ResourceId = [{ type: 'test', id: '2' }];
const RESOURCE_3_ID: ResourceId = [{ type: 'test', id: '3' }];
const RESOURCE_4_ID: ResourceId = [{ type: 'test', id: '4' }];

// Generated ID constants
const NODE_1_ID = nodeIdFromResourceId(RESOURCE_1_ID);
const NODE_2_ID = nodeIdFromResourceId(RESOURCE_2_ID);
const NODE_3_ID = nodeIdFromResourceId(RESOURCE_3_ID);
const NODE_4_ID = nodeIdFromResourceId(RESOURCE_4_ID);
const EDGE_1_ID = edgeIdFromResourceIds(RESOURCE_1_ID, RESOURCE_2_ID);
const EDGE_2_ID = edgeIdFromResourceIds(RESOURCE_2_ID, RESOURCE_3_ID);
const EDGE_3_ID = `${NODE_1_ID}-edge-3`;
const ISSUE_1_ID = 'issue-1';
const ISSUE_2_ID = 'issue-2';
const ISSUE_3_ID = 'issue-3';

describe('deselectIssue', () => {
  const createMockState = (): QueryData => ({
    section: MenuSection.Secrets,
    resources: [],
    events: [],
    environments: [],
    resourcesEnvironments: {},
    resourceEvents: [],
    eventChainLinks: {},
    nodes: {
      [NODE_1_ID]: {
        id: NODE_1_ID,
        position: { x: 0, y: 0 },
        data: { id: RESOURCE_1_ID } as ResourceNodeData,
        selected: true,
      } as Node<ResourceNodeData>,
      [NODE_2_ID]: {
        id: NODE_2_ID,
        position: { x: 100, y: 0 },
        data: { id: RESOURCE_2_ID } as ResourceNodeData,
        selected: true,
      } as Node<ResourceNodeData>,
      [NODE_3_ID]: {
        id: NODE_3_ID,
        position: { x: 200, y: 0 },
        data: { id: RESOURCE_3_ID } as ResourceNodeData,
        selected: true,
      } as Node<ResourceNodeData>,
    },
    edges: {
      [EDGE_1_ID]: {
        id: EDGE_1_ID,
        source: NODE_1_ID,
        target: NODE_2_ID,
        selected: true,
        markerEnd: { type: MarkerType.ArrowClosed, color: 'selected' },
        data: { originalSourceId: NODE_1_ID, originalTargetId: NODE_2_ID, label: {}, events: [] },
      } as Edge<ELKEdgeData>,
      [EDGE_2_ID]: {
        id: EDGE_2_ID,
        source: NODE_2_ID,
        target: NODE_3_ID,
        selected: true,
        markerEnd: { type: MarkerType.ArrowClosed, color: 'selected' },
        data: { originalSourceId: NODE_2_ID, originalTargetId: NODE_3_ID, label: {}, events: [] },
      } as Edge<ELKEdgeData>,
    },
    measurements: {},
    viewport: { x: 0, y: 0, zoom: 1 },
    fitViewAfterLayout: false,
    laidOut: LayoutState.LaidOut,
    selection: {
      resources: new Set([NODE_1_ID, NODE_2_ID, NODE_3_ID]),
      edges: new Set([EDGE_1_ID, EDGE_2_ID]),
      issues: new Set([ISSUE_1_ID, ISSUE_2_ID]),
    },
    issues: new Map([
      [
        ISSUE_1_ID,
        { id: ISSUE_1_ID, message: 'Test Issue', resourceIds: [NODE_1_ID, NODE_2_ID], edgeIds: [EDGE_1_ID] },
      ],
      [
        ISSUE_2_ID,
        { id: ISSUE_2_ID, message: 'Dependent Issue', resourceIds: [NODE_2_ID, NODE_3_ID], edgeIds: [EDGE_2_ID] },
      ],
    ]),
    dateFilter: { startDate: new Date('2025-06-01'), endDate: new Date('2025-07-01') },
    originalData: { resources: [], events: [] },
  });

  it('should deselect an issue and its resources and edges', ({ expect }) => {
    const state = createMockState();
    const action: DeselectIssueAction = { action: QueryDataActions.DeselectIssue, issueId: ISSUE_1_ID };

    const result = deselectIssue(state, action);

    expect(result.selection.issues.has(ISSUE_1_ID)).toBe(false);
    expect(result.selection.resources.has(NODE_1_ID)).toBe(false);
    expect(result.selection.resources.has(NODE_2_ID)).toBe(false);
    expect(result.selection.edges.has(EDGE_1_ID)).toBe(false);
    expect(result.nodes[NODE_1_ID].selected).toBe(false);
    expect(result.nodes[NODE_2_ID].selected).toBe(false);
    expect(result.edges[EDGE_1_ID].selected).toBe(false);
    expect(result.edges[EDGE_1_ID].markerEnd).toBeUndefined();
    expect(result).not.toBe(state);
  });

  it('should throw error if issue is not found', ({ expect }) => {
    const state = createMockState();
    const action: DeselectIssueAction = { action: QueryDataActions.DeselectIssue, issueId: 'non-existent' };

    expect(() => deselectIssue(state, action)).toThrow('Issue with id non-existent not found');
  });

  it('should deselect dependent issues when their dependencies are deselected', ({ expect }) => {
    const state = createMockState();
    const action: DeselectIssueAction = { action: QueryDataActions.DeselectIssue, issueId: ISSUE_1_ID };

    const result = deselectIssue(state, action);

    // issue-2 depends on node-2 which was deselected, so issue-2 should also be deselected
    expect(result.selection.issues.has(ISSUE_2_ID)).toBe(false);
  });

  it('should keep issues that still have all dependencies selected', ({ expect }) => {
    const state = createMockState();
    // Create an issue that only depends on node-3
    state.issues?.set(ISSUE_3_ID, {
      id: ISSUE_3_ID,
      message: 'Independent Issue',
      resourceIds: [NODE_3_ID],
      edgeIds: [],
    });
    state.selection.issues.add(ISSUE_3_ID);

    const action: DeselectIssueAction = { action: QueryDataActions.DeselectIssue, issueId: ISSUE_1_ID };

    const result = deselectIssue(state, action);

    // issue-3 only depends on node-3 which is still selected
    expect(result.selection.issues.has(ISSUE_3_ID)).toBe(true);
    expect(result.nodes[NODE_3_ID].selected).toBe(true);
  });

  it('should handle issues with no edges', ({ expect }) => {
    const state = createMockState();
    const issueNoEdgesId = 'issue-no-edges';
    state.issues?.set(issueNoEdgesId, {
      id: issueNoEdgesId,
      message: 'Issue without edges',
      resourceIds: [NODE_1_ID],
      edgeIds: [],
    });
    state.selection.issues = new Set([issueNoEdgesId]);

    const action: DeselectIssueAction = { action: QueryDataActions.DeselectIssue, issueId: issueNoEdgesId };

    const result = deselectIssue(state, action);

    expect(result.selection.issues.has(issueNoEdgesId)).toBe(false);
    expect(result.selection.resources.has(NODE_1_ID)).toBe(false);
  });

  it('should handle issues with no resources', ({ expect }) => {
    const state = createMockState();
    const issueNoResourcesId = 'issue-no-resources';
    state.issues?.set(issueNoResourcesId, {
      id: issueNoResourcesId,
      message: 'Issue without resources',
      resourceIds: [],
      edgeIds: [EDGE_1_ID],
    });
    state.selection.issues = new Set([issueNoResourcesId]);

    const action: DeselectIssueAction = { action: QueryDataActions.DeselectIssue, issueId: issueNoResourcesId };

    const result = deselectIssue(state, action);

    expect(result.selection.issues.has(issueNoResourcesId)).toBe(false);
    expect(result.selection.edges.has(EDGE_1_ID)).toBe(false);
  });

  it('should throw error if dependent issue is not found in issues map', ({ expect }) => {
    const state = createMockState();
    state.selection.issues.add('missing-issue');

    const action: DeselectIssueAction = { action: QueryDataActions.DeselectIssue, issueId: ISSUE_1_ID };

    expect(() => deselectIssue(state, action)).toThrow('Issue with id missing-issue not found');
  });

  it('should handle state without issues map', ({ expect }) => {
    const state = createMockState();
    state.issues = undefined;

    const action: DeselectIssueAction = { action: QueryDataActions.DeselectIssue, issueId: ISSUE_1_ID };

    expect(() => deselectIssue(state, action)).toThrow();
  });

  it('should preserve selections not affected by the deselected issue', ({ expect }) => {
    const state = createMockState();
    state.selection.resources.add(NODE_4_ID);
    state.selection.edges.add(EDGE_3_ID);

    const action: DeselectIssueAction = { action: QueryDataActions.DeselectIssue, issueId: ISSUE_1_ID };

    const result = deselectIssue(state, action);

    expect(result.selection.resources.has(NODE_4_ID)).toBe(true);
    expect(result.selection.edges.has(EDGE_3_ID)).toBe(true);
  });

  it('should preserve other state properties', ({ expect }) => {
    const state = createMockState();
    state.resources = [{ id: RESOURCE_1_ID, environments: [], first_seen_at: '', last_seen_at: '' }];
    state.measurements = { [NODE_1_ID]: { width: 100, height: 50 } };

    const action: DeselectIssueAction = { action: QueryDataActions.DeselectIssue, issueId: ISSUE_1_ID };

    const result = deselectIssue(state, action);

    expect(result.resources).toEqual(state.resources);
    expect(result.measurements).toEqual(state.measurements);
    expect(result.viewport).toEqual(state.viewport);
    expect(result.section).toBe(state.section);
  });

  it('should create new objects for modified nodes and edges', ({ expect }) => {
    const state = createMockState();
    const action: DeselectIssueAction = { action: QueryDataActions.DeselectIssue, issueId: ISSUE_1_ID };

    const result = deselectIssue(state, action);

    expect(result.nodes).not.toBe(state.nodes);
    expect(result.edges).not.toBe(state.edges);
    expect(result.nodes[NODE_1_ID]).not.toBe(state.nodes[NODE_1_ID]);
    expect(result.edges[EDGE_1_ID]).not.toBe(state.edges[EDGE_1_ID]);
  });
});
