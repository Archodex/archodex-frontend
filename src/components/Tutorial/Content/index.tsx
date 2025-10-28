import React from 'react';

import ImageContent from './ImageContent';
import newJobImage from './newJob.png';
import uhOhImage from './uhOh.png';
import teammateImage from './teammate.png';
import { UIMatch } from 'react-router';
import { TutorialRefNames } from '../refs';
import { SIDE_OPTIONS } from '@radix-ui/react-popper';
import { OpenTagEnvironmentDialog } from '../CallbacksContext';
import { QueryDataActions, QueryDataEvent } from '@/hooks/useQueryData';
import { AccountRoutesContext } from '@/AccountRoutes';
import { AccountsLoaderData } from '@/lib/accountsLoader';

export interface TutorialStateCallbacks {
  openTagEnvironmentDialog: OpenTagEnvironmentDialog;
  queryDataDispatch: React.Dispatch<QueryDataEvent>;
}

interface TutorialStepDefinitionCommon {
  header?: { title: React.ReactNode; description?: React.ReactNode };
  contentClassName?: string;
  showPrevButton?: (routeMatch: UIMatch) => boolean;
  showNextButton?: (routeMatch: UIMatch) => boolean;
  showFinishButton?: (routeMatch: UIMatch) => boolean;
  stateUpdate?: (callbacks: TutorialStateCallbacks, revert: boolean) => void;
}

export interface TutorialDialogStepDefinition extends TutorialStepDefinitionCommon {
  type: 'dialog';
  content: React.ReactNode;
}

export interface TutorialSelectionDialogStepDefinition extends TutorialStepDefinitionCommon {
  type: 'selectionDialog';
  options: { title: string; tutorial: Tutorial; content: React.ReactNode }[];
}

export interface TutorialPopoverStepDefinition extends TutorialStepDefinitionCommon {
  type: 'popover';
  anchorName: TutorialRefNames;
  advanceOnAnchorClicked?: boolean;
  lightbox?: boolean;
  side?: (typeof SIDE_OPTIONS)[number];
  content: React.ReactNode;
}

export type TutorialStepDefinition =
  | TutorialDialogStepDefinition
  | TutorialSelectionDialogStepDefinition
  | TutorialPopoverStepDefinition;

export enum Tutorial {
  Intro = 'intro',
  HardcodedSecrets = 'hardcodedSecrets',
  CrossEnvironmentSecrets = 'crossEnvironmentSecrets',
}

const introTutorialSteps: TutorialStepDefinition[] = [
  {
    type: 'dialog',
    header: { title: 'Welcome to the Archodex Playground' },
    content: (
      <ImageContent imageSrc={newJobImage} altText="You and your new team excited to work together">
        <p>
          You just landed your dream role leading engineering at <b>Sprockets2U™</b>, a purveyor of the world’s finest
          sprockets. The team is buzzing. You’re pumped. Time to build cool things! 🚀
        </p>
      </ImageContent>
    ),
  },
  {
    type: 'dialog',
    header: { title: 'But before your first pull request...' },
    content: (
      <ImageContent imageSrc={uhOhImage} altText="You and a colleague huddle over laptop looking concerned">
        <p>
          Your new manager says the Sprockets2U website has had a bunch of outages and incidents recently. He’s
          wondering if you could help. You start looking at code and architecture diagrams (which were last updated over
          a year ago 😬) and see some concerning issues.
        </p>

        <p>
          The deeper you dig, the messier it gets. Hardcoded API keys. Credentials used across prod and qa environments.
        </p>
      </ImageContent>
    ),
  },
  {
    type: 'selectionDialog',
    header: { title: 'Choose your adventure' },
    options: [
      {
        title: 'Hardcoded Secrets 🔏',
        tutorial: Tutorial.HardcodedSecrets,
        content: (
          <p>
            Your teammate turns on <b>GitHub Secret Scanning</b> and uncovers... problems 😬. But how can we make sure
            we don’t cause an incident when rotating hardcoded secrets?
          </p>
        ),
      },
      {
        title: 'Secrets Accessed Across Environments 📧🔀😱',
        tutorial: Tutorial.CrossEnvironmentSecrets,
        content: (
          <p>
            Last month <b>Sprockets2U</b> emailed all its customers with a scary email that was only meant to be sent to
            test accounts in the qa environment. Why did this happen, and how can we prevent it from happening again?
          </p>
        ),
      },
    ],
  },
];

const hardcodedSecretsTutorialSteps: TutorialStepDefinition[] = [
  {
    type: 'dialog',
    header: { title: 'Hardcoded Secrets 🔏' },
    content: (
      <ImageContent imageSrc={teammateImage} altText="A teammate shows you Archodex">
        <p>
          After poking around you found a secret hardcoded in one of the source repositories. But you’re not sure how to
          rotate it without causing an incident.
        </p>

        <p>
          A teammate recently added <b>Archodex</b> to your environment. Archodex tracks all the secrets used by your
          services, helping you figure out which ones are used where. Archodex can even give you a plan of attack to
          resolve any secrets issues!
        </p>

        <p>Let’s take a look...</p>
      </ImageContent>
    ),
  },
  {
    type: 'popover',
    content: (
      <>
        <p>
          This is the <b>Map View</b>. It will update dynamically to highlight resources and events as you investigate
          issues.
        </p>
        <p>When you’re ready, click the &quot;Next&quot; button to continue to the List View.</p>
      </>
    ),
    anchorName: 'graphView',
    contentClassName: 'w-100',
    lightbox: true,
  },
  {
    type: 'popover',
    content: (
      <>
        <p>
          This is the <b>List View</b>. You can search for and find details about Resources, Events, and Issues.
        </p>
        <p>When you’re ready, click the &quot;Next&quot; button to start investigating issues with our secrets.</p>
      </>
    ),
    anchorName: 'listView',
    lightbox: true,
  },
  {
    type: 'popover',
    content: (
      <p>
        <i>Oops!</i> What’s wrong with this secret value? Let’s click on the alert to find out.
      </p>
    ),
    anchorName: 'prodStripeSecretAlert',
    advanceOnAnchorClicked: true,
    showNextButton: () => false,
    lightbox: true,
    side: 'top',
  },
  {
    type: 'popover',
    content: (
      <>
        <p>Aaah! This secret is hardcoded in our repo 😬.</p>
        <p className="text-muted-foreground text-sm">
          Note: Archodex never saves your actual secret values. The ID we see here for the Secret Value,{' '}
          <code>2659c91</code>, is an account-specific hash of the real value. If you click through to the source code
          you’ll see the actual value of our Stripe API key is:
          <br />
          <b>
            <code>
              sk_
              <span />
              live_
              <span />
              ef2fh0Ho3LqXleqUz2DEWhEj
            </code>
          </b>
        </p>
      </>
    ),
    contentClassName: 'w-100',
    anchorName: 'prodStripeSecretIssueHardcoded',
    lightbox: true,
  },
  {
    type: 'popover',
    content: (
      <>
        <p>It looks like we also have this secret value in our HashiCorp Vault!</p>
        <p className="text-muted-foreground text-sm">
          Thankfully, Archodex helped us realize that to rotate this secret we’ll need to update two locations: the
          secret&nbsp;
          <b>
            <code>prod/stripe</code>
          </b>{' '}
          in our HashiCorp Vault, and the subscriptions service code in our{' '}
          <b>
            <i>Archodex/microservices-demo</i>
          </b>{' '}
          repo. 👨‍💻
        </p>
      </>
    ),
    contentClassName: 'w-100',
    anchorName: 'prodStripeSecretIssueMultipleHelds',
    lightbox: true,
  },
  {
    type: 'dialog',
    header: { title: 'Planning with Full Knowledge' },
    content: (
      <>
        <p>
          With this knowledge from Archodex you build a plan to fix the hardcoding of the Stripe API key in the{' '}
          <b>subscriptions</b> service. As a good practice, you also plan to rotate the secret:
        </p>
        <ol className="ml-4 *:list-decimal list-inside space-y-2">
          <li>
            Update the <b>subscriptions</b> service to retrieve the Stripe API key from the secrets vault
          </li>
          <li>Generate a new Stripe API key</li>
          <li>
            Update the <b>prod/stripe</b> secret in the secrets vault with the new key
          </li>
          <li>
            Re-deploy the <b>subscriptions</b> and <b>payments</b> services to pick up the new secret value from the
            secrets vault
          </li>
          <li>Revoke the old Stripe API key</li>
        </ol>
      </>
    ),
  },
  {
    type: 'dialog' as const,
    header: { title: 'Congrats!' },
    content: (
      <>
        <p>Your plan worked perfectly! You successfully rotated a hardcoded secret without an outage.</p>
        <p>
          You’ve finished this Archodex tutorial. Feel free to continue poking around. Or, if you like what you see,
          click the button below to get started!
        </p>
      </>
    ),
  },
];

const crossEnvironmentSecretsTutorialSteps: TutorialStepDefinition[] = [
  {
    type: 'dialog',
    header: { title: 'Secrets Accessed Across Environments 📧🔀😱' },
    content: (
      <>
        <p>
          Recently, the Sprockets2U emailservice was refactored to use SendGrid for sending emails. Maybe this is
          related to the incident where test emails were sent to customers?
        </p>
        <p>Let’s investigate...</p>
      </>
    ),
  },
  {
    type: 'popover',
    content: (
      <>
        <p>Oh, a new secret was created for SendGrid, but it hasn’t been tagged with the environment it is part of.</p>
        <p>Click on the secret to select it.</p>
      </>
    ),
    anchorName: 'sendGridSecret',
    advanceOnAnchorClicked: true,
    showNextButton: () => false,
    lightbox: true,
    stateUpdate: ({ queryDataDispatch }, revert) => {
      const sendGridSecretId =
        '::Kubernetes Cluster::d77d838b-bdca-419f-9a55-71d8a8c34439::Namespace::vault::Service::vault::HashiCorp Vault Service::vault.vault::Secrets Engine Mount::vault::Secret::prod/sendgrid';
      if (revert) {
        queryDataDispatch({ action: QueryDataActions.DeselectResource, resourceId: sendGridSecretId });
      } else {
        queryDataDispatch({ action: QueryDataActions.SelectResource, resourceId: sendGridSecretId, refitView: false });
      }
    },
  },
  {
    type: 'popover',
    content: (
      <>
        <p>
          This secret is used by the production emailservice. Click on this <i>add environment tag</i> button to add the{' '}
          <i>prod</i> environment tag to this secret.
        </p>
      </>
    ),
    anchorName: 'sendGridSecretAddEnvironment',
    advanceOnAnchorClicked: true,
    showNextButton: () => false,
    lightbox: true,
    stateUpdate: ({ openTagEnvironmentDialog }, revert) => {
      if (revert) {
        openTagEnvironmentDialog(false);
      } else {
        openTagEnvironmentDialog(true);
      }
    },
  },
  {
    type: 'popover',
    content: (
      <>
        <p>
          Select <i>prod</i> to tag the environment to the secret.
        </p>
      </>
    ),
    anchorName: 'sendGridSecretAddEnvironmentDialog',
    advanceOnAnchorClicked: true,
    showNextButton: () => false,
    lightbox: true,
    stateUpdate: ({ queryDataDispatch, openTagEnvironmentDialog }, revert) => {
      const accountsLoaderData = new AccountsLoaderData();
      const accountContext = new AccountRoutesContext(
        accountsLoaderData,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        accountsLoaderData.first()!,
      );
      const resourceId = [
        { type: 'Kubernetes Cluster', id: 'd77d838b-bdca-419f-9a55-71d8a8c34439' },
        { type: 'Namespace', id: 'vault' },
        { type: 'Service', id: 'vault' },
        { type: 'HashiCorp Vault Service', id: 'vault.vault' },
        { type: 'Secrets Engine Mount', id: 'vault' },
        { type: 'Secret', id: 'prod/sendgrid' },
      ];

      if (revert) {
        queryDataDispatch({
          action: QueryDataActions.UntagEnvironment,
          accountContext: accountContext,
          resourceId,
          environment: 'prod',
        });
        openTagEnvironmentDialog(true);
      } else {
        queryDataDispatch({
          action: QueryDataActions.TagEnvironment,
          accountContext: accountContext,
          resourceId,
          environment: 'prod',
        });
        openTagEnvironmentDialog(false);
      }
    },
  },
  {
    type: 'popover',
    content: (
      <>
        <p>
          Oh! Tagging the SendGrid Secret with the <b>prod</b> environment created a new issue.
        </p>
        <p>Click on this new alert to learn more.</p>
      </>
    ),
    anchorName: 'sendGridSecretAlert',
    advanceOnAnchorClicked: true,
    showNextButton: () => false,
    lightbox: true,
    side: 'top',
  },
  {
    type: 'popover',
    content: (
      <>
        <p>
          Ah... here is what led to test emails being sent to our customers. Our <b>qa</b> environment is using
          production SendGrid credentials!
        </p>
      </>
    ),
    anchorName: 'sendGridSecretIssue',
    lightbox: true,
  },
  {
    type: 'dialog',
    header: { title: 'Planning with Full Knowledge' },
    content: (
      <>
        <p>
          With this knowledge from Archodex you build a plan to stop using the production SendGrid API key in our{' '}
          <b>qa</b> environment by mocking out the API calls in our tests.
        </p>
      </>
    ),
  },
  {
    type: 'dialog',
    header: { title: 'Congrats!' },
    content: (
      <>
        <p>Your plan worked perfectly! Customers are no longer receiving scary test emails.</p>
        <p>
          You’ve finished this Archodex tutorial. Feel free to continue poking around. Or, if you like what you see,
          click the button below to get started!
        </p>
      </>
    ),
  },
];

const tutorials: Record<Tutorial, TutorialStepDefinition[]> = {
  [Tutorial.Intro]: introTutorialSteps,
  [Tutorial.HardcodedSecrets]: hardcodedSecretsTutorialSteps,
  [Tutorial.CrossEnvironmentSecrets]: crossEnvironmentSecretsTutorialSteps,
};

export default tutorials;
