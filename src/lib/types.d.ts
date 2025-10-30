interface AuthCodeMessage {
  type: 'authCode';
  code: string;
  globalEndpoint: string;
  authEndpoint: string;
  clientId: string;
}

interface AuthCheckMessage {
  type: 'authCheck';
}

interface AuthLogoutMessage {
  type: 'logout';
}

type AuthMessage = AuthCodeMessage | AuthCheckMessage | AuthLogoutMessage;

interface AuthResponseSuccessMessage {
  type: 'authSuccess';
  userEmail: string;
  userId: string;
}

interface AuthResponseNotAuthenticatedMessage {
  type: 'notAuthenticated';
}

interface AuthResponseRedirectToAuthMessage {
  type: 'redirectToAuth';
}

type AuthResponseMessage =
  | AuthResponseSuccessMessage
  | AuthResponseNotAuthenticatedMessage
  | AuthResponseRedirectToAuthMessage;

interface Account {
  id: string;
  endpoint: string;
}

interface AccountsListResponse {
  accounts: Account[];
}

interface AccountCreateResponse {
  id: string;
  endpoint?: string;
}

interface ResourceIdPart {
  type: string;
  id: string;
}

type ResourceId = ResourceIdPart[];

interface Resource {
  id: ResourceId;
  environments?: string[];
  first_seen_at: string;
  last_seen_at: string;
}

interface PrincipalChainPart {
  id: ResourceId;
  event?: string;
}

type PrincipalChain = PrincipalChainPart[];

interface ResourceEvent {
  principal: ResourceId;
  type: string;
  resource: ResourceId;
  principal_chains: PrincipalChain[];
  first_seen_at: string;
  last_seen_at: string;
}

interface GlobalContainer {
  id: ResourceId;
  contains: ResourceId;
}

interface QueryResponse {
  resources?: Resource[];
  events?: ResourceEvent[];
  global_containers?: GlobalContainer[];
}

interface PrincipalChainDetails {
  first_seen_at: string;
  last_seen_at: string;
}

interface ReportAPIKey {
  id: number;
  description: string | undefined;
  created_at: string;
}

interface CreateReportAPIKeyResponse {
  report_api_key: ReportAPIKey;
  report_api_key_value: string;
}
