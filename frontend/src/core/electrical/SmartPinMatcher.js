import { ScenarioSerializer } from '../scenario/ScenarioSerializer.js';

/**
 * Color palette and visual metadata for Flownie-3D port handles & jumper wires.
 */
export const PIN_VISUAL_CATEGORIES = {
  POWER: {
    id: 'POWER',
    color: '#ef4444',
    wireColor: '#e04b3a',
    badgeBg: 'rgba(239, 68, 68, 0.16)',
    badgeBorder: '#ef4444'
  },
  GND: {
    id: 'GND',
    color: '#475569',
    wireColor: '#232836',
    badgeBg: 'rgba(71, 85, 105, 0.22)',
    badgeBorder: '#64748b'
  },
  PWM: {
    id: 'PWM',
    color: '#8b5cf6',
    wireColor: '#a855f7',
    badgeBg: 'rgba(139, 92, 246, 0.16)',
    badgeBorder: '#8b5cf6'
  },
  ANALOG: {
    id: 'ANALOG',
    color: '#10b981',
    wireColor: '#22c55e',
    badgeBg: 'rgba(16, 185, 129, 0.16)',
    badgeBorder: '#10b981'
  },
  PROTOCOL: {
    id: 'PROTOCOL',
    color: '#f59e0b',
    wireColor: '#f59e0b',
    badgeBg: 'rgba(245, 158, 11, 0.16)',
    badgeBorder: '#f59e0b'
  },
  DIGITAL_IO: {
    id: 'DIGITAL_IO',
    color: '#2563eb',
    wireColor: '#38bdf8',
    badgeBg: 'rgba(37, 99, 235, 0.16)',
    badgeBorder: '#3b82f6'
  },
  PASSIVE: {
    id: 'PASSIVE',
    color: '#94a3b8',
    wireColor: '#f59e0b',
    badgeBg: 'rgba(148, 163, 184, 0.18)',
    badgeBorder: '#94a3b8'
  }
};

/**
 * Preferred host pin ordering so LEDs/Buzzers/Buttons/Sensors pick canonical pins (e.g. PIN13, PIN9, A0, PIN2) first.
 */
const PREFERRED_HOST_PIN_ORDER = [
  'OUT1',
  'OUT3',
  'OUT2',
  'OUT4',
  'SDA',
  'SCL',
  'PIN13',
  'GPIO2',
  'PIN9',
  'GPIO18',
  'A0',
  'GPIO34',
  'PIN2',
  'GPIO4',
  'PIN8',
  'GPIO19',
  'PIN10',
  'GPIO5',
  'PIN6',
  'GPIO21',
  'PIN11',
  'GPIO23',
  'PIN3',
  'PIN5',
  'A1',
  'A2',
  '5V',
  '3V3',
  'GND',
  'GND_TOP',
  'GND2'
];

/**
 * Flownie-Inspired Electrical Compatibility & Scored Pin Matching Engine (`SmartPinMatcher`).
 *
 * Strictly adheres to Single Responsibility Principle and Zero Hardcoded Mock Rules:
 * - Evaluates physical & electrical compatibility between any two `ElectricalPin` instances
 *   (short-circuit prevention, power rail conflict detection, and 5V vs 3.3V overvoltage protection).
 * - Computes a compatibility score (`4 -> 3 -> 2 -> 1 -> 0`) based on `role`, `direction`, `protocol`,
 *   and voltage limits.
 * - Finds the highest-scoring unconnected pin pair between any two `HardwareComponent` instances
 *   for one-click Quick Connect (`🔗`).
 * - Plans topological auto-wiring (`⚡ Auto-Wire`) across all active stage components, automatically
 *   routing LEDs through available series current-limiting resistors.
 */
export class SmartPinMatcher {
  /**
   * Classifies an `ElectricalPin` into its Flownie-3D visual port category, color, and pill label.
   * @param {import('./ElectricalPin.js').ElectricalPin} pin
   */
  static classifyPinVisualCategory(pin) {
    if (!pin) {
      return { ...PIN_VISUAL_CATEGORIES.PASSIVE, shortRole: 'PIN' };
    }

    const role = String(pin.role || '').toUpperCase();
    const dir = String(pin.direction || '').toUpperCase();
    const proto = String(pin.protocol || '').toUpperCase();
    const name = String(pin.pinName || '').toUpperCase();

    if (
      role === 'POWER' ||
      role === 'VCC_IN' ||
      dir === 'POWER' ||
      name === '5V' ||
      name === '5V_OUT' ||
      name === '12V' ||
      name === '3V3' ||
      name === 'VIN' ||
      name === 'VCC' ||
      name === 'V_BATT' ||
      name.startsWith('PLUS_') ||
      (role === 'MOTOR_OUT' && (name === 'OUT1' || name === 'OUT3'))
    ) {
      const vLabel = typeof pin.drivenVoltage === 'number' && pin.drivenVoltage > 0 ? `${pin.drivenVoltage}V` : 'VCC';
      return { ...PIN_VISUAL_CATEGORIES.POWER, shortRole: vLabel };
    }

    if (
      role === 'GND' ||
      role === 'GND_IN' ||
      role === 'CATHODE' ||
      dir === 'GND' ||
      dir === 'GROUND' ||
      name.startsWith('GND') ||
      name === 'CATHODE' ||
      name === 'NEGATIVE' ||
      name.startsWith('MINUS_') ||
      (role === 'MOTOR_OUT' && (name === 'OUT2' || name === 'OUT4'))
    ) {
      return { ...PIN_VISUAL_CATEGORIES.GND, shortRole: role === 'CATHODE' ? 'CATHODE (−)' : 'GND' };
    }

    if (role === 'ADC' || proto === 'ADC' || name === 'WIPER' || name === 'AO' || /^A\d+$/.test(name)) {
      return { ...PIN_VISUAL_CATEGORIES.ANALOG, shortRole: 'ADC' };
    }

    if (
      role === 'UART' ||
      role === 'I2C' ||
      role === 'CSI' ||
      proto === 'UART' ||
      proto === 'I2C' ||
      proto === 'SPI' ||
      proto === 'CSI' ||
      ['RX0', 'TX0', 'SDA', 'SCL', 'CSI_D0', 'CSI_CLK'].includes(name)
    ) {
      return { ...PIN_VISUAL_CATEGORIES.PROTOCOL, shortRole: proto || role || 'BUS' };
    }

    if (
      role === 'PWM' ||
      proto === 'PWM' ||
      role === 'ANODE' ||
      name === 'ANODE' ||
      name === 'POSITIVE' ||
      name === 'SIGNAL' ||
      name === 'ENA' ||
      name === 'ENB' ||
      name === 'SIG_PAN' ||
      name === 'SIG_TILT'
    ) {
      const badge = role === 'ANODE' ? 'ANODE (+)' : 'PWM';
      return { ...PIN_VISUAL_CATEGORIES.PWM, shortRole: badge };
    }

    if (role === 'PASSIVE' || dir === 'PASSIVE' || name.startsWith('LEAD_')) {
      return { ...PIN_VISUAL_CATEGORIES.PASSIVE, shortRole: 'PASSIVE' };
    }

    return { ...PIN_VISUAL_CATEGORIES.DIGITAL_IO, shortRole: 'GPIO' };
  }

  /**
   * Infers the effective nominal voltage driven by a pin (if it is a power rail or active output).
   * @param {import('./ElectricalPin.js').ElectricalPin} pin
   * @returns {number|null}
   */
  static getEffectiveSourceVoltage(pin) {
    if (!pin) return null;
    if (typeof pin.drivenVoltage === 'number' && pin.drivenVoltage > 0) {
      return pin.drivenVoltage;
    }
    const name = String(pin.pinName || '').toUpperCase();
    if (name === '5V' || name === 'VIN') return 5.0;
    if (name === '3V3') return 3.3;
    return null;
  }

  /**
   * Checks whether a pin is an active power supply rail (e.g. 5V, 3.3V, VIN).
   * @param {import('./ElectricalPin.js').ElectricalPin} pin
   */
  static isPowerSupplyPin(pin) {
    if (!pin) return false;
    const role = String(pin.role || '').toUpperCase();
    const dir = String(pin.direction || '').toUpperCase();
    return role === 'POWER' || dir === 'POWER';
  }

  /**
   * Checks whether a pin is an active ground supply rail (e.g. board GND, GND_TOP, GND2).
   * @param {import('./ElectricalPin.js').ElectricalPin} pin
   */
  static isGroundSupplyPin(pin) {
    if (!pin) return false;
    const role = String(pin.role || '').toUpperCase();
    const dir = String(pin.direction || '').toUpperCase();
    return (role === 'GND' && dir === 'GND') || dir === 'GROUND' || pin.isGroundSink();
  }

  /**
   * Checks whether a pin is a component ground/negative return terminal (`GND_IN`, `CATHODE`, `SWITCH_B`).
   * @param {import('./ElectricalPin.js').ElectricalPin} pin
   */
  static isGroundReturnPin(pin) {
    if (!pin) return false;
    const role = String(pin.role || '').toUpperCase();
    const name = String(pin.pinName || '').toUpperCase();
    return (
      role === 'GND_IN' ||
      role === 'CATHODE' ||
      role === 'SWITCH_B' ||
      name === 'CATHODE' ||
      name === 'NEGATIVE' ||
      name.startsWith('MINUS_') ||
      (name === 'GND' && !this.isGroundSupplyPin(pin))
    );
  }

  /**
   * Checks whether a pin is a component positive power input (`VCC_IN`).
   * @param {import('./ElectricalPin.js').ElectricalPin} pin
   */
  static isPowerInputPin(pin) {
    if (!pin) return false;
    const role = String(pin.role || '').toUpperCase();
    const name = String(pin.pinName || '').toUpperCase();
    return role === 'VCC_IN' || name === 'VCC' || name.startsWith('PLUS_');
  }

  /**
   * Validates electrical safety and compatibility between `sourcePin` and `targetPin`.
   * Rejects direct short-circuits (`VCC <-> GND`), conflicting voltage rails (`5V <-> 3.3V`),
   * and overvoltage connections (`5.0V -> 3.3V max pin`).
   *
   * @param {import('./ElectricalPin.js').ElectricalPin} sourcePin
   * @param {import('./ElectricalPin.js').ElectricalPin} targetPin
   * @returns {{ valid: boolean, reasonKey: string|null }}
   */
  static validatePinCompatibility(sourcePin, targetPin) {
    if (!sourcePin || !targetPin) {
      return { valid: false, reasonKey: 'elec.wiring.err.invalid_pin' };
    }

    if (sourcePin.endpointId === targetPin.endpointId) {
      return { valid: false, reasonKey: 'elec.wiring.err.same_pin' };
    }

    const srcIsPower = this.isPowerSupplyPin(sourcePin);
    const dstIsPower = this.isPowerSupplyPin(targetPin);
    const srcIsGnd = this.isGroundSupplyPin(sourcePin);
    const dstIsGnd = this.isGroundSupplyPin(targetPin);
    const srcIsGndIn = this.isGroundReturnPin(sourcePin);
    const dstIsGndIn = this.isGroundReturnPin(targetPin);
    const srcIsPowerIn = this.isPowerInputPin(sourcePin);
    const dstIsPowerIn = this.isPowerInputPin(targetPin);

    // 1. Direct Short Circuit: Power Supply <-> Ground Supply or Ground Return
    if (
      (srcIsPower && (dstIsGnd || dstIsGndIn)) ||
      (dstIsPower && (srcIsGnd || srcIsGndIn)) ||
      (sourcePin.isVoltageSource() && dstIsGnd) ||
      (targetPin.isVoltageSource() && srcIsGnd)
    ) {
      return { valid: false, reasonKey: 'elec.wiring.err.short_circuit' };
    }

    // 2. Reverse Power Polarity: VCC_IN connected directly to GND supply
    if ((srcIsPowerIn && dstIsGnd) || (dstIsPowerIn && srcIsGnd)) {
      return { valid: false, reasonKey: 'elec.wiring.err.short_circuit' };
    }

    // 3. Conflicting Active Power Rails (e.g. 5V tied directly to 3.3V)
    const srcV = this.getEffectiveSourceVoltage(sourcePin);
    const dstV = this.getEffectiveSourceVoltage(targetPin);
    if (srcIsPower && dstIsPower && srcV !== null && dstV !== null && Math.abs(srcV - dstV) > 0.2) {
      return { valid: false, reasonKey: 'elec.wiring.err.power_conflict' };
    }

    // 4. Overvoltage Violation (e.g. 5.0V source into 3.3V max GPIO/3V3 pin)
    if (srcV !== null && typeof targetPin.maxVoltage === 'number' && srcV > targetPin.maxVoltage + 0.05) {
      return { valid: false, reasonKey: 'elec.wiring.err.overvoltage' };
    }
    if (dstV !== null && typeof sourcePin.maxVoltage === 'number' && dstV > sourcePin.maxVoltage + 0.05) {
      return { valid: false, reasonKey: 'elec.wiring.err.overvoltage' };
    }

    return { valid: true, reasonKey: null };
  }

  /**
   * Computes a compatibility score (`4 -> 3 -> 2 -> 1 -> 0`) for connecting `sourcePin` and `targetPin`.
   * Inspired by Flownie's scored handle matcher, adapted to physical electronic rules.
   *
   * - `4`: Exact Protocol / Dedicated Role Match (`ADC <-> WIPER`, `PWM <-> SIGNAL/ANODE`, `5V <-> VCC`, `GND <-> CATHODE/GND_IN`)
   * - `3`: Compatible Digital IO / Signal or Common Rail Match (`GPIO <-> ANODE/TRIG/ECHO/SWITCH_A`, `GND <-> GND`)
   * - `2`: Series Passive / Breadboard Strip Match (`GPIO/ANODE/CATHODE <-> Resistor LEAD_A/LEAD_B` or Breadboard hole)
   * - `1`: Generic Safe Connection (`PASSIVE <-> PASSIVE`)
   * - `0`: Incompatible or unsafe connection
   *
   * @param {import('./ElectricalPin.js').ElectricalPin} sourcePin
   * @param {import('./ElectricalPin.js').ElectricalPin} targetPin
   * @returns {number}
   */
  static scorePinPair(sourcePin, targetPin) {
    const check = this.validatePinCompatibility(sourcePin, targetPin);
    if (!check.valid) return 0;

    // Prevent connecting two pins of the same non-breadboard component together
    if (sourcePin.componentId === targetPin.componentId) {
      return 0;
    }

    const rA = String(sourcePin.role || '').toUpperCase();
    const rB = String(targetPin.role || '').toUpperCase();
    const pA = String(sourcePin.protocol || '').toUpperCase();
    const pB = String(targetPin.protocol || '').toUpperCase();
    const nA = String(sourcePin.pinName || '').toUpperCase();
    const nB = String(targetPin.pinName || '').toUpperCase();

    const aIsPwr = this.isPowerSupplyPin(sourcePin);
    const bIsPwr = this.isPowerSupplyPin(targetPin);
    const aIsPwrIn = this.isPowerInputPin(sourcePin);
    const bIsPwrIn = this.isPowerInputPin(targetPin);
    const aIsGnd = this.isGroundSupplyPin(sourcePin);
    const bIsGnd = this.isGroundSupplyPin(targetPin);
    const aIsGndIn = this.isGroundReturnPin(sourcePin);
    const bIsGndIn = this.isGroundReturnPin(targetPin);

    // 0. H-Bridge Motor Driver Outputs (`OUT1..OUT4`) <-> Motor Power/Ground Terminals -> Score 4
    if (rA === 'MOTOR_OUT' || rB === 'MOTOR_OUT') {
      const mPin = rA === 'MOTOR_OUT' ? nA : nB;
      const otherIsPwrIn = rA === 'MOTOR_OUT' ? bIsPwrIn : aIsPwrIn;
      const otherIsGndIn = rA === 'MOTOR_OUT' ? bIsGndIn : aIsGndIn;
      if ((mPin === 'OUT1' || mPin === 'OUT3') && otherIsPwrIn) return 4;
      if ((mPin === 'OUT2' || mPin === 'OUT4') && otherIsGndIn) return 4;
      if (rA === 'PASSIVE' || rB === 'PASSIVE') return 2;
      return 0;
    }

    // 0b. Dedicated I2C / CSI-2 Protocol Line Matching (`SDA <-> SDA/A4`, `SCL <-> SCL/A5`)
    if (nA === 'SDA' || nB === 'SDA' || nA === 'SCL' || nB === 'SCL') {
      if ((nA === 'SDA' && (nB === 'SDA' || nB === 'A4')) || (nB === 'SDA' && (nA === 'SDA' || nA === 'A4'))) {
        return 4;
      }
      if ((nA === 'SCL' && (nB === 'SCL' || nB === 'A5')) || (nB === 'SCL' && (nA === 'SCL' || nA === 'A5'))) {
        return 4;
      }
      if (rA === 'PASSIVE' || rB === 'PASSIVE') return 2;
      return 0;
    }

    if (nA.startsWith('CSI_') || nB.startsWith('CSI_')) {
      if (nA === nB) return 4;
      return 0;
    }

    // 1. Ground Supply <-> Component Ground Return (CATHODE / GND_IN / SWITCH_B) -> Score 4
    if ((aIsGnd && bIsGndIn) || (bIsGnd && aIsGndIn)) {
      return 4;
    }

    // 2. Ground Supply <-> Ground Supply (Multi-board common ground bridge) -> Score 3
    if (aIsGnd && bIsGnd) {
      return 3;
    }

    // Do not match a Ground Supply to a non-ground signal pin (e.g. ANODE, WIPER, TRIG, GPIO)
    if (aIsGnd || bIsGnd) {
      if (rA === 'PASSIVE' || rB === 'PASSIVE') return 2;
      return 0;
    }

    // 3. Power Supply (5V/3V3) <-> Component VCC_IN -> Score 4
    if ((aIsPwr && bIsPwrIn) || (bIsPwr && aIsPwrIn)) {
      return 4;
    }

    // Do not connect Power Supply directly to GPIO/ADC/CATHODE; allow Passive Resistor (Score 2)
    if (aIsPwr || bIsPwr) {
      if (rA === 'PASSIVE' || rB === 'PASSIVE') return 2;
      if (aIsPwr && bIsPwr) return 3;
      return 0;
    }

    // Do not connect a component's CATHODE / GND_IN to a positive GPIO/ADC/PWM pin
    if (aIsGndIn || bIsGndIn) {
      if (rA === 'PASSIVE' || rB === 'PASSIVE') return 2;
      return 0;
    }

    // Do not connect a component's VCC_IN to a standard signal pin if not power
    if (aIsPwrIn || bIsPwrIn) {
      // Allow DC motor VCC_IN to connect to a PWM/GPIO pin for speed control (Score 3)
      if ((aIsPwrIn && (pB === 'PWM' || rB === 'GPIO')) || (bIsPwrIn && (pA === 'PWM' || rA === 'GPIO'))) {
        return 3;
      }
      if (rA === 'PASSIVE' || rB === 'PASSIVE') return 2;
      return 0;
    }

    // 4. Analog ADC <-> Analog Sensor Output (WIPER / ADC) -> Score 4
    if (rA === 'ADC' && rB === 'ADC') {
      return 4;
    }
    if ((rA === 'ADC' && rB !== 'PASSIVE') || (rB === 'ADC' && rA !== 'PASSIVE')) {
      return 0;
    }

    // 5. UART TX <-> RX -> Score 4
    if (rA === 'UART' && rB === 'UART' && nA !== nB) {
      return 4;
    }

    // 6. PWM / GPIO <-> PWM / ANODE / SWITCH_A
    if (
      (pA === 'PWM' && (rB === 'PWM' || rB === 'ANODE')) ||
      (pB === 'PWM' && (rA === 'PWM' || rA === 'ANODE'))
    ) {
      return 4;
    }

    if (
      (rA === 'GPIO' && (rB === 'ANODE' || rB === 'GPIO' || rB === 'SWITCH_A' || rB === 'PWM')) ||
      (rB === 'GPIO' && (rA === 'ANODE' || rA === 'GPIO' || rA === 'SWITCH_A' || rA === 'PWM'))
    ) {
      return 3;
    }

    // 7. Passive / Breadboard Bridge (Resistor LEAD_A/LEAD_B or Breadboard tie-points) -> Score 2
    if (rA === 'PASSIVE' || rB === 'PASSIVE' || rA === 'SIGNAL' || rB === 'SIGNAL') {
      return 2;
    }

    return 1;
  }

  /**
   * Chooses an appropriate jumper wire color based on the matched pins.
   * @param {import('./ElectricalPin.js').ElectricalPin} sourcePin
   * @param {import('./ElectricalPin.js').ElectricalPin} targetPin
   * @returns {string} Hex color
   */
  static pickWireColorForPair(sourcePin, targetPin) {
    if (
      this.isGroundSupplyPin(sourcePin) ||
      this.isGroundSupplyPin(targetPin) ||
      this.isGroundReturnPin(sourcePin) ||
      this.isGroundReturnPin(targetPin)
    ) {
      return PIN_VISUAL_CATEGORIES.GND.wireColor;
    }
    if (
      this.isPowerSupplyPin(sourcePin) ||
      this.isPowerSupplyPin(targetPin) ||
      this.isPowerInputPin(sourcePin) ||
      this.isPowerInputPin(targetPin)
    ) {
      return PIN_VISUAL_CATEGORIES.POWER.wireColor;
    }
    const catA = this.classifyPinVisualCategory(sourcePin);
    const catB = this.classifyPinVisualCategory(targetPin);
    if (catA.id === 'ANALOG' || catB.id === 'ANALOG') return PIN_VISUAL_CATEGORIES.ANALOG.wireColor;
    if (catA.id === 'PWM' || catB.id === 'PWM') return PIN_VISUAL_CATEGORIES.PWM.wireColor;
    if (catA.id === 'PROTOCOL' || catB.id === 'PROTOCOL') return PIN_VISUAL_CATEGORIES.PROTOCOL.wireColor;
    return PIN_VISUAL_CATEGORIES.DIGITAL_IO.wireColor;
  }

  /**
   * Finds the highest-scoring compatible pin pair between `sourceComp` and `targetComp`,
   * prioritizing unoccupied pins so repeated Quick Connect clicks wire all pins of a multi-pin component.
   *
   * @param {import('../components/HardwareComponent.js').HardwareComponent} sourceComp
   * @param {import('../components/HardwareComponent.js').HardwareComponent} targetComp
   * @param {Array<{ from: string, to: string }>} [existingConnections]
   * @returns {{ sourcePin: import('./ElectricalPin.js').ElectricalPin, targetPin: import('./ElectricalPin.js').ElectricalPin, score: number, color: string } | null}
   */
  static findBestPinMatch(sourceComp, targetComp, existingConnections = []) {
    if (!sourceComp || !targetComp || sourceComp.id === targetComp.id) {
      return null;
    }

    const sourcePins = sourceComp.getElectricalPins ? sourceComp.getElectricalPins() : [];
    const targetPins = targetComp.getElectricalPins ? targetComp.getElectricalPins() : [];
    if (sourcePins.length === 0 || targetPins.length === 0) {
      return null;
    }

    const occupiedEndpoints = new Set();
    const existingPairs = new Set();

    for (const conn of existingConnections) {
      if (!conn || !conn.from || !conn.to) continue;
      const [fComp, fPinRaw] = ScenarioSerializer.splitEndpoint(conn.from);
      const [tComp, tPinRaw] = ScenarioSerializer.splitEndpoint(conn.to);
      const fPin = fComp === sourceComp.id ? sourceComp.resolvePinName(fPinRaw) : fComp === targetComp.id ? targetComp.resolvePinName(fPinRaw) : fPinRaw;
      const tPin = tComp === sourceComp.id ? sourceComp.resolvePinName(tPinRaw) : tComp === targetComp.id ? targetComp.resolvePinName(tPinRaw) : tPinRaw;
      const canonF = `${fComp}.${fPin}`;
      const canonT = `${tComp}.${tPin}`;
      occupiedEndpoints.add(canonF);
      occupiedEndpoints.add(canonT);
      existingPairs.add(`${canonF}->${canonT}`);
      existingPairs.add(`${canonT}->${canonF}`);
    }

    const rankHostPin = (pinName) => {
      const idx = PREFERRED_HOST_PIN_ORDER.indexOf(pinName);
      return idx === -1 ? 999 : idx;
    };

    let bestCandidate = null;

    for (const sPin of sourcePins) {
      for (const tPin of targetPins) {
        const pairKey = `${sPin.endpointId}->${tPin.endpointId}`;
        if (existingPairs.has(pairKey)) continue;

        const baseScore = this.scorePinPair(sPin, tPin);
        if (baseScore <= 0) continue;

        const sOccupied = occupiedEndpoints.has(sPin.endpointId);
        const tOccupied = occupiedEndpoints.has(tPin.endpointId);
        const sIsSharedBus = this.isPowerSupplyPin(sPin) || this.isGroundSupplyPin(sPin);
        const tIsSharedBus = this.isPowerSupplyPin(tPin) || this.isGroundSupplyPin(tPin);

        // Non-bus signal/component pins that are already occupied cannot be double-wired in Quick Connect
        if (sOccupied && !sIsSharedBus) continue;
        if (tOccupied && !tIsSharedBus) continue;

        // Prefer completely unoccupied pins even on shared power/ground buses (e.g. GND before GND2)
        const freeBonus = (!sOccupied ? 0.25 : 0) + (!tOccupied ? 0.25 : 0);

        // Prefer connecting Signal/Power pins BEFORE Ground pins on the first Quick Connect click
        const isGroundPair =
          this.isGroundSupplyPin(sPin) ||
          this.isGroundSupplyPin(tPin) ||
          this.isGroundReturnPin(sPin) ||
          this.isGroundReturnPin(tPin);
        const signalFirstBonus = isGroundPair ? 0 : 0.15;

        // Tie-breaker using canonical Arduino/ESP32 pin preference order
        const orderPenalty = (rankHostPin(sPin.pinName) + rankHostPin(tPin.pinName)) * 0.0001;
        const totalRank = baseScore + freeBonus + signalFirstBonus - orderPenalty;

        if (!bestCandidate || totalRank > bestCandidate.totalRank) {
          bestCandidate = {
            sourcePin: sPin,
            targetPin: tPin,
            score: baseScore,
            totalRank,
            color: this.pickWireColorForPair(sPin, tPin)
          };
        }
      }
    }

    if (!bestCandidate) return null;

    return {
      from: bestCandidate.sourcePin.endpointId,
      to: bestCandidate.targetPin.endpointId,
      sourcePin: bestCandidate.sourcePin,
      targetPin: bestCandidate.targetPin,
      score: bestCandidate.score,
      color: bestCandidate.color
    };
  }

  static matchBestPinPair(sourceComp, targetComp, existingConnections = []) {
    return this.findBestPinMatch(sourceComp, targetComp, existingConnections);
  }

  /**
   * Ranks and classifies all candidate pins on stage during an active wire drag from `sourcePin`.
   * Identifies compatible pins of the same/connectable electrical class and marks the nearest
   * connectable target pins (`isNearest: true`, `nearestRank: 1..N`) relative to `cursorPoint`.
   *
   * @param {import('./ElectricalPin.js').ElectricalPin} sourcePin
   * @param {Array<{ pin: import('./ElectricalPin.js').ElectricalPin, x?: number, y?: number, worldPos?: number[] }>} candidates
   * @param {{ x?: number, y?: number, worldPos?: number[] }} [cursorPoint]
   * @param {{ nearestCount?: number, occupiedEndpoints?: Set<string> }} [options]
   * @returns {Array<{
   *   pin: import('./ElectricalPin.js').ElectricalPin,
   *   endpointId: string,
   *   compatible: boolean,
   *   sameClass: boolean,
   *   score: number,
   *   distance: number,
   *   classColor: string,
   *   wireColor: string,
   *   isNearest: boolean,
   *   nearestRank: number|null
   * }>}
   */
  static rankCompatibleTargetPins(sourcePin, candidates = [], cursorPoint = {}, options = {}) {
    const resolvedSourcePin = sourcePin?.pin || sourcePin;
    if (!resolvedSourcePin || !Array.isArray(candidates)) return [];

    const nearestCount = typeof options.nearestCount === 'number' ? Math.max(1, options.nearestCount) : 3;
    const occupiedEndpoints = options.occupiedEndpoints instanceof Set ? options.occupiedEndpoints : new Set();
    const srcCategory = this.classifyPinVisualCategory(resolvedSourcePin);
    const srcIsPassive = srcCategory.id === 'PASSIVE';

    const evaluated = candidates.map((entry) => {
      const pin = entry.pin || entry;
      const endpointId = pin?.endpointId || '';
      if (!pin || endpointId === resolvedSourcePin.endpointId || pin.componentId === resolvedSourcePin.componentId) {
        return {
          pin,
          endpointId,
          endpoint: endpointId,
          compatible: false,
          sameClass: false,
          score: 0,
          distance: Number.POSITIVE_INFINITY,
          classColor: srcCategory.color,
          wireColor: srcCategory.wireColor,
          isNearest: false,
          nearestRank: null
        };
      }

      const score = this.scorePinPair(resolvedSourcePin, pin);
      const compatible = score > 0;
      const sameClass = compatible && (srcIsPassive ? score >= 2 : score >= 3);

      let distance = Number.POSITIVE_INFINITY;
      if (typeof cursorPoint?.x === 'number' && typeof cursorPoint?.y === 'number' && typeof entry.x === 'number' && typeof entry.y === 'number') {
        distance = Math.hypot(entry.x - cursorPoint.x, entry.y - cursorPoint.y);
      } else if (Array.isArray(cursorPoint?.worldPos) && Array.isArray(entry.worldPos)) {
        const dx = (entry.worldPos[0] || 0) - (cursorPoint.worldPos[0] || 0);
        const dy = (entry.worldPos[1] || 0) - (cursorPoint.worldPos[1] || 0);
        const dz = (entry.worldPos[2] || 0) - (cursorPoint.worldPos[2] || 0);
        distance = Math.hypot(dx, dy, dz);
      }

      const targetCategory = this.classifyPinVisualCategory(pin);
      const wireColor = compatible ? this.pickWireColorForPair(resolvedSourcePin, pin) : srcCategory.wireColor;
      const classColor = compatible
        ? srcCategory.id !== 'PASSIVE' && srcCategory.id !== 'DIGITAL_IO'
          ? srcCategory.color
          : targetCategory.color
        : targetCategory.color;

      return {
        pin,
        endpointId,
        endpoint: endpointId,
        compatible,
        sameClass,
        score,
        distance: Number.isFinite(distance) ? Number(distance.toFixed(2)) : Number.POSITIVE_INFINITY,
        classColor,
        wireColor,
        isNearest: false,
        nearestRank: null
      };
    });

    const compatibleList = evaluated.filter((item) => item.compatible);

    // Sort compatible pins by: Same-Class match first -> Unoccupied non-bus pins -> Spatial Proximity (closest first) -> Higher score
    compatibleList.sort((a, b) => {
      if (a.sameClass !== b.sameClass) return a.sameClass ? -1 : 1;

      const aOcc = occupiedEndpoints.has(a.endpointId) && !this.isPowerSupplyPin(a.pin) && !this.isGroundSupplyPin(a.pin);
      const bOcc = occupiedEndpoints.has(b.endpointId) && !this.isPowerSupplyPin(b.pin) && !this.isGroundSupplyPin(b.pin);
      if (aOcc !== bOcc) return aOcc ? 1 : -1;

      if (Math.abs(a.distance - b.distance) > 1e-3) {
        return a.distance - b.distance;
      }
      return b.score - a.score;
    });

    for (let i = 0; i < Math.min(nearestCount, compatibleList.length); i++) {
      compatibleList[i].isNearest = true;
      compatibleList[i].nearestRank = i + 1;
    }

    return evaluated;
  }

  /**
   * Rule-Based Zero-Cost Stage Auto-Connect Planner (`planStageAutoConnections`).
   *
   * Scans all active `HardwareComponent` instances on the stage, orders them topologically
   * (`HostBoard` -> `Series Resistor + LED` -> `Sensors / Motors / Audio / Buttons`), and generates
   * a safe, deterministic wiring plan for all unconnected components.
   *
   * @param {import('../components/HardwareComponent.js').HardwareComponent[]} components
   * @param {Array<{ id?: string, from: string, to: string, color?: string }>} [existingConnections]
   * @returns {Array<{ from: string, to: string, color: string, score: number }>}
   */
  static planStageAutoConnections(components = [], existingConnections = []) {
    const validComps = components.filter((c) => c && c.typeId !== 'passive.wire');
    const hostBoards = validComps.filter(
      (c) => c.category === 'boards' && c.typeId !== 'board.breadboard'
    );
    if (hostBoards.length === 0) return [];

    const primaryHost = hostBoards[0];
    const simulatedConnections = existingConnections.map((c) => ({ ...c }));
    const plannedNewWires = [];

    const isEndpointOccupied = (epId) =>
      simulatedConnections.some((c) => c.from === epId || c.to === epId);

    const recordPlannedWire = (sPin, tPin, score = 4) => {
      const color = this.pickWireColorForPair(sPin, tPin);
      const wire = {
        from: sPin.endpointId,
        to: tPin.endpointId,
        color,
        score
      };
      simulatedConnections.push(wire);
      plannedNewWires.push(wire);
    };

    // 1. If multiple host boards exist on stage, ensure common Ground bridge between them
    for (let i = 1; i < hostBoards.length; i++) {
      const secondaryHost = hostBoards[i];
      const pGnd = primaryHost.getElectricalPins().find((p) => this.isGroundSupplyPin(p));
      const sGnd = secondaryHost.getElectricalPins().find((p) => this.isGroundSupplyPin(p));
      if (pGnd && sGnd) {
        const alreadyBridged = simulatedConnections.some(
          (c) =>
            (c.from.startsWith(`${primaryHost.id}.GND`) && c.to.startsWith(`${secondaryHost.id}.GND`)) ||
            (c.to.startsWith(`${primaryHost.id}.GND`) && c.from.startsWith(`${secondaryHost.id}.GND`))
        );
        if (!alreadyBridged) {
          recordPlannedWire(pGnd, sGnd, 3);
        }
      }
    }

    // 2. Smart Series Protection: Pair unconnected Resistors with unconnected LEDs so LEDs don't burn out!
    const freeResistors = validComps.filter(
      (c) =>
        c.typeId === 'passive.resistor' &&
        !isEndpointOccupied(`${c.id}.LEAD_A`) &&
        !isEndpointOccupied(`${c.id}.LEAD_B`)
    );
    const freeLeds = validComps.filter(
      (c) =>
        c.category === 'leds' &&
        !isEndpointOccupied(`${c.id}.ANODE`) &&
        !isEndpointOccupied(`${c.id}.CATHODE`)
    );

    const pairedIds = new Set();
    const pairCount = Math.min(freeResistors.length, freeLeds.length);

    for (let i = 0; i < pairCount; i++) {
      const res = freeResistors[i];
      const led = freeLeds[i];
      const resLeadA = res.electricalPins.get('LEAD_A');
      const resLeadB = res.electricalPins.get('LEAD_B');
      const ledAnode = led.electricalPins.get('ANODE');

      // Match Host GPIO/PWM -> Resistor LEAD_A
      const hostToRes = this.findBestPinMatch(primaryHost, res, simulatedConnections);
      if (hostToRes && resLeadA && resLeadB && ledAnode) {
        recordPlannedWire(hostToRes.sourcePin, resLeadA, hostToRes.score);
        // Resistor LEAD_B -> LED ANODE
        recordPlannedWire(resLeadB, ledAnode, 3);
        // LED CATHODE -> Host GND
        const ledToGnd = this.findBestPinMatch(primaryHost, led, simulatedConnections);
        if (ledToGnd) {
          recordPlannedWire(ledToGnd.sourcePin, ledToGnd.targetPin, ledToGnd.score);
        }
        pairedIds.add(res.id);
        pairedIds.add(led.id);
      }
    }

    // 3. Topologically wire remaining peripheral components (Sensors, Motors, Audio, Buttons, remaining LEDs)
    const peripherals = validComps.filter(
      (c) =>
        c.category !== 'boards' &&
        c.typeId !== 'passive.resistor' &&
        !pairedIds.has(c.id)
    );

    for (const comp of peripherals) {
      const maxPins = comp.getElectricalPins ? comp.getElectricalPins().length : 0;
      for (let step = 0; step < maxPins; step++) {
        const match = this.findBestPinMatch(primaryHost, comp, simulatedConnections);
        if (!match) break;
        recordPlannedWire(match.sourcePin, match.targetPin, match.score);
      }
    }

    return plannedNewWires;
  }
}
