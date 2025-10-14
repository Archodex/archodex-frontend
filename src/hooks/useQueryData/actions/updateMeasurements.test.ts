import { describe, it } from 'vitest';
import updateMeasurements from './updateMeasurements';
import { LayoutState, QueryData, Measurements, QueryDataActions } from '..';
import type { UpdateMeasurementsAction } from './updateMeasurements';
import { nodeIdFromResourceId } from '@/lib/utils';
import MenuSection from '@/lib/menuSection';

// Resource ID constants
const NODE_1_RESOURCE_ID: ResourceId = [{ type: 'test', id: '1' }];
const NODE_2_RESOURCE_ID: ResourceId = [{ type: 'test', id: '2' }];
const OLD_NODE_RESOURCE_ID: ResourceId = [{ type: 'test', id: 'old' }];

describe('updateMeasurements', () => {
  const NODE_1_ID = nodeIdFromResourceId(NODE_1_RESOURCE_ID);
  const NODE_2_ID = nodeIdFromResourceId(NODE_2_RESOURCE_ID);
  const OLD_NODE_ID = nodeIdFromResourceId(OLD_NODE_RESOURCE_ID);
  const createMockState = (): QueryData => ({
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
    laidOut: LayoutState.InitialRenderCompleted,
    selection: { resources: new Set(), edges: new Set(), issues: new Set() },
    dateFilter: { startDate: new Date('2025-06-01'), endDate: new Date('2025-07-01') },
    originalData: { resources: [], events: [] },
  });

  it('should update measurements and set layout state to Measured', ({ expect }) => {
    const state = createMockState();
    const newMeasurements: Measurements = {
      [NODE_1_ID]: { width: 100, height: 50 },
      [NODE_2_ID]: { width: 200, height: 75 },
    };

    const action: UpdateMeasurementsAction = {
      action: QueryDataActions.UpdateMeasurements,
      measurements: newMeasurements,
    };

    const result = updateMeasurements(state, action);

    expect(result.measurements).toEqual(newMeasurements);
    expect(result.laidOut).toBe(LayoutState.Measured);
    expect(result).not.toBe(state); // Should return new object
  });

  it('should replace existing measurements', ({ expect }) => {
    const state = createMockState();
    state.measurements = { [OLD_NODE_ID]: { width: 50, height: 25 } };

    const newMeasurements: Measurements = { [NODE_1_ID]: { width: 100, height: 50 } };

    const action: UpdateMeasurementsAction = {
      action: QueryDataActions.UpdateMeasurements,
      measurements: newMeasurements,
    };

    const result = updateMeasurements(state, action);

    expect(result.measurements).toEqual(newMeasurements);
    expect(result.measurements[OLD_NODE_ID]).toBeUndefined();
  });

  it('should handle empty measurements', ({ expect }) => {
    const state = createMockState();
    const action: UpdateMeasurementsAction = { action: QueryDataActions.UpdateMeasurements, measurements: {} };

    const result = updateMeasurements(state, action);

    expect(result.measurements).toEqual({});
    expect(result.laidOut).toBe(LayoutState.Measured);
  });

  it('should preserve all other state properties', ({ expect }) => {
    const state = createMockState();
    state.resources = [{ id: NODE_1_RESOURCE_ID, environments: [], first_seen_at: '', last_seen_at: '' }];
    state.selection.resources.add(NODE_1_ID);

    const action: UpdateMeasurementsAction = {
      action: QueryDataActions.UpdateMeasurements,
      measurements: { [NODE_1_ID]: { width: 100, height: 50 } },
    };

    const result = updateMeasurements(state, action);

    expect(result.resources).toEqual(state.resources);
    expect(result.selection.resources).toEqual(state.selection.resources);
    expect(result.viewport).toEqual(state.viewport);
    expect(result.section).toBe(state.section);
  });

  it('should handle measurements with undefined values', ({ expect }) => {
    const state = createMockState();
    const measurements: Measurements = { [NODE_1_ID]: { width: 100, height: 50 }, [NODE_2_ID]: undefined };

    const action: UpdateMeasurementsAction = { action: QueryDataActions.UpdateMeasurements, measurements };

    const result = updateMeasurements(state, action);

    expect(result.measurements).toEqual(measurements);
    expect(result.measurements[NODE_2_ID]).toBeUndefined();
  });
});
