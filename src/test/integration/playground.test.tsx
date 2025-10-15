import { act } from 'react';
import { afterEach, beforeEach, describe, it, vi } from 'vitest';
import { createRoot, Root } from 'react-dom/client';
import { useRouteError } from 'react-router';

vi.mock('@/lib/utils', async (importActual) => {
  const actual = await importActual<typeof import('@/lib/utils')>();
  return { ...actual, isPlayground: true };
});
vi.mock('@/components/LogoHorizontalCoral.svg?react', () => ({ default: () => <svg data-testid="logo-horizontal" /> }));
vi.mock('@/components/LogoCoral.svg?react', () => ({ default: () => <svg data-testid="logo-coral" /> }));
vi.mock('@/ErrorBoundary', async (importActual) => {
  // Replace ErrorBoundary with a mock that throws the route error to fail tests if it is rendered
  const actual = await importActual<typeof import('@/ErrorBoundary')>();
  const MockErrorBoundary = () => {
    throw useRouteError();
  };

  return { ...actual, default: MockErrorBoundary };
});

describe('playground experience', () => {
  let container: HTMLDivElement;
  let root: Root;
  let fetchMock: ReturnType<typeof vi.fn>;
  let originalFetch: typeof fetch;
  let originalRequest: typeof Request;

  beforeEach(() => {
    vi.resetModules();
    sessionStorage.clear();
    localStorage.clear();
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);

    container = document.createElement('div');
    container.id = 'root';
    document.body.appendChild(container);

    root = createRoot(container);

    originalFetch = globalThis.fetch;
    fetchMock = vi.fn(() => {
      throw new Error('Unexpected fetch invocation in playground mode');
    });
    Object.defineProperty(globalThis, 'fetch', { configurable: true, writable: true, value: fetchMock });

    originalRequest = globalThis.Request;
    const RequestWithBase = class extends originalRequest {
      constructor(input: RequestInfo | URL, init?: RequestInit) {
        if (typeof input === 'string' && input === '') {
          super('https://play.archodex.com/', init);
        } else {
          super(input, init);
        }
      }
    };
    Object.defineProperty(globalThis, 'Request', { configurable: true, writable: true, value: RequestWithBase });

    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    class ResizeObserverMock {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    }
    vi.stubGlobal('ResizeObserver', ResizeObserverMock);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    Object.defineProperty(globalThis, 'fetch', { configurable: true, writable: true, value: originalFetch });
    Object.defineProperty(globalThis, 'Request', { configurable: true, writable: true, value: originalRequest });
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('renders without triggering the error boundary', async ({ expect }) => {
    const { default: App } = await import('@/App');

    await act(async () => {
      root.render(<App />);

      // Force waiting a tick to allow any useEffect calls to execute
      return Promise.resolve();
    });

    // Safety check that we didn't fetch anything
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
