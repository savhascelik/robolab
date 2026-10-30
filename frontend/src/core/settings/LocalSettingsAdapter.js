import { BaseSettingsAdapter } from './BaseSettingsAdapter.js';

const DEFAULT_STORAGE_KEY = 'learn_arduino_user_settings_v1';

/**
 * LocalStorage Settings Persistence Adapter (with automatic in-memory fallback for Node.js tests).
 */
export class LocalSettingsAdapter extends BaseSettingsAdapter {
  /**
   * @param {object} [options]
   * @param {string} [options.storageKey]
   */
  constructor(options = {}) {
    super({ id: 'local_storage_adapter', ...options });
    this.storageKey = options.storageKey || DEFAULT_STORAGE_KEY;
    this.memoryStore = new Map();
  }

  _getKeyForSession(userSession = null) {
    if (userSession?.userId) {
      return `${this.storageKey}:${userSession.userId}`;
    }
    return this.storageKey;
  }

  /**
   * Synchronously reads the envelope from `localStorage` or memory fallback.
   * @param {object|null} [userSession]
   */
  loadSync(userSession = null) {
    const key = this._getKeyForSession(userSession);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(key) || window.localStorage.getItem(this.storageKey);
        if (!raw) return null;
        return JSON.parse(raw);
      }
    } catch {
      // Fallback to in-memory store
    }
    return this.memoryStore.get(key) || this.memoryStore.get(this.storageKey) || null;
  }

  /**
   * Synchronously writes the envelope to `localStorage` and memory store.
   * @param {{ version: number, updatedAt: number, userId: string|null, values: Record<string, any> }} envelope
   * @param {object|null} [userSession]
   */
  saveSync(envelope, userSession = null) {
    const key = this._getKeyForSession(userSession);
    const copy = JSON.parse(JSON.stringify(envelope));
    this.memoryStore.set(key, copy);
    this.memoryStore.set(this.storageKey, copy);

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const serialized = JSON.stringify(copy);
        window.localStorage.setItem(key, serialized);
        window.localStorage.setItem(this.storageKey, serialized);
      }
    } catch {
      // Ignore storage quota errors
    }

    return { synced: true, updatedAt: copy.updatedAt };
  }

  async load(userSession = null) {
    return this.loadSync(userSession);
  }

  async save(envelope, userSession = null) {
    return this.saveSync(envelope, userSession);
  }
}
