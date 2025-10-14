import { LayoutState, QueryData, QueryDataActions } from '..';

/**
 * Action to transition the layout state from Initial to InitialRenderCompleted.
 * This signals that React Flow Node measurements are available for layout.
 *
 * @public
 */
export interface InitialRenderCompletedAction {
  /** The action type identifier */
  action: typeof QueryDataActions.InitialRenderCompleted;
}

/**
 * Transitions the layout state from Initial to InitialRenderCompleted. This is
 * used to signal that React Flow Node measurements are available for layout. If
 * the current state is not `LayoutState.Initial`, it returns the state
 * unchanged.
 *
 * @param state - Current QueryData state
 * @returns Updated QueryData with laidOut set to InitialRenderCompleted, or unchanged state
 */
const initialRenderCompleted = (state: QueryData): QueryData => {
  if (state.laidOut !== LayoutState.Initial) {
    return state;
  }

  return { ...state, laidOut: LayoutState.InitialRenderCompleted };
};

export default initialRenderCompleted;
