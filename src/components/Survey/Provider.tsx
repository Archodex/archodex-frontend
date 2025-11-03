import React, { useEffect, useState } from 'react';
import SurveyContext from './Context';
import posthog, { Survey } from 'posthog-js';
import SurveyDialog from './SurveyDialog';
import SurveyName from './SurveyName';

interface SurveyProviderProps {
  children: React.ReactNode;
}

const SurveyProvider: React.FC<SurveyProviderProps> = ({ children }) => {
  const [surveys, setSurveys] = useState<Survey[] | undefined>(undefined);
  const [surveyName, setSurveyName] = useState<SurveyName | undefined>(undefined);
  const [survey, setSurvey] = useState<Survey | undefined>(undefined);

  const openSurvey = (name: SurveyName) => {
    setSurveyName(name);
    posthog.capture('survey_opened', { surveyName: name });
  };

  const closeSurvey = () => {
    posthog.capture('survey_closed', { surveyName });
    setSurveyName(undefined);
  };

  useEffect(() => {
    posthog.getSurveys((surveys) => {
      setSurveys(surveys);
    });
  }, [surveyName]);

  useEffect(() => {
    if (!surveyName || !surveys) {
      setSurvey(undefined);
      return;
    }

    const survey = surveys.find((s) => s.name === surveyName.toString());
    if (survey) {
      setSurvey(survey);
    } else {
      throw new Error(`Survey with name "${surveyName}" not found.`);
    }
  }, [surveyName, surveys]);

  const value = { surveyName, openSurvey, closeSurvey };

  return (
    <SurveyContext.Provider value={value}>
      {children}
      {survey && <SurveyDialog survey={survey} onDialogClosed={closeSurvey} />}
    </SurveyContext.Provider>
  );
};

export default SurveyProvider;
