import config from './config.js';
import { logger } from './logger.js';

class Cache {
  constructor() {
    this.store = new Map();
    this.ttl = config.cacheTtl * 1000; // convert seconds to ms
  }

  set(key, value, customTtl = null) {
    const expiry = customTtl !== null ? customTtl * 1000 : this.ttl;
    const expiresAt = Date.now() + expiry;
    this.store.set(key, { value, expiresAt });
    logger.debug(`Cache Set -> "${key}" (expires in ${expiry / 1000}s)`);
  }

  get(key) {
    const item = this.store.get(key);
    if (!item) {
      return null;
    }
    if (Date.now() > item.expiresAt) {
      logger.debug(`Cache Expired/Miss -> "${key}"`);
      this.store.delete(key);
      return null;
    }
    logger.debug(`Cache Hit -> "${key}"`);
    return item.value;
  }

  clear() {
    this.store.clear();
    logger.debug('Cache Cleared');
  }
}

export const cache = new Cache();
