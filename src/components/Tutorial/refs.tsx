import { TutorialStateRefs } from './Context';

interface TutorialRefDefinition {
  isInPath?: string;
  isInListTab?: string;
}

export const tutorialRefDefinitions = {
  selectNode: {},
  graphView: {},
  listView: {},
  prodStripeSecretAlert: { isInPath: '/:accountId/secrets' },
  prodStripeSecretIssueHardcoded: { isInPath: '/:accountId/secrets/issues', isInListTab: 'issues' },
  prodStripeSecretIssueMultipleHelds: { isInPath: '/:accountId/secrets/issues', isInListTab: 'issues' },
  sendGridSecret: { isInPath: '/:accountId/secrets' },
  sendGridSecretAddEnvironment: { isInPath: '/:accountId/secrets' },
  sendGridSecretAddEnvironmentDialog: { isInPath: '/:accountId/secrets' },
  sendGridSecretAlert: { isInPath: '/:accountId/secrets' },
  sendGridSecretIssue: { isInPath: '/:accountId/secrets/issues', isInListTab: 'issues' },
} as const satisfies Record<string, TutorialRefDefinition>;

export type TutorialRefs = (typeof tutorialRefDefinitions)[keyof typeof tutorialRefDefinitions];

export type TutorialRefNames = keyof typeof tutorialRefDefinitions;
export const tutorialRefNames = Object.keys(tutorialRefDefinitions) as readonly TutorialRefNames[];

export const tutorialStateEmptyRefs = tutorialRefNames.reduce<TutorialStateRefs>((acc, ref) => {
  acc[ref] = null;
  return acc;
}, {} as TutorialStateRefs);

export default tutorialRefDefinitions as Record<TutorialRefNames, TutorialRefDefinition>;
