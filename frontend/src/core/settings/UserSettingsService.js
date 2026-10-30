import { eventBus } from '../events/EventBus.js';
import { LocalSettingsAdapter } from './LocalSettingsAdapter.js';
import { RemoteApiSettingsAdapter } from './RemoteApiSettingsAdapter.js';

/**
 * Validated Pin HUD Visibility Modes:
 * - `'pin_hover'` (DEFAULT): Component hover/selection does NOT show all pin labels at once;
 *   only the specific pin/input under the cursor (or compatible pins during active wire drag) displays its pill badge.
 * - `'component_hover'`: Selecting or hovering a component displays all of its connected/available input & output pin badges.
 * - `'always'`: Displays all pin badges for all active components on the 3D stage continuously.
 */
export const PIN_VISIBILITY_MODES = {
  PIN_HOVER: 'pin_hover',
  COMPONENT_HOVER: 'component_hover',
  ALWAYS: 'always'
};

/**
 * Default Centralized User Settings Schema (`DEFAULT_USER_SETTINGS`).
 */
export const DEFAULT_USER_SETTINGS = Object.freeze({
  'wiring.pinVisibilityMode': PIN_VISIBILITY_MODES.PIN_HOVER,
  'wiring.highlightNearestClassOnDrag': true,
  'wiring.nearestHighlightCount': 3,
  'stage.showGrid': true,
  'stage.soundEnabled': true,
  'stage.hostBoardOverride': 'auto',
  'ui.catalogDockMode': 'modal',
  'ui.locale': 'en'
});

/**
 * Schema validators for each setting key to ensure corrupt localStorage or remote payloads never break the app.
 */
const SETTING_VALIDATORS = {
  'wiring.pinVisibilityMode': (v) =>
    v === PIN_VISIBILITY_MODES.PIN_HOVER ||
    v === PIN_VISIBILITY_MODES.COMPONENT_HOVER ||
    v === PIN_VISIBILITY_MODES.ALWAYS,
  'wiring.highlightNearestClassOnDrag': (v) => typeof v === 'boolean',
  'wiring.nearestHighlightCount': (v) => typeof v === 'number' && v >= 1 && v <= 10,
  'stage.showGrid': (v) => typeof v === 'boolean',
  'stage.soundEnabled': (v) => typeof v === 'boolean',
  'stage.hostBoardOverride': (v) =>
    v === 'auto' || v === 'board.arduino_uno' || v === 'board.esp32_devkit' || v === 'board.jetson_nano',
  'ui.catalogDockMode': (v) => v === 'modal' || v === 'left' || v === 'right' || v === 'bottom',
  'ui.locale': (v) => v === 'tr' || v === 'en'
};

/**
 * Centralized User Settings & Cloud Profile Synchronization Service (`UserSettingsService`).
 *
 * Strictly adheres to Single Responsibility Principle:
 * - Maintains the single source of truth for user preferences across 3D Stage, Smart Wiring HUD,
 *   Component Catalog, Audio Synthesizer, and Localization.
 * - Persists changes immediately via `LocalSettingsAdapter`.
 * - Synchronizes in the background with `RemoteApiSettingsAdapter` when a user logs in (`loginAndHydrate(userSession)`),
 *   automatically merging remote profile preferences and broadcasting reactive updates over `EventBus`.
 */
export class UserSettingsService {
  /**
   * @param {object} [options]
   * @param {import('./LocalSettingsAdapter.js').LocalSettingsAdapter} [options.localAdapter]
   * @param {import('./RemoteApiSettingsAdapter.js').RemoteApiSettingsAdapter} [options.remoteAdapter]
   * @param {import('../events/EventBus.js').EventBus} [options.bus]
   */
  constructor(options = {}) {
    this.localAdapter = options.localAdapter || new LocalSettingsAdapter();
    this.remoteAdapter = options.remoteAdapter || new RemoteApiSettingsAdapter();
    this.bus = options.bus || eventBus;

    /** @type {Record<string, any>} */
    this.values = { ...DEFAULT_USER_SETTINGS };
    this.updatedAt = Date.now();
    this.version = 1;

    /** @type {{ userId: string, email?: string, displayName?: string, token?: string, apiEndpoint?: string }|null} */
    this.userSession = null;
    this.syncStatus = 'local'; // 'local' | 'syncing' | 'synced' | 'offline_queued'

    /** @type {Set<(change: { key: string, value: any, values: Record<string, any>, source: string }) => void>} */
    this.listeners = new Set();

    this._loadInitialFromLocal();
  }

  _loadInitialFromLocal() {
    const stored = this.localAdapter.loadSync(this.userSession);
    if (stored && stored.values && typeof stored.values === 'object') {
      this._applyValidatedPatch(stored.values);
      if (typeof stored.updatedAt === 'number') {
        this.updatedAt = stored.updatedAt;
      }
    }
  }

  /**
   * Validates and merges a partial settings dictionary into `this.values`.
   * @param {Record<string, any>} patch
   * @returns {string[]} List of changed keys
   */
  _applyValidatedPatch(patch) {
    const changedKeys = [];
    if (!patch || typeof patch !== 'object') return changedKeys;

    for (const [key, rawVal] of Object.entries(patch)) {
      if (!(key in DEFAULT_USER_SETTINGS)) continue;
      const validator = SETTING_VALIDATORS[key];
      if (validator && !validator(rawVal)) continue;

      if (this.values[key] !== rawVal) {
        this.values[key] = rawVal;
        changedKeys.push(key);
      }
    }
    return changedKeys;
  }

  _buildEnvelope() {
    return {
      version: this.version,
      updatedAt: this.updatedAt,
      userId: this.userSession?.userId || null,
      values: { ...this.values }
    };
  }

  /**
   * Retrieves a setting value by key, falling back to `DEFAULT_USER_SETTINGS`.
   * @param {string} key
   */
  get(key) {
    if (key in this.values) {
      return this.values[key];
    }
    return DEFAULT_USER_SETTINGS[key];
  }

  /**
   * Returns a shallow copy of all active user settings.
   */
  getAll() {
    return { ...this.values };
  }

  /**
   * Updates a single setting key, persists locally, notifies listeners, and syncs to backend if logged in.
   * @param {string} key
   * @param {any} value
   * @param {{ syncRemote?: boolean, source?: string }} [options]
   * @returns {boolean} True if value was valid and changed
   */
  set(key, value, options = {}) {
    if (!(key in DEFAULT_USER_SETTINGS)) return false;
    const validator = SETTING_VALIDATORS[key];
    if (validator && !validator(value)) return false;

    const changed = this.values[key] !== value;
    this.values[key] = value;
    this.updatedAt = Date.now();

    const envelope = this._buildEnvelope();
    this.localAdapter.saveSync(envelope, this.userSession);

    const source = options.source || 'user';
    if (changed || options.forceNotify) {
      this._notifyListeners(key, value, source);
    }

    if (options.syncRemote !== false && this.userSession?.userId) {
      this._pushRemoteInBackground(envelope);
    }

    return true;
  }

  /**
   * Bulk-updates multiple settings keys at once.
   * @param {Record<string, any>} patch
   * @param {{ syncRemote?: boolean, source?: string }} [options]
   * @returns {string[]} Changed keys
   */
  update(patch, options = {}) {
    const changedKeys = this._applyValidatedPatch(patch);
    if (changedKeys.length === 0) return changedKeys;

    this.updatedAt = Date.now();
    const envelope = this._buildEnvelope();
    this.localAdapter.saveSync(envelope, this.userSession);

    const source = options.source || 'user';
    for (const key of changedKeys) {
      this._notifyListeners(key, this.values[key], source);
    }

    if (options.syncRemote !== false && this.userSession?.userId) {
      this._pushRemoteInBackground(envelope);
    }

    return changedKeys;
  }

  /**
   * Resets all user preferences back to factory defaults (`DEFAULT_USER_SETTINGS`).
   */
  resetToDefaults() {
    return this.update({ ...DEFAULT_USER_SETTINGS }, { source: 'reset' });
  }

  /**
   * Subscribes to any setting change.
   * @param {(change: { key: string, value: any, values: Record<string, any>, source: string }) => void} cb
   */
  onChange(cb) {
    if (typeof cb === 'function') {
      this.listeners.add(cb);
    }
    return () => this.listeners.delete(cb);
  }

  _notifyListeners(key, value, source) {
    const payload = {
      key,
      value,
      values: this.getAll(),
      source
    };
    for (const cb of this.listeners) {
      cb(payload);
    }
    this.bus?.emit('settings:changed', payload);
  }

  async _pushRemoteInBackground(envelope) {
    if (!this.userSession?.userId) return;
    this.syncStatus = 'syncing';
    this.bus?.emit('settings:sync_status', { status: this.syncStatus, userSession: this.userSession });

    const res = await this.remoteAdapter.save(envelope, this.userSession);
    this.syncStatus = res.synced ? 'synced' : 'offline_queued';
    this.bus?.emit('settings:sync_status', { status: this.syncStatus, userSession: this.userSession });
  }

  /**
   * Authenticates a user session and hydrates their settings profile from the backend in the background.
   * When the remote profile arrives, merges valid preferences, persists locally, and notifies all active UI/Stage modules.
   *
   * @param {{ userId: string, email?: string, displayName?: string, token?: string, apiEndpoint?: string, cloudSettings?: Record<string, any>, updatedAt?: number }} userSession
   * @returns {Promise<{ hydrated: boolean, changedKeys: string[], syncStatus: string, values: Record<string, any> }>}
   */
  async loginAndHydrate(userSession) {
    if (!userSession || !userSession.userId) {
      return {
        hydrated: false,
        changedKeys: [],
        syncStatus: this.syncStatus,
        values: this.getAll()
      };
    }

    this.userSession = { ...userSession };
    this.syncStatus = 'syncing';
    this.bus?.emit('auth:session_changed', { loggedIn: true, userSession: this.userSession });
    this.bus?.emit('settings:sync_status', { status: this.syncStatus, userSession: this.userSession });

    // 1. Check user-specific local cache first
    const userLocal = this.localAdapter.loadSync(this.userSession);
    const changedSet = new Set();
    if (userLocal?.values) {
      for (const k of this._applyValidatedPatch(userLocal.values)) {
        changedSet.add(k);
      }
    }

    // 2. Fetch remote profile settings from Backend API in the background
    const remoteEnvelope = await this.remoteAdapter.load(this.userSession);
    let hydrated = false;

    if (remoteEnvelope && remoteEnvelope.values) {
      for (const k of this._applyValidatedPatch(remoteEnvelope.values)) {
        changedSet.add(k);
      }
      this.updatedAt = remoteEnvelope.updatedAt || Date.now();
      hydrated = true;
      this.syncStatus = 'synced';
    } else {
      this.syncStatus = 'local';
    }

    // 3. Save merged state locally & flush any offline queue
    const mergedEnvelope = this._buildEnvelope();
    this.localAdapter.saveSync(mergedEnvelope, this.userSession);
    await this.remoteAdapter.flushPendingQueue(this.userSession);

    const changedKeys = [...changedSet];
    for (const key of changedKeys) {
      this._notifyListeners(key, this.values[key], 'backend_hydration');
    }

    this.bus?.emit('settings:hydrated', {
      hydrated,
      userId: this.userSession.userId,
      changedKeys,
      values: this.getAll()
    });
    this.bus?.emit('settings:sync_status', { status: this.syncStatus, userSession: this.userSession });

    return {
      hydrated,
      changedKeys,
      syncStatus: this.syncStatus,
      values: this.getAll()
    };
  }

  /**
   * Logs out the current user session and switches back to local guest profile.
   */
  logout() {
    const prevUser = this.userSession;
    this.userSession = null;
    this.syncStatus = 'local';
    this.bus?.emit('auth:session_changed', { loggedIn: false, previousUser: prevUser });
    this.bus?.emit('settings:sync_status', { status: this.syncStatus, userSession: null });
  }
}

export const userSettings = new UserSettingsService();
