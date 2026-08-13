/// <reference types="vite/client" />

/* Added with the backend wire: api.ts reads import.meta.env.VITE_API_URL so the
   API origin is configurable per environment instead of hardcoded to localhost. */
interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
