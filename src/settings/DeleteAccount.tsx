import { AccountRoutesContext } from '@/AccountRoutes';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from '@/hooks/use-toast';
import { invalidateAccountsLoaderData } from '@/lib/accountsLoader';
import { accountsUrl } from '@/lib/utils';
import { SettingsLoaderData } from '@/settingsLoader';
import { DropdownMenuItem } from '@radix-ui/react-dropdown-menu';
import { ChevronDown, Loader2 } from 'lucide-react';
import posthog from 'posthog-js';
import React, { useCallback, useState } from 'react';
import { useLoaderData, useNavigate, useOutletContext, useRevalidator } from 'react-router';

const DeleteAccount: React.FC = () => {
  const accountContext = useOutletContext<AccountRoutesContext>();
  const settingsData = useLoaderData<SettingsLoaderData>();
  const revalidator = useRevalidator();
  const navigate = useNavigate();
  const [deleteDisabled, setDeleteDisabled] = useState(false);
  const [statusToast, setStatusToast] = useState<ReturnType<typeof toast> | undefined>();

  const handleDeleteAccount = useCallback(
    async ({ deleteGlobalAccountRecordOnly }: { deleteGlobalAccountRecordOnly?: boolean } = {}) => {
      statusToast?.dismiss();
      setStatusToast(undefined);
      setDeleteDisabled(true);

      // First delete account on self-hosted instance if this is a self-hosted account
      if (accountContext.isSelfHosted() && !deleteGlobalAccountRecordOnly) {
        let deleteResponse;
        try {
          deleteResponse = await fetch(accountContext.apiUrl(`/account/${accountContext.account.id}`), {
            method: 'DELETE',
          });
        } catch (error) {
          posthog.captureException(error);

          console.error(`Failed to delete account from self-hosted instance: ${String(error)}`);
          setStatusToast(
            toast({
              title: 'Deleting account from self-hosted instance failed',
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
          setDeleteDisabled(false);
          return;
        }

        if (!deleteResponse.ok) {
          let errorMessage;

          try {
            const errorJson = (await deleteResponse.json()) as { message: string };
            errorMessage = errorJson.message;
          } catch (err) {
            console.error(`Failed to deserialize delete account response from self-hosted instance: ${String(err)}`);
            errorMessage = `${String(deleteResponse.status)} ${deleteResponse.statusText}`;
          }

          posthog.captureException(new Error(`Failed to delete account from self-hosted instance: ${errorMessage}`));

          console.error(`Failed to delete account from self-hosted instance: ${errorMessage}`);

          setStatusToast(
            toast({
              title: 'Deleting account from self-hosted instance failed',
              description: errorMessage,
              duration: Infinity,
              variant: 'destructive',
            }),
          );

          setDeleteDisabled(false);
          return;
        }
      }

      // Send self-hosted global account record deletion requests to the default archodex.com region ('us-west-2'). Any
      // region will work because every regional archodex.com endpoint can update the global account records.
      //
      // Send archodex.com managed account deletion requests to the account's endpoint, as we must both delete the
      // account record and the customer data held in that region.
      const globalAccountsUrl = accountContext.isSelfHosted()
        ? accountsUrl({ accountId: accountContext.account.id })
        : accountsUrl({ endpoint: accountContext.account.endpoint });

      // Delete the account (or the account record if self-hosted) from the global Archodex service
      let deleteResponse;
      try {
        deleteResponse = await fetch(globalAccountsUrl, { method: 'DELETE' });
      } catch (error) {
        posthog.captureException(error);

        console.error(`Failed to delete account from the global Archodex service: ${String(error)}`);
        setStatusToast(
          toast({
            title: 'Deleting account from the global Archodex service failed',
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
        setDeleteDisabled(false);
        return;
      }

      if (!deleteResponse.ok) {
        let errorMessage;

        try {
          const errorJson = (await deleteResponse.json()) as { message: string };
          errorMessage = errorJson.message;
        } catch (err) {
          console.error(`Failed to deserialize archodex.com delete account response: ${String(err)}`);
          errorMessage = `${String(deleteResponse.status)} ${deleteResponse.statusText}`;
        }

        posthog.captureException(
          new Error(`Failed to delete account from the global Archodex service: ${errorMessage}`),
        );

        console.error(`Failed to delete account from the global Archodex service: ${errorMessage}`);

        setStatusToast(
          toast({
            title: 'Deleting account from the global Archodex service failed',
            description: errorMessage,
            duration: Infinity,
            variant: 'destructive',
          }),
        );

        setDeleteDisabled(false);
        return;
      }

      posthog.capture('account_deleted');

      invalidateAccountsLoaderData();
      void revalidator.revalidate();
      void navigate(`/`);
    },
    [accountContext, navigate, revalidator, statusToast],
  );

  return (
    <>
      <h2 className="scroll-m-20 border-b pb-2 text-3xl font-semibold first:mt-0 my-6">Delete Account</h2>
      <Dialog onOpenChange={statusToast?.dismiss}>
        <DialogTrigger asChild>
          <Button>Delete Account</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Account {accountContext.account.id}</DialogTitle>
          </DialogHeader>
          {dialogDescription(accountContext, settingsData.account_initialized)}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <ArchodexAccountDeleteButton
              isSelfHosted={accountContext.isSelfHosted()}
              isInitialized={settingsData.account_initialized}
              deleteDisabled={deleteDisabled}
              deleteAccount={() => void handleDeleteAccount()}
              deleteAccountGlobalRecordOnly={() => void handleDeleteAccount({ deleteGlobalAccountRecordOnly: true })}
            />
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

const dialogDescription = (accountContext: AccountRoutesContext, isInitialized: boolean) => {
  if (accountContext.isSelfHosted() && isInitialized) {
    return (
      <div>
        <p>
          Are you sure you want to delete this account on self-hosted instance <b>{accountContext.account.endpoint}</b>?
        </p>
        <p>
          This will first attempt to delete the account on the self-hosted server, and then will delete the account
          record from the global Archodex service.
        </p>
      </div>
    );
  } else if (accountContext.isSelfHosted() && !isInitialized) {
    return (
      <div>
        <p>
          Are you sure you want to delete account <b>{accountContext.account.id}</b> for self-hosted instance{' '}
          <b>{accountContext.account.endpoint}</b>?
        </p>
        <p>
          The account was not found on the self-hosted instance, or the instance was not reachable, so this will only
          delete the account record from the global Archodex service.
        </p>
      </div>
    );
  } else {
    return <p>Are you sure you want to delete this account?</p>;
  }
};

interface ArchodexAccountDeleteButtonProps {
  isSelfHosted: boolean;
  isInitialized: boolean;
  deleteDisabled: boolean;
  deleteAccount: () => void;
  deleteAccountGlobalRecordOnly: () => void;
}

const ArchodexAccountDeleteButton: React.FC<ArchodexAccountDeleteButtonProps> = ({
  isSelfHosted,
  isInitialized,
  deleteDisabled,
  deleteAccount,
  deleteAccountGlobalRecordOnly,
}) => {
  if (isSelfHosted && isInitialized) {
    return (
      <div className="bg-destructive group/buttons relative flex rounded-lg *:[[data-slot=button]]:focus-visible:relative *:[[data-slot=button]]:focus-visible:z-10">
        <Button variant="destructive" className="pr-0" onClick={deleteAccount} disabled={deleteDisabled}>
          {deleteDisabled && <Loader2 className="animate-spin" />}
          Delete Account
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="destructive" className="peer p-1" disabled={deleteDisabled}>
              <ChevronDown className="text-destructive-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-destructive text-destructive-foreground border-destructive">
            <DropdownMenuItem onClick={deleteAccountGlobalRecordOnly}>
              Only Delete Global Account Record
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  } else {
    return (
      <Button
        variant="destructive"
        onClick={isSelfHosted ? deleteAccountGlobalRecordOnly : deleteAccount}
        disabled={deleteDisabled}
      >
        {deleteDisabled && <Loader2 className="animate-spin" />}
        Delete Account
      </Button>
    );
  }
};

export default DeleteAccount;
