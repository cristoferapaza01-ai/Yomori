/**
 * Servicio de Caché en memoria de alto rendimiento con TTL (Time-To-Live).
 * Acelera las respuestas de segundos a milisegundos.
 */
class MemoryCacheService {
  constructor() {
    this.cache = new Map();
  }

  /**
   * Obtiene un valor de la caché si no ha expirado
   */
  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  /**
   * Guarda un valor en la caché con un tiempo de vida en segundos (por defecto 15 min)
   */
  set(key, value, ttlSeconds = 900) {
    const expiry = Date.now() + (ttlSeconds * 1000);
    this.cache.set(key, { value, expiry });
    
    // Limpieza periódica si la caché supera 500 elementos
    if (this.cache.size > 500) {
      this.cleanup();
    }
  }

  /**
   * Elimina una clave o patrón
   */
  delete(key) {
    return this.cache.delete(key);
  }

  /**
   * Limpia elementos expirados
   */
  cleanup() {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Limpia toda la caché
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Estadísticas de la caché
   */
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

export const cacheService = new MemoryCacheService();
