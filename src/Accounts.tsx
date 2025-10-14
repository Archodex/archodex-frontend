import React from 'react';
import { Navigate, useRouteLoaderData } from 'react-router';
import { AccountsLoaderData } from './lib/accountsLoader';

const Accounts: React.FC = () => {
  const accounts = useRouteLoaderData<AccountsLoaderData>('accounts');
  if (!accounts) {
    throw new Error('Missing accounts loader data');
  }

  const firstAccount = accounts.first();
  if (firstAccount) {
    return <Navigate to={`/${firstAccount.id}/secrets`} replace={true} />;
  } else {
    return <Navigate to={'/create_account'} replace={true} />;
  }
};

export default Accounts;
