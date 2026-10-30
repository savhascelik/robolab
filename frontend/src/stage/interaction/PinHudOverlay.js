import * as THREE from 'three';
import { SmartPinMatcher } from '../../core/electrical/SmartPinMatcher.js';
import { i18n } from '../../core/i18n/I18nService.js';
import { userSettings, PIN_VISIBILITY_MODES } from '../../core/settings/UserSettingsService.js';

/**
 * Flownie `NodeHandles` & `CustomEdge` Inspired 3D-to-2D Floating Port Pill & Wire `×` Overlay (`PinHudOverlay`).
 *
 * Strictly adheres to Single Responsibility Principle:
 * - Projects 3D `ElectricalPin` world coordinates (`getPinWorldPosition`) into 2D viewport coordinates.
 * - Reactive to `UserSettingsService` (`wiring.pinVisibilityMode` & `wiring.highlightNearestClassOnDrag`):
 *   - `'pin_hover'` (DEFAULT): Component hover/selection does NOT show all pin labels at once;
 *     only the specific pin/input directly hovered by the user (or nearest compatible pins during wire drag)
 *     expands its pill badge.
 *   - `'component_hover'`: Shows all pin pill badges of the selected/hovered component.
 *   - `'always'`: Shows all pin pill badges for all active stage components.
 * - During an active port drag (`startPinDrag`), uses `SmartPinMatcher.rankCompatibleTargetPins` in real time
 *   to colorize compatible pins of the same electrical class and highlight the nearest connectable pins
 *   (`.is-nearest-compatible`, `.is-nearest-primary`).
 * - Projects the 3D midpoint of connected `JumperWireComponent` splines into 2D red `×` quick-delete buttons.
 */
export class PinHudOverlay {
  /**
   * Pure 3D-to-2D projection helper (also directly testable in headless Node.js).
   * @param {number[]} worldPos `[x, y, z]`
   * @param {THREE.Camera} camera
   * @param {number} width Viewport width in px
   * @param {number} height Viewport height in px
   * @returns {{ x: number, y: number, ndcZ: number, visible: boolean }}
   */
  static projectWorldToScreen(worldPos, camera, width, height) {
    if (!Array.isArray(worldPos) || !camera) {
      return { x: 0, y: 0, ndcZ: 0, visible: false };
    }
    const vec = new THREE.Vector3(worldPos[0], worldPos[1], worldPos[2]);
    vec.project(camera);

    const x = (vec.x * 0.5 + 0.5) * Math.max(1, width);
    const y = (-vec.y * 0.5 + 0.5) * Math.max(1, height);
    const visible = vec.z >= -1 && vec.z <= 1 && x >= -40 && x <= width + 40 && y >= -40 && y <= height + 40;

    return {
      x: Number(x.toFixed(1)),
      y: Number(y.toFixed(1)),
      ndcZ: Number(vec.z.toFixed(4)),
      visible
    };
  }

  /**
   * Formats a compact, human-readable pill badge text for an `ElectricalPin`.
   * @param {import('../../core/electrical/ElectricalPin.js').ElectricalPin} pin
   * @returns {{ label: string, category: object }}
   */
  static formatPinBadge(pin) {
    const category = SmartPinMatcher.classifyPinVisualCategory(pin);
    const rawName = String(pin?.pinName || 'PIN');
    const shortName = rawName.replace(/^PIN(\d+)$/, 'D$1');
    const role = category.shortRole;

    if (shortName.toUpperCase() === role.toUpperCase() || role === 'PASSIVE') {
      return { label: shortName, category };
    }
    return { label: `${shortName} • ${role}`, category };
  }

  /**
   * @param {object} deps
   * @param {HTMLElement} [deps.stageEl]
   * @param {THREE.Camera} deps.camera
   * @param {import('../../core/registry/ComponentRegistry.js').ComponentRegistry} deps.registry
   * @param {import('./InteractiveWireTool.js').InteractiveWireTool} deps.wireTool
   * @param {import('../../core/settings/UserSettingsService.js').UserSettingsService} [deps.settings]
   * @param {() => void} [deps.onWireCreated]
   * @param {() => void} [deps.onWireRemoved]
   */
  constructor({ scene = null, stageEl, camera, registry, wireTool, settings = userSettings, onWireCreated, onWireRemoved }) {
    this.scene = scene || null;
    this.stageEl = stageEl || null;
    this.camera = camera;
    this.registry = registry;
    this.wireTool = wireTool;
    this.settings = settings || userSettings;
    this.onWireCreated = onWireCreated || null;
    this.onWireRemoved = onWireRemoved || null;

    this.selectedComponent = null;
    this.hoveredComponent = null;
    /** @type {string|null} Wire connection ID currently hovered on the stage (curve or midpoint) */
    this.hoveredWireId = null;
    /** @type {string|null} Wire connection ID whose `×` button is directly under the pointer */
    this.activeWireDeleteHoverId = null;
    /** @type {import('../../core/components/HardwareComponent.js').HardwareComponent|null} */
    this.quickConnectSourceComponent = null;
    /** @type {((targetComp: any) => void)|null} */
    this.onQuickConnectTargetClick = null;
    /** @type {string|null} Endpoint ID of the specific pin currently hovered by the user */
    this.hoveredPinEndpoint = null;

    /** @type {import('../../core/electrical/ElectricalPin.js').ElectricalPin|null} */
    this.activeDragSourcePin = null;
    /** @type {import('../../core/electrical/ElectricalPin.js').ElectricalPin|null} */
    this.hoveredTargetPin = null;
    /** @type {import('../../core/electrical/ElectricalPin.js').ElectricalPin|null} */
    this.nearestCompatiblePin = null;
    this.nearestCompatibleDistance = Number.POSITIVE_INFINITY;
    this.dragCursor = { x: 0, y: 0 };

    /** @type {Map<string, { el: HTMLElement, pin: import('../../core/electrical/ElectricalPin.js').ElectricalPin, comp: any, screenX: number, screenY: number }>} */
    this.portElements = new Map();
    /** @type {Map<string, HTMLElement>} */
    this.wireDeleteElements = new Map();

    if (this.stageEl && typeof document !== 'undefined') {
      this._mountDom();
    }

    this._unsubscribeSettings = this.settings?.onChange(({ key }) => {
      if (key.startsWith('wiring.')) {
        this._syncVisibilityModeClass();
        this.rebuildDomNodes();
      }
    });
  }

  /**
   * Returns the current pin visibility mode from `UserSettingsService`.
   * Defaults to `'pin_hover'` (only show pin pill when hovering directly over that pin).
   * @returns {'pin_hover'|'component_hover'|'always'}
   */
  getPinVisibilityMode() {
    return this.settings?.get('wiring.pinVisibilityMode') || PIN_VISIBILITY_MODES.PIN_HOVER;
  }

  _syncVisibilityModeClass() {
    if (!this.portsLayer) return;
    const mode = this.getPinVisibilityMode();
    this.portsLayer.dataset.visibilityMode = mode;
    this.portsLayer.classList.toggle('mode-pin-hover', mode === PIN_VISIBILITY_MODES.PIN_HOVER);
    this.portsLayer.classList.toggle('mode-component-hover', mode === PIN_VISIBILITY_MODES.COMPONENT_HOVER);
    this.portsLayer.classList.toggle('mode-always', mode === PIN_VISIBILITY_MODES.ALWAYS);
    this.portsLayer.classList.toggle('is-dragging-wire', Boolean(this.activeDragSourcePin));
  }

  _mountDom() {
    this.rootEl = document.createElement('div');
    this.rootEl.className = 'pin-hud-overlay';
    this.rootEl.setAttribute('aria-hidden', 'true');

    this.dragSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.dragSvg.setAttribute('class', 'pin-hud-drag-svg');
    this.dragPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    this.dragPath.setAttribute('class', 'pin-hud-drag-path');
    this.dragSvg.appendChild(this.dragPath);

    this.portsLayer = document.createElement('div');
    this.portsLayer.className = 'pin-hud-ports-layer';
    this._syncVisibilityModeClass();

    this.wiresLayer = document.createElement('div');
    this.wiresLayer.className = 'pin-hud-wires-layer';

    this.rootEl.appendChild(this.dragSvg);
    this.rootEl.appendChild(this.portsLayer);
    this.rootEl.appendChild(this.wiresLayer);
    this.stageEl.appendChild(this.rootEl);

    this._onWindowPointerMove = (e) => {
      if (!this.stageEl) return;
      const rect = this.stageEl.getBoundingClientRect();
      const localX = e.clientX - rect.left;
      const localY = e.clientY - rect.top;

      if (this.activeDragSourcePin) {
        this.dragCursor.x = localX;
        this.dragCursor.y = localY;
        this._applyCompatibilityHighlights();
        this._updateDragLine();
        return;
      }

      const wireBtnEl = e.target?.closest?.('.pin-hud-wire-delete');
      if (wireBtnEl?.dataset?.wireId) {
        this.setHoveredWireId(wireBtnEl.dataset.wireId);
      } else if (
        localX >= 0 &&
        localX <= (rect.width || this.stageEl.clientWidth || 800) &&
        localY >= 0 &&
        localY <= (rect.height || this.stageEl.clientHeight || 520)
      ) {
        const hitWireId = this._findHoveredWireIdAtScreenPoint(
          localX,
          localY,
          rect.width || this.stageEl.clientWidth || 800,
          rect.height || this.stageEl.clientHeight || 520
        );
        this.setHoveredWireId(hitWireId);
      } else {
        this.setHoveredWireId(null);
      }
    };

    this._onWindowPointerUp = () => {
      if (!this.activeDragSourcePin) return;
      const dropPin =
        this.hoveredTargetPin ||
        (this.nearestCompatiblePin && this.nearestCompatibleDistance <= 42 ? this.nearestCompatiblePin : null);
      this.finishPinDrag(dropPin);
    };

    // Register in capture phase (`true`) so `hoveredWireId` is updated BEFORE the stage canvas's
    // bubbling `pointermove` listener calls `setHoveredComponent(null)` when moving from a board onto a wire.
    window.addEventListener('pointermove', this._onWindowPointerMove, true);
    window.addEventListener('pointerup', this._onWindowPointerUp);
  }

  /**
   * Computes point-to-segment distance in 2D screen space.
   */
  static _distToSegment2D(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq <= 1e-6) return Math.hypot(px - x1, py - y1);
    const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
    return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
  }

  /**
   * Finds the closest connected jumper wire on stage under or near `(localX, localY)` in 2D screen space,
   * so moving the cursor from a component onto a wire (or hovering directly over a wire) keeps its `×` badge stable.
   * @param {number} localX
   * @param {number} localY
   * @param {number} width
   * @param {number} height
   * @returns {string|null}
   */
  _findHoveredWireIdAtScreenPoint(localX, localY, width, height) {
    if (!this.camera || !this.wireTool) return null;
    const connections = this.wireTool.getConnections();
    if (!connections || connections.length === 0) return null;

    let bestWireId = null;
    let bestScore = Number.POSITIVE_INFINITY;

    for (const conn of connections) {
      const isAlreadyVisible = this.wireDeleteElements.has(conn.id);
      const midThreshold = isAlreadyVisible ? 68 : 42;
      const segThreshold = isAlreadyVisible ? 36 : 24;

      const midWorld = this.wireTool.getWireMidpointWorld(conn.id);
      if (midWorld) {
        const midProj = PinHudOverlay.projectWorldToScreen(midWorld, this.camera, width, height);
        if (midProj.visible) {
          const distMid = Math.hypot(localX - midProj.x, localY - midProj.y);
          if (distMid <= midThreshold && distMid < bestScore) {
            bestScore = distMid;
            bestWireId = conn.id;
          }
        }
      }

      const wireComp = this.registry?.getInstance?.(conn.id);
      const pts = wireComp?.wireMeta?.points;
      if (Array.isArray(pts) && pts.length >= 2) {
        const projected = pts
          .map((pt) => PinHudOverlay.projectWorldToScreen(pt, this.camera, width, height))
          .filter((p) => p.visible);
        for (let i = 0; i < projected.length - 1; i += 1) {
          const a = projected[i];
          const b = projected[i + 1];
          const segDist = PinHudOverlay._distToSegment2D(localX, localY, a.x, a.y, b.x, b.y);
          if (segDist <= segThreshold && segDist < bestScore) {
            bestScore = segDist;
            bestWireId = conn.id;
          }
        }
      }
    }

    return bestWireId;
  }

  /**
   * Sets the currently hovered wire ID without destroying existing wire `×` buttons.
   * @param {string|null} wireId
   */
  setHoveredWireId(wireId) {
    const next = wireId || null;
    if (this.hoveredWireId === next) return;
    this.hoveredWireId = next;
    this._syncWireDeleteButtons();
  }

  /**
   * Sets the currently selected component whose pins & connected wire `×` badges should be displayed.
   * @param {import('../../core/components/HardwareComponent.js').HardwareComponent|null} comp
   */
  setSelectedComponent(comp) {
    if (this.selectedComponent === comp) return;
    this.selectedComponent = comp || null;
    this.rebuildDomNodes();
  }

  /**
   * Sets the currently hovered component on the stage.
   * @param {import('../../core/components/HardwareComponent.js').HardwareComponent|null} comp
   */
  setHoveredComponent(comp) {
    if (this.hoveredComponent === comp) return;
    this.hoveredComponent = comp || null;
    this.rebuildDomNodes();
  }

  /**
   * Sets or clears the active Flownie 1-to-1 Smart Connect source component (`A`).
   * While active, hovering over any target component `B` previews the single best compatible free pin pair
   * (`sourcePin <-> targetPin`) and clicking anywhere on `B`'s ports triggers 1-to-1 Smart Connect.
   *
   * @param {import('../../core/components/HardwareComponent.js').HardwareComponent|null} comp
   * @param {((targetComp: any) => void)|null} [onTargetClick]
   */
  setQuickConnectSourceComponent(comp, onTargetClick = null) {
    this.onQuickConnectTargetClick = onTargetClick || this.onQuickConnectTargetClick;
    const next = comp || null;
    if (this.quickConnectSourceComponent === next) return;
    this.quickConnectSourceComponent = next;
    this._syncVisibilityModeClass();
    this.rebuildDomNodes();
  }

  /**
   * Computes the single best compatible free pin match between `this.quickConnectSourceComponent` (`A`)
   * and `targetComp` (`B`, defaults to `this.hoveredComponent`) for live Smart Connect hover preview.
   *
   * @param {import('../../core/components/HardwareComponent.js').HardwareComponent|null} [targetComp]
   */
  computeQuickConnectPreviewMatch(targetComp = this.hoveredComponent) {
    const srcComp = this.quickConnectSourceComponent;
    if (!srcComp || !targetComp || srcComp.id === targetComp.id) return null;
    return SmartPinMatcher.findBestPinMatch(srcComp, targetComp, this.wireTool.getConnections());
  }

  /**
   * Sets or clears the specific hovered pin endpoint (`'main.uno.PIN9'`).
   * @param {string|null} endpointId
   */
  setHoveredPinEndpoint(endpointId) {
    if (this.hoveredPinEndpoint === endpointId) return;
    this.hoveredPinEndpoint = endpointId || null;
    for (const [ep, entry] of this.portElements.entries()) {
      entry.el.classList.toggle('is-pin-hovered', ep === this.hoveredPinEndpoint);
    }
  }

  /**
   * Verifies that `comp.group` is mounted inside `this.scene` (when `this.scene` is provided),
   * preventing off-stage or showcase components from ever projecting ghost pins onto the HUD.
   * @param {import('../../core/components/HardwareComponent.js').HardwareComponent} comp
   */
  _isComponentInScene(comp) {
    if (!comp || !comp.group) return false;
    if (!this.scene) return true;
    let curr = comp.group;
    while (curr) {
      if (curr === this.scene) return true;
      curr = curr.parent;
    }
    return false;
  }

  /**
   * Returns the set of components whose pins should be mounted in the 2D HUD.
   * - In `'always'` mode or during active wire drag (`activeDragSourcePin`), includes all active stage components.
   * - In `'pin_hover'` and `'component_hover'` modes, mounts pins for the selected and hovered components
   *   (with CSS/state controlling whether all pills or only the hovered pin's pill is expanded).
   */
  getVisibleComponents() {
    const mode = this.getPinVisibilityMode();
    const set = new Set();

    if (mode === PIN_VISIBILITY_MODES.ALWAYS || this.activeDragSourcePin) {
      for (const comp of this.registry.instancesById.values()) {
        if (
          comp &&
          comp.typeId !== 'passive.wire' &&
          comp.typeId !== 'board.breadboard' &&
          this._isComponentInScene(comp)
        ) {
          set.add(comp);
        }
      }
      return [...set];
    }

    if (
      this.selectedComponent &&
      this.selectedComponent.typeId !== 'passive.wire' &&
      this._isComponentInScene(this.selectedComponent)
    ) {
      set.add(this.selectedComponent);
    }
    if (
      this.hoveredComponent &&
      this.hoveredComponent.typeId !== 'passive.wire' &&
      this._isComponentInScene(this.hoveredComponent)
    ) {
      set.add(this.hoveredComponent);
    }
    return [...set];
  }

  /**
   * Filters pins for HUD display so breadboards show their primary power/ground bus rails
   * while MCUs and components show all interactive electrical pins.
   * @param {import('../../core/components/HardwareComponent.js').HardwareComponent} comp
   */
  getDisplayablePinsForComponent(comp) {
    if (!comp || typeof comp.getElectricalPins !== 'function') return [];
    const pins = comp.getElectricalPins();
    if (comp.typeId === 'board.breadboard') {
      return pins.filter(
        (p) =>
          p.pinName.startsWith('PLUS_') ||
          p.pinName.startsWith('MINUS_') ||
          p.pinName.endsWith('_1') ||
          p.pinName.endsWith('_5') ||
          p.pinName.endsWith('_10')
      );
    }
    return pins;
  }

  /**
   * Begins a port-to-port drag operation from `sourcePin`.
   * Colorizes compatible target ports of the same class and highlights the nearest connectable pins.
   * @param {import('../../core/electrical/ElectricalPin.js').ElectricalPin} sourcePin
   * @param {{ x?: number, y?: number }} [initialCursor]
   */
  startPinDrag(sourcePin, initialCursor = null) {
    if (!sourcePin) return;
    this.activeDragSourcePin = sourcePin;
    this.hoveredTargetPin = null;
    this.nearestCompatiblePin = null;
    this.nearestCompatibleDistance = Number.POSITIVE_INFINITY;

    if (initialCursor && typeof initialCursor.x === 'number') {
      this.dragCursor.x = initialCursor.x;
      this.dragCursor.y = initialCursor.y;
    }

    this._syncVisibilityModeClass();
    this.rebuildDomNodes();
    this.update();
    this._applyCompatibilityHighlights();
    this._updateDragLine();
  }

  /**
   * Completes an active port-to-port drag operation.
   * If `targetPin` is compatible (`score > 0`), creates a 3D jumper wire immediately.
   * @param {import('../../core/electrical/ElectricalPin.js').ElectricalPin|null} targetPin
   * @returns {{ connected: boolean, wire: any, score: number, reasonKey: string|null }}
   */
  finishPinDrag(targetPin = null) {
    const sourcePin = this.activeDragSourcePin;
    this.activeDragSourcePin = null;
    this.hoveredTargetPin = null;
    this.nearestCompatiblePin = null;
    this.nearestCompatibleDistance = Number.POSITIVE_INFINITY;

    this._syncVisibilityModeClass();

    if (this.dragPath) {
      this.dragPath.setAttribute('d', '');
    }

    if (!sourcePin || !targetPin || sourcePin.endpointId === targetPin.endpointId) {
      this.rebuildDomNodes();
      return { connected: false, wire: null, score: 0, reasonKey: null };
    }

    const compat = SmartPinMatcher.validatePinCompatibility(sourcePin, targetPin);
    const score = SmartPinMatcher.scorePinPair(sourcePin, targetPin);

    if (!compat.valid || score <= 0) {
      this.rebuildDomNodes();
      return {
        connected: false,
        wire: null,
        score: 0,
        reasonKey: compat.reasonKey || 'elec.wiring.err.incompatible'
      };
    }

    const color = SmartPinMatcher.pickWireColorForPair(sourcePin, targetPin);
    const wire = this.wireTool.connectEndpoints(sourcePin.endpointId, targetPin.endpointId, color);
    this.rebuildDomNodes();
    this.onWireCreated?.(wire);

    return {
      connected: Boolean(wire),
      wire,
      score,
      reasonKey: null
    };
  }

  /**
   * Computes real-time compatibility and proximity ranking of every visible pin relative to
   * `this.activeDragSourcePin` and `this.dragCursor`.
   *
   * @returns {Array<object>} Ranked compatibility entries
   */
  computeDragCompatibilityRankings() {
    const src = this.activeDragSourcePin;
    if (!src) return [];

    const occupiedEndpoints = new Set();
    for (const conn of this.wireTool.getConnections()) {
      occupiedEndpoints.add(conn.from);
      occupiedEndpoints.add(conn.to);
    }

    const candidates = [];
    for (const entry of this.portElements.values()) {
      const worldPos = entry.comp?.getPinWorldPosition?.(entry.pin.pinName);
      candidates.push({
        pin: entry.pin,
        x: entry.screenX,
        y: entry.screenY,
        worldPos
      });
    }

    const nearestCount = this.settings?.get('wiring.nearestHighlightCount') ?? 3;
    return SmartPinMatcher.rankCompatibleTargetPins(src, candidates, this.dragCursor, {
      nearestCount,
      occupiedEndpoints
    });
  }

  /**
   * Applies `.is-compatible`, `.is-same-class`, `.is-nearest-compatible`, and `.is-nearest-primary`
   * classes and dynamic class colors to all port DOM elements during an active wire drag.
   */
  _applyCompatibilityHighlights() {
    const src = this.activeDragSourcePin;
    this.nearestCompatiblePin = null;
    this.nearestCompatibleDistance = Number.POSITIVE_INFINITY;

    for (const { el } of this.portElements.values()) {
      el.classList.remove(
        'is-source',
        'is-compatible',
        'is-same-class',
        'is-nearest-compatible',
        'is-nearest-primary',
        'is-incompatible'
      );
      delete el.dataset.matchScore;
      delete el.dataset.nearestRank;
      el.style.removeProperty('--drag-class-color');
    }

    if (!src) return;

    const srcEntry = this.portElements.get(src.endpointId);
    if (srcEntry) {
      srcEntry.el.classList.add('is-source');
    }

    const highlightNearestEnabled = this.settings?.get('wiring.highlightNearestClassOnDrag') !== false;
    const rankings = this.computeDragCompatibilityRankings();

    for (const item of rankings) {
      const entry = this.portElements.get(item.endpointId);
      if (!entry || item.endpointId === src.endpointId) continue;

      const { el } = entry;
      if (item.compatible) {
        el.classList.add('is-compatible');
        el.dataset.matchScore = String(item.score);

        if (highlightNearestEnabled) {
          el.style.setProperty('--drag-class-color', item.classColor);
          if (item.sameClass) {
            el.classList.add('is-same-class');
          }
          if (item.isNearest) {
            el.classList.add('is-nearest-compatible');
            el.dataset.nearestRank = String(item.nearestRank);
            if (item.nearestRank === 1) {
              el.classList.add('is-nearest-primary');
              this.nearestCompatiblePin = item.pin;
              this.nearestCompatibleDistance = item.distance;
            }
          }
        }
      } else {
        el.classList.add('is-incompatible');
      }
    }
  }

  _updateDragLine() {
    if (!this.dragPath || !this.activeDragSourcePin) return;
    const srcEntry = this.portElements.get(this.activeDragSourcePin.endpointId);
    if (!srcEntry) return;

    const x1 = Number(srcEntry.screenX || srcEntry.el.dataset.screenX || 0);
    const y1 = Number(srcEntry.screenY || srcEntry.el.dataset.screenY || 0);

    // If cursor is close to the #1 nearest compatible pin or a hovered target pin, gently magnetize the drag preview!
    let x2 = this.dragCursor.x;
    let y2 = this.dragCursor.y;
    const snapPin =
      this.hoveredTargetPin ||
      (this.nearestCompatiblePin && this.nearestCompatibleDistance <= 42 ? this.nearestCompatiblePin : null);

    if (snapPin) {
      const targetEntry = this.portElements.get(snapPin.endpointId);
      if (targetEntry && Number.isFinite(targetEntry.screenX)) {
        x2 = targetEntry.screenX;
        y2 = targetEntry.screenY;
      }
    }

    const midY = Math.min(y1, y2) - Math.min(48, Math.hypot(x2 - x1, y2 - y1) * 0.25);
    const srcCategory = SmartPinMatcher.classifyPinVisualCategory(this.activeDragSourcePin);
    this.dragPath.style.stroke = srcCategory.color;
    this.dragPath.setAttribute('d', `M ${x1} ${y1} Q ${(x1 + x2) / 2} ${midY} ${x2} ${y2}`);
  }

  /**
   * Rebuilds the DOM elements for visible port pills and reconciles connected wire `×` delete buttons.
   *
   * Why pre-position before `appendChild` and reconcile wire buttons in-place:
   * Previously, `rebuildDomNodes()` appended `.pin-hud-wire-delete` at `(0, 0)` and then called `update()`,
   * where reading `this.stageEl.clientWidth` forced a synchronous layout flush at `(0, 0)` before setting
   * `translate3d(x, y, 0)` — causing `.pin-hud-wire-delete` to animate across the stage from the top-left corner.
   * Additionally, wiping `this.wiresLayer.innerHTML = ''` whenever `hoveredComponent` changed caused the `×`
   * button to flicker in and out as the cursor moved from a component onto a connected wire.
   */
  rebuildDomNodes() {
    if (!this.portsLayer || !this.wiresLayer) return;

    const width = this.stageEl?.clientWidth || 800;
    const height = this.stageEl?.clientHeight || 520;

    this._syncVisibilityModeClass();
    this.portsLayer.innerHTML = '';
    this.portElements.clear();

    const visibleComps = this.getVisibleComponents();
    if (visibleComps.length === 0) {
      this._syncWireDeleteButtons(width, height);
      return;
    }

    const occupiedEndpoints = new Set();
    for (const conn of this.wireTool.getConnections()) {
      occupiedEndpoints.add(conn.from);
      occupiedEndpoints.add(conn.to);
    }

    for (const comp of visibleComps) {
      const pins = this.getDisplayablePinsForComponent(comp);
      for (const pin of pins) {
        const { label, category } = PinHudOverlay.formatPinBadge(pin);
        const isConnected = occupiedEndpoints.has(pin.endpointId);
        const isHoveredPin = this.hoveredPinEndpoint === pin.endpointId;

        const portEl = document.createElement('div');
        portEl.className = `pin-hud-port ${isConnected ? 'is-occupied' : ''} ${isHoveredPin ? 'is-pin-hovered' : ''}`;
        portEl.dataset.endpoint = pin.endpointId;
        portEl.dataset.category = category.id;
        portEl.style.setProperty('--pin-color', category.color);
        portEl.style.setProperty('--pin-bg', category.badgeBg);
        portEl.style.setProperty('--pin-border', category.badgeBorder);

        const worldPos = comp.getPinWorldPosition(pin.pinName);
        const proj = PinHudOverlay.projectWorldToScreen(worldPos, this.camera, width, height);
        portEl.style.display = proj.visible ? 'inline-flex' : 'none';
        portEl.style.transform = `translate3d(${proj.x}px, ${proj.y}px, 0)`;
        portEl.dataset.screenX = String(proj.x);
        portEl.dataset.screenY = String(proj.y);

        portEl.innerHTML = `
          <span class="pin-hud-dot" title="${pin.endpointId} (${label})"></span>
          <span class="pin-hud-pill">${label}</span>
        `;

        portEl.addEventListener('pointerdown', (e) => {
          if (e.button !== 0) return;
          e.stopPropagation();
          e.preventDefault();
          if (
            this.quickConnectSourceComponent &&
            comp.id !== this.quickConnectSourceComponent.id &&
            typeof this.onQuickConnectTargetClick === 'function'
          ) {
            this.onQuickConnectTargetClick(comp);
            return;
          }
          const rect = this.stageEl.getBoundingClientRect();
          this.startPinDrag(pin, {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
          });
        });

        portEl.addEventListener('pointerenter', () => {
          for (const [ep, entry] of this.portElements.entries()) {
            if (ep !== pin.endpointId) {
              entry.el.classList.remove('is-pin-hovered');
            }
          }
          this.hoveredPinEndpoint = pin.endpointId;
          portEl.classList.add('is-pin-hovered');
          if (this.activeDragSourcePin && this.activeDragSourcePin.endpointId !== pin.endpointId) {
            this.hoveredTargetPin = pin;
            portEl.classList.add('is-drop-target');
          }
        });

        portEl.addEventListener('pointerleave', () => {
          if (this.hoveredPinEndpoint === pin.endpointId) {
            this.hoveredPinEndpoint = null;
          }
          portEl.classList.remove('is-pin-hovered');
          if (this.hoveredTargetPin === pin) {
            this.hoveredTargetPin = null;
          }
          portEl.classList.remove('is-drop-target');
        });

        portEl.addEventListener('click', (e) => {
          e.stopPropagation();
          const res = this.wireTool.selectPinEndpoint(pin.endpointId, category.wireColor);
          if (res.status === 'connected') {
            this.rebuildDomNodes();
            this.onWireCreated?.(res.wire);
          }
        });

        this.portsLayer.appendChild(portEl);
        this.portElements.set(pin.endpointId, {
          el: portEl,
          pin,
          comp,
          screenX: proj.x,
          screenY: proj.y
        });
      }
    }

    this._syncWireDeleteButtons(width, height);

    if (this.activeDragSourcePin) {
      this._applyCompatibilityHighlights();
      this._updateDragLine();
    } else if (this.quickConnectSourceComponent && this.hoveredComponent) {
      this._applyQuickConnectHoverPreview();
    }
  }

  /**
   * Reconciles `.pin-hud-wire-delete` (`×`) buttons in-place for wires connected to the
   * selected component, hovered component, hovered wire path, or actively hovered `×` button.
   *
   * @param {number} [width]
   * @param {number} [height]
   */
  _syncWireDeleteButtons(
    width = this.stageEl?.clientWidth || 800,
    height = this.stageEl?.clientHeight || 520
  ) {
    if (!this.wiresLayer) return;

    const targetWires = new Map();
    if (this.selectedComponent) {
      for (const conn of this.wireTool.getWiresForComponent(this.selectedComponent.id)) {
        targetWires.set(conn.id, conn);
      }
    }
    if (this.hoveredComponent) {
      for (const conn of this.wireTool.getWiresForComponent(this.hoveredComponent.id)) {
        targetWires.set(conn.id, conn);
      }
    }
    if (this.hoveredWireId || this.activeWireDeleteHoverId) {
      for (const conn of this.wireTool.getConnections()) {
        if (conn.id === this.hoveredWireId || conn.id === this.activeWireDeleteHoverId) {
          targetWires.set(conn.id, conn);
        }
      }
    }

    // Remove buttons that are no longer active
    for (const [wireId, btn] of this.wireDeleteElements.entries()) {
      if (!targetWires.has(wireId)) {
        btn.remove();
        this.wireDeleteElements.delete(wireId);
      }
    }

    // Create or update active wire delete buttons with initial screen transform BEFORE appendChild
    for (const [wireId, conn] of targetWires.entries()) {
      const midWorld = this.wireTool.getWireMidpointWorld(wireId);
      const proj = midWorld
        ? PinHudOverlay.projectWorldToScreen(midWorld, this.camera, width, height)
        : { x: -9999, y: -9999, visible: false };

      let btn = this.wireDeleteElements.get(wireId);
      if (btn) {
        btn.style.display = proj.visible ? 'inline-flex' : 'none';
        btn.style.transform = `translate3d(${proj.x}px, ${proj.y}px, 0)`;
        btn.dataset.screenX = String(proj.x);
        btn.dataset.screenY = String(proj.y);
        continue;
      }

      btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pin-hud-wire-delete';
      btn.dataset.wireId = conn.id;
      btn.dataset.screenX = String(proj.x);
      btn.dataset.screenY = String(proj.y);
      btn.title = `${i18n.t('stage.wiring.delete_wire_title')}: ${conn.from} → ${conn.to}`;
      btn.innerHTML = '×';
      btn.style.display = proj.visible ? 'inline-flex' : 'none';
      btn.style.transform = `translate3d(${proj.x}px, ${proj.y}px, 0)`;

      btn.addEventListener('pointerenter', () => {
        this.activeWireDeleteHoverId = conn.id;
        this.hoveredWireId = conn.id;
      });
      btn.addEventListener('pointerleave', () => {
        if (this.activeWireDeleteHoverId === conn.id) {
          this.activeWireDeleteHoverId = null;
        }
        if (this.hoveredWireId === conn.id) {
          this.hoveredWireId = null;
        }
        this._syncWireDeleteButtons();
      });
      btn.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
      });
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.activeWireDeleteHoverId === conn.id) {
          this.activeWireDeleteHoverId = null;
        }
        if (this.hoveredWireId === conn.id) {
          this.hoveredWireId = null;
        }
        const removed = this.wireTool.removeWire(conn.id);
        if (removed) {
          this.rebuildDomNodes();
          this.onWireRemoved?.(conn.id);
        }
      });

      this.wiresLayer.appendChild(btn);
      this.wireDeleteElements.set(conn.id, btn);
    }
  }

  /**
   * Highlights the single best compatible free pin pair (`sourcePin` on `A` and `targetPin` on hovered `B`)
   * while Flownie 1-to-1 Smart Connect mode is active.
   */
  _applyQuickConnectHoverPreview() {
    const match = this.computeQuickConnectPreviewMatch(this.hoveredComponent);
    if (!match) return;

    const srcEntry = this.portElements.get(match.sourcePin.endpointId);
    const dstEntry = this.portElements.get(match.targetPin.endpointId);

    if (srcEntry) {
      srcEntry.el.classList.add('is-source', 'is-nearest-compatible', 'is-nearest-primary');
    }
    if (dstEntry) {
      const dstCat = SmartPinMatcher.classifyPinVisualCategory(match.targetPin);
      dstEntry.el.style.setProperty('--drag-class-color', dstCat.color);
      dstEntry.el.classList.add(
        'is-compatible',
        'is-same-class',
        'is-nearest-compatible',
        'is-nearest-primary'
      );
      dstEntry.el.dataset.matchScore = String(match.score);
    }
  }

  /**
   * Synchronizes 2D screen coordinates of all visible port pills and wire midpoint `×` badges on each frame.
   */
  update() {
    if (!this.stageEl || !this.camera) return;
    if (this.portElements.size === 0 && this.wireDeleteElements.size === 0) return;

    const width = this.stageEl.clientWidth || 800;
    const height = this.stageEl.clientHeight || 520;

    for (const entry of this.portElements.values()) {
      const { el, pin, comp } = entry;
      const worldPos = comp.getPinWorldPosition(pin.pinName);
      const proj = PinHudOverlay.projectWorldToScreen(worldPos, this.camera, width, height);
      entry.screenX = proj.x;
      entry.screenY = proj.y;

      if (!proj.visible) {
        el.style.display = 'none';
        continue;
      }
      el.style.display = 'inline-flex';
      el.style.transform = `translate3d(${proj.x}px, ${proj.y}px, 0)`;
      el.dataset.screenX = String(proj.x);
      el.dataset.screenY = String(proj.y);
    }

    for (const [wireId, btn] of this.wireDeleteElements.entries()) {
      const midWorld = this.wireTool.getWireMidpointWorld(wireId);
      if (!midWorld) {
        btn.style.display = 'none';
        continue;
      }
      const proj = PinHudOverlay.projectWorldToScreen(midWorld, this.camera, width, height);
      if (!proj.visible) {
        btn.style.display = 'none';
        continue;
      }
      btn.style.display = 'inline-flex';
      btn.style.transform = `translate3d(${proj.x}px, ${proj.y}px, 0)`;
    }

    if (this.activeDragSourcePin) {
      this._applyCompatibilityHighlights();
      this._updateDragLine();
    }
  }
}
