export interface Env {
  ASSETS: Fetcher;
  ROOMS: DurableObjectNamespace;
  DB: D1Database;
  HF_ENV?: string;
  APP_SLUG?: string;
}
