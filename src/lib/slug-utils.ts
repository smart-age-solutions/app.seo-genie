/**
 * Slug utilities for consistent slug handling across the application
 */

/**
 * Convert URL slug (with hyphens) to database slug (with underscores)
 * Example: "content-creation" -> "content_creation"
 */
export function urlToDbSlug(urlSlug: string): string {
  if (!urlSlug || typeof urlSlug !== 'string') return '';
  return urlSlug.replace(/-/g, '_');
}

/**
 * Convert database slug (with underscores) to URL slug (with hyphens)
 * Example: "content_creation" -> "content-creation"
 */
export function dbToUrlSlug(dbSlug: string): string {
  if (!dbSlug || typeof dbSlug !== 'string') return '';
  return dbSlug.replace(/_/g, '-');
}

/**
 * Sanitize and validate slug for URL usage
 * Removes special characters, converts spaces to hyphens, etc.
 */
export function sanitizeSlug(slug: string): string {
  if (!slug || typeof slug !== 'string') return '';

  return slug
    .toLowerCase()
    .trim()
    // Replace spaces and underscores with hyphens
    .replace(/[\s_]+/g, '-')
    // Remove special characters except hyphens
    .replace(/[^a-z0-9-]/g, '')
    // Remove multiple consecutive hyphens
    .replace(/-+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, '');
}

/**
 * Validate if a string is a valid URL slug
 */
export function isValidSlug(slug: string): boolean {
  if (!slug || typeof slug !== 'string') return false;

  // Only lowercase letters, numbers, and hyphens allowed
  // No leading/trailing hyphens, no consecutive hyphens
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  return slugRegex.test(slug);
}

/**
 * Generate URL path for a service-subservice combination
 */
export function generateServicePath(serviceSlug: string, subServiceSlug: string): string {
  const serviceUrlSlug = dbToUrlSlug(serviceSlug);
  const subServiceUrlSlug = dbToUrlSlug(subServiceSlug);
  return `/${serviceUrlSlug}/${subServiceUrlSlug}`;
}

/**
 * Parse service and subservice slugs from URL path
 */
export function parseServicePath(path: string): { serviceSlug: string; subServiceSlug?: string } | null {
  const segments = path.split('/').filter(Boolean);

  if (segments.length === 0) return null;

  const serviceSlug = segments[0];
  const subServiceSlug = segments[1];

  if (!isValidSlug(serviceSlug)) return null;

  return {
    serviceSlug: urlToDbSlug(serviceSlug),
    subServiceSlug: subServiceSlug && isValidSlug(subServiceSlug) ? urlToDbSlug(subServiceSlug) : undefined,
  };
}