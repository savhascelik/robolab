import { ScenarioSerializer } from '../../core/scenario/ScenarioSerializer.js';
import { SmartPinMatcher } from '../../core/electrical/SmartPinMatcher.js';

const WIRE_PALETTE = ['#e04b3a', '#38bdf8', '#f59e0b', '#22c55e', '#a855f7', '#232836'];

/**
 * Interactive 3D Freeform Jumper Wire Tool (`InteractiveWireTool`).
 *
 * Manages point-to-point jumper wire creation, removal, and 3D spline generation
 * between any two pins across any number of boards and components.
 */
export class InteractiveWireTool {
  /**
   * @param {object} deps
   * @param {import('../../core/registry/ComponentRegistry.js').ComponentRegistry} deps.registry
   * @param {import('three').Group} deps.stageGroup
   * @param {import('./PinSnapIndex.js').PinSnapIndex} deps.pinSnapIndex
   * @param {(connections: Array<object>) => void} [deps.onConnectionsChanged]
   */
  constructor({ registry, stageGroup, pinSnapIndex, onConnectionsChanged }) {
    this.registry = registry;
    this.stageGroup = stageGroup;
    this.pinSnapIndex = pinSnapIndex;
    this.onConnectionsChanged = onConnectionsChanged || null;

    /** @type {string|null} Pending start endpoint (`<componentId>.<pinName>`) during two-click wiring */
    this.pendingFromEndpoint = null;
    this.activeColorIndex = 0;

    /** @type {Array<{ id: string, from: string, to: string, color: string }>} */
    this.connections = [];
  }

  /**
   * Synchronizes the tool's connection list with an existing scenario's connections.
   * @param {Array<{ id: string, from: string, to: string, color: string }>} connections
   */
  setConnections(connections = []) {
    this.connections = connections.map((c) => ({ ...c }));
    this.pendingFromEndpoint = null;
  }

  /**
   * Handles a pin selection (either from 3D raycast snap or UI pin selector).
   * First click selects `pendingFromEndpoint`; second click creates the 3D jumper wire.
   * @param {string} endpointId `<componentId>.<pinName>`
   * @param {string} [color]
   * @returns {{ status: 'pending'|'connected'|'cancelled', from?: string, wire?: any }}
   */
  selectPinEndpoint(endpointId, color) {
    if (!this.pendingFromEndpoint) {
      this.pendingFromEndpoint = endpointId;
      return { status: 'pending', from: endpointId };
    }

    if (this.pendingFromEndpoint === endpointId) {
      this.pendingFromEndpoint = null;
      return { status: 'cancelled' };
    }

    const fromEp = this.pendingFromEndpoint;
    this.pendingFromEndpoint = null;
    const wire = this.connectEndpoints(fromEp, endpointId, color);
    return { status: 'connected', from: fromEp, to: endpointId, wire };
  }

  /**
   * Alias for `connectEndpoints`.
   * @param {string} fromEndpoint
   * @param {string} toEndpoint
   * @param {string} [color]
   */
  addConnection(fromEndpoint, toEndpoint, color) {
    return this.connectEndpoints(fromEndpoint, toEndpoint, color);
  }

  /**
   * Creates a 3D `JumperWireComponent` between `fromEndpoint` and `toEndpoint` and records the connection.
   * @param {string} fromEndpoint
   * @param {string} toEndpoint
   * @param {string} [color]
   */
  connectEndpoints(fromEndpoint, toEndpoint, color) {
    if (!fromEndpoint || !toEndpoint || fromEndpoint === toEndpoint) return null;

    const [fromCompId, fromPinRaw] = ScenarioSerializer.splitEndpoint(fromEndpoint);
    const [toCompId, toPinRaw] = ScenarioSerializer.splitEndpoint(toEndpoint);
    const fromComp =
      this.registry.getInstance(fromCompId) ||
      (fromCompId === 'host' ? this.registry.getInstancesByCategory('boards')[0] : null);
    const toComp =
      this.registry.getInstance(toCompId) ||
      (toCompId === 'host' ? this.registry.getInstancesByCategory('boards')[0] : null);

    if (!fromComp || !toComp) return null;

    const fromPin = fromComp.resolvePinName(fromPinRaw);
    const toPin = toComp.resolvePinName(toPinRaw);
    const canonicalFrom = `${fromComp.id}.${fromPin}`;
    const canonicalTo = `${toComp.id}.${toPin}`;

    const startPt = fromComp.getPinWorldPosition(fromPin);
    const endPt = toComp.getPinWorldPosition(toPin);
    const points = ScenarioSerializer.computeWireWaypoints(startPt, endPt);

    const fromElecPin = fromComp.electricalPins?.get(fromPin);
    const toElecPin = toComp.electricalPins?.get(toPin);
    const smartColor =
      fromElecPin && toElecPin
        ? SmartPinMatcher.pickWireColorForPair(fromElecPin, toElecPin)
        : null;

    const chosenColor =
      color ||
      smartColor ||
      (fromPin.startsWith('GND') || toPin.startsWith('GND')
        ? '#232836'
        : WIRE_PALETTE[this.activeColorIndex++ % WIRE_PALETTE.length]);

    const wireId = `wire.free.${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const wireComp = this.registry.create('passive.wire', {
      id: wireId,
      from: canonicalFrom,
      to: canonicalTo,
      color: chosenColor,
      points
    });

    if (this.stageGroup) {
      this.stageGroup.add(wireComp.group);
    }

    const connRecord = {
      id: wireId,
      from: canonicalFrom,
      to: canonicalTo,
      color: chosenColor
    };
    this.connections.push(connRecord);

    if (this.onConnectionsChanged) {
      this.onConnectionsChanged(this.connections);
    }

    return wireComp;
  }

  /**
   * Dynamically recomputes 3D spline curves for all jumper wires attached to `movedComponentId`
   * (or all wires on stage if `movedComponentId` is omitted) when a component is moved/rotated via Gizmo.
   * @param {string|null} [movedComponentId]
   * @returns {number} Count of updated wire meshes
   */
  refreshConnectedWires(movedComponentId = null) {
    let updatedCount = 0;

    for (const conn of this.connections) {
      const [fromCompId, fromPinRaw] = ScenarioSerializer.splitEndpoint(conn.from);
      const [toCompId, toPinRaw] = ScenarioSerializer.splitEndpoint(conn.to);

      if (movedComponentId && fromCompId !== movedComponentId && toCompId !== movedComponentId) {
        continue;
      }

      const fromComp = this.registry.getInstance(fromCompId);
      const toComp = this.registry.getInstance(toCompId);
      const wireComp = this.registry.getInstance(conn.id);
      if (!fromComp || !toComp || !wireComp || typeof wireComp.updateWaypoints !== 'function') {
        continue;
      }

      const fromPin = fromComp.resolvePinName(fromPinRaw);
      const toPin = toComp.resolvePinName(toPinRaw);
      const startPt = fromComp.getPinWorldPosition(fromPin);
      const endPt = toComp.getPinWorldPosition(toPin);
      const points = ScenarioSerializer.computeWireWaypoints(startPt, endPt);
      wireComp.updateWaypoints(points);
      updatedCount++;
    }

    return updatedCount;
  }

  /**
   * Removes all jumper wires attached to a given component ID (used when deleting a component from stage).
   * @param {string} componentId
   */
  removeWiresForComponent(componentId) {
    if (!componentId) return 0;
    const toRemove = this.connections
      .filter((conn) => {
        const [fromCompId] = ScenarioSerializer.splitEndpoint(conn.from);
        const [toCompId] = ScenarioSerializer.splitEndpoint(conn.to);
        return fromCompId === componentId || toCompId === componentId;
      })
      .map((conn) => conn.id);

    for (const wireId of toRemove) {
      this.removeWire(wireId);
    }
    return toRemove.length;
  }

  /**
   * Removes a jumper wire by its connection/component ID.
   * @param {string} wireId
   */
  removeWire(wireId) {
    const idx = this.connections.findIndex((c) => c.id === wireId);
    if (idx === -1) return false;
    this.connections.splice(idx, 1);

    const inst = this.registry.getInstance(wireId);
    if (inst && this.stageGroup) {
      this.stageGroup.remove(inst.group);
    }
    this.registry.removeInstance(wireId, true);

    if (this.onConnectionsChanged) {
      this.onConnectionsChanged(this.connections);
    }
    return true;
  }

  /**
   * Flownie-style One-Click Quick Connect between two components (`sourceCompOrId` and `targetCompOrId`).
   * Uses `SmartPinMatcher.findBestPinMatch` to pick the highest-scoring compatible unoccupied pin pair.
   * Repeated calls wire subsequent free pins (e.g. first Signal/Power, second Ground).
   *
   * @param {string|import('../../core/components/HardwareComponent.js').HardwareComponent} sourceCompOrId
   * @param {string|import('../../core/components/HardwareComponent.js').HardwareComponent} targetCompOrId
   * @returns {{ connected: boolean, reasonKey: string|null, wire: any, match: any }}
   */
  quickConnectComponents(sourceCompOrId, targetCompOrId) {
    const sourceComp =
      typeof sourceCompOrId === 'string'
        ? this.registry.getInstance(sourceCompOrId)
        : sourceCompOrId;
    const targetComp =
      typeof targetCompOrId === 'string'
        ? this.registry.getInstance(targetCompOrId)
        : targetCompOrId;

    if (!sourceComp || !targetComp || sourceComp.id === targetComp.id) {
      return {
        connected: false,
        reasonKey: 'elec.wiring.err.no_free_pins',
        wire: null,
        match: null
      };
    }

    const match = SmartPinMatcher.findBestPinMatch(sourceComp, targetComp, this.connections);
    if (!match) {
      return {
        connected: false,
        reasonKey: 'elec.wiring.err.no_free_pins',
        wire: null,
        match: null
      };
    }

    const wire = this.connectEndpoints(
      match.sourcePin.endpointId,
      match.targetPin.endpointId,
      match.color
    );

    return {
      connected: Boolean(wire),
      reasonKey: wire ? null : 'elec.wiring.err.no_free_pins',
      wire,
      match
    };
  }

  /**
   * Rule-Based Zero-Cost Stage Auto-Connect (`autoConnectStage`).
   * Plans and creates all missing jumper wires for unconnected stage components.
   *
   * @returns {{ createdCount: number, wires: Array<any>, plans: Array<object> }}
   */
  autoConnectStage() {
    const components = [...this.registry.instancesById.values()].filter(
      (c) => c && c.typeId !== 'passive.wire'
    );
    const plans = SmartPinMatcher.planStageAutoConnections(components, this.connections);
    const wires = [];

    for (const plan of plans) {
      const wire = this.connectEndpoints(plan.from, plan.to, plan.color);
      if (wire) {
        wires.push(wire);
      }
    }

    return {
      createdCount: wires.length,
      wires,
      plans
    };
  }

  /**
   * Returns all connection records attached to `componentId`.
   * @param {string} componentId
   * @returns {Array<{ id: string, from: string, to: string, color: string }>}
   */
  getWiresForComponent(componentId) {
    if (!componentId) return [];
    return this.connections.filter((conn) => {
      const [fromCompId] = ScenarioSerializer.splitEndpoint(conn.from);
      const [toCompId] = ScenarioSerializer.splitEndpoint(conn.to);
      return fromCompId === componentId || toCompId === componentId;
    });
  }

  /**
   * Returns the total count of jumper wires connected to `componentId`.
   * @param {string} componentId
   * @returns {number}
   */
  getComponentWireCount(componentId) {
    return this.getWiresForComponent(componentId).length;
  }

  /**
   * Flownie-style One-Click Disconnect All (`disconnectComponent`) for a component.
   * @param {string} componentId
   * @returns {number} Number of removed wires
   */
  disconnectComponent(componentId) {
    return this.removeWiresForComponent(componentId);
  }

  /**
   * Computes the 3D world-space apex/midpoint `[x, y, z]` of a jumper wire for 2D `×` badge projection.
   * @param {string} wireId
   * @returns {number[]|null}
   */
  getWireMidpointWorld(wireId) {
    const wireComp = this.registry.getInstance(wireId);
    if (wireComp && Array.isArray(wireComp.wireMeta?.points) && wireComp.wireMeta.points.length > 0) {
      const pts = wireComp.wireMeta.points;
      const mid = pts[Math.floor(pts.length / 2)];
      return [...mid];
    }

    const conn = this.connections.find((c) => c.id === wireId);
    if (!conn) return null;
    const [fromCompId, fromPinRaw] = ScenarioSerializer.splitEndpoint(conn.from);
    const [toCompId, toPinRaw] = ScenarioSerializer.splitEndpoint(conn.to);
    const fromComp = this.registry.getInstance(fromCompId);
    const toComp = this.registry.getInstance(toCompId);
    if (!fromComp || !toComp) return null;

    const startPt = fromComp.getPinWorldPosition(fromComp.resolvePinName(fromPinRaw));
    const endPt = toComp.getPinWorldPosition(toComp.resolvePinName(toPinRaw));
    const waypoints = ScenarioSerializer.computeWireWaypoints(startPt, endPt);
    return waypoints[Math.floor(waypoints.length / 2)] || null;
  }

  /**
   * Returns all active semantic connections.
   */
  getConnections() {
    return [...this.connections];
  }
}
