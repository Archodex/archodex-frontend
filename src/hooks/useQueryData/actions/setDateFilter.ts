import { DateFilter, isDateFilterEqual } from '@/lib/dateFilter';
import { LayoutState, QueryData, QueryDataActions } from '..';
import initializer from '../initializer';
import clearSelection from '../clearSelection';
import { isPlayground } from '@/lib/utils';

/**
 * Action to set a new date filter and reinitialize the QueryData state.
 * Stores the filter in session storage and triggers a re-layout.
 *
 * @public
 */
export interface SetDateFilterAction {
  /** The action type identifier */
  action: typeof QueryDataActions.SetDateFilter;
  /** The new date filter to apply */
  dateFilter: DateFilter;
}

/**
 * Reinitializes the QueryData state with a new state.
 *
 * @param action - Action containing the new state to reinitialize with
 * @returns The new QueryData state from the action
 */
const setDateFilter = (state: QueryData, action: SetDateFilterAction): QueryData => {
  if (isDateFilterEqual(state.dateFilter, action.dateFilter)) {
    return state;
  }

  if (!isPlayground) {
    sessionStorage.setItem('dateFilter', JSON.stringify(action.dateFilter));
  }

  return initializer({ ...clearSelection(state), laidOut: LayoutState.Initial, dateFilter: action.dateFilter });
};

export default setDateFilter;
