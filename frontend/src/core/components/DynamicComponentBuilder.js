import * as THREE from 'three';
import { HardwareComponent } from './HardwareComponent.js';
import { hardwareRegistry } from '../registry/ComponentRegistry.js';
import { mat } from '../../hardware/primitives/GeometryFactory.js';

/**
 * Runtime registry of custom/datasheet component specifications so `ScenarioSerializer`,
 * `ComponentPalettePopover`, and AI Agent tools (`searchCapabilities`, `getComponentSchema`)
 * can embed, inspect, and reconstruct dynamically synthesized components across sessions.
 * @type {Map<string, object>}
 */
const registeredSpecsByTypeId = new Map();

/**
 * Electronics & Robotics PBR Material Presets (Codex Modeling Studio Hardware Palette).
 */
export const PBR_MATERIAL_PRESETS = Object.freeze({
  fr4_pcb: { color: '#0F766E', roughness: 0.42, metalness: 0.12, label: 'FR4 PCB Emerald' },
  fr4_pcb_teal: { color: '#0D9488', roughness: 0.42, metalness: 0.12, label: 'FR4 PCB Teal' },
  fr4_pcb_black: { color: '#1E293B', roughness: 0.38, metalness: 0.16, label: 'FR4 PCB Matte Black' },
  fr4_pcb_red: { color: '#B91C1C', roughness: 0.42, metalness: 0.12, label: 'FR4 PCB Red' },
  fr4_pcb_blue: { color: '#1D4ED8', roughness: 0.42, metalness: 0.14, label: 'FR4 PCB Blue' },
  ic_epoxy: { color: '#18181B', roughness: 0.55, metalness: 0.08, label: 'IC Black Epoxy' },
  gold_pin: { color: '#D4AF37', roughness: 0.22, metalness: 0.88, label: 'Gold Header Pin' },
  brushed_aluminum: { color: '#CBD5E1', roughness: 0.32, metalness: 0.82, label: 'Brushed Aluminum' },
  frosted_led: {
    color: '#34D399',
    roughness: 0.25,
    metalness: 0.05,
    transparent: true,
    opacity: 0.88,
    emissive: '#10B981',
    emissiveIntensity: 0.18,
    label: 'Frosted Diffused LED'
  },
  rubber_tire: { color: '#111827', roughness: 0.88, metalness: 0.04, label: 'High-Grip Rubber' },
  copper: { color: '#B45309', roughness: 0.28, metalness: 0.86, label: 'Copper Coil / Pad' },
  ceramic: { color: '#F59E0B', roughness: 0.35, metalness: 0.05, label: 'SMD Ceramic' },
  matte_plastic: { color: '#475569', roughness: 0.62, metalness: 0.08, label: 'Matte ABS Plastic' }
});

/**
 * Forbidden tokens inside sandboxed `evaluateScript` expressions.
 */
const FORBIDDEN_EVAL_TOKENS = [
  /\bwindow\b/,
  /\bdocument\b/,
  /\bfetch\b/,
  /\bXMLHttpRequest\b/,
  /\blocalStorage\b/,
  /\bsessionStorage\b/,
  /\bFunction\b/,
  /\beval\b/,
  /\bimport\s*\(/,
  /\bprocess\b/,
  /\bglobalThis\b/,
  /\bconstructor\b/,
  /\b__proto__\b/,
  /\bprototype\b/
];

/**
 * Known deterministic hardware datasheet templates for instant offline synthesis
 * and fallback when `/api/v1/ai/datasheet` is unreachable.
 */
const BUILTIN_DATASHEET_SPECS = {
  BME280: {
    typeId: 'sensor.bme280',
    name: 'Bosch BME280 Environmental Sensor (I2C/SPI)',
    category: 'sensor',
    description: 'Digital humidity, pressure, and temperature sensor breakout (3.3V logic, I2C 0x76).',
    packageType: 'breakout',
    color: '#0F766E',
    dimensions: [11.5, 1.6, 14.0],
    pins: [
      { name: 'VCC', position: [-3.81, -2.2, 5.2], direction: 'IN', role: 'VCC_IN', protocol: 'DC', maxVoltage: 3.6 },
      { name: 'GND', position: [-1.27, -2.2, 5.2], direction: 'IN', role: 'GND_IN', protocol: 'DC', maxVoltage: 3.6 },
      { name: 'SCL', position: [1.27, -2.2, 5.2], direction: 'IN', role: 'CLOCK', protocol: 'I2C', maxVoltage: 3.6 },
      { name: 'SDA', position: [3.81, -2.2, 5.2], direction: 'IO', role: 'DATA', protocol: 'I2C', maxVoltage: 3.6 }
    ],
    dipoles: [
      { pinA: 'VCC', pinB: 'GND', resistance: 1200, forwardVoltage: 0, unidirectional: false, maxCurrent: 0.05 }
    ]
  },
  MPU6050: {
    typeId: 'sensor.mpu6050',
    name: 'InvenSense MPU-6050 6-DOF IMU (Gyro + Accelerometer)',
    category: 'sensor',
    description: '6-axis motion tracking MEMS sensor with 16-bit ADC and I2C bus interface.',
    packageType: 'breakout',
    color: '#1D4ED8',
    dimensions: [14.0, 1.6, 16.0],
    pins: [
      { name: 'VCC', position: [-5.08, -2.2, 6.2], direction: 'IN', role: 'VCC_IN', protocol: 'DC', maxVoltage: 5.5 },
      { name: 'GND', position: [-2.54, -2.2, 6.2], direction: 'IN', role: 'GND_IN', protocol: 'DC', maxVoltage: 5.5 },
      { name: 'SCL', position: [0.0, -2.2, 6.2], direction: 'IN', role: 'CLOCK', protocol: 'I2C', maxVoltage: 5.5 },
      { name: 'SDA', position: [2.54, -2.2, 6.2], direction: 'IO', role: 'DATA', protocol: 'I2C', maxVoltage: 5.5 },
      { name: 'INT', position: [5.08, -2.2, 6.2], direction: 'OUT', role: 'GPIO', protocol: 'GPIO', maxVoltage: 3.6 }
    ],
    dipoles: [
      { pinA: 'VCC', pinB: 'GND', resistance: 950, forwardVoltage: 0, unidirectional: false, maxCurrent: 0.06 }
    ]
  },
  INA219: {
    typeId: 'sensor.ina219',
    name: 'TI INA219 High-Side DC Current & Power Monitor',
    category: 'sensor',
    description: 'Zero-drift bidirectional current/power monitor IC with I2C interface and 0.1 ohm shunt.',
    packageType: 'breakout',
    color: '#0369A1',
    dimensions: [14.0, 1.6, 15.0],
    pins: [
      { name: 'VCC', position: [-3.81, -2.2, 5.8], direction: 'IN', role: 'VCC_IN', protocol: 'DC', maxVoltage: 5.5 },
      { name: 'GND', position: [-1.27, -2.2, 5.8], direction: 'IN', role: 'GND_IN', protocol: 'DC', maxVoltage: 5.5 },
      { name: 'SCL', position: [1.27, -2.2, 5.8], direction: 'IN', role: 'CLOCK', protocol: 'I2C', maxVoltage: 5.5 },
      { name: 'SDA', position: [3.81, -2.2, 5.8], direction: 'IO', role: 'DATA', protocol: 'I2C', maxVoltage: 5.5 }
    ],
    dipoles: [
      { pinA: 'VCC', pinB: 'GND', resistance: 1100, forwardVoltage: 0, unidirectional: false, maxCurrent: 0.05 }
    ]
  }
};

function parseColorHex(colorValue, fallback = 0x0f766e) {
  if (typeof colorValue === 'number' && Number.isFinite(colorValue)) {
    return colorValue;
  }
  if (typeof colorValue === 'string') {
    const cleaned = colorValue.trim().replace(/^#/, '');
    const parsed = Number.parseInt(cleaned, 16);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

/**
 * Creates a rounded rectangle `THREE.Shape` centered at (0, 0) in 2D XY space.
 */
function createRoundedRectShape(width, depth, radius) {
  const w = Math.max(0.4, Number(width) || 10);
  const d = Math.max(0.4, Number(depth) || 10);
  const r = Math.min(w * 0.45, d * 0.45, Math.max(0.05, Number(radius) || 0.8));
  const hw = w * 0.5;
  const hd = d * 0.5;

  const shape = new THREE.Shape();
  shape.moveTo(-hw + r, -hd);
  shape.lineTo(hw - r, -hd);
  shape.quadraticCurveTo(hw, -hd, hw, -hd + r);
  shape.lineTo(hw, hd - r);
  shape.quadraticCurveTo(hw, hd, hw - r, hd);
  shape.lineTo(-hw + r, hd);
  shape.quadraticCurveTo(-hw, hd, -hw, hd - r);
  shape.lineTo(-hw, -hd + r);
  shape.quadraticCurveTo(-hw, -hd, -hw + r, -hd);
  return shape;
}

/**
 * Builds a Three.js BufferGeometry & half-extents `[hx, hy, hz]` for a declarative CAD `part` specification.
 * Supports: `box`, `rounded_box`, `cylinder`, `tube`, `capsule`, `lathe`, `sphere`, `cone`, `torus`.
 * @param {object} part
 * @returns {{ geometry: THREE.BufferGeometry, halfExtents: [number, number, number] }}
 */
export function buildPartGeometry(part = {}) {
  const shapeType = String(part.shape || part.primitive || part.type || 'box')
    .trim()
    .toLowerCase();
  const rawSize = Array.isArray(part.size)
    ? part.size.map((n) => Number(n) || 1)
    : Array.isArray(part.dimensions)
      ? part.dimensions.map((n) => Number(n) || 1)
      : null;

  if (shapeType === 'rounded_box' || shapeType === 'rounded-box' || shapeType === 'chamfer_box') {
    const w = Math.max(0.4, Number(rawSize?.[0] ?? part.width ?? 10));
    const h = Math.max(0.2, Number(rawSize?.[1] ?? part.height ?? 1.6));
    const d = Math.max(0.4, Number(rawSize?.[2] ?? part.depth ?? 10));
    const radius = Number(part.radius ?? part.cornerRadius ?? Math.min(w, d) * 0.12);
    const bevel = Math.min(h * 0.25, Number(part.bevel ?? 0.12));
    const rectShape = createRoundedRectShape(w, d, radius);
    const geo = new THREE.ExtrudeGeometry(rectShape, {
      depth: Math.max(0.1, h - bevel * 2),
      bevelEnabled: bevel > 0.01,
      bevelSegments: 2,
      steps: 1,
      bevelSize: bevel,
      bevelThickness: bevel
    });
    geo.rotateX(Math.PI * 0.5);
    geo.center();
    return { geometry: geo, halfExtents: [w * 0.5, h * 0.5, d * 0.5] };
  }

  if (shapeType === 'tube' || shapeType === 'hollow_cylinder' || shapeType === 'ring') {
    const outerR = Math.max(0.3, Number(part.outerRadius ?? rawSize?.[0] ?? part.radius ?? 2.0));
    const h = Math.max(0.2, Number(part.height ?? rawSize?.[1] ?? 2.0));
    const innerR = Math.max(
      0.1,
      Math.min(outerR * 0.92, Number(part.innerRadius ?? part.holeRadius ?? rawSize?.[2] ?? outerR * 0.55))
    );
    const arcShape = new THREE.Shape();
    arcShape.absarc(0, 0, outerR, 0, Math.PI * 2, false);
    const holePath = new THREE.Path();
    holePath.absarc(0, 0, innerR, 0, Math.PI * 2, true);
    arcShape.holes.push(holePath);

    const geo = new THREE.ExtrudeGeometry(arcShape, {
      depth: h,
      bevelEnabled: false,
      curveSegments: 24
    });
    geo.rotateX(Math.PI * 0.5);
    geo.center();
    return { geometry: geo, halfExtents: [outerR, h * 0.5, outerR] };
  }

  if (shapeType === 'cylinder') {
    const rTop = Math.max(0.1, Number(part.radiusTop ?? part.radius ?? rawSize?.[0] ?? 1.5));
    const rBottom = Math.max(0.1, Number(part.radiusBottom ?? part.radius ?? rawSize?.[0] ?? rTop));
    const h = Math.max(0.1, Number(part.height ?? rawSize?.[1] ?? 3.0));
    const segs = Math.max(6, Number(part.segments ?? 18));
    const geo = new THREE.CylinderGeometry(rTop, rBottom, h, segs);
    const maxR = Math.max(rTop, rBottom);
    return { geometry: geo, halfExtents: [maxR, h * 0.5, maxR] };
  }

  if (shapeType === 'capsule') {
    const r = Math.max(0.15, Number(part.radius ?? rawSize?.[0] ?? 1.2));
    const len = Math.max(0.1, Number(part.length ?? rawSize?.[1] ?? 2.4));
    const geo = new THREE.CapsuleGeometry(r, len, 8, 16);
    return { geometry: geo, halfExtents: [r, len * 0.5 + r, r] };
  }

  if (shapeType === 'lathe') {
    const rawPts = Array.isArray(part.points) && part.points.length >= 2
      ? part.points
      : [
          [0.1, 0],
          [1.8, 0],
          [1.6, 1.2],
          [1.1, 2.4],
          [0.0, 2.8]
        ];
    const vecPts = rawPts.map((pt) =>
      Array.isArray(pt)
        ? new THREE.Vector2(Math.max(0, Number(pt[0]) || 0), Number(pt[1]) || 0)
        : new THREE.Vector2(Math.max(0, Number(pt?.x ?? pt?.r) || 0), Number(pt?.y) || 0)
    );
    const geo = new THREE.LatheGeometry(vecPts, Math.max(8, Number(part.segments ?? 20)));
    geo.center();
    geo.computeBoundingBox();
    const bb = geo.boundingBox;
    const hx = bb ? Math.max(0.2, (bb.max.x - bb.min.x) * 0.5) : 1.5;
    const hy = bb ? Math.max(0.2, (bb.max.y - bb.min.y) * 0.5) : 1.5;
    const hz = bb ? Math.max(0.2, (bb.max.z - bb.min.z) * 0.5) : 1.5;
    return { geometry: geo, halfExtents: [hx, hy, hz] };
  }

  if (shapeType === 'sphere') {
    const r = Math.max(0.15, Number(part.radius ?? rawSize?.[0] ?? 1.5));
    const geo = new THREE.SphereGeometry(r, 16, 12);
    return { geometry: geo, halfExtents: [r, r, r] };
  }

  if (shapeType === 'cone') {
    const r = Math.max(0.15, Number(part.radius ?? rawSize?.[0] ?? 1.5));
    const h = Math.max(0.2, Number(part.height ?? rawSize?.[1] ?? 3.0));
    const geo = new THREE.ConeGeometry(r, h, 16);
    return { geometry: geo, halfExtents: [r, h * 0.5, r] };
  }

  if (shapeType === 'torus') {
    const r = Math.max(0.3, Number(part.radius ?? rawSize?.[0] ?? 2.0));
    const tube = Math.max(0.08, Number(part.tube ?? rawSize?.[1] ?? 0.45));
    const geo = new THREE.TorusGeometry(r, tube, 12, 24);
    geo.rotateX(Math.PI * 0.5);
    return { geometry: geo, halfExtents: [r + tube, tube, r + tube] };
  }

  // Default: 'box'
  const w = Math.max(0.2, Number(rawSize?.[0] ?? part.width ?? 4.0));
  const h = Math.max(0.1, Number(rawSize?.[1] ?? part.height ?? 1.6));
  const d = Math.max(0.2, Number(rawSize?.[2] ?? part.depth ?? 4.0));
  const geo = new THREE.BoxGeometry(w, h, d);
  return { geometry: geo, halfExtents: [w * 0.5, h * 0.5, d * 0.5] };
}

/**
 * Resolves a Three.js `MeshStandardMaterial` from a preset name or custom material descriptor.
 * @param {object} part
 * @param {number} [defaultColorHex=0x0f766e]
 * @returns {THREE.MeshStandardMaterial}
 */
export function buildPartMaterial(part = {}, defaultColorHex = 0x0f766e) {
  const matSpec = part.material;
  const presetKey =
    typeof matSpec === 'string'
      ? matSpec.trim().toLowerCase()
      : typeof matSpec?.preset === 'string'
        ? matSpec.preset.trim().toLowerCase()
        : typeof part.materialPreset === 'string'
          ? part.materialPreset.trim().toLowerCase()
          : '';

  const preset = PBR_MATERIAL_PRESETS[presetKey] || null;
  const colorVal =
    part.color ??
    (typeof matSpec === 'object' && matSpec ? matSpec.color : null) ??
    preset?.color ??
    defaultColorHex;

  const roughness = Number(
    (typeof matSpec === 'object' && matSpec ? matSpec.roughness : null) ??
      part.roughness ??
      preset?.roughness ??
      0.45
  );
  const metalness = Number(
    (typeof matSpec === 'object' && matSpec ? matSpec.metalness : null) ??
      part.metalness ??
      preset?.metalness ??
      0.15
  );
  const transparent = Boolean(
    (typeof matSpec === 'object' && matSpec ? matSpec.transparent : null) ??
      part.transparent ??
      preset?.transparent ??
      false
  );
  const opacity = Number(
    (typeof matSpec === 'object' && matSpec ? matSpec.opacity : null) ??
      part.opacity ??
      preset?.opacity ??
      1.0
  );
  const emissiveHex = parseColorHex(
    (typeof matSpec === 'object' && matSpec ? matSpec.emissive : null) ??
      part.emissive ??
      preset?.emissive ??
      0x000000,
    0x000000
  );
  const emissiveIntensity = Number(
    (typeof matSpec === 'object' && matSpec ? matSpec.emissiveIntensity : null) ??
      part.emissiveIntensity ??
      preset?.emissiveIntensity ??
      0
  );

  return new THREE.MeshStandardMaterial({
    color: parseColorHex(colorVal, defaultColorHex),
    roughness: Math.max(0, Math.min(1, roughness)),
    metalness: Math.max(0, Math.min(1, metalness)),
    transparent: transparent || opacity < 1.0,
    opacity: Math.max(0.05, Math.min(1, opacity)),
    emissive: emissiveHex,
    emissiveIntensity: Math.max(0, emissiveIntensity)
  });
}

/**
 * Resolves the 3D center `[x, y, z]` of a part using Codex Modeling Studio's relative
 * `attach: { to, side, gap, offset }` surface constraint or explicit `position`.
 *
 * @param {object} part
 * @param {[number, number, number]} childHalfExtents
 * @param {Map<string, { center: [number, number, number], halfExtents: [number, number, number] }>} boundsById
 * @returns {[number, number, number]}
 */
export function resolvePartAttachmentPosition(part, childHalfExtents, boundsById) {
  const explicitPos = Array.isArray(part.position) && part.position.length === 3
    ? [Number(part.position[0]) || 0, Number(part.position[1]) || 0, Number(part.position[2]) || 0]
    : null;

  const attach = part.attach && typeof part.attach === 'object' ? part.attach : null;
  if (!attach || !attach.to) {
    return explicitPos || [0, childHalfExtents[1], 0];
  }

  const targetKey = String(attach.to).trim();
  const parentBounds =
    boundsById.get(targetKey) ||
    boundsById.get(targetKey.toLowerCase()) ||
    boundsById.get('pcb') ||
    boundsById.get('root') ||
    null;

  if (!parentBounds) {
    return explicitPos || [0, childHalfExtents[1], 0];
  }

  const [px, py, pz] = parentBounds.center;
  const [phx, phy, phz] = parentBounds.halfExtents;
  const [chx, chy, chz] = childHalfExtents;
  const gap = Number(attach.gap ?? 0);
  const offset = Array.isArray(attach.offset)
    ? [Number(attach.offset[0]) || 0, Number(attach.offset[1]) || 0, Number(attach.offset[2]) || 0]
    : [0, 0, 0];
  const side = String(attach.side || 'top').trim().toLowerCase();

  let x = px + offset[0];
  let y = py + offset[1];
  let z = pz + offset[2];

  if (side === 'top' || side === 'up' || side === '+y') {
    y = py + phy + chy + gap + offset[1];
  } else if (side === 'bottom' || side === 'down' || side === '-y') {
    y = py - phy - chy - gap + offset[1];
  } else if (side === 'right' || side === 'east' || side === '+x') {
    x = px + phx + chx + gap + offset[0];
  } else if (side === 'left' || side === 'west' || side === '-x') {
    x = px - phx - chx - gap + offset[0];
  } else if (side === 'front' || side === 'south' || side === '+z') {
    z = pz + phz + chz + gap + offset[2];
  } else if (side === 'back' || side === 'north' || side === '-z') {
    z = pz - phz - chz - gap + offset[2];
  }

  return [Number(x.toFixed(3)), Number(y.toFixed(3)), Number(z.toFixed(3))];
}

/**
 * Expands `pinGenerator` / `pinGenerators` rules into concrete 2.54mm (or custom pitch) pin descriptors.
 * @param {object|Array<object>} pinGeneratorSpec
 * @param {[number, number, number]} dimensions
 * @returns {Array<object>}
 */
export function expandPinGenerators(pinGeneratorSpec, dimensions = [12, 1.6, 14]) {
  if (!pinGeneratorSpec) return [];
  const generators = Array.isArray(pinGeneratorSpec) ? pinGeneratorSpec : [pinGeneratorSpec];
  const generated = [];
  const [w, , d] = dimensions;

  for (const gen of generators) {
    if (!gen || typeof gen !== 'object') continue;
    const count = Math.max(0, Math.min(64, Number(gen.count ?? gen.pinCount ?? 0)));
    if (count <= 0) continue;

    const pitch = Number(gen.pitch ?? 2.54);
    const axis = String(gen.axis || 'x').toLowerCase() === 'z' ? 'z' : 'x';
    const span = (count - 1) * pitch;
    const defaultStart =
      axis === 'x'
        ? [-span * 0.5, -2.2, Number((d * 0.5 - 1.2).toFixed(2))]
        : [Number((-w * 0.5 + 1.2).toFixed(2)), -2.2, -span * 0.5];

    const startPos =
      Array.isArray(gen.startPosition) && gen.startPosition.length === 3
        ? gen.startPosition.map((n) => Number(n) || 0)
        : defaultStart;

    const prefix = String(gen.prefix ?? 'P').trim().toUpperCase();
    const startIndex = Number(gen.startIndex ?? 1);
    const labels = Array.isArray(gen.labels) ? gen.labels : null;

    for (let i = 0; i < count; i++) {
      const name = labels && labels[i]
        ? String(labels[i]).trim().toUpperCase()
        : `${prefix}${startIndex + i}`;
      const pos =
        axis === 'x'
          ? [Number((startPos[0] + i * pitch).toFixed(2)), startPos[1], startPos[2]]
          : [startPos[0], startPos[1], Number((startPos[2] + i * pitch).toFixed(2))];

      generated.push({
        name,
        position: pos,
        direction: gen.direction || (name === 'GND' ? 'ground' : name === 'VCC' || name === '5V' || name === '3V3' ? 'input' : 'IO'),
        role: gen.role || (name === 'GND' ? 'GND_IN' : name === 'VCC' || name === 'VIN' ? 'VCC_IN' : 'SIGNAL'),
        protocol: gen.protocol || 'GPIO',
        voltage: typeof gen.voltage === 'number' ? gen.voltage : null,
        maxVoltage: typeof gen.maxVoltage === 'number' ? gen.maxVoltage : 5.5,
        maxCurrent: typeof gen.maxCurrent === 'number' ? gen.maxCurrent : 0.05
      });
    }
  }

  return generated;
}

/**
 * Runtime 3D Hardware Component Synthesizer (`DynamicComponentBuilder` v2).
 *
 * Converts a declarative JSON datasheet/studio specification into a full `HardwareComponent` subclass with:
 * - Codex Modeling Studio declarative `parts[]` tree with relative surface attachment (`attach: { to, side, gap, offset }`),
 *   CAD primitives (`rounded_box`, `tube`, `capsule`, `lathe`, `box`, `cylinder`, `sphere`, `cone`, `torus`),
 *   array/symmetry modifiers (`repeat`, `mirror`), PBR material presets (`PBR_MATERIAL_PRESETS`), and reactive `partRole`s
 * - Automatic `2.54mm` header generation (`pinGenerator` / `pinGenerators`) + explicit `ElectricalPin` handles
 * - Internal `ConductiveDipole` paths solved by `CircuitFlowSolver` and inspectable via `setXRayMode(true)`
 * - Safe sandboxed `evaluateScript` / `evaluate({ pins, state, dt, stageEnv, report })` ReactFlow 3D Node execution
 */
export class DynamicComponentBuilder {
  static PBR_MATERIAL_PRESETS = PBR_MATERIAL_PRESETS;

  /**
   * Validates and compiles a user/AI-authored `evaluateScript` string into an isolated evaluator function.
   * Rejects dangerous globals (`window`, `document`, `fetch`, `eval`, `Function`, etc.).
   * @param {string} scriptStr
   * @returns {((context: object) => object|null)|null}
   */
  static compileEvaluateScript(scriptStr) {
    if (!scriptStr || typeof scriptStr !== 'string' || !scriptStr.trim()) {
      return null;
    }
    const source = scriptStr.trim();
    for (const pattern of FORBIDDEN_EVAL_TOKENS) {
      if (pattern.test(source)) {
        throw new Error(`Security Guard: forbidden token (${pattern}) inside custom component evaluateScript.`);
      }
    }

    // Support both arrow/function expressions `( { pins, state } ) => { ... }` and direct body statements `return { ... };`
    const isFunctionExpr =
      /^\s*(?:async\s+)?function\b/.test(source) ||
      /^\s*\([^)]*\)\s*=>/.test(source) ||
      /^\s*[a-zA-Z_$][a-zA-Z0-9_$]*\s*=>/.test(source);

    const bodyCode = isFunctionExpr
      ? `"use strict"; const __fn = (${source}); return __fn({ pins, state, dt, stageEnv, report, spec });`
      : `"use strict"; ${source}`;

    const compiledRunner = new Function(
      'pins',
      'state',
      'dt',
      'stageEnv',
      'report',
      'spec',
      'Math',
      bodyCode
    );

    return function sandboxedNodeEvaluate(context = {}) {
      return compiledRunner(
        context.pins || {},
        context.state || {},
        Number(context.dt ?? 0.016),
        context.stageEnv || null,
        context.report || {},
        context.spec || null,
        Math
      );
    };
  }

  /**
   * Normalizes and validates a raw component specification (v1 breakout or v2 Studio `parts[]` tree).
   * @param {object} rawSpec
   */
  static normalizeSpec(rawSpec = {}) {
    if (!rawSpec || typeof rawSpec !== 'object') {
      throw new Error('DynamicComponentBuilder requires a specification object.');
    }

    const rawCode = String(rawSpec.typeId || rawSpec.partCode || rawSpec.name || 'custom_part')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, '_');

    const category = String(rawSpec.category || 'sensor').toLowerCase();
    const packageType = String(rawSpec.packageType || 'breakout').toLowerCase();
    const isEnvironmentProp = Boolean(
      rawSpec.isEnvironmentProp ||
        category === 'props' ||
        category === 'prop' ||
        packageType === 'prop' ||
        packageType === 'obstacle' ||
        (Array.isArray(rawSpec.pins) && rawSpec.pins.length === 0 && !rawSpec.pinGenerator && !rawSpec.pinGenerators)
    );
    const typeId = rawCode.includes('.')
      ? rawCode
      : `${isEnvironmentProp ? 'prop' : category}.${rawCode}`;
    const name = String(rawSpec.name || rawSpec.displayName || rawCode.toUpperCase()).trim();
    const description = String(
      rawSpec.description || `${name} dynamically synthesized 3D hardware module.`
    ).trim();
    const color = typeof rawSpec.color === 'string' ? rawSpec.color : isEnvironmentProp ? '#F59E0B' : '#0F766E';

    const rawDims = Array.isArray(rawSpec.dimensions) && rawSpec.dimensions.length === 3
      ? rawSpec.dimensions.map((n) => Number(n) || 10)
      : rawSpec.dimensions && typeof rawSpec.dimensions === 'object'
      ? [
          Number(rawSpec.dimensions.width) || 12,
          Number(rawSpec.dimensions.height) || 1.6,
          Number(rawSpec.dimensions.depth) || 14
        ]
      : isEnvironmentProp
      ? [10, 8, 4]
      : [12, 1.6, 14];

    const generatedPins = expandPinGenerators(
      rawSpec.pinGenerators || rawSpec.pinGenerator,
      rawDims
    );

    const explicitRawPins = Array.isArray(rawSpec.pins) ? rawSpec.pins : [];
    const mergedRawPins = [...explicitRawPins, ...generatedPins];

    const rawPins = isEnvironmentProp
      ? []
      : mergedRawPins.length >= 1
      ? mergedRawPins
      : [
          { name: 'VCC', direction: 'input', role: 'power_in', voltage: 3.3, maxVoltage: 5.5 },
          { name: 'GND', direction: 'bidirectional', role: 'ground', voltage: 0, maxVoltage: 0 },
          { name: 'OUT', direction: 'output', role: 'signal', voltage: 3.3, maxVoltage: 5.5 }
        ];

    const pinCount = rawPins.length;
    const startX = -((pinCount - 1) * 2.54) / 2;
    const frontZ = Number((rawDims[2] * 0.5 - 1.2).toFixed(2));

    const pins = rawPins.map((pin, idx) => {
      const pinName = String(pin.name || pin.pinName || pin.id || pin.label || `P${idx + 1}`).trim().toUpperCase();
      const pos =
        Array.isArray(pin.position) && pin.position.length === 3
          ? pin.position.map((v) => Number(v) || 0)
          : Array.isArray(pin.localPosition) && pin.localPosition.length === 3
          ? pin.localPosition.map((v) => Number(v) || 0)
          : [Number((startX + idx * 2.54).toFixed(2)), -2.2, frontZ];

      const rawDir = String(pin.direction || pin.type || 'IN').toUpperCase();
      const normalizedDir =
        rawDir === 'OUTPUT' || rawDir === 'OUT'
          ? 'OUT'
          : rawDir === 'GROUND' || rawDir === 'GND' || rawDir === 'BIDIRECTIONAL' || rawDir === 'IO'
          ? 'IO'
          : 'IN';

      return {
        name: pinName,
        position: pos,
        direction: normalizedDir,
        role: pin.role || (pinName === 'GND' ? 'GND_IN' : pinName === 'VCC' || pinName === 'VIN' ? 'VCC_IN' : 'SIGNAL'),
        protocol: pin.protocol || (rawDir === 'I2C' ? 'I2C' : rawDir === 'ANALOG' ? 'ADC' : 'GPIO'),
        voltage: typeof pin.voltage === 'number' ? pin.voltage : null,
        maxVoltage:
          typeof pin.maxVoltage === 'number'
            ? pin.maxVoltage
            : typeof pin.voltage_max === 'number'
            ? pin.voltage_max
            : 5.5,
        maxCurrent: typeof pin.maxCurrent === 'number' ? pin.maxCurrent : 0.05
      };
    });

    let dipoles = Array.isArray(rawSpec.dipoles)
      ? rawSpec.dipoles.map((d) => ({
          pinA: String(d.pinA || d.positivePin || pins[0]?.name || 'VCC').toUpperCase(),
          pinB: String(d.pinB || d.negativePin || pins[1]?.name || 'GND').toUpperCase(),
          resistance: Math.max(1, Number(d.resistance ?? d.resistanceOhms ?? d.resistance_ohms) || 1000),
          forwardVoltage: Math.max(0, Number(d.forwardVoltage) || 0),
          unidirectional: Boolean(d.unidirectional),
          maxCurrent: Math.max(0.005, Number(d.maxCurrent) || 0.05)
        }))
      : [];

    if (dipoles.length === 0 && pins.length >= 2) {
      const pwrPin = pins.find((p) => ['VCC', 'VIN', '3V3', '5V', 'ANODE', 'POS'].includes(p.name)) || pins[0];
      const gndPin = pins.find((p) => ['GND', 'CATHODE', 'NEG'].includes(p.name) && p.name !== pwrPin.name) || pins[1];
      dipoles = [
        {
          pinA: pwrPin.name,
          pinB: gndPin.name,
          resistance: 1000,
          forwardVoltage: 0,
          unidirectional: false,
          maxCurrent: 0.05
        }
      ];
      for (const p of pins) {
        if (
          p.name !== pwrPin.name &&
          p.name !== gndPin.name &&
          (p.direction === 'IN' || ['IN', 'TRIG', 'SIG', 'PWM', 'EN', 'CLK', 'DIN', 'RX'].includes(p.name))
        ) {
          dipoles.push({
            pinA: p.name,
            pinB: gndPin.name,
            resistance: 1000,
            forwardVoltage: 0,
            unidirectional: false,
            maxCurrent: 0.05
          });
        }
      }
    }

    const obstacleProfile = isEnvironmentProp
      ? {
          isObstacle: true,
          visualClass: String(rawSpec.visualClass || rawSpec.obstacleProfile?.visualClass || rawCode),
          boundingRadiusCm: Number(rawSpec.obstacleProfile?.boundingRadiusCm ?? Math.max(rawDims[0], rawDims[2]) * 0.5),
          reflectivity: Number(rawSpec.obstacleProfile?.reflectivity ?? 0.92)
        }
      : rawSpec.obstacleProfile || null;

    const parts = Array.isArray(rawSpec.parts)
      ? rawSpec.parts
          .filter((p) => p && typeof p === 'object')
          .map((p, idx) => ({
            id: String(p.id || p.name || `part_${idx + 1}`).trim(),
            name: String(p.name || p.id || `part_${idx + 1}`).trim(),
            shape: String(p.shape || p.primitive || p.type || 'box').trim().toLowerCase(),
            size: Array.isArray(p.size)
              ? p.size.map((n) => Number(n) || 1)
              : Array.isArray(p.dimensions)
                ? p.dimensions.map((n) => Number(n) || 1)
                : undefined,
            width: p.width,
            height: p.height,
            depth: p.depth,
            radius: p.radius,
            radiusTop: p.radiusTop,
            radiusBottom: p.radiusBottom,
            outerRadius: p.outerRadius,
            innerRadius: p.innerRadius,
            holeRadius: p.holeRadius,
            length: p.length,
            tube: p.tube,
            bevel: p.bevel,
            points: Array.isArray(p.points) ? p.points : undefined,
            material: p.material || p.materialPreset || null,
            color: p.color || null,
            roughness: p.roughness,
            metalness: p.metalness,
            opacity: p.opacity,
            transparent: p.transparent,
            emissive: p.emissive,
            emissiveIntensity: p.emissiveIntensity,
            position: Array.isArray(p.position) ? p.position.map((n) => Number(n) || 0) : undefined,
            rotation: Array.isArray(p.rotation) ? p.rotation.map((n) => Number(n) || 0) : undefined,
            attach: p.attach && typeof p.attach === 'object' ? { ...p.attach } : null,
            repeat: p.repeat && typeof p.repeat === 'object' ? { ...p.repeat } : null,
            mirror: p.mirror && typeof p.mirror === 'object' ? { ...p.mirror } : null,
            partRole: p.partRole ? String(p.partRole).trim().toLowerCase() : null,
            spinAxis: p.spinAxis || 'y'
          }))
      : [];

    const evaluateScript =
      typeof rawSpec.evaluateScript === 'string' && rawSpec.evaluateScript.trim()
        ? rawSpec.evaluateScript.trim()
        : null;

    return {
      typeId,
      name,
      category: isEnvironmentProp ? 'props' : category,
      description,
      packageType,
      isEnvironmentProp,
      obstacleProfile,
      parts,
      pinGenerator: rawSpec.pinGenerators || rawSpec.pinGenerator || null,
      nodeBehavior: rawSpec.nodeBehavior || null,
      testControls: Array.isArray(rawSpec.testControls) ? rawSpec.testControls : null,
      evaluateScript,
      evaluate: typeof rawSpec.evaluate === 'function' ? rawSpec.evaluate : null,
      color,
      dimensions: rawDims,
      pins,
      dipoles
    };
  }

  static buildComponentClass(rawSpec) {
    return this.createClassFromSpec(rawSpec).ComponentClass;
  }

  /**
   * Builds a `HardwareComponent` subclass from a normalized datasheet or Custom Component Studio specification.
   * @param {object} rawSpec
   */
  static createClassFromSpec(rawSpec) {
    const spec = this.normalizeSpec(rawSpec);
    const pcbColorHex = parseColorHex(spec.color, 0x0f766e);
    const compiledScriptEvaluator = spec.evaluateScript
      ? this.compileEvaluateScript(spec.evaluateScript)
      : null;

    class DynamicHardwareComponent extends HardwareComponent {
      static typeId = spec.typeId;
      static category = spec.category;
      static displayName = spec.name;
      static summary = spec.description;
      static customSpec = spec;
      static isEnvironmentProp = Boolean(spec.isEnvironmentProp);
      static obstacleProfile = spec.obstacleProfile || null;

      getDefaultState() {
        const hasPlunger = Array.isArray(spec.parts) && spec.parts.some((p) => p.partRole === 'plunger');
        const base = {
          active: Boolean(spec.isEnvironmentProp),
          energized: false,
          triggered: false,
          angle: 0,
          speedNormalized: 0,
          currentMa: 0
        };
        if (hasPlunger || spec.category === 'switch') {
          base.pressed = false;
        }
        return base;
      }

      buildMesh() {
        const [w, h, d] = spec.dimensions;
        this._roleParts = {
          emissive: [],
          rotor: [],
          pivot: [],
          plunger: []
        };

        /** @type {Map<string, { center: [number, number, number], halfExtents: [number, number, number] }>} */
        const boundsById = new Map();

        if (Array.isArray(spec.parts) && spec.parts.length > 0) {
          // Codex Modeling Studio v2 Declarative Parts Tree
          const rootBounds = {
            center: [0, h * 0.5, 0],
            halfExtents: [w * 0.5, h * 0.5, d * 0.5]
          };
          boundsById.set('root', rootBounds);
          boundsById.set('pcb', rootBounds);

          for (const part of spec.parts) {
            const { geometry, halfExtents } = buildPartGeometry(part);
            const partMat = buildPartMaterial(part, pcbColorHex);
            const basePos = resolvePartAttachmentPosition(part, halfExtents, boundsById);

            boundsById.set(part.id, { center: basePos, halfExtents });
            boundsById.set(part.id.toLowerCase(), { center: basePos, halfExtents });
            if (part.name) {
              boundsById.set(part.name, { center: basePos, halfExtents });
              boundsById.set(part.name.toLowerCase(), { center: basePos, halfExtents });
            }

            // Expand repeat modifier (`repeat: { count, step: [dx, dy, dz] }`)
            const repeatCount = Math.max(1, Math.min(64, Number(part.repeat?.count ?? 1)));
            const repeatStep = Array.isArray(part.repeat?.step)
              ? [
                  Number(part.repeat.step[0]) || 0,
                  Number(part.repeat.step[1]) || 0,
                  Number(part.repeat.step[2]) || 0
                ]
              : [0, 0, 0];

            const baseInstances = [];
            for (let i = 0; i < repeatCount; i++) {
              baseInstances.push([
                Number((basePos[0] + i * repeatStep[0]).toFixed(3)),
                Number((basePos[1] + i * repeatStep[1]).toFixed(3)),
                Number((basePos[2] + i * repeatStep[2]).toFixed(3))
              ]);
            }

            // Expand symmetry mirror modifier (`mirror: { axis: 'x' | 'z' | 'xz' }`)
            const mirrorAxis = String(part.mirror?.axis || '').toLowerCase();
            const finalPositions = [...baseInstances];
            if (mirrorAxis.includes('x')) {
              for (const [ix, iy, iz] of baseInstances) {
                if (Math.abs(ix) > 1e-3) {
                  finalPositions.push([-ix, iy, iz]);
                }
              }
            }
            if (mirrorAxis.includes('z')) {
              const snapshot = [...finalPositions];
              for (const [ix, iy, iz] of snapshot) {
                if (Math.abs(iz) > 1e-3) {
                  finalPositions.push([ix, iy, -iz]);
                }
              }
            }

            finalPositions.forEach((posCoords, copyIdx) => {
              const meshMat = copyIdx === 0 ? partMat : partMat.clone();
              const mesh = new THREE.Mesh(geometry, meshMat);
              mesh.position.set(posCoords[0], posCoords[1], posCoords[2]);
              if (Array.isArray(part.rotation) && part.rotation.length === 3) {
                mesh.rotation.set(
                  Number(part.rotation[0]) || 0,
                  Number(part.rotation[1]) || 0,
                  Number(part.rotation[2]) || 0
                );
              }
              mesh.castShadow = true;
              mesh.receiveShadow = true;
              mesh.name = copyIdx === 0 ? part.id : `${part.id}_${copyIdx}`;
              mesh.userData.partId = part.id;
              mesh.userData.partRole = part.partRole || null;
              mesh.userData.basePosition = [...posCoords];
              mesh.userData.baseColorHex = meshMat.color.getHex();
              this.group.add(mesh);

              if (copyIdx === 0) {
                this.refs[part.id] = mesh;
                if (!this.refs.pcb) {
                  this.refs.pcb = mesh;
                }
              }

              if (part.partRole === 'emissive') {
                this._roleParts.emissive.push({ mesh, material: meshMat, part });
                if (!this.refs.statusLedMat) {
                  this.refs.statusLedMat = meshMat;
                }
              } else if (part.partRole === 'rotor') {
                this._roleParts.rotor.push({ mesh, part });
              } else if (part.partRole === 'pivot') {
                this._roleParts.pivot.push({ mesh, part });
              } else if (part.partRole === 'plunger') {
                this._roleParts.plunger.push({ mesh, part });
              }
            });
          }
        } else {
          // Default Breakout / Prop Geometry
          const pcbMat = new THREE.MeshStandardMaterial({
            color: pcbColorHex,
            roughness: 0.46,
            metalness: 0.14
          });
          const pcbMesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), pcbMat);
          pcbMesh.position.set(0, h * 0.5, 0);
          pcbMesh.castShadow = true;
          pcbMesh.receiveShadow = true;
          this.group.add(pcbMesh);
          this.refs.pcb = pcbMesh;

          if (!spec.isEnvironmentProp) {
            const icW = Math.max(2.6, w * 0.42);
            const icD = Math.max(2.6, d * 0.36);
            const icMesh = new THREE.Mesh(new THREE.BoxGeometry(icW, 1.1, icD), mat('#1c2028', 0.45, 0.15));
            icMesh.position.set(0, h + 0.55, -d * 0.12);
            icMesh.castShadow = true;
            this.group.add(icMesh);
            this.refs.ic = icMesh;

            const statusLedMat = new THREE.MeshStandardMaterial({
              color: 0x10b981,
              emissive: 0x000000,
              emissiveIntensity: 0,
              roughness: 0.3
            });
            const statusLed = new THREE.Mesh(new THREE.SphereGeometry(0.48, 10, 10), statusLedMat);
            statusLed.position.set(w * 0.32, h + 0.35, -d * 0.3);
            this.group.add(statusLed);
            this.refs.statusLedMat = statusLedMat;
            this._roleParts.emissive.push({ mesh: statusLed, material: statusLedMat, part: { id: 'status_led' } });
          }
        }

        if (spec.isEnvironmentProp) {
          this.pins = {};
          return this.group;
        }

        // Physical metallic header pins + electrical pin definitions (Handles)
        const pinGeo = new THREE.CylinderGeometry(0.28, 0.28, 4.2, 8);
        const padGeo = new THREE.CylinderGeometry(0.62, 0.62, 0.2, 12);

        for (const pinSpec of spec.pins) {
          const [px, py, pz] = pinSpec.position;
          const pinMesh = new THREE.Mesh(pinGeo, mat('#d6b24c', 0.25, 0.85));
          pinMesh.position.set(px, py + 1.6, pz);
          this.group.add(pinMesh);

          const padMesh = new THREE.Mesh(padGeo, mat('#c8ccd4', 0.3, 0.8));
          padMesh.position.set(px, h + 0.08, pz);
          this.group.add(padMesh);

          this.definePin(pinSpec.name, [px, py, pz], {
            direction: pinSpec.direction,
            role: pinSpec.role,
            protocol: pinSpec.protocol,
            voltage: pinSpec.voltage,
            maxVoltage: pinSpec.maxVoltage,
            maxCurrent: pinSpec.maxCurrent
          });
        }
        return this.group;
      }

      setupElectricalModel() {
        for (const dipoleSpec of spec.dipoles) {
          this.defineDipole(dipoleSpec);
        }
      }

      hasCustomEvaluator() {
        return Boolean(
          typeof this._customEvaluator === 'function' ||
            typeof spec.evaluate === 'function' ||
            typeof compiledScriptEvaluator === 'function' ||
            (spec.nodeBehavior && typeof spec.nodeBehavior === 'object')
        );
      }

      buildNodePinContext(report = {}, stageEnv = null) {
        const pinContext = super.buildNodePinContext(report, stageEnv);
        if (this.hasCustomEvaluator()) {
          const pwrNames = ['VCC', 'VIN', '5V', '3V3'];
          const hasDrivenSignalInput = Object.entries(pinContext).some(
            ([name, desc]) =>
              !pwrNames.includes(name) &&
              name !== 'GND' &&
              desc &&
              desc.direction !== 'OUT' &&
              Number(desc.voltage || 0) >= 2.0
          );
          if (hasDrivenSignalInput) {
            for (const pwrName of pwrNames) {
              const pwrDesc = pinContext[pwrName];
              if (pwrDesc && Number(pwrDesc.voltage || 0) === 0) {
                pwrDesc.voltage = pwrName === '3V3' ? 3.3 : 5.0;
                pwrDesc.high = true;
                pwrDesc.logicLevel = 1;
              }
            }
          }
        }
        return pinContext;
      }

      onElectricalFlow(report) {
        if (spec.isEnvironmentProp) return;
        const energized = Boolean(report.closedLoop && report.current > 1e-5 && !this.state.burnedOut);
        const currentMa = Number((report.currentMa || 0).toFixed(2));
        if (this.hasCustomEvaluator()) {
          this.setState({
            energized,
            currentMa
          });
        } else {
          this.setState({
            active: energized || Boolean(this.state.triggered),
            energized,
            currentMa
          });
        }
      }

      /**
       * ReactFlow-style Node contract for dynamically generated custom components.
       * Supports:
       * 1. Instance `_customEvaluator`
       * 2. Function `spec.evaluate({ pins, state, dt, stageEnv, report, spec })`
       * 3. Sandboxed string `spec.evaluateScript`
       * 4. Declarative `spec.nodeBehavior` rules (`threshold`, `invert`, `passthrough`)
       */
      evaluate(context) {
        if (typeof this._customEvaluator === 'function') {
          return this._customEvaluator.call(this, context);
        }
        if (typeof spec.evaluate === 'function') {
          return spec.evaluate.call(this, { ...context, spec });
        }
        if (typeof compiledScriptEvaluator === 'function') {
          return compiledScriptEvaluator.call(this, { ...context, spec });
        }
        if (spec.nodeBehavior && typeof spec.nodeBehavior === 'object') {
          const nb = spec.nodeBehavior;
          const inPinName = String(nb.inputPin || 'IN').toUpperCase();
          const outPinName = String(nb.outputPin || 'OUT').toUpperCase();
          const inPin = context.pins?.[inPinName] || {};
          const thresholdV = Number(nb.thresholdVoltage ?? 2.0);
          const outVoltageHigh = Number(nb.outputVoltage ?? 3.3);

          if (nb.type === 'threshold') {
            const triggered = Number(inPin.voltage || 0) >= thresholdV;
            return {
              state: { active: triggered, triggered },
              outputs: {
                [outPinName]: {
                  voltage: triggered ? outVoltageHigh : 0.0,
                  high: triggered,
                  logicLevel: triggered ? 1 : 0
                }
              }
            };
          }
          if (nb.type === 'invert') {
            const high = !(Number(inPin.voltage || 0) >= thresholdV);
            return {
              state: { active: high, triggered: high },
              outputs: {
                [outPinName]: {
                  voltage: high ? outVoltageHigh : 0.0,
                  high,
                  logicLevel: high ? 1 : 0
                }
              }
            };
          }
          if (nb.type === 'passthrough' || nb.type === 'buffer') {
            const vIn = Number(inPin.voltage || 0);
            const high = vIn >= thresholdV;
            return {
              state: { active: high, triggered: high },
              outputs: {
                [outPinName]: {
                  voltage: vIn,
                  high,
                  logicLevel: high ? 1 : 0
                }
              }
            };
          }
        }
        return null;
      }

      onStateChange(newState) {
        const isLit = this.hasCustomEvaluator()
          ? Boolean(newState.active || newState.triggered || newState.ledOn)
          : Boolean(newState.energized || newState.active || newState.triggered || newState.ledOn);
        const emissiveEntries = this._roleParts?.emissive || [];
        for (const entry of emissiveEntries) {
          const matRef = entry.material;
          if (!matRef) continue;
          if (newState.burnedOut) {
            matRef.color.setHex(0xef4444);
            matRef.emissive.setHex(0xef4444);
            matRef.emissiveIntensity = 0.95;
          } else if (isLit) {
            const glowHex = entry.part?.color
              ? parseColorHex(entry.part.color, 0x10b981)
              : 0x10b981;
            matRef.emissive.setHex(glowHex);
            matRef.emissiveIntensity = Number(newState.brightness ?? 1.4);
          } else {
            matRef.emissive.setHex(0x000000);
            matRef.emissiveIntensity = 0;
          }
        }

        const pivotEntries = this._roleParts?.pivot || [];
        for (const entry of pivotEntries) {
          if (!entry.mesh) continue;
          const deg = Number(newState.angle ?? (newState.active ? 90 : 0));
          entry.mesh.rotation.y = (deg * Math.PI) / 180;
        }

        const plungerEntries = this._roleParts?.plunger || [];
        for (const entry of plungerEntries) {
          if (!entry.mesh) continue;
          const baseY = Number(entry.mesh.userData?.basePosition?.[1] ?? entry.mesh.position.y);
          entry.mesh.position.y = newState.pressed ? baseY - 0.7 : baseY;
        }
      }

      update(dt = 0.016) {
        const rotorEntries = this._roleParts?.rotor || [];
        if (rotorEntries.length === 0) return;
        let speed = 0;
        if (typeof this.state.rpm === 'number') {
          speed = this.state.active === false ? 0 : this.state.rpm / 600;
        } else if (this.hasCustomEvaluator()) {
          speed = Number(this.state.speedNormalized) || (this.state.active ? 1.0 : 0.0);
        } else {
          speed =
            Number(this.state.speedNormalized) ||
            (this.state.energized || this.state.active ? 1.0 : 0.0);
        }
        if (Math.abs(speed) <= 0.001) return;

        for (const entry of rotorEntries) {
          if (!entry.mesh) continue;
          const axis = String(entry.part?.spinAxis || 'y').toLowerCase();
          const deltaRad = speed * 12.0 * dt;
          if (axis === 'x') entry.mesh.rotation.x += deltaRad;
          else if (axis === 'z') entry.mesh.rotation.z += deltaRad;
          else entry.mesh.rotation.y += deltaRad;
        }
      }

      onTick(dt = 0.016) {
        return this.update(dt);
      }

      toScenarioData() {
        const base = super.toScenarioData();
        base.customSpec = spec;
        return base;
      }
    }

    return { ComponentClass: DynamicHardwareComponent, spec };
  }

  /**
   * Normalizes, builds, and registers (or updates) a dynamic 3D component class in `ComponentRegistry`.
   * @param {object} rawSpec
   * @param {import('../registry/ComponentRegistry.js').ComponentRegistry} [registry]
   */
  static registerFromSpec(rawSpec, registry = hardwareRegistry) {
    const { ComponentClass, spec } = this.createClassFromSpec(rawSpec);
    if (typeof registry.registerOrReplace === 'function') {
      registry.registerOrReplace(ComponentClass);
    } else if (!registry.has(spec.typeId)) {
      registry.register(ComponentClass);
    }
    registeredSpecsByTypeId.set(spec.typeId, spec);
    return {
      typeId: spec.typeId,
      spec,
      ComponentClass
    };
  }

  /**
   * Removes a custom component specification from the runtime registry and `ComponentRegistry`.
   * @param {string} typeId
   * @param {import('../registry/ComponentRegistry.js').ComponentRegistry} [registry]
   */
  static unregisterSpec(typeId, registry = hardwareRegistry) {
    registeredSpecsByTypeId.delete(typeId);
    if (registry && typeof registry.unregisterType === 'function') {
      registry.unregisterType(typeId);
    }
  }

  /**
   * Synthesizes a deterministic datasheet specification for a part code (e.g. `BME280`, `MPU6050`, `INA219`)
   * when offline or when instant local datasheet generation is requested.
   * @param {string} partCode
   */
  static synthesizeOfflineDatasheetSpec(partCode = 'BME280') {
    const upper = String(partCode || 'BME280').trim().toUpperCase();
    if (BUILTIN_DATASHEET_SPECS[upper]) {
      return structuredClone(BUILTIN_DATASHEET_SPECS[upper]);
    }

    const slug = upper.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    return this.normalizeSpec({
      typeId: `sensor.${slug}`,
      name: `${upper} Digital Sensor Breakout`,
      category: 'sensor',
      description: `${upper} I2C/GPIO hardware breakout module with 3.3V/5V logic pins.`,
      packageType: 'breakout',
      color: '#0F766E',
      dimensions: [12.0, 1.6, 14.0],
      pins: [
        { name: 'VCC', position: [-3.81, -2.2, 5.2], direction: 'input', role: 'power_in', voltage: 3.3, maxVoltage: 5.5 },
        { name: 'GND', position: [-1.27, -2.2, 5.2], direction: 'bidirectional', role: 'ground', voltage: 0, maxVoltage: 0 },
        { name: 'SCL', position: [1.27, -2.2, 5.2], direction: 'input', role: 'clock', protocol: 'i2c', voltage: 3.3, maxVoltage: 5.5 },
        { name: 'SDA', position: [3.81, -2.2, 5.2], direction: 'bidirectional', role: 'data', protocol: 'i2c', voltage: 3.3, maxVoltage: 5.5 }
      ],
      dipoles: [
        { pinA: 'VCC', pinB: 'GND', resistance: 1150, forwardVoltage: 0, unidirectional: false, maxCurrent: 0.05 }
      ]
    });
  }

  /**
   * Returns a registered custom component specification by `typeId`.
   * @param {string} typeId
   */
  static getSpec(typeId) {
    return registeredSpecsByTypeId.get(typeId) || null;
  }

  /**
   * Returns all custom component specifications registered in this session.
   * @returns {object[]}
   */
  static getRegisteredSpecs() {
    return [...registeredSpecsByTypeId.values()];
  }
}
