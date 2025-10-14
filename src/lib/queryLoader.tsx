import { LoaderFunction } from 'react-router';
import { AccountsLoaderData } from './accountsLoader';
import playgroundSecrets from './playgroundData/secrets.json';
import playgroundInventory from './playgroundData/inventory.json';
import { isPlayground } from './utils';
import { AccountUnreachableError } from '@/ErrorBoundary';

export type QueryLoaderData = QueryResponse;

const queryLoader = async (
  accountId: string,
  accountsLoaderData: AccountsLoaderData,
  type: string,
): Promise<Response> => {
  if (!accountsLoaderData.hasAccount(accountId)) {
    return new Response(null, { status: 404 });
  }

  let response;
  try {
    response = await fetch(accountsLoaderData.apiUrl(accountId, `/account/${accountId}/query/${type}`));
  } catch (error) {
    console.error(`Failed to fetch query data for account ${accountId}: ${String(error)}`);
    throw new AccountUnreachableError(
      (
        <div>
          <p>Failed to query for resources data.</p>
          <p>(See browser console logs for additional details)</p>
        </div>
      ),
      accountId,
    );
  }

  if (!response.ok) {
    console.error(`Failed to fetch query data for account ${accountId}: ${response.statusText}`);
    throw new AccountUnreachableError(`Failed to query for resources data: ${response.statusText}`, accountId);
  }

  return response;
};

export const secretsLoader: LoaderFunction = async (
  { params: { accountId } },
  accountsLoaderData,
): Promise<Response> => {
  if (!accountId) {
    throw new Error('Missing accountId route param in secretsLoader');
  }

  if (isPlayground) {
    if (accountId === '2529412351') {
      return new Response(JSON.stringify(playgroundSecrets), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  return queryLoader(accountId, accountsLoaderData as AccountsLoaderData, 'secrets');
};

export const allLoader: LoaderFunction = async ({ params: { accountId } }, accountsLoaderData): Promise<Response> => {
  if (!accountId) {
    throw new Error('Missing accountId route param in secretsLoader');
  }

  if (isPlayground) {
    if (accountId === '2529412351') {
      return new Response(JSON.stringify(playgroundInventory), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  return queryLoader(accountId, accountsLoaderData as AccountsLoaderData, 'all');
};
