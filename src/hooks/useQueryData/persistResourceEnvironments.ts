import { AccountRoutesContext } from '@/AccountRoutes';
import { isPlayground } from '@/lib/utils';

/**
 * Persists environment configurations for a specific resource to the backend API.
 *
 * @param accountContext - The account routing context containing API URL and account information
 * @param resourceId - The unique identifier of the resource to update
 * @param environments - Array of environment names to associate with the resource. Defaults to empty array
 *
 * @throws {Error} Throws an error if the API request fails or returns a non-OK status
 *
 * @returns Promise that resolves when the environments are successfully persisted
 *
 * @remarks
 * This function will skip API calls when running in playground mode to avoid unnecessary network requests.
 */
const persistResourceEnvironments = async (
  accountContext: AccountRoutesContext,
  resourceId: ResourceId,
  environments: string[] = [],
) => {
  // If in playground mode, avoid invoking the API
  if (isPlayground) {
    return;
  }

  const res = await fetch(accountContext.apiUrl(`/account/${accountContext.account.id}/resource/set_environments`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resource_id: resourceId, environments: environments }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText);
  }
};

export default persistResourceEnvironments;
