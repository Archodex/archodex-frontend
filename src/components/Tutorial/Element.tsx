import React, { useContext, useEffect } from 'react';
import TutorialDialog from './Dialog';
import TutorialPopover from './Popover';
import { generatePath, useLocation, useMatches, useNavigate } from 'react-router';
import { Button } from '../ui/button';
import { useSidebar } from '../ui/sidebar';
import TutorialContext from './Context';
import TutorialCallbacksContext from './CallbacksContext';
import { NotebookPen } from 'lucide-react';
import SurveyContext from '../Survey/Context';
import SurveyName from '../Survey/SurveyName';
import { Tooltip, TooltipContent } from '../ui/tooltip';
import { TooltipTrigger } from '@radix-ui/react-tooltip';

const TutorialElement: React.FC = () => {
  const { currentStep, closed, atEnd, refs } = useContext(TutorialContext);
  const tutorialCallbacksContext = useContext(TutorialCallbacksContext);
  const { openSurvey } = useContext(SurveyContext);
  const routeMatch = useMatches().at(-1);
  const { isMobile, openMobile, setOpenMobile } = useSidebar();
  const location = useLocation();
  const [showPopover, setShowPopover] = React.useState(!currentStep.isInSidebar);
  const navigate = useNavigate();

  useEffect(() => {
    if (!closed && currentStep.isInPath) {
      const path = generatePath(currentStep.isInPath, routeMatch?.params);

      if (!location.pathname.startsWith(path)) {
        void navigate(path);
      }
    }
  }, [closed, currentStep.isInPath, location.pathname, navigate, routeMatch?.params]);

  // Delay the popover to allow the sidebar to open so it positions correctly
  useEffect(() => {
    if (isMobile) {
      if (currentStep.isInSidebar && !openMobile) {
        setShowPopover(false);
        setOpenMobile(true);
        setTimeout(() => {
          setShowPopover(true);
        }, 500);
      }
    } else {
      setShowPopover(true);
    }
  }, [currentStep.isInSidebar, isMobile, openMobile, setOpenMobile]);

  if (!routeMatch) {
    throw new Error('Missing route match in TutorialElement');
  }

  if (closed) {
    return (
      <div className="fixed z-40 bottom-10 right-10 flex gap-2">
        <Button onClick={atEnd ? tutorialCallbacksContext.restartTutorial : tutorialCallbacksContext.resumeTutorial}>
          {atEnd ? 'Start a Tutorial' : 'Resume Tutorial'}
        </Button>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              onClick={() => {
                openSurvey(SurveyName.PlaygroundFeedback);
              }}
            >
              <NotebookPen className="text-primary" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Give Us Feedback</TooltipContent>
        </Tooltip>
      </div>
    );
  }

  const props = {
    showPrevButton: currentStep.showPrevButton(routeMatch),
    showNextButton: currentStep.showNextButton(routeMatch),
    showFinishButton: currentStep.showFinishButton(routeMatch),
    tutorialCallbacks: tutorialCallbacksContext,
  };

  if (currentStep.type === 'dialog' || currentStep.type === 'selectionDialog') {
    return <TutorialDialog tutorialStep={currentStep} {...props} />;
  } else if (showPopover) {
    return <TutorialPopover anchor={refs[currentStep.anchorName]} tutorialStep={currentStep} {...props} />;
  } else {
    return null;
  }
};

export default TutorialElement;
