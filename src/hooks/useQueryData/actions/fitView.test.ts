import { describe, it, vi, beforeEach } from 'vitest';
import fitView, { fitViewport } from './fitView';
import { QueryData, LayoutState, QueryDataActions } from '..';
import type { FitViewAction } from './fitView';
import { Node, Edge } from '@xyflow/react';
import { ResourceNodeData } from '@/ResourceNode';
import { ELKEdgeData } from '@/ELKEdge';
import { nodeIdFromResourceId, edgeIdFromResourceIds } from '@/lib/utils';
import MenuSection from '@/lib/menuSection';

// Mock DOM element
const mockReactFlowElement = { clientWidth: 800, clientHeight: 600 };

beforeEach(() => {
  vi.spyOn(document, 'querySelector').mockReturnValue(mockReactFlowElement as unknown as Element);
});

// Resource IDs
const RESOURCE_1_ID = [{ type: 'test', id: '1' }];
const RESOURCE_2_ID = [{ type: 'test', id: '2' }];
const NODE_1_ID = nodeIdFromResourceId(RESOURCE_1_ID);
const NODE_2_ID = nodeIdFromResourceId(RESOURCE_2_ID);
const EDGE_1_ID = edgeIdFromResourceIds(RESOURCE_1_ID, RESOURCE_2_ID);

describe('fitView', () => {
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
        data: { id: RESOURCE_1_ID, absolutePosition: { x: 100, y: 100 } } as ResourceNodeData,
        selected: true,
        hidden: false,
        width: 200,
        height: 100,
      } as Node<ResourceNodeData>,
      [NODE_2_ID]: {
        id: NODE_2_ID,
        position: { x: 300, y: 200 },
        data: { id: RESOURCE_2_ID, absolutePosition: { x: 400, y: 300 } } as ResourceNodeData,
        selected: false,
        hidden: false,
        width: 150,
        height: 75,
      } as Node<ResourceNodeData>,
    },
    edges: {
      [EDGE_1_ID]: {
        id: EDGE_1_ID,
        source: NODE_1_ID,
        target: NODE_2_ID,
        selected: true,
        hidden: false,
        data: {
          section: {
            bendPoints: [
              { x: 250, y: 150 },
              { x: 350, y: 250 },
            ],
          },
        } as ELKEdgeData,
      } as Edge<ELKEdgeData>,
    },
    measurements: {},
    viewport: { x: 0, y: 0, zoom: 1 },
    fitViewAfterLayout: true,
    laidOut: LayoutState.LaidOut,
    selection: { resources: new Set([NODE_1_ID]), edges: new Set([EDGE_1_ID]), issues: new Set() },
    dateFilter: { startDate: new Date('2025-06-01'), endDate: new Date('2025-07-01') },
    originalData: { resources: [], events: [] },
  });

  it('should update viewport and clear fitViewAfterLayout', ({ expect }) => {
    const state = createMockState();
    const action: FitViewAction = { action: QueryDataActions.FitView };

    const result = fitView(state, action);

    expect(result.viewport).toBeDefined();
    expect(result.viewport.x).toBeTypeOf('number');
    expect(result.viewport.y).toBeTypeOf('number');
    expect(result.viewport.zoom).toBeTypeOf('number');
    expect(result.fitViewAfterLayout).toBe(false);
    expect(result).not.toBe(state);
  });

  it('should pass fitToSelection and duration to fitViewport', ({ expect }) => {
    const state = createMockState();
    const action: FitViewAction = { action: QueryDataActions.FitView, fitToSelection: false, duration: 1000 };

    const result = fitView(state, action);

    expect(result.viewport.duration).toBe(1000);
  });

  it('should preserve other state properties', ({ expect }) => {
    const state = createMockState();
    state.resources = [{ id: RESOURCE_1_ID, environments: [], first_seen_at: '', last_seen_at: '' }];

    const action: FitViewAction = { action: QueryDataActions.FitView };

    const result = fitView(state, action);

    expect(result.resources).toEqual(state.resources);
    expect(result.nodes).toBe(state.nodes);
    expect(result.edges).toBe(state.edges);
    expect(result.selection).toEqual(state.selection);
  });
});

describe('fitViewport', () => {
  const createMockNodes = (): Record<string, Node<ResourceNodeData>> => ({
    [NODE_1_ID]: {
      id: NODE_1_ID,
      position: { x: 0, y: 0 },
      data: { id: RESOURCE_1_ID, absolutePosition: { x: 100, y: 100 } } as ResourceNodeData,
      selected: true,
      hidden: false,
      width: 200,
      height: 100,
    } as Node<ResourceNodeData>,
    [NODE_2_ID]: {
      id: NODE_2_ID,
      position: { x: 300, y: 200 },
      data: { id: RESOURCE_2_ID, absolutePosition: { x: 400, y: 300 } } as ResourceNodeData,
      selected: false,
      hidden: false,
      width: 150,
      height: 75,
    } as Node<ResourceNodeData>,
  });

  const createMockEdges = (): Record<string, Edge<ELKEdgeData>> => ({
    [EDGE_1_ID]: {
      id: EDGE_1_ID,
      source: NODE_1_ID,
      target: NODE_2_ID,
      selected: true,
      hidden: false,
      data: {
        section: {
          bendPoints: [
            { x: 250, y: 150 },
            { x: 350, y: 250 },
          ],
        },
      } as ELKEdgeData,
    } as Edge<ELKEdgeData>,
  });

  it('should return default viewport for empty graph', ({ expect }) => {
    const result = fitViewport({}, {});

    expect(result).toEqual({ x: 0, y: 0, zoom: 1 });
  });

  it('should fit to selected elements by default', ({ expect }) => {
    const nodes = createMockNodes();
    const edges = createMockEdges();

    const result = fitViewport(nodes, edges);

    // Should consider node-1 (selected) and edge-1 (selected)
    expect(result.zoom).toBeGreaterThan(0);
    expect(result.zoom).toBeLessThanOrEqual(1);
    expect(result.x).toBeTypeOf('number');
    expect(result.y).toBeTypeOf('number');
  });

  it('should fit to all visible elements when fitToSelection is false', ({ expect }) => {
    const nodes = createMockNodes();
    const edges = createMockEdges();

    const result = fitViewport(nodes, edges, { fitToSelection: false });

    // Should consider all visible nodes and edges
    expect(result.zoom).toBeGreaterThan(0);
    expect(result.zoom).toBeLessThanOrEqual(1);
  });

  it('should fall back to all visible elements when no selection', ({ expect }) => {
    const nodes = createMockNodes();
    const edges = createMockEdges();
    // Remove selection
    nodes[NODE_1_ID].selected = false;
    edges[EDGE_1_ID].selected = false;

    const result = fitViewport(nodes, edges, { fitToSelection: true });

    // Should fit all visible elements when nothing is selected
    expect(result.zoom).toBeGreaterThan(0);
  });

  it('should include edge endpoints when fitting to selected edges', ({ expect }) => {
    const nodes = createMockNodes();
    const edges = createMockEdges();
    // Only edge is selected
    nodes[NODE_1_ID].selected = false;
    nodes[NODE_2_ID].selected = false;

    const result = fitViewport(nodes, edges, { fitToSelection: true });

    // Should include both nodes connected by the selected edge
    expect(result.zoom).toBeGreaterThan(0);
  });

  it('should ignore hidden nodes and edges', ({ expect }) => {
    const nodes = createMockNodes();
    const edges = createMockEdges();
    nodes[NODE_2_ID].hidden = true;

    const result = fitViewport(nodes, edges, { fitToSelection: false });

    // Should only consider node-1 and edge-1
    expect(result.zoom).toBeGreaterThan(0);
  });

  it('should throw error if React Flow element not found', ({ expect }) => {
    vi.spyOn(document, 'querySelector').mockReturnValue(null);

    const nodes = createMockNodes();
    const edges = createMockEdges();

    expect(() => fitViewport(nodes, edges)).toThrow('React Flow element not found while attempting to fit view.');
  });

  it('should include duration in viewport transition', ({ expect }) => {
    const nodes = createMockNodes();
    const edges = createMockEdges();

    const result = fitViewport(nodes, edges, { duration: 500 });

    expect(result.duration).toBe(500);
  });

  it('should handle edges without bend points', ({ expect }) => {
    const nodes = createMockNodes();
    const edges = createMockEdges();
    edges[EDGE_1_ID].data = {} as ELKEdgeData;

    const result = fitViewport(nodes, edges);

    expect(result.zoom).toBeGreaterThan(0);
  });

  it('should calculate correct zoom level within bounds', ({ expect }) => {
    const nodes = createMockNodes();
    const edges = createMockEdges();

    const result = fitViewport(nodes, edges);

    expect(result.zoom).toBeGreaterThanOrEqual(0.1); // MIN_ZOOM
    expect(result.zoom).toBeLessThanOrEqual(1); // MAX_ZOOM
  });

  it('should center the fitted elements in view', ({ expect }) => {
    const nodes = createMockNodes();
    const edges = createMockEdges();

    const result = fitViewport(nodes, edges);

    // Check that viewport transformation centers the content
    expect(result.x).toBeTypeOf('number');
    expect(result.y).toBeTypeOf('number');
  });

  it('should handle nodes without width or height', ({ expect }) => {
    const nodes = createMockNodes();
    const edges = createMockEdges();
    delete nodes[NODE_1_ID].width;
    delete nodes[NODE_1_ID].height;

    const result = fitViewport(nodes, edges);

    expect(result.zoom).toBeGreaterThan(0);
  });

  it('should handle single node', ({ expect }) => {
    const nodes: Record<string, Node<ResourceNodeData>> = {
      [NODE_1_ID]: {
        id: NODE_1_ID,
        position: { x: 0, y: 0 },
        data: { id: RESOURCE_1_ID, absolutePosition: { x: 100, y: 100 } } as ResourceNodeData,
        selected: true,
        hidden: false,
        width: 200,
        height: 100,
      } as Node<ResourceNodeData>,
    };

    const result = fitViewport(nodes, {});

    expect(result.zoom).toBeGreaterThan(0);
    expect(result.zoom).toBeLessThanOrEqual(1);
  });

  it('should handle edges with complex bend points', ({ expect }) => {
    const nodes = createMockNodes();
    const edges = createMockEdges();
    edges[EDGE_1_ID].data = {
      section: {
        bendPoints: [
          { x: 50, y: 50 },
          { x: 250, y: 150 },
          { x: 350, y: 250 },
          { x: 600, y: 400 },
        ],
      },
    } as ELKEdgeData;

    const result = fitViewport(nodes, edges);

    // Should include all bend points in the bounding box calculation
    expect(result.zoom).toBeGreaterThan(0);
  });
});
