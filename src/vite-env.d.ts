/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Google OAuth Client ID (Netlify: VITE_GOOGLE_CLIENT_ID). Optional; guest mode always works. */
  readonly VITE_GOOGLE_CLIENT_ID?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
