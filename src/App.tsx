import ThemeProvider from './components/Theme/Provider';
import { Toaster } from './components/ui/toaster';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { isAuthenticated } from './lib/auth';
import accountsLoader, { AccountsLoaderData } from './lib/accountsLoader';
import { AuthError } from './ErrorBoundary';
import { useContext, useMemo } from 'react';
import TutorialProvider from './components/Tutorial/Provider';
import RoutesContext from './contexts/RoutesContext';

export interface RouteHandle {
  title: string;
}

function Router() {
  const routes = useContext(RoutesContext);

  // createBrowserRouter will call loaders, even if the RouterProvider
  // is not yet rendered. Wrapping this in a component with useMemo
  // ensures that the router is only created (once) after the Auth
  // component completes its initialization and renders this Router
  // component.
  const router = useMemo(
    () =>
      createBrowserRouter(routes, {
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
                match.route.id === 'signup' ||
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
      }),
    [routes],
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
