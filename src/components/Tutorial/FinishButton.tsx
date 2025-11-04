import React, { useContext } from 'react';
import posthog from 'posthog-js';

import { Button } from '@/components/ui/button';
import { redirectToAuth } from '@/lib/auth';
import { ButtonGroup } from '@/components/ui/button-group';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { ChevronDownIcon, NotebookPen, Play, RefreshCcw } from 'lucide-react';
import { TutorialCallbacksState } from './CallbacksContext';
import SurveyContext from '../Survey/Context';
import SurveyName from '../Survey/SurveyName';

interface FinishButtonProps {
  tutorialCallbacks: TutorialCallbacksState;
}

const FinishButton: React.FC<FinishButtonProps> = ({ tutorialCallbacks }) => {
  const { openSurvey } = useContext(SurveyContext);

  return (
    <ButtonGroup className="w-full md:w-auto">
      <Button
        autoFocus
        className="grow"
        onClick={() => {
          posthog.capture('tutorial_keep_playing_clicked');
          tutorialCallbacks.closeTutorial();
        }}
      >
        Keep Playing
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="!pl-2">
            <ChevronDownIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="[--radius:1rem]">
          <DropdownMenuGroup>
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => {
                posthog.capture('tutorial_restart_tutorial_clicked');
                tutorialCallbacks.restartTutorial();
              }}
            >
              <RefreshCcw className="text-primary" />
              Try Another Tutorial
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => {
                redirectToAuth({ signup: true, newTab: true });
              }}
            >
              <Play className="text-primary" />
              Get Started
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => {
                tutorialCallbacks.closeTutorial();
                openSurvey(SurveyName.PlaygroundFeedback);
              }}
            >
              <NotebookPen className="text-primary" />
              Give Us Feedback
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </ButtonGroup>
  );
};

export default FinishButton;
