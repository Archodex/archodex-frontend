import { createRoot } from 'react-dom/client';
import posthog from 'posthog-js';
import App from './App.tsx';
import './index.css';
import { isPlayground } from './lib/utils.ts';

if (import.meta.env.VITE_POSTHOG_PROJECT_API_KEY) {
  posthog.init(import.meta.env.VITE_POSTHOG_PROJECT_API_KEY, {
    api_host: `https://a.${import.meta.env.VITE_ARCHODEX_DOMAIN ?? 'archodex.com'}`,
    ui_host: 'https://us.posthog.com',
    defaults: '2025-05-24',
    enable_heatmaps: true,
    person_profiles: 'always',
    persistence: 'cookie',
    mask_all_element_attributes: !isPlayground,
    mask_all_text: !isPlayground,
    disable_session_recording: !isPlayground,
    enable_recording_console_log: isPlayground,
  });
}

if ('serviceWorker' in navigator) {
  const authServiceWorkerScript = import.meta.env.DEV ? '/auth-service-worker.ts' : '/auth-service-worker.js';
  const authServiceWorkerURL = new URL(authServiceWorkerScript, location.origin);
  try {
    void navigator.serviceWorker.register(authServiceWorkerURL.href, { type: 'module' });
  } catch (err) {
    console.error('Error registering auth service worker: ', err);
    document.body.innerHTML =
      '<h1 style="color: red;">Error registering auth service worker. See console for details.</h1>';
  }
} else {
  document.body.innerHTML =
    '<h1 style="color: red;">Service workers are not supported by this browser. Please use a modern browser such as Chrome, Firefox, Edge, or Safari.</h1>';
}

navigator.serviceWorker.ready
  .then(() => {
    console.debug('Auth service worker is ready');
  })
  .catch((err: unknown) => {
    console.error('Error waiting for auth service worker to become ready: ', err);
    document.body.innerHTML =
      '<h1 style="color: red;">Error initializing auth service worker. See console for details.</h1>';
  });

const root = document.getElementById('root');
if (!root) {
  throw new Error('No root element found');
}

createRoot(root).render(<App />);
