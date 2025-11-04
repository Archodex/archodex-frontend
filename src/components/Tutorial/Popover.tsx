import React, { useContext, useEffect } from 'react';

import { Popover, PopoverAnchor, PopoverContent } from '../ui/popover';
import { PopoverArrow } from '@radix-ui/react-popover';
import { CardDescription, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { TutorialPopoverStepDefinition } from './Content';
import { NotebookPen, X } from 'lucide-react';
import TutorialLightbox from './Lightbox';
import { TutorialCallbacksState } from './CallbacksContext';
import { TutorialStepCommon } from './Context';
import FinishButton from './FinishButton';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import SurveyContext from '../Survey/Context';
import SurveyName from '../Survey/SurveyName';

export type TutorialPopoverStep = TutorialStepCommon & TutorialPopoverStepDefinition;

export interface TutorialPopoverProps {
  anchor: HTMLElement | null;
  tutorialStep: TutorialPopoverStep;
  showPrevButton: boolean;
  showNextButton: boolean;
  showFinishButton: boolean;
  tutorialCallbacks: TutorialCallbacksState;
}

const TutorialPopover: React.FC<TutorialPopoverProps> = ({
  anchor,
  tutorialStep,
  showPrevButton,
  showNextButton,
  showFinishButton,
  tutorialCallbacks,
}) => {
  const { openSurvey } = useContext(SurveyContext);
  const popoverContentRef = React.useRef<HTMLDivElement>(null);
  const [key, setKey] = React.useState(0);

  useEffect(() => {
    // Update key to force re-mount PopoverContent when tutorialStep changes
    setKey((prevKey) => prevKey + 1);
  }, [tutorialStep]);

  useEffect(() => {
    const event = tutorialStep.advanceOnAnchorClicked ? 'click' : 'mousedown';

    const handleMouseButtonCapture = (event: MouseEvent) => {
      if (anchor?.contains(event.target as Node)) {
        if (tutorialStep.advanceOnAnchorClicked) {
          tutorialCallbacks.advanceStep();
        }
      } else if (!popoverContentRef.current?.contains(event.target as Node)) {
        tutorialCallbacks.closeTutorial();
        event.stopPropagation();
      }
    };

    document.addEventListener(event, handleMouseButtonCapture, true);

    return () => {
      document.removeEventListener(event, handleMouseButtonCapture, true);
    };
  }, [anchor, tutorialCallbacks, tutorialStep, tutorialStep.advanceOnAnchorClicked]);

  if (!anchor) {
    return null;
  }

  return (
    <>
      <Popover open={true}>
        <PopoverAnchor virtualRef={{ current: anchor }} />
        <PopoverContent
          key={key}
          ref={popoverContentRef}
          side={tutorialStep.side}
          className={[
            'pt-4 data-[state=open]:delay-500 data-[state=open]:animate-in data-[state=open]:fill-mode-both data-[state=closed]:animate-none',
            tutorialStep.lightbox ? 'not-dark:border-none' : '',
            tutorialStep.contentClassName ?? '',
          ].join(' ')}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                tabIndex={-1}
                variant="link"
                className="absolute p-1! right-6 top-2.5 h-auto text-foreground/70 hover:text-foreground"
                onClick={() => {
                  tutorialCallbacks.closeTutorial();
                  openSurvey(SurveyName.PlaygroundFeedback);
                }}
              >
                <NotebookPen className="size-[12px]" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="z-[120]">Give Us Feedback</TooltipContent>
          </Tooltip>

          <button
            tabIndex={-1}
            onClick={() => {
              tutorialCallbacks.closeTutorial();
            }}
            className="absolute top-3 right-2 text-foreground/70 hover:text-foreground"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>

          <PopoverArrow width={20} height={10} className="fill-primary" />

          {tutorialStep.header && (
            <div className="mb-4">
              <CardTitle>{tutorialStep.header.title}</CardTitle>
              {tutorialStep.header.description && <CardDescription>{tutorialStep.header.description}</CardDescription>}
            </div>
          )}

          <div className="[&>p]:my-4 [&>p]:text-center">{tutorialStep.content}</div>

          <div className={`flex mt-4 gap-2 ${showPrevButton ? 'justify-between!' : 'justify-end'}`}>
            {showPrevButton && (
              <Button variant="outline" onClick={tutorialCallbacks.prevStep}>
                Previous
              </Button>
            )}
            {showNextButton && (
              <Button autoFocus onClick={tutorialCallbacks.advanceStep}>
                Next
              </Button>
            )}
            {showFinishButton && <FinishButton tutorialCallbacks={tutorialCallbacks} />}
          </div>
        </PopoverContent>
      </Popover>
      {tutorialStep.lightbox && <TutorialLightbox anchor={anchor} />}
    </>
  );
};

export default TutorialPopover;
