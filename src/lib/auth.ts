import { LoaderFunction, redirect } from 'react-router';
import { isPlayground } from './utils';

const ARCHODEX_COM_USER_POOL_CLIENT_ID = '1a5vsre47o6pa39p3p81igfken';
const USER_POOL_CLIENT_ID =
  (import.meta.env.VITE_USER_POOL_CLIENT_ID as string | undefined) ?? ARCHODEX_COM_USER_POOL_CLIENT_ID;

const archodexDomain = () =>
  location.hostname === 'localhost'
    ? ((import.meta.env.VITE_ARCHODEX_DOMAIN as string | undefined) ?? 'archodex.com')
    : location.hostname.replace(/^app\./, '');

const authDomain = () => `auth.${archodexDomain()}`;

export function redirectToAuth(options?: { signup?: boolean }) {
  const signup = options?.signup ?? false;
  const path = signup ? '/signup' : '/oauth2/authorize';

  const state = btoa(crypto.getRandomValues(new Uint8Array(16)).toString());
  sessionStorage.setItem('cognitoAuthState', state);

  sessionStorage.setItem('authHistoryLength', history.length.toString());
  sessionStorage.setItem('authLastPathname', location.pathname);

  const authUrl = new URL(path, `https://${authDomain()}`);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', USER_POOL_CLIENT_ID);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('redirect_uri', `${location.origin}/oauth2/idpresponse`);

  location.href = authUrl.toString();
}

let _userEmail: string | undefined;
export const userEmail = () => {
  if (isPlayground) {
    return 'me@sprockets2u.com';
  }

  if (!_userEmail) {
    throw new Error('User email is not available before authentication is successful');
  }

  return _userEmail;
};

let authenticatedResolver: (value: boolean | PromiseLike<boolean>) => void;
export const isAuthenticated = new Promise<boolean>((resolve) => {
  authenticatedResolver = resolve;

  if (isPlayground) {
    authenticatedResolver(true);
    return;
  }

  if (location.pathname === '/oauth2/idpresponse') {
    // The code below in idpResponseLoader will handle resolving the promise
    return;
  }

  navigator.serviceWorker.ready
    .then((registration) => {
      const serviceWorker = registration.active;
      if (!serviceWorker) {
        throw new Error('No active service worker to check auth status for');
      }

      const handlerFunction = (event: MessageEvent) => {
        if (typeof event.data !== 'object' || !('type' in event.data)) {
          throw new Error('Invalid message from auth service worker');
        }

        const data = event.data as AuthResponseMessage;

        switch (data.type) {
          case 'authSuccess':
            _userEmail = data.userEmail;
            authenticatedResolver(true);
            break;

          case 'notAuthenticated':
            authenticatedResolver(false);
            break;

          case 'redirectToAuth':
            console.debug('Auth service worker requested redirect to auth');
            redirectToAuth();
            break;

          default:
            throw new Error(
              `Unexpected auth service worker message type: ${String((data as Record<string, unknown>).type)}`,
            );
        }
      };

      navigator.serviceWorker.addEventListener('message', handlerFunction);

      // Send message to check current status of auth tokens, triggering transmission of authSuccess message if we are already authenticated
      const authCheckMessage: AuthCheckMessage = { type: 'authCheck' };
      serviceWorker.postMessage(authCheckMessage);
    })
    .catch((err: unknown) => {
      throw new Error(`Failed to check auth status: ${String(err)}`);
    });
});

export const idpResponseLoader: LoaderFunction = async () => {
  const search = new URLSearchParams(window.location.search);
  window.history.replaceState({}, document.title, window.location.origin + window.location.pathname);

  const state = search.get('state');
  if (!state) {
    console.error("Missing 'state' query parameter in IDP response");
    redirectToAuth();
    return {};
  }

  if (state !== sessionStorage.getItem('cognitoAuthState')) {
    console.error("Incorrect 'state' query parameter in IDP response");
    redirectToAuth();
    return {};
  }

  const code = search.get('code');
  if (!code) {
    console.error("Missing 'code' query parameter in IDP response");
    redirectToAuth();
    return {};
  }

  const authCodeMessage: AuthCodeMessage = {
    type: 'authCode',
    code,
    globalEndpoint:
      (import.meta.env.VITE_ARCHODEX_ACCOUNTS_BACKEND_ENDPOINT as string | undefined) ??
      `https://api.us-west-2.${archodexDomain()}`,
    authEndpoint: `https://${authDomain()}`,
    clientId: USER_POOL_CLIENT_ID,
  };

  const serviceWorker = (await navigator.serviceWorker.ready).active;
  if (!serviceWorker) {
    console.error('No active service worker to send auth tokens to');
    redirectToAuth();
    return {};
  }

  serviceWorker.postMessage(authCodeMessage);

  sessionStorage.removeItem('cognitoAuthState');

  const authMessagePromise = new Promise<void>((resolve, reject) => {
    const messageHandler = (event: MessageEvent) => {
      if (typeof event.data !== 'object' || !('type' in event.data)) {
        throw new Error('Invalid message from auth service worker');
      }

      const data = event.data as AuthResponseMessage;

      switch (data.type) {
        case 'authSuccess':
          _userEmail = data.userEmail;
          resolve();
          break;

        case 'redirectToAuth':
          console.debug('Auth service worker requested redirect to auth');
          redirectToAuth();

          // Don't bother resolving since we're redirecting away
          break;

        case 'notAuthenticated':
          // Keep waiting for authSuccess or redirectToAuth
          break;

        default:
          reject(
            new Error(`Unexpected auth service worker message type: ${String((data as Record<string, unknown>).type)}`),
          );
      }
    };

    navigator.serviceWorker.addEventListener('message', messageHandler);
  });

  try {
    await authMessagePromise;
  } catch (error) {
    console.error('Failed to receive auth message from service worker:', error);
    redirectToAuth();
    return;
  }

  authenticatedResolver(true);

  const historyLengthString = sessionStorage.getItem('authHistoryLength');
  const lastPathname = sessionStorage.getItem('authLastPathname');
  if (historyLengthString && lastPathname) {
    sessionStorage.removeItem('authHistoryLength');
    sessionStorage.removeItem('authLastPathname');

    if (lastPathname.startsWith('/oauth2/idpresponse')) {
      return redirect('/');
    }

    const historyLength = Number(historyLengthString);
    if (history.length > historyLength) {
      history.go(historyLength - history.length);
    } else if (history.length === historyLength) {
      return redirect(lastPathname);
    } else if (history.length < historyLength) {
      return redirect('/');
    }
  } else {
    return redirect('/');
  }

  return {};
};

export function redirectToPasskeyRegistration() {
  sessionStorage.setItem('authHistoryLength', history.length.toString());
  sessionStorage.setItem('authLastPathname', location.pathname);

  const addPasskeyUrl = new URL('/passkeys/add', `https://${authDomain()}`);
  addPasskeyUrl.searchParams.set('client_id', USER_POOL_CLIENT_ID);
  addPasskeyUrl.searchParams.set('redirect_uri', `${location.origin}/oauth2/passkeyresponse`);

  location.href = addPasskeyUrl.toString();
}

export const passkeyResponseLoader: LoaderFunction = () => {
  const historyLengthString = sessionStorage.getItem('authHistoryLength');
  const lastPathname = sessionStorage.getItem('authLastPathname');
  if (historyLengthString && lastPathname) {
    sessionStorage.removeItem('authHistoryLength');
    sessionStorage.removeItem('authLastPathname');

    if (lastPathname === '/oauth2/passkeyresponse') {
      return redirect('/');
    }

    const historyLength = Number(historyLengthString);
    if (history.length > historyLength) {
      history.go(historyLength - history.length);
    } else if (history.length === historyLength) {
      return redirect(lastPathname);
    } else if (history.length < historyLength) {
      return redirect('/');
    }
  } else {
    return redirect('/');
  }

  return {};
};

export async function logOutLoader() {
  const serviceWorker = (await navigator.serviceWorker.ready).active;
  if (serviceWorker) {
    // This will synchronously clear the auth service worker's tokens and asynchronously revoke the refresh token.
    const authLogoutMessage: AuthLogoutMessage = { type: 'logout' };
    serviceWorker.postMessage(authLogoutMessage);
  } else {
    console.warn('No active service worker to logout from');
  }

  const state = btoa(crypto.getRandomValues(new Uint8Array(16)).toString());
  sessionStorage.setItem('cognitoAuthState', state);

  sessionStorage.setItem('authHistoryLength', history.length.toString());
  sessionStorage.setItem('authLastPathname', location.pathname);

  const logoutUrl = new URL('/logout', `https://${authDomain()}`);
  logoutUrl.searchParams.set('client_id', USER_POOL_CLIENT_ID);
  logoutUrl.searchParams.set('response_type', 'code');
  logoutUrl.searchParams.set('state', state);
  logoutUrl.searchParams.set('redirect_uri', `${location.origin}/oauth2/idpresponse`);

  return redirect(logoutUrl.toString());
}
