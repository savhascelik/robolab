import * as THREE from 'three';
import { HardwareComponent } from '../../core/components/HardwareComponent.js';

/**
 * 3D Acoustic & Optical Target Obstacle Wall (`prop.obstacle_wall`).
 * A passive, movable 3D stage prop with zero electrical pins, used to test
 * ultrasonic distance sensors (HC-SR04), laser ToF sensors (VL53L1X), and vision cameras (IMX219).
 */
export class ObstacleWallProp extends HardwareComponent {
  static typeId = 'prop.obstacle_wall';
  static category = 'props';
  static isEnvironmentProp = true;
  static displayName = '@i18n:hw.prop.obstacle_wall.name';
  static description = '@i18n:hw.prop.obstacle_wall.desc';
  static anchorOffset = [0, 8.5, 0];
  static calloutOffset = [0, 12, 0];
  static obstacleProfile = {
    isObstacle: true,
    visualClass: 'obstacle_wall',
    boundingRadiusCm: 0,
    reflectivity: 0.98
  };

  getDefaultState() {
    return {
      active: true,
      visualClass: 'obstacle_wall',
      reflectivity: 0.98
    };
  }

  buildMesh(options = {}) {
    const wallWidth = Number(options.width || 14);
    const wallHeight = Number(options.height || 10);
    const wallDepth = Number(options.depth || 2.2);

    // Weighted Lab Base Stand
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.6,
      metalness: 0.35
    });
    const baseGeo = new THREE.BoxGeometry(wallWidth + 1.6, 1.2, wallDepth + 3.2);
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.set(0, 0.6, 0);
    this.group.add(baseMesh);

    // Acoustic/Optical Calibration Wall Panel
    const wallMat = new THREE.MeshStandardMaterial({
      color: options.color || 0x334155,
      roughness: 0.45,
      metalness: 0.15
    });
    const wallGeo = new THREE.BoxGeometry(wallWidth, wallHeight, wallDepth);
    const wallMesh = new THREE.Mesh(wallGeo, wallMat);
    wallMesh.position.set(0, 1.2 + wallHeight * 0.5, 0);
    this.group.add(wallMesh);
    this.refs.wall = wallMesh;

    // High-visibility Yellow/Amber Acoustic Target Crosshair Plate
    const targetMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.35,
      metalness: 0.1,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.08
    });
    const stripeGeo = new THREE.BoxGeometry(wallWidth - 1.4, 1.4, wallDepth + 0.16);
    const topStripe = new THREE.Mesh(stripeGeo, targetMat);
    topStripe.position.set(0, 1.2 + wallHeight - 1.2, 0);
    const bottomStripe = new THREE.Mesh(stripeGeo, targetMat);
    bottomStripe.position.set(0, 2.4, 0);
    this.group.add(topStripe, bottomStripe);

    // Center Fiducial Target Bullseye Ring (for Camera & Laser ToF alignment)
    const ringGeo = new THREE.RingGeometry(1.1, 1.9, 24);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide
    });
    const frontRing = new THREE.Mesh(ringGeo, ringMat);
    frontRing.position.set(0, 1.2 + wallHeight * 0.5, wallDepth * 0.5 + 0.05);
    const backRing = frontRing.clone();
    backRing.position.set(0, 1.2 + wallHeight * 0.5, -wallDepth * 0.5 - 0.05);
    this.group.add(frontRing, backRing);

    // Zero electrical pins required — pure physical 3D obstacle
    this.pins = {};
  }
}
