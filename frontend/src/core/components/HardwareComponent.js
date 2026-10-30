import * as THREE from 'three';
import { i18n } from '../i18n/I18nService.js';
import { ElectricalPin } from '../electrical/ElectricalPin.js';
import { ConductiveDipole } from '../electrical/ConductiveDipole.js';

let nextInstanceNumber = 1;

/**
 * Universal pin alias table so scenarios, AI tools, and freeform wiring can refer
 * to component pins by either canonical or shorthand names.
 */
const DEFAULT_PIN_ALIASES = {
  p1: 'LEAD_A',
  p2: 'LEAD_B',
  lead1: 'LEAD_A',
  lead2: 'LEAD_B',
  anode: 'ANODE',
  cathode: 'CATHODE',
  '+': 'ANODE',
  '-': 'CATHODE',
  pos: 'POSITIVE',
  neg: 'NEGATIVE',
  t1: 'TERMINAL_A',
  t2: 'TERMINAL_B',
  pin_a: 'TERMINAL_A',
  pin_b: 'TERMINAL_B',
  pin_a1: 'TERMINAL_A',
  pin_b1: 'TERMINAL_B',
  sig: 'SIGNAL',
  vcc: 'VCC',
  gnd: 'GND',
  trig: 'TRIG',
  echo: 'ECHO',
  wiper: 'WIPER'
};

/**
 * Abstract Root Class for all 3D Electronic & Mechanical Hardware Components.
 *
 * Enforces:
 * 1. Unified lifecycle, 3D mesh construction, and GPU disposal
 * 2. Smart Translation Key (`i18nKey` / `hw.<typeId>`) resolution for multilingual UI & callouts
 * 3. Universal Electrical Pin (`ElectricalPin`), Internal Conductive Path (`ConductiveDipole`),
 *    and Zero-Ohm Bridge (`internalBridges`) inheritance for rule-free circuit flow solving
 * 4. Declarative custom electrical spec support for AI-designed components
 */
export class HardwareComponent {
  static typeId = 'abstract.hardware';
  static category = 'generic';
  static displayName = 'Abstract Hardware Component';

  /**
   * Deterministic translation key prefix for this component class (`hw.<typeId>`).
   * @returns {string}
   */
  static get i18nPrefix() {
    return `hw.${this.typeId}`;
  }

  /**
   * @param {object} options
   * @param {string} [options.id] Unique instance ID
   * @param {string} [options.i18nKey] Translation key prefix or token
   * @param {string} [options.name] Optional custom label or `@i18n:` token
   * @param {string} [options.description] Optional custom description or `@i18n:` token
   * @param {number[]} [options.position] Initial [x, y, z] position
   * @param {number[]} [options.calloutOffset] 2D callout pixel offset [ox, oy]
   * @param {number[]} [options.anchorOffset] 3D anchor offset [x, y, z] relative to component origin
   * @param {object} [options.initialState] Initial state values
   * @param {Record<string, string>} [options.pinBindings] Maps local pin -> connected endpoint (e.g. breadboard hole)
   * @param {Array<object>} [options.dipoles] Custom conductive dipoles (used by AI-created components)
   */
  constructor(options = {}) {
    if (new.target === HardwareComponent) {
      throw new Error('HardwareComponent is an abstract base class and cannot be instantiated directly.');
    }

    const ctor = this.constructor;
    this.typeId = ctor.typeId;
    this.category = ctor.category;
    const spreadStringId =
      !options.id && typeof options[0] === 'string'
        ? Object.keys(options)
            .filter((k) => /^\d+$/.test(k))
            .sort((a, b) => Number(a) - Number(b))
            .map((k) => options[k])
            .join('')
        : null;
    this.id =
      (typeof options === 'string' ? options : options.id) ||
      spreadStringId ||
      `${this.typeId}#${nextInstanceNumber++}`;
    this.i18nKey = options.i18nKey || ctor.i18nPrefix;

    this._explicitName = options.name && options.name !== ctor.displayName ? options.name : null;
    this._explicitDescription = options.description || null;

    this.calloutOffset = options.calloutOffset || [54, -40];
    this.anchorOffset = options.anchorOffset || [0, 14, 0];

    /** @type {Record<string, number[]>} Local pin offsets [x, y, z] */
    this.pins = {};

    /** @type {Map<string, ElectricalPin>} Electrical pin descriptors */
    this.electricalPins = new Map();

    /** @type {ConductiveDipole[]} Internal conductive paths between pins */
    this.internalDipoles = [];

    /** @type {Array<[string, string]>} Internal zero-ohm conductive bridges */
    this.internalBridges = [];

    /** @type {Record<string, string>} Maps local pin to another component/breadboard endpoint */
    this.pinBindings = { ...(options.pinBindings || {}) };

    /** @type {Record<string, any>} Default state snapshot for reset() */
    this.defaultState = {
      burnedOut: false,
      faultCode: null,
      ...this.getDefaultState(),
      ...(options.initialState || {})
    };

    /** @type {Record<string, any>} Live state */
    this.state = { ...this.defaultState };

    /** @type {THREE.Group} Root 3D Object3D container */
    this.group = new THREE.Group();
    this.group.name = this.id;

    /** @type {Record<string, THREE.Object3D | THREE.Material>} Sub-part references for animation */
    this.refs = {};

    /** @type {boolean} Dipole X-Ray inspection mode */
    this.xrayMode = false;

    /** @type {THREE.Group|null} 3D overlay group for internal ConductiveDipole vectors */
    this.xrayGroup = null;

    /** @type {boolean} Whether this component is a passive 3D environmental prop / obstacle (zero-pin stage target) */
    this.isEnvironmentProp = Boolean(
      options.isEnvironmentProp ?? ctor.isEnvironmentProp ?? (this.category === 'props')
    );

    /** @type {{ isObstacle: boolean, visualClass: string, boundingRadiusCm?: number, reflectivity?: number } | null} */
    this.obstacleProfile =
      options.obstacleProfile ||
      ctor.obstacleProfile ||
      (this.isEnvironmentProp
        ? {
            isObstacle: true,
            visualClass: String(options.visualClass || this.typeId || 'obstacle'),
            boundingRadiusCm: Number(options.boundingRadiusCm || 0),
            reflectivity: Number(options.reflectivity ?? 0.95)
          }
        : null);

    /** @type {Function|null} Optional ReactFlow-style custom node evaluator `({ pins, state, dt, stageEnv, report }) => ({ state, outputs })` */
    this._customEvaluator = typeof options.evaluate === 'function' ? options.evaluate : null;

    /** @type {Map<THREE.Material, { transparent: boolean, opacity: number }>} */
    this._originalMaterialState = new Map();

    // Let subclass construct its 3D procedural geometry & register refs/pins
    this.buildMesh(options);

    // Initialize inherited or custom AI electrical dipoles
    this.setupElectricalModel(options);
    if (Array.isArray(options.dipoles)) {
      for (const d of options.dipoles) {
        this.defineDipole(d);
      }
    }

    // Attach metadata for raycasting / inspection compatibility
    const self = this;
    this.group.userData.component = this;
    this.group.userData.part = {
      id: this.id,
      typeId: this.typeId,
      category: this.category,
      i18nKey: this.i18nKey,
      get name() {
        return self.name;
      },
      get desc() {
        return self.description;
      }
    };

    if (Array.isArray(options.position) && options.position.length === 3) {
      this.setPosition(...options.position);
    }
    if (Array.isArray(options.rotation) && options.rotation.length === 3) {
      this.setRotation(...options.rotation);
    } else if (typeof options.rotationY === 'number') {
      this.setRotationY(options.rotationY);
    }

    // Apply initial visual state
    this.onStateChange(this.state, this.defaultState);
  }

  /**
   * Dynamically resolves localized component name via `I18nService` (`hw.<typeId>.name` or `@i18n:` token).
   * @returns {string}
   */
  get name() {
    if (this._explicitName && typeof this._explicitName === 'string' && this._explicitName.startsWith('@i18n:')) {
      return i18n.resolveToken(this._explicitName);
    }
    if (i18n.hasKey(`${this.i18nKey}.name`)) {
      return i18n.t(`${this.i18nKey}.name`);
    }
    return i18n.resolveToken(this._explicitName || this.constructor.displayName);
  }

  set name(val) {
    this._explicitName = val;
  }

  /**
   * Dynamically resolves localized component description via `I18nService` (`hw.<typeId>.desc` or `@i18n:` token).
   * @returns {string}
   */
  get description() {
    if (
      this._explicitDescription &&
      typeof this._explicitDescription === 'string' &&
      this._explicitDescription.startsWith('@i18n:')
    ) {
      return i18n.resolveToken(this._explicitDescription);
    }
    if (i18n.hasKey(`${this.i18nKey}.desc`)) {
      return i18n.t(`${this.i18nKey}.desc`);
    }
    return i18n.resolveToken(this._explicitDescription || '');
  }

  set description(val) {
    this._explicitDescription = val;
  }

  /**
   * Subclasses override to provide default state properties.
   * @returns {Record<string, any>}
   */
  getDefaultState() {
    return { active: false };
  }

  /**
   * Subclasses override to configure their default electrical dipoles & pin specs after `buildMesh()`.
   * @param {object} _options
   */
  setupElectricalModel(_options = {}) {}

  /**
   * Subclasses MUST override this method to populate `this.group`, `this.refs`, and `this.pins`.
   * @param {object} _options
   */
  buildMesh(_options) {
    throw new Error(`${this.constructor.name} must implement buildMesh()`);
  }

  /**
   * Mutates component state and triggers visual/physical updates via `onStateChange`.
   * @param {Record<string, any>} patch
   */
  setState(patch) {
    if (!patch || typeof patch !== 'object') return this.state;
    const prevState = { ...this.state };
    this.state = { ...this.state, ...patch };
    this.onStateChange(this.state, prevState);
    return this.state;
  }

  /**
   * Hook invoked whenever `setState` or `reset` updates the component state.
   * @param {Record<string, any>} _newState
   * @param {Record<string, any>} _prevState
   */
  onStateChange(_newState, _prevState) {}

  /**
   * Frame update hook called by the stage render loop.
   * @param {number} _dt Delta time in seconds
   */
  update(_dt) {}

  /**
   * Alias for `update(dt)` used by robotics showcase controllers.
   * @param {number} dt
   */
  tick(dt = 0.016) {
    return this.update(dt);
  }

  /**
   * Alias for `setState(partialState)` used by robotics showcase controllers.
   * @param {Record<string, any>} partialState
   */
  updateState(partialState = {}) {
    return this.setState(partialState);
  }

  /**
   * Sets hover highlight state on the component.
   * @param {boolean} isHovered
   */
  setHovered(isHovered) {
    this._isHovered = Boolean(isHovered);
    return this;
  }

  /**
   * Resets component state back to its default initial state.
   */
  reset() {
    const prev = { ...this.state };
    this.state = { ...this.defaultState };
    this.onStateChange(this.state, prev);
  }

  /**
   * Sets 3D position of the component root group.
   */
  setPosition(x, y, z) {
    this.group.position.set(x, y, z);
    return this;
  }

  /**
   * Sets 3D Euler rotation (in radians) of the component root group.
   * @param {number} [rx=0]
   * @param {number} [ry=0]
   * @param {number} [rz=0]
   */
  setRotation(rx = 0, ry = 0, rz = 0) {
    this.group.rotation.set(rx, ry, rz);
    return this;
  }

  /**
   * Sets the yaw rotation around the vertical Y axis (in radians).
   * @param {number} ry
   */
  setRotationY(ry = 0) {
    this.group.rotation.y = ry;
    return this;
  }

  /**
   * Returns the unit 3D forward direction vector `[fx, fy, fz]` in world space
   * derived from `state.forwardVector` or the component's Y-axis Euler rotation `group.rotation.y` (`ry`).
   * At `ry = 0`, forward points along `[1, 0, 0]` (`+X`); at `ry = Math.PI / 2`, `[0, 0, 1]` (`+Z`);
   * at `ry = Math.PI`, `[-1, 0, 0]` (`-X`).
   * @returns {[number, number, number]}
   */
  getForwardVector() {
    if (Array.isArray(this.state?.forwardVector) && this.state.forwardVector.length === 3) {
      const [vx, vy, vz] = this.state.forwardVector.map((v) => Number(v) || 0);
      const mag = Math.hypot(vx, vy, vz) || 1;
      return [Number((vx / mag).toFixed(6)), Number((vy / mag).toFixed(6)), Number((vz / mag).toFixed(6))];
    }
    const ry = Number(this.group?.rotation?.y || 0);
    return [Number(Math.cos(ry).toFixed(6)), 0, Number(Math.sin(ry).toFixed(6))];
  }

  /**
   * Registers a named pin in local component coordinates and creates its `ElectricalPin` model.
   * @param {string} pinName
   * @param {number[]} localCoords [x, y, z]
   * @param {Partial<import('../electrical/ElectricalPin.js').ElectricalPin>} [electricalMeta]
   */
  definePin(pinName, localCoords, electricalMeta = {}) {
    const coordsArray = Array.isArray(localCoords)
      ? [...localCoords]
      : [Number(localCoords?.x) || 0, Number(localCoords?.y) || 0, Number(localCoords?.z) || 0];
    this.pins[pinName] = coordsArray;
    const elecPin = new ElectricalPin({
      componentId: this.id,
      pinName,
      localCoords: coordsArray,
      ...electricalMeta
    });
    this.electricalPins.set(pinName, elecPin);
    return elecPin;
  }

  /**
   * Registers an alias pin name that points to an existing physical pin's coordinates and ElectricalPin.
   * @param {string} aliasName
   * @param {string} targetPinName
   */
  definePinRole(aliasName, targetPinName) {
    if (this.pins[targetPinName]) {
      this.pins[aliasName] = [...this.pins[targetPinName]];
    }
    const targetElec = this.electricalPins.get(targetPinName);
    if (targetElec) {
      this.electricalPins.set(aliasName, targetElec);
    }
    return this;
  }

  definePinAlias(aliasName, targetPinName) {
    return this.definePinRole(aliasName, targetPinName);
  }

  /**
   * Resolves a shorthand or case-insensitive pin name (e.g. 'p1' -> 'LEAD_A', 'anode' -> 'ANODE')
   * into an existing physical pin key on this component.
   * @param {string} pinOrAlias
   * @returns {string}
   */
  resolvePinName(pinOrAlias) {
    if (!pinOrAlias) return '';
    if (this.electricalPins.has(pinOrAlias)) {
      return this.electricalPins.get(pinOrAlias).pinName;
    }
    if (this.pins[pinOrAlias]) return pinOrAlias;
    const upper = pinOrAlias.toUpperCase();
    if (this.electricalPins.has(upper)) {
      return this.electricalPins.get(upper).pinName;
    }
    if (this.pins[upper]) return upper;
    const mapped = DEFAULT_PIN_ALIASES[pinOrAlias.toLowerCase()];
    if (mapped && this.electricalPins.has(mapped)) {
      return this.electricalPins.get(mapped).pinName;
    }
    if (mapped && this.pins[mapped]) return mapped;
    return pinOrAlias;
  }

  /**
   * Defines an internal conductive path (`ConductiveDipole`) between two pins of this component.
   * @param {object} dipoleConfig
   */
  defineDipole(dipoleConfig) {
    const pinA = this.resolvePinName(dipoleConfig.pinA);
    const pinB = this.resolvePinName(dipoleConfig.pinB);
    const dipole = new ConductiveDipole({
      ...dipoleConfig,
      pinA,
      pinB
    });
    this.internalDipoles.push(dipole);
    return dipole;
  }

  /**
   * Defines an internal zero-resistance bridge between two pins (e.g. breadboard strip holes).
   * @param {string} pinA
   * @param {string} pinB
   */
  defineInternalBridge(pinA, pinB) {
    this.internalBridges.push([this.resolvePinName(pinA), this.resolvePinName(pinB)]);
    return this;
  }

  /**
   * Returns a single `ElectricalPin` descriptor by name (or alias), or null if not found.
   * @param {string} pinName
   * @returns {ElectricalPin|null}
   */
  getPin(pinName) {
    const resolved = this.resolvePinName(pinName);
    return this.electricalPins.get(resolved) || this.electricalPins.get(pinName) || null;
  }

  /**
   * Returns all `ElectricalPin` descriptors owned by this component.
   * @returns {ElectricalPin[]}
   */
  getElectricalPins() {
    return [...new Set(this.electricalPins.values())];
  }

  /**
   * Alias for `getElectricalPins()`.
   * @returns {ElectricalPin[]}
   */
  getAllPins() {
    return this.getElectricalPins();
  }

  /**
   * Returns all internal `ConductiveDipole` paths owned by this component.
   * @returns {ConductiveDipole[]}
   */
  getInternalDipoles() {
    return this.internalDipoles;
  }

  /**
   * Returns all internal zero-ohm pin bridges.
   * @returns {Array<[string, string]>}
   */
  getInternalBridges() {
    return this.internalBridges;
  }

  /**
   * Evaluates an electrical flow report from `CircuitFlowSolver` against this component's inherited physical limits
   * and executes the ReactFlow-style `evaluate({ pins, state, dt, stageEnv, report })` node contract.
   * @param {{ current: number, currentMa: number, voltage: number, closedLoop: boolean, reverseBiased: boolean, signals: any[], faults: any[], dt?: number }} report
   * @param {object|null} [stageEnv=null]
   * @returns {Array<object>} Any new component-level electrical faults (e.g. overcurrent burnout)
   */
  evaluateElectricalFlow(report, stageEnv = null) {
    const newFaults = [];

    for (const dipole of this.internalDipoles) {
      if (report.closedLoop && report.current > dipole.maxCurrent + 1e-4) {
        const fault = {
          code: 'elec.fault.overcurrent',
          severity: 'critical',
          componentId: this.id,
          params: {
            component: `@i18n:${this.i18nKey}.name`,
            currentMa: report.currentMa.toFixed(1),
            maxMa: (dipole.maxCurrent * 1000).toFixed(0)
          }
        };
        fault.message = i18n.resolveToken(fault);
        newFaults.push(fault);
        this.setState({ burnedOut: true, active: false, faultCode: fault.code });
      }
    }

    if (newFaults.length === 0 && report.faults.length === 0 && this.state.burnedOut) {
      this.setState({ burnedOut: false, faultCode: null });
    }

    this.onElectricalFlow(report);
    this.runNodeEvaluation({ report, stageEnv, dt: report?.dt ?? 0.016 });
    return newFaults;
  }

  /**
   * Builds a normalized ReactFlow-style `pins` map containing incoming and current pin states
   * (`voltage`, `high`, `pwmDuty`, `protocol`, `currentMa`, `connected`) for `evaluate()`.
   * @param {object} [report={}]
   * @param {object|null} [stageEnv=null]
   * @returns {Record<string, { name: string, voltage: number, high: boolean, pwmDuty: number, protocol: string, role: string, direction: string, currentMa: number, connected: boolean }>}
   */
  buildNodePinContext(report = {}, stageEnv = null) {
    const pinContext = {};
    const signals = Array.isArray(report?.signals) ? report.signals : [];

    const entries =
      this.electricalPins instanceof Map
        ? this.electricalPins.entries()
        : Object.entries(this.electricalPins || {});

    for (const [pinName, ePin] of entries) {
      if (pinContext[ePin.pinName] && pinName !== ePin.pinName) continue;
      const matchingSig = signals.find(
        (s) =>
          s.pin === pinName ||
          s.pinName === pinName ||
          s.componentPin === pinName ||
          this.resolvePinName(s.pin || s.pinName || s.componentPin) === ePin.pinName
      );
      const voltage =
        typeof matchingSig?.voltage === 'number'
          ? matchingSig.voltage
          : Number(ePin.sensedVoltage ?? ePin.voltage ?? ePin.drivenVoltage ?? 0);
      const pwmDuty =
        typeof matchingSig?.pwmDuty === 'number'
          ? matchingSig.pwmDuty
          : Number(ePin.pwmDuty ?? (voltage >= 2.0 ? 1.0 : 0.0));
      const high = voltage >= 2.0 || pwmDuty > 0.05;
      const logicLevel = high ? 1 : 0;
      const payload = matchingSig?.payload || ePin.signal || ePin.signalMeta || null;

      const descriptor = {
        name: ePin.pinName,
        voltage,
        high,
        logicLevel,
        pwmDuty,
        protocol: matchingSig?.protocol || ePin.protocol || 'GPIO',
        role: ePin.role,
        direction: ePin.direction,
        currentMa: Number(report?.currentMa || 0),
        payload,
        uartFrame: matchingSig?.uartFrame || payload?.uartFrame || payload?.text || null,
        connected: Boolean(matchingSig || report?.closedLoop || Math.abs(voltage) > 0.001),
        valueOf() {
          return this.voltage;
        },
        [Symbol.toPrimitive](hint) {
          return hint === 'string' ? String(this.voltage) : this.voltage;
        }
      };
      pinContext[ePin.pinName] = descriptor;
      if (pinName !== ePin.pinName) {
        pinContext[pinName] = descriptor;
      }
    }

    if (stageEnv) {
      Object.defineProperty(pinContext, '__stageEnv', {
        value: stageEnv,
        enumerable: false,
        configurable: true
      });
    }

    this.lastPinContext = pinContext;
    return pinContext;
  }

  /**
   * Executes the component's ReactFlow-style `evaluate({ pins, state, dt, stageEnv, report })` contract
   * and applies any returned `{ state, outputs, pins }` updates to visual state and output pins.
   * @param {{ report?: object, stageEnv?: object|null, dt?: number }} [params={}]
   */
  runNodeEvaluation({ report = {}, stageEnv = null, dt = 0.016 } = {}) {
    const pins = this.buildNodePinContext(report, stageEnv);
    const mutableState = { ...this.state };
    let evalResult = null;
    try {
      evalResult = this.evaluate({
        pins,
        state: mutableState,
        dt,
        stageEnv,
        report
      });
    } catch (err) {
      this.lastEvaluationError = err?.message || String(err);
      return { error: this.lastEvaluationError };
    }

    this.lastEvaluationError = null;
    this.lastEvaluationResult = evalResult || null;

    const mutatedPatch = {};
    for (const [k, v] of Object.entries(mutableState)) {
      if (this.state[k] !== v) {
        mutatedPatch[k] = v;
      }
    }
    if (Object.keys(mutatedPatch).length > 0) {
      this.setState(mutatedPatch);
    }

    if (!evalResult || typeof evalResult !== 'object') {
      return null;
    }

    if (evalResult.state && typeof evalResult.state === 'object') {
      this.setState(evalResult.state);
    }

    const directPinEntries = {};
    for (const [k, v] of Object.entries(evalResult)) {
      if (k === 'state' || k === 'outputs' || k === 'pins') continue;
      const resolvedKey = this.resolvePinName(k);
      const hasPin =
        this.electricalPins instanceof Map
          ? this.electricalPins.has(resolvedKey)
          : Boolean(this.electricalPins?.[resolvedKey]);
      if (hasPin) {
        directPinEntries[resolvedKey] = v;
      }
    }

    const outPinMap = {
      ...directPinEntries,
      ...(evalResult.pins && typeof evalResult.pins === 'object' ? evalResult.pins : {}),
      ...(evalResult.outputs && typeof evalResult.outputs === 'object' ? evalResult.outputs : {})
    };

    for (const [outPinName, outSignal] of Object.entries(outPinMap)) {
      const resolvedPin = this.resolvePinName(outPinName);
      const ePin =
        this.electricalPins instanceof Map
          ? this.electricalPins.get(resolvedPin)
          : this.electricalPins?.[resolvedPin];
      if (!ePin || outSignal == null) continue;

      if (typeof outSignal === 'number') {
        ePin.driveVoltage(outSignal, {
          protocol: ePin.protocol || 'GPIO',
          digital: outSignal >= 2.0 ? 1 : 0,
          logicLevel: outSignal >= 2.0 ? 1 : 0,
          pwmDuty: outSignal >= 2.0 ? 1.0 : 0.0
        });
      } else if (typeof outSignal === 'boolean') {
        const v = outSignal ? Number(ePin.nominalVoltage || 5.0) : 0.0;
        ePin.driveVoltage(v, {
          protocol: ePin.protocol || 'GPIO',
          digital: outSignal ? 1 : 0,
          logicLevel: outSignal ? 1 : 0,
          pwmDuty: outSignal ? 1.0 : 0.0
        });
      } else if (typeof outSignal === 'object') {
        let targetV = null;
        if (typeof outSignal.voltage === 'number') {
          targetV = outSignal.voltage;
        } else if (typeof outSignal.logicLevel === 'number') {
          targetV = outSignal.logicLevel >= 1 ? Number(ePin.nominalVoltage || 5.0) : 0.0;
        } else if (typeof outSignal.high === 'boolean') {
          targetV = outSignal.high ? Number(ePin.nominalVoltage || 5.0) : 0.0;
        }
        if (targetV !== null) {
          ePin.driveVoltage(targetV, {
            ...outSignal,
            protocol: outSignal.protocol || ePin.protocol || 'GPIO',
            digital: targetV >= 2.0 ? 1 : 0,
            logicLevel: targetV >= 2.0 ? 1 : 0,
            pwmDuty: typeof outSignal.pwmDuty === 'number' ? outSignal.pwmDuty : (targetV >= 2.0 ? 1.0 : 0.0)
          });
        } else {
          if (typeof outSignal.pwmDuty === 'number') {
            ePin.pwmDuty = outSignal.pwmDuty;
          }
          if (typeof outSignal.protocol === 'string') {
            ePin.protocol = outSignal.protocol;
          }
          ePin.signal = { ...outSignal };
          ePin.signalMeta = { ...outSignal };
        }
      }
    }

    return evalResult;
  }

  /**
   * First-class ReactFlow-style pure/reactive node evaluation contract.
   * Subclasses or dynamic custom components can implement `evaluate({ pins, state, dt, stageEnv, report })`
   * and return `{ state?: Partial<State>, outputs?: Record<string, number | boolean | { voltage?: number, high?: boolean, pwmDuty?: number, protocol?: string }> }`.
   * @param {{ pins: Record<string, any>, state: Record<string, any>, dt: number, stageEnv: object|null, report: object }} context
   * @returns {{ state?: Record<string, any>, outputs?: Record<string, any> } | null}
   */
  evaluate(context) {
    if (typeof this._customEvaluator === 'function') {
      return this._customEvaluator.call(this, context);
    }
    return null;
  }

  /**
   * Polymorphic hook invoked by `evaluateElectricalFlow` when circuit flow updates.
   * Subclasses override to translate current/voltage/signals into visual brightness, motion, or sound.
   * @param {object} _report
   */
  onElectricalFlow(_report) {}

  /**
   * Computes world-space [x, y, z] coordinates for a named pin on this component.
   * Accounts for both 3D translation (`group.position`) and Euler rotation (`group.rotation`).
   * @param {string} pinName
   * @returns {number[]}
   */
  getPinWorldPosition(pinName) {
    const resolved = this.resolvePinName(pinName);
    const local = this.pins[resolved] || this.pins[pinName] || [0, 5.5, 0];
    const rx = this.group.rotation.x || 0;
    const ry = this.group.rotation.y || 0;
    const rz = this.group.rotation.z || 0;

    if (rx === 0 && ry === 0 && rz === 0) {
      return [
        this.group.position.x + local[0],
        this.group.position.y + local[1],
        this.group.position.z + local[2]
      ];
    }

    const vec = new THREE.Vector3(local[0], local[1], local[2]).applyEuler(this.group.rotation);
    return [
      Number((this.group.position.x + vec.x).toFixed(4)),
      Number((this.group.position.y + vec.y).toFixed(4)),
      Number((this.group.position.z + vec.z).toFixed(4))
    ];
  }

  /**
   * Builds a standardized callout descriptor for `CalloutManager` with reactive translation resolution.
   */
  getCalloutDescriptor() {
    const self = this;
    return {
      id: this.id,
      i18nKey: this.i18nKey,
      get label() {
        return self.name;
      },
      get desc() {
        return self.description;
      },
      offset: this.calloutOffset,
      worldAnchor: () =>
        new THREE.Vector3(
          this.group.position.x + this.anchorOffset[0],
          this.group.position.y + this.anchorOffset[1],
          this.group.position.z + this.anchorOffset[2]
        )
    };
  }

  /**
   * Serializes this component's instance configuration for `ScenarioSerializer`.
   */
  toScenarioData() {
    const data = {
      id: this.id,
      typeId: this.typeId,
      i18nKey: this.i18nKey,
      position: [
        Number(this.group.position.x.toFixed(2)),
        Number(this.group.position.y.toFixed(2)),
        Number(this.group.position.z.toFixed(2))
      ],
      rotation: [
        Number(this.group.rotation.x.toFixed(4)),
        Number(this.group.rotation.y.toFixed(4)),
        Number(this.group.rotation.z.toFixed(4))
      ],
      calloutOffset: [...this.calloutOffset],
      anchorOffset: [...this.anchorOffset],
      pinBindings: { ...this.pinBindings },
      state: { ...this.state }
    };
    if (this.state?.color) data.color = this.state.color;
    if (this.state?.capColor) data.capColor = this.state.capColor;
    if (this.state?.resistanceOhms !== undefined) data.resistanceOhms = this.state.resistanceOhms;
    return data;
  }

  /**
   * Toggles 3D Dipole X-Ray Mode on this component.
   * When enabled, outer housing meshes become translucent (`opacity: 0.28`)
   * and internal `ConductiveDipole` / `internalBridges` paths are rendered in 3D space.
   * @param {boolean} enabled
   */
  setXRayMode(enabled) {
    const next = Boolean(enabled);
    this.xrayMode = next;

    this._ensureXRayGroup();

    this.group.traverse((obj) => {
      if (!obj.isMesh || !obj.material) return;
      if (this.xrayGroup && (obj === this.xrayGroup || obj.parent === this.xrayGroup)) return;

      const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const mat of materials) {
        if (!this._originalMaterialState.has(mat)) {
          this._originalMaterialState.set(mat, {
            transparent: Boolean(mat.transparent),
            opacity: typeof mat.opacity === 'number' ? mat.opacity : 1
          });
        }
        if (next) {
          const orig = this._originalMaterialState.get(mat);
          mat.transparent = true;
          mat.opacity = Math.min(orig.opacity, 0.28);
          mat.needsUpdate = true;
        } else {
          const orig = this._originalMaterialState.get(mat);
          if (orig) {
            mat.transparent = orig.transparent;
            mat.opacity = orig.opacity;
            mat.needsUpdate = true;
          }
        }
      }
    });

    if (this.xrayGroup) {
      this.xrayGroup.visible = next;
    }

    return this;
  }

  /**
   * Lazily constructs the 3D `xrayGroup` visualizing internal `ConductiveDipole` paths and bridges.
   */
  _ensureXRayGroup() {
    if (this.xrayGroup) return this.xrayGroup;

    const xrayGroup = new THREE.Group();
    xrayGroup.name = `${this.id}:xray`;
    xrayGroup.visible = false;

    const dipoleMat = new THREE.LineBasicMaterial({
      color: 0x10b981,
      linewidth: 2
    });
    const unidirectionalMat = new THREE.LineBasicMaterial({
      color: 0xf59e0b,
      linewidth: 2
    });
    const nodeGeo = new THREE.SphereGeometry(0.42, 8, 8);
    const nodeMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });

    for (const dipole of this.internalDipoles) {
      const a = this.pins[dipole.pinA] || [0, 2, 0];
      const b = this.pins[dipole.pinB] || [0, 4, 0];
      const mid = [(a[0] + b[0]) * 0.5, Math.max(a[1], b[1]) + 1.8, (a[2] + b[2]) * 0.5];

      const pts = [
        new THREE.Vector3(a[0], a[1], a[2]),
        new THREE.Vector3(mid[0], mid[1], mid[2]),
        new THREE.Vector3(b[0], b[1], b[2])
      ];
      const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
      const line = new THREE.Line(lineGeo, dipole.unidirectional ? unidirectionalMat : dipoleMat);
      line.userData.dipole = {
        pinA: dipole.pinA,
        pinB: dipole.pinB,
        resistance: dipole.resistance,
        forwardVoltage: dipole.forwardVoltage,
        unidirectional: dipole.unidirectional
      };
      xrayGroup.add(line);

      const nodeA = new THREE.Mesh(nodeGeo, nodeMat);
      nodeA.position.set(a[0], a[1], a[2]);
      const nodeB = new THREE.Mesh(nodeGeo, nodeMat);
      nodeB.position.set(b[0], b[1], b[2]);
      xrayGroup.add(nodeA, nodeB);
    }

    this.xrayGroup = xrayGroup;
    this.group.add(xrayGroup);
    return xrayGroup;
  }

  /**
   * Disposes GPU geometries and materials owned by this component.
   */
  dispose() {
    this.group.traverse((obj) => {
      if (obj.geometry) {
        obj.geometry.dispose();
        if (typeof window === 'undefined') {
          obj.geometry.attributes = {};
          obj.geometry.index = null;
        }
      }
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });
    if (typeof window === 'undefined') {
      this.group.clear();
    }
  }
}
