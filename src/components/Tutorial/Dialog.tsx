import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Tutorial, TutorialDialogStepDefinition, TutorialSelectionDialogStepDefinition } from './Content';
import { TutorialCallbacksState } from './CallbacksContext';
import { TutorialStepCommon } from './Context';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { redirectToAuth } from '@/lib/auth';

export type TutorialDialogStep = TutorialStepCommon &
  (TutorialDialogStepDefinition | TutorialSelectionDialogStepDefinition);

export interface TutorialDialogProps {
  tutorialStep: TutorialDialogStep;
  showPrevButton: boolean;
  showNextButton: boolean;
  showFinishButton: boolean;
  tutorialCallbacks: TutorialCallbacksState;
}

const TutorialDialog: React.FC<TutorialDialogProps> = ({
  tutorialStep,
  showPrevButton,
  showNextButton,
  showFinishButton,
  tutorialCallbacks,
}) => (
  <Dialog defaultOpen onOpenChange={tutorialCallbacks.closeTutorial}>
    <DialogContent aria-describedby={undefined} className="not-dark:border-none">
      {tutorialStep.header && (
        <DialogHeader>
          <DialogTitle>{tutorialStep.header.title}</DialogTitle>
          {tutorialStep.header.description && <DialogDescription>{tutorialStep.header.description}</DialogDescription>}
        </DialogHeader>
      )}
      <div>
        {tutorialStep.type === 'dialog'
          ? tutorialStep.content
          : selectionContent(tutorialStep, tutorialCallbacks.selectTutorial)}
      </div>
      <DialogFooter className={showPrevButton ? 'justify-between!' : 'justify-end'}>
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
          <Button
            autoFocus
            onClick={() => {
              redirectToAuth({ signup: true });
            }}
          >
            Get Started
          </Button>
        )}
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

const selectionContent = (
  tutorialStep: TutorialSelectionDialogStepDefinition,
  selectTutorial: (tutorial: Tutorial) => void,
) => (
  <Accordion type="single" collapsible className="w-full">
    {tutorialStep.options.map((option, index) => (
      <AccordionItem key={index} value={option.tutorial}>
        <AccordionTrigger>{option.title}</AccordionTrigger>
        <AccordionContent className="pb-4">
          {option.content}
          <div className="flex justify-end">
            <Button
              onClick={() => {
                selectTutorial(option.tutorial);
              }}
            >
              Let’s go!
            </Button>
          </div>
        </AccordionContent>
      </AccordionItem>
    ))}
  </Accordion>
);

export default TutorialDialog;
