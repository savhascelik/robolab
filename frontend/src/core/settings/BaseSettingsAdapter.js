/**
 * Abstract Base Class for User Settings Persistence & Backend Synchronization Adapters.
 *
 * Follows the Strategy / Adapter pattern and OOP Inheritance rules:
 * - `LocalSettingsAdapter` persists preferences in browser `localStorage` (or memory in headless Node).
 * - `RemoteApiSettingsAdapter` synchronizes user preferences with a remote Backend REST/GraphQL API
 *   when a user logs in (`hydrateFromBackend`) or updates a preference.
 */
export class BaseSettingsAdapter {
  /**
   * @param {object} [options]
   * @param {string} [options.id]
   */
  constructor(options = {}) {
    if (new.target === BaseSettingsAdapter) {
      throw new Error('BaseSettingsAdapter is an abstract base class and cannot be instantiated directly.');
    }
    this.id = options.id || 'base_settings_adapter';
  }

  /**
   * Loads a stored settings envelope `{ version, updatedAt, userId, values }`.
   * @param {object|null} [_userSession]
   * @returns {Promise<{ version: number, updatedAt: number, userId: string|null, values: Record<string, any> }|null>}
   */
  async load(_userSession = null) {
    throw new Error(`${this.constructor.name}.load() must be implemented by subclass.`);
  }

  /**
   * Persists a settings envelope `{ version, updatedAt, userId, values }`.
   * @param {{ version: number, updatedAt: number, userId: string|null, values: Record<string, any> }} _envelope
   * @param {object|null} [_userSession]
   * @returns {Promise<{ synced: boolean, updatedAt: number }>}
   */
  async save(_envelope, _userSession = null) {
    throw new Error(`${this.constructor.name}.save() must be implemented by subclass.`);
  }
}
