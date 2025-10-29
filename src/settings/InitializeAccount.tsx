import { AccountRoutesContext } from '@/AccountRoutes';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import posthog from 'posthog-js';
import React, { useCallback, useState } from 'react';
import { useOutletContext, useRevalidator } from 'react-router';

const InitializeAccount: React.FC = () => {
  const accountContext = useOutletContext<AccountRoutesContext>();
  const revalidator = useRevalidator();
  const [buttonDisabled, setButtonDisabled] = useState(false);
  const [statusToast, setStatusToast] = useState<ReturnType<typeof toast> | undefined>();

  const handleInitializeAccount = useCallback(async () => {
    statusToast?.dismiss();
    setStatusToast(undefined);
    setButtonDisabled(true);

    let initializeResponse;
    try {
      initializeResponse = await fetch(accountContext.apiUrl('/accounts'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id: accountContext.account.id }),
      });
    } catch (error) {
      posthog.captureException(error);

      console.error(`Failed to initialize account: ${String(error)}`);
      setStatusToast(
        toast({
          title: 'Initializing account failed',
          description: (
            <div>
              <p>{String(error)}</p>
              <p>(See browser console logs for additional details)</p>
            </div>
          ),
          duration: Infinity,
          variant: 'destructive',
        }),
      );
      setButtonDisabled(false);
      return;
    }

    if (!initializeResponse.ok) {
      let errorMessage;

      try {
        const errorJson = (await initializeResponse.json()) as { message: string };
        errorMessage = errorJson.message;
      } catch (err) {
        console.error(`Failed to deserialize initialize account response: ${String(err)}`);
        errorMessage = `${String(initializeResponse.status)} ${initializeResponse.statusText}`;
      }

      posthog.captureException(new Error(`Account initialization failed: ${errorMessage}`));

      console.error(`Failed to initialize account: ${errorMessage}`);

      setStatusToast(
        toast({
          title: 'Initializing account failed',
          description: errorMessage,
          duration: Infinity,
          variant: 'destructive',
        }),
      );

      setButtonDisabled(false);
      return;
    }

    posthog.capture('account_initialized');

    void revalidator.revalidate();
  }, [accountContext, revalidator, statusToast]);

  return (
    <>
      <h2 className="scroll-m-20 border-b pb-2 text-3xl font-semibold first:mt-0 my-6">Initialize Account</h2>
      <p>
        The account was not found at the self-hosted endpoint above. The account may have failed to initialize when it
        was created, but you can attempt to initialize it again. This operation is safe to run multiple times, and will
        not delete any existing data.
      </p>
      <Button
        disabled={buttonDisabled}
        onClick={() => {
          void handleInitializeAccount();
        }}
      >
        {buttonDisabled && <Loader2 className="animate-spin" />}
        Initialize Account
      </Button>
    </>
  );
};

export default InitializeAccount;
