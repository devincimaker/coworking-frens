/**
 * Base URL for links in emails and invites.
 * Prefers an explicit APP_URL; falls back to Vercel's stable production domain,
 * then the per-deployment URL, then localhost for dev.
 */
export function appUrl(): string {
  const explicit = process.env.APP_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const prod = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (prod) return `https://${prod}`;
  const deployment = process.env.VERCEL_URL;
  if (deployment) return `https://${deployment}`;
  return "http://localhost:3000";
}
