import { BaseAudioTransducer } from '../../core/components/base/BaseAudioTransducer.js';
import { cyl, mat } from '../primitives/GeometryFactory.js';

/**
 * Piezo Acoustic Buzzer.
 * Inherits frequencyHz / playing state management from BaseAudioTransducer.
 */
export class PiezoBuzzerComponent extends BaseAudioTransducer {
  static typeId = 'audio.piezo';
  static category = 'audio';
  static displayName = 'Piezo Buzzer';
  static summary = 'Audio Frequency Tone Transducer (tone / noTone)';
  static defaultLessonId = 'buzzer';

  constructor(options = {}) {
    super({
      name: options.name || 'Piezo Buzzer',
      description:
        options.description || 'Clicks at audio frequencies when driven by tone(pin, freq).',
      calloutOffset: options.calloutOffset || [58, -42],
      anchorOffset: options.anchorOffset || [0, 13, 0],
      ...options
    });
  }

  buildMesh() {
    const legMat = mat('#c8c4b8', 0.3, 0.75);
    this.group.add(cyl(0.45, 0.45, 5, 12, legMat, -2.5, 0, 0));
    this.group.add(cyl(0.45, 0.45, 5, 12, legMat, 2.5, 0, 0));

    this.group.add(cyl(6.2, 6.2, 8.5, 28, mat('#222633', 0.48), 0, 4, 0));
    this.group.add(cyl(1.8, 1.8, 0.5, 20, mat('#0f1219', 0.85), 0, 12.3, 0));
    this.group.add(cyl(0.9, 0.9, 0.6, 16, mat('#d4a84e', 0.35, 0.7), 0, 12.2, 0));

    this.definePin('POSITIVE', [-2.5, 0.3, 0]);
    this.definePin('NEGATIVE', [2.5, 0.3, 0]);
  }
}
