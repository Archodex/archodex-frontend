import React, { useEffect } from 'react';

import { Popover, PopoverAnchor, PopoverContent } from '../ui/popover';
import { PopoverArrow } from '@radix-ui/react-popover';
import { CardDescription, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { TutorialPopoverStepDefinition } from './Content';
import { X } from 'lucide-react';
import TutorialLightbox from './Lightbox';
import { TutorialCallbacksState } from './CallbacksContext';
import { TutorialStepCommon } from './Context';

export type TutorialPopoverStep = TutorialStepCommon & TutorialPopoverStepDefinition & { isInSidebar: boolean };

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
  const popoverContentRef = React.useRef<HTMLDivElement>(null);

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
          ref={popoverContentRef}
          side={tutorialStep.side}
          className={[
            'pt-4',
            tutorialStep.lightbox ? 'not-dark:border-none' : '',
            tutorialStep.contentClassName ?? '',
          ].join(' ')}
        >
          <button
            tabIndex={-1}
            onClick={() => {
              tutorialCallbacks.closeTutorial();
            }}
            className="absolute top-3 right-2 text-muted-foreground hover:text-foreground"
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
            {showFinishButton && (
              <Button autoFocus onClick={tutorialCallbacks.closeTutorial}>
                Close Tutorial
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>
      {tutorialStep.lightbox && <TutorialLightbox anchor={anchor} />}
    </>
  );
};

export default TutorialPopover;
