import config from './config.js';

class ToolCallCache {
  constructor() {
    this.cache = new Map();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Stable key generation sorting parameter keys.
   * Ensures that { b: 2, a: 1 } and { a: 1, b: 2 } generate the same key.
   */
  _generateKey(toolName, params) {
    const sortedParams = this._sortKeys(params);
    return `${toolName}:${JSON.stringify(sortedParams)}`;
  }

  _sortKeys(obj) {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    if (Array.isArray(obj)) {
      return obj.map(item => this._sortKeys(item));
    }
    return Object.keys(obj)
      .sort()
      .reduce((sorted, key) => {
        sorted[key] = this._sortKeys(obj[key]);
        return sorted;
      }, {});
  }

  /**
   * Get an item from the cache.
   * Returns null if not found or expired.
   */
  get(toolName, params) {
    const key = this._generateKey(toolName, params);
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return null;
    }

    const now = Date.now();
    if (entry.expiry && now > entry.expiry) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    this.hits++;
    return entry.value;
  }

  /**
   * Set an item in the cache with optional TTL.
   */
  set(toolName, params, value, ttlSeconds = config.cacheTtl) {
    const key = this._generateKey(toolName, params);
    const expiry = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
    this.cache.set(key, { value, expiry });
  }

  /**
   * Clear the entire cache.
   */
  clear() {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Retrieve current cache statistics.
   */
  getMetrics() {
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
    };
  }
}

export const toolCache = new ToolCallCache();
