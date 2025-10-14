import { QueryData, QueryDataActions } from '..';

/**
 * Action to reinitialize the QueryData state with a new state.
 *
 * @public
 */
export interface ReinitializeAction {
  /** The action type identifier */
  action: typeof QueryDataActions.Reinitialize;
  /** The new state to reinitialize with */
  state: QueryData;
}

/**
 * Reinitializes the QueryData state with a new state.
 *
 * @param action - Action containing the new state to reinitialize with
 * @returns The new QueryData state from the action
 */
const reinitialize = (action: ReinitializeAction): QueryData => ({ ...action.state });

export default reinitialize;
