import { eventBus } from '../events/EventBus.js';
import { enLocale } from './locales/en.js';
import { trLocale } from './locales/tr.js';
import { hardwareCatalogI18n } from './catalogs/hardwareCatalogI18n.js';
import { electricalCatalogI18n } from './catalogs/electricalCatalogI18n.js';

/**
 * Deeply merges `source` into `target` without mutating nested references unexpectedly.
 */
function deepMerge(target, source) {
  const out = { ...(target || {}) };
  if (!source || typeof source !== 'object') return out;
  for (const [k, v] of Object.entries(source)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      out[k] = deepMerge(out[k], v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

/**
 * Central Internationalization (i18n) Service & Smart Translation Key (`@i18n:`) Resolver.
 *
 * Supports:
 * 1. Dot-path dictionary lookups (`t('ui.nav.home')`) with `{variable}` interpolation
 * 2. Smart token protocol (`@i18n:hw.led.single.name`) and recursive parameter translation
 * 3. Automatic hardware component namespace resolution (`resolveHardwareText('led.single', 'name')`)
 * 4. Dynamic namespace registration (`registerNamespace`) for scalable components, AI parts & scenarios
 * 5. Inline `{ tr, en }` object resolution (`pick()`) and reactive `EventBus` notifications
 */
export class I18nService {
  constructor(defaultLocale = 'en') {
    this.dictionaries = {
      tr: deepMerge(deepMerge(trLocale, hardwareCatalogI18n.tr), electricalCatalogI18n.tr),
      en: deepMerge(deepMerge(enLocale, hardwareCatalogI18n.en), electricalCatalogI18n.en)
    };
    this.currentLocale = this.dictionaries[defaultLocale] ? defaultLocale : 'en';
  }

  /**
   * Registers or merges a full locale dictionary dynamically.
   * @param {string} localeCode
   * @param {object} dictionary
   */
  registerLocale(localeCode, dictionary) {
    this.dictionaries[localeCode] = deepMerge(this.dictionaries[localeCode] || {}, dictionary);
    return this;
  }

  /**
   * Registers a scoped translation namespace (e.g. 'hw.sensor.dht22' or 'scenarios.custom_1')
   * across multiple locales (`{ tr: {...}, en: {...} }`) without bloating core locale files.
   * @param {string} namespacePath Dot-separated path (e.g. 'hw.sensor.dht22')
   * @param {Record<string, object>} localeBundles Map of localeCode -> localized fields
   */
  registerNamespace(namespacePath, localeBundles = {}) {
    if (!namespacePath || typeof namespacePath !== 'string') return this;
    const parts = namespacePath.split('.').filter(Boolean);

    for (const [localeCode, bundle] of Object.entries(localeBundles)) {
      let nested = bundle;
      for (let i = parts.length - 1; i >= 0; i--) {
        nested = { [parts[i]]: nested };
      }
      this.registerLocale(localeCode, nested);
    }
    return this;
  }

  /**
   * Returns current active locale code ('tr' | 'en').
   * @returns {string}
   */
  getLocale() {
    return this.currentLocale;
  }

  /**
   * Returns all available locale codes.
   * @returns {string[]}
   */
  getAvailableLocales() {
    return Object.keys(this.dictionaries);
  }

  /**
   * Switches active locale and notifies all subscribers via EventBus.
   * @param {string} localeCode
   */
  setLocale(localeCode) {
    if (!this.dictionaries[localeCode]) {
      throw new Error(`Unsupported locale "${localeCode}". Available: ${this.getAvailableLocales().join(', ')}`);
    }
    if (this.currentLocale === localeCode) return this.currentLocale;
    this.currentLocale = localeCode;
    if (typeof document !== 'undefined' && document.documentElement) {
      document.documentElement.lang = localeCode;
    }
    eventBus.emit('i18n:changed', { locale: localeCode });
    return this.currentLocale;
  }

  /**
   * Toggles between 'tr' and 'en'.
   */
  toggleLocale() {
    const next = this.currentLocale === 'tr' ? 'en' : 'tr';
    return this.setLocale(next);
  }

  /**
   * Subscribes to language changes.
   * @param {(payload: { locale: string }) => void} handler
   */
  onChange(handler) {
    return eventBus.on('i18n:changed', handler);
  }

  /**
   * Checks if a dot-separated key exists in the active or fallback ('en') dictionary.
   * @param {string} keyPath
   * @returns {boolean}
   */
  hasKey(keyPath) {
    if (!keyPath || typeof keyPath !== 'string') return false;
    const cleanKey = keyPath.startsWith('@i18n:') ? keyPath.slice(6) : keyPath;
    return (
      this._resolvePath(this.dictionaries[this.currentLocale], cleanKey) !== undefined ||
      this._resolvePath(this.dictionaries.en, cleanKey) !== undefined
    );
  }

  /**
   * Resolves a dot-separated key from the active dictionary (falling back to 'en' then key).
   * Supports `{param}` template replacements and recursive `@i18n:` parameter values.
   * @param {string} keyPath
   * @param {Record<string, any>} [params]
   * @returns {string}
   */
  t(keyPath, params = {}) {
    if (!keyPath) return '';
    const cleanKey = typeof keyPath === 'string' && keyPath.startsWith('@i18n:') ? keyPath.slice(6) : keyPath;
    const raw =
      this._resolvePath(this.dictionaries[this.currentLocale], cleanKey) ??
      this._resolvePath(this.dictionaries.en, cleanKey) ??
      cleanKey;

    if (typeof raw !== 'string') return String(raw);

    const resolvedParams = {};
    for (const [k, v] of Object.entries(params || {})) {
      if (typeof v === 'string' && v.startsWith('@i18n:')) {
        resolvedParams[k] = this.t(v.slice(6));
      } else if (v && typeof v === 'object' && ('tr' in v || 'en' in v)) {
        resolvedParams[k] = this.pick(v);
      } else {
        resolvedParams[k] = v;
      }
    }

    return raw.replace(/\{(\w+)\}/g, (_, token) =>
      resolvedParams[token] !== undefined ? String(resolvedParams[token]) : `{${token}}`
    );
  }

  /**
   * Smart token resolver:
   * - If string starts with `@i18n:`, resolves from dictionary with `params`
   * - If object has `{ i18nKey / code / key, params }`, resolves structured translation descriptor
   * - If object has `{ tr, en }`, picks active locale
   * - Otherwise returns value as-is (with optional `{param}` interpolation if string)
   * @param {any} valueOrToken
   * @param {Record<string, any>} [params]
   * @returns {any}
   */
  resolveToken(valueOrToken, params = {}) {
    if (valueOrToken === null || valueOrToken === undefined) return '';
    if (typeof valueOrToken === 'string') {
      if (valueOrToken.startsWith('@i18n:')) {
        return this.t(valueOrToken.slice(6), params);
      }
      if (this.hasKey(valueOrToken) && valueOrToken.includes('.')) {
        return this.t(valueOrToken, params);
      }
      return valueOrToken;
    }
    if (typeof valueOrToken === 'object' && !Array.isArray(valueOrToken)) {
      if ('tr' in valueOrToken || 'en' in valueOrToken) {
        return this.pick(valueOrToken);
      }
      const descriptorKey = valueOrToken.i18nKey || valueOrToken.code || valueOrToken.key;
      if (descriptorKey) {
        return this.t(descriptorKey, { ...(valueOrToken.params || {}), ...params });
      }
    }
    return valueOrToken;
  }

  /**
   * Resolves a localized field ('name' | 'summary' | 'desc') for any hardware component `typeId`
   * using the `hw.<typeId>.<field>` convention.
   * @param {string} typeId e.g. 'led.single' or 'board.esp32_devkit'
   * @param {'name'|'summary'|'desc'} field
   * @param {string} [fallback]
   * @returns {string}
   */
  resolveHardwareText(typeId, field = 'name', fallback = '') {
    if (!typeId) return fallback;
    const keyPath = `hw.${typeId}.${field}`;
    if (this.hasKey(keyPath)) {
      return this.t(keyPath);
    }
    return this.resolveToken(fallback);
  }

  /**
   * Picks the localized value from a `{ tr, en }` object or resolves `@i18n:` token if string.
   * @template T
   * @param {T | { tr?: T, en?: T }} valueOrMap
   * @returns {T}
   */
  pick(valueOrMap) {
    if (typeof valueOrMap === 'string' && valueOrMap.startsWith('@i18n:')) {
      return /** @type {any} */ (this.t(valueOrMap.slice(6)));
    }
    if (
      valueOrMap &&
      typeof valueOrMap === 'object' &&
      !Array.isArray(valueOrMap) &&
      ('tr' in valueOrMap || 'en' in valueOrMap)
    ) {
      return valueOrMap[this.currentLocale] ?? valueOrMap.en ?? valueOrMap.tr;
    }
    return valueOrMap;
  }

  _resolvePath(obj, path) {
    if (!obj || typeof path !== 'string') return undefined;
    return path.split('.').reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : undefined), obj);
  }
}

export const i18n = new I18nService('en');
