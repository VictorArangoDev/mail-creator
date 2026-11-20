/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly RESEND_API_KEY: string;
  readonly RESEND_FROM_EMAIL?: string;
  readonly RESEND_INSECURE_TLS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
