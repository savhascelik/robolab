import { canvasTex } from './GeometryFactory.js';

/**
 * Generates the Arduino Uno R3 top silkscreen CanvasTexture.
 */
export function createArduinoSilkscreenTexture() {
  return canvasTex(1024, 800, (ctx, w, h) => {
    ctx.fillStyle = '#2d4b82';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(72, 114, 188, 0.45)';
    ctx.lineWidth = 4;
    const traces = [
      [[260, 440], [320, 380], [520, 380], [580, 140]],
      [[300, 480], [450, 480], [540, 560], [720, 560]],
      [[420, 440], [420, 240], [480, 140]],
      [[600, 480], [660, 420], [760, 420], [820, 160]]
    ];
    for (const poly of traces) {
      ctx.beginPath();
      poly.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
      ctx.stroke();
    }

    ctx.fillStyle = '#f2ede2';
    ctx.font = '700 38px "Barlow Semi Condensed", sans-serif';
    ctx.fillText('ARDUINO', 425, 325);
    ctx.font = '600 24px "Barlow Semi Condensed", sans-serif';
    ctx.fillText('UNO R3', 595, 325);
    ctx.font = '600 21px "Barlow Semi Condensed", sans-serif';
    ctx.fillText('DIGITAL (PWM~)', 540, 118);
    ctx.fillText('POWER', 355, 695);
    ctx.fillText('ANALOG IN', 670, 695);

    ctx.strokeStyle = '#f2ede2';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(465, 255, 24, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(520, 255, 24, 0, Math.PI * 2);
    ctx.stroke();

    ctx.font = '700 18px "JetBrains Mono", monospace';
    const dPins = ['SCL', 'SDA', 'AREF', 'GND', '13', '12', '~11', '~10', '~9', '8'];
    dPins.forEach((lbl, i) => {
      ctx.fillText(lbl, 310 + i * 36, 86);
    });
    const dPinsLow = ['7', '~6', '~5', '4', '~3', '2', 'TX1', 'RX0'];
    dPinsLow.forEach((lbl, i) => {
      ctx.fillText(lbl, 690 + i * 36, 86);
    });
    const aPins = ['A0', 'A1', 'A2', 'A3', 'A4', 'A5'];
    aPins.forEach((lbl, i) => {
      ctx.fillText(lbl, 680 + i * 38, 735);
    });
  });
}

/**
 * Generates the ATmega328P DIP-28 top laser-etched label CanvasTexture.
 */
export function createAtmegaChipTexture() {
  return canvasTex(512, 128, (ctx, w, h) => {
    ctx.fillStyle = '#252a38';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#cfd6e6';
    ctx.font = '700 34px "JetBrains Mono", monospace';
    ctx.fillText('ATMEGA328P-PU', 105, 58);
    ctx.font = '500 24px "Barlow Semi Condensed", sans-serif';
    ctx.fillText('MICROCHIP  2642', 105, 96);
    ctx.beginPath();
    ctx.arc(38, 64, 16, 0, Math.PI * 2);
    ctx.fillStyle = '#181c26';
    ctx.fill();
  });
}

/**
 * Generates the Half-Size Solderless Breadboard top hole grid & power rails CanvasTexture.
 */
export function createBreadboardTopTexture() {
  return canvasTex(720, 460, (ctx, w, h) => {
    ctx.fillStyle = '#f5eee0';
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#e0d4be';
    ctx.fillRect(24, h / 2 - 14, w - 48, 28);

    ctx.strokeStyle = '#d9483b';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(36, 22);
    ctx.lineTo(w - 36, 22);
    ctx.moveTo(36, h - 46);
    ctx.lineTo(w - 36, h - 46);
    ctx.stroke();

    ctx.strokeStyle = '#2d68b8';
    ctx.beginPath();
    ctx.moveTo(36, 48);
    ctx.lineTo(w - 36, 48);
    ctx.moveTo(36, h - 20);
    ctx.lineTo(w - 36, h - 20);
    ctx.stroke();

    ctx.fillStyle = '#252936';
    for (let col = 0; col < 24; col++) {
      const x = 48 + col * 27;
      for (let r = 0; r < 5; r++) {
        ctx.fillRect(x - 4, 82 + r * 24, 8, 8);
        ctx.fillRect(x - 4, 258 + r * 24, 8, 8);
      }
      if (col % 6 !== 5) {
        ctx.fillRect(x - 4, 28, 8, 8);
        ctx.fillRect(x - 4, 38, 8, 8);
        ctx.fillRect(x - 4, h - 42, 8, 8);
        ctx.fillRect(x - 4, h - 30, 8, 8);
      }
    }
  });
}

/**
 * Generates the ESP32 DevKit V1 matte-dark PCB silkscreen CanvasTexture.
 */
export function createEsp32SilkscreenTexture() {
  return canvasTex(960, 520, (ctx, w, h) => {
    ctx.fillStyle = '#1d222c';
    ctx.fillRect(0, 0, w, h);

    // Subtle copper trace lines under dark solder mask
    ctx.strokeStyle = 'rgba(72, 168, 166, 0.25)';
    ctx.lineWidth = 3;
    const traces = [
      [[180, 260], [340, 260], [420, 160], [560, 160]],
      [[180, 290], [360, 290], [440, 360], [580, 360]],
      [[310, 190], [310, 110], [520, 110]],
      [[310, 330], [310, 410], [520, 410]]
    ];
    for (const poly of traces) {
      ctx.beginPath();
      poly.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
      ctx.stroke();
    }

    // Silkscreen title
    ctx.fillStyle = '#f2ede2';
    ctx.font = '700 30px "Barlow Semi Condensed", sans-serif';
    ctx.fillText('ESP32 DEVKIT V1', 260, 255);
    ctx.font = '600 19px "Barlow Semi Condensed", sans-serif';
    ctx.fillStyle = '#58c7c4';
    ctx.fillText('WIFI + BLUETOOTH 4.2 BLE  •  3.3V LOGIC', 260, 288);

    // Top 15-pin silkscreen labels
    ctx.fillStyle = '#f2ede2';
    ctx.font = '700 16px "JetBrains Mono", monospace';
    const topPins = ['3V3', 'GND', 'D15', 'D2', 'D4', 'RX2', 'TX2', 'D5', 'D18', 'D19', 'D21', 'RX0', 'TX0', 'D22', 'D23'];
    topPins.forEach((lbl, i) => {
      ctx.fillText(lbl, 115 + i * 52, 78);
    });

    // Bottom 15-pin silkscreen labels
    const botPins = ['VIN', 'GND', 'D13', 'D12', 'D14', 'D27', 'D26', 'D25', 'D33', 'D32', 'D35', 'D34', 'VN', 'VP', 'EN'];
    botPins.forEach((lbl, i) => {
      ctx.fillText(lbl, 115 + i * 52, 456);
    });

    // Boot / EN button labels
    ctx.font = '700 17px "JetBrains Mono", monospace';
    ctx.fillText('EN', 95, 150);
    ctx.fillText('BOOT', 88, 390);
  });
}

/**
 * Generates the brushed aluminum RF shield laser engraving for ESP-WROOM-32.
 */
export function createEspWroomShieldTexture() {
  return canvasTex(512, 384, (ctx, w, h) => {
    ctx.fillStyle = '#cfd4dc';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = '#9aa2b1';
    ctx.lineWidth = 8;
    ctx.strokeRect(18, 18, w - 36, h - 36);

    ctx.fillStyle = '#2b3140';
    ctx.font = '700 38px "Barlow Semi Condensed", sans-serif';
    ctx.fillText('ESP-WROOM-32', 78, 130);
    ctx.font = '600 24px "JetBrains Mono", monospace';
    ctx.fillText('ESPRESSIF SYSTEMS', 78, 178);
    ctx.font = '500 20px "JetBrains Mono", monospace';
    ctx.fillText('240MHz Dual-Core LX6', 78, 228);
    ctx.fillText('FCC ID: 2AC7Z-ESPWROOM32', 78, 268);
  });
}

/**
 * Generates high-contrast silkscreen texture for NVIDIA Jetson Nano B01 Carrier PCB (1024x710).
 */
export function createJetsonNanoSilkscreenTexture() {
  return canvasTex(1024, 710, (ctx, w, h) => {
    ctx.fillStyle = '#151921';
    ctx.fillRect(0, 0, w, h);

    // Subtle dark copper ground-plane weave
    ctx.strokeStyle = '#1e2532';
    ctx.lineWidth = 3;
    ctx.strokeRect(18, 18, w - 36, h - 36);

    // Gold/white silkscreen traces and J41 header legend
    ctx.strokeStyle = 'rgba(118, 185, 0, 0.45)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 14; i++) {
      ctx.beginPath();
      ctx.moveTo(140 + i * 48, 86);
      ctx.lineTo(180 + i * 44, 210);
      ctx.stroke();
    }

    ctx.fillStyle = '#e5e9f0';
    ctx.font = '800 34px "Barlow Semi Condensed", sans-serif';
    ctx.fillText('JETSON NANO DEV KIT B01', 90, 620);

    ctx.fillStyle = '#76b900';
    ctx.font = '700 22px "JetBrains Mono", monospace';
    ctx.fillText('128-CORE MAXWELL GPU · 4GB LPDDR4 · J41 3.3V CMOS', 90, 654);

    ctx.fillStyle = '#cfd6e3';
    ctx.font = '600 18px "JetBrains Mono", monospace';
    ctx.fillText('J41 EXPANSION HEADER (40-PIN)', 220, 62);
    ctx.fillText('CAM0 CSI-2', 840, 290);
    ctx.fillText('CAM1 CSI-2', 840, 460);
    ctx.fillText('J25 DC 5V 4A', 120, 565);
  });
}

/**
 * Generates red FR4 PCB silkscreen texture for L298N Dual H-Bridge Motor Driver (512x512).
 */
export function createL298NSilkscreenTexture() {
  return canvasTex(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#991b1b';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 4;
    ctx.strokeRect(14, 14, w - 28, h - 28);

    // High-current copper pours under solder mask
    ctx.fillStyle = 'rgba(248, 113, 113, 0.14)';
    ctx.fillRect(36, 40, 140, 420);
    ctx.fillRect(336, 40, 140, 420);

    ctx.fillStyle = '#ffffff';
    ctx.font = '800 30px "Barlow Semi Condensed", sans-serif';
    ctx.fillText('L298N DUAL H-BRIDGE', 112, 54);
    ctx.font = '700 20px "JetBrains Mono", monospace';
    ctx.fillText('OUT1   OUT2', 28, 256);
    ctx.fillText('OUT3   OUT4', 352, 256);
    ctx.fillText('12V   GND   5V', 88, 485);
    ctx.fillText('ENA IN1 IN2 IN3 IN4 ENB', 228, 485);
  });
}

/**
 * Generates 3S 11.1V 1300mAh 75C High-Discharge LiPo Battery Pack graphics texture (512x256).
 */
export function createLiPoBatteryLabelTexture() {
  return canvasTex(512, 256, (ctx, w, h) => {
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, w, h);

    // High-voltage warning & telemetry bands
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(16, 16, 14, h - 32);
    ctx.fillStyle = '#0ea5e9';
    ctx.fillRect(38, 16, 6, h - 32);

    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 4;
    ctx.strokeRect(12, 12, w - 24, h - 24);

    ctx.fillStyle = '#f9fafb';
    ctx.font = '800 42px "Barlow Semi Condensed", sans-serif';
    ctx.fillText('3S 1300mAh 75C', 64, 88);

    ctx.fillStyle = '#fbbf24';
    ctx.font = '700 28px "JetBrains Mono", monospace';
    ctx.fillText('11.1V HIGH-DISCHARGE LIPO', 64, 134);

    ctx.fillStyle = '#9ca3af';
    ctx.font = '600 20px "JetBrains Mono", monospace';
    ctx.fillText('14.43Wh · XT60 + JST-XH BALANCE', 64, 182);
    ctx.fillText('SUMO COMPETITION GRADE', 64, 214);
  });
}

/**
 * Generates Sony IMX219 8MP CSI-2 Camera Module PCB silkscreen texture (512x512).
 */
export function createImx219CameraSilkscreenTexture() {
  return canvasTex(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#0f3d3e';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = '#14b8a6';
    ctx.lineWidth = 4;
    ctx.strokeRect(16, 16, w - 32, h - 32);

    ctx.fillStyle = '#f0fdfa';
    ctx.font = '800 32px "Barlow Semi Condensed", sans-serif';
    ctx.fillText('IMX219-160 8MP CSI-2', 92, 68);
    ctx.font = '600 22px "JetBrains Mono", monospace';
    ctx.fillText('SONY EXMOR R · 160° FOV', 102, 448);
    ctx.fillText('3280x2464 @ 60FPS MIPI', 108, 480);
  });
}

/**
 * Generates crisp 128x64 I2C SSD1306 OLED Telemetry screen canvas texture (512x256).
 */
export function createOledTelemetryScreenTexture(headline = 'TENSORRT FP16', subline = '60.0 FPS | 7.4V') {
  return canvasTex(512, 256, (ctx, w, h) => {
    ctx.fillStyle = '#030712';
    ctx.fillRect(0, 0, w, h);

    // Top yellow status bar (classic dual-zone SSD1306 yellow/cyan OLED)
    ctx.fillStyle = 'rgba(250, 204, 21, 0.14)';
    ctx.fillRect(0, 0, w, 58);

    ctx.fillStyle = '#facc15';
    ctx.font = '700 28px "JetBrains Mono", monospace';
    ctx.fillText(`I2C 0x3C · ${headline}`, 20, 40);

    // Cyan main pixel area
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 3;
    ctx.strokeRect(14, 72, w - 28, h - 86);

    ctx.fillStyle = '#22d3ee';
    ctx.font = '700 34px "JetBrains Mono", monospace';
    ctx.fillText(subline, 28, 128);

    ctx.font = '600 24px "JetBrains Mono", monospace';
    ctx.fillStyle = '#67e8f9';
    ctx.fillText('CSI0: 160° LOCK  ToF: 38cm', 28, 176);

    // Signal bars
    for (let i = 0; i < 12; i++) {
      const barH = 14 + ((i * 7) % 24);
      ctx.fillStyle = i > 8 ? '#facc15' : '#06b6d4';
      ctx.fillRect(28 + i * 36, 228 - barH, 24, barH);
    }
  });
}

