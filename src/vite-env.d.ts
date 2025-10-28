/// <reference types="vite/client" />
/// <reference types="vite-plugin-svgr/client" />

interface ImportMetaEnv {
  VITE_ARCHODEX_DOMAIN?: readonly string;
  VITE_ARCHODEX_REGIONS?: readonly string;
  VITE_USER_POOL_CLIENT_ID?: readonly string;
  VITE_POSTHOG_PROJECT_API_KEY?: readonly string;
}

interface ImportMeta {
  env: ImportMetaEnv;
}
