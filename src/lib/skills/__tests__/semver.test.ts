import { describe, it, expect } from 'vitest';
import {
  isValidSemver,
  normalizeSemver,
  isVersionBump,
  compareVersions,
  sortVersionsAsc,
  sortVersionsDesc,
} from '../semver';

describe('semver utils', () => {
  describe('isValidSemver', () => {
    it('accepts valid semver formats', () => {
      expect(isValidSemver('1.0.0')).toBe(true);
      expect(isValidSemver('0.1.0')).toBe(true);
      expect(isValidSemver('2.3.4-beta.1')).toBe(true);
      expect(isValidSemver('v1.2.3')).toBe(true);
    });

    it('rejects invalid semver formats', () => {
      expect(isValidSemver('1.0')).toBe(false);
      expect(isValidSemver('v1')).toBe(false);
      expect(isValidSemver('alpha')).toBe(false);
      expect(isValidSemver('')).toBe(false);
    });
  });

  describe('normalizeSemver', () => {
    it('normalizes valid versions removing prefix', () => {
      expect(normalizeSemver('v1.2.3')).toBe('1.2.3');
      expect(normalizeSemver('1.2.3')).toBe('1.2.3');
    });

    it('returns null for invalid versions', () => {
      expect(normalizeSemver('invalid')).toBeNull();
    });
  });

  describe('isVersionBump', () => {
    it('accepts new version when no previous version exists', () => {
      expect(isVersionBump('1.0.0', null)).toBe(true);
      expect(isVersionBump('0.1.0', undefined)).toBe(true);
    });

    it('accepts strictly greater version increments', () => {
      expect(isVersionBump('1.0.1', '1.0.0')).toBe(true);
      expect(isVersionBump('1.1.0', '1.0.9')).toBe(true);
      expect(isVersionBump('2.0.0', '1.9.9')).toBe(true);
    });

    it('rejects equal or lower versions (regressions)', () => {
      expect(isVersionBump('1.0.0', '1.0.0')).toBe(false);
      expect(isVersionBump('1.0.0', '1.0.1')).toBe(false);
      expect(isVersionBump('0.9.0', '1.0.0')).toBe(false);
    });

    it('rejects invalid new version format', () => {
      expect(isVersionBump('invalid', '1.0.0')).toBe(false);
    });
  });

  describe('compareVersions and sorting', () => {
    it('compares correctly', () => {
      expect(compareVersions('1.1.0', '1.0.0')).toBeGreaterThan(0);
      expect(compareVersions('1.0.0', '1.1.0')).toBeLessThan(0);
      expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
    });

    it('sorts versions ascending and descending', () => {
      const list = ['2.0.0', '0.1.0', '1.0.0', '1.5.0'];
      expect(sortVersionsAsc(list)).toEqual(['0.1.0', '1.0.0', '1.5.0', '2.0.0']);
      expect(sortVersionsDesc(list)).toEqual(['2.0.0', '1.5.0', '1.0.0', '0.1.0']);
    });
  });
});
