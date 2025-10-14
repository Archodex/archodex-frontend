import { createContext } from 'react';
import { TutorialRefNames } from './refs';
import { Tutorial } from './Content';
import { QueryDataEvent } from '@/hooks/useQueryData';

export type OpenTagEnvironmentDialog = (open: boolean) => void;

export interface TutorialCallbacksState {
  prevStep: () => void;
  advanceStep: () => void;
  selectTutorial: (tutorialName: Tutorial) => void;
  closeTutorial: () => void;
  resumeTutorial: () => void;
  restartTutorial: () => void;

  // These callbacks are used to set references to various elements or to
  // state-mutating functions that are used in the tutorial. These elements and
  // functions are not always available, as the Tutorial component is rendered
  // before the rest of the application is fully loaded, and/or Components may
  // only be rendered after certain steps in the tutorial are completed.
  refs: {
    elementRef: (name: TutorialRefNames) => React.RefCallback<HTMLElement>;
    openTagEnvironmentDialogRef: React.RefCallback<OpenTagEnvironmentDialog>;
    queryDataDispatchRef: React.RefCallback<React.Dispatch<QueryDataEvent>>;
  };
}

export type ElementRef = ReturnType<TutorialCallbacksState['refs']['elementRef']>;

const TutorialCallbacksContext = createContext<TutorialCallbacksState>({
  prevStep: () => {
    throw new Error('TutorialCallbacks default prevStep called');
  },
  advanceStep: () => {
    throw new Error('TutorialCallbacks default advanceStep called');
  },
  selectTutorial: () => {
    throw new Error('TutorialCallbacks default selectTutorial called');
  },
  closeTutorial: () => {
    throw new Error('TutorialCallbacks default closeTutorial called');
  },
  resumeTutorial: () => {
    throw new Error('TutorialCallbacks default resumeTutorial called');
  },
  restartTutorial: () => {
    throw new Error('TutorialCallbacks default restartTutorial called');
  },
  refs: {
    elementRef: () => {
      throw new Error('TutorialCallbacks default setRef called');
    },
    openTagEnvironmentDialogRef: () => {
      throw new Error('TutorialCallbacks default openTagEnvironmentDialog called');
    },
    queryDataDispatchRef: () => {
      throw new Error('TutorialCallbacks default queryDataDispatchRefCallback called');
    },
  },
});

export default TutorialCallbacksContext;
