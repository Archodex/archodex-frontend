import { createContext } from 'react';
import { UIMatch } from 'react-router';

import { TutorialDialogStep } from './Dialog';
import { TutorialPopoverStep } from './Popover';
import { tutorialStateEmptyRefs, TutorialRefNames } from './refs';
import tutorialSteps, { Tutorial } from './Content';
import { OpenTagEnvironmentDialog } from './CallbacksContext';
import { QueryDataEvent } from '@/hooks/useQueryData';

export interface TutorialStepCommon {
  showPrevButton: (routeMatch: UIMatch) => boolean;
  showNextButton: (routeMatch: UIMatch) => boolean;
  showFinishButton: (routeMatch: UIMatch) => boolean;
  isInSidebar?: boolean;
  isInPath?: string;
}

export type TutorialStep = TutorialDialogStep | TutorialPopoverStep;

export type TutorialStateRefs = Record<TutorialRefNames, HTMLElement | null>;

export type QueuedStateUpdate =
  | { action: 'selectNode'; nodeId: string; selected: boolean }
  | { action: 'openTagEnvironmentDialog'; open: boolean }
  | { action: 'queryDataEvent'; event: QueryDataEvent };

export interface TutorialState {
  tutorialName: Tutorial;
  stepIndex: number;
  currentStep: TutorialStep;
  closed: boolean;
  atEnd: boolean;

  refs: TutorialStateRefs;
  openTagEnvironmentDialogRef: OpenTagEnvironmentDialog | null;
  queryDataDispatchRef: React.Dispatch<QueryDataEvent> | null;

  // State updates that will be applied when the above callback refs are set.
  queuedStateUpdates: QueuedStateUpdate[];
}

const TutorialContext = createContext<TutorialState>({
  tutorialName: Tutorial.Intro,
  stepIndex: 0,
  currentStep: {
    ...tutorialSteps[Tutorial.Intro][0],
    showPrevButton: () => false,
    showNextButton: () => false,
    showFinishButton: () => false,
    isInSidebar: false,
    isInPath: '',
  },
  closed: false,
  atEnd: false,
  refs: tutorialStateEmptyRefs,
  openTagEnvironmentDialogRef: () => {
    throw new Error('Open tag environment dialog ref not set in initial tutorial context');
  },
  queryDataDispatchRef: () => {
    throw new Error('Graph data dispatch ref not set in initial tutorial context');
  },
  queuedStateUpdates: [],
});

export default TutorialContext;
