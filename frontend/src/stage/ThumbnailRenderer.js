import * as THREE from 'three';

const THUMB_CONFIG_BY_LESSON = {
  board: { typeId: 'board.arduino_uno', camSize: 42 },
  blink: { typeId: 'led.single', options: { color: '#e6392e' }, camSize: 14 },
  button: { typeId: 'button.tactile', camSize: 11 },
  knob: { typeId: 'sensor.potentiometer', camSize: 13 },
  rgb: { typeId: 'led.single', options: { color: '#b844e6' }, camSize: 14 },
  sensor: { typeId: 'sensor.ultrasonic', camSize: 20 },
  buzzer: { typeId: 'audio.piezo', camSize: 13 },
  motor: { typeId: 'motor.dc', camSize: 20 },
  esp32: { typeId: 'board.esp32_devkit', camSize: 32 }
};

/**
 * Single-Responsibility Offscreen 3D Thumbnail Generator for Lesson Strip Cards.
 * Uses `ComponentRegistry` to instantiate clean preview models without hardcoded switch blocks.
 */
export class ThumbnailRenderer {
  constructor(renderer, registry) {
    this.renderer = renderer;
    this.registry = registry;
  }

  render(lessonId) {
    if (typeof document === 'undefined' || !this.renderer) return '';

    const cfg = THUMB_CONFIG_BY_LESSON[lessonId] || THUMB_CONFIG_BY_LESSON.motor;
    const ComponentClass = this.registry.getClass(cfg.typeId);
    const tempComponent = new ComponentClass(cfg.options || {});

    const thumbScene = new THREE.Scene();
    const hemi = new THREE.HemisphereLight('#fffdf8', '#d8c4a0', 1.6);
    const dir = new THREE.DirectionalLight('#fff8eb', 1.6);
    dir.position.set(30, 50, 40);
    thumbScene.add(hemi, dir, tempComponent.group);

    const camSize = cfg.camSize;
    const cam = new THREE.OrthographicCamera(
      -camSize * 1.15,
      camSize * 1.15,
      camSize,
      -camSize,
      -100,
      200
    );
    cam.position.set(35, 32, 38);
    cam.lookAt(0, 6, 0);

    const prevClear = new THREE.Color();
    this.renderer.getClearColor(prevClear);
    const prevAlpha = this.renderer.getClearAlpha();

    const rt = new THREE.WebGLRenderTarget(160, 140, {
      type: THREE.UnsignedByteType
    });
    this.renderer.setClearColor('#f6eddd', 0);
    this.renderer.setRenderTarget(rt);
    this.renderer.clear();
    this.renderer.render(thumbScene, cam);

    const pixels = new Uint8Array(160 * 140 * 4);
    this.renderer.readRenderTargetPixels(rt, 0, 0, 160, 140, pixels);
    rt.dispose();
    tempComponent.dispose();

    this.renderer.setRenderTarget(null);
    this.renderer.setClearColor(prevClear, prevAlpha);

    const off = document.createElement('canvas');
    off.width = 160;
    off.height = 140;
    const ctx = off.getContext('2d');
    const imgData = ctx.createImageData(160, 140);
    for (let y = 0; y < 140; y++) {
      const srcRow = (139 - y) * 160 * 4;
      const dstRow = y * 160 * 4;
      imgData.data.set(pixels.subarray(srcRow, srcRow + 160 * 4), dstRow);
    }
    ctx.putImageData(imgData, 0, 0);
    return off.toDataURL('image/png');
  }
}
