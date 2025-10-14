import { describe, it, vi } from 'vitest';
import persistResourceEnvironments from './persistResourceEnvironments';
import { AccountRoutesContext } from '@/AccountRoutes';

// Mock the isPlayground utility
vi.mock('@/lib/utils', () => ({ isPlayground: false }));

// Mock fetch globally
global.fetch = vi.fn();

describe('persistResourceEnvironments', () => {
  const mockAccountsLoaderData = {
    accounts: { 'account-123': { id: 'account-123', endpoint: 'https://api.example.com' } },
    setAccounts: vi.fn(),
    hasAccount: vi.fn(),
    first: vi.fn(),
    get: vi.fn(),
    clear: vi.fn(),
    apiUrl: vi.fn((_accountId: string, path: string) => `https://api.example.com${path}`),
  };

  const mockAccountContext: AccountRoutesContext = {
    account: { id: 'account-123', endpoint: 'https://api.example.com' },
    accounts: mockAccountsLoaderData,
    apiUrl: vi.fn((path: string) => `https://api.example.com${path}`),
    isSelfHosted: () => false,
  };

  const mockResourceId: ResourceId = [
    { type: 'aws', id: 'account-123' },
    { type: 'region', id: 'us-east-1' },
  ];

  it('should make POST request with correct parameters', async ({ expect }) => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue({ ok: true, text: vi.fn().mockResolvedValue('') } as unknown as Response);

    const environments = ['prod', 'staging'];

    await persistResourceEnvironments(mockAccountContext, mockResourceId, environments);

    expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/account/account-123/resource/set_environments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resource_id: mockResourceId, environments: environments }),
    });
  });

  it('should use empty array as default for environments', async ({ expect }) => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue({ ok: true, text: vi.fn().mockResolvedValue('') } as unknown as Response);

    await persistResourceEnvironments(mockAccountContext, mockResourceId);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ body: JSON.stringify({ resource_id: mockResourceId, environments: [] }) }),
    );
  });

  it('should throw error if API request fails', async ({ expect }) => {
    const mockFetch = vi.mocked(fetch);
    const errorMessage = 'Resource not found';
    mockFetch.mockResolvedValue({ ok: false, text: vi.fn().mockResolvedValue(errorMessage) } as unknown as Response);

    await expect(persistResourceEnvironments(mockAccountContext, mockResourceId, ['prod'])).rejects.toThrow(
      errorMessage,
    );
  });

  it('should use apiUrl from context to build request URL', async ({ expect }) => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue({ ok: true, text: vi.fn().mockResolvedValue('') } as unknown as Response);

    const mockApiUrl = vi.fn().mockReturnValue('https://custom-api.com/custom-path');
    const customContext: AccountRoutesContext = {
      account: mockAccountContext.account,
      accounts: mockAccountContext.accounts,
      apiUrl: mockApiUrl,
      isSelfHosted: () => false,
    };

    await persistResourceEnvironments(customContext, mockResourceId, ['dev']);

    expect(mockApiUrl).toHaveBeenCalledWith('/account/account-123/resource/set_environments');
    expect(mockFetch).toHaveBeenCalledWith('https://custom-api.com/custom-path', expect.any(Object));
  });

  it('should handle complex resource IDs', async ({ expect }) => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue({ ok: true, text: vi.fn().mockResolvedValue('') } as unknown as Response);

    const complexResourceId: ResourceId = [
      { type: 'aws', id: 'account-123' },
      { type: 'region', id: 'us-east-1' },
      { type: 'service', id: 'ec2' },
      { type: 'instance', id: 'i-1234567890' },
    ];

    await persistResourceEnvironments(mockAccountContext, complexResourceId, ['test']);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ body: JSON.stringify({ resource_id: complexResourceId, environments: ['test'] }) }),
    );
  });

  it('should handle multiple environments', async ({ expect }) => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue({ ok: true, text: vi.fn().mockResolvedValue('') } as unknown as Response);

    const environments = ['prod', 'staging', 'dev', 'test'];

    await persistResourceEnvironments(mockAccountContext, mockResourceId, environments);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ body: JSON.stringify({ resource_id: mockResourceId, environments: environments }) }),
    );
  });

  it('should handle empty environments array explicitly', async ({ expect }) => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue({ ok: true, text: vi.fn().mockResolvedValue('') } as unknown as Response);

    await persistResourceEnvironments(mockAccountContext, mockResourceId, []);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ body: JSON.stringify({ resource_id: mockResourceId, environments: [] }) }),
    );
  });
});
