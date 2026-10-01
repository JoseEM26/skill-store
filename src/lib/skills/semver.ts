import semver from 'semver';

/**
 * Checks if a version string is a valid Semantic Version (SemVer 2.0.0).
 */
export function isValidSemver(version: string): boolean {
  if (!version || typeof version !== 'string') return false;
  return semver.valid(semver.clean(version)) !== null;
}

/**
 * Normalizes a semver string (removes leading 'v' if present).
 */
export function normalizeSemver(version: string): string | null {
  if (!version || typeof version !== 'string') return null;
  return semver.clean(version) || semver.valid(version);
}

/**
 * Verifies that a new version is strictly greater than the previous version.
 * If there is no previous version, verifies only that newVersion is valid semver.
 */
export function isVersionBump(
  newVersion: string,
  previousVersion?: string | null
): boolean {
  const cleanNew = normalizeSemver(newVersion);
  if (!cleanNew) return false;

  if (!previousVersion) return true;

  const cleanPrev = normalizeSemver(previousVersion);
  if (!cleanPrev) return true;

  return semver.gt(cleanNew, cleanPrev);
}

/**
 * Compares two semver versions.
 * Returns > 0 if v1 > v2, < 0 if v1 < v2, 0 if equal.
 */
export function compareVersions(v1: string, v2: string): number {
  const c1 = normalizeSemver(v1) ?? '0.0.0';
  const c2 = normalizeSemver(v2) ?? '0.0.0';
  return semver.compare(c1, c2);
}

/**
 * Sorts an array of semver strings in ascending order.
 */
export function sortVersionsAsc(versions: string[]): string[] {
  return [...versions].sort((a, b) => compareVersions(a, b));
}

/**
 * Sorts an array of semver strings in descending order (latest first).
 */
export function sortVersionsDesc(versions: string[]): string[] {
  return [...versions].sort((a, b) => compareVersions(b, a));
}
