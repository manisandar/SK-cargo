/**
 * IN-MEMORY CLIENT-SIDE CACHE SERVICE
 *
 * Designed specifically for Supabase Free Tier optimization:
 * 1. STRICTLY IN-MEMORY: Never writes customer data, photos, or tokens to localStorage/sessionStorage.
 * 2. AUTOMATIC EXPIRY:
 *    - Signed URLs: 50-minute reuse window for 60-minute signed URLs (so browser HTTP cache works without expiring).
 *    - Data Queries: 30-60 second staleTime for tab switching without database re-fetching.
 * 3. ZERO-ORPHAN SECURITY: Fully cleared on logout and on user/account change.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class InMemorySignedUrlCache {
  private cache = new Map<string, CacheEntry<string>>();

  /**
   * Default validity is 50 minutes (3000 seconds) for a 60-minute (3600 seconds) Supabase signed URL.
   * This provides a 10-minute safe buffer before the token expires.
   */
  private defaultTtlMs = 50 * 60 * 1000;

  get(path: string): string | null {
    const entry = this.cache.get(path);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(path);
      return null;
    }
    return entry.data;
  }

  set(path: string, signedUrl: string, ttlMs: number = this.defaultTtlMs): void {
    this.cache.set(path, {
      data: signedUrl,
      expiresAt: Date.now() + ttlMs,
    });
  }

  /**
   * Partitions an array of storage paths into already-cached URLs and paths that still need signing.
   * Enables batch signing with `createSignedUrls` so one single request signs all missing photos.
   */
  getBatchStatus(paths: string[]): {
    cached: Map<string, string>;
    missing: string[];
  } {
    const cached = new Map<string, string>();
    const missing: string[] = [];

    for (const path of paths) {
      const url = this.get(path);
      if (url) {
        cached.set(path, url);
      } else {
        missing.push(path);
      }
    }

    return { cached, missing };
  }

  setBatch(entries: Array<{ path: string; signedUrl: string }>, ttlMs: number = this.defaultTtlMs): void {
    const now = Date.now();
    for (const item of entries) {
      this.cache.set(item.path, {
        data: item.signedUrl,
        expiresAt: now + ttlMs,
      });
    }
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

class InMemoryDataQueryCache {
  private cache = new Map<string, CacheEntry<unknown>>();

  /** Default stale time: 45 seconds */
  private defaultTtlMs = 45 * 1000;

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  set<T>(key: string, data: T, ttlMs: number = this.defaultTtlMs): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
    });
  }

  invalidate(keyPrefix?: string): void {
    if (!keyPrefix) {
      this.cache.clear();
      return;
    }
    for (const key of this.cache.keys()) {
      if (key.startsWith(keyPrefix)) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }
}

export const signedUrlCache = new InMemorySignedUrlCache();
export const dataQueryCache = new InMemoryDataQueryCache();

/**
 * Completely purges all client in-memory caches.
 * MUST be invoked whenever the user logs out or switches accounts.
 */
export function clearAllClientCaches(): void {
  signedUrlCache.clear();
  dataQueryCache.clear();
}
