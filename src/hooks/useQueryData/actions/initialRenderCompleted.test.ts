import { describe, it } from 'vitest';
import initialRenderCompleted from './initialRenderCompleted';
import { LayoutState, QueryData } from '..';
import { nodeIdFromResourceId } from '@/lib/utils';
import MenuSection from '@/lib/menuSection';

// Resource ID constants
const TEST_RESOURCE_ID: ResourceId = [{ type: 'test', id: '1' }];
const TEST_NODE_ID = nodeIdFromResourceId(TEST_RESOURCE_ID);

describe('initialRenderCompleted', () => {
  const createMockState = (laidOut: LayoutState): QueryData => ({
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
    fitViewAfterLayout: true,
    laidOut,
    selection: { resources: new Set(), edges: new Set(), issues: new Set() },
    dateFilter: { startDate: new Date('2025-06-01'), endDate: new Date('2025-07-01') },
    originalData: { resources: [], events: [] },
  });

  it('should transition from Initial to InitialRenderCompleted', ({ expect }) => {
    const state = createMockState(LayoutState.Initial);
    const result = initialRenderCompleted(state);

    expect(result.laidOut).toBe(LayoutState.InitialRenderCompleted);
    expect(result).not.toBe(state); // Should return new object
    expect(result.section).toBe(state.section); // Other properties unchanged
  });

  it('should not change state if already InitialRenderCompleted', ({ expect }) => {
    const state = createMockState(LayoutState.InitialRenderCompleted);
    const result = initialRenderCompleted(state);

    expect(result).toBe(state); // Should return same object
    expect(result.laidOut).toBe(LayoutState.InitialRenderCompleted);
  });

  it('should not change state if in Measured state', ({ expect }) => {
    const state = createMockState(LayoutState.Measured);
    const result = initialRenderCompleted(state);

    expect(result).toBe(state); // Should return same object
    expect(result.laidOut).toBe(LayoutState.Measured);
  });

  it('should not change state if in LaidOut state', ({ expect }) => {
    const state = createMockState(LayoutState.LaidOut);
    const result = initialRenderCompleted(state);

    expect(result).toBe(state); // Should return same object
    expect(result.laidOut).toBe(LayoutState.LaidOut);
  });

  it('should preserve all other state properties', ({ expect }) => {
    const state = createMockState(LayoutState.Initial);
    state.resources = [{ id: TEST_RESOURCE_ID, environments: [], first_seen_at: '', last_seen_at: '' }];
    state.selection.resources.add(TEST_NODE_ID);

    const result = initialRenderCompleted(state);

    expect(result.resources).toEqual(state.resources);
    expect(result.selection.resources).toEqual(state.selection.resources);
    expect(result.viewport).toEqual(state.viewport);
  });
});
