import { i18n } from '../i18n/I18nService.js';
import { BaseHostBoard } from '../components/base/BaseHostBoard.js';
import { DynamicComponentBuilder } from '../components/DynamicComponentBuilder.js';

/**
 * Default semantic connection blueprints for the 9 guided curriculum lessons
 * so that opening any guided lesson in Freeform Sandbox mode yields a complete,
 * live-solvable closed-loop circuit graph.
 */
const LESSON_SEMANTIC_CONNECTIONS = {
  board: [],
  blink: [
    { id: 'w1', from: 'host.PIN13', to: 'blink.resistor.LEAD_A', color: '#e04b3a' },
    { id: 'w2', from: 'blink.resistor.LEAD_B', to: 'blink.led.ANODE', color: '#f59e0b' },
    { id: 'w3', from: 'blink.led.CATHODE', to: 'host.GND', color: '#232836' }
  ],
  button: [
    { id: 'w1', from: 'host.PIN2', to: 'button.button.TERMINAL_A', color: '#3b82f6' },
    { id: 'w2', from: 'button.button.TERMINAL_B', to: 'host.GND', color: '#232836' },
    { id: 'w3', from: 'host.PIN13', to: 'button.led.ANODE', color: '#e04b3a' },
    { id: 'w4', from: 'button.led.CATHODE', to: 'host.GND', color: '#232836' }
  ],
  pot: [
    { id: 'w1', from: 'host.5V', to: 'pot.pot.VCC', color: '#e04b3a' },
    { id: 'w2', from: 'pot.pot.WIPER', to: 'host.A0', color: '#f59e0b' },
    { id: 'w3', from: 'pot.pot.GND', to: 'host.GND', color: '#232836' }
  ],
  rgb: [
    { id: 'w1', from: 'host.PIN9', to: 'rgb.ledR.ANODE', color: '#e04b3a' },
    { id: 'w2', from: 'rgb.ledR.CATHODE', to: 'host.GND', color: '#232836' },
    { id: 'w3', from: 'host.PIN10', to: 'rgb.ledG.ANODE', color: '#22c55e' },
    { id: 'w4', from: 'rgb.ledG.CATHODE', to: 'host.GND', color: '#232836' },
    { id: 'w5', from: 'host.PIN11', to: 'rgb.ledB.ANODE', color: '#3b82f6' },
    { id: 'w6', from: 'rgb.ledB.CATHODE', to: 'host.GND', color: '#232836' }
  ],
  ultrasonic: [
    { id: 'w1', from: 'host.5V', to: 'ultrasonic.sensor.VCC', color: '#e04b3a' },
    { id: 'w2', from: 'host.PIN9', to: 'ultrasonic.sensor.TRIG', color: '#f59e0b' },
    { id: 'w3', from: 'host.PIN10', to: 'ultrasonic.sensor.ECHO', color: '#3b82f6' },
    { id: 'w4', from: 'ultrasonic.sensor.GND', to: 'host.GND', color: '#232836' }
  ],
  buzzer: [
    { id: 'w1', from: 'host.PIN8', to: 'buzzer.buzzer.POSITIVE', color: '#a855f7' },
    { id: 'w2', from: 'buzzer.buzzer.NEGATIVE', to: 'host.GND', color: '#232836' }
  ],
  motor: [
    { id: 'w1', from: 'host.PIN9', to: 'motor.servo.SIGNAL', color: '#f59e0b' },
    { id: 'w2', from: 'host.5V', to: 'motor.servo.VCC', color: '#e04b3a' },
    { id: 'w3', from: 'motor.servo.GND', to: 'host.GND', color: '#232836' },
    { id: 'w4', from: 'host.PIN5', to: 'motor.motor.VCC', color: '#38bdf8' },
    { id: 'w5', from: 'motor.motor.GND', to: 'host.GND', color: '#232836' }
  ],
  esp32: [
    { id: 'w1', from: 'host.GPIO2', to: 'esp32.resistor.LEAD_A', color: '#38bdf8' },
    { id: 'w2', from: 'esp32.resistor.LEAD_B', to: 'esp32.led.ANODE', color: '#f59e0b' },
    { id: 'w3', from: 'esp32.led.CATHODE', to: 'host.GND', color: '#232836' }
  ]
};

/**
 * Bidirectional Scenario & Freeform Circuit Serializer (`CircuitScenarioSchema v2`).
 *
 * Bridges Guided Curriculum Lessons and the Freeform Multi-Board Sandbox:
 * - Converts any `BaseLesson` into an editable `CircuitScenarioSchema v2` JSON.
 * - Serializes any Freeform Sandbox circuit (multiple boards, components, jumper connections) into JSON.
 * - Deserializes and validates JSON scenarios back into live 3D `HardwareComponent` instances and wires.
 */
export class ScenarioSerializer {
  static SCHEMA_VERSION = '2.0';

  /**
   * Validates a `CircuitScenarioSchema v2` object.
   * @param {object} data
   * @returns {{ valid: boolean, errors: string[] }}
   */
  static validate(data) {
    const errors = [];
    if (!data || typeof data !== 'object') {
      return { valid: false, errors: ['Scenario payload must be a JSON object'] };
    }
    if (data.version !== ScenarioSerializer.SCHEMA_VERSION) {
      errors.push(`Unsupported scenario schema version "${data.version}" (expected "2.0")`);
    }
    if (!Array.isArray(data.boards)) {
      errors.push('Scenario "boards" must be an array');
    }
    if (!Array.isArray(data.components)) {
      errors.push('Scenario "components" must be an array');
    }
    if (!Array.isArray(data.connections)) {
      errors.push('Scenario "connections" must be an array');
    } else {
      for (const conn of data.connections) {
        if (!conn || typeof conn.from !== 'string' || typeof conn.to !== 'string') {
          errors.push('Every connection must specify string "from" and "to" endpoints (<componentId>.<pinName>)');
        }
      }
    }
    return { valid: errors.length === 0, errors };
  }

  /**
   * Splits an endpoint string (`<componentId>.<pinName>`) even when `<componentId>` contains dots
   * (e.g. `blink.resistor.LEAD_A` -> `['blink.resistor', 'LEAD_A']`).
   * @param {string} endpointStr
   * @returns {[string, string]}
   */
  static splitEndpoint(endpointStr) {
    if (!endpointStr || typeof endpointStr !== 'string') return ['', ''];
    const colonIdx = endpointStr.lastIndexOf(':');
    const dotIdx = endpointStr.lastIndexOf('.');
    const idx = colonIdx !== -1 ? colonIdx : dotIdx;
    if (idx === -1) return [endpointStr, ''];
    return [endpointStr.slice(0, idx), endpointStr.slice(idx + 1)];
  }

  /**
   * Computes a smooth 4-point 3D jumper wire arch between two world-space pin coordinates.
   * @param {number[]} startPt [x, y, z]
   * @param {number[]} endPt [x, y, z]
   * @returns {number[][]}
   */
  static computeWireWaypoints(startPt, endPt) {
    const [x1, y1, z1] = startPt;
    const [x2, y2, z2] = endPt;
    const dx = x2 - x1;
    const dz = z2 - z1;
    const dist = Math.hypot(dx, dz);
    const archHeight = Math.max(y1, y2) + Math.min(22, Math.max(8, dist * 0.26));

    const p1 = [Number(x1.toFixed(2)), Number(y1.toFixed(2)), Number(z1.toFixed(2))];
    const p2 = [
      Number((x1 + dx * 0.3).toFixed(2)),
      Number(archHeight.toFixed(2)),
      Number((z1 + dz * 0.3).toFixed(2))
    ];
    const p3 = [
      Number((x1 + dx * 0.7).toFixed(2)),
      Number(archHeight.toFixed(2)),
      Number((z1 + dz * 0.7).toFixed(2))
    ];
    const p4 = [Number(x2.toFixed(2)), Number(y2.toFixed(2)), Number(z2.toFixed(2))];
    return [p1, p2, p3, p4];
  }

  /**
   * Converts a `BaseLesson` curriculum instance into a `CircuitScenarioSchema v2` document
   * so any guided lesson can be opened, modified, and rewired inside Freeform Sandbox mode.
   * @param {import('../lessons/BaseLesson.js').BaseLesson} lesson
   */
  static lessonToScenario(lesson) {
    const layout = lesson.circuitLayout || { mode: 'board-only' };
    const hostTypeId = layout.hostBoardTypeId || 'board.arduino_uno';
    const hostId = `host.${lesson.id}`;
    const boardPos = layout.mode === 'board-only' ? [0, 0, 0] : layout.boardPosition || [-34, 0, 0];

    const boards = [
      {
        id: hostId,
        typeId: hostTypeId,
        i18nKey: `hw.${hostTypeId}`,
        position: [...boardPos],
        firmware: [...(lesson.code || [])]
      }
    ];

    const components = [];
    if (layout.mode !== 'board-only' && layout.includeBreadboard !== false) {
      components.push({
        id: `${lesson.id}.breadboard`,
        typeId: 'board.breadboard',
        i18nKey: 'hw.board.breadboard',
        position: [...(layout.breadboardPosition || [38, 0, 4])]
      });
    }

    for (const item of layout.components || []) {
      components.push({
        id: `${lesson.id}.${item.key}`,
        key: item.key,
        typeId: item.typeId,
        i18nKey: `hw.${item.typeId}`,
        name: item.name,
        color: item.color,
        capColor: item.capColor,
        position: [...(item.position || [24, 5.2, 0])],
        calloutOffset: item.calloutOffset ? [...item.calloutOffset] : undefined,
        anchorOffset: item.anchorOffset ? [...item.anchorOffset] : undefined
      });
    }

    const templateConns = LESSON_SEMANTIC_CONNECTIONS[lesson.id] || [];
    const connections = templateConns.map((c, idx) => ({
      id: c.id || `${lesson.id}.conn.${idx + 1}`,
      from: c.from.startsWith('host.') ? `${hostId}.${c.from.slice(5)}` : c.from,
      to: c.to.startsWith('host.') ? `${hostId}.${c.to.slice(5)}` : c.to,
      color: c.color || '#e04b3a'
    }));

    return {
      version: ScenarioSerializer.SCHEMA_VERSION,
      id: `scenario.${lesson.id}`,
      sourceLessonId: lesson.id,
      mode: 'freeform',
      meta: {
        title: lesson.title,
        summary: lesson.summary,
        titleRaw: lesson._title,
        summaryRaw: lesson._summary
      },
      boards,
      components,
      connections
    };
  }

  /**
   * Serializes live 3D stage instances (`boards`, `components`, `connections`) into a
   * portable `CircuitScenarioSchema v2` JSON object.
   * @param {object} stageState
   * @param {import('../components/HardwareComponent.js').HardwareComponent[]} [stageState.boards]
   * @param {import('../components/HardwareComponent.js').HardwareComponent[]} [stageState.components]
   * @param {Array<{ id?: string, from: string, to: string, color?: string }>} [stageState.connections]
   * @param {object} [stageState.meta]
   * @param {string} [stageState.id]
   */
  static serializeStage({
    boards = [],
    components = [],
    connections = [],
    customComponents = [],
    code = null,
    meta = {},
    id
  } = {}) {
    const serializedBoards = [];
    const serializedComponents = [];
    const customSpecsByTypeId = new Map();

    for (const spec of customComponents || []) {
      if (spec && spec.typeId) {
        customSpecsByTypeId.set(spec.typeId, spec);
      }
    }

    for (const b of boards) {
      if (!b) continue;
      const data = typeof b.toScenarioData === 'function' ? b.toScenarioData() : {
        id: b.id,
        typeId: b.typeId,
        i18nKey: b.i18nKey || `hw.${b.typeId}`,
        position: [b.group.position.x, b.group.position.y, b.group.position.z]
      };
      serializedBoards.push({
        ...data,
        firmware: b.firmware || []
      });
    }

    for (const c of components) {
      if (!c || c.typeId === 'passive.wire') continue;
      if (c instanceof BaseHostBoard) {
        if (!serializedBoards.some((sb) => sb.id === c.id)) {
          serializedBoards.push(c.toScenarioData());
        }
        continue;
      }
      const data = typeof c.toScenarioData === 'function' ? c.toScenarioData() : {
        id: c.id,
        typeId: c.typeId,
        i18nKey: c.i18nKey || `hw.${c.typeId}`,
        position: [c.group.position.x, c.group.position.y, c.group.position.z]
      };
      const customSpec =
        data.customSpec ||
        c.constructor?.customSpec ||
        DynamicComponentBuilder.getSpec(c.typeId);
      if (customSpec && customSpec.typeId) {
        customSpecsByTypeId.set(customSpec.typeId, customSpec);
      }
      serializedComponents.push(data);
    }

    const serializedConnections = connections.map((conn, index) => ({
      id: conn.id || `conn_${index + 1}`,
      from: conn.from,
      to: conn.to,
      color: conn.color || '#38bdf8'
    }));

    return {
      version: ScenarioSerializer.SCHEMA_VERSION,
      id: id || `scenario.custom.${Date.now()}`,
      mode: 'freeform',
      meta: {
        title: meta.title || i18n.t('sandbox.customScenarioTitle', {}, 'Custom Freeform Circuit'),
        summary: meta.summary || '',
        createdAt: meta.createdAt || new Date().toISOString(),
        ...meta
      },
      code: typeof code === 'string' ? code : undefined,
      customComponents: [...customSpecsByTypeId.values()],
      boards: serializedBoards,
      components: serializedComponents,
      connections: serializedConnections
    };
  }

  /**
   * Deserializes a `CircuitScenarioSchema v2` object into live hardware instances via `ComponentRegistry`.
   * Supports multi-board configurations (e.g. Arduino Uno + ESP32 simultaneously on stage).
   * @param {object} scenarioData
   * @param {object} options
   * @param {import('../registry/ComponentRegistry.js').ComponentRegistry} options.registry
   * @param {import('three').Group} [options.stageGroup]
   * @param {import('../components/base/BaseHostBoard.js').BaseHostBoard} [options.reusePrimaryBoard]
   */
  static deserializeToStage(scenarioData, { registry, stageGroup = null, reusePrimaryBoard = null } = {}) {
    const validation = ScenarioSerializer.validate(scenarioData);
    if (!validation.valid) {
      throw new Error(`Invalid Scenario JSON: ${validation.errors.join('; ')}`);
    }

    const boards = [];
    const components = [];
    const wires = [];
    /** @type {Map<string, import('../components/HardwareComponent.js').HardwareComponent>} */
    const byId = new Map();

    // 0. Register any custom/datasheet components embedded in the scenario
    if (Array.isArray(scenarioData.customComponents)) {
      for (const customSpec of scenarioData.customComponents) {
        if (customSpec && typeof customSpec === 'object') {
          DynamicComponentBuilder.registerFromSpec(customSpec, registry);
        }
      }
    }
    for (const cSpec of scenarioData.components || []) {
      if (cSpec?.customSpec && typeof cSpec.customSpec === 'object' && !registry.has(cSpec.typeId)) {
        DynamicComponentBuilder.registerFromSpec(cSpec.customSpec, registry);
      }
    }

    // 1. Instantiate or reuse Host Boards (supports 1..N boards simultaneously!)
    for (let i = 0; i < scenarioData.boards.length; i++) {
      const bSpec = scenarioData.boards[i];
      const rawBoardTypeId = bSpec.typeId || bSpec.type;
      if (!rawBoardTypeId) continue;
      const boardTypeId = registry?.resolveTypeId?.(rawBoardTypeId) || rawBoardTypeId;
      let boardInst = null;

      if (i === 0 && reusePrimaryBoard && reusePrimaryBoard.typeId === boardTypeId) {
        boardInst = reusePrimaryBoard;
        if (Array.isArray(bSpec.position)) {
          boardInst.setPosition(...bSpec.position);
        }
        if (Array.isArray(bSpec.rotation)) {
          boardInst.setRotation(...bSpec.rotation);
        }
      } else {
        boardInst = registry.create(boardTypeId, {
          id: bSpec.id,
          i18nKey: bSpec.i18nKey,
          position: bSpec.position || [i * 75 - 34, 0, 0],
          rotation: bSpec.rotation,
          initialState: bSpec.state
        });
        if (stageGroup) {
          stageGroup.add(boardInst.group);
        }
      }

      boardInst.firmware = bSpec.firmware || [];
      boards.push(boardInst);
      byId.set(boardInst.id, boardInst);
      if (i === 0 && !byId.has('host')) {
        byId.set('host', boardInst);
      }
      // Also allow lookup by bSpec.id if primary board was reused with a different internal id
      if (bSpec.id && bSpec.id !== boardInst.id) {
        byId.set(bSpec.id, boardInst);
      }
    }

    // 2. Instantiate peripheral & prototyping components
    for (const cSpec of scenarioData.components) {
      const compTypeId = cSpec.typeId || cSpec.type;
      if (!compTypeId) continue;
      const compInst = registry.create(compTypeId, {
        id: cSpec.id,
        i18nKey: cSpec.i18nKey,
        name: cSpec.name,
        color: cSpec.color || cSpec.state?.color,
        capColor: cSpec.capColor || cSpec.state?.capColor,
        position: cSpec.position || [24, 5.2, 0],
        rotation: cSpec.rotation,
        calloutOffset: cSpec.calloutOffset,
        anchorOffset: cSpec.anchorOffset,
        pinBindings: cSpec.pinBindings,
        initialState: cSpec.state,
        resistanceOhms: cSpec.resistanceOhms ?? cSpec.state?.resistanceOhms ?? cSpec.state?.ohms,
        ohms: cSpec.ohms ?? cSpec.state?.ohms ?? cSpec.state?.resistanceOhms
      });
      if (stageGroup) {
        stageGroup.add(compInst.group);
      }
      components.push(compInst);
      byId.set(compInst.id, compInst);
    }

    // 3. Instantiate 3D JumperWireComponents for each semantic connection
    const normalizedConnections = [];
    for (let i = 0; i < scenarioData.connections.length; i++) {
      const conn = scenarioData.connections[i];
      const [fromCompId, fromPinRaw] = ScenarioSerializer.splitEndpoint(conn.from);
      const [toCompId, toPinRaw] = ScenarioSerializer.splitEndpoint(conn.to);
      const fromComp = byId.get(fromCompId);
      const toComp = byId.get(toCompId);

      if (!fromComp || !toComp) continue;

      const resolvedFromPin = fromComp.resolvePinName(fromPinRaw);
      const resolvedToPin = toComp.resolvePinName(toPinRaw);
      const startPt = fromComp.getPinWorldPosition(resolvedFromPin);
      const endPt = toComp.getPinWorldPosition(resolvedToPin);
      const points = conn.waypoints || ScenarioSerializer.computeWireWaypoints(startPt, endPt);

      const canonicalFrom = `${fromComp.id}.${resolvedFromPin}`;
      const canonicalTo = `${toComp.id}.${resolvedToPin}`;
      const wireId = conn.id || `wire_${i + 1}`;

      const wireComp = registry.create('passive.wire', {
        id: wireId,
        from: canonicalFrom,
        to: canonicalTo,
        color: conn.color || '#38bdf8',
        points
      });
      if (stageGroup) {
        stageGroup.add(wireComp.group);
      }
      wires.push(wireComp);
      normalizedConnections.push({
        id: wireId,
        from: canonicalFrom,
        to: canonicalTo,
        color: conn.color || '#38bdf8'
      });
    }

    return {
      boards,
      components,
      wires,
      connections: normalizedConnections,
      allHardware: [...boards, ...components]
    };
  }

  static deserializeStage(scenarioData, registryOrOptions = {}) {
    const opts =
      registryOrOptions && typeof registryOrOptions.create === 'function'
        ? { registry: registryOrOptions }
        : registryOrOptions;
    return ScenarioSerializer.deserializeToStage(scenarioData, opts);
  }
}
