import { BaseButton } from '../../core/components/base/BaseButton.js';
import { box, cyl, mat } from '../primitives/GeometryFactory.js';

/**
 * Wide-Cap Tactile Arcade Button variant.
 * Inherits all digital logic & plunger kinematics from BaseButton while differentiating
 * with a larger contoured keycap, metallic collar, and deeper 1.6mm mechanical travel.
 */
export class ArcadeCapButton extends BaseButton {
  static typeId = 'button.arcade';
  static category = 'buttons';
  static displayName = 'Arcade Cap Button';
  static summary = 'Heavy-Duty Momentary Cap Switch (1.6mm Travel)';
  static defaultLessonId = 'button';

  constructor(options = {}) {
    super({
      name: options.name || 'Arcade Cap Button',
      description:
        options.description ||
        'Heavy-duty momentary cap button inheriting BaseButton logic with deeper 1.6mm plunger travel.',
      calloutOffset: options.calloutOffset || [-48, -44],
      anchorOffset: options.anchorOffset || [0, 12, 0],
      ...options
    });
  }

  getDefaultState() {
    return {
      ...super.getDefaultState(),
      plungerRestY: 8.6,
      plungerStroke: 1.6,
      capColor: '#1aa3a1'
    };
  }

  buildMesh(options = {}) {
    const capColor = options.capColor || this.defaultState.capColor;
    const legMat = mat('#d9b468', 0.3, 0.8); // Gold-plated pins
    for (const lx of [-3.5, 3.5]) {
      for (const lz of [-3.5, 3.5]) {
        this.group.add(box(0.8, 4.2, 0.8, legMat, lx, 0, lz));
      }
    }

    // Bezel housing & chrome ring
    this.group.add(box(9.6, 4.5, 9.6, mat('#1e222d', 0.5), 0, 3.2, 0));
    this.group.add(cyl(4.6, 4.8, 1.1, 28, mat('#d4d0c4', 0.28, 0.75), 0, 7.6, 0));

    // Contoured wide arcade plunger cap
    const plunger = cyl(3.9, 4.1, 3.2, 28, mat(capColor, 0.35), 0, 8.6, 0);
    this.group.add(plunger);
    this.refs.plunger = plunger;
    this.group.userData.plunger = plunger;

    this.definePin('TERMINAL_A', [-3.5, 0.3, -3.5]);
    this.definePin('TERMINAL_B', [3.5, 0.3, 3.5]);
  }
}
