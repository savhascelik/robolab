import * as THREE from 'three';
import { HardwareComponent } from '../../core/components/HardwareComponent.js';

/**
 * 3D Plush Toy Bear Obstacle & Vision Target (`prop.toy_bear`).
 * A passive, movable 3D stage prop with zero electrical pins, designed for testing
 * ultrasonic/laser proximity detection and AI camera object recognition (`visualClass: 'toy_bear'`).
 */
export class ToyBearProp extends HardwareComponent {
  static typeId = 'prop.toy_bear';
  static category = 'props';
  static isEnvironmentProp = true;
  static displayName = '@i18n:hw.prop.toy_bear.name';
  static description = '@i18n:hw.prop.toy_bear.desc';
  static anchorOffset = [0, 9.5, 0];
  static calloutOffset = [0, 12.5, 0];
  static obstacleProfile = {
    isObstacle: true,
    visualClass: 'toy_bear',
    boundingRadiusCm: 0,
    reflectivity: 0.88
  };

  getDefaultState() {
    return {
      active: true,
      visualClass: 'toy_bear',
      reflectivity: 0.88
    };
  }

  buildMesh(options = {}) {
    const furMat = new THREE.MeshStandardMaterial({
      color: options.color || 0xb45309,
      roughness: 0.85,
      metalness: 0.05
    });
    const bellyMat = new THREE.MeshStandardMaterial({
      color: 0xfde68a,
      roughness: 0.8,
      metalness: 0.05
    });
    const darkMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.25,
      metalness: 0.2
    });
    const pedestalMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.55,
      metalness: 0.3
    });

    // Circular Stage Token Base
    const baseMesh = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.9, 0.8, 24), pedestalMat);
    baseMesh.position.set(0, 0.4, 0);
    this.group.add(baseMesh);

    // Torso
    const torso = new THREE.Mesh(new THREE.SphereGeometry(2.6, 20, 16), furMat);
    torso.scale.set(1.0, 1.18, 0.88);
    torso.position.set(0, 3.5, 0);
    this.group.add(torso);
    this.refs.torso = torso;

    // Belly Patch
    const belly = new THREE.Mesh(new THREE.SphereGeometry(1.75, 16, 12), bellyMat);
    belly.scale.set(0.95, 1.1, 0.55);
    belly.position.set(0, 3.45, 1.65);
    this.group.add(belly);

    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(2.15, 20, 16), furMat);
    head.position.set(0, 7.1, 0.15);
    this.group.add(head);
    this.refs.head = head;

    // Ears
    const earGeo = new THREE.SphereGeometry(0.82, 14, 12);
    const leftEar = new THREE.Mesh(earGeo, furMat);
    leftEar.position.set(-1.65, 8.75, 0.1);
    const rightEar = new THREE.Mesh(earGeo, furMat);
    rightEar.position.set(1.65, 8.75, 0.1);
    this.group.add(leftEar, rightEar);

    // Snout & Nose
    const snout = new THREE.Mesh(new THREE.SphereGeometry(0.85, 14, 12), bellyMat);
    snout.scale.set(1.1, 0.85, 0.9);
    snout.position.set(0, 6.75, 1.95);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 10), darkMat);
    nose.position.set(0, 6.95, 2.68);
    this.group.add(snout, nose);

    // Eyes
    const eyeGeo = new THREE.SphereGeometry(0.26, 12, 10);
    const leftEye = new THREE.Mesh(eyeGeo, darkMat);
    leftEye.position.set(-0.78, 7.45, 1.95);
    const rightEye = new THREE.Mesh(eyeGeo, darkMat);
    rightEye.position.set(0.78, 7.45, 1.95);
    this.group.add(leftEye, rightEye);

    // Arms & Legs
    const limbGeo = new THREE.SphereGeometry(0.95, 14, 12);
    const leftArm = new THREE.Mesh(limbGeo, furMat);
    leftArm.scale.set(0.8, 1.35, 0.8);
    leftArm.position.set(-2.65, 4.1, 0.4);
    const rightArm = leftArm.clone();
    rightArm.position.set(2.65, 4.1, 0.4);

    const leftLeg = new THREE.Mesh(limbGeo, furMat);
    leftLeg.scale.set(0.9, 0.9, 1.35);
    leftLeg.position.set(-1.45, 1.45, 1.35);
    const rightLeg = leftLeg.clone();
    rightLeg.position.set(1.45, 1.45, 1.35);

    this.group.add(leftArm, rightArm, leftLeg, rightLeg);

    // Zero electrical pins required — pure physical 3D obstacle & vision target
    this.pins = {};
  }
}
