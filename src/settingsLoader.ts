import { LoaderFunction, redirect } from 'react-router';
import { AccountsLoaderData } from './lib/accountsLoader';

interface SettingsLoaderAccountInitializedData {
  account_initialized: true;
  report_api_keys: ReportAPIKey[];
}

interface SettingsLoaderAccountNotInitializedData {
  account_initialized: false;
}

export type SettingsLoaderData = SettingsLoaderAccountInitializedData | SettingsLoaderAccountNotInitializedData;

export const settingsLoader: LoaderFunction<AccountsLoaderData> = (async (
  { params: { accountId } },
  accountsLoaderData: AccountsLoaderData,
): Promise<SettingsLoaderData | Response> => {
  if (!accountId) {
    throw new Error('Missing accountId route param in secretsLoader');
  }

  const account = accountsLoaderData.get(accountId);
  if (!account) {
    console.error(`Attempted to load account settings data for non-existent account ${accountId}`);
    return redirect(`/`);
  }

  const reportApiKeyUrl = accountsLoaderData.apiUrl(accountId, `/account/${account.id}/report_api_keys`);

  let response;
  try {
    response = await fetch(reportApiKeyUrl);
  } catch (err) {
    console.error(`Failed to fetch report API keys for account ${accountId} from ${reportApiKeyUrl}: ${String(err)}`);

    return { account_initialized: false };
  }

  if (!response.ok) {
    if (response.status === 404) {
      return { account_initialized: false };
    }

    return response;
  }

  const { report_api_keys } = (await response.json()) as { report_api_keys: ReportAPIKey[] };

  return { account_initialized: true, report_api_keys };
}) as LoaderFunction;
