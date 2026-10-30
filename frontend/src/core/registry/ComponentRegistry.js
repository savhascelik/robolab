import { HardwareComponent } from '../components/HardwareComponent.js';
import { i18n } from '../i18n/I18nService.js';

/**
 * Central Hardware Component Registry & Multi-Index Store.
 *
 * Indexes component classes and live stage instances by:
 * 1. `typeId` (e.g., 'motor.dc', 'motor.servo', 'button.tactile', 'button.arcade')
 * 2. `category` (e.g., 'motors', 'buttons', 'leds', 'sensors', 'audio', 'boards', 'passives')
 * 3. `BaseClass` inheritance chain (`BaseMotor`, `BaseButton`, `BaseLightEmitter`, etc.)
 *
 * Supports bulk operations (`invokeOnCategory`, `invokeOnBaseClass`) so adding a feature
 * or state change across all motors, all buttons, or all LEDs happens from one central hub.
 */
export class ComponentRegistry {
  constructor() {
    /** @type {Map<string, typeof HardwareComponent>} */
    this.byTypeId = new Map();

    /** @type {Map<string, Set<typeof HardwareComponent>>} */
    this.byCategory = new Map();

    /** @type {Map<string, HardwareComponent>} */
    this.instancesById = new Map();

    /** @type {Map<string, Set<HardwareComponent>>} */
    this.instancesByCategory = new Map();
  }

  /**
   * Registers a HardwareComponent subclass in the central index.
   * @param {typeof HardwareComponent} ComponentClass
   */
  register(ComponentClass) {
    if (typeof ComponentClass !== 'function' || !(ComponentClass.prototype instanceof HardwareComponent)) {
      throw new TypeError(
        `ComponentRegistry.register requires a subclass of HardwareComponent (got ${ComponentClass?.name || ComponentClass})`
      );
    }

    const { typeId, category } = ComponentClass;
    if (!typeId || typeof typeId !== 'string' || typeId.startsWith('abstract.')) {
      throw new Error(`Invalid or abstract typeId "${typeId}" on ${ComponentClass.name}`);
    }
    if (!category || typeof category !== 'string') {
      throw new Error(`Missing category on ${ComponentClass.name}`);
    }
    if (this.byTypeId.has(typeId)) {
      throw new Error(`Duplicate hardware component typeId "${typeId}" in ComponentRegistry`);
    }

    this.byTypeId.set(typeId, ComponentClass);

    if (!this.byCategory.has(category)) {
      this.byCategory.set(category, new Set());
    }
    this.byCategory.get(category).add(ComponentClass);

    return this;
  }

  /**
   * Registers a HardwareComponent subclass or replaces an existing registration with the same `typeId`
   * (used by `DynamicComponentBuilder` & Custom Component Studio for live editing).
   * @param {typeof HardwareComponent} ComponentClass
   */
  registerOrReplace(ComponentClass) {
    if (typeof ComponentClass !== 'function' || !(ComponentClass.prototype instanceof HardwareComponent)) {
      throw new TypeError(
        `ComponentRegistry.registerOrReplace requires a subclass of HardwareComponent (got ${ComponentClass?.name || ComponentClass})`
      );
    }
    const { typeId } = ComponentClass;
    if (this.byTypeId.has(typeId)) {
      const existing = this.byTypeId.get(typeId);
      if (existing && this.byCategory.has(existing.category)) {
        this.byCategory.get(existing.category).delete(existing);
      }
      this.byTypeId.delete(typeId);
    }
    return this.register(ComponentClass);
  }

  /**
   * Unregisters a component class by `typeId` from the catalog.
   * @param {string} typeId
   */
  unregisterType(typeId) {
    const existing = this.byTypeId.get(typeId);
    if (!existing) return false;
    if (this.byCategory.has(existing.category)) {
      this.byCategory.get(existing.category).delete(existing);
    }
    this.byTypeId.delete(typeId);
    return true;
  }

  /**
   * Resolves a `typeId` or common shorthand/backend alias (e.g. 'arduino_uno' -> 'board.arduino_uno',
   * 'led' -> 'led.single', 'resistor' -> 'passive.resistor') if registered.
   * @param {string} typeId
   * @returns {string}
   */
  resolveTypeId(typeId) {
    if (!typeId || typeof typeId !== 'string') return '';
    if (this.byTypeId.has(typeId)) return typeId;

    const clean = typeId.trim().toLowerCase();
    if (this.byTypeId.has(clean)) return clean;

    const ALIAS_MAP = {
      arduino_uno: 'board.arduino_uno',
      'board.arduino': 'board.arduino_uno',
      esp32: 'board.esp32_devkit',
      esp32_devkit: 'board.esp32_devkit',
      esp32_devkit_v1: 'board.esp32_devkit',
      'board.esp32_devkit_v1': 'board.esp32_devkit',
      jetson_nano: 'board.jetson_nano',
      nvidia_jetson_nano: 'board.jetson_nano',
      'board.nvidia_jetson_nano': 'board.jetson_nano',
      breadboard: 'board.breadboard',
      led: 'led.single',
      'leds.led': 'led.single',
      led_red: 'led.single',
      led_green: 'led.single',
      led_blue: 'led.single',
      led_yellow: 'led.single',
      resistor: 'passive.resistor',
      'passives.resistor': 'passive.resistor',
      wire: 'passive.wire',
      jumper_wire: 'passive.wire',
      button: 'button.tactile',
      tactile_button: 'button.tactile',
      push_button: 'button.tactile',
      arcade_button: 'button.arcade',
      potentiometer: 'sensor.potentiometer',
      pot: 'sensor.potentiometer',
      ultrasonic: 'sensor.ultrasonic',
      hc_sr04: 'sensor.ultrasonic',
      hcsr04: 'sensor.ultrasonic',
      oled: 'display.ssd1306_oled',
      ssd1306: 'display.ssd1306_oled',
      ssd1306_oled: 'display.ssd1306_oled',
      servo: 'motor.servo',
      servo_motor: 'motor.servo',
      sg90: 'motor.servo',
      dc_motor: 'motor.dc',
      motor: 'motor.dc',
      buzzer: 'audio.piezo',
      piezo: 'audio.piezo',
      piezo_buzzer: 'audio.piezo',
      l298n: 'driver.l298n_dual',
      ina219: 'power.ina219_buck_bay'
    };

    const mapped = ALIAS_MAP[clean];
    if (mapped && this.byTypeId.has(mapped)) {
      return mapped;
    }

    for (const key of this.byTypeId.keys()) {
      if (key.toLowerCase() === clean || key.toLowerCase().endsWith(`.${clean}`)) {
        return key;
      }
    }

    return typeId;
  }

  /**
   * Checks if a `typeId` is registered.
   * @param {string} typeId
   */
  has(typeId) {
    return this.byTypeId.has(this.resolveTypeId(typeId));
  }

  /**
   * Retrieves the registered class for a `typeId`.
   * @param {string} typeId
   * @returns {typeof HardwareComponent}
   */
  getClass(typeId) {
    const resolved = this.resolveTypeId(typeId);
    const cls = this.byTypeId.get(resolved);
    if (!cls) {
      throw new Error(`Unknown hardware component typeId "${typeId}" in ComponentRegistry`);
    }
    return cls;
  }

  /**
   * Returns all registered component classes in a given category (e.g. 'motors', 'buttons').
   * @param {string} category
   * @returns {Array<typeof HardwareComponent>}
   */
  getClassesByCategory(category) {
    const set = this.byCategory.get(category);
    return set ? [...set] : [];
  }

  /**
   * Returns all registered component classes that inherit from `BaseClass` (e.g. `BaseButton`, `BaseMotor`).
   * @param {Function} BaseClass
   * @returns {Array<typeof HardwareComponent>}
   */
  getClassesByBaseClass(BaseClass) {
    const result = [];
    for (const cls of this.byTypeId.values()) {
      if (cls === BaseClass || cls.prototype instanceof BaseClass) {
        result.push(cls);
      }
    }
    return result;
  }

  /**
   * Returns all registered category names.
   * @returns {string[]}
   */
  listCategories() {
    return [...this.byCategory.keys()];
  }

  /**
   * Alias for `listCategories()` used by catalog UI controllers.
   * @returns {string[]}
   */
  getCategories() {
    return this.listCategories();
  }

  /**
   * Instantiates a component by `typeId` and indexes the active instance.
   * Supports both `create(typeId, { id, ... })` and `create(typeId, 'idString', { ... })`.
   * @param {string} typeId
   * @param {object|string} [options]
   * @param {object} [extraOptions]
   * @returns {HardwareComponent}
   */
  create(typeId, options = {}, extraOptions = {}) {
    const ComponentClass = this.getClass(typeId);
    const normalizedOptions =
      typeof options === 'string'
        ? { id: options, ...(extraOptions || {}) }
        : options || {};
    const instance = new ComponentClass(normalizedOptions);

    this.instancesById.set(instance.id, instance);
    if (!this.instancesByCategory.has(instance.category)) {
      this.instancesByCategory.set(instance.category, new Set());
    }
    this.instancesByCategory.get(instance.category).add(instance);

    return instance;
  }

  /**
   * Retrieves an active component instance by its unique ID.
   * @param {string} id
   */
  getInstance(id) {
    return this.instancesById.get(id) || null;
  }

  /**
   * Returns all active component instances in a category (e.g. 'motors', 'buttons', 'leds').
   * @param {string} category
   * @returns {HardwareComponent[]}
   */
  getInstancesByCategory(category) {
    const set = this.instancesByCategory.get(category);
    return set ? [...set] : [];
  }

  /**
   * Returns all active component instances of a specific `typeId` (e.g. 'leds.led', 'board.esp32_devkit').
   * @param {string} typeId
   * @returns {HardwareComponent[]}
   */
  getInstancesByTypeId(typeId) {
    const matches = [];
    for (const instance of this.instancesById.values()) {
      if (instance.typeId === typeId) {
        matches.push(instance);
      }
    }
    return matches;
  }

  /**
   * Returns all active component instances that inherit from `BaseClass` (e.g. `BaseMotor`, `BaseButton`).
   * @param {Function} BaseClass
   * @returns {HardwareComponent[]}
   */
  getInstancesByBaseClass(BaseClass) {
    const matches = [];
    for (const instance of this.instancesById.values()) {
      if (instance instanceof BaseClass) {
        matches.push(instance);
      }
    }
    return matches;
  }

  /**
   * Bulk operation: invokes `callback(instance)` on every active component in `category`.
   * Example: `registry.invokeOnCategory('motors', m => m.emergencyStop())`
   * @param {string} category
   * @param {(instance: HardwareComponent) => any} callback
   * @returns {Array<any>} Results returned by each invocation
   */
  invokeOnCategory(category, callback) {
    const instances = this.getInstancesByCategory(category);
    return instances.map((inst) => callback(inst));
  }

  /**
   * Bulk operation: invokes `callback(instance)` on every active component inheriting from `BaseClass`.
   * Example: `registry.invokeOnBaseClass(BaseButton, btn => btn.release())`
   * @param {Function} BaseClass
   * @param {(instance: HardwareComponent) => any} callback
   * @returns {Array<any>}
   */
  invokeOnBaseClass(BaseClass, callback) {
    const instances = this.getInstancesByBaseClass(BaseClass);
    return instances.map((inst) => callback(inst));
  }

  /**
   * Removes and optionally disposes a single active instance.
   * @param {string} id
   * @param {boolean} [disposeGpu=true]
   */
  removeInstance(id, disposeGpu = true) {
    const inst = this.instancesById.get(id);
    if (!inst) return false;
    this.instancesById.delete(id);
    this.instancesByCategory.get(inst.category)?.delete(inst);
    if (disposeGpu) inst.dispose();
    return true;
  }

  /**
   * Clears and disposes all active instances (or all EXCEPT persistent ones like the main board).
   * @param {Set<string>} [keepIds]
   */
  clearInstances(keepIds = new Set()) {
    const keepSet = keepIds instanceof Set ? keepIds : new Set();
    for (const [id, inst] of [...this.instancesById.entries()]) {
      if (keepSet.has(id)) continue;
      this.removeInstance(id, true);
    }
  }

  /**
   * Builds a catalog summary of all registered hardware types for UI inspection drawers.
   * Dynamically resolves localized displayName and summary via `I18nService`.
   */
  getCatalog() {
    const items = [];
    for (const cls of this.byTypeId.values()) {
      const resolvedName = i18n.resolveHardwareText(cls.typeId, 'name', cls.displayName);
      const isCustom = Boolean(cls.customSpec);
      const isEnvironmentProp = Boolean(
        cls.customSpec?.isEnvironmentProp || cls.category === 'props' || cls.typeId?.startsWith('prop.')
      );
      items.push({
        typeId: cls.typeId,
        i18nKey: cls.i18nPrefix,
        category: cls.category,
        name: resolvedName,
        displayName: resolvedName,
        summary: i18n.resolveHardwareText(cls.typeId, 'summary', cls.summary || cls.displayName),
        description: i18n.resolveHardwareText(cls.typeId, 'desc', cls.summary || cls.displayName),
        defaultLessonId: cls.defaultLessonId || 'board',
        instanceCount: this.getInstancesByTypeId(cls.typeId).length,
        isCustom,
        isEnvironmentProp,
        customSpec: cls.customSpec || null
      });
    }
    return items;
  }

  /**
   * Searches and filters the central hardware catalog by free-text query and category.
   * @param {object} [filters]
   * @param {string} [filters.query] Search query (matches name, summary, description, typeId, category)
   * @param {string} [filters.category] Category filter ('all' or specific category key)
   * @param {boolean} [filters.includeWire=false] Whether to include 'passive.wire'
   */
  searchCatalog(filtersOrQuery = {}, categoryArg = 'all', includeWireArg = false) {
    let query = '';
    let category = 'all';
    let includeWire = false;

    if (typeof filtersOrQuery === 'string') {
      query = filtersOrQuery;
      category = categoryArg || 'all';
      includeWire = Boolean(includeWireArg);
    } else if (filtersOrQuery && typeof filtersOrQuery === 'object') {
      query = filtersOrQuery.query || '';
      category = filtersOrQuery.category || 'all';
      includeWire = Boolean(filtersOrQuery.includeWire);
    }

    const normalizedQuery = String(query || '').trim().toLowerCase();
    const normalizedCategory = String(category || 'all').trim().toLowerCase();

    return this.getCatalog().filter((item) => {
      if (!includeWire && item.typeId === 'passive.wire') return false;
      if (normalizedCategory && normalizedCategory !== 'all') {
        if (normalizedCategory === 'custom') {
          if (!item.isCustom && !item.typeId.startsWith('custom.') && item.category.toLowerCase() !== 'custom') {
            return false;
          }
        } else if (normalizedCategory === 'props') {
          if (!item.isEnvironmentProp && item.category.toLowerCase() !== 'props' && !item.typeId.startsWith('prop.')) {
            return false;
          }
        } else if (item.category.toLowerCase() !== normalizedCategory) {
          return false;
        }
      }
      if (!normalizedQuery) return true;

      const haystack = [
        item.displayName,
        item.summary,
        item.description,
        item.typeId,
        item.category
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }

  /**
   * Returns catalog items grouped by category after applying optional search/category filters.
   * @param {object} [filters]
   * @returns {Array<{ category: string, items: Array<object> }>}
   */
  getCatalogGroupedByCategory(filters = {}) {
    const matches = this.searchCatalog(filters);
    const grouped = new Map();
    for (const item of matches) {
      if (!grouped.has(item.category)) {
        grouped.set(item.category, []);
      }
      grouped.get(item.category).push(item);
    }
    return [...grouped.entries()].map(([category, items]) => ({ category, items }));
  }
}

export const hardwareRegistry = new ComponentRegistry();
