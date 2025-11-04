import { createContext } from 'react';
import SurveyName from './SurveyName';

interface SurveyState {
  surveyName?: SurveyName;
  openSurvey: (name: SurveyName) => void;
  closeSurvey: () => void;
}

const initialState: SurveyState = { surveyName: undefined, openSurvey: () => null, closeSurvey: () => null };

const SurveyContext = createContext<SurveyState>(initialState);

export default SurveyContext;
