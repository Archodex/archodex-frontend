import { describe, it } from 'vitest';
import selectIssue from './selectIssue';
import { QueryData, LayoutState, QueryDataActions } from '..';
import type { SelectIssueAction } from './selectIssue';
import { Node, Edge } from '@xyflow/react';
import { ResourceNodeData } from '@/ResourceNode';
import { ELKEdgeData } from '@/ELKEdge';
import { nodeIdFromResourceId, edgeIdFromResourceIds } from '@/lib/utils';
import MenuSection from '@/lib/menuSection';

describe('selectIssue', () => {
  const RESOURCE_1_ID = [{ type: 'test', id: '1' }];
  const RESOURCE_2_ID = [{ type: 'test', id: '2' }];
  const NODE_1_ID = nodeIdFromResourceId(RESOURCE_1_ID);
  const NODE_2_ID = nodeIdFromResourceId(RESOURCE_2_ID);
  const EDGE_ID = edgeIdFromResourceIds(RESOURCE_1_ID, RESOURCE_2_ID);

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
        selected: false,
        hidden: false,
      } as Node<ResourceNodeData>,
      [NODE_2_ID]: {
        id: NODE_2_ID,
        position: { x: 100, y: 0 },
        data: { id: RESOURCE_2_ID } as ResourceNodeData,
        selected: false,
        hidden: true,
      } as Node<ResourceNodeData>,
    },
    edges: {
      [EDGE_ID]: {
        id: EDGE_ID,
        source: NODE_1_ID,
        target: NODE_2_ID,
        selected: false,
        data: { originalSourceId: NODE_1_ID, originalTargetId: NODE_2_ID, label: {}, events: [] },
      } as Edge<ELKEdgeData>,
    },
    measurements: {},
    viewport: { x: 0, y: 0, zoom: 1 },
    fitViewAfterLayout: false,
    laidOut: LayoutState.LaidOut,
    selection: { resources: new Set(), edges: new Set(), issues: new Set() },
    issues: new Map([
      ['issue-1', { id: 'issue-1', message: 'Test Issue', resourceIds: [NODE_1_ID, NODE_2_ID], edgeIds: [EDGE_ID] }],
      ['issue-2', { id: 'issue-2', message: 'Another Issue', resourceIds: [NODE_1_ID], edgeIds: [] }],
    ]),
    dateFilter: { startDate: new Date('2025-06-01'), endDate: new Date('2025-07-01') },
    originalData: { resources: [], events: [] },
  });

  it('should select an issue and its resources and edges', ({ expect }) => {
    const state = createMockState();
    const action: SelectIssueAction = { action: QueryDataActions.SelectIssue, issueId: 'issue-1' };

    const result = selectIssue(state, action);

    expect(result.selection.issues.has('issue-1')).toBe(true);
    expect(result.selection.resources.has(NODE_1_ID)).toBe(true);
    expect(result.selection.resources.has(NODE_2_ID)).toBe(true);
    expect(result.selection.edges.has(EDGE_ID)).toBe(true);
    expect(result.nodes[NODE_1_ID].selected).toBe(true);
    expect(result.nodes[NODE_2_ID].selected).toBe(true);
    expect(result.edges[EDGE_ID].selected).toBe(true);
    expect(result).not.toBe(state);
  });

  it('should throw error if issue is not found', ({ expect }) => {
    const state = createMockState();
    const action: SelectIssueAction = { action: QueryDataActions.SelectIssue, issueId: 'non-existent' };

    expect(() => selectIssue(state, action)).toThrow('Issue with id non-existent not found');
  });

  it('should show hidden nodes referenced by the issue', ({ expect }) => {
    const state = createMockState();
    const action: SelectIssueAction = { action: QueryDataActions.SelectIssue, issueId: 'issue-1' };

    const result = selectIssue(state, action);

    expect(result.nodes[NODE_2_ID].hidden).toBeUndefined();
    expect(result.laidOut).toBe(LayoutState.Initial);
    expect(result.measurements).not.toBe(state.measurements);
  });

  it('should not modify already selected resources', ({ expect }) => {
    const state = createMockState();
    state.nodes[NODE_1_ID].selected = true;
    state.selection.resources.add(NODE_1_ID);

    const action: SelectIssueAction = { action: QueryDataActions.SelectIssue, issueId: 'issue-1' };

    const result = selectIssue(state, action);

    // node-1 was already selected, so nodes object should only be cloned if node-2 needs modification
    expect(result.nodes[NODE_1_ID].selected).toBe(true);
    expect(result.nodes[NODE_2_ID].selected).toBe(true);
  });

  it('should not modify already selected edges', ({ expect }) => {
    const state = createMockState();
    state.edges[EDGE_ID].selected = true;
    state.selection.edges.add(EDGE_ID);

    const action: SelectIssueAction = { action: QueryDataActions.SelectIssue, issueId: 'issue-1' };

    const result = selectIssue(state, action);

    expect(result.edges[EDGE_ID].selected).toBe(true);
  });

  it('should set fitViewAfterLayout when refitView is true', ({ expect }) => {
    const state = createMockState();
    const action: SelectIssueAction = { action: QueryDataActions.SelectIssue, issueId: 'issue-1', refitView: true };

    const result = selectIssue(state, action);

    expect(result.fitViewAfterLayout).toBe(true);
  });

  it('should default refitView to true', ({ expect }) => {
    const state = createMockState();
    const action: SelectIssueAction = { action: QueryDataActions.SelectIssue, issueId: 'issue-1' };

    const result = selectIssue(state, action);

    expect(result.fitViewAfterLayout).toBe(true);
  });

  it('should preserve fitViewAfterLayout if already true', ({ expect }) => {
    const state = createMockState();
    state.fitViewAfterLayout = true;

    const action: SelectIssueAction = { action: QueryDataActions.SelectIssue, issueId: 'issue-1', refitView: false };

    const result = selectIssue(state, action);

    expect(result.fitViewAfterLayout).toBe(true);
  });

  it('should select other issues whose dependencies are satisfied', ({ expect }) => {
    const state = createMockState();
    // issue-2 only needs node-1, which will be selected when issue-1 is selected

    const action: SelectIssueAction = { action: QueryDataActions.SelectIssue, issueId: 'issue-1' };

    const result = selectIssue(state, action);

    expect(result.selection.issues.has('issue-1')).toBe(true);
    expect(result.selection.issues.has('issue-2')).toBe(true); // Automatically selected
  });

  it('should handle issues with no edges', ({ expect }) => {
    const state = createMockState();
    const action: SelectIssueAction = { action: QueryDataActions.SelectIssue, issueId: 'issue-2' };

    const result = selectIssue(state, action);

    expect(result.selection.issues.has('issue-2')).toBe(true);
    expect(result.selection.resources.has(NODE_1_ID)).toBe(true);
    expect(result.selection.edges.size).toBe(0);
  });

  it('should handle state without issues map', ({ expect }) => {
    const state = createMockState();
    state.issues = undefined;

    const action: SelectIssueAction = { action: QueryDataActions.SelectIssue, issueId: 'issue-1' };

    expect(() => selectIssue(state, action)).toThrow();
  });

  it('should not clone objects if no changes are needed', ({ expect }) => {
    const state = createMockState();
    // Select all dependencies first
    state.nodes[NODE_1_ID].selected = true;
    state.nodes[NODE_2_ID].selected = true;
    state.edges[EDGE_ID].selected = true;
    state.selection.resources = new Set([NODE_1_ID, NODE_2_ID]);
    state.selection.edges = new Set([EDGE_ID]);
    // Hide node-2 so it's not hidden
    state.nodes[NODE_2_ID].hidden = false;

    const action: SelectIssueAction = { action: QueryDataActions.SelectIssue, issueId: 'issue-1' };

    const result = selectIssue(state, action);

    // Objects should not be cloned if no changes needed
    expect(result.nodes).toBe(state.nodes);
    expect(result.edges).toBe(state.edges);
    expect(result.measurements).toBe(state.measurements);
  });

  it('should preserve other state properties', ({ expect }) => {
    const state = createMockState();
    state.resources = [{ id: [{ type: 'test', id: '1' }], environments: [], first_seen_at: '', last_seen_at: '' }];

    const action: SelectIssueAction = { action: QueryDataActions.SelectIssue, issueId: 'issue-1' };

    const result = selectIssue(state, action);

    expect(result.resources).toEqual(state.resources);
    expect(result.viewport).toEqual(state.viewport);
    expect(result.section).toBe(state.section);
  });
});
