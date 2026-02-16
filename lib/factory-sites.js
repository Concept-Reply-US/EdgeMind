/**
 * Factory Sites Allowlist
 *
 * Provides site filtering to prevent vendor data pollution in equipment states,
 * OEE calculations, and line status queries. Only real factory sites are tracked.
 *
 * Vendor integration endpoints (prosys, opto22, maintainx, broker, etc.) are excluded.
 */

const fs = require('fs');
const path = require('path');

// Cache for the loaded configuration
let cachedConfig = null;

/**
 * Loads the factory sites configuration from JSON file (cached)
 * @returns {Object} Configuration object with sites and allSites
 */
function loadConfig() {
  if (cachedConfig) {
    return cachedConfig;
  }

  const configPath = path.join(__dirname, '..', 'config', 'factory-sites.json');

  try {
    const rawData = fs.readFileSync(configPath, 'utf8');
    cachedConfig = JSON.parse(rawData);
    console.log(`[FACTORY-SITES] Loaded ${cachedConfig.allSites.length} real factory sites from config`);
    return cachedConfig;
  } catch (error) {
    console.error('[FACTORY-SITES] Failed to load factory-sites.json:', error.message);
    // Fallback to hardcoded list if config file is missing
    cachedConfig = {
      allSites: ['Dallas Line 1', 'Dallas', 'Site1', 'Site2', 'Site3'],
      sites: {
        'Enterprise A': ['Dallas Line 1', 'Dallas'],
        'Enterprise B': ['Site1', 'Site2', 'Site3'],
        'Enterprise C': []
      }
    };
    return cachedConfig;
  }
}

/**
 * Checks if a site is a real factory site (not a vendor integration endpoint)
 * @param {string} site - Site name to check
 * @returns {boolean} True if site is in the allowlist
 */
function isRealSite(site) {
  if (!site) return false;
  const config = loadConfig();
  return config.allSites.includes(site);
}

/**
 * Gets all real factory sites
 * @returns {string[]} Array of real factory site names
 */
function getRealSites() {
  const config = loadConfig();
  return config.allSites;
}

/**
 * Gets real factory sites for a specific enterprise
 * @param {string} enterprise - Enterprise name (e.g., "Enterprise A")
 * @returns {string[]} Array of site names for the enterprise
 */
function getRealSitesForEnterprise(enterprise) {
  const config = loadConfig();
  return config.sites[enterprise] || [];
}

/**
 * Generates a Flux query filter string for real factory sites
 * @returns {string} Flux filter expression (e.g., '|> filter(fn: (r) => r.site == "Dallas" or r.site == "Site1" or ...)')
 */
function getFluxSiteFilter() {
  const config = loadConfig();
  const sites = config.allSites;

  if (sites.length === 0) {
    // If no sites configured, allow all (avoid breaking queries)
    return '';
  }

  const conditions = sites.map(site => `r.site == "${site}"`).join(' or ');
  return `|> filter(fn: (r) => ${conditions})`;
}

module.exports = {
  isRealSite,
  getRealSites,
  getRealSitesForEnterprise,
  getFluxSiteFilter
};
