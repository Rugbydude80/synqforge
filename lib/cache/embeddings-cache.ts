/**
 * Embeddings Cache
 * In-memory cache for similarity search results to improve performance
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export class EmbeddingsCache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly defaultTTL = 5 * 60 * 1000; // 5 minutes

  set<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }

  clear(): void {
    this.cache.clear();
  }

  // Get cache statistics
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  // Generate cache key for similarity searches
  static similarityKey(queryText: string, epicId: string | undefined): string {
    const key = `similarity:${epicId || 'none'}:${queryText.substring(0, 100)}`;
    return Buffer.from(key).toString('base64');
  }
}

// Singleton instance
export const embeddingsCache = new EmbeddingsCache();

