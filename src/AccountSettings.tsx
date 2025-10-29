import React from 'react';

import { useLoaderData, useOutletContext } from 'react-router';
import { toast } from '@/hooks/use-toast';
import ReportAPIKeys from './settings/ReportAPIKeys';
import { SettingsLoaderData } from './settingsLoader';
import InitializeAccount from './settings/InitializeAccount';
import DeleteAccount from './settings/DeleteAccount';
import { AccountRoutesContext } from './AccountRoutes';

const AccountSettings: React.FC = () => {
  const accountContext = useOutletContext<AccountRoutesContext>();
  const settingsData = useLoaderData<SettingsLoaderData>();

  if (settingsData.potentialLNAError) {
    toast({
      title: 'Localhost Network Error',
      description:
        'Could not reach the localhost account endpoint. Some browsers, including Safari and Brave, do not support localhost account endpoints. In other browsers, please check the site settings to ensure local resources are accessible.',
      variant: 'destructive',
      duration: Infinity,
    });
  }

  return (
    <div className="w-full p-10">
      <h1 className="scroll-m-20 text-4xl font-extrabold lg:text-5xl my-6">Account Settings</h1>
      <div>
        <p>
          <b>Account ID:</b> {accountContext.account.id}
          <br />
          <b>Account Endpoint:</b> {accountContext.account.endpoint}
        </p>
      </div>
      {settingsData.account_initialized ? <ReportAPIKeys keys={settingsData.report_api_keys} /> : <InitializeAccount />}
      <DeleteAccount />
    </div>
  );
};

export default AccountSettings;
