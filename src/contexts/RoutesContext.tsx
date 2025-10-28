import React, { createContext, useMemo } from 'react';
import {
  createRoutesFromElements,
  Navigate,
  Outlet,
  Route,
  RouteObject,
  ShouldRevalidateFunction,
  UIMatch,
  useMatches,
} from 'react-router';
import { isPlayground } from '@/lib/utils';
import { idpResponseLoader, logOutLoader, passkeyResponseLoader, redirectToAuth } from '@/lib/auth';
import ErrorBoundary from '@/ErrorBoundary';
import Dashboard from '@/Dashboard';
import accountsLoader from '@/lib/accountsLoader';
import Accounts from '@/Accounts';
import AccountCreate from '@/AccountCreate';
import UserSettings from '@/UserSettings';
import AccountRoutes from '@/AccountRoutes';
import QueryView from '@/QueryView';
import MenuSection from '@/lib/menuSection';
import { allLoader, secretsLoader } from '@/lib/queryLoader';
import AccountSettings from '@/AccountSettings';
import { settingsLoader } from '@/settingsLoader';

const Layout: React.FC = () => {
  const matches = useMatches() as UIMatch<unknown, { title?: string } | undefined>[];
  const title = useMemo(() => matches.reverse().find((match) => match.handle?.title)?.handle?.title, [matches]);

  const prefix = isPlayground ? 'Archodex Playground' : 'Archodex Dashboard';

  document.title = `${prefix}${title ? ` - ${title}` : ''}`;

  return <Outlet />;
};

const revalidateBetweenAccounts: ShouldRevalidateFunction = (url) => {
  return url.currentParams.accountId !== url.nextParams.accountId;
};

const RoutesContext = createContext<RouteObject[]>(
  createRoutesFromElements(
    <Route
      path="/"
      element={<Layout />}
      hydrateFallbackElement={<div>Loading...</div>}
      errorElement={<ErrorBoundary />}
    >
      {!isPlayground && (
        <Route
          id="signup"
          path="signup"
          loader={() => {
            redirectToAuth({ signup: true });
          }}
          element={null}
        />
      )}
      <Route id="accounts" element={<Dashboard />} loader={accountsLoader}>
        <Route index element={<Accounts />} />
        {!isPlayground && <Route path="create_account" element={<AccountCreate />} />}
        {!isPlayground && <Route path="user/settings" element={<UserSettings />} />}
        <Route path=":accountId" element={<AccountRoutes />}>
          <Route index element={<Navigate to="secrets" replace={true} />} />
          <Route
            path="secrets/:tableTab?"
            handle={{ title: 'Secrets' }}
            element={<QueryView key="secrets" section={MenuSection.Secrets} />}
            loader={secretsLoader}
            shouldRevalidate={revalidateBetweenAccounts}
          />
          <Route
            path="environments/:tableTab?"
            handle={{ title: 'Environments' }}
            element={<QueryView key="environments" section={MenuSection.Environments} />}
            loader={allLoader}
            shouldRevalidate={revalidateBetweenAccounts}
          />
          <Route
            path="inventory/:tableTab?"
            handle={{ title: 'Inventory' }}
            element={<QueryView key="inventory" section={MenuSection.Inventory} />}
            loader={allLoader}
            shouldRevalidate={revalidateBetweenAccounts}
          />
          <Route
            path="settings"
            handle={{ title: 'Account Settings' }}
            element={<AccountSettings />}
            loader={settingsLoader}
          />
        </Route>
      </Route>
      {!isPlayground && (
        <Route
          id="idpresponse"
          path="oauth2/idpresponse"
          loader={idpResponseLoader}
          element={<p>Authenticating...</p>}
        />
      )}
      {!isPlayground && <Route id="passkeyresponse" path="oauth2/passkeyresponse" loader={passkeyResponseLoader} />}
      {!isPlayground && <Route id="logout" path="logout" loader={logOutLoader} />}
    </Route>,
  ),
);

export default RoutesContext;
