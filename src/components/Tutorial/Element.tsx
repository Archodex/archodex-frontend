import React, { useContext, useEffect } from 'react';
import TutorialDialog from './Dialog';
import TutorialPopover from './Popover';
import { generatePath, useLocation, useMatches, useNavigate } from 'react-router';
import { Button } from '../ui/button';
import { useSidebar } from '../ui/sidebar';
import TutorialContext from './Context';
import TutorialCallbacksContext from './CallbacksContext';

const TutorialElement: React.FC = () => {
  const { currentStep, closed, atEnd, refs } = useContext(TutorialContext);
  const tutorialCallbacksContext = useContext(TutorialCallbacksContext);
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
      <Button
        // Default bg has a hover mixin with transparency
        className="fixed z-40 bottom-10 right-10 hover:bg-primary"
        onClick={atEnd ? tutorialCallbacksContext.restartTutorial : tutorialCallbacksContext.resumeTutorial}
      >
        {atEnd ? 'Restart Tutorial' : 'Resume Tutorial'}
      </Button>
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
