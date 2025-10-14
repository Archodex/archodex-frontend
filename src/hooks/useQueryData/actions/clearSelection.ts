import { QueryDataActions } from '..';
import clearSelection from '../clearSelection';

/**
 * Action to clear all selections (resources, edges, and issues) from the state.
 *
 * @public
 */
export interface ClearSelectionAction {
  /** The action type identifier */
  action: typeof QueryDataActions.ClearSelection;
}

// Re-export the clearSelection reducer util function as the action handler
export default clearSelection;
