import { describe, it, vi } from 'vitest';
import setDateFilter from './setDateFilter';
import { QueryData, LayoutState, QueryDataActions } from '..';
import type { SetDateFilterAction } from './setDateFilter';
import { DateFilter } from '@/lib/dateFilter';
import { nodeIdFromResourceId } from '@/lib/utils';
import MenuSection from '@/lib/menuSection';
import initializer from '../initializer';

// Mock only the initializer
vi.mock('../initializer', () => ({ default: vi.fn() }));

// Mock sessionStorage
const mockSessionStorage = { setItem: vi.fn(), getItem: vi.fn(), removeItem: vi.fn(), clear: vi.fn() };

Object.defineProperty(window, 'sessionStorage', { value: mockSessionStorage });

// Resource ID constants
const RESOURCE_1_ID: ResourceId = [{ type: 'test', id: '1' }];
const NODE_1_ID = nodeIdFromResourceId(RESOURCE_1_ID);

describe('setDateFilter', () => {
  const createMockState = (): QueryData => ({
    section: MenuSection.Secrets,
    resources: [{ id: RESOURCE_1_ID, environments: ['prod'], first_seen_at: '2024-01-01', last_seen_at: '2024-01-02' }],
    events: [],
    environments: ['prod'],
    resourcesEnvironments: {},
    resourceEvents: [],
    eventChainLinks: {},
    nodes: {},
    edges: {},
    measurements: {},
    viewport: { x: 0, y: 0, zoom: 1 },
    fitViewAfterLayout: false,
    laidOut: LayoutState.LaidOut,
    selection: { resources: new Set([NODE_1_ID]), edges: new Set(), issues: new Set() },
    dateFilter: { startDate: new Date('2025-01-01'), endDate: new Date('2025-01-31') },
    originalData: { resources: [], events: [] },
  });

  const createMockDateFilter = (): DateFilter => ({
    startDate: new Date('2025-02-01'),
    endDate: new Date('2025-02-28'),
  });

  it('should store date filter in sessionStorage', ({ expect }) => {
    const state = createMockState();
    const dateFilter = createMockDateFilter();
    const action: SetDateFilterAction = { action: QueryDataActions.SetDateFilter, dateFilter };

    setDateFilter(state, action);

    expect(mockSessionStorage.setItem).toHaveBeenCalledWith('dateFilter', JSON.stringify(dateFilter));
  });

  it('should clear selections from the state', ({ expect }) => {
    const state = createMockState();
    const dateFilter = createMockDateFilter();
    const action: SetDateFilterAction = { action: QueryDataActions.SetDateFilter, dateFilter };

    setDateFilter(state, action);

    // Verify initializer was called with cleared selections
    expect(vi.mocked(initializer)).toHaveBeenCalledWith(
      expect.objectContaining({ selection: { resources: new Set(), edges: new Set(), issues: new Set() } }),
    );
  });

  it('should call initializer with cleared state, reset layout, and new date filter', ({ expect }) => {
    const state = createMockState();
    const dateFilter = createMockDateFilter();
    const action: SetDateFilterAction = { action: QueryDataActions.SetDateFilter, dateFilter };

    setDateFilter(state, action);

    expect(vi.mocked(initializer)).toHaveBeenCalledWith(
      expect.objectContaining({
        laidOut: LayoutState.Initial,
        dateFilter,
        selection: { resources: new Set(), edges: new Set(), issues: new Set() },
      }),
    );
  });

  it('should return the result from initializer', ({ expect }) => {
    const state = createMockState();
    const dateFilter = createMockDateFilter();
    const action: SetDateFilterAction = { action: QueryDataActions.SetDateFilter, dateFilter };

    const expectedResult = { ...state, dateFilter, laidOut: LayoutState.Initial };

    vi.mocked(initializer).mockReturnValue(expectedResult);

    const result = setDateFilter(state, action);

    expect(result).toBe(expectedResult);
  });

  it('should reset layout state to Initial', ({ expect }) => {
    const state = createMockState();
    const dateFilter = createMockDateFilter();
    const action: SetDateFilterAction = { action: QueryDataActions.SetDateFilter, dateFilter };

    setDateFilter(state, action);

    expect(initializer).toHaveBeenCalledWith(expect.objectContaining({ laidOut: LayoutState.Initial }));
  });

  it('should pass the new date filter to initializer', ({ expect }) => {
    const state = createMockState();
    const dateFilter = createMockDateFilter();
    const action: SetDateFilterAction = { action: QueryDataActions.SetDateFilter, dateFilter };

    setDateFilter(state, action);

    expect(initializer).toHaveBeenCalledWith(expect.objectContaining({ dateFilter }));
  });

  it('should return original state when date filter is equal', ({ expect }) => {
    const state = createMockState();
    const dateFilter = state.dateFilter; // Same as current
    const action: SetDateFilterAction = { action: QueryDataActions.SetDateFilter, dateFilter };

    const result = setDateFilter(state, action);

    // Should return original state without any processing
    expect(result).toBe(state);
    expect(mockSessionStorage.setItem).not.toHaveBeenCalled();
    expect(vi.mocked(initializer)).not.toHaveBeenCalled();
  });

  it('should handle date filter with different time ranges', ({ expect }) => {
    const state = createMockState();
    const dateFilter: DateFilter = {
      startDate: new Date('2025-01-01T00:00:00.000Z'),
      endDate: new Date('2025-12-31T23:59:59.999Z'),
    };
    const action: SetDateFilterAction = { action: QueryDataActions.SetDateFilter, dateFilter };

    setDateFilter(state, action);

    expect(mockSessionStorage.setItem).toHaveBeenCalledWith('dateFilter', JSON.stringify(dateFilter));
    expect(initializer).toHaveBeenCalledWith(expect.objectContaining({ dateFilter }));
  });

  it('should preserve other state properties through the pipeline', ({ expect }) => {
    const state = createMockState();
    const dateFilter = createMockDateFilter();
    const action: SetDateFilterAction = { action: QueryDataActions.SetDateFilter, dateFilter };

    // clearSelection will clear the selections automatically

    setDateFilter(state, action);

    expect(initializer).toHaveBeenCalledWith(
      expect.objectContaining({
        section: state.section,
        resources: state.resources,
        events: state.events,
        environments: state.environments,
        nodes: state.nodes,
        edges: state.edges,
        measurements: state.measurements,
        viewport: state.viewport,
        fitViewAfterLayout: state.fitViewAfterLayout,
        resourcesEnvironments: state.resourcesEnvironments,
        resourceEvents: state.resourceEvents,
        eventChainLinks: state.eventChainLinks,
        originalData: state.originalData,
      }),
    );
  });
});
