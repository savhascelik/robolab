import { BaseButton } from '../../core/components/base/BaseButton.js';
import { box, cyl, mat } from '../primitives/GeometryFactory.js';

/**
 * Standard 6x6mm Breadboard Tactile Push Button.
 * Inherits press/release state, digital logic levels, and plunger kinematics from BaseButton.
 */
export class TactilePushButton extends BaseButton {
  static typeId = 'button.tactile';
  static category = 'buttons';
  static displayName = 'Tactile Push Button';
  static summary = 'Momentary SPST Breadboard Switch';
  static defaultLessonId = 'button';

  constructor(options = {}) {
    super({
      name: options.name || 'Push Button',
      description:
        options.description || 'Momentary switch that bridges its contacts while pressed.',
      calloutOffset: options.calloutOffset || [-45, -42],
      anchorOffset: options.anchorOffset || [0, 10, 0],
      ...options
    });
  }

  getDefaultState() {
    return {
      ...super.getDefaultState(),
      plungerRestY: 7.8,
      plungerStroke: 0.9,
      capColor: '#e04838'
    };
  }

  buildMesh(options = {}) {
    const capColor = options.capColor || this.defaultState.capColor;
    const legMat = mat('#c8c4b8', 0.3, 0.75);
    for (const lx of [-3.2, 3.2]) {
      for (const lz of [-3.2, 3.2]) {
        this.group.add(box(0.7, 4.2, 0.7, legMat, lx, 0, lz));
      }
    }

    this.group.add(box(8.2, 4.2, 8.2, mat('#252a36', 0.55), 0, 3.2, 0));
    this.group.add(box(7.4, 0.6, 7.4, mat('#d4d0c4', 0.35, 0.65), 0, 7.4, 0));

    const plunger = cyl(2.5, 2.5, 2.6, 24, mat(capColor, 0.4), 0, 7.8, 0);
    this.group.add(plunger);
    this.refs.plunger = plunger;

    // Legacy userData compatibility
    this.group.userData.plunger = plunger;

    this.definePin('TERMINAL_A', [-3.2, 0.3, -3.2]);
    this.definePin('TERMINAL_B', [3.2, 0.3, 3.2]);
  }
}
