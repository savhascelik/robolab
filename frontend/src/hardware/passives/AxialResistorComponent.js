import { BasePassiveComponent } from '../../core/components/base/BasePassiveComponent.js';
import { cyl, mat } from '../primitives/GeometryFactory.js';

/**
 * Axial Carbon-Film Resistor (Default: 220Ω Red-Red-Brown-Gold).
 * Inherits passive component contract from BasePassiveComponent.
 */
export class AxialResistorComponent extends BasePassiveComponent {
  static typeId = 'passive.resistor';
  static category = 'passives';
  static displayName = '220 Ω Axial Resistor';
  static summary = 'Current-Limiting Carbon Film Resistor';
  static defaultLessonId = 'blink';

  constructor(options = {}) {
    super({
      name: options.name || '220 Ω Resistor',
      description:
        options.description ||
        'Limits electrical current to protect the LED from burning out.',
      calloutOffset: options.calloutOffset || [-48, 44],
      anchorOffset: options.anchorOffset || [0, 7, 0],
      ...options
    });
  }

  buildMesh(options = {}) {
    const leadMat = mat('#c8c4b8', 0.3, 0.75);
    this.group.add(cyl(0.42, 0.42, 6.5, 12, leadMat, -6.5, 0, 0));
    this.group.add(cyl(0.42, 0.42, 6.5, 12, leadMat, 6.5, 0, 0));
    const bridge = cyl(0.42, 0.42, 13, 12, leadMat, 0, 6.3, 0);
    bridge.rotation.z = Math.PI / 2;
    this.group.add(bridge);

    const bodyMat = mat('#dfc08e', 0.48);
    const center = cyl(1.65, 1.65, 6.8, 20, bodyMat, 0, 4.9, 0);
    center.rotation.z = Math.PI / 2;
    this.group.add(center);

    const bands = options.bands || ['#d93829', '#d93829', '#7a4424', '#d4a638'];
    bands.forEach((bCol, i) => {
      const band = cyl(1.72, 1.72, 0.65, 20, mat(bCol, 0.35), -2.2 + i * 1.45, 4.85, 0);
      band.rotation.z = Math.PI / 2;
      this.group.add(band);
    });

    this.definePin('LEAD_A', [-6.5, 0.3, 0]);
    this.definePin('LEAD_B', [6.5, 0.3, 0]);
  }
}
