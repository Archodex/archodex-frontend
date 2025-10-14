import React from 'react';
import { Navigate, Outlet, useParams, useRouteLoaderData } from 'react-router';
import { AccountsLoaderData } from './lib/accountsLoader';

export class AccountRoutesContext {
  accounts: AccountsLoaderData;
  account: Account;

  constructor(accounts: AccountsLoaderData, account: Account) {
    this.accounts = accounts;
    this.account = account;
  }

  apiUrl(path: string) {
    return this.accounts.apiUrl(this.account.id, path);
  }

  isSelfHosted() {
    return !this.account.endpoint.endsWith(
      `.${(import.meta.env.VITE_ARCHODEX_DOMAIN as string | undefined) ?? 'archodex.com'}`,
    );
  }
}

const AccountRoutes: React.FC = () => {
  const accounts = useRouteLoaderData<AccountsLoaderData>('accounts');
  const { accountId } = useParams();

  if (!accounts) {
    throw new Error('Missing accounts loader data in AccountRoutes');
  }

  if (!accountId) {
    throw new Error('Missing accountId route param in AccountRoutes');
  }

  const account = accounts.get(accountId);

  if (!account) {
    console.warn(`Account '${accountId}' not found`);
    history.replaceState(null, '', '/');
    return <Navigate to="/" replace={true} />;
  }

  return <Outlet context={new AccountRoutesContext(accounts, account)} />;
};

export default AccountRoutes;
