declare const self: ServiceWorkerGlobalScope;

self.addEventListener('install', () => void self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

interface AuthTokens {
  clientId: string;
  accessToken: string;
  accessTokenExpiration: Date;
  refreshToken: string;
  userEmail: string;
  userId: string;
  endpoints: Set<string>;
}

type BrowserClientId = string;

let tokens: AuthTokens | undefined;

interface BrowserClient extends Client {
  postMessage(message: AuthResponseMessage, transfer: Transferable[]): void;
  postMessage(message: AuthResponseMessage, options?: StructuredSerializeOptions): void;
}

const jwtClaims = (token: string): { sub: string; email?: string; exp: number } => {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT token');
  }
  const payload = JSON.parse(atob(parts[1])) as { sub: string; email: string; exp: number };
  if (typeof payload.exp !== 'number') {
    throw new Error('Invalid JWT payload');
  }
  return payload;
};

let authEndpoint: string | undefined;
let authClientId: string | undefined;

const isAccessTokenValid = () => {
  if (!tokens) {
    return false;
  }
  return tokens.accessTokenExpiration.getTime() - 60 * 1000 >= new Date().getTime();
};

self.addEventListener('message', (event: ExtendableMessageEvent) => {
  const client = event.source as BrowserClient | null;
  if (!client) {
    throw new Error('No client source for message');
  }

  (async () => {
    const data = event.data as object;

    if (!('type' in data)) {
      throw new Error('Missing message type in auth service worker message');
    }

    const authMessage = data as AuthMessage;

    switch (authMessage.type) {
      case 'authCode':
        await authenticate(client, authMessage);
        break;

      case 'authCheck':
        if (tokens) {
          console.debug(`Received authCheck message while authenticated as ${tokens.userEmail}`);
          client.postMessage({ type: 'authSuccess', userEmail: tokens.userEmail, userId: tokens.userId });
        } else {
          console.debug('Received authCheck message while not authenticated');
          client.postMessage({ type: 'notAuthenticated' });
        }
        break;

      case 'logout':
        await logout();
        break;

      default:
        throw new Error(`Unexpected auth service worker message type: ${String(data.type)}`);
    }
  })().catch((err: unknown) => {
    throw new Error(`Error in auth service worker message handler: ${String(err)}`);
  });
});

const authenticate = async (client: BrowserClient, authCodeMessage: AuthCodeMessage): Promise<void> => {
  authEndpoint = authCodeMessage.authEndpoint;
  authClientId = authCodeMessage.clientId;

  const response = await fetch(
    new Request(new URL('/oauth2/token', authEndpoint), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: authClientId,
        code: authCodeMessage.code,
        redirect_uri: `${location.origin}/oauth2/idpresponse`,
      }),
    }),
  );

  if (!response.ok) {
    console.error('Failed to exchange authorization code for access token');
    client.postMessage({ type: 'redirectToAuth' });
    return;
  }

  const authData = (await response.json()) as { access_token: string; refresh_token: string; id_token: string };

  const accessToken = authData.access_token;
  if (!accessToken) {
    console.error("Missing 'access_token' in Cognito token response");
    client.postMessage({ type: 'redirectToAuth' });
    return;
  }

  const refreshToken = authData.refresh_token;
  if (!refreshToken) {
    console.error("Missing 'refresh_token' in Cognito token response");
    client.postMessage({ type: 'redirectToAuth' });
    return;
  }

  const claims = jwtClaims(authData.id_token);

  if (!claims.email) {
    throw new Error("Missing 'email' claim in Cognito ID token");
  }

  tokens = {
    clientId: authClientId,
    accessToken,
    accessTokenExpiration: new Date(claims.exp * 1000),
    refreshToken,
    userEmail: claims.email,
    userId: claims.sub,
    endpoints: new Set([authCodeMessage.globalEndpoint]),
  };

  console.debug(
    `Successfully generated access token in auth service worker for ${tokens.userEmail} (expiration: ${tokens.accessTokenExpiration.toISOString()})`,
  );

  client.postMessage({ type: 'authSuccess', userEmail: tokens.userEmail, userId: tokens.userId });
};

self.addEventListener('fetch', (event: FetchEvent) => {
  // Ignore navigation requests, let the browser handle those
  if (event.request.mode === 'navigate' || event.request.destination === 'document') {
    return;
  }

  if (!tokens) {
    // no tokens yet, passthrough all requests
    return;
  }

  if (!tokens.endpoints.has(new URL(event.request.url).origin)) {
    // no matching endpoint for this request, just passthrough
    return;
  }

  const browserClientId: BrowserClientId = event.clientId;

  event.respondWith(fetchProxy(event.request, tokens, browserClientId));
});

let refreshTokenPromise: Promise<void> | undefined;
const fetchProxy = async (req: Request, tokens: AuthTokens, browserClientId: BrowserClientId): Promise<Response> => {
  if (refreshTokenPromise) {
    await refreshTokenPromise;
  } else if (!isAccessTokenValid()) {
    refreshTokenPromise = refreshToken(tokens, browserClientId).finally(() => {
      refreshTokenPromise = undefined;
    });
    await refreshTokenPromise;
  }

  const authedReq = new Request(req, {
    headers: new Headers({ ...Object.fromEntries(req.headers), Authorization: `Bearer ${tokens.accessToken}` }),
  });

  if (authedReq.url.endsWith('/accounts') && ['GET', 'POST'].includes(authedReq.method)) {
    // Intercept the accounts list response to extract and remember any new endpoints
    const res = await fetch(authedReq);
    if (!res.ok) {
      return res;
    }

    // Clone the response so we can read it here and also return it to the client
    const resClone = res.clone();
    const accountsData: unknown = await resClone.json();

    const accounts =
      authedReq.method === 'GET'
        ? (accountsData as AccountsListResponse).accounts
        : [accountsData as AccountCreateResponse];

    for (const account of accounts) {
      // List account and create account requests sent to the archodex.com backends will respond with account endpoints.
      // Create account requests sent to self-hosted backends will not have an endpoint in the response, but we will
      // have already seen it from the archodex.com backend create account record request, so we can ignore this case.
      if (!account.endpoint) {
        break;
      }

      const endpoint = new URL(account.endpoint).origin;

      if (tokens.endpoints.has(endpoint)) {
        continue;
      }

      tokens.endpoints.add(endpoint);
      console.debug(`Added new endpoint to auth service worker for account ${account.id}: ${account.endpoint}`);
    }

    return res;
  } else {
    return fetch(authedReq);
  }
};

interface CognitoRefreshTokenResponse {
  access_token: string;
  refresh_token?: string;
}

const refreshToken = async (tokens: AuthTokens, browserClientId: BrowserClientId): Promise<void> => {
  console.debug('Refreshing access token in auth service worker');

  const refreshResponse = await fetch(
    new Request(new URL('/oauth2/token', authEndpoint), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: tokens.clientId,
        refresh_token: tokens.refreshToken,
      }),
    }),
  );

  if (!refreshResponse.ok) {
    console.error(
      `Failed to refresh access token in auth service worker: ${String(refreshResponse.status)} ${refreshResponse.statusText}`,
    );

    let browserClient: BrowserClient | undefined;
    try {
      browserClient = await self.clients.get(browserClientId);
    } catch (err) {
      throw new Error(`Failed to get browser client after refresh token error to redirect to login: ${String(err)}`);
    }

    if (!browserClient) {
      throw new Error('Failed to get browser client after refresh token error to redirect to login');
    }

    browserClient.postMessage({ type: 'redirectToAuth' });
    throw new Error(
      `Failed to refresh access token (it is likely expired): ${String(refreshResponse.status)} ${refreshResponse.statusText}`,
    );
  }

  let refreshData: CognitoRefreshTokenResponse;
  try {
    refreshData = (await refreshResponse.json()) as CognitoRefreshTokenResponse;
  } catch (err) {
    throw new Error(`Failed to receive and parse refresh token response: ${String(err)}`);
  }

  tokens.accessToken = refreshData.access_token;
  tokens.accessTokenExpiration = new Date(jwtClaims(refreshData.access_token).exp * 1000);
  if (refreshData.refresh_token) {
    tokens.refreshToken = refreshData.refresh_token;
  }

  console.debug(
    `Successfully refreshed access token in auth service worker (new expiration: ${tokens.accessTokenExpiration.toISOString()})`,
  );
};

// A browser tab will send a logout message triggering this function to execute. The browser tab doesn't wait for the logout to complete before redirecting to the login page. That's ok, as this will finish revoking the refresh token in the background.
const logout = async (): Promise<void> => {
  console.debug('Logging out user in auth service worker');

  if (!tokens) {
    return;
  }

  const clientId = tokens.clientId;
  const refreshToken = tokens.refreshToken;

  // Clear the tokens
  tokens = undefined;

  const revokeResponse = await fetch(
    new Request(new URL('/oauth2/revoke', authEndpoint), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: clientId, token: refreshToken }),
    }),
  );

  if (!revokeResponse.ok) {
    console.error(
      `Failed to revoke refresh token in auth service worker: ${String(revokeResponse.status)} ${revokeResponse.statusText}`,
    );
  }
};
