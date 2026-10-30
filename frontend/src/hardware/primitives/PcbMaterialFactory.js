import { mat } from './GeometryFactory.js';

/**
 * Shared Industrial PCB, Metal, Elastomer & Emissive Material Factory
 * backed by `GeometryFactory.mat()`.
 */
export class PcbMaterialFactory {
  static getMattePlastic(color = 0x11151f) {
    return mat(color, 0.78, 0.08);
  }

  static getSilkscreenWhite() {
    return mat(0xf8fafc, 0.55, 0.05);
  }

  static getRedSolderMask() {
    return mat(0xdc2626, 0.36, 0.14);
  }

  static getEmissiveLed(color = 0x10b981, intensity = 1.0) {
    return mat(color, 0.25, 0.1, {
      emissive: color,
      emissiveIntensity: intensity
    });
  }
}
