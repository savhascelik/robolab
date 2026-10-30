/**
 * Decoupled Pub/Sub Event Bus for communication between
 * 3D Stage, Hardware Components, Simulator, and UI Controllers.
 */
export class EventBus {
  constructor() {
    /** @type {Map<string, Set<Function>>} */
    this.listeners = new Map();
  }

  /**
   * Subscribe to an event topic.
   * @param {string} eventName
   * @param {Function} handler
   * @returns {() => void} Unsubscribe function
   */
  on(eventName, handler) {
    if (typeof handler !== 'function') {
      throw new TypeError(`EventBus.on requires a function handler for "${eventName}"`);
    }
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set());
    }
    this.listeners.get(eventName).add(handler);
    return () => this.off(eventName, handler);
  }

  /**
   * Subscribe to an event topic once.
   * @param {string} eventName
   * @param {Function} handler
   * @returns {() => void}
   */
  once(eventName, handler) {
    const wrapper = (payload) => {
      this.off(eventName, wrapper);
      handler(payload);
    };
    return this.on(eventName, wrapper);
  }

  /**
   * Remove a specific handler from an event topic.
   * @param {string} eventName
   * @param {Function} handler
   */
  off(eventName, handler) {
    const set = this.listeners.get(eventName);
    if (!set) return;
    set.delete(handler);
    if (set.size === 0) {
      this.listeners.delete(eventName);
    }
  }

  /**
   * Emit an event with payload to all registered listeners.
   * @param {string} eventName
   * @param {*} payload
   * @returns {number} Number of invoked listeners
   */
  emit(eventName, payload) {
    const set = this.listeners.get(eventName);
    if (!set || set.size === 0) return 0;
    let count = 0;
    for (const handler of [...set]) {
      handler(payload);
      count++;
    }
    return count;
  }

  /**
   * Returns active listener count for a given event (or total if omitted).
   * @param {string} [eventName]
   */
  listenerCount(eventName) {
    if (eventName) {
      return this.listeners.get(eventName)?.size || 0;
    }
    let total = 0;
    for (const set of this.listeners.values()) {
      total += set.size;
    }
    return total;
  }

  clear() {
    this.listeners.clear();
  }
}

export const globalEventBus = new EventBus();
export const eventBus = globalEventBus;
