import { LayoutState, Measurements, QueryData, QueryDataActions } from '..';

/**
 * Action to update the node measurements and transition the layout state to Measured.
 * This is used when React Flow has finished measuring nodes and the measurements
 * are ready to be passed to the ELK layout algorithm.
 *
 * @public
 */
export interface UpdateMeasurementsAction {
  /** The action type identifier */
  action: typeof QueryDataActions.UpdateMeasurements;
  /** The new measurements data containing node dimensions */
  measurements: Measurements;
}

/**
 * Updates the node measurements and transitions the layout state to Measured.
 *
 * @param state - Current QueryData state
 * @param action - Action containing the new measurements
 * @returns Updated QueryData with new measurements and laidOut set to Measured
 */
const updateMeasurements = (state: QueryData, action: UpdateMeasurementsAction): QueryData => {
  return { ...state, measurements: action.measurements, laidOut: LayoutState.Measured };
};

export default updateMeasurements;
