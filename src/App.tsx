import './App.css';
import ThemeProvider from './components/Theme/Provider';
import { Toaster } from './components/ui/toaster';
import Dashboard from './Dashboard';
import {
  createBrowserRouter,
  createRoutesFromElements,
  Navigate,
  Outlet,
  Route,
  RouterProvider,
  ShouldRevalidateFunction,
  UIMatch,
  useMatches,
} from 'react-router';
import QueryView from './QueryView';
import { idpResponseLoader, isAuthenticated, logOutLoader, passkeyResponseLoader } from './lib/auth';
import accountsLoader, { AccountsLoaderData } from './lib/accountsLoader';
import AccountCreate from './AccountCreate';
import AccountRoutes from './AccountRoutes';
import Accounts from './Accounts';
import ErrorBoundary, { AuthError } from './ErrorBoundary';
import { allLoader, secretsLoader } from './lib/queryLoader';
import { useMemo } from 'react';
import { settingsLoader } from './settingsLoader';
import AccountSettings from './AccountSettings';
import TutorialProvider from './components/Tutorial/Provider';
import { isPlayground } from './lib/utils';
import MenuSection from './lib/menuSection';
import UserSettings from './UserSettings';

export interface RouteHandle {
  title: string;
}

const Layout: React.FC = () => {
  const matches = useMatches() as UIMatch<unknown, { title?: string } | undefined>[];

  const prefix = isPlayground ? 'Archodex Playground' : 'Archodex Dashboard';

  const title = matches.reverse().find((match) => match.handle?.title)?.handle?.title;

  document.title = `${prefix}${title ? ` - ${title}` : ''}`;

  return <Outlet />;
};

const revalidateBetweenAccounts: ShouldRevalidateFunction = (url) => {
  return url.currentParams.accountId !== url.nextParams.accountId;
};

function Router() {
  // createBrowserRouter will call loaders, even if the RouterProvider
  // is not yet rendered. Wrapping this in a component with useMemo
  // ensures that the router is only created (once) after the Auth
  // component completes its initialization and renders this Router
  // component.
  const router = useMemo(
    () =>
      createBrowserRouter(
        createRoutesFromElements(
          <Route
            path="/"
            element={<Layout />}
            hydrateFallbackElement={<div>Loading...</div>}
            errorElement={<ErrorBoundary />}
          >
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
            {!isPlayground && (
              <Route id="passkeyresponse" path="oauth2/passkeyresponse" loader={passkeyResponseLoader} />
            )}
            {!isPlayground && <Route id="logout" path="logout" loader={logOutLoader} />}
          </Route>,
        ),
        {
          // This is a custom data strategy that checks all matched route loaders to
          // see if they require authentication. If any do, then we check whether the
          // user is authenticated. If they are, we resolve the loader as usual. If
          // they aren't, we return an error object that will be handled by the error
          // boundary, redirecting the user to the login page.
          async dataStrategy({ matches }) {
            const matchesToLoad = matches.filter((m) => m.shouldLoad);
            let accountsLoaderPromise: Promise<AccountsLoaderData> | undefined;

            const results = await Promise.all(
              matchesToLoad.map(async (match) => {
                if (
                  match.route.id === 'idpresponse' ||
                  match.route.id === 'passkeyresponse' ||
                  match.route.id === 'logout'
                ) {
                  return match.resolve();
                }

                if (await isAuthenticated) {
                  // Pre-run the accounts loader, then pass it to subsequent loaders
                  accountsLoaderPromise ??= accountsLoader(
                    { request: new Request(''), params: {}, context: {} },
                    undefined,
                  ) as Promise<AccountsLoaderData>;

                  const accountsLoaderData = await accountsLoaderPromise;

                  return match.resolve((handler) => handler(accountsLoaderData));
                } else {
                  return { type: 'error', result: new AuthError() };
                }
              }),
            );
            return results.reduce((acc, result, i) => Object.assign(acc, { [matchesToLoad[i].route.id]: result }), {});
          },
        },
      ),
    [],
  );

  return <RouterProvider router={router} />;
}

function App() {
  return (
    <ThemeProvider>
      <TutorialProvider>
        <Router />
        <Toaster />
      </TutorialProvider>
    </ThemeProvider>
  );
}

export default App;
