import * as THREE from 'three';
import { box, cyl, glowSprite, mat } from '../primitives/GeometryFactory.js';

/**
 * Reusable 3D PCB Sub-Component Builders shared across MCU & SBC Host Boards
 * (Arduino Uno R3, ESP32 DevKit V1, Jetson Nano, etc.).
 */

/**
 * Creates plated PCB mounting holes at the specified [x, z] coordinates and adds them to `root`.
 * @param {THREE.Object3D} root
 * @param {Array<[number, number]>} coords
 * @param {object} [opts]
 */
export function buildMountingHoles(root, coords, opts = {}) {
  const {
    y = 2.45,
    padRadius = 2.2,
    holeRadius = 1.15,
    padColor = '#d9b468',
    holeColor = '#151a28'
  } = opts;
  const padMat = mat(padColor, 0.32, 0.75);
  const holeMat = mat(holeColor, 0.9);
  for (const [hx, hz] of coords) {
    root.add(cyl(padRadius, padRadius, 0.2, 18, padMat, hx, y, hz));
    root.add(cyl(holeRadius, holeRadius, 0.28, 14, holeMat, hx, y, hz));
  }
}

/**
 * Creates a surface-mount (SMD) indicator LED bank and returns the `leds` reference map
 * compatible with `BaseHostBoard.setOnboardLed()`.
 * @param {THREE.Object3D} root
 * @param {Array<{ id: string, x: number, z: number, color: string, active?: boolean }>} smdDefs
 * @param {number} [y=2.45]
 * @returns {Record<string, { lensMat: THREE.MeshStandardMaterial, glow: THREE.Sprite, color: string }>}
 */
export function buildSmdLedBank(root, smdDefs, y = 2.45) {
  const leds = {};
  for (const def of smdDefs) {
    const lensMat = mat(def.color, 0.25, 0, {
      emissive: new THREE.Color(def.color),
      emissiveIntensity: def.active ? 1.4 : 0.08
    });
    const body = box(2.1, 1.05, 1.3, mat('#e8e2d5', 0.4), def.x, y, def.z);
    const lens = box(1.25, 1.2, 1.1, lensMat, def.x, y + 0.05, def.z);
    const glow = glowSprite(def.color, 9.2);
    glow.position.set(def.x, y + 1.7, def.z);
    glow.material.opacity = def.active ? 0.66 : 0;
    root.add(body, lens, glow);
    leds[def.id] = { lensMat, glow, color: def.color };
  }
  return leds;
}

/**
 * Creates a miniature SMD tactile switch (e.g., Reset / EN / BOOT button).
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @param {object} [opts]
 * @returns {THREE.Group}
 */
export function createSmdTactileSwitch(x, y, z, opts = {}) {
  const { width = 4.5, depth = 3.5, capColor = '#252a36', capRadius = 1.25 } = opts;
  const group = new THREE.Group();
  group.position.set(x, y, z);
  group.add(box(width, 1.7, depth, mat('#d5d8e0', 0.32, 0.72), 0, 0, 0));
  group.add(cyl(capRadius, capRadius, 1.2, 16, mat(capColor, 0.42), 0, 1.7, 0));
  return group;
}
