import { hardwareRegistry } from '../registry/ComponentRegistry.js';

/**
 * Flownie Hardware Capability Index (`capabilityIndex.js`).
 *
 * Adapted directly from `C:\laragon\www\flownie\flownie-frontend\src\services\gemini\capabilityIndex.js`
 * for the 3D Hardware & Robotics Workbench.
 *
 * Instead of dumping 20+ full component pinout schemas and 12 SDK function definitions into every LLM turn,
 * this module provides progressive tool & component discovery:
 * 1. `searchCapabilities({ query, category, maxResults })` — BM25/keyword relevance ranking across all 3D components & SDK functions.
 * 2. `getComponentSchema({ typeId })` — Exact electrical pinout (`name`, `role`, `direction`, `protocol`, `voltage`) and default state.
 * 3. `getFunctionSchema({ functionName })` — Exact `CircuitSDK` method signature and code example.
 * 4. `searchCanvasComponents({ query }, stageContext)` — Searches live 3D stage instances.
 * 5. `describeCanvasComponent({ componentId }, stageContext)` — Inspects a specific 3D component on stage + its connected wires.
 */

export const CIRCUIT_SDK_FUNCTION_SCHEMAS = Object.freeze({
  setBoard: {
    functionName: 'setBoard',
    category: 'board',
    summary: 'Sets or switches the primary 3D host microcontroller/SBC board on the stage.',
    parameters: {
      typeId: "string ('board.arduino_uno' | 'board.esp32_devkit' | 'board.jetson_nano')"
    },
    returns: '{ id: string, typeId: string, pins: string[] }',
    example: `const host = await sdk.setBoard('board.arduino_uno');`
  },
  clearAddedComponents: {
    functionName: 'clearAddedComponents',
    category: 'stage',
    summary: 'Removes non-host peripheral components and wires so a clean circuit can be built.',
    parameters: {},
    returns: '{ clearedCount: number }',
    example: `await sdk.clearAddedComponents();`
  },
  addComponent: {
    functionName: 'addComponent',
    category: 'component',
    summary: 'Spawns a 3D hardware component onto the workbench at a given [x, y, z] coordinate.',
    parameters: {
      typeId: "string (e.g. 'led.single', 'passive.resistor', 'sensor.ultrasonic', 'actuator.servo', 'driver.l298n')",
      options: '{ id?: string, position?: [number, number, number], rotation?: number, ohms?: number, color?: string }'
    },
    returns: '{ id: string, typeId: string, name: string, pins: string[], position: [number, number, number] }',
    example: `const led = await sdk.addComponent('led.single', { id: 'led_red', position: [14, 5.2, 4] });`
  },
  removeComponent: {
    functionName: 'removeComponent',
    category: 'component',
    summary: 'Removes a component and any attached wires from the 3D stage by component ID.',
    parameters: {
      componentId: 'string'
    },
    returns: '{ removed: boolean, componentId: string }',
    example: `await sdk.removeComponent('led_red');`
  },
  connectWire: {
    functionName: 'connectWire',
    category: 'wiring',
    summary: 'Creates a 3D jumper wire between two component pins and validates electrical compatibility.',
    parameters: {
      fromComponentId: "string (or 'host' for the main microcontroller board)",
      fromPin: "string (e.g. 'PIN9', 'PIN13', '5V', 'GND', 'GPIO2', 'LEAD_A', 'ANODE')",
      toComponentId: 'string',
      toPin: "string (e.g. 'VCC', 'GND', 'TRIG', 'ECHO', 'SIGNAL', 'LEAD_A', 'LEAD_B', 'ANODE', 'CATHODE')",
      options: '{ color?: string }'
    },
    returns: '{ connected: boolean, wireId: string, from: string, to: string }',
    example: `await sdk.connectWire('host', 'PIN9', 'res_1', 'LEAD_A', { color: '#ef4444' });`
  },
  smartConnect: {
    functionName: 'smartConnect',
    category: 'wiring',
    summary: 'Automatically wires power (VCC/GND) and signal pins between a peripheral component and the host board.',
    parameters: {
      componentId: 'string',
      preferredSignalPin: 'string (optional host GPIO/PWM pin)'
    },
    returns: '{ connectedCount: number, wires: Array<{ from: string, to: string }> }',
    example: `await sdk.smartConnect('servo_1', 'PIN9');`
  },
  setCode: {
    functionName: 'setCode',
    category: 'firmware',
    summary: 'Writes Arduino C++ / ESP32 / Jetson embedded firmware code into the studio code editor.',
    parameters: {
      code: 'string (complete C++ firmware with setup() and loop(); use template literal backticks `...` for multi-line code)'
    },
    returns: '{ updated: boolean, lineCount: number }',
    example: 'await circuit.setCode(`void setup() {\n  pinMode(9, OUTPUT);\n}\nvoid loop() {\n  digitalWrite(9, HIGH);\n}`);'
  },
  startSimulation: {
    functionName: 'startSimulation',
    category: 'simulation',
    summary: 'Starts the real-time closed-loop electrical & firmware simulation on the 3D stage.',
    parameters: {},
    returns: '{ running: boolean, closedLoopCount: number, faultCount: number }',
    example: `await sdk.startSimulation();`
  },
  inspectElectricalState: {
    functionName: 'inspectElectricalState',
    category: 'diagnostics',
    summary: 'Runs the Kirchhoff/Ohm solver and returns closed loops, total current (mA), and any electrical faults.',
    parameters: {},
    returns: '{ closedLoopCount: number, totalCurrentMa: number, faults: Array<object> }',
    example: `const state = await sdk.inspectElectricalState();`
  },
  registerCustomComponent: {
    functionName: 'registerCustomComponent',
    category: 'component',
    summary:
      'Registers a custom 3D hardware node or 0-Pin stage obstacle into the catalog using DynamicComponentBuilder v2 (parts[], attach, materialPreset, partRole, pins/pinGenerator, evaluateScript).',
    parameters: {
      spec: '{ typeId: string, name: string, category?: string, isEnvironmentProp?: boolean, parts: Array<object>, pins?: Array<object>, pinGenerator?: object, evaluateScript?: string }'
    },
    returns: '{ typeId: string, name: string, category: string, pins: string[], isEnvironmentProp: boolean }',
    example: `const reg = await sdk.registerCustomComponent({ typeId: 'custom.logic_gate', name: 'Logic Gate', parts: [{ id: 'base', primitive: 'rounded_box', size: [12, 1.6, 10], materialPreset: 'fr4_pcb' }], pins: [{ name: 'IN', direction: 'input', edge: 'left' }, { name: 'OUT', direction: 'output', edge: 'right' }] });`
  }
});

/**
 * Builds the unified capability index from `hardwareRegistry` + `CIRCUIT_SDK_FUNCTION_SCHEMAS`.
 * Instantiates a temporary detached component (`new CompClass`) to read `getAllPins()` without polluting `registry.instancesById`.
 */
export function buildHardwareCapabilityIndex(registry = hardwareRegistry) {
  const catalog = registry.getCatalog ? registry.getCatalog() : [];
  const components = catalog.map((item) => {
    let pins = [];
    let isEnvironmentProp = false;
    let obstacleProfile = null;
    try {
      const CompClass =
        registry.byTypeId?.get(item.typeId) ||
        registry.definitions?.get(item.typeId)?.ComponentClass ||
        (typeof registry.has === 'function' && registry.has(item.typeId)
          ? registry.getClass(item.typeId)
          : null);
      if (CompClass) {
        isEnvironmentProp = Boolean(CompClass.isEnvironmentProp || item.category === 'props');
        obstacleProfile = CompClass.obstacleProfile || null;
        const tempInstance = new CompClass({
          id: `__schema_probe_${item.typeId}__`
        });
        isEnvironmentProp = Boolean(tempInstance.isEnvironmentProp || isEnvironmentProp);
        obstacleProfile = tempInstance.obstacleProfile || obstacleProfile;
        const rawPins =
          typeof tempInstance.getAllPins === 'function'
            ? tempInstance.getAllPins()
            : tempInstance.electricalPins instanceof Map
            ? [...tempInstance.electricalPins.values()]
            : [];
        pins = rawPins.map((p) => ({
          name: p.name,
          direction: p.direction || 'IO',
          role: p.role || 'GPIO',
          protocol: p.protocol || 'DC',
          voltage: p.voltage ?? 5
        }));
        tempInstance.dispose?.();
      }
    } catch {
      pins = [];
    }

    return {
      kind: 'component',
      typeId: item.typeId,
      name: item.name,
      category: item.category,
      summary: item.summary || item.description || `${item.name} 3D hardware component`,
      isCustom: Boolean(item.isCustom || String(item.typeId || '').startsWith('custom.')),
      isEnvironmentProp,
      obstacleProfile,
      customSpec: item.customSpec || null,
      pins
    };
  });

  const functions = Object.values(CIRCUIT_SDK_FUNCTION_SCHEMAS).map((fn) => ({
    kind: 'sdk_function',
    functionName: fn.functionName,
    category: fn.category,
    summary: fn.summary,
    parameters: fn.parameters,
    returns: fn.returns,
    example: fn.example
  }));

  return { components, functions };
}

/**
 * Searches hardware components and `CircuitSDK` functions by keyword query and optional category.
 */
export function searchCapabilities(arg1 = {}, arg2 = hardwareRegistry) {
  let query = '';
  let category = 'all';
  let maxResults = 8;
  let registry = hardwareRegistry;

  if (typeof arg1 === 'string') {
    query = arg1;
    if (arg2 && typeof arg2 === 'object' && !arg2.definitionsById) {
      category = arg2.category || 'all';
      maxResults = Number(arg2.limit || arg2.maxResults || 8);
      registry = arg2.registry || hardwareRegistry;
    } else if (arg2) {
      registry = arg2;
    }
  } else if (arg1 && typeof arg1 === 'object') {
    query = arg1.query || '';
    category = arg1.category || 'all';
    maxResults = Number(arg1.limit || arg1.maxResults || 8);
    registry = arg1.registry || arg2 || hardwareRegistry;
  }

  const normalizeFold = (s = '') =>
    String(s || '')
      .toLocaleLowerCase('tr-TR')
      .replace(/\u0307/g, '')
      .replace(/ı/g, 'i')
      .replace(/ş/g, 's')
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c');

  const index = buildHardwareCapabilityIndex(registry);
  const terms = String(query || '')
    .toLowerCase()
    .replace(/\u0307/g, '')
    .split(/\s+/)
    .filter(Boolean);
  const foldedTerms = terms.map((t) => normalizeFold(t));
  const catFilter = String(category || 'all').toLowerCase();

  const scoreItem = (text, itemCategory) => {
    if (catFilter !== 'all' && catFilter !== '' && itemCategory.toLowerCase() !== catFilter) {
      return -1;
    }
    if (terms.length === 0) return 1;
    const hay = text.toLowerCase().replace(/\u0307/g, '');
    const foldedHay = normalizeFold(text);
    let score = 0;
    for (let i = 0; i < terms.length; i += 1) {
      if (hay.includes(terms[i]) || foldedHay.includes(foldedTerms[i])) score += 3;
    }
    return score;
  };

  const matchedComponents = index.components
    .map((comp) => {
      const pinNames = comp.pins.map((p) => p.name).join(' ');
      const score = scoreItem(
        `${comp.typeId} ${comp.name} ${comp.category} ${comp.summary} ${pinNames}`,
        comp.category
      );
      return { ...comp, _score: score };
    })
    .filter((c) => c._score > 0)
    .sort((a, b) => b._score - a._score)
    .slice(0, maxResults)
    .map(({ _score, ...rest }) => ({
      typeId: rest.typeId,
      name: rest.name,
      category: rest.category,
      summary: rest.summary,
      isCustom: Boolean(rest.isCustom),
      isEnvironmentProp: Boolean(rest.isEnvironmentProp),
      pinNames: rest.pins.map((p) => p.name)
    }));

  const matchedFunctions = index.functions
    .map((fn) => {
      const score = scoreItem(
        `${fn.functionName} ${fn.category} ${fn.summary}`,
        fn.category
      );
      return { ...fn, _score: score };
    })
    .filter((f) => f._score > 0 || terms.length > 0)
    .sort((a, b) => b._score - a._score)
    .slice(0, maxResults)
    .map(({ _score, ...rest }) => ({
      functionName: rest.functionName,
      category: rest.category,
      summary: rest.summary
    }));

  return {
    query,
    category: catFilter,
    components: matchedComponents,
    sdkFunctions: matchedFunctions,
    sdkMethods: matchedFunctions
  };
}

/**
 * Returns the full electrical pinout and usage guide for a specific 3D component `typeId`.
 */
export function getComponentSchema(arg = {}, registry = hardwareRegistry) {
  const rawId =
    typeof arg === 'string'
      ? arg
      : arg?.typeId || arg?.componentId || '';
  const cleanId = String(rawId || '').trim();
  const index = buildHardwareCapabilityIndex(registry);
  const found = index.components.find(
    (c) =>
      c.typeId === cleanId ||
      c.typeId.endsWith(`.${cleanId}`) ||
      ((cleanId === 'motor.servo' || cleanId === 'actuator.servo_sg90') && c.typeId === 'actuator.servo') ||
      ((cleanId === 'actuator.servo' || cleanId === 'actuator.servo_sg90') && c.typeId === 'motor.servo') ||
      (cleanId === 'display.oled_ssd1306' && c.typeId === 'display.ssd1306_oled')
  );

  if (!found) {
    return {
      found: false,
      error: `Component typeId '${cleanId}' not found. Call searchCapabilities first.`
    };
  }

  const pinNames = found.pins.map((p) => p.name);
  return {
    found: true,
    typeId: found.typeId,
    name: found.name,
    category: found.category,
    summary: found.summary,
    isCustom: Boolean(found.isCustom),
    isEnvironmentProp: Boolean(found.isEnvironmentProp),
    obstacleProfile: found.obstacleProfile || null,
    customSpec: found.customSpec || null,
    pins: found.pins,
    pinNames,
    component: {
      ...found,
      pinNames
    },
    codeModeExample: `const comp = await sdk.addComponent('${found.typeId}', { position: [14, 0, 18] });`
  };
}

/**
 * Returns the full parameter & return schema for a `CircuitSDK` function.
 */
export function getFunctionSchema(arg = {}) {
  const raw =
    typeof arg === 'string'
      ? arg
      : arg?.functionName || arg?.name || '';
  const clean = String(raw || '')
    .trim()
    .replace(/^(sdk|circuit)\./i, '');
  const aliasMap = {
    connectPins: 'connectWire',
    writeArduinoCode: 'setCode',
    compileAndRunSimulation: 'startSimulation'
  };
  const fn =
    CIRCUIT_SDK_FUNCTION_SCHEMAS[clean] ||
    CIRCUIT_SDK_FUNCTION_SCHEMAS[aliasMap[clean]];
  if (!fn) {
    return {
      found: false,
      error: `SDK function '${clean}' not found. Available: ${Object.keys(CIRCUIT_SDK_FUNCTION_SCHEMAS).join(', ')}`
    };
  }
  return {
    found: true,
    ...fn,
    requestedName: clean
  };
}

/**
 * Searches components currently spawned on the 3D stage.
 */
export function searchCanvasComponents({ query = '' } = {}, executorOrStage = null) {
  const terms = String(query || '')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  const items = [];
  const hostBoard =
    executorOrStage?.getHostBoard?.() || executorOrStage?.hostBoard || null;
  if (hostBoard) {
    const pins = typeof hostBoard.getAllPins === 'function' ? hostBoard.getAllPins() : [];
    items.push({
      id: hostBoard.id,
      role: 'host_board',
      typeId: hostBoard.typeId,
      name: hostBoard.name || hostBoard.typeId,
      position: hostBoard.group?.position
        ? [hostBoard.group.position.x, hostBoard.group.position.y, hostBoard.group.position.z]
        : [0, 0, 0],
      pins: pins.map((p) => p.name)
    });
  }

  const comps =
    executorOrStage?.getStageComponents?.() ||
    executorOrStage?.getIndependentComponents?.() ||
    [];
  for (const comp of comps) {
    const pins = typeof comp.getAllPins === 'function' ? comp.getAllPins() : [];
    items.push({
      id: comp.id,
      role: 'peripheral',
      typeId: comp.typeId,
      name: comp.name || comp.typeId,
      position: comp.group?.position
        ? [comp.group.position.x, comp.group.position.y, comp.group.position.z]
        : [0, 0, 0],
      pins: pins.map((p) => p.name)
    });
  }

  if (terms.length === 0) {
    return { count: items.length, components: items };
  }

  const filtered = items.filter((item) => {
    const hay = `${item.id} ${item.typeId} ${item.name} ${item.pins.join(' ')}`.toLowerCase();
    return terms.some((t) => hay.includes(t));
  });

  return { count: filtered.length, components: filtered };
}

/**
 * Inspects a single component on the 3D stage, including its pin connections.
 */
export function describeCanvasComponent({ componentId = '' } = {}, executorOrStage = null) {
  const cleanId = String(componentId || '').trim();
  const hostBoard =
    executorOrStage?.getHostBoard?.() || executorOrStage?.hostBoard || null;
  const comps =
    executorOrStage?.getStageComponents?.() ||
    executorOrStage?.getIndependentComponents?.() ||
    [];
  const all = [...(hostBoard ? [hostBoard] : []), ...comps];

  const target =
    cleanId === 'host'
      ? hostBoard
      : all.find((c) => c.id === cleanId || c.typeId === cleanId);

  if (!target) {
    return {
      found: false,
      error: `Component '${cleanId}' is not on the 3D stage.`
    };
  }

  const connections =
    executorOrStage?.getConnections?.() ||
    executorOrStage?.wireTool?.getConnections?.() ||
    [];
  const attachedWires = connections.filter((w) => {
    const fromStr = String(w.from || '');
    const toStr = String(w.to || '');
    return fromStr.startsWith(`${target.id}.`) || toStr.startsWith(`${target.id}.`);
  });

  const pins = typeof target.getAllPins === 'function' ? target.getAllPins() : [];

  return {
    found: true,
    id: target.id,
    typeId: target.typeId,
    name: target.name || target.typeId,
    pins: pins.map((p) => ({
      name: p.name,
      direction: p.direction,
      role: p.role
    })),
    attachedWires
  };
}

/**
 * Inspects full 3D circuit state (components, wires, unconnected VCC/GND power pins, and Kirchhoff flow).
 */
export function inspectCircuitState(executorOrStage = null) {
  const canvas = searchCanvasComponents({ query: '' }, executorOrStage);
  const connections =
    executorOrStage?.getConnections?.() ||
    executorOrStage?.wireTool?.getConnections?.() ||
    [];
  const connectedEndpoints = new Set();
  for (const w of connections) {
    if (w?.from) connectedEndpoints.add(String(w.from));
    if (w?.to) connectedEndpoints.add(String(w.to));
  }

  const unconnectedPowerPins = [];
  for (const comp of canvas.components || []) {
    if (comp.role === 'host_board') continue;
    for (const pinName of comp.pins || []) {
      const upper = String(pinName).toUpperCase();
      if (
        (upper === 'VCC' || upper === 'GND' || upper === '5V' || upper === '3V3') &&
        !connectedEndpoints.has(`${comp.id}.${pinName}`)
      ) {
        unconnectedPowerPins.push(`${comp.id}.${pinName}`);
      }
    }
  }

  const hostBoardObj =
    executorOrStage?.getHostBoard?.() ||
    (typeof executorOrStage?.hostBoard === 'object' ? executorOrStage.hostBoard : null);
  const hostBoardTypeId =
    hostBoardObj?.typeId ||
    (typeof executorOrStage?.hostBoard === 'string' ? executorOrStage.hostBoard : 'board.arduino_uno');
  const flow = executorOrStage?.solveFlow?.() || {};
  return {
    ok: true,
    hostBoard: hostBoardTypeId,
    componentCount: canvas.count || executorOrStage?.componentCount || 0,
    components: canvas.components,
    connectionCount: connections.length || executorOrStage?.connectionCount || 0,
    connections,
    unconnectedPowerPins,
    closedLoopCount: Number(flow?.closedLoopCount ?? flow?.loops?.length ?? executorOrStage?.closedLoopCount ?? 0),
    totalCurrentMa: Number(flow?.totalCurrentMa ?? executorOrStage?.totalCurrentMa ?? 0),
    faultCount: Array.isArray(flow?.faults) ? flow.faults.length : Number(executorOrStage?.faultCount ?? 0)
  };
}

export const CORE_TOOLS = Object.freeze([
  'searchCapabilities',
  'getComponentSchema',
  'getFunctionSchema',
  'inspectCircuitState',
  'searchCanvasComponents',
  'describeCanvasComponent',
  'callCapability',
  'executeCode',
  'createCircuitBatch',
  'addComponent',
  'connectPins',
  'writeArduinoCode',
  'compileAndRunSimulation',
  'askUser'
]);

/**
 * Compact Flownie Meta-Tools (~6 declarations) sent to the LLM instead of 30+ full schemas.
 */
export const FLOWNIE_HARDWARE_META_TOOLS = Object.freeze([
  {
    name: 'searchCapabilities',
    description: 'Searches available 3D hardware components (boards, sensors, motors, drivers, LEDs, resistors) and CircuitSDK functions.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Keyword query (e.g., "ultrasonic servo led resistor arduino esp32")' },
        category: { type: 'string', description: 'Optional category filter ("all", "board", "sensor", "actuator", "passive")' }
      },
      required: ['query']
    }
  },
  {
    name: 'getComponentSchema',
    description: 'Returns exact electrical pin names (e.g., PIN9, 5V, GND, TRIG, ECHO, SIGNAL, LEAD_A, LEAD_B, ANODE, CATHODE) for a component typeId.',
    parameters: {
      type: 'object',
      properties: {
        typeId: { type: 'string', description: 'Exact component typeId (e.g., "sensor.ultrasonic", "actuator.servo", "led.single")' }
      },
      required: ['typeId']
    }
  },
  {
    name: 'getFunctionSchema',
    description: 'Returns parameter and return signature for a CircuitSDK function used inside executeCode.',
    parameters: {
      type: 'object',
      properties: {
        functionName: { type: 'string', description: 'Name of the CircuitSDK method (e.g., "addComponent", "connectWire", "setCode")' }
      },
      required: ['functionName']
    }
  },
  {
    name: 'searchCanvasComponents',
    description: 'Lists or searches 3D components currently placed on the workbench stage.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Optional search filter' }
      }
    }
  },
  {
    name: 'describeCanvasComponent',
    description: 'Inspects a specific component on the 3D stage and its connected wires.',
    parameters: {
      type: 'object',
      properties: {
        componentId: { type: 'string', description: 'Component instance ID or "host"' }
      },
      required: ['componentId']
    }
  },
  {
    name: 'executeCode',
    description: 'Executes JavaScript code in the Flownie Code Mode sandbox with access to `sdk` (CircuitSDK) to place 3D components, route wires, write C++ firmware, and start simulation in one turn.',
    parameters: {
      type: 'object',
      properties: {
        description: { type: 'string', description: 'Short Turkish/English summary of what this code block builds' },
        code: { type: 'string', description: 'Async JS body using `await sdk.setBoard(...)`, `await sdk.addComponent(...)`, `await sdk.connectWire(...)`, `await sdk.setCode(...)`' }
      },
      required: ['code']
    }
  }
]);
