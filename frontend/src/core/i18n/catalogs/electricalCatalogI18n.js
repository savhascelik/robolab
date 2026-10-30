/**
 * Modular Electrical Flow, Faults, Protocols, and Freeform Sandbox Translation Catalog.
 * Used by `CircuitFlowSolver`, `HardwareComponent.checkElectricalLimits()`, `ScenarioSerializer`, and `SandboxController`.
 */
export const electricalCatalogI18n = {
  tr: {
    elec: {
      status: {
        normal: '{component}: Normal akış ({voltage}V, {currentMa} mA)',
        idle: '{component}: Açık devre / Akım geçmiyor (0 mA)',
        signalActive: '{component}: {protocol} sinyali aktif ({voltage}V)',
        closed_loop: 'Kapalı Devre Akışı: {currentMa} mA ({voltage}V)',
        open_loop: 'Açık Devre (0 mA - Toprak dönüşü yok)'
      },
      fault: {
        short_circuit: '🔥 KISA DEVRE! {netId} düğümünde güç kaynağı ({sourcePin}: {voltage}V) doğrudan toprağa ({gndPin}) bağlandı!',
        overcurrent: '💥 AŞIRI AKIM! {component} üzerinden {currentMa} mA akım geçti (Maksimum dayanım: {maxMa} mA). Seri direnç ekleyin!',
        overvoltage: '⚠️ AŞIRI GERİLİM! {component} ({pin}) pinine {voltage}V uygulandı (Maksimum güvenli seviye: {maxVoltage}V). Logic Level Shifter kullanın!',
        reverse_polarity: '🔄 TERS KUTUPLAMA! {component} ters bağlandı (Katot yüksek potansiyelde, Anot düşük potansiyelde); akım geçemez.',
        undervoltage: '🔋 DÜŞÜK GERİLİM: {component} çalışmak için en az {minVoltage}V gerektirir (Mevcut: {voltage}V).',
        open_loop: '🔌 AÇIK DEVRE: {component} tek uçtan gerilim alıyor fakat GND (Toprak) dönüş yolu tamamlanmamış.'
      },
      protocol: {
        gpio: 'Dijital G/Ç (GPIO)',
        pwm: 'PWM Darbe Genişlik Modülasyonu',
        adc: 'Analog-Dijital Dönüşüm (ADC)',
        uart: 'UART Seri Haberleşme (TX/RX)',
        i2c: 'I2C İki Telli Veri Yolu (SDA/SCL)',
        spi: 'SPI Yüksek Hızlı Veri Yolu'
      }
    },
    sandbox: {
      toolbar: {
        modeLesson: 'Müfredat Modu',
        modeSandbox: 'Serbest Laboratuvar (Sandbox)',
        wireTool: 'Kablo Çek (W)',
        wireToolActive: 'Pin Seçin (Başlangıç → Bitiş)',
        addBoard: '+ Kart Ekle',
        addComponent: '+ Bileşen Ekle',
        analyzeFlow: 'Akışı Çözümle',
        exportScenario: 'Senaryo Kaydet (JSON)',
        importScenario: 'Senaryo Yükle',
        convertToSandbox: 'Serbest Modda Düzenle',
        clearWires: 'Kabloları Temizle'
      },
      messages: {
        selectStartPin: 'Kablo başlangıcı için bir kart pini, bileşen bacağı veya breadboard deliği seçin.',
        selectEndPin: '{startPin} seçildi → Bağlamak istediğiniz hedef pine tıklayın.',
        wireConnected: 'Bağlantı kuruldu: {from} ↔ {to} ({netCount} elektriksel düğüm aktif).',
        scenarioSaved: 'Senaryo JSON şeması panoya kopyalandı ve yerel kayıt defterine eklendi ({id}).',
        flowHealthy: '✅ Devre Akışı Sağlıklı: {loopCount} kapalı döngü, {netCount} düğüm aktif.',
        flowFaults: '🚨 Devrede {faultCount} elektriksel hata/uyarı tespit edildi!'
      }
    }
  },
  en: {
    elec: {
      status: {
        normal: '{component}: Normal flow ({voltage}V, {currentMa} mA)',
        idle: '{component}: Open circuit / Zero current (0 mA)',
        signalActive: '{component}: {protocol} signal active ({voltage}V)',
        closed_loop: 'Closed-Loop Flow: {currentMa} mA ({voltage}V)',
        open_loop: 'Open Circuit (0 mA - No GND return)'
      },
      fault: {
        short_circuit: '🔥 SHORT CIRCUIT! Power source ({sourcePin}: {voltage}V) is tied directly to ground ({gndPin}) on {netId}!',
        overcurrent: '💥 OVERCURRENT! {component} drew {currentMa} mA (Max rating: {maxMa} mA). Add a series current-limiting resistor!',
        overvoltage: '⚠️ OVERVOLTAGE! {voltage}V applied to {component} ({pin}) which only tolerates up to {maxVoltage}V. Use a Logic Level Shifter!',
        reverse_polarity: '🔄 REVERSE POLARITY! {component} is reverse-biased (Cathode higher than Anode); current is blocked.',
        undervoltage: '🔋 UNDERVOLTAGE: {component} requires at least {minVoltage}V to operate (Available: {voltage}V).',
        open_loop: '🔌 OPEN LOOP: {component} receives voltage potential on one terminal but lacks a closed return path to GND.'
      },
      protocol: {
        gpio: 'Digital I/O (GPIO)',
        pwm: 'PWM Pulse Width Modulation',
        adc: 'Analog-to-Digital Conversion (ADC)',
        uart: 'UART Serial Bus (TX/RX)',
        i2c: 'I2C Two-Wire Bus (SDA/SCL)',
        spi: 'SPI High-Speed Bus'
      }
    },
    sandbox: {
      toolbar: {
        modeLesson: 'Guided Lesson',
        modeSandbox: 'Freeform Lab (Sandbox)',
        wireTool: 'Draw Wire (W)',
        wireToolActive: 'Select Pin (Start → End)',
        addBoard: '+ Add Board',
        addComponent: '+ Add Component',
        analyzeFlow: 'Solve Circuit Flow',
        exportScenario: 'Save Scenario (JSON)',
        importScenario: 'Load Scenario',
        convertToSandbox: 'Edit in Freeform Mode',
        clearWires: 'Clear Wires'
      },
      messages: {
        selectStartPin: 'Click any board header pin, component lead, or breadboard hole to start a wire.',
        selectEndPin: 'Selected {startPin} → Click the target pin to complete the wire.',
        wireConnected: 'Wire connected: {from} ↔ {to} ({netCount} electrical nets active).',
        scenarioSaved: 'Scenario JSON schema copied & registered ({id}).',
        flowHealthy: '✅ Circuit Flow Healthy: {loopCount} closed loop(s), {netCount} net(s) active.',
        flowFaults: '🚨 Detected {faultCount} electrical fault(s)/warning(s) in circuit!'
      }
    }
  }
};
