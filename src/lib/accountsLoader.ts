import { LoaderFunction } from 'react-router';
import { accountsUrl, isPlayground } from './utils';
import { accounts as playgroundAccounts } from './playgroundData';
import { AuthError } from '@/ErrorBoundary';

export class AccountsLoaderData {
  accounts: Record<string, Account | undefined> = {};

  setAccounts(accounts: Account[]) {
    this.accounts = accounts.reduce<Record<string, Account>>((acc, account) => {
      acc[account.id] = account;
      return acc;
    }, {});
  }

  hasAccount(accountId: string) {
    return !!this.accounts[accountId];
  }

  first() {
    return Object.values(this.accounts)[0];
  }

  get(accountId: string) {
    return this.accounts[accountId];
  }

  clear() {
    this.accounts = {};
  }

  apiUrl(accountId: string, route: string) {
    const account = this.accounts[accountId];
    if (!account) {
      throw new Error(`Account '${accountId}' not found`);
    }

    let endpoint = account.endpoint;
    if (
      location.hostname === 'localhost' &&
      account.endpoint === `https://api.us-west-2.${import.meta.env.VITE_ARCHODEX_DOMAIN ?? 'archodex.com'}` &&
      import.meta.env.VITE_ARCHODEX_ACCOUNTS_BACKEND_ENDPOINT
    ) {
      endpoint = import.meta.env.VITE_ARCHODEX_ACCOUNTS_BACKEND_ENDPOINT as string;
    }

    return endpoint + route;
  }
}

const accountsLoaderData = new AccountsLoaderData();
let accountsLoaderDataLoaded = false;

const accountsLoader: LoaderFunction = async (): Promise<AccountsLoaderData> => {
  if (accountsLoaderDataLoaded) {
    return accountsLoaderData;
  }

  let accounts;
  if (isPlayground) {
    accounts = playgroundAccounts().accounts;
  } else {
    const response = await fetch(accountsUrl());

    if (!response.ok) {
      if (response.status === 401) {
        throw new AuthError();
      }

      throw new Error(`Failed to fetch accounts: ${response.statusText}`);
    }

    const data = (await response.json()) as AccountsListResponse;
    accounts = data.accounts;
  }

  accountsLoaderData.setAccounts(accounts);
  accountsLoaderDataLoaded = true;

  return accountsLoaderData;
};

export const invalidateAccountsLoaderData = () => {
  accountsLoaderData.clear();
  accountsLoaderDataLoaded = false;
};

export default accountsLoader;
