import React, { useCallback, useContext, useMemo, useReducer } from 'react';

import tutorials, { Tutorial, TutorialStateCallbacks, TutorialStepDefinition } from './Content';
import TutorialCallbacksContext, { ElementRef, OpenTagEnvironmentDialog } from './CallbacksContext';
import TutorialContext, { TutorialState, TutorialStep } from './Context';
import tutorialRefDefinitions, { tutorialStateEmptyRefs, TutorialRefNames, tutorialRefNames } from './refs';
import { QueryDataActions, QueryDataEvent } from '@/hooks/useQueryData';

const TutorialProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tutorialContext, dispatch] = useReducer(tutorialReducer, initialTutorialContext());
  const tutorialCallbacksContext = useContext(TutorialCallbacksContext);

  tutorialCallbacksContext.prevStep = useCallback(() => {
    dispatch({ action: 'prevStep' });
  }, []);

  tutorialCallbacksContext.advanceStep = useCallback(() => {
    dispatch({ action: 'advanceStep' });
  }, []);

  tutorialCallbacksContext.selectTutorial = useCallback((tutorialName: Tutorial) => {
    dispatch({ action: 'selectTutorial', tutorialName });
  }, []);

  tutorialCallbacksContext.closeTutorial = useCallback(() => {
    dispatch({ action: 'closeTutorial' });
  }, []);

  tutorialCallbacksContext.resumeTutorial = useCallback(() => {
    dispatch({ action: 'resumeTutorial' });
  }, []);

  tutorialCallbacksContext.restartTutorial = useCallback(() => {
    dispatch({ action: 'restartTutorial' });
  }, []);

  const refCallbacks = useMemo(() => {
    return tutorialRefNames.reduce<Record<TutorialRefNames, ElementRef>>(
      (acc, key) => {
        acc[key] = (value: HTMLElement | null) => {
          dispatch({ action: 'setElementRef', name: key, value });
        };
        return acc;
      },
      {} as Record<TutorialRefNames, ElementRef>,
    );
  }, []);

  tutorialCallbacksContext.refs.openTagEnvironmentDialogRef = useCallback((value: OpenTagEnvironmentDialog | null) => {
    dispatch({ action: 'setOpenTagEnvironmentDialogRef', value });
  }, []);

  tutorialCallbacksContext.refs.queryDataDispatchRef = useCallback((value: React.Dispatch<QueryDataEvent> | null) => {
    dispatch({ action: 'setQueryDataDispatchRef', value });
  }, []);

  tutorialCallbacksContext.refs.elementRef = useCallback(
    (name: TutorialRefNames) => refCallbacks[name],
    [refCallbacks],
  );

  return (
    <TutorialContext.Provider value={tutorialContext}>
      <TutorialCallbacksContext.Provider value={tutorialCallbacksContext}>{children}</TutorialCallbacksContext.Provider>
    </TutorialContext.Provider>
  );
};

const getNextStep = (tutorial: Tutorial, stepIndex: number): TutorialStep => {
  const tutorialSteps = tutorials[tutorial];
  if (stepIndex < 0 || stepIndex >= tutorialSteps.length) {
    throw new Error(`Invalid step index ${String(stepIndex)} for tutorial ${tutorial}`);
  }

  const stepDefinition = tutorialSteps[stepIndex];

  const callbacks = {
    showPrevButton: stepDefinition.showPrevButton ?? (() => stepIndex > 0 || tutorial !== Tutorial.Intro),
    showNextButton: stepDefinition.showNextButton ?? (() => stepIndex < tutorialSteps.length - 1),
    showFinishButton:
      stepDefinition.showFinishButton ?? (() => stepIndex === tutorialSteps.length - 1 && tutorial !== Tutorial.Intro),
    stateUpdate: stepDefinition.stateUpdate ?? (() => undefined),
  };

  if (stepDefinition.type === 'popover') {
    return {
      ...stepDefinition,
      ...callbacks,
      isInSidebar: !!tutorialRefDefinitions[stepDefinition.anchorName].isInSidebar,
      isInPath: tutorialRefDefinitions[stepDefinition.anchorName].isInPath,
    };
  } else {
    return { ...stepDefinition, ...callbacks };
  }
};

const stateCallbacks = (tutorialState: TutorialState): TutorialStateCallbacks => ({
  openTagEnvironmentDialog:
    tutorialState.openTagEnvironmentDialogRef ??
    ((open: boolean) => {
      tutorialState.queuedStateUpdates.push({ action: 'openTagEnvironmentDialog', open });
    }),
  queryDataDispatch:
    tutorialState.queryDataDispatchRef ??
    ((event: QueryDataEvent) => {
      tutorialState.queuedStateUpdates.push({ action: 'queryDataEvent', event });
    }),
});

const initialTutorialContext = (): TutorialState => {
  const tutorialNameState = (sessionStorage.getItem('tutorialName') as Tutorial | null) ?? Tutorial.Intro;
  const tutorialStepIndexState = Number(sessionStorage.getItem('tutorialStepIndex')) || 0;

  let tutorialName: Tutorial;
  let tutorialSteps: TutorialStepDefinition[];
  let tutorialStepIndex: number;
  if (!Object.values(Tutorial).includes(tutorialNameState)) {
    tutorialName = Tutorial.Intro;
    tutorialSteps = tutorials[tutorialName];
    tutorialStepIndex = 0;
  } else if (tutorialStepIndexState < 0 || tutorialStepIndexState >= tutorials[tutorialNameState].length) {
    tutorialName = tutorialNameState;
    tutorialSteps = tutorials[tutorialName];
    tutorialStepIndex = 0;
  } else {
    tutorialName = tutorialNameState;
    tutorialSteps = tutorials[tutorialName];
    tutorialStepIndex = tutorialStepIndexState;
  }

  const atEnd = tutorialStepIndex === tutorialSteps.length - 1 && tutorialName !== Tutorial.Intro;

  if (sessionStorage.getItem('tutorialClosed') === 'true') {
    return {
      tutorialName,
      stepIndex: tutorialStepIndex,
      currentStep: getNextStep(tutorialName, tutorialStepIndex),
      closed: true,
      atEnd,
      refs: { ...tutorialStateEmptyRefs },
      openTagEnvironmentDialogRef: null,
      queryDataDispatchRef: null,
      queuedStateUpdates: [],
    };
  }

  const state: TutorialState = {
    tutorialName,
    stepIndex: tutorialStepIndex,
    currentStep: getNextStep(tutorialName, tutorialStepIndex),
    closed: false,
    atEnd,
    refs: { ...tutorialStateEmptyRefs },
    openTagEnvironmentDialogRef: null,
    queryDataDispatchRef: null,
    queuedStateUpdates: [],
  };

  // Progress state updates for all previous steps
  for (const step of tutorialSteps.slice(0, tutorialStepIndex)) {
    step.stateUpdate?.(stateCallbacks(state), false);
  }

  return state;
};

const processQueuedStateUpdates = (state: TutorialState) => {
  queuedUpdateLoop: while (state.queuedStateUpdates.length > 0) {
    switch (state.queuedStateUpdates[0].action) {
      case 'selectNode':
        if (state.queryDataDispatchRef) {
          state.queryDataDispatchRef({
            action: state.queuedStateUpdates[0].selected
              ? QueryDataActions.SelectResource
              : QueryDataActions.DeselectResource,
            resourceId: state.queuedStateUpdates[0].nodeId,
          });
          state.queuedStateUpdates.shift();
        } else {
          break queuedUpdateLoop;
        }
        break;

      case 'openTagEnvironmentDialog':
        if (state.openTagEnvironmentDialogRef) {
          state.openTagEnvironmentDialogRef(state.queuedStateUpdates[0].open);
          state.queuedStateUpdates.shift();
        } else {
          break queuedUpdateLoop;
        }
        break;

      case 'queryDataEvent':
        if (state.queryDataDispatchRef) {
          state.queryDataDispatchRef(state.queuedStateUpdates[0].event);
          state.queuedStateUpdates.shift();
        } else {
          break queuedUpdateLoop;
        }
        break;
    }
  }
};

type TutorialReducerArg =
  | { action: 'prevStep' | 'advanceStep' | 'closeTutorial' | 'resumeTutorial' | 'restartTutorial' }
  | { action: 'setElementRef'; name: TutorialRefNames; value: HTMLElement | null }
  | { action: 'setOpenTagEnvironmentDialogRef'; value: OpenTagEnvironmentDialog | null }
  | { action: 'setQueryDataDispatchRef'; value: React.Dispatch<QueryDataEvent> | null }
  | { action: 'selectTutorial'; tutorialName: Tutorial };
const tutorialReducer: React.Reducer<TutorialState, TutorialReducerArg> = (state, arg) => {
  let tutorialName = state.tutorialName;
  let stepIndex: number;
  const tutorialSteps = tutorials[tutorialName];

  switch (arg.action) {
    case 'prevStep': {
      if (state.stepIndex === 0) {
        if (state.tutorialName !== Tutorial.Intro) {
          tutorialName = Tutorial.Intro;
          stepIndex = tutorials[tutorialName].length - 1; // Go to the last step of the Intro tutorial
        } else {
          throw new Error('Cannot go back to previous step when already at the first step of the tutorial');
        }
      } else {
        stepIndex = state.stepIndex - 1;
      }

      sessionStorage.setItem('tutorialName', tutorialName);
      sessionStorage.setItem('tutorialStepIndex', stepIndex.toString());

      const newState: TutorialState = {
        ...state,
        tutorialName,
        stepIndex,
        currentStep: getNextStep(tutorialName, stepIndex),
        atEnd: false,
      };

      // Revert any state changes from the current step
      tutorials[tutorialName][stepIndex].stateUpdate?.(stateCallbacks(newState), true);

      return newState;
    }

    case 'advanceStep': {
      const nextStepIndex = state.stepIndex + 1;
      sessionStorage.setItem('tutorialName', tutorialName);
      sessionStorage.setItem('tutorialStepIndex', nextStepIndex.toString());

      return {
        ...state,
        stepIndex: nextStepIndex,
        currentStep: getNextStep(state.tutorialName, nextStepIndex),
        atEnd: nextStepIndex >= tutorialSteps.length - 1 && tutorialName !== Tutorial.Intro,
      };
    }

    case 'selectTutorial': {
      tutorialName = arg.tutorialName;
      stepIndex = 0;

      sessionStorage.setItem('tutorialName', tutorialName);
      sessionStorage.setItem('tutorialStepIndex', stepIndex.toString());

      return {
        ...state,
        tutorialName,
        stepIndex,
        currentStep: getNextStep(tutorialName, stepIndex),
        closed: false,
        atEnd: false,
      };
    }

    case 'closeTutorial':
      sessionStorage.setItem('tutorialClosed', 'true');

      return {
        ...state,
        closed: true,
        atEnd: state.stepIndex === tutorialSteps.length - 1 && tutorialName !== Tutorial.Intro,
      };

    case 'resumeTutorial': {
      const newState: TutorialState = {
        ...initialTutorialContext(),
        refs: state.refs,
        closed: false,
        openTagEnvironmentDialogRef: state.openTagEnvironmentDialogRef,
        queuedStateUpdates: state.queuedStateUpdates,
      };

      sessionStorage.removeItem('tutorialClosed');

      for (const step of tutorialSteps.slice(0, state.stepIndex)) {
        step.stateUpdate?.(stateCallbacks(newState), false);
      }

      return newState;
    }

    case 'restartTutorial':
      sessionStorage.removeItem('tutorialClosed');
      sessionStorage.setItem('tutorialName', Tutorial.Intro);
      sessionStorage.setItem('tutorialStepIndex', '0');

      return {
        ...state,
        tutorialName: Tutorial.Intro,
        stepIndex: 0,
        currentStep: getNextStep(Tutorial.Intro, 0),
        closed: false,
        atEnd: false,
      };

    case 'setElementRef':
      return { ...state, refs: { ...state.refs, [arg.name]: arg.value } };

    case 'setOpenTagEnvironmentDialogRef': {
      const newState = { ...state, openTagEnvironmentDialogRef: arg.value };

      processQueuedStateUpdates(newState);

      return newState;
    }

    case 'setQueryDataDispatchRef': {
      const newState = { ...state, queryDataDispatchRef: arg.value };

      processQueuedStateUpdates(newState);

      return newState;
    }
  }
};

export default TutorialProvider;
