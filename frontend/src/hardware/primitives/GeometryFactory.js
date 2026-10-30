import * as THREE from 'three';

export const DEG = Math.PI / 180;
const matCache = new Map();

/**
 * Creates or returns a cached MeshStandardMaterial.
 */
export function mat(color, roughness = 0.5, metalness = 0.0, extra = {}) {
  const cleanExtra = { ...extra };
  if (cleanExtra.map === null || cleanExtra.map === undefined) {
    delete cleanExtra.map;
  }

  if (Object.keys(cleanExtra).length === 0) {
    const key = `${color}|${roughness}|${metalness}`;
    if (!matCache.has(key)) {
      matCache.set(
        key,
        new THREE.MeshStandardMaterial({
          color: new THREE.Color(color),
          roughness,
          metalness
        })
      );
    }
    return matCache.get(key);
  }
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    roughness,
    metalness,
    ...cleanExtra
  });
}

/**
 * Generates a Three.js CanvasTexture in browser environments, or null in headless Node tests.
 */
export function canvasTex(width, height, drawFn) {
  if (typeof document === 'undefined') {
    return null;
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    drawFn(ctx, width, height);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Creates a shadow-casting box mesh with bottom-origin alignment (y = bottom).
 */
export function box(w, h, d, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y + h / 2, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/**
 * Creates a shadow-casting cylinder mesh with bottom-origin alignment (y = bottom).
 */
export function cyl(rt, rb, h, segs, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, segs), material);
  m.position.set(x, y + h / 2, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/**
 * Creates a Layer-1 additive radial glow Sprite for LEDs (excluded from the ink outline pass).
 */
export function glowSprite(colorHex, size = 18) {
  const tex = canvasTex(128, 128, (ctx) => {
    const c = new THREE.Color(colorHex);
    const r = Math.round(c.r * 255);
    const g = Math.round(c.g * 255);
    const b = Math.round(c.b * 255);
    const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
    grad.addColorStop(0, `rgba(${r},${g},${b},0.95)`);
    grad.addColorStop(0.4, `rgba(${r},${g},${b},0.45)`);
    grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
  });

  const sp = new THREE.Sprite(
    new THREE.SpriteMaterial({
      ...(tex ? { map: tex } : {}),
      color: new THREE.Color(colorHex),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0
    })
  );
  sp.scale.set(size, size, 1);
  sp.layers.set(1);
  return sp;
}

/**
 * Builds a female DuPont pin header block.
 */
export function makeHeaderBlock(pinCount, pitch = 2.54) {
  const group = new THREE.Group();
  const length = pinCount * pitch + 0.6;
  const body = box(length, 8.5, 2.6, mat('#222632', 0.55), 0, 0, 0);
  group.add(body);
  const holeMat = mat('#0d1017', 0.8);
  const rimMat = mat('#c8b88a', 0.35, 0.65);
  const startX = -((pinCount - 1) * pitch) / 2;
  for (let i = 0; i < pinCount; i++) {
    const px = startX + i * pitch;
    group.add(box(1.35, 0.3, 1.35, rimMat, px, 8.35, 0));
    group.add(box(0.95, 0.36, 0.95, holeMat, px, 8.35, 0));
  }
  return group;
}
