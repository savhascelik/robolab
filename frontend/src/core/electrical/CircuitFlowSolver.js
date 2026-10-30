import { DisjointNetSet } from './DisjointNetSet.js';
import { i18n } from '../i18n/I18nService.js';

/**
 * Universal Conductivity, Potential & Closed-Loop Current Flow Solver (`CircuitFlowSolver`).
 *
 * Strictly adheres to OOP polymorphism and physical laws (Ohm's & Kirchhoff's loop laws):
 * - Contains ZERO hardcoded component rules (never checks `if (typeId === 'led')`).
 * - Every component (built-in or AI-generated) declares its own `ElectricalPin`s and `ConductiveDipole`s.
 * - Extracts topological nets via `DisjointNetSet` (Union-Find).
 * - Propagates voltage potentials & bus protocols (`GPIO`, `PWM`, `ADC`, `UART`, `I2C`, `SPI`).
 * - Solves closed conductive paths (`Source Net -> Dipoles -> Ground Net`) to compute real current
 *   `I = (V_source - ΣV_f) / ΣR` and dispatches the resulting flow to each component.
 */
export class CircuitFlowSolver {
  /**
   * Solves the electrical topology and flow for a set of components and wire connections.
   * @param {object} input
   * @param {import('../components/HardwareComponent.js').HardwareComponent[]} input.components
   * @param {Array<{ id?: string, from: string, to: string }>} [input.connections]
   */
  solve({ boards = [], components = [], connections = [], wires = [], dt = 0.016, maxCascadeHops = 6 } = {}) {
    const allComponents = [...(Array.isArray(boards) ? boards : []), ...(Array.isArray(components) ? components : [])];
    const allConnections = Array.isArray(connections) && connections.length > 0 ? connections : (Array.isArray(wires) ? wires : []);
    const netSet = new DisjointNetSet();
    /** @type {Map<string, import('../components/HardwareComponent.js').HardwareComponent>} */
    const compMap = new Map();
    /** @type {Map<string, import('./ElectricalPin.js').ElectricalPin>} */
    const pinMap = new Map();

    // 1. Register all component pins, internal zero-ohm bridges (e.g. breadboard strips), and pinBindings
    for (const comp of allComponents) {
      if (!comp || !comp.id) continue;
      compMap.set(comp.id, comp);

      const pins = comp.getElectricalPins ? comp.getElectricalPins() : [];
      for (const pin of pins) {
        pinMap.set(pin.endpointId, pin);
        netSet.makeSet(pin.endpointId);
      }

      const internalBridges = comp.getInternalBridges ? comp.getInternalBridges() : [];
      for (const [pinA, pinB] of internalBridges) {
        netSet.union(`${comp.id}.${pinA}`, `${comp.id}.${pinB}`);
      }
    }

    // 1b. Merge component pinBindings & Breadboard Magnetic Snap Socket Bindings (`snappedBreadboardBinding`)
    for (const comp of allComponents) {
      if (!comp || !comp.id) continue;
      if (typeof comp.syncOutputTerminals === 'function') {
        comp.syncOutputTerminals();
      }
      if (comp.state && typeof comp.state.pressed === 'boolean' && Array.isArray(comp.internalDipoles)) {
        for (const dipole of comp.internalDipoles) {
          dipole.closed = Boolean(comp.state.pressed);
        }
      }
      if (comp.pinBindings && typeof comp.pinBindings === 'object') {
        for (const [localPin, targetEndpoint] of Object.entries(comp.pinBindings)) {
          if (targetEndpoint) {
            const resolvedLocal = comp.resolvePinName ? comp.resolvePinName(localPin) : localPin;
            const resolvedTarget = this._resolveEndpoint(targetEndpoint, compMap);
            netSet.union(`${comp.id}.${resolvedLocal}`, resolvedTarget);
          }
        }
      }
      if (
        comp.snappedBreadboardBinding &&
        comp.snappedBreadboardBinding.breadboardId &&
        Array.isArray(comp.snappedBreadboardBinding.pinMappings)
      ) {
        const bbId = comp.snappedBreadboardBinding.breadboardId;
        for (const mapping of comp.snappedBreadboardBinding.pinMappings) {
          const pinName = mapping?.pinName || mapping?.componentPin;
          const tieName = mapping?.tiePointName || mapping?.breadboardPin;
          if (pinName && tieName) {
            const resolvedLocal = comp.resolvePinName ? comp.resolvePinName(pinName) : pinName;
            const resolvedTarget = this._resolveEndpoint(`${bbId}.${tieName}`, compMap);
            netSet.union(`${comp.id}.${resolvedLocal}`, resolvedTarget);
          }
        }
      }
    }

    // 1c. Automatic spatial Breadboard tie-point insertion for components seated directly on breadboard holes
    this._autoBindBreadboardInsertions(allComponents, compMap, netSet);

    // 2. Merge external jumper wire connections
    for (const conn of allConnections) {
      if (!conn || !conn.from || !conn.to) continue;
      const fromEp = this._resolveEndpoint(conn.from, compMap);
      const toEp = this._resolveEndpoint(conn.to, compMap);
      netSet.union(fromEp, toEp);
    }

    // 3. Extract unified electrical nets & dipole graph
    const rawNets = netSet.extractNets();
    /** @type {Map<string, string>} endpointId -> netId */
    const endpointToNet = new Map();
    for (const net of rawNets) {
      for (const ep of net.endpoints) {
        endpointToNet.set(ep, net.id);
      }
    }

    // 4. Build Dipole Graph across Nets to solve Closed-Loop Current Flow
    /** @type {Map<string, Array<{ netA: string, netB: string, pinA: string, pinB: string, component: any, dipole: import('./ConductiveDipole.js').ConductiveDipole }>>} */
    const adj = new Map();
    const allDipoleEdges = [];

    for (const comp of compMap.values()) {
      const dipoles = comp.getInternalDipoles ? comp.getInternalDipoles() : [];
      for (const dipole of dipoles) {
        const epA = `${comp.id}.${dipole.pinA}`;
        const epB = `${comp.id}.${dipole.pinB}`;
        const netA = endpointToNet.get(epA);
        const netB = endpointToNet.get(epB);
        if (!netA || !netB || netA === netB) continue;

        const edge = { netA, netB, pinA: dipole.pinA, pinB: dipole.pinB, component: comp, dipole };
        allDipoleEdges.push(edge);

        if (!adj.has(netA)) adj.set(netA, []);
        if (!adj.has(netB)) adj.set(netB, []);
        adj.get(netA).push(edge);
        adj.get(netB).push(edge);
      }
    }

    const stageObstacles = allComponents.filter(
      (c) => c && (c.isEnvironmentProp || c.obstacleProfile?.isObstacle)
    );

    const captureDriverSnapshot = () => {
      const parts = [];
      for (const comp of compMap.values()) {
        const pins = comp.getElectricalPins ? comp.getElectricalPins() : [];
        for (const p of pins) {
          const dv =
            p.drivenVoltage === null || p.drivenVoltage === undefined
              ? 'null'
              : Number(p.drivenVoltage).toFixed(3);
          const duty = Number(p.pwmDuty || 0).toFixed(3);
          parts.push(`${p.endpointId}:${p.direction}:${dv}:${duty}`);
        }
        const dipoles = comp.getInternalDipoles ? comp.getInternalDipoles() : [];
        for (const d of dipoles) {
          parts.push(`${comp.id}.${d.pinA}-${d.pinB}:${d.closed ? 1 : 0}:${Number(d.resistance || 0).toFixed(2)}`);
        }
      }
      return parts.join('|');
    };

    const maxHops = Math.max(1, Math.min(8, Number(maxCascadeHops) || 6));
    /** @type {Map<string, object>} */
    let netsById = new Map();
    /** @type {Map<string, any>} */
    let componentReports = new Map();
    let activeLoops = [];
    let faults = [];
    let cascadeHopCount = 0;

    // Multi-Hop Cascade Data-Flow Solver Loop (ReactFlow 3D Hardware Node Cascade)
    for (let hop = 0; hop < maxHops; hop++) {
      cascadeHopCount = hop + 1;
      netsById = new Map();
      faults = [];

      for (const comp of compMap.values()) {
        if (comp.state && typeof comp.state.pressed === 'boolean' && Array.isArray(comp.internalDipoles)) {
          for (const dipole of comp.internalDipoles) {
            dipole.closed = Boolean(comp.state.pressed);
          }
        }
      }

      for (const net of rawNets) {
        const pinsOnNet = net.endpoints.map((ep) => pinMap.get(ep)).filter(Boolean);
        const sources = pinsOnNet.filter((p) => p.isVoltageSource());
        const sinks = pinsOnNet.filter((p) => p.isGroundSink());

        let drivenVoltage = null;
        if (sources.length > 0) {
          drivenVoltage = Math.max(...sources.map((s) => s.drivenVoltage || 0));
        } else if (sinks.length > 0) {
          drivenVoltage = 0;
        }

        const signals = pinsOnNet
          .filter(
            (p) =>
              p.isVoltageSource() ||
              p.signal ||
              (p.protocol && p.protocol !== 'DC' && (p.drivenVoltage || 0) > 0)
          )
          .map((p) => ({
            fromEndpoint: p.endpointId,
            sourceComponentId: p.componentId,
            sourcePin: p.pinName,
            protocol: p.protocol,
            voltage: p.isVoltageSource() ? p.drivenVoltage : (drivenVoltage ?? p.drivenVoltage ?? 0),
            payload: p.signal
          }));

        const enrichedNet = {
          id: net.id,
          endpoints: net.endpoints,
          pins: pinsOnNet,
          sources,
          sinks,
          drivenVoltage,
          signals
        };
        netsById.set(net.id, enrichedNet);

        // 3a. Direct Short-Circuit Check (Source tied directly to Ground on the same net)
        const trueGroundSinks = sinks.filter((s) => {
          const dir = String(s.direction).toLowerCase();
          return dir === 'ground' || dir === 'gnd';
        });
        if (sources.length > 0 && trueGroundSinks.length > 0) {
          const src = sources[0];
          const gnd = trueGroundSinks[0];
          faults.push({
            code: 'elec.fault.short_circuit',
            severity: 'critical',
            netId: net.id,
            componentId: src.componentId,
            params: {
              netId: net.id,
              sourcePin: src.endpointId,
              gndPin: gnd.endpointId,
              voltage: src.drivenVoltage
            },
            message: i18n.resolveToken({
              code: 'elec.fault.short_circuit',
              params: {
                netId: net.id,
                sourcePin: src.endpointId,
                gndPin: gnd.endpointId,
                voltage: src.drivenVoltage
              }
            })
          });
        }

        // 3b. Pin Overvoltage Check (e.g. 5.0V signal connected directly to a 3.3V max pin)
        if (drivenVoltage !== null && drivenVoltage > 0) {
          for (const pin of pinsOnNet) {
            if (drivenVoltage > pin.maxVoltage + 0.05) {
              const comp = compMap.get(pin.componentId);
              const compLabel = comp ? `@i18n:hw.${comp.typeId}.name` : pin.componentId;
              const fault = {
                code: 'elec.fault.overvoltage',
                severity: 'critical',
                netId: net.id,
                componentId: pin.componentId,
                pinName: pin.pinName,
                params: {
                  component: compLabel,
                  pin: pin.pinName,
                  voltage: drivenVoltage.toFixed(1),
                  maxVoltage: pin.maxVoltage.toFixed(1)
                }
              };
              fault.message = i18n.resolveToken(fault);
              faults.push(fault);
            }
          }
        }
      }

      componentReports = new Map();
      for (const comp of compMap.values()) {
        componentReports.set(comp.id, {
          componentId: comp.id,
          typeId: comp.typeId,
          current: 0,
          currentMa: 0,
          voltage: 0,
          closedLoop: false,
          isConducting: false,
          isEnergized: false,
          reverseBiased: false,
          signals: [],
          faults: [],
          dt: hop === 0 ? dt : 0,
          cascadeHop: hop
        });
      }

      // 4b. Propagate potential & digital logic across closed low-ohm passive switch dipoles
      let switchRelaxed = true;
      let relaxGuard = 0;
      while (switchRelaxed && relaxGuard < 6) {
        switchRelaxed = false;
        relaxGuard += 1;
        for (const edge of allDipoleEdges) {
          const d = edge.dipole;
          if (!d || !d.closed || d.unidirectional || d.resistance > 5.0) continue;
          const nA = netsById.get(edge.netA);
          const nB = netsById.get(edge.netB);
          if (!nA || !nB) continue;

          if (nA.drivenVoltage !== null && nB.drivenVoltage === null) {
            nB.drivenVoltage = nA.drivenVoltage;
            nB.signals.push({
              fromEndpoint: `${edge.component.id}.${edge.pinA}`,
              protocol: 'GPIO',
              voltage: nA.drivenVoltage,
              payload: { digital: nA.drivenVoltage >= 2.0 ? 1 : 0, analog: Number((nA.drivenVoltage / 5.0).toFixed(3)) }
            });
            switchRelaxed = true;
          } else if (nB.drivenVoltage !== null && nA.drivenVoltage === null) {
            nA.drivenVoltage = nB.drivenVoltage;
            nA.signals.push({
              fromEndpoint: `${edge.component.id}.${edge.pinB}`,
              protocol: 'GPIO',
              voltage: nB.drivenVoltage,
              payload: { digital: nB.drivenVoltage >= 2.0 ? 1 : 0, analog: Number((nB.drivenVoltage / 5.0).toFixed(3)) }
            });
            switchRelaxed = true;
          }

          const rep = componentReports.get(edge.component.id);
          if (rep && (nA.drivenVoltage !== null || nB.drivenVoltage !== null)) {
            const v = Math.max(Number(nA.drivenVoltage || 0), Number(nB.drivenVoltage || 0));
            rep.closedLoop = true;
            rep.isConducting = true;
            rep.isEnergized = v > 0;
            rep.voltage = Math.max(rep.voltage, v);
          }
        }
      }

      // 4c. Sync every ElectricalPin's instantaneous sensedVoltage & active protocol signal from its net before component evaluation
      for (const net of netsById.values()) {
        const vNet = net.drivenVoltage !== null ? Number(net.drivenVoltage) : 0;
        const activeSignalPin = net.pins.find((p) => p.signal && (p.isVoltageSource() || (p.drivenVoltage || 0) > 0));
        for (const pin of net.pins) {
          pin.sensedVoltage = vNet;
          if (!pin.isVoltageSource() && !pin.isGroundSink()) {
            pin.drivenVoltage = vNet;
            if (activeSignalPin && activeSignalPin !== pin && activeSignalPin.signal) {
              pin.signal = {
                ...activeSignalPin.signal,
                sourceComponentId: activeSignalPin.componentId,
                sourcePin: activeSignalPin.pinName
              };
            }
          }
        }
      }

      // Attach signals from connected nets to each component report
      for (const comp of compMap.values()) {
        const rep = componentReports.get(comp.id);
        const pins = comp.getElectricalPins ? comp.getElectricalPins() : [];
        for (const pin of pins) {
          const netId = endpointToNet.get(pin.endpointId);
          const net = netId ? netsById.get(netId) : null;
          if (net && net.signals.length > 0) {
            for (const sig of net.signals) {
              if (sig.fromEndpoint !== pin.endpointId) {
                rep.signals.push({
                  pin: pin.pinName,
                  pinName: pin.pinName,
                  ...sig,
                  ...(sig.payload && typeof sig.payload === 'object' ? sig.payload : {})
                });
              }
            }
          }
        }
      }

      // 5. Find closed conductive loops from positive Source Nets to Ground Sink Nets
      const sourceNets = [...netsById.values()].filter((n) => n.sources.length > 0 && (n.drivenVoltage || 0) > 0);
      const sinkNetIds = new Set([...netsById.values()].filter((n) => n.sinks.length > 0).map((n) => n.id));
      activeLoops = [];

      for (const srcNet of sourceNets) {
        const sourcePin = srcNet.sources[0];
        const vSource = srcNet.drivenVoltage || 0;
        const visitedNets = new Set([srcNet.id]);

        const dfs = (currentNetId, pathEdges) => {
          if (sinkNetIds.has(currentNetId) && pathEdges.length > 0) {
            let canConductAll = true;
            let hasReverseBias = false;
            let totalResistance = sourcePin.impedance || 0.05;
            let totalForwardVoltage = 0;

            for (const step of pathEdges) {
              const evalDir = step.dipole.evaluateDirection(step.entryPin, step.exitPin);
              if (!evalDir.canConduct) {
                canConductAll = false;
                if (evalDir.reverseBiased) {
                  hasReverseBias = true;
                  const rep = componentReports.get(step.component.id);
                  if (rep) rep.reverseBiased = true;
                }
              }
              totalResistance += step.dipole.resistance;
              totalForwardVoltage += step.dipole.forwardVoltage;
            }

            if (canConductAll) {
              const netVoltageAvailable = Math.max(0, vSource - totalForwardVoltage);
              const currentAmps = netVoltageAvailable > 0 ? netVoltageAvailable / Math.max(0.01, totalResistance) : 0;

              if (currentAmps > 0) {
                activeLoops.push({
                  sourceNetId: srcNet.id,
                  sinkNetId: currentNetId,
                  sourceVoltage: vSource,
                  totalResistance: Number(totalResistance.toFixed(3)),
                  currentAmps,
                  currentA: currentAmps,
                  currentMa: Number((currentAmps * 1000).toFixed(2)),
                  components: pathEdges.map((s) => s.component.id)
                });

                for (const step of pathEdges) {
                  const rep = componentReports.get(step.component.id);
                  if (rep) {
                    rep.closedLoop = true;
                    rep.isConducting = true;
                    rep.isEnergized = true;
                    rep.current = Math.max(rep.current, currentAmps);
                    rep.currentMa = Number((rep.current * 1000).toFixed(2));
                    const drop = step.dipole.forwardVoltage + currentAmps * step.dipole.resistance;
                    rep.voltage = Math.max(rep.voltage, Number(drop.toFixed(2)));
                  }
                }
              }
            } else if (hasReverseBias) {
              for (const step of pathEdges) {
                const rep = componentReports.get(step.component.id);
                if (rep && rep.reverseBiased) {
                  const fault = {
                    code: 'elec.fault.reverse_polarity',
                    severity: 'warning',
                    componentId: step.component.id,
                    params: {
                      component: `@i18n:hw.${step.component.typeId}.name`
                    }
                  };
                  fault.message = i18n.resolveToken(fault);
                  faults.push(fault);
                }
              }
            }
            return;
          }

          if (pathEdges.length >= 8) return;
          const neighbors = adj.get(currentNetId) || [];
          for (const edge of neighbors) {
            const isForward = edge.netA === currentNetId;
            const nextNetId = isForward ? edge.netB : edge.netA;
            if (visitedNets.has(nextNetId)) continue;

            visitedNets.add(nextNetId);
            pathEdges.push({
              ...edge,
              entryPin: isForward ? edge.pinA : edge.pinB,
              exitPin: isForward ? edge.pinB : edge.pinA
            });
            dfs(nextNetId, pathEdges);
            pathEdges.pop();
            visitedNets.delete(nextNetId);
          }
        };

        dfs(srcNet.id, []);
      }

      const beforeSnapshot = captureDriverSnapshot();

      // 6. Dispatch polymorphic electrical reports & 3D spatial stage environment (`stageEnv`) to every component
      for (const [compId, report] of componentReports.entries()) {
        const comp = compMap.get(compId);
        if (!comp) continue;

        const compFaults = faults.filter((f) => f.componentId === compId);
        report.faults.push(...compFaults);

        const stageEnv = this._buildStageEnvironmentForComponent(comp, stageObstacles, allComponents);

        if (typeof comp.evaluateElectricalFlow === 'function') {
          const internalFaults = comp.evaluateElectricalFlow(report, stageEnv) || [];
          for (const f of internalFaults) {
            faults.push(f);
          }
        }
      }

      // 6b. Propagate any output pin voltages & protocol frames driven during component `evaluate()` onto connected nets & GPIO input pins
      for (const net of netsById.values()) {
        const activeOutSources = net.pins.filter((p) => p.isVoltageSource());
        if (activeOutSources.length > 0) {
          net.drivenVoltage = Math.max(...activeOutSources.map((s) => Number(s.drivenVoltage || 0)));
        }
        const activeSignalPin = net.pins.find((p) => p.signal && (p.isVoltageSource() || (p.drivenVoltage || 0) > 0));
        if (net.drivenVoltage !== null) {
          const vNet = Number(net.drivenVoltage);
          for (const pin of net.pins) {
            pin.sensedVoltage = vNet;
            if (!pin.isVoltageSource() && !pin.isGroundSink()) {
              pin.drivenVoltage = vNet;
              if (activeSignalPin && activeSignalPin !== pin && activeSignalPin.signal) {
                pin.signal = {
                  ...activeSignalPin.signal,
                  sourceComponentId: activeSignalPin.componentId,
                  sourcePin: activeSignalPin.pinName
                };
              }
            }
          }
        }
      }

      const afterSnapshot = captureDriverSnapshot();
      if (beforeSnapshot === afterSnapshot) {
        break;
      }
    }

    const totalCurrentAmps = activeLoops.reduce(
      (sum, loop) => sum + (Number(loop.currentAmps ?? loop.currentA) || 0),
      0
    );
    const totalCurrentMa = Math.round(totalCurrentAmps * 1000 * 10) / 10;
    const hasShortCircuit = faults.some(
      (f) => f.code === 'elec.fault.short_circuit' || f.type === 'SHORT_CIRCUIT'
    );

    return {
      nets: [...netsById.values()],
      loops: activeLoops,
      closedLoopCount: activeLoops.length,
      totalCurrentAmps,
      totalCurrentMa,
      hasShortCircuit,
      cascadeHopCount,
      componentReports: Object.fromEntries(componentReports.entries()),
      faults
    };
  }

  /**
   * Builds the 3D spatial stage environment (`stageEnv`) for a given component,
   * calculating real-time Euclidean distances (in cm), 3D Field-of-View (`FOV` cone `inFov`, `angleDeg`),
   * and directional 3D raycast intersections (`raycastHit`, `rayDistanceCm`) against all 0-Pin environmental
   * obstacle props (`prop.obstacle_wall`, `prop.toy_bear`, or custom props) on the stage.
   */
  _buildStageEnvironmentForComponent(comp, stageObstacles = [], allComponents = []) {
    if (!comp || comp.isEnvironmentProp) return null;
    if (!Array.isArray(stageObstacles) || stageObstacles.length === 0) {
      if (comp.state?.detectedObstacleId) {
        return {
          obstacles: [],
          visibleObstacles: [],
          raycastHits: [],
          nearestObstacle: null,
          nearestRayHit: null,
          nearestAnyDirectionObstacle: null,
          totalComponents: allComponents.length
        };
      }
      return null;
    }

    const posA = comp.group?.position || { x: 0, y: 0, z: 0 };
    const ax = Number(posA.x || 0);
    const ay = Number(posA.y || 0);
    const az = Number(posA.z || 0);

    const [fx, fy, fz] =
      typeof comp.getForwardVector === 'function'
        ? comp.getForwardVector()
        : [Math.cos(Number(comp.group?.rotation?.y || 0)), 0, Math.sin(Number(comp.group?.rotation?.y || 0))];

    const defaultFov =
      comp.typeId?.includes('camera') || comp.typeId?.includes('vision') || comp.typeId?.includes('imx')
        ? 120
        : 60;
    const fovDeg = Number(comp.state?.fovDeg ?? defaultFov);
    const halfFovDeg = Math.max(1, Math.min(180, fovDeg * 0.5));
    const maxRangeCm = Number(comp.state?.maxValue ?? 400);

    const obstacles = [];

    for (const prop of stageObstacles) {
      if (!prop || prop.id === comp.id) continue;
      const posB = prop.group?.position || { x: 0, y: 0, z: 0 };
      const bx = Number(posB.x || 0);
      const by = Number(posB.y || 0);
      const bz = Number(posB.z || 0);
      const dx = bx - ax;
      const dy = by - ay;
      const dz = bz - az;
      const centerDistCm = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const radiusCm = Number(prop.obstacleProfile?.boundingRadiusCm || 0);
      const surfaceDistCm = Math.max(2, Number((centerDistCm - radiusCm).toFixed(1)));

      const ux = centerDistCm > 1e-6 ? dx / centerDistCm : 1;
      const uy = centerDistCm > 1e-6 ? dy / centerDistCm : 0;
      const uz = centerDistCm > 1e-6 ? dz / centerDistCm : 0;

      const dot = Math.max(-1, Math.min(1, fx * ux + fy * uy + fz * uz));
      const angleDeg = Number(((Math.acos(dot) * 180) / Math.PI).toFixed(2));
      const angularSubtenseDeg =
        centerDistCm > 1e-3 ? (Math.atan2(Math.max(1.5, radiusCm), centerDistCm) * 180) / Math.PI : 180;
      const inRange = surfaceDistCm <= maxRangeCm;
      const inFov = inRange && angleDeg <= halfFovDeg + angularSubtenseDeg;

      // Analytical 3D Directional Ray-Sphere/Cylinder Intersection along sensor forward ray `P(t) = A + t * F`
      const tProj = dx * fx + dy * fy + dz * fz;
      const perpSq = Math.max(0, centerDistCm * centerDistCm - tProj * tProj);
      const effRayRadius = Math.max(2.0, radiusCm || 3.0);
      const raycastHit = inRange && tProj > 0 && perpSq <= effRayRadius * effRayRadius;
      const rayDistanceCm = raycastHit
        ? Math.max(
            2,
            Number((tProj - Math.sqrt(Math.max(0, effRayRadius * effRayRadius - perpSq))).toFixed(1))
          )
        : null;

      obstacles.push({
        id: prop.id,
        typeId: prop.typeId,
        name: prop.name,
        visualClass: prop.obstacleProfile?.visualClass || prop.typeId,
        reflectivity: Number(prop.obstacleProfile?.reflectivity ?? 0.95),
        distanceCm: surfaceDistCm,
        centerDistanceCm: Number(centerDistCm.toFixed(1)),
        angleDeg,
        inFov,
        raycastHit,
        rayDistanceCm,
        directionVector: [Number(ux.toFixed(4)), Number(uy.toFixed(4)), Number(uz.toFixed(4))],
        position: [bx, by, bz]
      });
    }

    obstacles.sort((a, b) => a.distanceCm - b.distanceCm);
    const visibleObstacles = obstacles.filter((o) => o.inFov);
    const raycastHits = obstacles.filter((o) => o.raycastHit);

    return {
      sensorForward: [fx, fy, fz],
      fovDeg,
      obstacles,
      visibleObstacles,
      raycastHits,
      nearestObstacle: visibleObstacles[0] || null,
      nearestRayHit: raycastHits[0] || null,
      nearestAnyDirectionObstacle: obstacles[0] || null,
      totalComponents: allComponents.length
    };
  }

  /**
   * Automatically unions component pins that are physically seated on a breadboard's tie-points
   * (within `<= 0.65mm` XZ tolerance) so components inserted into a breadboard conduct across its
   * internal 5-hole terminal strips and power rails without requiring explicit jumper wires between
   * pins on the same strip. Never shorts two pins of the same component onto the same strip.
   */
  _autoBindBreadboardInsertions(allComponents, compMap, netSet) {
    const breadboards = allComponents.filter(
      (c) => c && (c.typeId === 'board.breadboard' || (typeof c.getInternalBridges === 'function' && c.getInternalBridges().length >= 50))
    );
    if (breadboards.length === 0) return;

    const getWorldPos = (comp, localCoords) => {
      if (typeof comp.getPinWorldPosition === 'function' && typeof localCoords === 'string') {
        return comp.getPinWorldPosition(localCoords);
      }
      const pos = comp.group?.position || comp.position || { x: 0, y: 0, z: 0 };
      const px = Array.isArray(pos) ? Number(pos[0] || 0) : Number(pos.x || 0);
      const py = Array.isArray(pos) ? Number(pos[1] || 0) : Number(pos.y || 0);
      const pz = Array.isArray(pos) ? Number(pos[2] || 0) : Number(pos.z || 0);
      const ry = typeof comp.group?.rotation?.y === 'number'
        ? comp.group.rotation.y
        : Array.isArray(comp.rotation)
          ? Number(comp.rotation[1] || 0)
          : 0;
      const cosY = Math.cos(ry);
      const sinY = Math.sin(ry);
      const lx = Number(localCoords?.[0] || 0);
      const ly = Number(localCoords?.[1] || 0);
      const lz = Number(localCoords?.[2] || 0);
      return [
        px + (lx * cosY + lz * sinY),
        py + ly,
        pz + (-lx * sinY + lz * cosY)
      ];
    };

    const bbTieTables = breadboards.map((bb) => {
      const ties = Object.entries(bb.pins || {}).map(([tieName, localTie]) => ({
        tieName,
        endpointId: `${bb.id}.${tieName}`,
        worldPos: getWorldPos(bb, localTie)
      }));
      return { bb, ties };
    });

    for (const comp of allComponents) {
      if (!comp || !comp.id || comp.isEnvironmentProp) continue;
      if (comp.typeId === 'board.breadboard' || comp.category === 'boards' || comp.category === 'robotics') continue;
      if (comp.snappedBreadboardBinding && Array.isArray(comp.snappedBreadboardBinding.pinMappings) && comp.snappedBreadboardBinding.pinMappings.length > 0) {
        continue;
      }

      const pinEntries = Object.entries(comp.pins || {});
      if (pinEntries.length === 0) continue;

      for (const { bb, ties } of bbTieTables) {
        if (bb.id === comp.id) continue;
        const candidateUnions = [];
        const usedStripRoots = new Set();
        let stripCollision = false;

        for (const [pinName, localPin] of pinEntries) {
          const wPin = getWorldPos(comp, localPin);
          let bestTie = null;
          let minDist = Infinity;

          for (const t of ties) {
            const d = Math.hypot(t.worldPos[0] - wPin[0], t.worldPos[2] - wPin[2]);
            if (d < minDist) {
              minDist = d;
              bestTie = t;
            }
          }

          if (bestTie && minDist <= 0.65) {
            const stripRoot = netSet.find(bestTie.endpointId);
            if (usedStripRoots.has(stripRoot)) {
              stripCollision = true;
              break;
            }
            usedStripRoots.add(stripRoot);
            candidateUnions.push({
              compEndpoint: `${comp.id}.${pinName}`,
              tieEndpoint: bestTie.endpointId
            });
          }
        }

        if (!stripCollision && candidateUnions.length > 0) {
          for (const u of candidateUnions) {
            netSet.union(u.compEndpoint, u.tieEndpoint);
          }
        }
      }
    }
  }

  /**
   * Resolves aliases on endpoints (e.g. `uno_1.PIN13`, `blink.resistor.LEAD_A`, or `uno_1.@LED_BUILTIN`).
   */
  _resolveEndpoint(endpointStr, compMap) {
    if (!endpointStr || typeof endpointStr !== 'string') return '';
    const normalized = endpointStr.includes(':') ? endpointStr.replace(':', '.') : endpointStr;
    const dotIdx = normalized.lastIndexOf('.');
    if (dotIdx === -1) return normalized;
    const compId = normalized.slice(0, dotIdx);
    const rawPin = normalized.slice(dotIdx + 1);
    const comp = compMap.get(compId);
    if (comp && typeof comp.resolvePinName === 'function') {
      return `${compId}.${comp.resolvePinName(rawPin)}`;
    }
    return normalized;
  }
}

export const circuitFlowSolver = new CircuitFlowSolver();
