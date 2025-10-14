import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

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
