/**
 * Centralized API URL configuration.
 *
 * - In development, Vite's proxy forwards /api/* to the Express server,
 *   so we use relative paths (e.g. "/api/upload").
 * - In production, set the VITE_API_URL environment variable to point
 *   to your deployed Express server (e.g. "https://api.yourdomain.com").
 *   If not set, falls back to relative paths (works if Express is behind
 *   the same reverse proxy / domain).
 */

const API_BASE = import.meta.env.VITE_API_URL ?? "";

export function getApiUrl(path: string): string {
  // Ensure path starts with /
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${normalizedPath}`;
}
