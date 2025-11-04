import React, { useContext } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Tutorial, TutorialDialogStepDefinition, TutorialSelectionDialogStepDefinition } from './Content';
import { TutorialCallbacksState } from './CallbacksContext';
import { TutorialStepCommon } from './Context';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import FinishButton from './FinishButton';
import { NotebookPen } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import SurveyContext from '../Survey/Context';
import SurveyName from '../Survey/SurveyName';

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
}) => {
  const { openSurvey } = useContext(SurveyContext);

  return (
    <Dialog defaultOpen onOpenChange={tutorialCallbacks.closeTutorial}>
      <DialogContent aria-describedby={undefined} className="pt-11 not-dark:border-none">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              tabIndex={-1}
              variant="link"
              className="absolute right-9 top-3.5 p-1! h-auto text-foreground/70 hover:text-foreground"
              onClick={() => {
                tutorialCallbacks.closeTutorial();
                openSurvey(SurveyName.PlaygroundFeedback);
              }}
            >
              <NotebookPen className="size-[12px]" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Give Us Feedback</TooltipContent>
        </Tooltip>

        {tutorialStep.header && (
          <DialogHeader>
            <DialogTitle>{tutorialStep.header.title}</DialogTitle>
            {tutorialStep.header.description && (
              <DialogDescription>{tutorialStep.header.description}</DialogDescription>
            )}
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
          {showFinishButton && <FinishButton tutorialCallbacks={tutorialCallbacks} />}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

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
