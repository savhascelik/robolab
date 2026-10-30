import * as THREE from 'three';
import {
  DynamicComponentBuilder,
  PBR_MATERIAL_PRESETS,
  buildPartGeometry,
  resolvePartAttachmentPosition,
  expandPinGenerators
} from '../components/DynamicComponentBuilder.js';
import { STUDIO_TEMPLATES } from '../../ui/workbench/ComponentPalettePopover.js';

export const CUSTOM_COMPONENT_TEMPLATES = STUDIO_TEMPLATES;

/**
 * Tool catalog metadata exposed to the LLM / Studio Architect so it knows every
 * granular 3D CAD, Surface Attach, Pin Generator, and Self-Test capability.
 */
export const STUDIO_MODELING_TOOL_DEFINITIONS = Object.freeze([
  {
    name: 'getComponentSnapshot',
    category: 'inspection',
    signature: 'studio.getComponentSnapshot()',
    description: 'Returns full current component draft (parts[], pins[], evaluateScript, dimensions) and resolved 3D bounds.'
  },
  {
    name: 'getPartBounds',
    category: 'inspection',
    signature: 'studio.getPartBounds(partId)',
    description: 'Computes exact 3D bounding box { center, size, halfExtents, min, max, attach } for a part.'
  },
  {
    name: 'listMaterialPresets',
    category: 'inspection',
    signature: 'studio.listMaterialPresets()',
    description: 'Lists all electronic & robotics PBR material presets (fr4_pcb, ic_epoxy, gold_pin, brushed_aluminum, frosted_led, etc.).'
  },
  {
    name: 'setComponentMeta',
    category: 'cad',
    signature: 'studio.setComponentMeta({ typeId, name, category, isEnvironmentProp, dimensions, obstacleProfile })',
    description: 'Updates component identity, archetype (3D Electronic Component vs 0-Pin Prop), and base dimensions.'
  },
  {
    name: 'clearParts',
    category: 'cad',
    signature: 'studio.clearParts({ keepBase })',
    description: 'Clears existing 3D CAD parts[] before constructing a new component from scratch.'
  },
  {
    name: 'addPart',
    category: 'cad',
    signature: 'studio.addPart({ id, primitive, size, radius, innerRadius, attach, materialPreset, color, repeat, mirror, partRole })',
    description: 'Adds or replaces a 3D CAD primitive part in parts[] and computes its attached 3D position.'
  },
  {
    name: 'updatePart',
    category: 'cad',
    signature: 'studio.updatePart(partId, patch)',
    description: 'Patches dimensions, primitive shape, materialPreset, attach, or partRole of an existing 3D part.'
  },
  {
    name: 'removePart',
    category: 'cad',
    signature: 'studio.removePart(partId)',
    description: 'Removes a 3D part from parts[] and re-parents any dependent child attachments.'
  },
  {
    name: 'attachPart',
    category: 'cad',
    signature: 'studio.attachPart(partId, { to, side, gap, offset })',
    description: 'Snaps partId onto the top/bottom/left/right/front/back/center surface of target part "to".'
  },
  {
    name: 'setPartMaterial',
    category: 'cad',
    signature: 'studio.setPartMaterial(partId, presetOrConfig)',
    description: 'Assigns an electronic PBR preset or custom { preset, color, roughness, metalness, emissive } to partId.'
  },
  {
    name: 'setPartModifier',
    category: 'cad',
    signature: 'studio.setPartModifier(partId, { repeat, mirror, partRole, spinAxis })',
    description: 'Configures array repeat, symmetry mirror, or reactive partRole (emissive | rotor | pivot | plunger).'
  },
  {
    name: 'addPin',
    category: 'pins',
    signature: 'studio.addPin({ name, direction, edge, position, protocol, nominalVoltage })',
    description: 'Adds or updates a single 3D electrical pin (Handle) on the component.'
  },
  {
    name: 'updatePin',
    category: 'pins',
    signature: 'studio.updatePin(name, patch)',
    description: 'Updates an existing electrical pin direction, protocol, edge, or 3D position.'
  },
  {
    name: 'removePin',
    category: 'pins',
    signature: 'studio.removePin(name)',
    description: 'Removes an electrical pin by name.'
  },
  {
    name: 'addPinRow',
    category: 'pins',
    signature: 'studio.addPinRow({ prefix, count, pitch, edge, axis, direction, protocol, names, directions })',
    description: 'Generates a 2.54mm pitch header pin array along the specified PCB edge.'
  },
  {
    name: 'setInternalDipoles',
    category: 'pins',
    signature: 'studio.setInternalDipoles([{ pinA, pinB, resistance, forwardVoltage, unidirectional }])',
    description: 'Defines internal Kirchhoff conductive dipole paths (e.g. VCC-GND 1000 Ohm, IN-GND 1000 Ohm) for closed-loop circuit solver compatibility.'
  },
  {
    name: 'setEvaluateScript',
    category: 'behavior',
    signature: 'studio.setEvaluateScript(codeString)',
    description: 'Compiles and attaches a sandboxed ReactFlow evaluate({ pins, state, dt, stageEnv, report }) function body.'
  },
  {
    name: 'setTestControls',
    category: 'behavior',
    signature: 'studio.setTestControls([{ key, label, min, max, step, unit, defaultValue }])',
    description: 'Declares custom physical/environmental sliders (e.g. temperatureC, lightLux, gasPpm, distanceCm) for the studio Test Bench.'
  },
  {
    name: 'testComponentBehavior',
    category: 'verification',
    signature: 'studio.testComponentBehavior({ pinVoltages, distanceCm, dt })',
    description: 'Instantiates the 3D component, injects test pin voltages & obstacle distance, runs evaluate() + onTick(dt), and verifies output pin voltages & 3D partRole animations.'
  },
  {
    name: 'setCameraView',
    category: 'viewport',
    signature: 'studio.setCameraView("iso" | "top" | "front" | "side")',
    description: 'Switches the 3D studio viewport camera angle.'
  },
  {
    name: 'setXRayMode',
    category: 'viewport',
    signature: 'studio.setXRayMode(enabled)',
    description: 'Toggles 3D X-Ray Dipole & Bounding Box inspection mode.'
  },
  {
    name: 'selectPart',
    category: 'viewport',
    signature: 'studio.selectPart(partId)',
    description: 'Selects and highlights a specific 3D sub-part in the studio inspector and viewport.'
  }
]);

/**
 * Granular 3D CAD, Surface Attachment, Pin Header & Behavior Self-Testing SDK (`StudioModelingSDK`).
 *
 * Powers both:
 * 1. The LLM Studio Architect (`executeStudioCode` & `applyNaturalLanguageCommand`)
 * 2. The Interactive Full-Screen `/studio` Visual CAD & Pin Inspector (`CustomComponentStudioPage`)
 */
export class StudioModelingSDK {
  /**
   * @param {object} [options]
   * @param {object} [options.initialSpec]
   * @param {(snapshot: object, meta?: object) => void} [options.onChange]
   * @param {(cameraView: string) => void} [options.onCameraViewChange]
   * @param {(xrayEnabled: boolean) => void} [options.onXRayChange]
   * @param {(partId: string|null) => void} [options.onSelectPart]
   */
  constructor(options = {}) {
    this.onChange = typeof options.onChange === 'function' ? options.onChange : null;
    this.onCameraViewChange =
      typeof options.onCameraViewChange === 'function' ? options.onCameraViewChange : null;
    this.onXRayChange = typeof options.onXRayChange === 'function' ? options.onXRayChange : null;
    this.onSelectPart = typeof options.onSelectPart === 'function' ? options.onSelectPart : null;

    this.cameraView = 'iso';
    this.xrayMode = false;
    this.selectedPartId = null;
    this.toolHistory = [];
    this.lastTestResult = null;

    const seed =
      options.initialSpec || options.initialDraft || STUDIO_TEMPLATES.logic_inverter_gate;
    this.draft = this._cloneAndEnsureDraft(seed);
    this._syncDraftCompat();
    if (this.draft.parts.length > 0) {
      this.selectedPartId = this.draft.parts[0].id;
    }
  }

  get toolLog() {
    return this.toolHistory;
  }

  get xRayMode() {
    return this.xrayMode;
  }

  set xRayMode(val) {
    this.xrayMode = Boolean(val);
  }

  getDraft() {
    this._syncDraftCompat();
    return this.draft;
  }

  setDraft(rawSpec = {}) {
    this.draft = this._cloneAndEnsureDraft(rawSpec);
    this._syncDraftCompat();
    if (this.draft.parts.length > 0 && !this.draft.parts.some((p) => p.id === this.selectedPartId)) {
      this.selectedPartId = this.draft.parts[0].id;
    }
    this._emitChange('setDraft');
    return this.draft;
  }

  _syncDraftCompat() {
    if (!this.draft) return;
    if (this.draft.geometry && typeof this.draft.geometry === 'object') {
      if (Array.isArray(this.draft.geometry.parts) && this.draft.geometry.parts !== this.draft.parts) {
        this.draft.parts = this.draft.geometry.parts;
      }
    }
    const isProp = Boolean(
      this.draft.isEnvironmentProp || this.draft.isProp || this.draft.archetype === 'prop'
    );
    this.draft.isEnvironmentProp = isProp;
    this.draft.isProp = isProp;
    this.draft.archetype = isProp ? 'prop' : 'node';

    const w = Number(this.draft.dimensions?.width ?? this.draft.geometry?.width) || 14;
    const h = Number(this.draft.dimensions?.height ?? this.draft.geometry?.height) || 1.6;
    const d = Number(this.draft.dimensions?.depth ?? this.draft.geometry?.depth) || 12;
    this.draft.dimensions = { width: w, height: h, depth: d };
    this.draft.geometry = {
      width: w,
      height: h,
      depth: d,
      parts: this.draft.parts
    };
    this.draft.behavior = {
      evaluate: this.draft.evaluateScript || ''
    };

    if (Array.isArray(this.draft.pins)) {
      for (const pin of this.draft.pins) {
        const cleanName = String(pin.name || pin.id || 'IO1').trim().toUpperCase();
        pin.name = cleanName;
        pin.id = cleanName;
        if (!pin.type) {
          pin.type =
            cleanName === 'GND'
              ? 'ground'
              : cleanName === 'VCC' || cleanName === '5V' || cleanName === '3V3' || cleanName === 'VIN'
                ? 'power'
                : 'digital';
        }
      }
    }
  }

  _cloneAndEnsureDraft(rawSpec = {}) {
    const clone = JSON.parse(JSON.stringify(rawSpec || STUDIO_TEMPLATES.logic_inverter_gate));
    const isProp = Boolean(clone.isEnvironmentProp || clone.category === 'props');
    const dims = Array.isArray(clone.dimensions)
      ? {
          width: Number(clone.dimensions[0]) || 14,
          height: Number(clone.dimensions[1]) || 1.6,
          depth: Number(clone.dimensions[2]) || 12
        }
      : {
          width: Number(clone.dimensions?.width) || 14,
          height: Number(clone.dimensions?.height) || 1.6,
          depth: Number(clone.dimensions?.depth) || 12
        };

    const parts = Array.isArray(clone.parts)
      ? clone.parts.map((p, idx) => ({
          id: String(p.id || p.name || `part_${idx + 1}`).trim(),
          primitive: String(p.primitive || p.shape || 'rounded_box').trim().toLowerCase(),
          size: Array.isArray(p.size)
            ? p.size.map((n) => Number(n) || 1)
            : [
                Number(p.width ?? 6),
                Number(p.height ?? 1.6),
                Number(p.depth ?? 6)
              ],
          radius: p.radius !== undefined ? Number(p.radius) : undefined,
          innerRadius: p.innerRadius !== undefined ? Number(p.innerRadius) : undefined,
          position: Array.isArray(p.position)
            ? p.position.map((n) => Number(n) || 0)
            : undefined,
          rotation: Array.isArray(p.rotation)
            ? p.rotation.map((n) => Number(n) || 0)
            : undefined,
          attach: p.attach && typeof p.attach === 'object'
            ? {
                to: String(p.attach.to || '').trim(),
                side: String(p.attach.side || 'top').trim().toLowerCase(),
                gap: Number(p.attach.gap ?? 0),
                offset: Array.isArray(p.attach.offset)
                  ? [
                      Number(p.attach.offset[0]) || 0,
                      Number(p.attach.offset[1]) || 0,
                      Number(p.attach.offset[2]) || 0
                    ]
                  : [0, 0, 0]
              }
            : null,
          materialPreset: String(
            p.materialPreset ||
              (typeof p.material === 'string' ? p.material : p.material?.preset) ||
              'fr4_pcb'
          )
            .trim()
            .toLowerCase(),
          color: p.color ?? null,
          repeat: p.repeat && typeof p.repeat === 'object'
            ? {
                count: Math.max(1, Math.min(32, Number(p.repeat.count) || 1)),
                step: Array.isArray(p.repeat.step)
                  ? [
                      Number(p.repeat.step[0]) || 0,
                      Number(p.repeat.step[1]) || 0,
                      Number(p.repeat.step[2]) || 0
                    ]
                  : [3, 0, 0]
              }
            : null,
          mirror: p.mirror && typeof p.mirror === 'object' && p.mirror.axis
            ? { axis: String(p.mirror.axis).toLowerCase() }
            : null,
          partRole: p.partRole ? String(p.partRole).trim().toLowerCase() : null,
          spinAxis: p.spinAxis || 'y'
        }))
      : [];

    // Materialize pinGenerator into explicit editable pins if pins[] is empty
    let pins = Array.isArray(clone.pins) ? [...clone.pins] : [];
    if (!isProp && pins.length === 0 && (clone.pinGenerator || clone.pinGenerators)) {
      const genSpec = clone.pinGenerator || clone.pinGenerators;
      const expanded = expandPinGenerators(genSpec, [dims.width, dims.height, dims.depth]);
      const dirList = Array.isArray(genSpec?.directions) ? genSpec.directions : null;
      pins = expanded.map((ep, idx) => ({
        name: ep.name,
        direction: dirList?.[idx] || String(ep.direction || 'IO').toLowerCase(),
        edge: genSpec?.edge || 'bottom',
        position: ep.position,
        protocol: ep.protocol || 'GPIO',
        nominalVoltage: ep.voltage ?? 5.0
      }));
    }

    return {
      typeId: String(clone.typeId || 'custom.smart_module').trim(),
      name: String(clone.name || 'Custom 3D Module').trim(),
      category: isProp ? 'props' : String(clone.category || 'custom').trim(),
      isEnvironmentProp: isProp,
      summary: String(clone.summary || clone.description || '').trim(),
      description: String(clone.description || clone.summary || '').trim(),
      dimensions: dims,
      pcbColor: clone.pcbColor ?? 0x0f766e,
      parts,
      pins: isProp ? [] : pins,
      dipoles: isProp
        ? []
        : Array.isArray(clone.dipoles) && clone.dipoles.length > 0
          ? clone.dipoles
          : [{ positivePin: 'VCC', negativePin: 'GND', resistanceOhms: 470, loadType: 'sensor' }],
      obstacleProfile: isProp
        ? {
            blocksUltrasonic: clone.obstacleProfile?.blocksUltrasonic !== false,
            blocksInfrared: clone.obstacleProfile?.blocksInfrared !== false,
            boundingRadiusCm: Number(clone.obstacleProfile?.boundingRadiusCm ?? 5),
            reflectance: Number(clone.obstacleProfile?.reflectance ?? 0.92)
          }
        : clone.obstacleProfile || null,
      evaluateScript: isProp
        ? ''
        : String(
            clone.evaluateScript ||
              `const inHigh = Boolean(pins.IN?.high || (pins.IN?.voltage ?? 0) >= 2.5);
const outV = inHigh ? 0.0 : 5.0;
return {
  outputs: { OUT: { voltage: outV, logicLevel: outV >= 2.5 ? 1 : 0 } },
  state: { active: outV >= 2.5 }
};`
          )
    };
  }

  _recordToolCall(toolName, args, resultSummary = null) {
    const entry = {
      id: `tool_${Date.now()}_${this.toolHistory.length + 1}`,
      tool: toolName,
      args: args !== undefined ? JSON.parse(JSON.stringify(args)) : {},
      summary: resultSummary,
      timestamp: new Date().toISOString()
    };
    this.toolHistory.push(entry);
    if (this.toolHistory.length > 100) {
      this.toolHistory.shift();
    }
    return entry;
  }

  _emitChange(action = 'update', detail = {}) {
    this._syncDraftCompat();
    if (this.onChange) {
      this.onChange(this.draft, {
        action,
        selectedPartId: this.selectedPartId,
        snapshot: this.getComponentSnapshot({ recordTool: false }),
        ...detail
      });
    }
  }

  /**
   * Computes resolved 3D positions & bounding boxes for all `parts[]` in the current draft.
   * @returns {Map<string, { partId: string, center: [number, number, number], halfExtents: [number, number, number], size: [number, number, number], min: [number, number, number], max: [number, number, number], attach: object|null }>}
   */
  _computeAllPartBoundsMap() {
    const boundsById = new Map();
    const w = Number(this.draft.dimensions?.width) || 14;
    const h = Number(this.draft.dimensions?.height) || 1.6;
    const d = Number(this.draft.dimensions?.depth) || 12;

    const rootEntry = {
      partId: 'root',
      center: [0, Number((h * 0.5).toFixed(3)), 0],
      halfExtents: [w * 0.5, h * 0.5, d * 0.5],
      size: [w, h, d],
      min: [-w * 0.5, 0, -d * 0.5],
      max: [w * 0.5, h, d * 0.5],
      attach: null
    };
    boundsById.set('root', rootEntry);
    boundsById.set('pcb', rootEntry);
    boundsById.set('pcb_base', rootEntry);

    for (const part of this.draft.parts || []) {
      const { geometry, halfExtents } = buildPartGeometry(part);
      geometry.dispose?.();
      const center = resolvePartAttachmentPosition(part, halfExtents, boundsById);
      const [hx, hy, hz] = halfExtents;
      const entry = {
        partId: part.id,
        primitive: part.primitive || part.shape || 'box',
        center,
        halfExtents: [Number(hx.toFixed(3)), Number(hy.toFixed(3)), Number(hz.toFixed(3))],
        size: [
          Number((hx * 2).toFixed(3)),
          Number((hy * 2).toFixed(3)),
          Number((hz * 2).toFixed(3))
        ],
        min: [
          Number((center[0] - hx).toFixed(3)),
          Number((center[1] - hy).toFixed(3)),
          Number((center[2] - hz).toFixed(3))
        ],
        max: [
          Number((center[0] + hx).toFixed(3)),
          Number((center[1] + hy).toFixed(3)),
          Number((center[2] + hz).toFixed(3))
        ],
        attach: part.attach ? { ...part.attach } : null,
        materialPreset: part.materialPreset || 'fr4_pcb',
        partRole: part.partRole || null
      };
      boundsById.set(part.id, entry);
      boundsById.set(part.id.toLowerCase(), entry);
    }

    return boundsById;
  }

  /**
   * Resolves 3D local coordinates `[x, y, z]` for explicit pins based on their `edge` (`bottom`, `top`, `left`, `right`)
   * or explicit `position`.
   */
  _syncPinPositionsFromEdges() {
    if (this.draft.isEnvironmentProp || !Array.isArray(this.draft.pins)) return;
    const w = Number(this.draft.dimensions?.width) || 14;
    const d = Number(this.draft.dimensions?.depth) || 12;

    const byEdge = { bottom: [], top: [], left: [], right: [] };
    this.draft.pins.forEach((pin) => {
      const edge = ['bottom', 'top', 'left', 'right'].includes(pin.edge) ? pin.edge : 'bottom';
      pin.edge = edge;
      byEdge[edge].push(pin);
    });

    for (const [edge, edgePins] of Object.entries(byEdge)) {
      const count = edgePins.length;
      if (count === 0) continue;
      const span = (count - 1) * 2.54;
      edgePins.forEach((pin, idx) => {
        if (Array.isArray(pin.position) && pin.position.length === 3 && pin._customPos) {
          return;
        }
        const offset = Number((-span * 0.5 + idx * 2.54).toFixed(2));
        if (edge === 'bottom') {
          pin.position = [offset, -2.2, Number((d * 0.5 - 1.1).toFixed(2))];
        } else if (edge === 'top') {
          pin.position = [offset, -2.2, Number((-d * 0.5 + 1.1).toFixed(2))];
        } else if (edge === 'left') {
          pin.position = [Number((-w * 0.5 + 1.1).toFixed(2)), -2.2, offset];
        } else if (edge === 'right') {
          pin.position = [Number((w * 0.5 - 1.1).toFixed(2)), -2.2, offset];
        }
      });
    }
  }

  // =========================================================================
  // 1. Inspection & Bounds Tools
  // =========================================================================

  /**
   * Returns a complete snapshot of the active component draft and its computed 3D part bounds.
   */
  getComponentSnapshot({ recordTool = true } = {}) {
    this._syncPinPositionsFromEdges();
    const boundsMap = this._computeAllPartBoundsMap();
    const partBounds = {};
    for (const part of this.draft.parts) {
      const b = boundsMap.get(part.id);
      if (b) partBounds[part.id] = b;
    }

    const normalized = DynamicComponentBuilder.normalizeSpec(this.draft);
    const snapshot = {
      draft: JSON.parse(JSON.stringify(this.draft)),
      normalized,
      partBounds,
      selectedPartId: this.selectedPartId,
      cameraView: this.cameraView,
      xrayMode: this.xrayMode
    };

    if (recordTool) {
      this._recordToolCall(
        'getComponentSnapshot',
        {},
        `${this.draft.name} (${this.draft.parts.length} parts, ${this.draft.pins.length} pins)`
      );
    }
    return snapshot;
  }

  /**
   * Computes exact 3D bounding box `{ partId, exists, center, size, halfExtents, min, max, attach }` for `partId`.
   * @param {string} partId
   * @param {{ recordTool?: boolean }} [options]
   */
  getPartBounds(partId, { recordTool = true } = {}) {
    const cleanId = String(partId || '').trim();
    const boundsMap = this._computeAllPartBoundsMap();
    const entry = boundsMap.get(cleanId) || boundsMap.get(cleanId.toLowerCase()) || null;
    const result = entry
      ? { ok: true, exists: true, bounds: entry, ...entry }
      : {
          ok: false,
          exists: false,
          bounds: null,
          partId: cleanId,
          center: [0, 0, 0],
          size: [0, 0, 0],
          halfExtents: [0, 0, 0],
          min: [0, 0, 0],
          max: [0, 0, 0],
          attach: null
        };

    if (recordTool) {
      this._recordToolCall(
        'getPartBounds',
        { partId: cleanId },
        result.exists
          ? `${cleanId} center=[${result.center.join(', ')}] size=[${result.size.join('×')}]`
          : `${cleanId} not found`
      );
    }
    return result;
  }

  /**
   * Lists all electronic & robotics PBR material presets.
   */
  listMaterialPresets() {
    const list = Object.entries(PBR_MATERIAL_PRESETS).map(([id, meta]) => ({
      id,
      ...meta
    }));
    this._recordToolCall('listMaterialPresets', {}, `${list.length} PBR presets`);
    return list;
  }

  // =========================================================================
  // 2. 3D CAD Sculpting, Surface Attachment & Modifiers
  // =========================================================================

  /**
   * Loads one of the built-in studio templates (`logic_inverter_gate`, `threshold_sensor_node`, `rotor_fan_module`, `arena_barrier_prop`)
   * or a full custom specification.
   * @param {string|object} templateKeyOrSpec
   */
  loadTemplate(templateKeyOrSpec) {
    const raw =
      typeof templateKeyOrSpec === 'string'
        ? STUDIO_TEMPLATES[templateKeyOrSpec] || STUDIO_TEMPLATES.logic_inverter_gate
        : templateKeyOrSpec;
    this.draft = this._cloneAndEnsureDraft(raw);
    this._syncDraftCompat();
    this.selectedPartId = this.draft.parts[0]?.id || null;
    this._recordToolCall(
      'loadTemplate',
      { template: typeof templateKeyOrSpec === 'string' ? templateKeyOrSpec : this.draft.typeId },
      `Loaded ${this.draft.name}`
    );
    this._emitChange('loadTemplate');
    const snap = this.getComponentSnapshot({ recordTool: false });
    return { ok: true, ...snap };
  }

  /**
   * Updates component metadata, archetype (`isEnvironmentProp`), and overall PCB dimensions.
   * @param {object} meta
   */
  setComponentMeta(meta = {}) {
    if (!meta || typeof meta !== 'object') return this.getDraft();

    if (typeof meta.name === 'string' && meta.name.trim()) {
      this.draft.name = meta.name.trim();
    }
    if (typeof meta.typeId === 'string' && meta.typeId.trim()) {
      const rawId = meta.typeId.trim().toLowerCase().replace(/[^a-z0-9._-]+/g, '_');
      this.draft.typeId = rawId.includes('.') ? rawId : `custom.${rawId}`;
    }
    if (typeof meta.summary === 'string') {
      this.draft.summary = meta.summary.trim();
    }
    if (typeof meta.description === 'string') {
      this.draft.description = meta.description.trim();
    }
    const nextIsProp =
      typeof meta.isEnvironmentProp === 'boolean'
        ? meta.isEnvironmentProp
        : typeof meta.isProp === 'boolean'
          ? meta.isProp
          : typeof meta.archetype === 'string'
            ? meta.archetype.toLowerCase() === 'prop'
            : undefined;
    if (typeof nextIsProp === 'boolean') {
      this.draft.isEnvironmentProp = nextIsProp;
      if (nextIsProp) {
        this.draft.category = 'props';
        this.draft.pins = [];
        this.draft.dipoles = [];
        if (!this.draft.obstacleProfile) {
          this.draft.obstacleProfile = {
            blocksUltrasonic: true,
            reflectsUltrasonic: true,
            blocksInfrared: true,
            boundingRadiusCm: 5,
            reflectance: 0.92
          };
        }
      } else if (this.draft.category === 'props') {
        this.draft.category = 'custom';
      }
    }
    if (typeof meta.category === 'string' && meta.category.trim()) {
      this.draft.category = meta.category.trim().toLowerCase();
      if (this.draft.category === 'props') {
        this.draft.isEnvironmentProp = true;
      }
    }
    if (meta.dimensions) {
      if (Array.isArray(meta.dimensions) && meta.dimensions.length === 3) {
        this.draft.dimensions = {
          width: Math.max(0.4, Number(meta.dimensions[0]) || 14),
          height: Math.max(0.2, Number(meta.dimensions[1]) || 1.6),
          depth: Math.max(0.4, Number(meta.dimensions[2]) || 12)
        };
      } else if (typeof meta.dimensions === 'object') {
        this.draft.dimensions = {
          width: Math.max(0.4, Number(meta.dimensions.width ?? this.draft.dimensions.width) || 14),
          height: Math.max(0.2, Number(meta.dimensions.height ?? this.draft.dimensions.height) || 1.6),
          depth: Math.max(0.4, Number(meta.dimensions.depth ?? this.draft.dimensions.depth) || 12)
        };
      }
    }
    if (meta.width !== undefined || meta.height !== undefined || meta.depth !== undefined) {
      this.draft.dimensions = {
        width: Math.max(0.4, Number(meta.width ?? this.draft.dimensions.width) || 14),
        height: Math.max(0.2, Number(meta.height ?? this.draft.dimensions.height) || 1.6),
        depth: Math.max(0.4, Number(meta.depth ?? this.draft.dimensions.depth) || 12)
      };
    }
    if (meta.obstacleProfile && typeof meta.obstacleProfile === 'object') {
      this.draft.obstacleProfile = {
        ...(this.draft.obstacleProfile || {}),
        ...meta.obstacleProfile
      };
    }

    this._recordToolCall('setComponentMeta', meta, `${this.draft.name} (${this.draft.typeId})`);
    this._emitChange('setComponentMeta', { meta });
    return this.draft;
  }

  /**
   * Adds (or replaces) a 3D CAD part in `parts[]` and returns its resolved 3D bounding box.
   * @param {object} partSpec
   */
  addPart(partSpec = {}) {
    const nextIdx = (this.draft.parts?.length || 0) + 1;
    const id = String(partSpec.id || partSpec.name || `part_${nextIdx}`)
      .trim()
      .replace(/[^a-zA-Z0-9_-]+/g, '_');
    const primitive = String(
      partSpec.primitive || partSpec.shape || partSpec.kind || partSpec.type || 'rounded_box'
    )
      .trim()
      .toLowerCase();
    const size = Array.isArray(partSpec.size) && partSpec.size.length === 3
      ? partSpec.size.map((n) => Math.max(0.2, Number(n) || 1))
      : [
          Math.max(0.2, Number(partSpec.width ?? 4)),
          Math.max(0.2, Number(partSpec.height ?? 1.8)),
          Math.max(0.2, Number(partSpec.depth ?? 4))
        ];

    const basePartId = this.draft.parts?.[0]?.id || null;
    const attach =
      partSpec.attach && typeof partSpec.attach === 'object' && partSpec.attach.to
        ? {
            to: String(partSpec.attach.to).trim(),
            side: String(partSpec.attach.side || 'top').trim().toLowerCase(),
            gap: Number(partSpec.attach.gap ?? 0),
            offset: Array.isArray(partSpec.attach.offset)
              ? [
                  Number(partSpec.attach.offset[0]) || 0,
                  Number(partSpec.attach.offset[1]) || 0,
                  Number(partSpec.attach.offset[2]) || 0
                ]
              : [0, 0, 0]
          }
        : !partSpec.position && basePartId && basePartId !== id
          ? { to: basePartId, side: 'top', gap: 0, offset: [0, 0, 0] }
          : null;

    const resolvedRadius =
      partSpec.radius !== undefined
        ? Number(partSpec.radius)
        : partSpec.bevel !== undefined
          ? Number(partSpec.bevel)
          : primitive === 'rounded_box'
            ? 0.35
            : undefined;

    const normalizedPart = {
      id,
      primitive,
      size,
      radius: resolvedRadius,
      innerRadius: partSpec.innerRadius !== undefined ? Number(partSpec.innerRadius) : undefined,
      position: Array.isArray(partSpec.position)
        ? partSpec.position.map((n) => Number(n) || 0)
        : !attach
          ? [0, Number((size[1] * 0.5).toFixed(2)), 0]
          : undefined,
      rotation: Array.isArray(partSpec.rotation)
        ? partSpec.rotation.map((n) => Number(n) || 0)
        : undefined,
      attach,
      materialPreset: String(
        partSpec.materialPreset ||
          (typeof partSpec.material === 'string' ? partSpec.material : partSpec.material?.preset) ||
          'ic_epoxy'
      )
        .trim()
        .toLowerCase(),
      color: partSpec.color ?? null,
      repeat: partSpec.repeat && typeof partSpec.repeat === 'object'
        ? {
            count: Math.max(1, Math.min(32, Number(partSpec.repeat.count) || 1)),
            step: Array.isArray(partSpec.repeat.step)
              ? [
                  Number(partSpec.repeat.step[0]) || 0,
                  Number(partSpec.repeat.step[1]) || 0,
                  Number(partSpec.repeat.step[2]) || 0
                ]
              : [3, 0, 0]
          }
        : null,
      mirror: partSpec.mirror && typeof partSpec.mirror === 'object' && partSpec.mirror.axis
        ? { axis: String(partSpec.mirror.axis).toLowerCase() }
        : null,
      partRole: partSpec.partRole ? String(partSpec.partRole).trim().toLowerCase() : null,
      spinAxis: partSpec.spinAxis || 'y'
    };

    const existingIdx = this.draft.parts.findIndex((p) => p.id === id);
    if (existingIdx >= 0) {
      this.draft.parts[existingIdx] = normalizedPart;
    } else {
      this.draft.parts.push(normalizedPart);
    }

    // Update overall dimensions if first root PCB part
    if (this.draft.parts.length === 1 || id === 'pcb_base') {
      this.draft.dimensions = {
        width: size[0],
        height: size[1],
        depth: size[2]
      };
    }

    this.selectedPartId = id;
    const bounds = this._computeAllPartBoundsMap().get(id);
    this._recordToolCall(
      'addPart',
      partSpec,
      `${id} (${primitive} ${size.join('×')}mm, mat=${normalizedPart.materialPreset})`
    );
    this._emitChange('addPart', { part: normalizedPart, bounds });
    return { ok: true, part: normalizedPart, bounds };
  }

  /**
   * Updates an existing part in `parts[]` by `partId`.
   * @param {string} partId
   * @param {object} patch
   */
  updatePart(partId, patch = {}) {
    const cleanId = String(partId || '').trim();
    const part = this.draft.parts.find(
      (p) => p.id === cleanId || p.id.toLowerCase() === cleanId.toLowerCase()
    );
    if (!part) {
      return { ok: false, error: `Part "${cleanId}" not found.` };
    }

    if (typeof patch.primitive === 'string' || typeof patch.shape === 'string') {
      part.primitive = String(patch.primitive || patch.shape).trim().toLowerCase();
    }
    if (Array.isArray(patch.size) && patch.size.length === 3) {
      part.size = patch.size.map((n) => Math.max(0.2, Number(n) || 1));
      if (part === this.draft.parts[0] || part.id === 'pcb_base') {
        this.draft.dimensions = {
          width: part.size[0],
          height: part.size[1],
          depth: part.size[2]
        };
      }
    }
    if (patch.radius !== undefined) {
      part.radius = Number(patch.radius);
    }
    if (patch.innerRadius !== undefined) {
      part.innerRadius = Number(patch.innerRadius);
    }
    if (Array.isArray(patch.position) && patch.position.length === 3) {
      part.position = patch.position.map((n) => Number(n) || 0);
    }
    if (Array.isArray(patch.rotation) && patch.rotation.length === 3) {
      part.rotation = patch.rotation.map((n) => Number(n) || 0);
    }
    if (patch.attach !== undefined) {
      if (!patch.attach || patch.attach.side === 'none' || !patch.attach.to) {
        part.attach = null;
      } else {
        part.attach = {
          to: String(patch.attach.to).trim(),
          side: String(patch.attach.side || 'top').trim().toLowerCase(),
          gap: Number(patch.attach.gap ?? 0),
          offset: Array.isArray(patch.attach.offset)
            ? [
                Number(patch.attach.offset[0]) || 0,
                Number(patch.attach.offset[1]) || 0,
                Number(patch.attach.offset[2]) || 0
              ]
            : [0, 0, 0]
        };
      }
    }
    if (typeof patch.materialPreset === 'string' && patch.materialPreset.trim()) {
      part.materialPreset = patch.materialPreset.trim().toLowerCase();
    }
    if (patch.color !== undefined) {
      part.color = patch.color;
    }
    if (patch.partRole !== undefined) {
      part.partRole = patch.partRole ? String(patch.partRole).trim().toLowerCase() : null;
    }
    if (patch.repeat !== undefined) {
      part.repeat =
        patch.repeat && Number(patch.repeat.count) > 1
          ? {
              count: Math.max(1, Math.min(32, Number(patch.repeat.count))),
              step: Array.isArray(patch.repeat.step)
                ? patch.repeat.step.map((n) => Number(n) || 0)
                : [3, 0, 0]
            }
          : null;
    }
    if (patch.mirror !== undefined) {
      part.mirror =
        patch.mirror && patch.mirror.axis
          ? { axis: String(patch.mirror.axis).toLowerCase() }
          : null;
    }

    const bounds = this._computeAllPartBoundsMap().get(part.id);
    this._recordToolCall('updatePart', { partId: part.id, patch }, `Updated ${part.id}`);
    this._emitChange('updatePart', { part, bounds });
    return { ok: true, part, bounds };
  }

  /**
   * Removes a 3D part from `parts[]` and re-parents any dependent child attachments.
   * @param {string} partId
   */
  removePart(partId) {
    const cleanId = String(partId || '').trim();
    const idx = this.draft.parts.findIndex(
      (p) => p.id === cleanId || p.id.toLowerCase() === cleanId.toLowerCase()
    );
    if (idx < 0) return { ok: false, removed: false };

    const [removed] = this.draft.parts.splice(idx, 1);
    const fallbackParentId = this.draft.parts[0]?.id || null;
    for (const child of this.draft.parts) {
      if (child.attach?.to === removed.id) {
        if (fallbackParentId && fallbackParentId !== child.id) {
          child.attach.to = fallbackParentId;
        } else {
          child.attach = null;
        }
      }
    }

    if (this.selectedPartId === removed.id) {
      this.selectedPartId = this.draft.parts[0]?.id || null;
    }
    this._recordToolCall('removePart', { partId: removed.id }, `Removed ${removed.id}`);
    this._emitChange('removePart', { removedId: removed.id });
    return { ok: true, removed: true, removedId: removed.id };
  }

  /**
   * Clears parts from `parts[]` (optionally keeping `pcb_base` when `keepBase: true`).
   * @param {{ keepBase?: boolean }} [options]
   */
  clearParts({ keepBase = false } = {}) {
    if (keepBase && Array.isArray(this.draft.parts) && this.draft.parts.length > 0) {
      const base = this.draft.parts.find((p) => p.id === 'pcb_base') || this.draft.parts[0];
      this.draft.parts = base ? [base] : [];
    } else {
      this.draft.parts = [];
    }
    if (this.draft.geometry && typeof this.draft.geometry === 'object') {
      this.draft.geometry.parts = this.draft.parts;
    }
    this.selectedPartId = this.draft.parts[0]?.id || null;
    this._recordToolCall('clearParts', { keepBase }, 'Cleared parts[]');
    this._emitChange('clearParts');
    return { ok: true, count: this.draft.parts.length };
  }

  /**
   * Attaches `partId` onto a target surface (`top`, `bottom`, `left`, `right`, `front`, `back`, `center`) of `to`.
   * @param {string} partId
   * @param {{ to: string, side?: string, gap?: number, offset?: number[] }} attachSpec
   */
  attachPart(partId, attachSpec = {}) {
    let cleanId = '';
    let resolvedAttach = attachSpec;
    if (partId && typeof partId === 'object') {
      cleanId = String(partId.partId || partId.id || '').trim();
      resolvedAttach = partId;
    } else {
      cleanId = String(partId || '').trim();
    }
    const part = this.draft.parts.find(
      (p) => p.id === cleanId || p.id.toLowerCase() === cleanId.toLowerCase()
    );
    if (!part) {
      return { ok: false, error: `Part "${cleanId}" not found.` };
    }

    if (!resolvedAttach || !resolvedAttach.to || resolvedAttach.side === 'none') {
      part.attach = null;
    } else {
      part.attach = {
        to: String(resolvedAttach.to).trim(),
        side: String(resolvedAttach.side || 'top').trim().toLowerCase(),
        gap: Number(resolvedAttach.gap ?? 0),
        offset: Array.isArray(resolvedAttach.offset)
          ? [
              Number(resolvedAttach.offset[0]) || 0,
              Number(resolvedAttach.offset[1]) || 0,
              Number(resolvedAttach.offset[2]) || 0
            ]
          : [0, 0, 0]
      };
    }

    const bounds = this._computeAllPartBoundsMap().get(part.id);
    this._recordToolCall(
      'attachPart',
      { partId: part.id, attach: part.attach },
      part.attach
        ? `${part.id} -> ${part.attach.to}.${part.attach.side} @ [${bounds?.center?.join(', ')}]`
        : `${part.id} detached`
    );
    this._emitChange('attachPart', { part, bounds });
    return { ok: true, part, bounds };
  }

  /**
   * Assigns an electronic PBR material preset or custom material config to `partId`.
   * @param {string} partId
   * @param {string|{ preset?: string, color?: string|number }} presetOrConfig
   */
  setPartMaterial(partId, presetOrConfig) {
    const cleanId = String(partId || '').trim();
    const part = this.draft.parts.find(
      (p) => p.id === cleanId || p.id.toLowerCase() === cleanId.toLowerCase()
    );
    if (!part) return { ok: false, error: `Part "${cleanId}" not found.` };

    if (typeof presetOrConfig === 'string') {
      part.materialPreset = presetOrConfig.trim().toLowerCase();
    } else if (presetOrConfig && typeof presetOrConfig === 'object') {
      if (presetOrConfig.preset) {
        part.materialPreset = String(presetOrConfig.preset).trim().toLowerCase();
      }
      if (presetOrConfig.color !== undefined) {
        part.color = presetOrConfig.color;
      }
    }

    this._recordToolCall(
      'setPartMaterial',
      { partId: part.id, material: presetOrConfig },
      `${part.id} -> ${part.materialPreset}`
    );
    this._emitChange('setPartMaterial', { part });
    return { ok: true, part };
  }

  /**
   * Sets array `repeat`, symmetry `mirror`, and reactive `partRole` (`emissive` | `rotor` | `pivot` | `plunger`) on `partId`.
   * @param {string} partId
   * @param {{ repeat?: { count: number, step: number[] }|null, mirror?: { axis: string }|null, partRole?: string|null, spinAxis?: string }} modifiers
   */
  setPartModifier(partId, modifiers = {}) {
    const cleanId = String(partId || '').trim();
    const part = this.draft.parts.find(
      (p) => p.id === cleanId || p.id.toLowerCase() === cleanId.toLowerCase()
    );
    if (!part) return { ok: false, error: `Part "${cleanId}" not found.` };

    if (modifiers.repeat !== undefined) {
      part.repeat =
        modifiers.repeat && Number(modifiers.repeat.count) > 1
          ? {
              count: Math.max(1, Math.min(32, Number(modifiers.repeat.count))),
              step: Array.isArray(modifiers.repeat.step)
                ? [
                    Number(modifiers.repeat.step[0]) || 0,
                    Number(modifiers.repeat.step[1]) || 0,
                    Number(modifiers.repeat.step[2]) || 0
                  ]
                : [3, 0, 0]
            }
          : null;
    }
    if (modifiers.mirror !== undefined) {
      part.mirror =
        modifiers.mirror && modifiers.mirror.axis
          ? { axis: String(modifiers.mirror.axis).toLowerCase() }
          : null;
    }
    if (modifiers.partRole !== undefined) {
      part.partRole = modifiers.partRole ? String(modifiers.partRole).trim().toLowerCase() : null;
    }
    if (modifiers.spinAxis !== undefined) {
      part.spinAxis = String(modifiers.spinAxis || 'y').toLowerCase();
    }

    this._recordToolCall('setPartModifier', { partId: part.id, modifiers }, `${part.id} modifiers updated`);
    this._emitChange('setPartModifier', { part });
    return { ok: true, part };
  }

  // =========================================================================
  // 3. 3D Pin (Handle) & 2.54mm Header Generator Tools
  // =========================================================================

  /**
   * Adds or updates a single 3D electrical pin (`Handle`).
   * @param {object} pinSpec
   */
  addPin(pinSpec = {}) {
    this.draft.isEnvironmentProp = false;
    if (this.draft.category === 'props') this.draft.category = 'custom';
    if (!Array.isArray(this.draft.pins)) this.draft.pins = [];

    const name = String(pinSpec.name || pinSpec.id || `IO${this.draft.pins.length + 1}`)
      .trim()
      .toUpperCase();
    const rawEdge = String(pinSpec.edge || 'bottom').toLowerCase();
    const normalizedEdge =
      rawEdge === 'front'
        ? 'bottom'
        : rawEdge === 'back'
          ? 'top'
          : ['bottom', 'top', 'left', 'right'].includes(rawEdge)
            ? rawEdge
            : 'bottom';
    const pinObj = {
      name,
      id: name,
      type: String(
        pinSpec.type ||
          (name === 'GND'
            ? 'ground'
            : name === 'VCC' || name === '5V' || name === '3V3'
              ? 'power'
              : 'digital')
      ).toLowerCase(),
      direction: String(pinSpec.direction || 'bidirectional').toLowerCase(),
      edge: normalizedEdge,
      protocol: String(pinSpec.protocol || 'GPIO').toUpperCase(),
      nominalVoltage: Number(pinSpec.nominalVoltage ?? pinSpec.voltage ?? 5.0),
      position: Array.isArray(pinSpec.position) && pinSpec.position.length === 3
        ? pinSpec.position.map((n) => Number(n) || 0)
        : undefined,
      _customPos: Boolean(Array.isArray(pinSpec.position) && pinSpec.position.length === 3)
    };

    const existingIdx = this.draft.pins.findIndex((p) => p.name.toUpperCase() === name);
    if (existingIdx >= 0) {
      this.draft.pins[existingIdx] = pinObj;
    } else {
      this.draft.pins.push(pinObj);
    }

    this._syncPinPositionsFromEdges();
    this._recordToolCall('addPin', pinSpec, `${name} (${pinObj.direction}, ${pinObj.edge})`);
    this._emitChange('addPin', { pin: pinObj });
    return { ok: true, pin: pinObj };
  }

  /**
   * Updates an existing electrical pin by `name`.
   * @param {string} name
   * @param {object} patch
   */
  updatePin(name, patch = {}) {
    const cleanName = String(name || '').trim().toUpperCase();
    const pin = (this.draft.pins || []).find((p) => p.name.toUpperCase() === cleanName);
    if (!pin) return { ok: false, error: `Pin "${cleanName}" not found.` };

    if (typeof patch.name === 'string' && patch.name.trim()) {
      pin.name = patch.name.trim().toUpperCase();
    }
    if (typeof patch.direction === 'string' && patch.direction.trim()) {
      pin.direction = patch.direction.trim().toLowerCase();
    }
    if (typeof patch.edge === 'string' && ['bottom', 'top', 'left', 'right'].includes(patch.edge)) {
      pin.edge = patch.edge;
      pin._customPos = false;
    }
    if (typeof patch.protocol === 'string' && patch.protocol.trim()) {
      pin.protocol = patch.protocol.trim().toUpperCase();
    }
    if (Array.isArray(patch.position) && patch.position.length === 3) {
      pin.position = patch.position.map((n) => Number(n) || 0);
      pin._customPos = true;
    }

    this._syncPinPositionsFromEdges();
    this._recordToolCall('updatePin', { name: cleanName, patch }, `Updated pin ${pin.name}`);
    this._emitChange('updatePin', { pin });
    return { ok: true, pin };
  }

  /**
   * Removes an electrical pin by `name`.
   * @param {string} name
   */
  removePin(name) {
    const cleanName = String(name || '').trim().toUpperCase();
    const idx = (this.draft.pins || []).findIndex((p) => p.name.toUpperCase() === cleanName);
    if (idx < 0) return { ok: false, removed: false };
    this.draft.pins.splice(idx, 1);
    this._syncPinPositionsFromEdges();
    this._recordToolCall('removePin', { name: cleanName }, `Removed pin ${cleanName}`);
    this._emitChange('removePin', { name: cleanName });
    return { ok: true, removed: true };
  }

  /**
   * Generates a `2.54mm` pitch header pin row (`1xN`) along a board edge (`bottom`, `top`, `left`, `right`).
   * @param {object} rowSpec
   */
  addPinRow(rowSpec = {}) {
    this.draft.isEnvironmentProp = false;
    if (this.draft.category === 'props') this.draft.category = 'custom';

    const count = Math.max(1, Math.min(32, Number(rowSpec.count ?? 4)));
    const pitch = Number(rowSpec.pitch ?? rowSpec.pitchMm ?? 2.54);
    const rawEdge = String(rowSpec.edge || 'bottom').toLowerCase();
    const edge =
      rawEdge === 'front'
        ? 'bottom'
        : rawEdge === 'back'
          ? 'top'
          : ['bottom', 'top', 'left', 'right'].includes(rawEdge)
            ? rawEdge
            : 'bottom';
    const prefix = String(rowSpec.prefix || 'P').trim().toUpperCase();
    const names = Array.isArray(rowSpec.names || rowSpec.labels) ? rowSpec.names || rowSpec.labels : null;
    const types = Array.isArray(rowSpec.types) ? rowSpec.types : null;
    const directions = Array.isArray(rowSpec.directions) ? rowSpec.directions : null;
    const replaceExisting = rowSpec.replace !== false;

    const w = Number(this.draft.dimensions?.width) || 14;
    const d = Number(this.draft.dimensions?.depth) || 12;
    const span = (count - 1) * pitch;

    const generated = [];
    for (let i = 0; i < count; i++) {
      const pinName = names?.[i]
        ? String(names[i]).trim().toUpperCase()
        : `${prefix}${i + 1}`;
      const defaultDir =
        pinName === 'GND'
          ? 'ground'
          : pinName === 'VCC' || pinName === '5V' || pinName === '3V3' || pinName === 'VIN'
            ? 'power'
            : pinName.startsWith('OUT') || pinName === 'DO' || pinName === 'TX' || pinName === 'ECHO'
              ? 'output'
              : pinName.startsWith('IN') || pinName === 'TRIG' || pinName === 'RX'
                ? 'input'
                : 'bidirectional';
      const dir = String(directions?.[i] || rowSpec.direction || defaultDir).toLowerCase();
      const pinType = String(
        types?.[i] ||
          (pinName === 'GND'
            ? 'ground'
            : pinName === 'VCC' || pinName === '5V' || pinName === '3V3' || pinName === 'VIN'
              ? 'power'
              : 'digital')
      ).toLowerCase();
      const offset = Number((-span * 0.5 + i * pitch).toFixed(2));
      let pos = [offset, -2.2, Number((d * 0.5 - 1.1).toFixed(2))];
      if (edge === 'top') pos = [offset, -2.2, Number((-d * 0.5 + 1.1).toFixed(2))];
      else if (edge === 'left') pos = [Number((-w * 0.5 + 1.1).toFixed(2)), -2.2, offset];
      else if (edge === 'right') pos = [Number((w * 0.5 - 1.1).toFixed(2)), -2.2, offset];

      generated.push({
        name: pinName,
        id: pinName,
        type: pinType,
        direction: dir,
        edge,
        protocol: String(rowSpec.protocol || 'GPIO').toUpperCase(),
        nominalVoltage: 5.0,
        position: pos,
        _customPos: true
      });
    }

    if (replaceExisting) {
      this.draft.pins = generated;
    } else {
      this.draft.pins = [...(this.draft.pins || []), ...generated];
    }

    this._recordToolCall(
      'addPinRow',
      rowSpec,
      `Generated 1x${count} (${pitch}mm) header: ${generated.map((p) => p.name).join(', ')}`
    );
    this._emitChange('addPinRow', { pins: generated });
    return { ok: true, pins: generated };
  }

  /**
   * Defines internal Kirchhoff conductive dipoles (`[{ pinA, pinB, resistance, forwardVoltage, unidirectional }]`)
   * so the component forms closed electrical loops on the Workbench.
   * @param {Array<object>} dipolesList
   */
  setInternalDipoles(dipolesList = []) {
    const cleanDipoles = Array.isArray(dipolesList)
      ? dipolesList
          .filter((d) => d && typeof d === 'object')
          .map((d) => ({
            pinA: String(d.pinA || d.positivePin || 'VCC').trim().toUpperCase(),
            pinB: String(d.pinB || d.negativePin || 'GND').trim().toUpperCase(),
            resistance: Math.max(1, Number(d.resistance ?? d.resistanceOhms ?? 1000)),
            forwardVoltage: Math.max(0, Number(d.forwardVoltage ?? 0)),
            unidirectional: Boolean(d.unidirectional),
            maxCurrent: Math.max(0.005, Number(d.maxCurrent ?? 0.05))
          }))
      : [];
    this.draft.dipoles = cleanDipoles;
    this._recordToolCall(
      'setInternalDipoles',
      { count: cleanDipoles.length },
      `Configured ${cleanDipoles.length} internal Kirchhoff dipole(s)`
    );
    this._emitChange('setInternalDipoles', { dipoles: cleanDipoles });
    return { ok: true, dipoles: cleanDipoles };
  }

  /**
   * Declares custom test controls (`[{ key, label, min, max, step, unit, defaultValue }]`) for the Studio Test Bench.
   * @param {Array<object>} controlsList
   */
  setTestControls(controlsList = []) {
    const cleanControls = Array.isArray(controlsList)
      ? controlsList
          .filter((c) => c && typeof c === 'object' && c.key)
          .map((c) => ({
            key: String(c.key).trim(),
            label: String(c.label || c.key).trim(),
            min: Number(c.min ?? 0),
            max: Number(c.max ?? 100),
            step: Number(c.step ?? 1),
            unit: String(c.unit || ''),
            defaultValue: Number(c.defaultValue ?? c.value ?? 25)
          }))
      : [];
    this.draft.testControls = cleanControls;
    this._recordToolCall(
      'setTestControls',
      { count: cleanControls.length },
      `Configured ${cleanControls.length} context-aware Test Bench control(s)`
    );
    this._emitChange('setTestControls', { testControls: cleanControls });
    return { ok: true, testControls: cleanControls };
  }

  // =========================================================================
  // 4. ReactFlow Node Behavior (`evaluateScript`) & Self-Verification
  // =========================================================================

  /**
   * Validates and sets the component's sandboxed `evaluate({ pins, state, dt, stageEnv, report })` script.
   * @param {string} codeString
   */
  setEvaluateScript(codeString = '') {
    const cleanCode = String(codeString || '').trim();
    if (cleanCode) {
      // Compile-check immediately so syntax or forbidden token errors surface right away
      DynamicComponentBuilder.compileEvaluateScript(cleanCode);
    }
    this.draft.evaluateScript = cleanCode;
    this._recordToolCall(
      'setEvaluateScript',
      { length: cleanCode.length },
      `Validated evaluateScript (${cleanCode.split('\n').length} lines)`
    );
    this._emitChange('setEvaluateScript', { evaluateScript: cleanCode });
    return { ok: true, evaluateScript: cleanCode };
  }

  /**
   * Instantiates a live 3D `HardwareComponent` from the current draft, drives virtual input pin voltages
   * and virtual ultrasonic/IR obstacle distance (`distanceCm`), executes `runNodeEvaluation()` + `onTick(dt)`,
   * and measures both electrical output pins and 3D `partRole` animations (`emissive`, `rotor`, `pivot`, `plunger`).
   *
   * @param {object} [params]
   * @param {Record<string, number>} [params.pinVoltages]
   * @param {number} [params.distanceCm=100]
   * @param {number} [params.dt=0.05]
   * @param {boolean} [params.closedLoop=true]
   * @param {number} [params.currentMa=12]
   */
  testComponentBehavior({
    pinVoltages = {},
    distanceCm = 100,
    envParams = {},
    dt = 0.05,
    closedLoop = true,
    currentMa = 12,
    recordTool = true
  } = {}) {
    const normalized = DynamicComponentBuilder.normalizeSpec(this.draft);
    const { ComponentClass } = DynamicComponentBuilder.createClassFromSpec(normalized);
    const testInstance = new ComponentClass({ id: '__studio_selftest__' });

    try {
      // 1. Apply virtual pin voltages
      for (const [rawPin, rawV] of Object.entries(pinVoltages || {})) {
        const pinName = testInstance.resolvePinName(rawPin);
        const ePin = testInstance.electricalPins.get(pinName);
        if (ePin) {
          const v = Number(rawV) || 0;
          ePin.driveVoltage(v, {
            digital: v >= 2.0 ? 1 : 0,
            logicLevel: v >= 2.0 ? 1 : 0,
            pwmDuty: v >= 2.0 ? 1.0 : 0.0
          });
        }
      }

      // 2. Determine if power loop is active
      const vccPin =
        testInstance.electricalPins.get('VCC') ||
        testInstance.electricalPins.get('5V') ||
        testInstance.electricalPins.get('3V3') ||
        testInstance.electricalPins.get('VIN');
      const hasVccPower = vccPin ? Number(vccPin.voltage || 0) >= 2.5 : closedLoop;
      const report = {
        closedLoop: Boolean(closedLoop && hasVccPower),
        current: hasVccPower ? currentMa / 1000 : 0,
        currentMa: hasVccPower ? currentMa : 0,
        voltageDrop: hasVccPower ? Number(vccPin?.voltage || 5.0) : 0
      };

      testInstance.onElectricalFlow?.(report);

      // 3. Build stageEnv with virtual obstacle distance & custom environmental parameters
      const effDistCm = Number(envParams?.nearestObstacleCm ?? envParams?.distanceCm ?? distanceCm);
      const stageEnv = {
        ...envParams,
        nearestObstacleCm: effDistCm,
        distanceCm: effDistCm,
        ultrasonicDistanceCm: effDistCm,
        irReflectance: effDistCm <= 35 ? 0.92 : 0.05,
        temperatureC: Number(envParams?.temperatureC ?? 25),
        humidityPct: Number(envParams?.humidityPct ?? 45),
        lightLux: Number(envParams?.lightLux ?? 500),
        gasPpm: Number(envParams?.gasPpm ?? 120),
        potRatio: Number(envParams?.potRatio ?? 0.5),
        getNearestObstacleDistanceCm: () => effDistCm,
        raycastObstacleDistanceCm: () => effDistCm
      };
      if (envParams && typeof envParams === 'object') {
        testInstance.setState(envParams);
      }

      // 4. Record initial 3D role mesh transforms before tick
      const roleParts = testInstance._roleParts || {
        emissive: [],
        rotor: [],
        pivot: [],
        plunger: []
      };
      const rotorStartAngles = roleParts.rotor.map((r) => ({
        x: r.mesh?.rotation?.x || 0,
        y: r.mesh?.rotation?.y || 0,
        z: r.mesh?.rotation?.z || 0
      }));
      const plungerStartY = roleParts.plunger.map((p) => p.mesh?.position?.y || 0);

      // 5. Run ReactFlow evaluate() + 3D tick(dt)
      const evalOut = testInstance.runNodeEvaluation({
        report,
        stageEnv,
        dt: Number(dt) || 0.05
      });
      testInstance.onTick?.(Number(dt) || 0.05);

      // 6. Collect output pin voltages & full pin table
      const pinSnapshot = {};
      const outputSnapshot = {};
      const outputVoltages = {};
      for (const [pinName, ePin] of testInstance.electricalPins.entries()) {
        const snap = {
          name: pinName,
          direction: ePin.direction,
          voltage: Number(Number(ePin.voltage || 0).toFixed(2)),
          high: Number(ePin.voltage || 0) >= 2.0,
          logicLevel: Number(ePin.voltage || 0) >= 2.0 ? 1 : 0,
          protocol: ePin.protocol || 'GPIO'
        };
        pinSnapshot[pinName] = snap;
        if (
          ePin.direction === 'OUT' ||
          evalOut?.outputs?.[pinName] !== undefined ||
          evalOut?.[pinName] !== undefined
        ) {
          outputSnapshot[pinName] = snap;
          outputVoltages[pinName] = snap.voltage;
        }
      }

      // 7. Measure 3D partRole physical/visual responses
      let maxEmissiveIntensity = 0;
      for (const entry of roleParts.emissive) {
        const intensity = Number(entry.material?.emissiveIntensity || 0);
        if (intensity > maxEmissiveIntensity) maxEmissiveIntensity = intensity;
      }

      let maxRotorDeltaRad = 0;
      roleParts.rotor.forEach((entry, idx) => {
        const start = rotorStartAngles[idx] || { x: 0, y: 0, z: 0 };
        const dx = Math.abs((entry.mesh?.rotation?.x || 0) - start.x);
        const dy = Math.abs((entry.mesh?.rotation?.y || 0) - start.y);
        const dz = Math.abs((entry.mesh?.rotation?.z || 0) - start.z);
        maxRotorDeltaRad = Math.max(maxRotorDeltaRad, dx, dy, dz);
      });

      const pivotRotationY =
        roleParts.pivot.length > 0 ? Number((roleParts.pivot[0].mesh?.rotation?.y || 0).toFixed(4)) : 0;
      const plungerDeltaY =
        roleParts.plunger.length > 0
          ? Number(((roleParts.plunger[0].mesh?.position?.y || 0) - plungerStartY[0]).toFixed(3))
          : 0;

      const roleAnimations = {
        emissiveCount: roleParts.emissive.length,
        emissiveLit: maxEmissiveIntensity > 0.1,
        maxEmissiveIntensity: Number(maxEmissiveIntensity.toFixed(2)),
        rotorCount: roleParts.rotor.length,
        rotorSpinning: maxRotorDeltaRad > 0.001,
        rotorDeltaRad: Number(maxRotorDeltaRad.toFixed(4)),
        pivotCount: roleParts.pivot.length,
        pivotRotationY,
        plungerCount: roleParts.plunger.length,
        plungerDeltaY
      };

      const result = {
        ok: !evalOut?.error,
        error: evalOut?.error || null,
        state: { ...testInstance.state },
        outputs: outputSnapshot,
        outputVoltages,
        pins: pinSnapshot,
        distanceCm: Number(distanceCm),
        roleAnimations,
        partAnimations: roleAnimations
      };

      this.lastTestResult = result;
      if (recordTool) {
        this._recordToolCall(
          'testComponentBehavior',
          { pinVoltages, distanceCm, dt },
          `active=${Boolean(result.state.active)} outputs=${JSON.stringify(
            Object.fromEntries(Object.entries(outputSnapshot).map(([k, v]) => [k, `${v.voltage}V`]))
          )}`
        );
      }
      return result;
    } finally {
      testInstance.dispose?.();
    }
  }

  // =========================================================================
  // 5. Viewport & Camera Controls + Code Mode / Natural Language Execution
  // =========================================================================

  setCameraView(view = 'iso') {
    const clean = ['iso', 'top', 'front', 'side'].includes(String(view).toLowerCase())
      ? String(view).toLowerCase()
      : 'iso';
    this.cameraView = clean;
    this._recordToolCall('setCameraView', { view: clean }, `Camera -> ${clean.toUpperCase()}`);
    this.onCameraViewChange?.(clean);
    return { ok: true, cameraView: clean };
  }

  setXRayMode(enabled) {
    this.xrayMode = Boolean(enabled);
    this._recordToolCall('setXRayMode', { enabled: this.xrayMode }, `X-Ray -> ${this.xrayMode}`);
    this.onXRayChange?.(this.xrayMode);
    return { ok: true, xrayMode: this.xrayMode };
  }

  selectPart(partId) {
    const cleanId = partId ? String(partId).trim() : null;
    this.selectedPartId = cleanId;
    this._recordToolCall('selectPart', { partId: cleanId }, `Selected ${cleanId || 'none'}`);
    this.onSelectPart?.(cleanId);
    return { ok: true, selectedPartId: cleanId };
  }

  /**
   * Executes a multi-step Code Mode script against `studio` (`StudioModelingSDK`).
   * Rejects dangerous browser globals (`window`, `document`, `fetch`, `eval`).
   * @param {string} scriptCode
   */
  executeStudioCode(scriptCode = '') {
    const source = String(scriptCode || '').trim();
    if (!source) return { ok: false, error: 'Empty studio script.' };

    const forbidden = [/\bwindow\b/, /\bdocument\b/, /\bfetch\b/, /\bXMLHttpRequest\b/, /\blocalStorage\b/];
    for (const pattern of forbidden) {
      if (pattern.test(source)) {
        throw new Error(`Security Guard: forbidden token (${pattern}) in Studio Code Mode.`);
      }
    }

    const startHistoryLen = this.toolHistory.length;
    const runner = new Function('studio', 'Math', `"use strict";\n${source}`);
    const returnVal = runner(this, Math);
    const executedTools = this.toolHistory.slice(startHistoryLen);

    this._emitChange('executeStudioCode', { executedTools });
    return {
      ok: true,
      returnValue: returnVal ?? null,
      executedTools,
      snapshot: this.getComponentSnapshot({ recordTool: false })
    };
  }

  /**
   * Executes an array of structured Studio tool calls (`[{ name, args }]`) returned by
   * `POST /api/v1/ai/studio-modeling`.
   * @param {Array<{ name: string, args?: any }>} toolCalls
   */
  executeToolCalls(toolCalls = []) {
    if (!Array.isArray(toolCalls) || toolCalls.length === 0) {
      return { ok: false, executedTools: [] };
    }

    const startHistoryLen = this.toolHistory.length;
    for (const call of toolCalls) {
      if (!call || typeof call !== 'object') continue;
      const rawName = String(call.name || '').trim();
      const methodName = rawName.startsWith('studio.') ? rawName.slice(7) : rawName;
      const args = call.args ?? call.arguments ?? {};

      if (methodName === 'executeStudioCode' && typeof args?.code === 'string') {
        this.executeStudioCode(args.code);
        continue;
      }

      if (typeof this[methodName] === 'function') {
        if (methodName === 'updatePart' && args?.partId) {
          this.updatePart(args.partId, args.patch || args);
        } else if (methodName === 'attachPart' && args?.partId) {
          this.attachPart(args.partId, args.attach || args);
        } else if (methodName === 'setPartMaterial' && args?.partId) {
          this.setPartMaterial(args.partId, args.material || args.preset || args);
        } else if (methodName === 'setPartModifier' && args?.partId) {
          this.setPartModifier(args.partId, args.modifier || args);
        } else if (methodName === 'setEvaluateScript') {
          this.setEvaluateScript(typeof args === 'string' ? args : args?.code || args?.script || '');
        } else {
          this[methodName](args);
        }
      }
    }

    const executedTools = this.toolHistory.slice(startHistoryLen);
    return {
      ok: executedTools.length > 0,
      executedTools,
      snapshot: this.getComponentSnapshot({ recordTool: false })
    };
  }

  /**
   * Interprets a natural-language modeling & behavior instruction (or `studio.*` Code Mode snippet),
   * executes granular SDK calls to build/modify/texture/wire the 3D component, and runs
   * `testComponentBehavior()` to self-verify the result.
   *
   * @param {string} promptText
   */
  async applyNaturalLanguageCommand(promptText = '') {
    const raw = String(promptText || '').trim();
    if (!raw) return { ok: false, error: 'Empty command.' };

    // Direct Code Mode script if user/LLM passed `studio.` calls
    if (/\bstudio\s*\./.test(raw)) {
      const codeResult = this.executeStudioCode(raw);
      const selfTest = this.testComponentBehavior({
        pinVoltages: { VCC: 5.0, IN: 0.0, TRIG: 5.0 },
        distanceCm: 18
      });
      return {
        ok: true,
        mode: 'code_mode',
        summary: `Executed ${codeResult.executedTools.length} Studio SDK tool calls and verified component behavior.`,
        executedTools: codeResult.executedTools,
        selfTest,
        snapshot: codeResult.snapshot
      };
    }

    const lower = raw.toLowerCase();
    const startHistoryLen = this.toolHistory.length;
    const actionsSummary = [];

    // 1A. Police Siren / Acoustic Horn ("polis", "siren", "alarm", "korna", "piezo", "hoparlör")
    if (
      lower.includes('polis') ||
      lower.includes('siren') ||
      lower.includes('alarm') ||
      lower.includes('korna') ||
      lower.includes('piezo') ||
      lower.includes('hoparlör') ||
      lower.includes('hoparlor')
    ) {
      this.setComponentMeta({
        typeId: 'custom.police_siren_module',
        name: 'Polis Siren & Akustik Uyarı Modülü (Dual-Tone Wail/Yelp Siren)',
        category: 'actuators',
        isEnvironmentProp: false,
        summary:
          'IN pinine gelen tetik sinyali (>= 2.0V) ile çalışan akustik piezo korna konisi, döner rezonatör halkası ve mavi/kırmızı polis flaşör LED kubbeli 3B siren modülü.',
        dimensions: [20, 2.0, 13]
      });
      this.clearParts();
      this.addPart({
        id: 'pcb_base',
        primitive: 'rounded_box',
        size: [20, 2.0, 13],
        radius: 0.6,
        materialPreset: 'fr4_pcb_blue'
      });
      this.addPart({
        id: 'siren_amp_housing',
        primitive: 'rounded_box',
        size: [15.6, 1.8, 8.8],
        radius: 0.4,
        attach: { to: 'pcb_base', side: 'top', gap: 0, offset: [0, 0, -0.6] },
        materialPreset: 'ic_epoxy'
      });
      this.addPart({
        id: 'acoustic_horn_cone',
        primitive: 'cone',
        size: [6.4, 4.6, 6.4],
        attach: { to: 'siren_amp_housing', side: 'top', gap: 0, offset: [0, 0, 0] },
        materialPreset: 'brushed_aluminum'
      });
      this.addPart({
        id: 'siren_resonator_rotor',
        primitive: 'torus',
        size: [5.0, 1.0, 5.0],
        attach: { to: 'acoustic_horn_cone', side: 'top', gap: 0, offset: [0, -1.2, 0] },
        materialPreset: 'copper',
        partRole: 'rotor',
        spinAxis: 'y'
      });
      this.addPart({
        id: 'police_blue_flasher',
        primitive: 'capsule',
        size: [3.4, 3.8, 3.4],
        attach: { to: 'siren_amp_housing', side: 'top', gap: 0, offset: [-5.4, 0, 0] },
        materialPreset: 'frosted_led',
        color: '#3B82F6',
        partRole: 'emissive'
      });
      this.addPart({
        id: 'police_red_flasher',
        primitive: 'capsule',
        size: [3.4, 3.8, 3.4],
        attach: { to: 'siren_amp_housing', side: 'top', gap: 0, offset: [5.4, 0, 0] },
        materialPreset: 'frosted_led',
        color: '#EF4444',
        partRole: 'emissive'
      });
      this.addPart({
        id: 'audio_driver_ic',
        primitive: 'rounded_box',
        size: [5.0, 1.2, 2.8],
        radius: 0.2,
        attach: { to: 'pcb_base', side: 'top', gap: 0, offset: [0, 0, 4.4] },
        materialPreset: 'ic_epoxy'
      });
      this.addPinRow({
        prefix: 'P',
        count: 4,
        pitch: 2.54,
        edge: 'bottom',
        names: ['VCC', 'GND', 'IN', 'OUT'],
        directions: ['power', 'ground', 'input', 'output']
      });
      this.setEvaluateScript(`const vcc = Number(pins.VCC?.voltage ?? 5.0);
const inV = Math.max(Number(pins.IN?.voltage ?? 0), Number(pins.TRIG?.voltage ?? 0));
const isTriggered = vcc >= 2.5 && inV >= 2.0;
state.sweep = ((Number(state.sweep) || 0) + (Number(dt) || 0.05) * 6.0) % (Math.PI * 2);
state.active = isTriggered;
state.rpm = isTriggered ? 1200 : 0;
const sirenFreqHz = isTriggered ? Math.round(950 + Math.sin(state.sweep) * 420) : 0;
const outV = isTriggered ? 5.0 : 0.0;
return {
  outputs: {
    OUT: { voltage: outV, logicLevel: isTriggered ? 1 : 0 }
  },
  state: {
    active: isTriggered,
    rpm: state.rpm,
    sirenFreqHz
  }
};`);
      actionsSummary.push(
        'Polis Siren & Akustik Uyarı Modülü (custom.police_siren_module): alüminyum korna konisi, bakır rezonatör halkası, mavi/kırmızı flaşör kubbeler ve Wail/Yelp frekans taramalı sinyal devresi oluşturuldu'
      );
    } else if (
      // 1B. Fire-truck / Emergency Beacon / Strobe Lightbar ("itfaiye ışığı", "çakar", "tepe lambası")
      lower.includes('itfaiye') ||
      lower.includes('çakar') ||
      lower.includes('cakar') ||
      lower.includes('beacon') ||
      lower.includes('strobe') ||
      lower.includes('ambulans') ||
      lower.includes('tepe lamba') ||
      lower.includes('lightbar') ||
      ((lower.includes('ışık') || lower.includes('isik') || lower.includes('lamba')) &&
        (lower.includes('sinyal') || lower.includes('yapar') || lower.includes('tasarla') || lower.includes('oluştur') || lower.includes('üret')))
    ) {
      this.setComponentMeta({
        typeId: 'custom.fire_truck_beacon',
        name: 'İtfaiye Çakar Tepe Lambası (Dual Strobe Lightbar)',
        category: 'actuators',
        isEnvironmentProp: false,
        summary:
          'IN pinine gelen dijital/PWM sinyali (>= 2.0V) ile aktifleşen kırmızı/mavi çift kubbeli ve döner reflektörlü 3B itfaiye çakar modülü.',
        dimensions: [20, 2.0, 12]
      });
      this.clearParts();
      this.addPart({
        id: 'pcb_base',
        primitive: 'rounded_box',
        size: [20, 2.0, 12],
        radius: 0.6,
        materialPreset: 'fr4_pcb_red'
      });
      this.addPart({
        id: 'lightbar_chassis',
        primitive: 'rounded_box',
        size: [16.4, 1.4, 7.6],
        radius: 0.4,
        attach: { to: 'pcb_base', side: 'top', gap: 0, offset: [0, 0, -0.6] },
        materialPreset: 'brushed_aluminum'
      });
      this.addPart({
        id: 'red_strobe_dome',
        primitive: 'capsule',
        size: [4.2, 4.4, 4.2],
        attach: { to: 'lightbar_chassis', side: 'top', gap: 0, offset: [-4.6, 0, 0] },
        materialPreset: 'frosted_led',
        color: '#EF4444',
        partRole: 'emissive'
      });
      this.addPart({
        id: 'blue_strobe_dome',
        primitive: 'capsule',
        size: [4.2, 4.4, 4.2],
        attach: { to: 'lightbar_chassis', side: 'top', gap: 0, offset: [4.6, 0, 0] },
        materialPreset: 'frosted_led',
        color: '#3B82F6',
        partRole: 'emissive'
      });
      this.addPart({
        id: 'center_siren_rotor',
        primitive: 'cylinder',
        size: [3.2, 3.0, 3.2],
        attach: { to: 'lightbar_chassis', side: 'top', gap: 0, offset: [0, 0, 0] },
        materialPreset: 'gold_pin',
        partRole: 'rotor',
        spinAxis: 'y'
      });
      this.addPart({
        id: 'driver_ic',
        primitive: 'rounded_box',
        size: [5.2, 1.2, 3.0],
        radius: 0.2,
        attach: { to: 'pcb_base', side: 'top', gap: 0, offset: [0, 0, 4.2] },
        materialPreset: 'ic_epoxy'
      });
      this.addPinRow({
        prefix: 'P',
        count: 4,
        pitch: 2.54,
        edge: 'bottom',
        names: ['VCC', 'GND', 'IN', 'OUT'],
        directions: ['power', 'ground', 'input', 'output']
      });
      this.setEvaluateScript(`const vcc = Number(pins.VCC?.voltage ?? 5.0);
const inV = Math.max(Number(pins.IN?.voltage ?? 0), Number(pins.TRIG?.voltage ?? 0));
const isTriggered = vcc >= 2.5 && inV >= 2.0;
state.phase = ((Number(state.phase) || 0) + (Number(dt) || 0.05) * 10) % (Math.PI * 2);
state.active = isTriggered;
state.rpm = isTriggered ? 960 : 0;
const outV = isTriggered ? 5.0 : 0.0;
return {
  outputs: {
    OUT: { voltage: outV, logicLevel: isTriggered ? 1 : 0 }
  },
  state: {
    active: isTriggered,
    rpm: state.rpm,
    strobePhase: Number(state.phase.toFixed(2))
  }
};`);
      actionsSummary.push(
        'İtfaiye Çakar Tepe Lambası (custom.fire_truck_beacon): kırmızı/mavi emissive kubbeler, döner reflektör ve IN sinyal tetikleme devresi oluşturuldu'
      );
    } else if (
      (lower.includes('fan') || lower.includes('soğutucu') || lower.includes('pervane') || lower.includes('rotor')) &&
      (lower.includes('tasarla') || lower.includes('oluştur') || lower.includes('üret') || lower.includes('design') || lower.includes('build'))
    ) {
      this.loadTemplate('rotor_fan_module');
      actionsSummary.push('Loaded 5V Brushless Cooling Fan 3D CAD base');
    } else if (
      (lower.includes('engel') || lower.includes('bariyer') || lower.includes('duvar') || lower.includes('prop') || lower.includes('obstacle') || lower.includes('0-pin')) &&
      (lower.includes('tasarla') || lower.includes('oluştur') || lower.includes('üret') || lower.includes('design') || lower.includes('build'))
    ) {
      this.loadTemplate('arena_barrier_prop');
      actionsSummary.push('Configured 0-Pin Ultrasonic/IR Arena Barrier Prop');
    } else if (
      (lower.includes('sensör') || lower.includes('sensor') || lower.includes('eşik') || lower.includes('threshold') || lower.includes('sonar') || lower.includes('gaz')) &&
      (lower.includes('tasarla') || lower.includes('oluştur') || lower.includes('üret') || lower.includes('design') || lower.includes('build'))
    ) {
      this.loadTemplate('threshold_sensor_node');
      actionsSummary.push('Configured 4-Pin 2.54mm Smart Threshold Sensor Node');
    } else if (
      (lower.includes('inverter') || lower.includes('evirici') || lower.includes('74hc04') || lower.includes('not kapısı')) &&
      (lower.includes('tasarla') || lower.includes('oluştur') || lower.includes('üret') || lower.includes('design') || lower.includes('build'))
    ) {
      this.loadTemplate('logic_inverter_gate');
      actionsSummary.push('Configured 74HC04 Logic Inverter 3D Node');
    }

    // 2. Check for PCB color / material changes
    const basePartId = this.draft.parts[0]?.id || 'pcb_base';
    if (lower.includes('kırmızı') || lower.includes('red pcb') || lower.includes('fr4_pcb_red')) {
      this.setPartMaterial(basePartId, 'fr4_pcb_red');
      actionsSummary.push(`Set ${basePartId} material to FR4 PCB Red`);
    } else if (lower.includes('siyah') || lower.includes('black pcb') || lower.includes('fr4_pcb_black')) {
      this.setPartMaterial(basePartId, 'fr4_pcb_black');
      actionsSummary.push(`Set ${basePartId} material to FR4 PCB Matte Black`);
    } else if (lower.includes('mavi') || lower.includes('blue pcb') || lower.includes('fr4_pcb_blue')) {
      this.setPartMaterial(basePartId, 'fr4_pcb_blue');
      actionsSummary.push(`Set ${basePartId} material to FR4 PCB Blue`);
    } else if (lower.includes('alüminyum') || lower.includes('aluminum') || lower.includes('metal')) {
      this.setPartMaterial(this.selectedPartId || basePartId, 'brushed_aluminum');
      actionsSummary.push('Applied Brushed Aluminum PBR preset');
    } else if (lower.includes('altın') || lower.includes('gold')) {
      this.setPartMaterial(this.selectedPartId || basePartId, 'gold_pin');
      actionsSummary.push('Applied Gold Header PBR preset');
    }

    // 3. Check for adding specific 3D CAD sub-parts (`addPart` + `attachPart`)
    if (lower.includes('led') && (lower.includes('ekle') || lower.includes('add') || lower.includes('üstüne'))) {
      const ledId = `led_${this.draft.parts.length + 1}`;
      this.addPart({
        id: ledId,
        primitive: 'capsule',
        size: [1.5, 2.0, 1.5],
        attach: { to: basePartId, side: 'top', gap: 0, offset: [4.2, 0, 2.2] },
        materialPreset: 'frosted_led',
        color: lower.includes('kırmızı') ? '#EF4444' : '#10B981',
        partRole: 'emissive'
      });
      actionsSummary.push(`Attached emissive 3D LED (${ledId}) on top of ${basePartId}`);
    }

    if (
      (lower.includes('çip') || lower.includes('ic') || lower.includes('entegre') || lower.includes('mikroçip')) &&
      (lower.includes('ekle') || lower.includes('add') || lower.includes('üstüne'))
    ) {
      const icId = `ic_chip_${this.draft.parts.length + 1}`;
      this.addPart({
        id: icId,
        primitive: 'rounded_box',
        size: [6.8, 1.8, 4.8],
        radius: 0.2,
        attach: { to: basePartId, side: 'top', gap: 0, offset: [0, 0, 0] },
        materialPreset: 'ic_epoxy'
      });
      actionsSummary.push(`Attached IC Epoxy package (${icId}) onto ${basePartId}.top`);
    }

    if (
      (lower.includes('bobin') || lower.includes('indüktör') || lower.includes('torus') || lower.includes('coil')) &&
      (lower.includes('ekle') || lower.includes('add'))
    ) {
      const coilId = `copper_coil_${this.draft.parts.length + 1}`;
      this.addPart({
        id: coilId,
        primitive: 'torus',
        size: [2.6, 0.65, 2.6],
        attach: { to: basePartId, side: 'top', gap: 0.1, offset: [-3.2, 0, 0] },
        materialPreset: 'copper'
      });
      actionsSummary.push(`Attached toroidal copper coil (${coilId}) onto ${basePartId}.top`);
    }

    if (
      (lower.includes('sensör tüp') || lower.includes('tube') || lower.includes('silindir') || lower.includes('shroud')) &&
      (lower.includes('ekle') || lower.includes('add'))
    ) {
      const tubeId = `sensor_tube_${this.draft.parts.length + 1}`;
      this.addPart({
        id: tubeId,
        primitive: 'tube',
        size: [4.8, 3.0, 4.8],
        innerRadius: 1.7,
        attach: { to: basePartId, side: 'top', gap: 0, offset: [0, 0, -1.0] },
        materialPreset: 'brushed_aluminum'
      });
      actionsSummary.push(`Attached hollow aluminum sensor tube (${tubeId}) onto ${basePartId}.top`);
    }

    // 4. Check for 2.54mm Pin Header generation
    const pinMatch = lower.match(/(\d+)\s*[-\s]?pin/);
    if (pinMatch && (lower.includes('header') || lower.includes('ekle') || lower.includes('dizi') || lower.includes('row') || lower.includes('2.54'))) {
      const count = Math.max(2, Math.min(16, Number(pinMatch[1]) || 4));
      const defaultLabels =
        count === 4
          ? ['VCC', 'GND', 'IN', 'OUT']
          : count === 3
            ? ['VCC', 'GND', 'OUT']
            : null;
      this.addPinRow({
        prefix: 'P',
        count,
        pitch: 2.54,
        edge: 'bottom',
        names: defaultLabels
      });
      actionsSummary.push(`Generated 1x${count} (2.54mm pitch) header row`);
    }

    // 5. Fallback if generic prompt didn't match a specific keyword: add a custom feature part
    if (actionsSummary.length === 0) {
      const partId = `custom_feature_${this.draft.parts.length + 1}`;
      this.addPart({
        id: partId,
        primitive: 'rounded_box',
        size: [5.0, 2.0, 4.0],
        radius: 0.25,
        attach: { to: basePartId, side: 'top', gap: 0, offset: [0, 0, 0] },
        materialPreset: 'brushed_aluminum'
      });
      actionsSummary.push(`Added 3D feature block (${partId}) attached to ${basePartId}.top`);
    }

    // 6. Run automatic self-verification via testComponentBehavior()
    const defaultInV = String(this.draft.typeId || '').includes('inverter') ? 0.0 : 5.0;
    const selfTest = this.testComponentBehavior({
      pinVoltages: { VCC: 5.0, GND: 0.0, IN: defaultInV, TRIG: 5.0 },
      distanceCm: 18
    });
    const executedTools = this.toolHistory.slice(startHistoryLen);

    return {
      ok: true,
      mode: 'studio_architect',
      summary: actionsSummary.join(' · '),
      executedTools,
      selfTest,
      snapshot: this.getComponentSnapshot({ recordTool: false })
    };
  }
}
