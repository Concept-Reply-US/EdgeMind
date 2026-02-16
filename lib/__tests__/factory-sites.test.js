/**
 * Tests for factory-sites module
 */

const { isRealSite, getRealSites, getRealSitesForEnterprise, getFluxSiteFilter } = require('../factory-sites');

describe('factory-sites module', () => {
  describe('isRealSite', () => {
    it('should return true for real Enterprise A sites', () => {
      expect(isRealSite('Dallas Line 1')).toBe(true);
      expect(isRealSite('Dallas')).toBe(true);
    });

    it('should return true for real Enterprise B sites', () => {
      expect(isRealSite('Site1')).toBe(true);
      expect(isRealSite('Site2')).toBe(true);
      expect(isRealSite('Site3')).toBe(true);
    });

    it('should return false for vendor integration sites', () => {
      expect(isRealSite('prosys')).toBe(false);
      expect(isRealSite('opto22')).toBe(false);
      expect(isRealSite('maintainx')).toBe(false);
      expect(isRealSite('hivemq')).toBe(false);
      expect(isRealSite('broker')).toBe(false);
    });

    it('should return false for null or undefined', () => {
      expect(isRealSite(null)).toBe(false);
      expect(isRealSite(undefined)).toBe(false);
      expect(isRealSite('')).toBe(false);
    });
  });

  describe('getRealSites', () => {
    it('should return all real factory sites', () => {
      const sites = getRealSites();
      expect(sites).toEqual(['Dallas Line 1', 'Dallas', 'Site1', 'Site2', 'Site3']);
    });
  });

  describe('getRealSitesForEnterprise', () => {
    it('should return sites for Enterprise A', () => {
      const sites = getRealSitesForEnterprise('Enterprise A');
      expect(sites).toEqual(['Dallas Line 1', 'Dallas']);
    });

    it('should return sites for Enterprise B', () => {
      const sites = getRealSitesForEnterprise('Enterprise B');
      expect(sites).toEqual(['Site1', 'Site2', 'Site3']);
    });

    it('should return empty array for Enterprise C', () => {
      const sites = getRealSitesForEnterprise('Enterprise C');
      expect(sites).toEqual([]);
    });

    it('should return empty array for unknown enterprise', () => {
      const sites = getRealSitesForEnterprise('Unknown Enterprise');
      expect(sites).toEqual([]);
    });
  });

  describe('getFluxSiteFilter', () => {
    it('should generate valid Flux filter for all sites', () => {
      const filter = getFluxSiteFilter();
      expect(filter).toContain('|> filter(fn: (r) =>');
      expect(filter).toContain('r.site == "Dallas Line 1"');
      expect(filter).toContain('r.site == "Dallas"');
      expect(filter).toContain('r.site == "Site1"');
      expect(filter).toContain('r.site == "Site2"');
      expect(filter).toContain('r.site == "Site3"');
      expect(filter).toMatch(/or/g);
    });

    it('should not include vendor sites in filter', () => {
      const filter = getFluxSiteFilter();
      expect(filter).not.toContain('prosys');
      expect(filter).not.toContain('opto22');
      expect(filter).not.toContain('maintainx');
      expect(filter).not.toContain('hivemq');
      expect(filter).not.toContain('broker');
    });
  });
});
