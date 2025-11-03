import React, { useCallback } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import posthog, { DisplaySurveyType, Survey } from 'posthog-js';
import { GitHubLogoIcon } from '@radix-ui/react-icons';
import { ExternalLink } from 'lucide-react';

interface DialogProps {
  survey: Survey;
  onDialogClosed: () => void;
}

const SurveyDialog: React.FC<DialogProps> = ({ survey, onDialogClosed }) => {
  const displaySurvey = useCallback(
    (container: HTMLDivElement | null) => {
      if (!container) return;

      posthog.displaySurvey(survey.id, {
        displayType: DisplaySurveyType.Inline,
        ignoreConditions: true,
        ignoreDelay: true,
        selector: '#posthog-survey-container',
      });
    },
    [survey],
  );

  return (
    <Dialog
      defaultOpen
      onOpenChange={(open) => {
        if (!open) {
          onDialogClosed();
        }
      }}
    >
      <DialogContent aria-describedby={undefined} className="not-dark:border-none">
        <div id="posthog-survey-container" ref={displaySurvey} />
        <a
          className="absolute bottom-8 left-6 flex gap-1 items-center text-xs text-primary hover:underline"
          href="https://github.com/archodex/archodex/issues/new"
          target="_blank"
          rel="noreferrer"
        >
          <GitHubLogoIcon className="size-3" />
          Report Issue Instead
          <ExternalLink className="size-3" />
        </a>
      </DialogContent>
    </Dialog>
  );
};

export default SurveyDialog;
