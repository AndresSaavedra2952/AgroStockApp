/**
 * Gestor global de rate limiting para el carrito
 * Comparte el estado de rate limiting entre todos los componentes
 */
class CartRateLimitManager {
  constructor() {
    this.rateLimited = false;
    this.retryAfter = null;
    this.timeoutId = null;
    this.listeners = new Set();
  }

  /**
   * Suscribirse a cambios en el estado de rate limiting
   */
  subscribe(callback) {
    this.listeners.add(callback);
    // Llamar inmediatamente con el estado actual
    callback(this.rateLimited, this.retryAfter);
    
    // Retornar función de desuscripción
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Notificar a todos los listeners
   */
  notify() {
    this.listeners.forEach(callback => {
      callback(this.rateLimited, this.retryAfter);
    });
  }

  /**
   * Activar rate limiting
   */
  setRateLimited(retryAfterSeconds) {
    // Cancelar timeout anterior si existe
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    this.rateLimited = true;
    this.retryAfter = retryAfterSeconds;
    
    // Convertir a milisegundos
    const retryAfterMs = retryAfterSeconds * 1000;
    
    console.warn(`🚫 CartRateLimitManager: Bloqueando todas las llamadas al carrito por ${retryAfterSeconds} segundos`);
    
    // Configurar timeout para desactivar
    this.timeoutId = setTimeout(() => {
      this.rateLimited = false;
      this.retryAfter = null;
      this.timeoutId = null;
      console.log('✅ CartRateLimitManager: Rate limit expirado, reanudando llamadas al carrito');
      this.notify();
    }, retryAfterMs);

    this.notify();
  }

  /**
   * Verificar si hay rate limiting activo
   */
  isRateLimited() {
    return this.rateLimited;
  }

  /**
   * Obtener tiempo restante en segundos
   */
  getRetryAfter() {
    return this.retryAfter;
  }

  /**
   * Forzar desactivación (útil para testing o reset manual)
   */
  reset() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
    this.rateLimited = false;
    this.retryAfter = null;
    this.timeoutId = null;
    this.notify();
  }
}

// Instancia singleton
const cartRateLimitManager = new CartRateLimitManager();

export default cartRateLimitManager;


