import * as THREE from 'three';
import { BasePowerModule } from '../../core/components/base/BasePowerModule.js';
import { box, cyl, makeHeaderBlock, mat } from '../primitives/GeometryFactory.js';
import { buildSmdLedBank } from '../subcomponents/BoardSubcomponents.js';

/**
 * Dual-18650 Lithium Power Bay + 5V/4A Synchronous Buck Regulator & INA219 I2C Power Telemetry Module.
 * Extends `BasePowerModule` (`extends HardwareComponent`).
 *Powers the NVIDIA Jetson Nano SBC while reporting real-time bus voltage and current over I2C (`SCL`, `SDA`).
 */
export class Ina219PowerTelemetryBay extends BasePowerModule {
  static typeId = 'power.ina219_buck_bay';
  static category = 'power';
  static displayName = 'INA219 Dual-18650 5V/4A Power Telemetry Bay';
  static summary = 'Dual-18650 Lithium Carrier with 5V/4A Toroidal Buck Converter & INA219 I2C Current Sensor';

  constructor(options = {}) {
    super({
      name: options.name || 'INA219 Dual-18650 5V/4A Power Telemetry Bay',
      description:
        options.description ||
        'High-current 5V/4A synchronous step-down power bay with dual 18650 lithium-ion cells, R100 precision current shunt resistor, and INA219 I2C telemetry IC.',
      ...options
    });
    this.state.nominalVoltage = 7.4;
    this.state.regulatedVoltage = 5.0;
    this.state.cellCount = 2;
    this.state.capacityMah = 5200;
    this.setupElectricalModel({ outputVoltage: 5.0, internalResistance: 420, maxCurrent: 6.0 });
  }

  buildMesh() {
    const g = this.group;
    const pcbMat = mat('#0f172a', 0.48, 0.16);
    const sledMat = mat('#1e293b', 0.55, 0.12);
    const cellJacketMat = mat('#0284c7', 0.34, 0.25);
    const steelMat = mat('#e2e8f0', 0.25, 0.88);
    const copperCoilMat = mat('#d97706', 0.32, 0.85);

    // 1. Power Carrier PCB (58 x 2.0 x 38 mm)
    g.add(box(58.0, 2.0, 38.0, pcbMat, 0, 1.0, 0));

    // 2. Dual 18650 Battery Cradle + Cylindrical Lithium-Ion Cells
    g.add(box(44.0, 5.5, 32.0, sledMat, -5.5, 4.2, 0));
    for (const zCell of [-7.8, 7.8]) {
      const cellBody = cyl(6.8, 6.8, 41.0, 28, cellJacketMat, -5.5, 8.8, zCell);
      cellBody.rotation.z = Math.PI / 2;
      g.add(cellBody);

      // Positive terminal button & negative spring contact
      const posCap = cyl(3.4, 3.4, 1.4, 20, steelMat, 15.4, 8.8, zCell);
      posCap.rotation.z = Math.PI / 2;
      g.add(posCap);

      const negPlate = box(1.2, 8.5, 9.5, steelMat, -26.5, 7.2, zCell);
      g.add(negPlate);
    }

    // 3. 5V/4A Synchronous Buck Converter Section (Toroidal Inductor + Dual Solid Capacitors)
    const inductorCore = cyl(4.8, 4.8, 4.2, 24, mat('#18181b', 0.45, 0.3), 21.5, 4.2, -9.5);
    g.add(inductorCore);
    const copperWinding = cyl(5.2, 5.2, 2.8, 24, copperCoilMat, 21.5, 4.2, -9.5);
    g.add(copperWinding);

    for (const zCap of [-1.5, 5.5]) {
      g.add(cyl(3.0, 3.0, 6.2, 20, steelMat, 22.0, 5.0, zCap));
    }

    // 4. INA219 Precision Current Shunt (`R100` SMD Resistor) + SOT-23-8 INA219 IC
    g.add(box(5.2, 1.4, 3.2, mat('#111827', 0.4, 0.2), 18.5, 2.7, 12.2));
    g.add(box(3.2, 1.2, 3.0, mat('#090d16', 0.4, 0.2), 24.5, 2.6, 12.2));

    this.refs.leds = buildSmdLedBank(
      g,
      [{ id: '5v_ok', x: 25.5, z: -15.0, color: '#10b981', active: true }],
      2.1
    );

    // 5. 5-Pin Power & I2C Telemetry Header (`VCC`, `GND`, `SCL`, `SDA`, `VOUT_5V`)
    const hdr = makeHeaderBlock(5, 2.54);
    hdr.position.set(25.5, 3.2, 4.0);
    g.add(hdr);

    const pinDefs = [
      { name: 'VCC', z: -5.08, dir: 'OUT', role: 'VCC_SOURCE', proto: 'DC' },
      { name: 'GND', z: -2.54, dir: 'BIDIR', role: 'GND_REF', proto: 'DC' },
      { name: 'SCL', z: 0, dir: 'IN', role: 'I2C_SCL', proto: 'I2C' },
      { name: 'SDA', z: 2.54, dir: 'BIDIR', role: 'I2C_SDA', proto: 'I2C' },
      { name: 'VOUT_5V', z: 5.08, dir: 'OUT', role: 'VCC_SOURCE', proto: 'DC' }
    ];
    for (const p of pinDefs) {
      this.definePin(p.name, new THREE.Vector3(25.5, 5.2, 4.0 + p.z), {
        direction: p.dir,
        role: p.role,
        protocol: p.proto
      });
    }
  }
}
