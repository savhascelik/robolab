import { BaseSettingsAdapter } from './BaseSettingsAdapter.js';

/**
 * Remote Backend API Settings Adapter (`RemoteApiSettingsAdapter`).
 *
 * Ready for Backend Auth & Cloud Profile Synchronization:
 * - When a user logs in (`userSession = { userId, token, apiEndpoint, profile }`), `load(userSession)`
 *   fetches the user's cloud settings in the background (`GET /api/v1/user/settings` or custom transport).
 * - When settings change while authenticated, `save(envelope, userSession)` pushes the updated envelope
 *   to the backend (`PUT /api/v1/user/settings`).
 * - If offline or the backend is unreachable, queues the update in `pendingSyncQueue` so nothing is lost.
 */
export class RemoteApiSettingsAdapter extends BaseSettingsAdapter {
  /**
   * @param {object} [options]
   * @param {string} [options.baseUrl]
   * @param {Function} [options.transport] Optional custom async transport `({ method, url, headers, body, userSession }) => Promise<any>`
   */
  constructor(options = {}) {
    super({ id: 'remote_api_adapter', ...options });
    this.baseUrl = options.baseUrl || '/api/v1/user/settings';
    this.transport = options.transport || null;
    /** @type {Array<{ envelope: object, userSession: object, queuedAt: number }>} */
    this.pendingSyncQueue = [];
    this.lastSyncedAt = null;
  }

  /**
   * Configures a custom backend transport function or API endpoint at runtime.
   * @param {Function|null} transportFn
   * @param {string} [baseUrl]
   */
  setBackendTransport(transportFn, baseUrl) {
    this.transport = transportFn;
    if (baseUrl) {
      this.baseUrl = baseUrl;
    }
  }

  async _request({ method, url, headers, body, userSession }) {
    if (typeof this.transport === 'function') {
      return this.transport({ method, url, headers, body, userSession });
    }

    if (typeof globalThis.fetch === 'function' && userSession?.apiEndpoint) {
      const response = await globalThis.fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
      });
      if (!response.ok) {
        throw new Error(`Remote settings HTTP ${response.status}`);
      }
      return response.json();
    }

    // If userSession already carries preloaded cloud settings (e.g. from SSO / JWT login response), return them
    if (method === 'GET' && userSession?.cloudSettings) {
      return {
        version: 1,
        updatedAt: userSession.updatedAt || Date.now(),
        userId: userSession.userId,
        values: { ...userSession.cloudSettings }
      };
    }

    return null;
  }

  /**
   * Fetches the authenticated user's settings profile from the backend in the background.
   * @param {object|null} userSession
   */
  async load(userSession = null) {
    if (!userSession || !userSession.userId) {
      return null;
    }

    const url = userSession.apiEndpoint || this.baseUrl;
    const headers = {
      Accept: 'application/json',
      ...(userSession.token ? { Authorization: `Bearer ${userSession.token}` } : {})
    };

    try {
      const data = await this._request({
        method: 'GET',
        url,
        headers,
        userSession
      });
      if (data && typeof data === 'object' && data.values) {
        this.lastSyncedAt = Date.now();
        return {
          version: data.version || 1,
          updatedAt: data.updatedAt || Date.now(),
          userId: data.userId || userSession.userId,
          values: { ...data.values }
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Pushes the user's updated settings envelope to the backend API (or queues it if offline).
   * @param {{ version: number, updatedAt: number, userId: string|null, values: Record<string, any> }} envelope
   * @param {object|null} userSession
   */
  async save(envelope, userSession = null) {
    if (!userSession || !userSession.userId) {
      return { synced: false, updatedAt: envelope.updatedAt };
    }

    const url = userSession.apiEndpoint || this.baseUrl;
    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(userSession.token ? { Authorization: `Bearer ${userSession.token}` } : {})
    };

    try {
      const res = await this._request({
        method: 'PUT',
        url,
        headers,
        body: envelope,
        userSession
      });
      if (res || typeof this.transport === 'function' || userSession.apiEndpoint) {
        this.lastSyncedAt = Date.now();
        return { synced: true, updatedAt: envelope.updatedAt };
      }
      this.pendingSyncQueue.push({ envelope, userSession, queuedAt: Date.now() });
      return { synced: false, updatedAt: envelope.updatedAt };
    } catch {
      this.pendingSyncQueue.push({ envelope, userSession, queuedAt: Date.now() });
      return { synced: false, updatedAt: envelope.updatedAt };
    }
  }

  /**
   * Flushes any offline queued settings updates once backend connectivity / login is established.
   * @param {object} userSession
   */
  async flushPendingQueue(userSession) {
    if (!userSession?.userId || this.pendingSyncQueue.length === 0) return 0;
    const items = [...this.pendingSyncQueue];
    this.pendingSyncQueue.length = 0;
    let flushed = 0;

    for (const item of items) {
      const res = await this.save(item.envelope, userSession);
      if (res.synced) flushed++;
    }
    return flushed;
  }
}
