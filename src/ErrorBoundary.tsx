import { useNavigate, useRouteError } from 'react-router';
import { redirectToAuth } from './lib/auth';
import { useEffect } from 'react';
import { toast } from './hooks/use-toast';
import posthog from 'posthog-js';

export class AuthError extends Error {
  constructor() {
    super('Not authenticated');
  }
}

export class AccountUnreachableError extends Error {
  notificationMessage: React.ReactNode;
  accountId: string;

  constructor(notificationMessage: React.ReactNode, accountId: string) {
    super();
    this.notificationMessage = notificationMessage;
    this.accountId = accountId;
  }
}

function ErrorBoundary() {
  const error = useRouteError();
  const navigate = useNavigate();

  useEffect(() => {
    if (error instanceof AccountUnreachableError) {
      void navigate(`/${error.accountId}/settings`, { replace: true });
    }
  }, [error, navigate]);

  if (error instanceof AuthError) {
    console.debug('Redirecting to login...');
    redirectToAuth();
    return;
  }

  if (error instanceof AccountUnreachableError) {
    toast({
      title: `Account ${error.accountId} Unreachable`,
      description: error.notificationMessage,
      variant: 'destructive',
      duration: Infinity,
    });

    // We will redirect to the account settings page, see the useEffect above.
    return null;
  }

  posthog.captureException(error);

  console.error(error);

  return <p>Fail whale...</p>;
}

export default ErrorBoundary;
