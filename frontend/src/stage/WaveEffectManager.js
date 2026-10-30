import * as THREE from 'three';

/**
 * Single-Responsibility Manager for Layer-1 Expanding Acoustic / Ultrasonic Wave Rings.
 */
export class WaveEffectManager {
  constructor(scene) {
    this.waveGroup = new THREE.Group();
    scene.add(this.waveGroup);
    this.waves = [];
  }

  spawn(originVec3, colorHex = '#1aa3a1') {
    const geo = new THREE.RingGeometry(1.4, 2.2, 32);
    geo.rotateX(-Math.PI / 2);
    const matRing = new THREE.MeshBasicMaterial({
      color: new THREE.Color(colorHex),
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const mesh = new THREE.Mesh(geo, matRing);
    mesh.position.copy(originVec3);
    mesh.layers.set(1);
    this.waveGroup.add(mesh);
    this.waves.push({ mesh, age: 0 });
  }

  update(dt) {
    for (let i = this.waves.length - 1; i >= 0; i--) {
      const w = this.waves[i];
      w.age += dt;
      const s = 1 + w.age * 16;
      w.mesh.scale.set(s, 1, s);
      w.mesh.material.opacity = Math.max(0, 0.85 * (1 - w.age / 1.1));
      if (w.age >= 1.1) {
        this.waveGroup.remove(w.mesh);
        w.mesh.geometry.dispose();
        w.mesh.material.dispose();
        this.waves.splice(i, 1);
      }
    }
  }

  clear() {
    for (const w of this.waves) {
      this.waveGroup.remove(w.mesh);
      w.mesh.geometry.dispose();
      w.mesh.material.dispose();
    }
    this.waves = [];
  }
}
